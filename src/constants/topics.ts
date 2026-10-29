import { Ionicons } from '@expo/vector-icons';
import { FeedConfig, SummarizedArticle } from '../types';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface TopicFeed {
  id: string;
  name: string;
  url: string;
  // General-interest feed: its entries are keyword pre-filtered before Gemini sees them.
  // Feeds that are on-topic by nature skip the pre-filter (Gemini still decides relevance).
  mixed?: boolean;
}

export interface Topic {
  id: string;
  label: string;
  icon: IconName;
  // What counts as relevant for this topic; goes into the Gemini prompt.
  relevanceHint: string;
  // Regex sources for the pre-filter of mixed feeds. Only tech topics define them.
  keywords?: string[];
  feeds: TopicFeed[];
}

export const MAX_TOPICS = 10;

const REJECT_GADGETS = 'Reject consumer gadget news, reviews, deals and general tech-industry gossip.';

export const TOPICS: Topic[] = [
  {
    id: 'ai',
    label: 'AI',
    icon: 'sparkles',
    relevanceHint: `Artificial Intelligence: LLMs, machine learning, AI features and hardware, open weights, research. ${REJECT_GADGETS}`,
    keywords: [
      '\\bai\\b', '\\bartificial intelligence\\b', '\\bgemini\\b', '\\bchatgpt\\b',
      '\\bopenai\\b', '\\bclaude\\b', '\\banthropic\\b', '\\bllm\\b', '\\bllms\\b',
      '\\bmachine learning\\b', '\\bdeep learning\\b', '\\bdeepseek\\b',
      '\\bhugging face\\b', '\\bhuggingface\\b', '\\bllama\\b', '\\bmistral\\b',
      '\\bcopilot\\b', '\\bagent\\b', '\\bagents\\b', '\\bon-device ai\\b',
      '\\bneural\\b', '\\btransformer\\b', '\\bdiffusion\\b', '\\bvision model\\b',
      '\\bmultimodal\\b', '\\bcuda\\b', '\\bnvidia ai\\b',
    ],
    feeds: [
      { id: 'google-blog-ai', name: 'Google Blog (AI)', url: 'https://blog.google/technology/ai/rss/' },
      { id: 'deepmind', name: 'Google DeepMind', url: 'https://raw.githubusercontent.com/leontloveless/ai-rss-feeds/main/feeds/deepmind-blog.xml' },
      { id: 'mit-news-ai', name: 'MIT News - AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2' },
      { id: 'nvidia-tech-blog', name: 'NVIDIA Technical Blog', url: 'https://developer.nvidia.com/blog/feed/', mixed: true },
      { id: 'openai-news', name: 'OpenAI News & Engineering', url: 'https://openai.com/news/rss.xml' },
      { id: 'huggingface-blog', name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
      { id: 'simon-willison', name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', mixed: true },
      { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
      { id: 'ars-ai', name: 'Ars Technica AI', url: 'https://arstechnica.com/ai/feed/' },
      { id: 'aws-ml', name: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
      { id: 'import-ai', name: 'Import AI', url: 'https://importai.substack.com/feed' },
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    icon: 'construct',
    relevanceHint: `Software Engineering: architecture, system design, infrastructure, programming languages, frameworks, DevOps, engineering practices and culture. ${REJECT_GADGETS}`,
    keywords: [
      '\\bsoftware engineering\\b', '\\bsystem design\\b', '\\barchitecture\\b',
      '\\bkubernetes\\b', '\\bdevops\\b', '\\brust\\b', '\\bdatabase\\b',
      '\\bapi\\b', '\\bdeveloper\\b', '\\bprogramming\\b', '\\bcompiler\\b',
    ],
    feeds: [
      { id: 'cloudflare-blog', name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/' },
      { id: 'pragmatic-engineer', name: 'The Pragmatic Engineer', url: 'https://blog.pragmaticengineer.com/rss/' },
      { id: 'hacker-news', name: 'Hacker News', url: 'https://hnrss.org/frontpage', mixed: true },
      { id: 'infoq', name: 'InfoQ', url: 'https://feed.infoq.com/' },
      { id: 'martin-fowler', name: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom' },
      { id: 'netflix-tech', name: 'Netflix Tech Blog', url: 'https://netflixtechblog.com/feed' },
      { id: 'stack-overflow-blog', name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/' },
      { id: 'github-blog', name: 'GitHub Blog', url: 'https://github.blog/feed/', mixed: true },
      { id: 'bytebytego', name: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed' },
    ],
  },
  {
    id: 'open-source',
    label: 'Open Source',
    icon: 'git-branch',
    relevanceHint: `Open Source: FOSS, open-source projects, developer tools, libraries, open weights. ${REJECT_GADGETS}`,
    keywords: [
      '\\bopen source\\b', '\\bopensource\\b', '\\bfoss\\b', '\\baosp\\b',
      '\\bgithub\\b', '\\bgit\\b',
    ],
    feeds: [
      { id: 'github-open-source', name: 'GitHub Blog (Open Source)', url: 'https://github.blog/open-source/feed/' },
      { id: 'lwn', name: 'LWN.net', url: 'https://lwn.net/headlines/rss' },
      { id: 'its-foss', name: "It's FOSS", url: 'https://itsfoss.com/feed/' },
      { id: 'linux-foundation', name: 'Linux Foundation', url: 'https://www.linuxfoundation.org/blog/rss.xml' },
      { id: 'the-new-stack', name: 'The New Stack', url: 'https://thenewstack.io/feed/', mixed: true },
      { id: 'openssf', name: 'OpenSSF Blog', url: 'https://openssf.org/feed/' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'shield-checkmark',
    relevanceHint: 'Cybersecurity: vulnerabilities, breaches, malware, privacy, security research and practice.',
    feeds: [
      { id: 'krebs-on-security', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/' },
      { id: 'bleepingcomputer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
      { id: 'the-hacker-news', name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
    ],
  },
  {
    id: 'startups',
    label: 'Startups',
    icon: 'rocket',
    relevanceHint: 'Startups: funding rounds, launches, founders, product strategy and venture capital.',
    feeds: [
      { id: 'techcrunch-startups', name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/' },
      { id: 'hacker-news', name: 'Hacker News', url: 'https://hnrss.org/frontpage', mixed: true },
    ],
  },
  {
    id: 'science',
    label: 'Science',
    icon: 'flask',
    relevanceHint: 'Science: research findings, discoveries and breakthroughs in physics, biology, chemistry, mathematics and technology.',
    feeds: [
      { id: 'sciencedaily', name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/all.xml' },
      { id: 'quanta', name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/' },
      { id: 'nasa-news', name: 'NASA', url: 'https://www.nasa.gov/feed/' },
    ],
  },
  {
    id: 'space',
    label: 'Space',
    icon: 'planet',
    relevanceHint: 'Space: missions, launches, astronomy, astrophysics and the space industry.',
    feeds: [
      { id: 'space-com', name: 'Space.com', url: 'https://www.space.com/feeds/all' },
      { id: 'nasa-releases', name: 'NASA News Releases', url: 'https://www.nasa.gov/news-release/feed/' },
    ],
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'medkit',
    relevanceHint: 'Health: medical research, public health, medicine, nutrition and mental health. Reject ads and unsupported wellness claims.',
    feeds: [
      { id: 'stat-news', name: 'STAT News', url: 'https://www.statnews.com/feed/' },
      { id: 'sciencedaily-health', name: 'ScienceDaily Health', url: 'https://www.sciencedaily.com/rss/health_medicine.xml' },
      { id: 'sciencedaily-mind', name: 'ScienceDaily Mind & Brain', url: 'https://www.sciencedaily.com/rss/mind_brain.xml' },
      { id: 'npr-health', name: 'NPR Health', url: 'https://feeds.npr.org/1128/rss.xml' },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    icon: 'barbell',
    relevanceHint: 'Fitness: exercise, training, sports science, nutrition for performance and healthy habits. Reject product promotions.',
    feeds: [
      { id: 'mens-health', name: "Men's Health", url: 'https://www.menshealth.com/rss/all.xml/' },
      { id: 'self', name: 'SELF', url: 'https://www.self.com/feed/rss' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: 'football',
    relevanceHint: 'Sports: results, match reports, transfers, tournaments, athletes and league news.',
    feeds: [
      { id: 'bbc-sport', name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
      { id: 'guardian-sport', name: 'The Guardian Sport', url: 'https://www.theguardian.com/sport/rss' },
      { id: 'cbs-sports', name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/' },
      { id: 'espn', name: 'ESPN', url: 'https://www.espn.com/espn/rss/news' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'briefcase',
    relevanceHint: 'Business: companies, industries, economy, management and corporate strategy.',
    feeds: [
      { id: 'bbc-business', name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
      { id: 'guardian-business', name: 'The Guardian Business', url: 'https://www.theguardian.com/uk/business/rss' },
      { id: 'npr-business', name: 'NPR Business', url: 'https://feeds.npr.org/1006/rss.xml' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'trending-up',
    relevanceHint: 'Finance: markets, investing, central banks, personal finance and economic data.',
    feeds: [
      { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
      { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
    ],
  },
  {
    id: 'world',
    label: 'World News',
    icon: 'globe',
    relevanceHint: 'World news: major international events, conflicts, diplomacy and global affairs.',
    feeds: [
      { id: 'bbc-world', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { id: 'al-jazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { id: 'npr-world', name: 'NPR World', url: 'https://feeds.npr.org/1001/rss.xml' },
    ],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    icon: 'game-controller',
    relevanceHint: 'Gaming: video game releases, industry news, game design and esports. Reject deals and coupon posts.',
    feeds: [
      { id: 'polygon', name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml' },
      { id: 'gamespot', name: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/' },
      { id: 'ign', name: 'IGN', url: 'https://feeds.feedburner.com/ign/all' },
    ],
  },
  {
    id: 'movies',
    label: 'Movies & TV',
    icon: 'film',
    relevanceHint: 'Movies and TV: releases, reviews, industry news, casting and streaming.',
    feeds: [
      { id: 'variety', name: 'Variety', url: 'https://variety.com/feed/' },
      { id: 'hollywood-reporter', name: 'The Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/' },
      { id: 'guardian-film', name: 'The Guardian Film', url: 'https://www.theguardian.com/film/rss' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    icon: 'musical-notes',
    relevanceHint: 'Music: releases, artists, albums, tours and the music industry.',
    feeds: [
      { id: 'rolling-stone-music', name: 'Rolling Stone Music', url: 'https://www.rollingstone.com/music/feed/' },
      { id: 'guardian-music', name: 'The Guardian Music', url: 'https://www.theguardian.com/music/rss' },
      { id: 'pitchfork', name: 'Pitchfork', url: 'https://pitchfork.com/feed/feed-news/rss' },
    ],
  },
];

// What an existing install (and a user who skips topic choice) gets.
export const DEFAULT_TOPIC_IDS = ['ai', 'engineering', 'open-source'];

const TOPIC_BY_ID = new Map(TOPICS.map(t => [t.id, t]));
const REGISTRY_FEEDS = new Map<string, { feed: TopicFeed; topic: Topic }>();
for (const topic of TOPICS) {
  for (const feed of topic.feeds) {
    const known = REGISTRY_FEEDS.get(feed.id);
    // A feed listed under several topics is mixed if any listing says so
    if (!known) REGISTRY_FEEDS.set(feed.id, { feed, topic });
    else if (feed.mixed) known.feed.mixed = true;
  }
}

export const getTopic = (id: string): Topic | undefined => TOPIC_BY_ID.get(id);

// Valid topics only, in registry order. Falls back to the defaults if none are valid.
export function resolveTopics(ids: string[]): Topic[] {
  const wanted = new Set(ids);
  const topics = TOPICS.filter(t => wanted.has(t.id));
  return topics.length > 0 ? topics : DEFAULT_TOPIC_IDS.map(id => TOPIC_BY_ID.get(id)!);
}

// The starting feed list for a set of topics. A feed shared by several topics appears once.
export function buildFeedsForTopics(ids: string[]): FeedConfig[] {
  const feeds = new Map<string, FeedConfig>();
  for (const topic of resolveTopics(ids)) {
    for (const f of topic.feeds) {
      if (!feeds.has(f.id)) {
        feeds.set(f.id, { id: f.id, name: f.name, url: f.url, enabled: true, category: topic.label });
      }
    }
  }
  return Array.from(feeds.values());
}

// Feeds for a new topic selection: each topic's feeds (keeping the on/off state the user
// already chose for feeds that stay), plus the user's custom feeds.
export function applyTopicsToFeeds(current: FeedConfig[], ids: string[]): FeedConfig[] {
  const known = new Map(current.map(f => [f.id, f]));
  const custom = current.filter(f => !isRegistryFeed(f.id));
  const built = buildFeedsForTopics(ids).map(f => ({ ...f, enabled: known.get(f.id)?.enabled ?? true }));
  return [...built, ...custom];
}

// Adds or removes a topic from a selection. Reports when an add was refused because
// MAX_TOPICS is reached, or a removal because it would leave nothing selected.
export function toggleTopicSelection(
  selected: string[],
  id: string,
  { allowEmpty = true } = {}
): { selected: string[]; limitHit: boolean } {
  if (selected.includes(id)) {
    if (!allowEmpty && selected.length === 1) return { selected, limitHit: false };
    return { selected: selected.filter(t => t !== id), limitHit: false };
  }
  if (selected.length >= MAX_TOPICS) return { selected, limitHit: true };
  return { selected: [...selected, id], limitHit: false };
}

export const isRegistryFeed = (feedId: string) => REGISTRY_FEEDS.has(feedId);

// Mixed registry feeds and custom feeds are keyword pre-filtered; the rest go straight to Gemini.
export const needsKeywordFilter = (feedId: string) => {
  const entry = REGISTRY_FEEDS.get(feedId);
  return !entry || !!entry.feed.mixed;
};

// Pre-filter for the selected topics, or null when none of them defines keywords.
export function keywordRegexForTopics(topicIds: string[]): RegExp | null {
  const sources = resolveTopics(topicIds).flatMap(t => t.keywords ?? []);
  return sources.length > 0 ? new RegExp(sources.join('|'), 'i') : null;
}

// Stored articles written before topics existed use these names.
const LEGACY_CATEGORIES: Record<string, string> = {
  AI: 'ai',
  'Open Source': 'open-source',
  Engineering: 'engineering',
  Both: 'both',
  Tech: 'tech',
};
export const normalizeCategory = (category: unknown): string =>
  typeof category === 'string' && category ? (LEGACY_CATEGORIES[category] ?? category) : 'tech';

export function categoryLabel(category: string): string {
  if (category === 'both') return 'AI · Open Source';
  if (category === 'tech') return 'Tech';
  return getTopic(category)?.label ?? category.charAt(0).toUpperCase() + category.slice(1);
}

// 'both' (legacy: AI + Open Source) belongs to both of those topics.
export const articleMatchesTopic = (article: Pick<SummarizedArticle, 'category'>, topicId: string) =>
  article.category === topicId ||
  (article.category === 'both' && (topicId === 'ai' || topicId === 'open-source'));
