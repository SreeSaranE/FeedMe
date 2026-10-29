import { XMLParser } from 'fast-xml-parser';
import { RawFeedEntry } from '../types';
import { fetchTextWithTimeout } from './http';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
});

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
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

function extractImageUrlFromHtml(html: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    const url = match[1];
    if (!url.includes('1x1') && !url.includes('pixel') && !url.includes('beacon')) {
      return url;
    }
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

export const RssParserService = {
  async fetchFeedEntries(feedName: string, feedUrl: string, limit = 5): Promise<RawFeedEntry[]> {
    const response = await fetchTextWithTimeout(feedUrl, {
      headers: {
        'User-Agent': 'FeedMe-Mobile/1.0 (React Native)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${feedName}`);
    }

    const jsonObj = parser.parse(response.text);

    const entries: RawFeedEntry[] = [];

    // RSS 2.0 format
    if (jsonObj.rss?.channel?.item) {
      const items = Array.isArray(jsonObj.rss.channel.item)
        ? jsonObj.rss.channel.item
        : [jsonObj.rss.channel.item];

      for (const item of items.slice(0, limit)) {
        try {
          const title = cleanHtmlText(item.title || '');
          const link = normalizeLink(item.link);
          const guid = item.guid ? (typeof item.guid === 'string' ? item.guid : item.guid['#text']) : link;
          const rawContent = item['content:encoded'] || item.description || '';
          const summaryText = cleanHtmlText(typeof rawContent === 'string' ? rawContent : (rawContent['#text'] || ''));
          const published = normalizeDate(item.pubDate || item.date);
          const imageUrl = extractHeroImage(item);

          const rawTags = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
          const tags = rawTags.map((t: any) => cleanHtmlText(typeof t === 'string' ? t : (t['#text'] || '')));

          if (title && link) {
            entries.push({
              id: guid || link,
              title,
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
          // One malformed item shouldn't drop the whole feed
          console.warn(`Skipping malformed item in ${feedName}:`, itemErr);
        }
      }
      return entries;
    }

    // Atom format
    if (jsonObj.feed?.entry) {
      const items = Array.isArray(jsonObj.feed.entry)
        ? jsonObj.feed.entry
        : [jsonObj.feed.entry];

      for (const item of items.slice(0, limit)) {
        try {
          const title = cleanHtmlText(typeof item.title === 'string' ? item.title : item.title?.['#text'] || '');
          const link = normalizeLink(item.link);
          const id = item.id ? (typeof item.id === 'string' ? item.id : item.id['#text']) : link;
          const rawSummary = item.summary || item.content || '';
          const summaryText = cleanHtmlText(typeof rawSummary === 'string' ? rawSummary : (rawSummary['#text'] || ''));
          const published = normalizeDate(item.published || item.updated);
          const imageUrl = extractHeroImage(item);

          const rawCategories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
          const tags = rawCategories.map((c: any) => c['@_term'] || c['#text'] || '');

          if (title && link) {
            entries.push({
              id: id || link,
              title,
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
          // One malformed item shouldn't drop the whole feed
          console.warn(`Skipping malformed item in ${feedName}:`, itemErr);
        }
      }
      return entries;
    }

    return entries;
  },

  // If the feed gave us (almost) no text, fetch the article page and use its
  // readable text instead. Best effort: on any failure the entry is returned as is.
  async withArticleText(entry: RawFeedEntry): Promise<RawFeedEntry> {
    if ((entry.content || '').length >= 300) return entry;
    try {
      const res = await fetchTextWithTimeout(entry.link, { headers: { Accept: 'text/html' } }, 10000);
      if (!res.ok) return entry;
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
