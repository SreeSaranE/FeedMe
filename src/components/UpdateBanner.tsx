import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { UpdateInfo } from '../services/updateService';
import { useTheme, spacing, radius, type } from '../theme';

interface UpdateBannerProps {
  update: UpdateInfo | null;
  onDismiss: () => void;
  onPressUpdate?: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  update,
  onDismiss,
  onPressUpdate,
}) => {
  const { colors } = useTheme();

  if (!update || !update.isAvailable || update.isDismissed) {
    return null;
  }

  const handleUpdate = () => {
    if (onPressUpdate) {
      onPressUpdate();
      return;
    }
    const targetUrl = update.apkDownloadUrl || update.releaseUrl;
    WebBrowser.openBrowserAsync(targetUrl).catch(() => undefined);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.left}>
        <View style={[styles.iconBadge, { backgroundColor: colors.background }]}>
          <Ionicons name="sparkles-outline" size={17} color={colors.accent} />
        </View>
        <View style={styles.textColumn}>
          <Text style={[type.label, { color: colors.text }]} numberOfLines={1}>
            Update Available
          </Text>
          <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {`v${update.latestVersion}`}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleUpdate}
          accessibilityRole="button"
          accessibilityLabel={`Update FeedMe to version ${update.latestVersion}`}
          style={({ pressed }) => [
            styles.updateButton,
            { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[type.caption, styles.updateText, { color: colors.onAccent }]}>
            Update
          </Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss update notification"
          style={({ pressed }) => [
            styles.dismissButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs + 4,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  updateButton: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    fontWeight: '600',
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
