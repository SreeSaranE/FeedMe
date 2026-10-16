import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { SummarizedArticle } from '../types';
import { useTheme, spacing, radius, type } from '../theme';

interface ArticleCardProps {
  article: SummarizedArticle;
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
}

// "5m ago", "3h ago", "Yesterday", "4d ago", then "Oct 14" for anything older.
const formatPublishDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// A flat list row: no card, separated by a hairline.
const ArticleCardBase: React.FC<ArticleCardProps> = ({ article, onToggleBookmark, onToggleRead }) => {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  const handleOpenLink = async () => {
    try {
      await WebBrowser.openBrowserAsync(article.link, {
        toolbarColor: colors.background,
        controlsColor: colors.accent,
      });
    } catch {
      // Ignore
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\n${article.significance}\n\nRead more: ${article.link}`,
        url: article.link,
      });
    } catch {
      // Ignore
    }
  };

  const showImage = article.imageUrl && !imgError;

  return (
    <View style={[styles.row, { borderBottomColor: colors.separator }]}>
      <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {article.sourceName} · {article.category} · {formatPublishDate(article.published) || formatPublishDate(article.fetchedAt)}
      </Text>

      <Pressable
        onPress={handleOpenLink}
        accessibilityRole="link"
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        {showImage && (
          <Image
            source={{ uri: article.imageUrl }}
            style={[styles.image, { backgroundColor: colors.surface }]}
            contentFit="cover"
            transition={150}
            cachePolicy="disk"
            onError={() => setImgError(true)}
          />
        )}
        <Text style={[type.headline, { color: colors.text }]}>{article.title}</Text>
      </Pressable>

      <View style={styles.bullets}>
        {article.bulletSummary.map((bullet, index) => (
          <View key={index} style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            <Text style={[type.body, styles.bulletText, { color: colors.text }]}>{bullet}</Text>
          </View>
        ))}
      </View>

      {article.significance ? (
        <Text style={[type.body, { color: colors.textSecondary }]}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Why it matters  </Text>
          {article.significance}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={handleShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share"
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => onToggleRead(article.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={article.isRead ? 'Mark as unread' : 'Mark as read'}
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons
            name={article.isRead ? 'arrow-undo-outline' : 'checkmark-done-outline'}
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={() => onToggleBookmark(article.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={article.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          accessibilityState={{ selected: !!article.isBookmarked }}
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons
            name={article.isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={article.isBookmarked ? colors.accent : colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
};

export const ArticleCard = React.memo(ArticleCardBase);

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.lg,
    gap: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: { gap: spacing.sm + 4 },
  image: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  bullets: { gap: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm + 4 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 9 },
  bulletText: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
