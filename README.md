# FeedMe (Mobile)

Standalone Expo React Native app that fetches RSS feeds for the topics you choose, filters them with Google Gemini, and delivers short summaries with a "Why it matters" note. There is no backend: feeds, summaries and your API key stay on the device.

Source: https://github.com/SreeSaranE/FeedMe

## Features

- **First-run setup**: a short intro, topic selection (up to 10 of 16, e.g. AI, Health, Sports, Finance), and a guide to getting a free Gemini API key. The key step can be skipped.
- **Topic-driven feeds**: the default feeds, the Gemini relevance prompt and the filter chips all follow the topics you picked. Change them any time in Settings → Topics.
- **On-device RSS pipeline**: fetches RSS/Atom feeds directly, with a keyword pre-filter for general-interest feeds.
- **Google Gemini analysis**: 3 concrete takeaways and a "Why it matters" callout per relevant article.
- **Hero images**: taken from RSS enclosures, media tags or the article HTML.
- **Offline cache**: summaries are stored with AsyncStorage for offline reading.
- **Read and Saved views**: mark articles as read, bookmark them, search and filter by topic or source.
- **Customizable feeds**: add your own RSS feeds, switch feeds on or off, pick the Gemini model.
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

- `EXPO_PUBLIC_GEMINI_MODEL`: default Gemini model (default: `gemini-3.1-flash-lite`).

## Project structure

```
src/
  app/                   Expo Router routes
    _layout.tsx          root layout; guards wizard vs feed (Stack.Protected)
    index.tsx            feed screen
    (onboarding)/        welcome, topics, api-key, finish
  features/onboarding/   wizard state (reducer) and shared step components
  hooks/useAppState.ts   articles, feeds, settings, sync and filters
  constants/
    topics.ts            topic registry: feeds, Gemini hints, keywords, helpers
    defaultFeeds.ts      default feed version, retired feeds, model list
    sampleArticles.ts    how-to cards shown when no key was entered
  services/              rssParser, geminiService, pipelineService, storage, usage, http
  components/            feed UI and Settings pages
```

To add a topic, add an entry to `TOPICS` in `src/constants/topics.ts` (id, label, icon, relevance hint, feeds). The wizard, Settings, the Gemini prompt and the filter chips pick it up.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Building

Preview APK through EAS: `npx eas-cli@latest build --profile preview --platform android`.
