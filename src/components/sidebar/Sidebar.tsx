import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  PanResponder,
  BackHandler,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, type } from '../../theme';
import type { SidebarSection } from '../../features/sidebar/sections';
import { sectionHasActive } from '../../features/sidebar/sections';
import { SidebarRow, SectionHeader } from './SidebarRows';

export interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void; // fired after the close animation ends (used to open Settings)
  sections: SidebarSection[];
  view: 'home' | 'saved' | 'read'; // from showBookmarksOnly / showReadOnly
  activeCategory: string;
  activeSource: string;
  onSelectHome: () => void;
  onSelectSaved: () => void;
  onSelectRead: () => void;
  onSelectCategory: (topicId: string) => void;
  onSelectFeed: (feedName: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  onClosed,
  sections,
  view,
  activeCategory,
  activeSource,
  onSelectHome,
  onSelectSaved,
  onSelectRead,
  onSelectCategory,
  onSelectFeed,
  onOpenSettings,
}) => {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(320, windowWidth * 0.84);

  // Maintain internal mounted state to allow close animation before unmounting
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) {
    setMounted(true);
  }

  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [reduceMotion, setReduceMotion] = useState(false);

  // In-memory expanded sections state
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [wasVisible, setWasVisible] = useState(false);

  // Auto-expand sections containing active category/source when drawer opens
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const next = new Set(expandedKeys);
      let changed = false;
      for (const section of sections) {
        if (sectionHasActive(section, activeCategory, activeSource)) {
          if (!next.has(section.key)) {
            next.add(section.key);
            changed = true;
          }
        }
      }
      if (changed) {
        setExpandedKeys(next);
      }
    }
  }

  // Ref callback updated after render to satisfy React 19 rules
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  // Track reduce-motion accessibility setting
  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      sub?.remove?.();
    };
  }, []);

  // Drawer slide animation
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    const was = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible) {
      Animated.timing(progress, {
        toValue: 1,
        duration: reduceMotion ? 0 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (was) {
      Animated.timing(progress, {
        toValue: 0,
        duration: reduceMotion ? 0 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          onClosedRef.current?.();
        }
      });
    }
  }, [visible, reduceMotion, progress]);

  // Android hardware back button handler
  useEffect(() => {
    if (!visible) return;

    const onHardwareBack = () => {
      onClose();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);

    return () => {
      sub?.remove?.();
    };
  }, [visible, onClose]);

  // Pan gesture for swiping the drawer closed to the left
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dx < -10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return (
          gestureState.dx < -10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (width > 0) {
          const p = Math.max(0, Math.min(1, 1 + gestureState.dx / width));
          progress.setValue(p);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -width * 0.3 || gestureState.vx < -0.5) {
          onClose();
        } else {
          Animated.timing(progress, {
            toValue: 1,
            duration: reduceMotion ? 0 : 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(progress, {
          toValue: 1,
          duration: reduceMotion ? 0 : 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      },
    });
  }, [width, progress, reduceMotion, onClose]);

  const toggleSection = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!visible && !mounted) {
    return null;
  }

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, 0],
  });

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const isHomeActive =
    view === 'home' && activeCategory === 'All' && activeSource === 'All';

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dimmed backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      </Animated.View>

      {/* Sliding Drawer Container */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width,
            backgroundColor: colors.background,
            borderRightColor: colors.separator,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            transform: [{ translateX }],
          },
          scheme === 'light' && styles.drawerShadow,
        ]}
        accessibilityViewIsModal={true}
        aria-modal={true}
        {...panResponder.panHandlers}
      >
        {/* Header row */}
        <View style={styles.header}>
          <Text style={[type.headline, { color: colors.text }]}>FeedMe</Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={4}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.separator }]} />

        {/* Scrolling items list */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Group 1: Home, Bookmarks, History */}
          <View style={styles.group}>
            <SidebarRow
              icon={isHomeActive ? 'home' : 'home-outline'}
              label="Home"
              active={isHomeActive}
              onPress={onSelectHome}
            />
            <SidebarRow
              icon={view === 'saved' ? 'bookmark' : 'bookmark-outline'}
              label="Bookmarks"
              active={view === 'saved'}
              onPress={onSelectSaved}
            />
            <SidebarRow
              icon={view === 'read' ? 'checkmark-done' : 'checkmark-done-outline'}
              label="History"
              active={view === 'read'}
              onPress={onSelectRead}
            />
          </View>

          <View style={[styles.separator, { backgroundColor: colors.separator }]} />

          {/* Group 2: Categories caption */}
          <Text
            style={[
              type.caption,
              styles.categoriesCaption,
              { color: colors.textSecondary },
            ]}
          >
            CATEGORIES
          </Text>

          {/* Sections & Feeds */}
          <View style={styles.group}>
            {sections.map((section) => {
              const isSectionActive =
                view === 'home' &&
                section.topicId !== null &&
                activeCategory === section.topicId &&
                activeSource === 'All';
              const isExpanded = expandedKeys.has(section.key);

              return (
                <View key={section.key}>
                  <SectionHeader
                    label={section.label}
                    topicId={section.topicId}
                    unread={section.unread}
                    active={isSectionActive}
                    expanded={isExpanded}
                    hasFeeds={section.feeds.length > 0}
                    onSelect={
                      section.topicId !== null
                        ? () => onSelectCategory(section.topicId!)
                        : undefined
                    }
                    onToggleExpand={() => toggleSection(section.key)}
                  />

                  {isExpanded
                    ? section.feeds.map((feed) => {
                        const isFeedActive =
                          view === 'home' && activeSource === feed.name;
                        const isDisabled = feed.unread === 0;

                        return (
                          <SidebarRow
                            key={feed.id}
                            label={feed.name}
                            logoUrl={feed.iconUrl}
                            badge={feed.unread}
                            indented
                            active={isFeedActive}
                            disabled={isDisabled}
                            onPress={() => onSelectFeed(feed.name)}
                          />
                        );
                      })
                    : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  drawerShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  group: {
    paddingVertical: spacing.xs,
  },
  categoriesCaption: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    letterSpacing: 0.8,
  },
});
