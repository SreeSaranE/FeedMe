import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, type } from '../theme';

interface ActionBarProps {
  articleCount: number;
  statusText?: string; // sync status; replaces the count while present
  statusIsError?: boolean;
  progressPercent?: number | null; // thin progress line along the bar's bottom edge
  isSyncing: boolean;
  onSyncPress: () => void;
  onSettingsPress: () => void;
  showBookmarksOnly: boolean;
  onToggleBookmarks: () => void;
  showReadOnly: boolean;
  onToggleRead: () => void;
}

// Always-visible bar: app name + count on the left, three actions on the right.
export const ActionBar: React.FC<ActionBarProps> = ({
  articleCount,
  statusText,
  statusIsError,
  progressPercent,
  isSyncing,
  onSyncPress,
  onSettingsPress,
  showBookmarksOnly,
  onToggleBookmarks,
  showReadOnly,
  onToggleRead,
}) => {
  const { colors } = useTheme();
  const iconButton = ({ pressed }: { pressed: boolean }) => [
    styles.iconButton,
    { opacity: pressed ? 0.5 : 1 },
  ];

  return (
    <View style={[styles.bar, { backgroundColor: colors.background }]}>
      <View style={styles.title}>
        <Text style={[type.headline, { color: colors.text }]}>FeedMe</Text>
        <Text
          style={[type.caption, { color: statusIsError ? colors.danger : colors.textSecondary }]}
          numberOfLines={1}
        >
          {statusText || `${showReadOnly ? 'Read · ' : showBookmarksOnly ? 'Saved · ' : ''}${articleCount} article${articleCount === 1 ? '' : 's'}`}
        </Text>
      </View>
      <Pressable
        style={iconButton}
        onPress={onToggleRead}
        accessibilityRole="button"
        accessibilityLabel="Show read articles"
        accessibilityState={{ selected: showReadOnly }}
      >
        <Ionicons
          name={showReadOnly ? 'checkmark-done' : 'checkmark-done-outline'}
          size={22}
          color={showReadOnly ? colors.accent : colors.text}
        />
      </Pressable>
      <Pressable
        style={iconButton}
        onPress={onToggleBookmarks}
        accessibilityRole="button"
        accessibilityLabel="Show saved articles"
        accessibilityState={{ selected: showBookmarksOnly }}
      >
        <Ionicons
          name={showBookmarksOnly ? 'bookmark' : 'bookmark-outline'}
          size={22}
          color={showBookmarksOnly ? colors.accent : colors.text}
        />
      </Pressable>
      <Pressable
        style={iconButton}
        onPress={onSyncPress}
        disabled={isSyncing}
        accessibilityRole="button"
        accessibilityLabel="Sync feeds"
        accessibilityState={{ busy: isSyncing }}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Ionicons name="refresh" size={22} color={colors.text} />
        )}
      </Pressable>
      <Pressable
        style={iconButton}
        onPress={onSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons name="settings-outline" size={22} color={colors.text} />
      </Pressable>
      {progressPercent != null && (
        <View style={[styles.track, { backgroundColor: colors.separator }]}>
          <View
            style={[styles.trackFill, { width: `${progressPercent}%`, backgroundColor: colors.accent }]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  title: { flex: 1 },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  trackFill: { height: '100%' },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
