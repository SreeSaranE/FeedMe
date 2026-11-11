import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, ActivityIndicator, Pressable, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { truncateWords } from '../../../utils/text';
import { useApp } from '../../../features/articles/AppStateContext';
import { useTheme, spacing, radius, type } from '../../../theme';
import { formatFullDate } from '../../../utils/date';
import { categoryLabel } from '../../../constants/topics';
import { READ_AFTER_MS } from '../../../constants/reading';
import { ArticleHeader } from '../../../components/article/ArticleHeader';
import { SectionHeading } from '../../../components/article/SectionHeading';
import { TakeawayList } from '../../../components/article/TakeawayList';
import { SignificanceCallout } from '../../../components/article/SignificanceCallout';
import { ArticleActions } from '../../../components/article/ArticleActions';
import { ArticleFooter } from '../../../components/article/ArticleFooter';
import { FadeIn } from '../../../components/FadeIn';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { loaded, articles, toggleBookmark, toggleRead, settings } = useApp();
  const [imgError, setImgError] = useState(false);

  const article = articles.find(a => a.id === id);
  const articleId = article?.id;
  const isRead = article?.isRead;
  const eligible = useRef<boolean | null>(null);

  useEffect(() => {
    if (!articleId) return;
    if (eligible.current === null) eligible.current = !isRead;
    if (!eligible.current || isRead) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      timer = setTimeout(() => {
        if (!eligible.current) return;
        eligible.current = false;
        toggleRead(articleId);
      }, READ_AFTER_MS);
    };
    const stop = () => clearTimeout(timer);

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', state => {
      stop();
      if (state === 'active') start();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [articleId, isRead, toggleRead]);

  if (!loaded) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ArticleHeader showActions={false} />
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.textSecondary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ArticleHeader showActions={false} />
        <View style={styles.centerContainer}>
          <Text style={[type.headline, styles.notFoundTitle, { color: colors.text }]}>
            Article not available
          </Text>
          <Text style={[type.body, styles.notFoundBody, { color: colors.textSecondary }]}>
            It may have been removed by a cleanup or by clearing the cache.
          </Text>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[type.label, { color: colors.text }]}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      const message = [
        article.title,
        article.significance,
        article.link ? `Read more: ${article.link}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      await Share.share({
        title: article.title,
        message,
        url: article.link || undefined,
      });
    } catch {
      // Ignore
    }
  };

  const handleToggleRead = () => {
    if (!articleId) return;
    eligible.current = false;
    toggleRead(articleId);
  };

  const isRaw = Boolean(
    article.isRaw ||
      (!article.bulletSummary?.length && !article.significance && !article.isSample)
  );
  const showImage = Boolean(article.imageUrl && !imgError);
  const fullDate = formatFullDate(article.published) || formatFullDate(article.fetchedAt);
  const topicLabel = categoryLabel(article.category);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ArticleHeader
        isBookmarked={!!article.isBookmarked}
        onToggleBookmark={() => toggleBookmark(article.id)}
        isRead={!!article.isRead}
        onToggleRead={handleToggleRead}
        onShare={handleShare}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xl * 2 },
        ]}
      >
        <FadeIn delay={120}>
          {showImage && (
            <Image
              source={{ uri: article.imageUrl }}
              style={[styles.heroImage, { backgroundColor: colors.surface }]}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              onError={() => setImgError(true)}
            />
          )}

          <View style={styles.metaRow}>
            {article.sourceName ? (
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {article.sourceName}
              </Text>
            ) : null}

            {article.sourceName && topicLabel ? (
              <Text style={[type.caption, { color: colors.textSecondary }]}>·</Text>
            ) : null}

            {topicLabel ? (
              <View style={[styles.topicPill, { backgroundColor: colors.surface }]}>
                <Text style={[type.caption, { color: colors.textSecondary }]}>
                  {topicLabel}
                </Text>
              </View>
            ) : null}

            {topicLabel && fullDate ? (
              <Text style={[type.caption, { color: colors.textSecondary }]}>·</Text>
            ) : null}

            {fullDate ? (
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {fullDate}
              </Text>
            ) : null}
          </View>

          <Text
            style={[styles.heading, { color: colors.text }]}
            accessibilityRole="header"
            selectable
          >
            {article.title}
          </Text>

          {isRaw ? (
            <>
              <View style={styles.rawContentWrapper}>
                <Text style={[type.body, styles.rawContentText, { color: colors.text }]} selectable>
                  {truncateWords(article.rawContent || article.significance || '', 500)}
                </Text>
              </View>

              <ArticleActions link={article.link} />
            </>
          ) : (
            <>
              {article.bulletSummary && article.bulletSummary.length > 0 ? (
                <>
                  <SectionHeading>Key takeaways</SectionHeading>
                  <TakeawayList bullets={article.bulletSummary} />
                </>
              ) : null}

              {article.significance ? (
                <View style={styles.calloutWrapper}>
                  <SignificanceCallout text={article.significance} />
                </View>
              ) : null}

              <ArticleActions link={article.link} />
            </>
          )}

          <ArticleFooter link={article.link} isSample={article.isSample} isRaw={isRaw} hasApiKey={Boolean(settings.geminiApiKey?.trim())} />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  notFoundTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  notFoundBody: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm + 4,
  },
  topicPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 33,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  calloutWrapper: {
    marginTop: spacing.lg,
  },
  rawContentWrapper: {
    marginVertical: spacing.sm,
  },
  rawContentText: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
});
