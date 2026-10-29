import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTheme, spacing, radius, type } from '../theme';

interface EmptyStateProps {
  isFiltering: boolean;
  caughtUp?: boolean; // real articles exist, but all have been read
  needsKey?: boolean; // no API key and no real articles: syncing can't work yet
  onOpenSettings?: () => void;
  isSyncing: boolean;
  onSync: () => void;
  onClearFilter: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isFiltering,
  caughtUp,
  needsKey,
  onOpenSettings,
  isSyncing,
  onSync,
  onClearFilter,
}) => {
  const { colors } = useTheme();

  // First launch: the automatic sync is already running, so show progress, not a button.
  if (!isFiltering && isSyncing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text style={[type.headline, { color: colors.text }]}>Syncing your feeds…</Text>
        <Text style={[type.body, styles.body, { color: colors.textSecondary }]}>
          Articles appear here as each feed finishes.
        </Text>
      </View>
    );
  }

  // Without a key a sync does nothing, so point to Settings instead of offering one
  const askForKey = !isFiltering && !!needsKey && !!onOpenSettings;
  const title = isFiltering
    ? 'No matches'
    : askForKey
      ? 'Add your API key'
      : caughtUp
        ? 'All caught up'
        : 'No articles yet';
  const body = isFiltering
    ? 'Nothing fits your search or filters.'
    : askForKey
      ? 'FeedMe needs a Gemini API key to summarize articles. Add it in Settings → API Settings.'
      : caughtUp
        ? 'You have read everything. Sync to look for new articles.'
        : 'Fetch and summarize the latest articles from your feeds.';
  const actionLabel = isFiltering ? 'Reset filters' : askForKey ? 'Open Settings' : 'Sync feeds';
  const onPress = isFiltering ? onClearFilter : askForKey ? onOpenSettings : onSync;

  return (
    <View style={styles.container}>
      <Text style={[type.headline, { color: colors.text }]}>{title}</Text>
      <Text style={[type.body, styles.body, { color: colors.textSecondary }]}>{body}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[type.label, { color: colors.onAccent }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
    gap: spacing.sm,
  },
  body: { textAlign: 'center', maxWidth: 280, marginBottom: spacing.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
});
