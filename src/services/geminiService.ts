import { RawFeedEntry, ArticleCategory } from '../types';
import { fetchTextWithTimeout, NetworkError, TextResponse } from './http';
import { UsageService } from './usage';
import { Topic } from '../constants/topics';

export interface GeminiAnalysisResult {
  isRelevant: boolean;
  category: ArticleCategory;
  bulletSummary: string[];
  significance: string;
}

function cleanAndParseJson(rawText: string): any {
  let cleaned = rawText.trim();

  // Strip markdown code block wrappers
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract outer JSON object if extra commentary was included
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas before closing brackets or braces
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch {
    // Second pass: strip control characters and retry
    const sanitized = cleaned
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(sanitized);
  }
}

// Gemini free tier allows 15 requests/minute. Keep one request of headroom and
// space calls with a sliding 60s window shared across the whole app.
const MAX_REQUESTS_PER_MINUTE = 14;
const WINDOW_MS = 60_000;
const requestTimes: number[] = [];
let limiterQueue: Promise<void> = Promise.resolve();

function acquireRequestSlot(): Promise<void> {
  const slot = limiterQueue.then(async () => {
    for (;;) {
      const now = Date.now();
      while (requestTimes.length > 0 && now - requestTimes[0] >= WINDOW_MS) {
        requestTimes.shift();
      }
      if (requestTimes.length < MAX_REQUESTS_PER_MINUTE) {
        requestTimes.push(now);
        return;
      }
      const waitMs = WINDOW_MS - (now - requestTimes[0]) + 50;
      await new Promise<void>(resolve => setTimeout(resolve, waitMs));
    }
  });
  limiterQueue = slot;
  return slot;
}

const RETRYABLE_STATUSES = [500, 502, 503, 504];
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

export class GeminiApiError extends Error {
  constructor(public status: number, public body = '') {
    super(`Gemini API responded with status ${status}`);
  }

  // Errors that will repeat for every article (bad/revoked key, unknown model):
  // retrying the remaining articles is pointless, so the sync should stop.
  get fatalMessage(): string | null {
    if (this.status === 401 || this.status === 403) return 'Gemini API key rejected';
    if (this.status === 400 && /api key/i.test(this.body)) return 'Gemini API key rejected';
    if (this.status === 404) return 'Gemini model not available';
    return null;
  }
}

// Gemini's JSON is not guaranteed to have the types we asked for. Anything that
// isn't text becomes text (or is dropped), so rendering can never throw on it.
function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export type KeyCheck = 'valid' | 'invalid' | 'unreachable';

export const GeminiService = {
  // Lists the available models: a cheap call that fails for a bad key and uses no tokens
  // or quota, so it is not recorded as usage.
  async checkApiKey(apiKey: string): Promise<KeyCheck> {
    try {
      const res = await fetchTextWithTimeout(
        'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
        { headers: { 'x-goog-api-key': apiKey.trim() } },
        10000
      );
      if (res.ok) return 'valid';
      const error = new GeminiApiError(res.status, res.text);
      // A rejected key is a definite answer; anything else (5xx, 429) says nothing about the key
      return error.fatalMessage ? 'invalid' : 'unreachable';
    } catch {
      return 'unreachable'; // offline or timed out
    }
  },

  async summarizeArticle(
    entry: RawFeedEntry,
    apiKey: string,
    model = 'gemini-3.1-flash-lite',
    topics: Topic[] = []
  ): Promise<GeminiAnalysisResult> {
    if (!apiKey) {
      // Fallback if no API key is provided yet
      const fallbackBullet = entry.summary.slice(0, 180).trim() || entry.title;
      return {
        isRelevant: true,
        category: 'tech',
        bulletSummary: [`${fallbackBullet}...`],
        significance: 'Summarized locally without Gemini API key.'
      };
    }

    const topicList = topics.map(t => `- ${t.id} (${t.label}): ${t.relevanceHint}`).join('\n');
    const categoryChoices = topics.map(t => `"${t.id}"`).join(' or ');
    const topicIds = topics.map(t => t.id);

    const truncatedContent = entry.content ? entry.content.slice(0, 6000) : entry.summary.slice(0, 3000);

    const prompt = `You are a senior tech curator and analyst for a high-signal developer news digest.
Analyze this article from '${entry.sourceName}' and determine if it is genuinely relevant to at least one of these topics:
${topicList}

Article details:
- Title: ${entry.title}
- Source: ${entry.sourceName}
- Link: ${entry.link}
- Tags: ${(entry.tags || []).join(', ')}

Article Content:
"""
${truncatedContent}
"""

Respond strictly in valid JSON with these fields:
{
  "is_relevant": true or false,
  "category": ${categoryChoices},   (the single best-fitting topic id)
  "bullet_summary": [
    "Key concrete takeaway 1 with specific facts",
    "Key concrete takeaway 2 with architectural or technical detail",
    "Key concrete takeaway 3 with metrics or practical impact"
  ],
  "significance": "2 insightful sentences analyzing why this matters to developers and engineers."
}
Do not use trailing commas in arrays or objects. Return only the JSON object.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })
    };

    // Retry transient server errors (503 overload etc.) with backoff. Every attempt
    // takes a rate-limit slot. 429 and other client errors are not retried.
    let response: TextResponse;
    for (let attempt = 1; ; attempt++) {
      await acquireRequestSlot();
      try {
        response = await fetchTextWithTimeout(url, requestInit, 30000);
      } catch (e) {
        // A request that never reached Google (offline) is not counted as usage
        if (!(e instanceof NetworkError)) await UsageService.record({ ok: false });
        throw e;
      }
      if (response.ok) break;
      await UsageService.record({ ok: false });

      const errText = response.text;
      const transient = RETRYABLE_STATUSES.includes(response.status);
      if (!transient || attempt >= MAX_ATTEMPTS) {
        console.warn(`Gemini API error (${response.status}):`, errText);
        throw new GeminiApiError(response.status, errText);
      }
      await new Promise<void>(resolve => setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)));
    }

    const data = JSON.parse(response.text);
    await UsageService.record({ ok: true, tokens: Number(data.usageMetadata?.totalTokenCount) || 0 });
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const parsed = cleanAndParseJson(candidateText);
      // Anything that isn't one of the selected topics (an id, or its label) becomes the first one
      const answer = toText(parsed.category).toLowerCase();
      const matched = topics.find(t => t.id === answer || t.label.toLowerCase() === answer);
      const category: ArticleCategory = matched?.id ?? topicIds[0] ?? 'tech';

      const bullets = (Array.isArray(parsed.bullet_summary) ? parsed.bullet_summary : [])
        .map(toText)
        .filter(Boolean)
        .slice(0, 6);

      return {
        isRelevant: Boolean(parsed.is_relevant),
        category,
        bulletSummary: bullets.length > 0 ? bullets : [entry.summary.slice(0, 160)],
        significance: toText(parsed.significance) || 'Key technological development for developers.'
      };
    } catch {
      console.error('Failed to parse Gemini JSON response:', candidateText);
      // Unparseable response: drop the article rather than adding unvetted junk
      return {
        isRelevant: false,
        category: 'tech',
        bulletSummary: [],
        significance: ''
      };
    }
  }
};
