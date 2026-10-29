import { SummarizedArticle } from '../types';

// How-to cards shown when the user skips the API key, so the feed isn't empty.
// They are tips about the app, not news. Removed once real articles arrive.
export function buildSampleArticles(now = new Date()): SummarizedArticle[] {
  const stamp = now.toISOString();
  const base = {
    sourceName: 'FeedMe',
    category: 'tips',
    published: stamp,
    fetchedAt: stamp,
    isRelevant: true,
    isBookmarked: false,
    isSample: true,
  };
  return [
    {
      ...base,
      id: 'sample-add-key',
      title: 'Add a free Gemini API key to start your digest',
      link: 'https://aistudio.google.com/apikey',
      bulletSummary: [
        'FeedMe reads your feeds on this device and asks Google Gemini to pick the relevant articles and summarize them.',
        'Create a free key in Google AI Studio, then paste it under Settings → API Settings.',
        'The key is stored in your device keystore and is only sent to Google.',
      ],
      significance: 'Until a key is added, nothing is synced, so this card stays here.',
    },
    {
      ...base,
      id: 'sample-triage',
      title: 'Read, save and share from each article',
      link: 'https://github.com/SreeSaranE/FeedMe',
      bulletSummary: [
        'Tap a title to open the full article in the in-app browser.',
        'Use the check mark to mark an article as read; it moves to the Read view.',
        'Use the bookmark to keep it under Saved, where it is never cleaned up.',
      ],
      significance: 'Home shows only unread articles, so it works like an inbox you can clear.',
    },
    {
      ...base,
      id: 'sample-topics',
      title: 'Change your topics and feeds any time',
      link: 'https://github.com/SreeSaranE/FeedMe',
      bulletSummary: [
        'Settings → Feeds lets you switch feeds on or off and add your own RSS URL.',
        'Pull down on the list, or tap sync, to fetch new articles.',
        'Use search and the topic chips at the top to narrow the list.',
      ],
      significance: 'FeedMe is open source, so you can read how it works or suggest changes on GitHub.',
    },
  ];
}
