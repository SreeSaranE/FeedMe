import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { StorageService, DEFAULT_SETTINGS } from '../services/storage';
import { resolveTopics, articleMatchesTopic } from '../constants/topics';
import { PipelineService } from '../services/pipelineService';
import { SummarizedArticle, FeedConfig, AppSettings, SyncProgress } from '../types';

export function useAppState() {
  const [articles, setArticles] = useState<SummarizedArticle[]>([]);
  const [feeds, setFeeds] = useState<FeedConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isSyncing: false,
    currentFeed: '',
    currentIndex: 0,
    totalFeeds: 0,
    articlesSummarized: 0,
    statusText: '',
  });

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [showReadOnly, setShowReadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Guards against overlapping syncs (state would be stale inside early callbacks)
  const isSyncingRef = useRef(false);
  // Set when a sync stopped for lack of internet; it is retried when the app is next opened.
  const resumeWhenActiveRef = useRef(false);

  // Sync execution
  // `silent` suppresses the "missing API key" alert (used by the automatic startup sync).
  const runSync = useCallback(async (silent = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    setSyncProgress(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await PipelineService.runSync(
        progress => setSyncProgress(progress),
        setArticles
      );
      setArticles(result.allArticles);
      resumeWhenActiveRef.current = !!result.offline;
      if (result.missingApiKey && !silent) {
        Alert.alert('API key needed', 'Add your Gemini API key in Settings → API Settings to sync articles.');
      }
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      isSyncingRef.current = false;
      setSyncProgress(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Initialize and load saved state
  const loadInitialData = useCallback(async () => {
    try {
      const [savedArticles, savedFeeds, savedSettings] = await Promise.all([
        StorageService.getArticles(),
        StorageService.getFeeds(),
        StorageService.getSettings(),
      ]);

      setArticles(savedArticles);
      setFeeds(savedFeeds);
      setSettings(savedSettings);

      // Auto-sync on startup when enabled (the list is seeded, so it is never empty)
      if (savedSettings.autoSyncOnStart) {
        runSync(true);
      }
    } catch (e) {
      console.error('Failed to load saved data', e);
    }
  }, [runSync]);

  // Syncing continues while the app is minimized (as far as Android allows). If the connection
  // dropped meanwhile and the sync stopped, pick it up again when the app returns to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && resumeWhenActiveRef.current && !isSyncingRef.current) {
        resumeWhenActiveRef.current = false;
        runSync(true);
      }
    });
    return () => sub.remove();
  }, [runSync]);

  useEffect(() => {
    // Loading persisted state on mount is a legitimate effect-time state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitialData();
  }, [loadInitialData]);

  const toggleBookmark = useCallback(async (id: string) => {
    const updated = await StorageService.toggleBookmark(id);
    setArticles(updated);
  }, []);

  const toggleRead = useCallback(async (id: string) => {
    const updated = await StorageService.toggleRead(id);
    setArticles(updated);
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    await StorageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const saveFeeds = async (newFeeds: FeedConfig[]) => {
    await StorageService.saveFeeds(newFeeds);
    setFeeds(newFeeds);
  };

  const deleteOlder = async (days: number) => {
    const { removed, articles: kept } = await StorageService.deleteArticlesOlderThan(days);
    setArticles(kept);
    return removed;
  };

  const clearCache = async () => {
    await StorageService.clearArticles();
    setArticles([]);
  };

  // Which articles the current view covers: Read, Saved (bookmarked, read or not),
  // or Home (unread only).
  const viewArticles = useMemo(() => {
    if (showReadOnly) return articles.filter(a => a.isRead);
    if (showBookmarksOnly) return articles.filter(a => a.isBookmarked);
    return articles.filter(a => !a.isRead);
  }, [articles, showReadOnly, showBookmarksOnly]);

  // Extract list of unique available sources (for the current view)
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    viewArticles.forEach(a => {
      if (a.sourceName) sources.add(a.sourceName);
    });
    return Array.from(sources);
  }, [viewArticles]);

  // A source filter whose source no longer has articles falls back to 'All'
  const activeSource =
    selectedSource !== 'All' && !availableSources.includes(selectedSource) ? 'All' : selectedSource;

  // One chip per selected topic, plus 'other' when the view has articles that fit none of
  // them (a topic that was deselected later, or an older uncategorized article).
  const topics = useMemo(() => resolveTopics(settings.selectedTopics), [settings.selectedTopics]);
  const categoryChips = useMemo(() => {
    const chips = topics.map(t => ({ id: t.id, label: t.label }));
    const hasOther = viewArticles.some(a => !topics.some(t => articleMatchesTopic(a, t.id)));
    return hasOther ? [...chips, { id: 'other', label: 'Other' }] : chips;
  }, [topics, viewArticles]);

  // A category filter whose chip is gone falls back to 'All'
  const activeCategory =
    selectedCategory !== 'All' && !categoryChips.some(c => c.id === selectedCategory)
      ? 'All'
      : selectedCategory;

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return viewArticles.filter(article => {
      // Category filter
      if (activeCategory === 'other') {
        if (topics.some(t => articleMatchesTopic(article, t.id))) return false;
      } else if (activeCategory !== 'All' && !articleMatchesTopic(article, activeCategory)) {
        return false;
      }

      // Source filter
      if (activeSource !== 'All' && article.sourceName !== activeSource) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const inTitle = article.title.toLowerCase().includes(q);
        const inBullets = article.bulletSummary.some(b => b.toLowerCase().includes(q));
        const inSignificance = article.significance.toLowerCase().includes(q);
        const inSource = article.sourceName.toLowerCase().includes(q);
        if (!inTitle && !inBullets && !inSignificance && !inSource) {
          return false;
        }
      }

      return true;
    });
  }, [viewArticles, topics, activeCategory, activeSource, searchQuery]);

  // The how-to cards don't count as content: while only they exist, the feed is still "empty"
  const hasRealArticles = useMemo(() => articles.some(a => !a.isSample), [articles]);
  const onlySamples = articles.length > 0 && !hasRealArticles;
  const needsKey = !settings.geminiApiKey && !hasRealArticles;

  const isFilteringActive =
    showBookmarksOnly ||
    showReadOnly ||
    activeCategory !== 'All' ||
    activeSource !== 'All' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setShowBookmarksOnly(false);
    setShowReadOnly(false);
    setSelectedCategory('All');
    setSelectedSource('All');
    setSearchQuery('');
  };

  return {
    articles,
    feeds,
    settings,
    syncProgress,
    runSync,
    toggleBookmark,
    toggleRead,
    saveSettings,
    saveFeeds,
    deleteOlder,
    clearCache,
    // filters
    categoryChips,
    activeCategory,
    setSelectedCategory,
    activeSource,
    setSelectedSource,
    showBookmarksOnly,
    setShowBookmarksOnly,
    showReadOnly,
    setShowReadOnly,
    searchQuery,
    setSearchQuery,
    availableSources,
    filteredArticles,
    hasRealArticles,
    onlySamples,
    needsKey,
    isFilteringActive,
    resetFilters,
  };
}
