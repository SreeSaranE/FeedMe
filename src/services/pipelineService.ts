import { StorageService } from './storage';
import { RssParserService } from './rssParser';
import { GeminiService, GeminiApiError } from './geminiService';
import { NetworkError } from './http';
import { resolveTopics, keywordRegexForTopics, needsKeywordFilter, TOPICS, getFeedCategory } from '../constants/topics';
import { SummarizedArticle, SyncProgress, FeedConfig, RawFeedEntry } from '../types';

function resolveCategoryForFeed(feed: FeedConfig): string {
  const cat = feed.category?.trim();
  if (cat) {
    const matched = TOPICS.find(
      t => t.id.toLowerCase() === cat.toLowerCase() || t.label.toLowerCase() === cat.toLowerCase()
    );
    if (matched) return matched.id;
    return cat;
  }
  const fallbackCat = getFeedCategory(feed);
  const matched = TOPICS.find(
    t => t.id.toLowerCase() === fallbackCat.toLowerCase() || t.label.toLowerCase() === fallbackCat.toLowerCase()
  );
  return matched ? matched.id : fallbackCat;
}

export const PipelineService = {
  async runSync(
    onProgress?: (progress: SyncProgress) => void,
    onArticles?: (articles: SummarizedArticle[]) => void
  ): Promise<{
    newCount: number;
    allArticles: SummarizedArticle[];
    missingApiKey?: boolean;
    offline?: boolean;
    updatedFeeds?: FeedConfig[];
  }> {
    const feeds = await StorageService.getFeeds();
    const settings = await StorageService.getSettings();

    // Auto-delete per the user's "delete after N days" setting. At the start of the run, so
    // an article fetched now is never deleted before the user has seen it.
    try {
      const pruned = await StorageService.deleteArticlesOlderThan(settings.deleteOlderThanDays);
      if (pruned.removed > 0) onArticles?.(pruned.articles);
    } catch (e) {
      console.warn('Auto-prune older articles failed:', e);
    }

    const hasApiKey = Boolean(settings.geminiApiKey?.trim());

    const processedIds = new Set(await StorageService.getProcessedIds());
    const topics = resolveTopics(settings.selectedTopics);
    const keywordRegex = keywordRegexForTopics(settings.selectedTopics);

    const enabledFeeds = feeds.filter(f => f.enabled);
    let articlesSummarized = 0;
    let newArticles: SummarizedArticle[] = [];
    let feedsModified = false;
    let quotaMessage: string | undefined;
    let fatalMessage: string | undefined;
    // No connection: stop instead of failing every remaining feed and article one by one.
    let offline = false;
    let consecutiveFeedNetworkErrors = 0;
    let failedFeeds = 0;
    let failedArticles = 0;
    // If the user clears the cache mid-sync, stop and discard this run's results.
    const startEpoch = StorageService.getClearEpoch();
    const wasCleared = () => StorageService.getClearEpoch() !== startEpoch;
    let latestArticles: SummarizedArticle[] = [];

    // Persist pending articles right away (merged into what is stored *now*, under
    // the storage lock) so progress isn't lost if the app closes mid-sync.
    const commit = async () => {
      if (wasCleared()) {
        newArticles = [];
        return;
      }
      const merged = await StorageService.mergeArticles(newArticles);
      if (merged) {
        latestArticles = merged;
        // Only record processed IDs if the articles were saved, so a failed save is retried
        await StorageService.saveProcessedIds(Array.from(processedIds));
        newArticles = [];
        onArticles?.(latestArticles);
      } else {
        console.warn('Saving articles failed; will retry on the next commit.');
      }
    };

    const updateProgress = (
      currentFeed: string,
      currentIndex: number,
      statusText: string,
      isSyncing = true
    ) => {
      if (onProgress) {
        onProgress({
          isSyncing,
          currentFeed,
          currentIndex,
          totalFeeds: enabledFeeds.length,
          articlesSummarized,
          statusText,
          failedFeeds,
          failedArticles,
          quotaMessage,
          fatalMessage,
          offline
        });
      }
    };

    updateProgress('Initializing', 0, 'Checking feeds configuration...');

    for (let i = 0; i < enabledFeeds.length && !quotaMessage && !fatalMessage && !offline && !wasCleared(); i++) {
      const feed = enabledFeeds[i];
      updateProgress(feed.name, i + 1, feed.name);
      // On-topic feeds go straight to Gemini; mixed and custom feeds are keyword pre-filtered
      const prefilter = needsKeywordFilter(feed.id) ? keywordRegex : null;

      try {
        const { entries, iconUrl } = await RssParserService.fetchFeedWithMeta(
          feed.name,
          feed.url,
          settings.articlesPerFeed || 3
        );
        if (iconUrl && iconUrl !== feed.iconUrl) {
          feed.iconUrl = iconUrl;
          feedsModified = true;
        }
        consecutiveFeedNetworkErrors = 0;

        for (const entry of entries) {
          const entryKey = entry.id || entry.link;
          if (wasCleared()) break;
          if (processedIds.has(entryKey)) {
            continue;
          }

          if (hasApiKey) {
            // Check if candidate
            const isCandidate = RssParserService.isCandidateArticle(entry, prefilter);
            if (!isCandidate) {
              processedIds.add(entryKey);
              continue;
            }

            updateProgress(feed.name, i + 1, `Summarizing candidate: "${entry.title.slice(0, 35)}..."`);

            try {
              // Some feeds (e.g. Hacker News) carry almost no text: read the page itself.
              const enriched = await RssParserService.withArticleText(entry);
              const analysis = await GeminiService.summarizeArticle(
                enriched,
                settings.geminiApiKey,
                settings.geminiModel,
                topics
              );

              if (analysis.isRelevant) {
                const summarizedArticle: SummarizedArticle = {
                  id: entryKey,
                  title: entry.title,
                  link: entry.link,
                  sourceName: feed.name,
                  category: analysis.category,
                  published: entry.published,
                  imageUrl: entry.imageUrl,
                  bulletSummary: analysis.bulletSummary,
                  significance: analysis.significance,
                  rawContent: (enriched.content || enriched.summary || '').trim(),
                  isRelevant: true,
                  isBookmarked: false,
                  isRaw: false,
                  fetchedAt: new Date().toISOString()
                };

                newArticles.push(summarizedArticle);
                articlesSummarized++;
              }
            } catch (aiErr) {
              console.warn(`Failed to summarize article: ${entry.title}`, aiErr);
              // Leave it unprocessed so it is retried next sync. On a quota error
              // (429) stop the whole run instead of burning more requests.
              if (aiErr instanceof GeminiApiError && aiErr.status === 429) {
                quotaMessage = /PerDay/i.test(aiErr.body)
                  ? 'Gemini daily quota reached'
                  : 'Gemini rate limit reached (is the key used elsewhere?)';
                break;
              }
              if (aiErr instanceof NetworkError) {
                offline = true;
                break;
              }
              const fatal = aiErr instanceof GeminiApiError ? aiErr.fatalMessage : null;
              if (fatal) {
                fatalMessage = fatal;
                break;
              }
              failedArticles++;
              continue;
            }
          } else {
            // Raw feed mode: no API key configured. Ingest feed entries directly.
            let rawContent = (entry.content || entry.summary || '').trim();
            if (rawContent.length < 100) {
              try {
                const enriched = await RssParserService.withArticleText(entry);
                rawContent = (enriched.content || enriched.summary || rawContent).trim();
              } catch {
                // Keep existing text
              }
            }

            const rawArticle: SummarizedArticle = {
              id: entryKey,
              title: entry.title,
              link: entry.link,
              sourceName: feed.name,
              category: resolveCategoryForFeed(feed),
              published: entry.published,
              imageUrl: entry.imageUrl,
              bulletSummary: [],
              significance: '',
              rawContent,
              isRelevant: true,
              isBookmarked: false,
              isRaw: true,
              fetchedAt: new Date().toISOString(),
            };

            newArticles.push(rawArticle);
            articlesSummarized++;
          }

          processedIds.add(entryKey);
        }
      } catch (feedErr) {
        console.warn(`Error fetching feed ${feed.name}:`, feedErr);
        // Three feeds in a row unreachable: the connection is down, not the feeds.
        if (feedErr instanceof NetworkError && ++consecutiveFeedNetworkErrors >= 3) offline = true;
        else if (!(feedErr instanceof NetworkError)) consecutiveFeedNetworkErrors = 0;
        failedFeeds++;
      }

      await commit();
    }

    await commit();

    if (feedsModified) {
      await StorageService.saveFeeds(feeds);
    }

    const completionStatus = offline
      ? `No internet connection. ${articlesSummarized} new articles added; the rest will retry next sync.`
      : fatalMessage
      ? `${fatalMessage}. Check Settings → API Settings.`
      : quotaMessage
      ? `${quotaMessage}. ${articlesSummarized} new articles added; the rest will retry next sync.`
      : !hasApiKey
      ? `Sync complete. ${articlesSummarized} articles added (raw feeds).`
      : `Sync complete. ${articlesSummarized} new articles added.`;

    updateProgress('Complete', enabledFeeds.length, completionStatus, false);

    return {
      newCount: articlesSummarized,
      offline,
      allArticles: wasCleared() ? [] : latestArticles,
      missingApiKey: !hasApiKey,
      updatedFeeds: feedsModified ? feeds : undefined,
    };
  },

  async summarizeBacklog(
    apiKey: string,
    model?: string,
    onArticleUpdated?: (articleId: string, changes: Partial<SummarizedArticle>) => void,
    signal?: AbortSignal
  ): Promise<{ summarizedCount: number }> {
    const trimmedKey = (apiKey || '').trim();
    if (!trimmedKey) return { summarizedCount: 0 };

    const storedArticles = await StorageService.getArticles();
    const settings = await StorageService.getSettings();
    const effectiveModel = model || settings.geminiModel;
    const topics = resolveTopics(settings.selectedTopics);

    // Pick up to 15 newest raw, non-sample articles
    const rawArticles = storedArticles
      .filter(a => a.isRaw && !a.isSample)
      .slice(0, 15);

    if (rawArticles.length === 0) return { summarizedCount: 0 };

    let summarizedCount = 0;
    const startEpoch = StorageService.getClearEpoch();

    for (const rawArt of rawArticles) {
      if (signal?.aborted) break;
      if (StorageService.getClearEpoch() !== startEpoch) break;

      const entry: RawFeedEntry = {
        id: rawArt.id,
        title: rawArt.title,
        link: rawArt.link,
        summary: rawArt.rawContent || '',
        content: rawArt.rawContent || '',
        published: rawArt.published,
        imageUrl: rawArt.imageUrl,
        sourceName: rawArt.sourceName,
      };

      let enriched = entry;
      try {
        enriched = await RssParserService.withArticleText(entry);
      } catch {
        // Keep initial entry
      }

      if (signal?.aborted || StorageService.getClearEpoch() !== startEpoch) break;

      try {
        const analysis = await GeminiService.summarizeArticle(
          enriched,
          trimmedKey,
          effectiveModel,
          topics
        );

        if (analysis.bulletSummary && analysis.bulletSummary.length > 0) {
          const rawContentText = (enriched.content || enriched.summary || rawArt.rawContent || '').trim();
          const changes: Partial<SummarizedArticle> = {
            bulletSummary: analysis.bulletSummary,
            significance: analysis.significance,
            category: analysis.category || rawArt.category,
            rawContent: rawContentText,
            isRaw: false,
          };

          await StorageService.updateArticle(rawArt.id, changes);
          summarizedCount++;
          onArticleUpdated?.(rawArt.id, changes);
        }
      } catch (aiErr) {
        console.warn(`Backlog summarizer failed for "${rawArt.title}":`, aiErr);
        if (aiErr instanceof GeminiApiError && aiErr.status === 429) {
          console.warn('Backlog summarizer stopped: rate limit / quota hit');
          break;
        }
        if (aiErr instanceof GeminiApiError && aiErr.fatalMessage) {
          console.warn('Backlog summarizer stopped: key rejected');
          break;
        }
        if (aiErr instanceof NetworkError) {
          console.warn('Backlog summarizer stopped: network offline');
          break;
        }
      }

      if (signal?.aborted) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { summarizedCount };
  }
};
