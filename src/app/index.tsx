import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Animated,
  Easing,
  RefreshControl,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { ActionBar } from '../components/Header';
import { ArticleCard } from '../components/ArticleCard';
import { FilterBar } from '../components/FilterBar';
import { getSyncStatus } from '../syncStatus';
import { SettingsModal } from '../components/SettingsModal';
import { EmptyState } from '../components/EmptyState';
import { useAppState } from '../hooks/useAppState';
import { useGate } from '../features/onboarding/OnboardingContext';
import { SummarizedArticle } from '../types';

const PULL_TO_SYNC_THRESHOLD = 140;
const SCROLL_DELTA = 6; // ignore tiny movements when deciding to hide/show the top block

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SummarizedArticle>);

export default function FeedScreen() {
  const { colors } = useTheme();
  const {
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
  } = useAppState();

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const { showIntroAgain } = useGate();
  const syncStatus = getSyncStatus(syncProgress);

  const renderArticle = useCallback(
    ({ item }: { item: SummarizedArticle }) => (
      <ArticleCard
        article={item}
        onToggleBookmark={toggleBookmark}
        onToggleRead={toggleRead}
      />
    ),
    [toggleBookmark, toggleRead]
  );

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
    resetFilters();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Always-visible actions */}
      <ActionBar
        articleCount={filteredArticles.length}
        statusText={syncStatus.text || (onlySamples ? 'Getting started' : '')}
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
              caughtUp={hasRealArticles}
              needsKey={needsKey}
              onOpenSettings={() => setIsSettingsOpen(true)}
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
            categories={categoryChips}
            selectedCategory={activeCategory}
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
        onSaveSettings={saveSettings}
        onSaveFeeds={saveFeeds}
        onClearCache={clearCache}
        onDeleteOlder={deleteOlder}
        onShowIntro={showIntroAgain}
      />
    </SafeAreaView>
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
