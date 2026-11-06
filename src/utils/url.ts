// Normalizes RSS feed URLs: ensures a scheme is present so Android fetch does not reject them.
export function normalizeFeedUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Strip feed: or feed:// wrapper common in RSS subscription links
  const url = trimmed.replace(/^feed:(https?:\/\/)/i, '$1').replace(/^feed:\/\//i, '');

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url; // Other scheme (e.g. ftp://): keep as is

  return `https://${url}`;
}

/**
 * Normalizes a URL for canonical comparison (ignores scheme http/https, host casing, trailing slash).
 */
export function normalizeForComparison(raw: string): string {
  try {
    const normalized = normalizeFeedUrl(raw);
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.hostname.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return normalizeFeedUrl(raw).replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Checks if two feed URLs point to the same resource.
 */
export function areFeedUrlsEqual(a: string, b: string): boolean {
  return normalizeForComparison(a) === normalizeForComparison(b);
}
