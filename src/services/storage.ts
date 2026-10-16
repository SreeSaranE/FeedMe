import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { FeedConfig, SummarizedArticle, AppSettings } from '../types';
import {
  AVAILABLE_MODELS,
  REMOVED_DEFAULT_FEED_NAMES,
  DEFAULT_FEEDS,
  DEFAULT_FEEDS_VERSION,
  REMOVED_DEFAULT_FEED_IDS,
} from '../constants/defaultFeeds';

const KEYS = {
  ARTICLES: '@rss_digest_articles_v1',
  PROCESSED_IDS: '@rss_digest_processed_ids_v1',
  FEEDS: '@rss_digest_feeds_v1',
  FEEDS_VERSION: '@rss_digest_feeds_defaults_version',
  SETTINGS: '@rss_digest_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '', // user-entered in Settings (not an EXPO_PUBLIC_ var: those are bundled into the app)
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite',
  autoSyncOnStart: true,
  articlesPerFeed: 3,
  deleteOlderThanDays: 10,
};

const API_KEY_STORE = 'gemini_api_key';

const MAX_UNREAD_ARTICLES = 300;
const MAX_READ_ARTICLES = 300; // read articles have their own cap so they never crowd out new ones
const MAX_PROCESSED_IDS = 3000;

// All read-modify-write operations on the article list go through this queue,
// so a bookmark toggle can never interleave with (and be lost to) a sync save.
let articlesLock: Promise<unknown> = Promise.resolve();
function withArticlesLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = articlesLock.then(fn, fn);
  articlesLock = run.catch(() => undefined);
  return run;
}

// Bumped by clearArticles so an in-flight sync can tell its data is stale.
let clearEpoch = 0;

// A model that is no longer offered (removed from the list, or saved by an old
// version) would make every Gemini call fail, so fall back to the default.
const normalizeSettings = (settings: AppSettings): AppSettings =>
  AVAILABLE_MODELS.some(m => m.value === settings.geminiModel)
    ? settings
    : { ...settings, geminiModel: AVAILABLE_MODELS[0].value };

// Stored articles must always be safe to render: coerce text fields to strings.
const asText = (v: unknown) => (typeof v === 'string' ? v : '');
const sanitizeArticle = (a: SummarizedArticle): SummarizedArticle => ({
  ...a,
  title: asText(a.title),
  significance: asText(a.significance),
  sourceName: asText(a.sourceName),
  bulletSummary: Array.isArray(a.bulletSummary)
    ? a.bulletSummary.filter((b): b is string => typeof b === 'string')
    : [],
});

// Publish time, else fetch time, else null (no usable date at all).
const articleTime = (a: SummarizedArticle): number | null => {
  const t = Date.parse(a.published);
  if (!Number.isNaN(t)) return t;
  const f = Date.parse(a.fetchedAt);
  return Number.isNaN(f) ? null : f;
};
const publishedTime = (a: SummarizedArticle) => articleTime(a) ?? 0;
const fetchedTime = (a: SummarizedArticle) => {
  const t = Date.parse(a.fetchedAt);
  return Number.isNaN(t) ? 0 : t;
};

export const StorageService = {
  async getArticles(): Promise<SummarizedArticle[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ARTICLES);
      const parsed: SummarizedArticle[] = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed.map(sanitizeArticle) : [];
    } catch {
      return [];
    }
  },

  async saveArticles(articles: SummarizedArticle[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.ARTICLES, JSON.stringify(articles));
      return true;
    } catch (e) {
      console.error('Error saving articles', e);
      return false;
    }
  },

  toggleBookmark(articleId: string): Promise<SummarizedArticle[]> {
    return withArticlesLock(async () => {
      const articles = await this.getArticles();
      const updated = articles.map(art =>
        art.id === articleId ? { ...art, isBookmarked: !art.isBookmarked } : art
      );
      await this.saveArticles(updated);
      return updated;
    });
  },

  // Delete articles published more than `days` days ago. Bookmarked articles are
  // kept. Their IDs stay in the processed list, so they are not fetched again.
  deleteArticlesOlderThan(
    days: number
  ): Promise<{ removed: number; articles: SummarizedArticle[] }> {
    return withArticlesLock(async () => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const articles = await this.getArticles();
      // Articles with no usable date are kept (we can't tell they are old)
      const kept = articles.filter(a => {
        const t = articleTime(a);
        return a.isBookmarked || t === null || t >= cutoff;
      });
      const removed = articles.length - kept.length;
      if (removed > 0) await this.saveArticles(kept);
      return { removed, articles: kept };
    });
  },

  toggleRead(articleId: string): Promise<SummarizedArticle[]> {
    return withArticlesLock(async () => {
      const articles = await this.getArticles();
      const updated = articles.map(art =>
        art.id === articleId ? { ...art, isRead: !art.isRead } : art
      );
      await this.saveArticles(updated);
      return updated;
    });
  },

  // Merge new articles into what is stored *now*; returns the saved list, or null
  // if saving failed. Newest published first; bookmarks never count toward the cap.
  mergeArticles(newArticles: SummarizedArticle[]): Promise<SummarizedArticle[] | null> {
    return withArticlesLock(async () => {
      const existing = await this.getArticles();
      // Existing copies come first so they win: a stored article keeps its
      // read/bookmark state even if the same ID is fetched again.
      const seen = new Set<string>();
      const unique = [...existing, ...newArticles].filter(a =>
        seen.has(a.id) ? false : (seen.add(a.id), true)
      );
      // The cap drops the articles fetched longest ago (bookmarks are always kept), so a
      // just-fetched article with an old publish date is never dropped on arrival.
      const byFetched = [...unique].sort((x, y) => fetchedTime(y) - fetchedTime(x));
      const unread = byFetched.filter(a => !a.isBookmarked && !a.isRead).slice(0, MAX_UNREAD_ARTICLES);
      const read = byFetched.filter(a => !a.isBookmarked && a.isRead).slice(0, MAX_READ_ARTICLES);
      const keepIds = new Set([...unique.filter(a => a.isBookmarked), ...unread, ...read].map(a => a.id));
      // Displayed newest-published first
      const merged = unique
        .filter(a => keepIds.has(a.id))
        .sort((x, y) => publishedTime(y) - publishedTime(x));
      return (await this.saveArticles(merged)) ? merged : null;
    });
  },

  async getProcessedIds(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PROCESSED_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveProcessedIds(ids: string[]): Promise<void> {
    try {
      // Keep only the most recent IDs so this list can't grow forever
      await AsyncStorage.setItem(KEYS.PROCESSED_IDS, JSON.stringify(ids.slice(-MAX_PROCESSED_IDS)));
    } catch (e) {
      console.error('Error saving processed IDs', e);
    }
  },

  async getFeeds(): Promise<FeedConfig[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.FEEDS);
      if (!data) {
        await AsyncStorage.multiSet([
          [KEYS.FEEDS, JSON.stringify(DEFAULT_FEEDS)],
          [KEYS.FEEDS_VERSION, String(DEFAULT_FEEDS_VERSION)],
        ]);
        return DEFAULT_FEEDS;
      }

      let feeds: FeedConfig[] = JSON.parse(data);
      const savedVersion = Number(await AsyncStorage.getItem(KEYS.FEEDS_VERSION)) || 1;
      if (savedVersion < DEFAULT_FEEDS_VERSION) {
        // Upgrade a saved list: drop retired defaults, add new ones. Custom feeds
        // and the enabled/disabled state of existing feeds are kept.
        const known = new Set(feeds.map(f => f.id));
        feeds = [
          ...feeds.filter(f => !REMOVED_DEFAULT_FEED_IDS.includes(f.id)),
          ...DEFAULT_FEEDS.filter(f => !known.has(f.id)),
        ];
        await withArticlesLock(async () => {
          const articles = await this.getArticles();
          const kept = articles.filter(
            a => a.isBookmarked || !REMOVED_DEFAULT_FEED_NAMES.includes(a.sourceName)
          );
          if (kept.length !== articles.length) await this.saveArticles(kept);
        });
        await AsyncStorage.multiSet([
          [KEYS.FEEDS, JSON.stringify(feeds)],
          [KEYS.FEEDS_VERSION, String(DEFAULT_FEEDS_VERSION)],
        ]);
      }
      return feeds;
    } catch {
      return DEFAULT_FEEDS;
    }
  },

  async saveFeeds(feeds: FeedConfig[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.FEEDS, JSON.stringify(feeds));
    } catch (e) {
      console.error('Error saving feeds', e);
    }
  },

  // The API key lives in the platform keystore (SecureStore), not in AsyncStorage.
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      const stored = data ? JSON.parse(data) : {};
      let apiKey: string = (await SecureStore.getItemAsync(API_KEY_STORE).catch(() => null)) ?? '';

      // One-time migration of a key saved by an older version in plain AsyncStorage
      if (!apiKey && typeof stored.geminiApiKey === 'string' && stored.geminiApiKey) {
        apiKey = stored.geminiApiKey;
        if (await this.writeApiKey(apiKey)) {
          await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...stored, geminiApiKey: '' }));
        }
      }
      return normalizeSettings({ ...DEFAULT_SETTINGS, ...stored, geminiApiKey: apiKey });
    } catch {
      return normalizeSettings(DEFAULT_SETTINGS);
    }
  },

  // Returns false if the keystore is unavailable (the key is then kept in AsyncStorage).
  async writeApiKey(key: string): Promise<boolean> {
    try {
      if (key) await SecureStore.setItemAsync(API_KEY_STORE, key);
      else await SecureStore.deleteItemAsync(API_KEY_STORE);
      return true;
    } catch {
      return false;
    }
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const inKeystore = await this.writeApiKey(settings.geminiApiKey);
      await AsyncStorage.setItem(
        KEYS.SETTINGS,
        JSON.stringify({ ...settings, geminiApiKey: inKeystore ? '' : settings.geminiApiKey })
      );
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  getClearEpoch(): number {
    return clearEpoch;
  },

  clearArticles(): Promise<void> {
    clearEpoch++;
    return withArticlesLock(async () => {
      try {
        // Store an empty list (not removeItem) so getArticles doesn't re-seed the samples
        await AsyncStorage.setItem(KEYS.ARTICLES, JSON.stringify([]));
        await AsyncStorage.removeItem(KEYS.PROCESSED_IDS);
      } catch (e) {
        console.error('Error clearing articles cache', e);
      }
    });
  }
};
