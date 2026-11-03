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
