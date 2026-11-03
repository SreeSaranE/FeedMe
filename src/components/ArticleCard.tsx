import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { SummarizedArticle } from '../types';
import { useTheme, spacing, radius, type } from '../theme';
import { articleDateLabel } from '../utils/date';

interface ArticleCardProps {
  article: SummarizedArticle;
  onPress: (id: string) => void;
}

const ArticleCardBase: React.FC<ArticleCardProps> = ({ article, onPress }) => {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  const showImage = Boolean(article.imageUrl && !imgError);
  const dateText = articleDateLabel(article);

  return (
    <Pressable
      onPress={() => onPress(article.id)}
      unstable_pressDelay={100}
      accessibilityRole="link"
      accessibilityLabel={dateText ? `${article.title}, ${dateText}` : article.title}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.separator,
          backgroundColor: pressed ? colors.surface : 'transparent',
        },
      ]}
    >
      <View style={styles.textColumn}>
        <Text style={[type.rowTitle, { color: colors.text }]} numberOfLines={3}>
          {article.title}
        </Text>
        {dateText ? (
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            {dateText}
          </Text>
        ) : null}
      </View>
      {showImage && (
        <Image
          source={{ uri: article.imageUrl }}
          style={[styles.thumbnail, { backgroundColor: colors.surface }]}
          contentFit="cover"
          transition={100}
          cachePolicy="memory-disk"
          onError={() => setImgError(true)}
        />
      )}
    </Pressable>
  );
};

export const ArticleCard = React.memo(ArticleCardBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  textColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  thumbnail: {
    width: 128,
    height: 96,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
});
