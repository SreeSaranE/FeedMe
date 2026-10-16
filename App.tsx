import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Animated,
  Easing,
  RefreshControl,
  Platform,
  Alert,
  AppState,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './src/theme';
import { ActionBar } from './src/components/Header';
import { ArticleCard } from './src/components/ArticleCard';
import { FilterBar } from './src/components/FilterBar';
import { getSyncStatus } from './src/syncStatus';
import { SettingsModal } from './src/components/SettingsModal';
import { EmptyState } from './src/components/EmptyState';
import { StorageService } from './src/services/storage';
import { PipelineService } from './src/services/pipelineService';
import { SummarizedArticle, FeedConfig, AppSettings, SyncProgress } from './src/types';

const PULL_TO_SYNC_THRESHOLD = 140;
const SCROLL_DELTA = 6; // ignore tiny movements when deciding to hide/show the top block

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SummarizedArticle>);

export default function App() {
  const { colors } = useTheme();
  const [articles, setArticles] = useState<SummarizedArticle[]>([]);
  const [feeds, setFeeds] = useState<FeedConfig[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: '', // entered in Settings; never bundled into the app
    geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite',
    autoSyncOnStart: true,
    articlesPerFeed: 3,
    deleteOlderThanDays: 10,
  });

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

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

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

  const handleToggleBookmark = useCallback(async (id: string) => {
    const updated = await StorageService.toggleBookmark(id);
    setArticles(updated);
  }, []);

  const handleToggleRead = useCallback(async (id: string) => {
    const updated = await StorageService.toggleRead(id);
    setArticles(updated);
  }, []);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await StorageService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleSaveFeeds = async (newFeeds: FeedConfig[]) => {
    await StorageService.saveFeeds(newFeeds);
    setFeeds(newFeeds);
  };

  const handleDeleteOlder = async (days: number) => {
    const { removed, articles: kept } = await StorageService.deleteArticlesOlderThan(days);
    setArticles(kept);
    return removed;
  };

  const handleClearCache = async () => {
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

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return viewArticles.filter(article => {
      // Category filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'AI' && article.category !== 'AI' && article.category !== 'Both') {
          return false;
        }
        if (
          selectedCategory === 'Open Source' &&
          article.category !== 'Open Source' &&
          article.category !== 'Both'
        ) {
          return false;
        }
        if (selectedCategory === 'Engineering' && article.category !== 'Engineering') {
          return false;
        }
        if (selectedCategory === 'Tech' && article.category !== 'Tech') {
          return false;
        }
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
  }, [viewArticles, selectedCategory, activeSource, searchQuery]);

  const syncStatus = getSyncStatus(syncProgress);

  const renderArticle = useCallback(
    ({ item }: { item: SummarizedArticle }) => (
      <ArticleCard
        article={item}
        onToggleBookmark={handleToggleBookmark}
        onToggleRead={handleToggleRead}
      />
    ),
    [handleToggleBookmark, handleToggleRead]
  );

  const isFilteringActive =
    showBookmarksOnly ||
    showReadOnly ||
    selectedCategory !== 'All' ||
    activeSource !== 'All' ||
    searchQuery.trim().length > 0;

  // iOS: require a deliberate pull (past the threshold) before syncing.
  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y <= -PULL_TO_SYNC_THRESHOLD) runSync();
  };

  // Collapsible top block (title, progress, search, chips): hides on scroll down and
  // returns on scroll up. `reveal` is 1 when shown, 0 when hidden.
  const [collapsibleHeight, setCollapsibleHeight] = useState(96); // estimate until measured
  const [heightMeasured, setHeightMeasured] = useState(false);
  const listRef = useRef<FlatList<SummarizedArticle>>(null);
  const [reveal] = useState(() => new Animated.Value(1));
  const lastScrollY = useRef(0);
  const lastContentHeight = useRef(0);
  const ignoreScrollUntil = useRef(0);
  const isRevealed = useRef(true);

  const setRevealed = (show: boolean) => {
    if (isRevealed.current === show) return;
    isRevealed.current = show;
    Animated.timing(reveal, {
      toValue: show ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Switching view/filters keeps the old scroll offset, which can leave the top block
  // hidden above a short list. Jump to the top and show it again.
  const resetListPosition = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    lastScrollY.current = 0;
    setRevealed(true);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;
    // A list that just got shorter (e.g. marking items read) can be nudged back by the
    // platform; that is not the user scrolling up, so don't reveal the top block for it.
    if (Date.now() < ignoreScrollUntil.current && y > 0) return;
    if (y <= 0) setRevealed(true);
    else if (dy > SCROLL_DELTA && y > collapsibleHeight) setRevealed(false);
    else if (dy < -SCROLL_DELTA) setRevealed(true);
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    if (h < lastContentHeight.current) ignoreScrollUntil.current = Date.now() + 400;
    lastContentHeight.current = h;
  };

  const handleCollapsibleLayout = (e: LayoutChangeEvent) => {
    setCollapsibleHeight(e.nativeEvent.layout.height);
    setHeightMeasured(true);
  };

  const handleResetFilters = () => {
    resetListPosition();
    setShowBookmarksOnly(false);
    setShowReadOnly(false);
    setSelectedCategory('All');
    setSelectedSource('All');
    setSearchQuery('');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="auto" />

        {/* Always-visible actions */}
        <ActionBar
          articleCount={filteredArticles.length}
          statusText={syncStatus.text}
          statusIsError={syncStatus.isError}
          progressPercent={syncStatus.percent}
          isSyncing={syncProgress.isSyncing}
          onSyncPress={() => runSync()}
          onSettingsPress={() => setIsSettingsOpen(true)}
          showBookmarksOnly={showBookmarksOnly}
          onToggleBookmarks={() => {
            resetListPosition();
            setShowBookmarksOnly(!showBookmarksOnly);
            setShowReadOnly(false);
          }}
          showReadOnly={showReadOnly}
          onToggleRead={() => {
            resetListPosition();
            setShowReadOnly(!showReadOnly);
            setShowBookmarksOnly(false);
          }}
        />

        <View style={styles.listArea}>
          {/* Main feed: content is padded by the overlay's height */}
          <AnimatedFlatList
            ref={listRef}
            style={{ opacity: heightMeasured ? 1 : 0 }} // hidden until the top block is measured (no first-frame jump)
            data={filteredArticles}
            keyExtractor={(item: SummarizedArticle) => item.id}
            renderItem={renderArticle}
            contentContainerStyle={[styles.listContent, { paddingTop: collapsibleHeight }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onContentSizeChange={handleContentSizeChange}
            onScrollEndDrag={Platform.OS === 'ios' ? handleScrollEndDrag : undefined}
            refreshControl={
              Platform.OS !== 'ios' ? (
                <RefreshControl
                  refreshing={false} // header shows sync state; avoid a second spinner
                  onRefresh={() => runSync()}
                  progressViewOffset={collapsibleHeight}
                  tintColor={colors.textSecondary}
                  colors={[colors.accent]}
                />
              ) : undefined
            }
            ListEmptyComponent={
              <EmptyState
                isFiltering={isFilteringActive}
                caughtUp={articles.length > 0}
                isSyncing={syncProgress.isSyncing}
                onSync={() => runSync()}
                onClearFilter={handleResetFilters}
              />
            }
          />

          {/* Collapsible overlay: slides up out of view on scroll down */}
          <Animated.View
            onLayout={handleCollapsibleLayout}
            style={[
              styles.collapsible,
              {
                backgroundColor: colors.background,
                transform: [
                  {
                    translateY: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-collapsibleHeight, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <FilterBar
              selectedCategory={selectedCategory}
              onSelectCategory={c => {
                setSelectedCategory(c);
                resetListPosition();
              }}
              selectedSource={activeSource}
              onSelectSource={src => {
                setSelectedSource(src);
                resetListPosition();
              }}
              availableSources={availableSources}
              searchQuery={searchQuery}
              onSearchChange={text => {
                setSearchQuery(text);
                resetListPosition();
              }}
            />
          </Animated.View>
        </View>

        {/* Settings Modal */}
        <SettingsModal
          visible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          feeds={feeds}
          onSaveSettings={handleSaveSettings}
          onSaveFeeds={handleSaveFeeds}
          onClearCache={handleClearCache}
          onDeleteOlder={handleDeleteOlder}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

  },
  listArea: { flex: 1, overflow: 'hidden' },
  collapsible: { position: 'absolute', top: 0, left: 0, right: 0 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
});
