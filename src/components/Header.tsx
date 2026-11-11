import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, spacing, type } from '../theme';

interface ActionBarProps {
  title?: string;
  articleCount: number;
  statusText?: string; // sync status; replaces the count while present
  statusIsError?: boolean;
  progressPercent?: number | null; // thin progress line along the bar's bottom edge
  isSyncing: boolean;
  onSyncPress: () => void;
  onCustomizePress?: () => void;
  onMenuPress: () => void;
}

// Always-visible bar: menu button + app name/title + count on the left, sync action on the right.
export const ActionBar: React.FC<ActionBarProps> = ({
  title = 'FeedMe',
  articleCount,
  statusText,
  statusIsError,
  progressPercent,
  isSyncing,
  onSyncPress,
  onCustomizePress,
  onMenuPress,
}) => {
  const { colors } = useTheme();
  const iconButton = ({ pressed }: { pressed: boolean }) => [
    styles.iconButton,
    { opacity: pressed ? 0.5 : 1 },
  ];

  const countText = `${articleCount} article${articleCount === 1 ? '' : 's'}`;

  return (
    <View style={[styles.bar, { backgroundColor: colors.background }]}>
      <Pressable
        style={iconButton}
        onPress={onMenuPress}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu-outline" size={27} color={colors.text} />
      </Pressable>

      <View style={styles.title}>
        <Text style={[type.headline, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text
          style={[type.caption, { color: statusIsError ? colors.danger : colors.textSecondary }]}
          numberOfLines={1}
        >
          {statusText || countText}
        </Text>
      </View>

      <View style={styles.actions}>
        {onCustomizePress && (
          <Pressable
            style={iconButton}
            onPress={onCustomizePress}
            accessibilityRole="button"
            accessibilityLabel="Customize feeds"
          >
            <Ionicons name="options-outline" size={22} color={colors.text} />
          </Pressable>
        )}

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
      </View>

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
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
  },
  title: {
    flex: 1,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  trackFill: { height: '100%' },
  iconButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
