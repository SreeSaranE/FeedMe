import { FeedConfig } from '../types';

// Bump when DEFAULT_FEEDS changes: storage then adds new defaults to saved lists
// and drops the ids in REMOVED_DEFAULT_FEED_IDS (once per version).
export const DEFAULT_FEEDS_VERSION = 2;
// Names of the retired feeds, to purge their already-stored articles once.
export const REMOVED_DEFAULT_FEED_NAMES = ['Android Police', 'Engadget', 'PCMag', 'The Verge', 'Ness Labs'];
export const REMOVED_DEFAULT_FEED_IDS = ['android-police', 'engadget', 'ness-labs', 'pcmag', 'the-verge'];

export const DEFAULT_FEEDS: FeedConfig[] = [
  {
    id: 'cloudflare-blog',
    name: 'Cloudflare Blog',
    url: 'https://blog.cloudflare.com/rss/',
    enabled: true,
    category: 'Dev & Infrastructure'
  },
  {
    id: 'google-blog-ai',
    name: 'Google Blog (AI)',
    url: 'https://blog.google/technology/ai/rss/',
    enabled: true,
    category: 'AI Research'
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    url: 'https://raw.githubusercontent.com/leontloveless/ai-rss-feeds/main/feeds/deepmind-blog.xml',
    enabled: true,
    category: 'AI Research'
  },
  {
    id: 'mit-news-ai',
    name: 'MIT News - AI',
    url: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
    enabled: true,
    category: 'AI Research'
  },
  {
    id: 'nvidia-tech-blog',
    name: 'NVIDIA Technical Blog',
    url: 'https://developer.nvidia.com/blog/feed/',
    enabled: true,
    category: 'AI & GPU'
  },
  {
    id: 'openai-news',
    name: 'OpenAI News & Engineering',
    url: 'https://openai.com/news/rss.xml',
    enabled: true,
    category: 'AI Research'
  },
  {
    id: 'pragmatic-engineer',
    name: 'The Pragmatic Engineer',
    url: 'https://blog.pragmaticengineer.com/rss/',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'huggingface-blog',
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    enabled: true,
    category: 'AI Research'
  },
  {
    id: 'simon-willison',
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/everything/',
    enabled: true,
    category: 'AI & Dev'
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    enabled: true,
    category: 'AI News'
  },
  {
    id: 'ars-ai',
    name: 'Ars Technica AI',
    url: 'https://arstechnica.com/ai/feed/',
    enabled: true,
    category: 'AI News'
  },
  {
    id: 'aws-ml',
    name: 'AWS Machine Learning Blog',
    url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
    enabled: true,
    category: 'AI & Infrastructure'
  },
  {
    id: 'import-ai',
    name: 'Import AI',
    url: 'https://importai.substack.com/feed',
    enabled: true,
    category: 'AI Research'
  },
  {
    id: 'hacker-news',
    name: 'Hacker News',
    url: 'https://hnrss.org/frontpage',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'infoq',
    name: 'InfoQ',
    url: 'https://feed.infoq.com/',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'martin-fowler',
    name: 'Martin Fowler',
    url: 'https://martinfowler.com/feed.atom',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'netflix-tech',
    name: 'Netflix Tech Blog',
    url: 'https://netflixtechblog.com/feed',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'stack-overflow-blog',
    name: 'Stack Overflow Blog',
    url: 'https://stackoverflow.blog/feed/',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'github-blog',
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'bytebytego',
    name: 'ByteByteGo',
    url: 'https://blog.bytebytego.com/feed',
    enabled: true,
    category: 'Software Engineering'
  },
  {
    id: 'github-open-source',
    name: 'GitHub Blog (Open Source)',
    url: 'https://github.blog/open-source/feed/',
    enabled: true,
    category: 'Open Source'
  },
  {
    id: 'lwn',
    name: 'LWN.net',
    url: 'https://lwn.net/headlines/rss',
    enabled: true,
    category: 'Open Source'
  },
  {
    id: 'its-foss',
    name: 'It\'s FOSS',
    url: 'https://itsfoss.com/feed/',
    enabled: true,
    category: 'Open Source'
  },
  {
    id: 'linux-foundation',
    name: 'Linux Foundation',
    url: 'https://www.linuxfoundation.org/blog/rss.xml',
    enabled: true,
    category: 'Open Source'
  },
  {
    id: 'the-new-stack',
    name: 'The New Stack',
    url: 'https://thenewstack.io/feed/',
    enabled: true,
    category: 'Open Source'
  },
  {
    id: 'openssf',
    name: 'OpenSSF Blog',
    url: 'https://openssf.org/feed/',
    enabled: true,
    category: 'Open Source'
  }
];

export const RELEVANCE_KEYWORDS = [
  '\\bai\\b', '\\bartificial intelligence\\b', '\\bgemini\\b', '\\bchatgpt\\b',
  '\\bopenai\\b', '\\bclaude\\b', '\\banthropic\\b', '\\bllm\\b', '\\bllms\\b',
  '\\bmachine learning\\b', '\\bdeep learning\\b', '\\bdeepseek\\b',
  '\\bopen source\\b', '\\bopensource\\b', '\\bfoss\\b', '\\baosp\\b',
  '\\bgithub\\b', '\\bgit\\b', '\\bhugging face\\b', '\\bhuggingface\\b',
  '\\bllama\\b', '\\bmistral\\b', '\\bcopilot\\b', '\\bagent\\b', '\\bagents\\b',
  '\\bon-device ai\\b', '\\bneural\\b', '\\btransformer\\b', '\\bdiffusion\\b',
  '\\bvision model\\b', '\\bmultimodal\\b', '\\bcuda\\b', '\\bnvidia ai\\b',
  // Software engineering (for mixed feeds like Hacker News / The New Stack)
  '\\bsoftware engineering\\b', '\\bsystem design\\b', '\\barchitecture\\b',
  '\\bkubernetes\\b', '\\bdevops\\b', '\\brust\\b', '\\bdatabase\\b',
  '\\bapi\\b', '\\bdeveloper\\b', '\\bprogramming\\b', '\\bcompiler\\b'
];

// Feeds that are on-topic by nature: every article skips the keyword pre-filter
// (Gemini still decides relevance and category).
export const DEDICATED_FEEDS = [
  // AI
  'MIT News - AI',
  'OpenAI News & Engineering',
  'Google DeepMind',
  'Google Blog (AI)',
  'Hugging Face Blog',
  'Import AI',
  'TechCrunch AI',
  'Ars Technica AI',
  'AWS Machine Learning Blog',
  // Software engineering
  'The Pragmatic Engineer',
  'InfoQ',
  'Martin Fowler',
  'Netflix Tech Blog',
  'Stack Overflow Blog',
  'ByteByteGo',
  'Cloudflare Blog',
  // Open source
  'GitHub Blog (Open Source)',
  'LWN.net',
  "It's FOSS",
  'Linux Foundation',
  'OpenSSF Blog'
];

export const AVAILABLE_MODELS = [
  { label: 'Gemini 3.1 Flash Lite (Recommended)', value: 'gemini-3.1-flash-lite' },
  { label: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
];
