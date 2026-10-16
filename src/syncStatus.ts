import { SyncProgress } from './types';

export interface SyncStatus {
  text: string; // '' when there is nothing to say
  isError: boolean;
  percent: number | null; // null when not syncing
}

// Turns raw sync progress into the one-line status shown in the top bar.
export function getSyncStatus(progress: SyncProgress): SyncStatus {
  if (progress.isSyncing) {
    const percent =
      progress.totalFeeds > 0
        ? Math.min(100, Math.round((progress.currentIndex / progress.totalFeeds) * 100))
        : 0;
    const feed = progress.statusText ? ` · ${progress.statusText}` : '';
    return {
      text: `Syncing ${progress.currentIndex}/${progress.totalFeeds}${feed}`,
      isError: false,
      percent,
    };
  }

  // After a run, surface problems (if any) until the next sync starts.
  if (progress.offline) {
    return { text: 'No internet connection · rest retries next sync', isError: true, percent: null };
  }
  if (progress.fatalMessage) {
    return { text: `${progress.fatalMessage} · check Settings`, isError: true, percent: null };
  }
  if (progress.quotaMessage) {
    return { text: `${progress.quotaMessage} · rest retries next sync`, isError: true, percent: null };
  }
  const problems = [
    progress.failedFeeds ? `${progress.failedFeeds} feed${progress.failedFeeds === 1 ? '' : 's'} failed` : '',
    progress.failedArticles
      ? `${progress.failedArticles} article${progress.failedArticles === 1 ? '' : 's'} failed`
      : '',
  ].filter(Boolean);
  return { text: problems.join(' · '), isError: problems.length > 0, percent: null };
}
