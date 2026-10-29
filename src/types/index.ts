export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  category?: string;
}

export interface RawFeedEntry {
  id: string;
  title: string;
  link: string;
  summary: string;
  content?: string;
  published: string;
  imageUrl?: string;
  sourceName: string;
  tags?: string[];
}

// A topic id from constants/topics.ts (or 'tech' / 'both' for older stored articles)
export type ArticleCategory = string;

export interface SummarizedArticle {
  id: string;
  title: string;
  link: string;
  sourceName: string;
  category: ArticleCategory;
  published: string;
  imageUrl?: string;
  bulletSummary: string[];
  significance: string;
  isRelevant: boolean;
  isBookmarked?: boolean;
  isRead?: boolean;
  isSample?: boolean; // built-in how-to card, removed once real articles arrive
  fetchedAt: string;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  autoSyncOnStart: boolean;
  articlesPerFeed: number;
  deleteOlderThanDays: number;
  selectedTopics: string[]; // topic ids from constants/topics.ts
  onboardingCompleted: boolean;
}

export interface SyncProgress {
  isSyncing: boolean;
  currentFeed: string;
  currentIndex: number;
  totalFeeds: number;
  articlesSummarized: number;
  statusText: string;
  // Problems seen during the run, shown after it finishes
  failedFeeds?: number;
  failedArticles?: number;
  quotaMessage?: string; // 429: rate limit or daily quota reached
  offline?: boolean; // the sync stopped because there is no internet connection
  fatalMessage?: string; // e.g. API key rejected; the sync stopped early
}
