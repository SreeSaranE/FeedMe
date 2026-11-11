import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Animated,
  Easing,
  RefreshControl,
  Platform,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { ActionBar } from '../../components/Header';
import { ArticleCard } from '../../components/ArticleCard';
import { FilterBar } from '../../components/FilterBar';
import { getSyncStatus } from '../../syncStatus';
import { SettingsModal, SettingsPageType } from '../../components/SettingsModal';
import { EmptyState } from '../../components/EmptyState';
import { UpdateBanner } from '../../components/UpdateBanner';
import { UpdateService, UpdateInfo } from '../../services/updateService';
import { useApp } from '../../features/articles/AppStateContext';
import { useGate } from '../../features/onboarding/OnboardingContext';
import { resolveTopics, TOPICS } from '../../constants/topics';
import { buildSidebarSections } from '../../features/sidebar/sections';
import { Sidebar } from '../../components/sidebar/Sidebar';
import { SummarizedArticle } from '../../types';

const PULL_TO_SYNC_THRESHOLD = 140;
const SCROLL_DELTA = 6; // ignore tiny movements when deciding to hide/show the top block

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SummarizedArticle>);

export default function FeedScreen() {
  const { colors } = useTheme();
  const {
    loaded,
    articles,
    feeds,
    settings,
    syncProgress,
    runSync,
    saveSettings,
    saveFeeds,
    deleteOlder,
    clearCache,
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
    filteredArticles,
    hasRealArticles,
    onlySamples,
    needsKey,
    isFilteringActive,
    emptyView,
    resetFilters,
  } = useApp();

  const router = useRouter();

  // Modals & Navigation
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsPageType>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const pendingSettings = useRef(false);

  // App Update Check
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    UpdateService.checkForUpdate({ force: false })
      .then(info => {
        if (!isMounted || !info) return;
        if (info.isAvailable && !info.isDismissed) {
          setUpdateInfo(info);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismissUpdate = useCallback(async () => {
    if (updateInfo?.latestVersion) {
      await UpdateService.dismissVersion(updateInfo.latestVersion);
      setUpdateInfo(prev => (prev ? { ...prev, isDismissed: true } : null));
    }
  }, [updateInfo]);

  const handleOpenCustomizeFeed = useCallback(() => {
    setSettingsInitialPage('feeds');
    setIsSettingsOpen(true);
  }, []);

  const topics = useMemo(
    () => resolveTopics(settings.selectedTopics),
    [settings.selectedTopics]
  );
  const sections = useMemo(
    () => buildSidebarSections(topics, feeds, articles),
    [topics, feeds, articles]
  );

  const view: 'home' | 'saved' | 'read' = showReadOnly
    ? 'read'
    : showBookmarksOnly
    ? 'saved'
    : 'home';

  const navbarTitle = useMemo(() => {
    if (activeSource !== 'All') {
      return activeSource;
    }
    if (activeCategory !== 'All') {
      const topic = topics.find(t => t.id === activeCategory);
      if (topic) return topic.label;
      const allTopic = TOPICS.find(t => t.id === activeCategory);
      if (allTopic) return allTopic.label;
      return activeCategory;
    }
    if (showReadOnly) return 'History';
    if (showBookmarksOnly) return 'Bookmarks';
    return 'FeedMe';
  }, [activeSource, activeCategory, topics, showReadOnly, showBookmarksOnly]);

  const { showIntroAgain } = useGate();
  const syncStatus = getSyncStatus(syncProgress);

  // Option B (Full-width Swipe): Swiping left-to-right anywhere across the feed screen opens the sidebar
  const openPanResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isSidebarOpen || isSettingsOpen) return false;
        return (
          gestureState.dx > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        setIsSidebarOpen(true);
      },
    });
  }, [isSidebarOpen, isSettingsOpen]);

  const openArticle = useCallback(
    (id: string) => router.push({ pathname: '/article/[id]', params: { id } }),
    [router]
  );

  const renderArticle = useCallback(
    ({ item }: { item: SummarizedArticle }) => (
      <ArticleCard article={item} onPress={openArticle} />
    ),
    [openArticle]
  );

  // iOS: require a deliberate pull (past the threshold) before syncing.
  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y <= -PULL_TO_SYNC_THRESHOLD) runSync();
  };

  // Collapsible top block (search): hides on scroll down and
  // returns on scroll up. `reveal` is 1 when shown, 0 when hidden.
  const [collapsibleHeight, setCollapsibleHeight] = useState(56); // estimate until measured
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
    resetFilters();
  };

  // Sidebar selection handlers
  const selectHome = () => {
    resetListPosition();
    setShowBookmarksOnly(false);
    setShowReadOnly(false);
    setSelectedCategory('All');
    setSelectedSource('All');
    setIsSidebarOpen(false);
  };

  const selectSaved = () => {
    resetListPosition();
    if (showBookmarksOnly) {
      setShowBookmarksOnly(false);
      setShowReadOnly(false);
      setSelectedCategory('All');
      setSelectedSource('All');
    } else {
      setShowBookmarksOnly(true);
      setShowReadOnly(false);
      setSelectedCategory('All');
      setSelectedSource('All');
    }
    setIsSidebarOpen(false);
  };

  const selectRead = () => {
    resetListPosition();
    if (showReadOnly) {
      setShowBookmarksOnly(false);
      setShowReadOnly(false);
      setSelectedCategory('All');
      setSelectedSource('All');
    } else {
      setShowReadOnly(true);
      setShowBookmarksOnly(false);
      setSelectedCategory('All');
      setSelectedSource('All');
    }
    setIsSidebarOpen(false);
  };

  const selectCategory = (topicId: string) => {
    resetListPosition();
    setShowBookmarksOnly(false);
    setShowReadOnly(false);
    setSelectedCategory(topicId);
    setSelectedSource('All');
    setIsSidebarOpen(false);
  };

  const selectFeed = (feedName: string) => {
    resetListPosition();
    setShowBookmarksOnly(false);
    setShowReadOnly(false);
    setSelectedCategory('All');
    setSelectedSource(feedName);
    setIsSidebarOpen(false);
  };

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      {...openPanResponder.panHandlers}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {/* Always-visible actions */}
        <ActionBar
          title={navbarTitle}
          articleCount={filteredArticles.length}
          statusText={syncStatus.text || (onlySamples ? 'Getting started' : '')}
          statusIsError={syncStatus.isError}
          progressPercent={syncStatus.percent}
          isSyncing={syncProgress.isSyncing}
          onSyncPress={() => runSync()}
          onCustomizePress={handleOpenCustomizeFeed}
          onMenuPress={() => setIsSidebarOpen(true)}
        />

        <View style={styles.listArea}>
          {/* Main feed: content is padded by the overlay's height */}
          <AnimatedFlatList
            ref={listRef}
            style={{ opacity: heightMeasured ? 1 : 0 }} // hidden until the top block is measured (no first-frame jump)
            data={filteredArticles}
            keyExtractor={(item: SummarizedArticle) => item.id}
            renderItem={renderArticle}
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
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
                  refreshing={false} // navbar shows sync state; avoid a second spinner in the middle
                  onRefresh={() => runSync()}
                  progressViewOffset={collapsibleHeight}
                  tintColor={colors.textSecondary}
                  colors={[colors.accent]}
                />
              ) : undefined
            }
            // Until storage is read, articles and the key are empty defaults: show nothing rather
            // than flashing "Add your API key".
            ListEmptyComponent={
              loaded ? (
                <EmptyState
                  isFiltering={isFilteringActive}
                  emptyView={emptyView}
                  caughtUp={hasRealArticles}
                  needsKey={needsKey}
                  onOpenSettings={() => {
                    setSettingsInitialPage('home');
                    setIsSettingsOpen(true);
                  }}
                  isSyncing={syncProgress.isSyncing}
                  onSync={() => runSync()}
                  onClearFilter={handleResetFilters}
                />
              ) : undefined
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
              searchQuery={searchQuery}
              onSearchChange={text => {
                setSearchQuery(text);
                resetListPosition();
              }}
            />
            <UpdateBanner
              update={updateInfo}
              onDismiss={handleDismissUpdate}
            />
          </Animated.View>
        </View>

        {/* Settings Modal */}
        <SettingsModal
          visible={isSettingsOpen}
          initialPage={settingsInitialPage}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          feeds={feeds}
          onSaveSettings={saveSettings}
          onSaveFeeds={saveFeeds}
          onClearCache={clearCache}
          onDeleteOlder={deleteOlder}
          onShowIntro={showIntroAgain}
        />
      </SafeAreaView>

      {/* Navigation Drawer */}
      <Sidebar
        visible={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onClosed={() => {
          if (pendingSettings.current) {
            pendingSettings.current = false;
            setIsSettingsOpen(true);
          }
        }}
        sections={sections}
        view={view}
        activeCategory={activeCategory}
        activeSource={activeSource}
        onSelectHome={selectHome}
        onSelectSaved={selectSaved}
        onSelectRead={selectRead}
        onSelectCategory={selectCategory}
        onSelectFeed={selectFeed}
        onOpenSettings={() => {
          setSettingsInitialPage('home');
          pendingSettings.current = true;
          setIsSidebarOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
