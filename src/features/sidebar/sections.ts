import type { FeedConfig, SummarizedArticle } from '../../types';
import type { Topic } from '../../constants/topics';

export interface SidebarFeed {
  id: string;
  name: string; // matches article.sourceName
  unread: number; // unread articles from this feed
}

export interface SidebarSection {
  key: string; // topic id, or 'custom'
  label: string; // topic.label, or 'Custom feeds'
  topicId: string | null; // null for the custom group (not selectable)
  feeds: SidebarFeed[];
  unread: number; // sum of its feeds
}

/**
 * Builds the sidebar categories and feed hierarchy.
 * Groups enabled feeds under selected topics in registry order,
 * with any orphaned/custom enabled feeds grouped under a final "Custom feeds" section.
 */
export function buildSidebarSections(
  topics: Topic[],
  feeds: FeedConfig[],
  articles: SummarizedArticle[]
): SidebarSection[] {
  // Count unread articles once per feed source name, ignoring sample how-to cards
  const unreadCounts = new Map<string, number>();
  for (const article of articles) {
    if (!article.isRead && !article.isSample) {
      unreadCounts.set(article.sourceName, (unreadCounts.get(article.sourceName) ?? 0) + 1);
    }
  }

  const topicLabels = new Set(topics.map(t => t.label));
  const sections: SidebarSection[] = [];

  for (const topic of topics) {
    const topicFeeds: SidebarFeed[] = [];
    let sectionUnread = 0;

    for (const f of feeds) {
      if (f.enabled && f.category === topic.label) {
        const unread = unreadCounts.get(f.name) ?? 0;
        topicFeeds.push({
          id: f.id,
          name: f.name,
          unread,
        });
        sectionUnread += unread;
      }
    }

    sections.push({
      key: topic.id,
      label: topic.label,
      topicId: topic.id,
      feeds: topicFeeds,
      unread: sectionUnread,
    });
  }

  const customFeeds: SidebarFeed[] = [];
  let customUnread = 0;

  for (const f of feeds) {
    if (f.enabled && (!f.category || !topicLabels.has(f.category))) {
      const unread = unreadCounts.get(f.name) ?? 0;
      customFeeds.push({
        id: f.id,
        name: f.name,
        unread,
      });
      customUnread += unread;
    }
  }

  if (customFeeds.length > 0) {
    sections.push({
      key: 'custom',
      label: 'Custom feeds',
      topicId: null,
      feeds: customFeeds,
      unread: customUnread,
    });
  }

  return sections;
}

/**
 * Determines whether a section contains the currently active category or source,
 * used to auto-expand the relevant section on drawer open.
 */
export function sectionHasActive(
  section: SidebarSection,
  activeCategory: string,
  activeSource: string
): boolean {
  if (section.topicId !== null && section.topicId === activeCategory) {
    return true;
  }
  return section.feeds.some(f => f.name === activeSource);
}
