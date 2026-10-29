import { StorageService } from './storage';
import { RssParserService } from './rssParser';
import { GeminiService, GeminiApiError } from './geminiService';
import { NetworkError } from './http';
import { resolveTopics, keywordRegexForTopics, needsKeywordFilter } from '../constants/topics';
import { SummarizedArticle, SyncProgress } from '../types';

export const PipelineService = {
  async runSync(
    onProgress?: (progress: SyncProgress) => void,
    onArticles?: (articles: SummarizedArticle[]) => void
  ): Promise<{
    newCount: number;
    allArticles: SummarizedArticle[];
    missingApiKey?: boolean;
    offline?: boolean;
  }> {
    const feeds = await StorageService.getFeeds();
    const settings = await StorageService.getSettings();
    if (!settings.geminiApiKey) {
      // Without a key there is no AI vetting, so don't add unvetted articles.
      const existing = await StorageService.getArticles();
      onProgress?.({
        isSyncing: false,
        currentFeed: '',
        currentIndex: 0,
        totalFeeds: 0,
        articlesSummarized: 0,
        statusText: 'Add a Gemini API key in Settings to sync.',
      });
      return { newCount: 0, allArticles: existing, missingApiKey: true };
    }

    const processedIds = new Set(await StorageService.getProcessedIds());
    const topics = resolveTopics(settings.selectedTopics);
    const keywordRegex = keywordRegexForTopics(settings.selectedTopics);

    const enabledFeeds = feeds.filter(f => f.enabled);
    let articlesSummarized = 0;
    let newArticles: SummarizedArticle[] = [];
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
        const entries = await RssParserService.fetchFeedEntries(
          feed.name,
          feed.url,
          settings.articlesPerFeed || 3
        );
        consecutiveFeedNetworkErrors = 0;

        for (const entry of entries) {
          const entryKey = entry.id || entry.link;
          if (wasCleared()) break;
          if (processedIds.has(entryKey)) {
            continue;
          }

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
                isRelevant: true,
                isBookmarked: false,
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
              // Per-day vs per-minute: Google says which in the error body. A per-minute 429
              // despite our limiter means something else is using the same key.
              quotaMessage = /PerDay/i.test(aiErr.body)
                ? 'Gemini daily quota reached'
                : 'Gemini rate limit reached (is the key used elsewhere?)';
              break;
            }
            if (aiErr instanceof NetworkError) {
              offline = true;
              break;
            }
            // A rejected key or unknown model would fail every remaining article too.
            const fatal = aiErr instanceof GeminiApiError ? aiErr.fatalMessage : null;
            if (fatal) {
              fatalMessage = fatal;
              break;
            }
            failedArticles++;
            continue;
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

    updateProgress('Complete', enabledFeeds.length, offline
        ? `No internet connection. ${articlesSummarized} new articles added; the rest will retry next sync.`
        : fatalMessage
        ? `${fatalMessage}. Check Settings → API Settings.`
        : quotaMessage
        ? `${quotaMessage}. ${articlesSummarized} new articles added; the rest will retry next sync.`
        : `Sync complete. ${articlesSummarized} new articles added.`, false);

    return {
      newCount: articlesSummarized,
      offline,
      allArticles: wasCleared() ? [] : latestArticles
    };
  }
};
