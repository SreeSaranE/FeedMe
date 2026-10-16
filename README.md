# FeedMe (Mobile)

Standalone Expo React Native app that fetches RSS feeds, filters for AI & Open Source developments, summarizes them with Google Gemini, and delivers structured daily digests.

## Features

- **On-Device RSS Pipeline**: Fetches raw RSS/Atom feeds directly from tech outlets (Android Police, MIT News, DeepMind, OpenAI, Cloudflare, etc.).
- **Google Gemini Analysis**: Generates 3 concrete technical takeaways and a "Why it matters" developer significance callout.
- **Hero Image Previews**: Automatically extracts cover/hero images from RSS enclosures, media tags, or article HTML.
- **Offline Cache**: Stores summaries locally with AsyncStorage for offline reading.
- **Bookmarks & Saved Articles**: Save articles for future reference.
- **Customizable Feeds**: Add custom RSS feeds, enable/disable feeds, and pick Gemini models in Settings.
- **Interactive Reader**: Open full articles in the in-app browser or share directly.

## Getting Started

1. Start the Expo development server:
   ```bash
   npx expo start
   ```

2. Scan the QR code using **Expo Go** on your Android or iOS device, or press `w` to open in your web browser.

## Configuration

Environment variables can be adjusted in `mobile/.env`:
- `EXPO_PUBLIC_GEMINI_MODEL`: Default Gemini model.

The Gemini API key is **not** read from `.env` (variables starting with `EXPO_PUBLIC_` are bundled into the app). Enter it in the app under Settings → API Settings; it is stored on the device only.
- `EXPO_PUBLIC_GEMINI_MODEL`: Model name (default: `gemini-3.1-flash-lite`).
