# FeedMe (Mobile)

Standalone Expo React Native app that fetches RSS feeds for the topics you choose, filters them with Google Gemini, and delivers short summaries with a "Why it matters" note. There is no backend: feeds, summaries and your API key stay on the device.

Source: https://github.com/SreeSaranE/FeedMe

## Features

- **First-run setup**: a short intro, topic selection (up to 10 of 16, e.g. AI, Health, Sports, Finance), and a guide to getting a free Gemini API key. The key step can be skipped.
- **Topic-driven feeds**: the default feeds, the Gemini relevance prompt and the sidebar sections all follow the topics you picked; each picked topic starts with 5 feeds enabled and the others are available (switched off) under Settings → Feeds. Change them any time in Settings → Topics.
- **Sidebar navigation**: slide-out drawer with Home, Bookmarks, and History views, collapsible topic sections, and individual feed filters with unread counts.
- **On-device RSS pipeline**: fetches RSS/Atom feeds directly, with a keyword pre-filter for general-interest feeds.
- **Google Gemini analysis**: 3 concrete takeaways and a "Why it matters" callout per relevant article.
- **Hero images**: taken from RSS enclosures, media tags or the article HTML.
- **Offline cache**: summaries are stored with AsyncStorage for offline reading; old articles are removed automatically after the configured number of days (bookmarks are kept).
- **History and Bookmarks**: mark articles as read, bookmark them, search and filter by topic or source.
- **Article page**: tap an article for the full summary, takeaways and why it matters; marked read after about 15 seconds on the page, with a manual read/unread control in the header.
- **Customizable feeds**: add your own RSS feeds (a missing https:// is added for you), switch feeds on or off, pick the Gemini model.
- **Reader**: open articles in the in-app browser or share them.

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on Android or iOS, or press `w` for the web. Use `npx expo start --clear` after changing config.

On first launch the app shows the setup flow. Without an API key it shows a few how-to cards; they disappear after the first sync that finds real articles.

## Configuration

The Gemini API key is **not** read from `.env`: variables starting with `EXPO_PUBLIC_` are bundled into the app. Enter it in the setup flow or under Settings → API Settings; it is kept in the device keystore (SecureStore). Get a free key at https://aistudio.google.com/apikey.

Optional, in `.env`:

- `EXPO_PUBLIC_GEMINI_MODEL`: default Gemini model (default: `gemini-3.5-flash-lite`).

## Project structure

```
src/
  app/                   Expo Router routes
    _layout.tsx          root layout; guards wizard vs feed (Stack.Protected)
    (app)/               feed screen (index.tsx) and article page (article/[id].tsx)
    (onboarding)/        welcome, topics, api-key, finish
  features/
    articles/            shared state provider (AppStateContext.tsx)
    onboarding/          wizard state (reducer) and shared step components; one fixed top bar (OnboardingTopBar) shared by all steps
  hooks/useAppState.ts   articles, feeds, settings, sync and filters
  constants/
    topics.ts            topic registry: feeds, Gemini hints, keywords, helpers
    defaultFeeds.ts      default feed version, retired feeds, model list
    sampleArticles.ts    how-to cards shown when no key was entered
    reading.ts           reading dwell time constant (15s auto-read)
  services/              rssParser, geminiService, pipelineService, storage, usage, http
  components/
    article/             article detail page components (header, actions, footer, etc.)
    settings/            settings tabs and shared components
    sidebar/             sidebar drawer and row components (Sidebar.tsx, SidebarRows.tsx)
    FadeIn.tsx           reusable fade-and-lift entrance transition
```

To add a topic, add an entry to `TOPICS` in `src/constants/topics.ts` (id, label, icon, relevance hint, feeds). The wizard, Settings, the Gemini prompt and the sidebar pick it up.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Building

Preview APK through EAS: `npx eas-cli@latest build --profile preview --platform android`.
