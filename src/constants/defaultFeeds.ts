import { FeedConfig } from '../types';
import { buildFeedsForTopics, DEFAULT_TOPIC_IDS } from './topics';

// Bump when DEFAULT_FEEDS changes: storage then adds new defaults to saved lists
// and drops the ids in REMOVED_DEFAULT_FEED_IDS (once per version).
export const DEFAULT_FEEDS_VERSION = 2;
// Names of the retired feeds, to purge their already-stored articles once.
export const REMOVED_DEFAULT_FEED_NAMES = ['Android Police', 'Engadget', 'PCMag', 'The Verge', 'Ness Labs'];
export const REMOVED_DEFAULT_FEED_IDS = ['android-police', 'engadget', 'ness-labs', 'pcmag', 'the-verge'];

// The feeds of the default topics (AI, Engineering, Open Source): what existing installs
// already have. Other topics' feeds come from constants/topics.ts.
export const DEFAULT_FEEDS: FeedConfig[] = buildFeedsForTopics(DEFAULT_TOPIC_IDS);

export const AVAILABLE_MODELS = [
  { label: 'Gemini 3.1 Flash Lite (Recommended)', value: 'gemini-3.1-flash-lite' },
  { label: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
];
