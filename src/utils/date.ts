import { SummarizedArticle } from '../types';

// "5m ago", "3h ago", "Yesterday", "4d ago", then "Oct 14" for anything older.
const formatPublishDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// "Oct 29, 2026" or '' if invalid
export const formatFullDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const articleDateLabel = (
  article: Pick<SummarizedArticle, 'published' | 'fetchedAt'>
): string => {
  return formatPublishDate(article.published) || formatPublishDate(article.fetchedAt);
};
