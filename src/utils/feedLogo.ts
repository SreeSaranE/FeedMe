import { normalizeFeedUrl } from './url';

/**
 * Extracts a clean domain from a URL (e.g. "https://blog.google/technology/ai/rss/" -> "blog.google").
 * Strips leading "www." and converts to lowercase.
 */
export function getDomainFromUrl(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  try {
    const normalized = normalizeFeedUrl(raw);
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname || hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Resolves a relative URL against a base URL.
 */
export function resolveRelativeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, normalizeFeedUrl(baseUrl)).href;
  } catch {
    return url;
  }
}

/**
 * Resolves a logo URL for a feed.
 * 1. Returns `feed.iconUrl` if already explicitly provided.
 * 2. If not, derives the domain from `feed.url` and queries Google Favicon Service.
 * 3. Returns `null` if no valid domain can be derived.
 */
export function getFeedLogoUrl(feed: { url?: string; iconUrl?: string }): string | null {
  if (feed.iconUrl && feed.iconUrl.trim().length > 0) {
    const trimmed = feed.iconUrl.trim();
    if (trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (feed.url && (trimmed.startsWith('/') || !/^https?:\/\//i.test(trimmed))) {
      return resolveRelativeUrl(trimmed, feed.url);
    }
    return trimmed;
  }
  if (!feed.url) return null;
  const domain = getDomainFromUrl(feed.url);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}
