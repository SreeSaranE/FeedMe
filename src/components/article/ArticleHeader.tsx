import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing } from '../../theme';

interface ArticleHeaderProps {
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  isRead?: boolean;
  onToggleRead?: () => void;
  onShare?: () => void;
  onBack?: () => void;
  showActions?: boolean;
}

export const ArticleHeader: React.FC<ArticleHeaderProps> = ({
  isBookmarked = false,
  onToggleBookmark,
  isRead = false,
  onToggleRead,
  onShare,
  onBack,
  showActions = true,
}) => {
  const { colors } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={handleBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Ionicons name="chevron-back" size={26} color={colors.accent} />
      </Pressable>

      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onShare}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share"
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onToggleRead}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isRead ? 'Mark as unread' : 'Mark as read'}
            accessibilityState={{ selected: isRead }}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons
              name={isRead ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'}
              size={22}
              color={isRead ? colors.accent : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={onToggleBookmark}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            accessibilityState={{ selected: isBookmarked }}
            style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? colors.accent : colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
