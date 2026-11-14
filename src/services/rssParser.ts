import { XMLParser } from 'fast-xml-parser';
import { RawFeedEntry } from '../types';
import { fetchTextWithTimeout, NetworkError } from './http';
import { normalizeFeedUrl } from '../utils/url';
import { resolveRelativeUrl } from '../utils/feedLogo';
import { TOPICS, findCanonicalFeedUrl } from '../constants/topics';

export interface ResolvedFeed {
  feedUrl: string;
  feedTitle?: string;
  entries: RawFeedEntry[];
  iconUrl?: string;
}

const USER_AGENT = 'FeedMe-Mobile/1.0 (React Native)';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
});

// Common named HTML entities; feeds emit these and the XML parser only resolves the five XML ones.
const NAMED_ENTITIES: Record<string, string> = {
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201A',
  ldquo: '\u201C', rdquo: '\u201D', bdquo: '\u201E',
  laquo: '\u00AB', raquo: '\u00BB', bull: '\u2022', middot: '\u00B7',
  copy: '\u00A9', reg: '\u00AE', trade: '\u2122', deg: '\u00B0',
  times: '\u00D7', divide: '\u00F7', plusmn: '\u00B1',
  euro: '\u20AC', pound: '\u00A3', yen: '\u00A5', cent: '\u00A2',
  sect: '\u00A7', para: '\u00B6', frac12: '\u00BD', rarr: '\u2192', larr: '\u2190',
  eacute: '\u00E9', egrave: '\u00E8', uuml: '\u00FC', ouml: '\u00F6', auml: '\u00E4', ntilde: '\u00F1',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => NAMED_ENTITIES[name] ?? match)
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" isn't double-decoded
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

// Feeds use many date formats; Hermes only parses some. Try a few normalisations and
// always return a valid ISO string (falls back to "now" so the date is never raw junk).
const TIMEZONES: Record<string, string> = {
  UT: '+0000', UTC: '+0000', GMT: '+0000', Z: '+0000',
  EST: '-0500', EDT: '-0400', CST: '-0600', CDT: '-0500',
  MST: '-0700', MDT: '-0600', PST: '-0800', PDT: '-0700',
  IST: '+0530', CET: '+0100', CEST: '+0200', BST: '+0100',
};

function normalizeDate(raw: unknown): string {
  const text = (typeof raw === 'string' ? raw : (raw as any)?.['#text'] ?? '').toString().trim();
  const candidates = [
    text,
    text.replace(' ', 'T'),
    text.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'),
    text.replace(/\s+([A-Z]{1,4})$/, (_: string, tz: string) => (TIMEZONES[tz] ? ` ${TIMEZONES[tz]}` : ` ${tz}`)),
    text.replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2'),
  ];
  for (const c of candidates) {
    const t = Date.parse(c);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

function cleanHtmlText(html: unknown): string {
  if (!html) return '';
  if (typeof html === 'object') html = (html as any)['#text'] ?? '';
  if (typeof html !== 'string') return '';
  return decodeEntities(html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// Skips tiny tracking beacons and data URIs; the first <img> in a feed is often a beacon.
function extractImageUrlFromHtml(html: string): string | undefined {
  if (!html) return undefined;
  const imgMatches = html.matchAll(/<img\b[^>]*>/gi);
  for (const match of imgMatches) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const url = srcMatch[1].trim();
    if (!url || url.startsWith('data:')) continue;
    if (/\b(?:width|height)=["']?([0-2])["']?(?=[\s/>"'])/i.test(tag)) continue;
    if (/(?:\b1x1\b|[/_-]pixel\.(?:gif|png)|\bbeacon\b|\/~\/i\/|feedburner\.com\/~r\/)/i.test(url)) continue;
    return url;
  }
  return undefined;
}

function extractHeroImage(item: any): string | undefined {
  // 1. Check enclosure
  if (item.enclosure) {
    const enclosures = Array.isArray(item.enclosure) ? item.enclosure : [item.enclosure];
    for (const enc of enclosures) {
      const url = enc['@_url'];
      const type = enc['@_type'] || '';
      if (url && (type.includes('image') || url.match(/\.(jpg|jpeg|png|webp|avif)/i))) {
        return url;
      }
    }
  }

  // 2. Check media:content
  const mediaContent = item['media:content'];
  if (mediaContent) {
    const medias = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    for (const m of medias) {
      if (m['@_url']) return m['@_url'];
    }
  }

  // 3. Check media:thumbnail
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    const thumbs = Array.isArray(mediaThumbnail) ? mediaThumbnail : [mediaThumbnail];
    for (const t of thumbs) {
      if (t['@_url']) return t['@_url'];
    }
  }

  // 4. Check content:encoded or description for <img>
  const content = item['content:encoded'] || item.content || item.summary || item.description || '';
  const rawHtml = typeof content === 'string' ? content : (content['#text'] || '');
  const imgFromHtml = extractImageUrlFromHtml(rawHtml);
  if (imgFromHtml) return imgFromHtml;

  return undefined;
}

function normalizeLink(linkData: any): string {
  if (!linkData) return '';
  if (typeof linkData === 'string') return linkData;
  if (linkData['@_href']) return linkData['@_href'];
  if (Array.isArray(linkData)) {
    const alt = linkData.find((l: any) => l['@_rel'] === 'alternate') || linkData[0];
    return alt?.['@_href'] || alt?.['#text'] || '';
  }
  if (linkData['#text']) return linkData['#text'];
  return '';
}

function extractFeedIcon(container: any, feedUrl?: string): string | undefined {
  if (!container || typeof container !== 'object') return undefined;

  let rawUrl = '';

  // 1. Check <icon>
  if (container.icon) {
    const icon = Array.isArray(container.icon) ? container.icon[0] : container.icon;
    rawUrl = (typeof icon === 'string' ? icon : icon?.['#text'] || '').trim();
  }

  // 2. Check <image>
  if (!rawUrl && container.image) {
    const img = Array.isArray(container.image) ? container.image[0] : container.image;
    if (typeof img === 'string') {
      rawUrl = img.trim();
    } else if (img && typeof img === 'object') {
      const u = img.url ?? img['#text'];
      rawUrl = (typeof u === 'string' ? u : u?.['#text'] || '').trim();
    }
  }

  // 3. Check <logo>
  if (!rawUrl && container.logo) {
    const logo = Array.isArray(container.logo) ? container.logo[0] : container.logo;
    rawUrl = (typeof logo === 'string' ? logo : logo?.['#text'] || '').trim();
  }

  // 4. Check <itunes:image>
  if (!rawUrl && container['itunes:image']) {
    const itunes = Array.isArray(container['itunes:image']) ? container['itunes:image'][0] : container['itunes:image'];
    rawUrl = (itunes?.['@_href'] || itunes?.['#text'] || '').trim();
  }

  if (!rawUrl) return undefined;

  if (feedUrl && (rawUrl.startsWith('/') || !/^https?:\/\//i.test(rawUrl))) {
    return resolveRelativeUrl(rawUrl, feedUrl);
  }

  return rawUrl;
}

export function parseFeedXml(
  xmlText: string,
  feedName: string,
  limit = 4,
  feedUrl?: string
): { title: string; entries: RawFeedEntry[]; iconUrl?: string } {
  let jsonObj: any;
  try {
    jsonObj = parser.parse(xmlText);
  } catch (err) {
    throw new Error(`${feedName}: Invalid XML - ${err instanceof Error ? err.message : String(err)}`);
  }

  const entries: RawFeedEntry[] = [];
  let title = '';

  // RSS 2.0 format
  if (jsonObj.rss?.channel) {
    const channel = jsonObj.rss.channel;
    const rawTitle = channel.title;
    title = cleanHtmlText(typeof rawTitle === 'string' ? rawTitle : rawTitle?.['#text'] || '');
    const iconUrl = extractFeedIcon(channel, feedUrl);

    if (channel.item) {
      const items = Array.isArray(channel.item) ? channel.item : [channel.item];
      for (const item of items.slice(0, limit)) {
        try {
          const itemTitle = cleanHtmlText(item.title || '');
          const link = normalizeLink(item.link);
          const guid = item.guid ? (typeof item.guid === 'string' ? item.guid : item.guid['#text']) : link;
          const rawContent = item['content:encoded'] || item.description || '';
          const summaryText = cleanHtmlText(typeof rawContent === 'string' ? rawContent : (rawContent?.['#text'] || ''));
          const published = normalizeDate(item.pubDate || item.date);
          const imageUrl = extractHeroImage(item);

          const rawTags = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
          const tags = rawTags.map((t: any) => cleanHtmlText(typeof t === 'string' ? t : (t?.['#text'] || '')));

          if (itemTitle && link) {
            entries.push({
              id: guid || link,
              title: itemTitle,
              link,
              summary: summaryText,
              content: summaryText,
              published,
              imageUrl,
              sourceName: feedName,
              tags
            });
          }
        } catch (itemErr) {
          console.warn(`Skipping malformed item in ${feedName}:`, itemErr);
        }
      }
    }
    return { title, entries, iconUrl: iconUrl || undefined };
  }

  // Atom format
  if (jsonObj.feed) {
    const rawTitle = jsonObj.feed.title;
    title = cleanHtmlText(typeof rawTitle === 'string' ? rawTitle : rawTitle?.['#text'] || '');
    const iconUrl = extractFeedIcon(jsonObj.feed, feedUrl);

    if (jsonObj.feed.entry) {
      const items = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
      for (const item of items.slice(0, limit)) {
        try {
          const itemTitle = cleanHtmlText(typeof item.title === 'string' ? item.title : item.title?.['#text'] || '');
          const link = normalizeLink(item.link);
          const id = item.id ? (typeof item.id === 'string' ? item.id : item.id?.['#text']) : link;
          const rawSummary = item.summary || item.content || '';
          const summaryText = cleanHtmlText(typeof rawSummary === 'string' ? rawSummary : (rawSummary?.['#text'] || ''));
          const published = normalizeDate(item.published || item.updated);
          const imageUrl = extractHeroImage(item);

          const rawCategories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
          const tags = rawCategories.map((c: any) => c['@_term'] || c['#text'] || '');

          if (itemTitle && link) {
            entries.push({
              id: id || link,
              title: itemTitle,
              link,
              summary: summaryText,
              content: summaryText,
              published,
              imageUrl,
              sourceName: feedName,
              tags
            });
          }
        } catch (itemErr) {
          console.warn(`Skipping malformed item in ${feedName}:`, itemErr);
        }
      }
    }
    return { title, entries, iconUrl: iconUrl || undefined };
  }

  throw new Error(`${feedName} is not an RSS or Atom feed`);
}

export const RssParserService = {
  async fetchFeedWithMeta(
    feedName: string,
    feedUrl: string,
    limit = 4
  ): Promise<{ entries: RawFeedEntry[]; iconUrl?: string; resolvedUrl?: string }> {
    const normalized = normalizeFeedUrl(feedUrl);
    let response: { ok: boolean; status: number; text: string };
    let directFetchFailed = false;

    try {
      response = await fetchTextWithTimeout(normalized, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      if (!response.ok) {
        directFetchFailed = true;
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        throw err;
      }
      directFetchFailed = true;
      response = { ok: false, status: 0, text: '' };
    }

    if (directFetchFailed) {
      // Auto-healing: attempt candidate discovery and repair before throwing
      try {
        const resolved = await this.resolveFeed(feedName, normalized, limit);
        if (resolved.entries.length > 0) {
          return {
            entries: resolved.entries,
            iconUrl: resolved.iconUrl,
            resolvedUrl: resolved.feedUrl,
          };
        }
      } catch {
        // Fall back to original HTTP error
      }
      throw new Error(`HTTP ${response.status || 'failed'} fetching ${feedName}`);
    }

    const { entries, iconUrl } = parseFeedXml(response.text, feedName, limit, normalized);
    return { entries, iconUrl };
  },

  async fetchFeedEntries(feedName: string, feedUrl: string, limit = 4): Promise<RawFeedEntry[]> {
    const { entries } = await this.fetchFeedWithMeta(feedName, feedUrl, limit);
    return entries;
  },

  async resolveFeed(feedName: string, inputUrl: string, limit = 4): Promise<ResolvedFeed> {
    const normalized = normalizeFeedUrl(inputUrl);

    // 1. Direct fetch attempt
    let initialText: string | null = null;
    try {
      const response = await fetchTextWithTimeout(
        normalized,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
          },
        },
        8000
      );

      if (response.ok) {
        initialText = response.text;
        try {
          const { title, entries, iconUrl } = parseFeedXml(initialText, feedName, limit, normalized);
          if (entries.length > 0) {
            return { feedUrl: normalized, feedTitle: title, entries, iconUrl };
          }
        } catch {
          // Response was not valid RSS/Atom XML directly; proceed to discovery
        }
      }
    } catch {
      // Direct fetch failed; proceed to discovery
    }

    // 2. Candidate collection for discovery
    const candidates: string[] = [];

    // 2a. Check canonical registry mapping or known redirects first
    const canonical = findCanonicalFeedUrl({ id: '', name: feedName, url: normalized });
    if (canonical && canonical !== normalized && !candidates.includes(canonical)) {
      candidates.push(canonical);
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(normalized);
    } catch {}

    const domain = parsedUrl?.hostname.toLowerCase().replace(/^www\./, '');
    const lowerFeedName = (feedName || '').trim().toLowerCase();

    // 2b. Match against known TOPICS registry feeds by domain or name
    for (const topic of TOPICS) {
      for (const f of topic.feeds) {
        try {
          const h = new URL(f.url).hostname.toLowerCase().replace(/^www\./, '');
          const fLowerName = f.name.toLowerCase();
          const matchesDomain =
            domain &&
            (h === domain ||
              (domain.includes('deepmind') && h.includes('deepmind')) ||
              (domain.includes('openai') && h.includes('openai')));
          const matchesName =
            (lowerFeedName.includes('deepmind') && fLowerName.includes('deepmind')) ||
            (lowerFeedName.includes('openai') && fLowerName.includes('openai')) ||
            (lowerFeedName && fLowerName === lowerFeedName);

          if ((matchesDomain || matchesName) && !candidates.includes(f.url)) {
            candidates.push(f.url);
          }
        } catch {}
      }
    }

    // 2b. Extract <link rel="alternate"> tags from initial HTML if available
    if (initialText) {
      const linkRegex = /<link[^>]+(?:type=["']application\/(?:rss|atom)\+xml["']|rel=["']alternate["'])[^>]*>/gi;
      const tags = initialText.match(linkRegex) || [];
      for (const tag of tags) {
        const isAlternate = /rel=["']alternate["']/i.test(tag);
        const isFeed = /type=["']application\/(?:rss|atom)\+xml["']/i.test(tag);
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (isAlternate && isFeed && hrefMatch) {
          try {
            const resolved = new URL(hrefMatch[1], normalized).href;
            if (!candidates.includes(resolved)) {
              candidates.push(resolved);
            }
          } catch {}
        }
      }
    }

    // 2c. Standard RSS endpoint paths
    if (parsedUrl) {
      const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const pathname = parsedUrl.pathname.replace(/\/+$/, '');
      const standardPaths = [
        `${origin}/rss`,
        `${origin}/rss/`,
        `${origin}/feed`,
        `${origin}/feed/`,
        `${origin}/rss.xml`,
        `${origin}/feed.xml`,
        `${origin}/atom.xml`,
        `${origin}/index.xml`,
      ];
      if (pathname && pathname !== '/') {
        standardPaths.unshift(`${origin}${pathname}/feed`, `${origin}${pathname}/rss`);
      }
      for (const p of standardPaths) {
        if (!candidates.includes(p) && p !== normalized) {
          candidates.push(p);
        }
      }
    }

    // 3. Probe candidates sequentially until one returns valid entries
    for (const candidateUrl of candidates) {
      try {
        const response = await fetchTextWithTimeout(
          candidateUrl,
          {
            headers: {
              'User-Agent': USER_AGENT,
              'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
          },
          6000
        );

        if (response.ok) {
          const { title, entries, iconUrl } = parseFeedXml(response.text, feedName, limit, candidateUrl);
          if (entries.length > 0) {
            return { feedUrl: candidateUrl, feedTitle: title, entries, iconUrl };
          }
        }
      } catch {
        // Continue to next candidate
      }
    }

    throw new Error(`Could not discover an RSS or Atom feed for ${feedName} at ${inputUrl}`);
  },

  // If the feed gave us (almost) no text, fetch the article page and use its
  // readable text instead. Best effort: on any failure the entry is returned as is.
  async withArticleText(entry: RawFeedEntry): Promise<RawFeedEntry> {
    if ((entry.content || '').length >= 300) return entry;
    try {
      const res = await fetchTextWithTimeout(
        entry.link,
        { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } },
        10000
      );
      if (!res.ok) {
        // Anti-bot protection (e.g. 403 on Cloudflare-protected sites like Product Hunt)
        // or missing pages: best-effort fallback to the RSS summary.
        return entry;
      }
      const html = res.text;
      const region =
        html.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
        html.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
        html;
      const text = cleanHtmlText(region).slice(0, 6000);
      return text.length > (entry.content || '').length
        ? { ...entry, content: text, summary: text.slice(0, 3000) }
        : entry;
    } catch {
      return entry;
    }
  },

  // `prefilter` is null for on-topic feeds (and topics without keywords): everything is a
  // candidate and Gemini decides. Otherwise the entry must match a keyword.
  isCandidateArticle(entry: RawFeedEntry, prefilter: RegExp | null): boolean {
    if (!prefilter) return true;
    const textToMatch = `${entry.title} ${entry.summary} ${(entry.tags || []).join(' ')}`;
    return prefilter.test(textToMatch);
  }
};
