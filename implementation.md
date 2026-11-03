# Implementation plan: standardise enabled feeds per topic (5 per topic)

This file is the brief for a fresh CLI agent. Do the tasks **one at a time, in order**. After each task: run the checks in "Checks after every task", tick its box below, add one line to the "Progress log" at the bottom, and **stop and report** before starting the next task unless the user told you to continue.

Earlier plans are finished. This plan changes how many feeds start **enabled** for the topics a user picks. Line numbers and file contents below are accurate as of this writing, but **re-read each file before you edit it** because the user edits files between turns.

## Checklist

- [x] Task 1: Add the "default feed" flag and make the builders enable only defaults
- [x] Task 2: Flag 5 default feeds for AI, Engineering, Open Source
- [x] Task 3: Research and add feeds so every topic has 5 default feeds (verify every URL)
- [x] Task 4: Verify the numbers with a throwaway script and a trace of the user flows
- [x] Task 5: Final verification and docs

---

## 0. Read this first

### Rules from the project (`AGENTS.md`, must follow)

- Expo / React Native app. Prioritize mobile-first patterns, performance, cross-platform behaviour.
- `expo` is SDK **58**. **Do not trust memory** for Expo / RN APIs. This plan is plain TypeScript data and logic plus network checks of URLs; no Expo API should be needed. If you reach for one, read `https://docs.expo.dev/versions/v58.0.0/` first.
- Routes live in `src/app/`; non-route code stays outside it.
- Install packages only with `npx expo install <pkg>`. **This plan needs no new packages. Do not add any** (no `tsx`, no `ts-node`).
- Do not create or edit `ios/` or `android/`.

### Rules from the user

- Do not commit or push anything unless the user asks. Leave all changes uncommitted.
- Do only what the current task says. Do not touch the pipeline, Gemini service, UI screens, onboarding screens, article pages, or the migration logic in `storage.ts` (see section 2, point 5).
- Match the surrounding code: naming, comment density (short comments that say *why*), idioms.
- If you refer to the user, use they/them.

### Checks after every task

Run from `D:\11-Projects\03-me\feedMe`:

```bash
npx tsc --noEmit        # must print no errors
npx expo lint           # must print no errors or warnings
```

At the end of Task 5 also run:

```bash
npx expo-doctor         # expect all checks passed
npx expo export --platform android --output-dir "$TEMP/feedme-export"   # bundle smoke test; delete the folder afterwards
```

There is **no test runner**. Throwaway scripts go in `$TEMP` (never in the repo) and are deleted afterwards. You cannot run the app on a device; say what you could not verify and give the user a short manual test list.

### Environment gotchas

- Windows. Use Bash tool POSIX syntax or PowerShell. **Do not write repo files with shell heredocs** (apostrophes and backticks break them); use the Write / Edit tools. A heredoc for a throwaway script in `$TEMP` is fine if it contains no apostrophes.
- `src/constants/topics.ts` imports `@expo/vector-icons`, so **it cannot be run directly with node**. For checks, parse the file text (regex) in a throwaway script, or copy the pure functions.

---

## 1. Project context

**FeedMe** is a standalone on-device Expo app: RSS feeds for the user's topics, Gemini filters and summarises. Topics and their feeds live in one registry.

### What exists today (verified)

`src/constants/topics.ts`:

- `TopicFeed { id, name, url, mixed? }`; `Topic { id, label, icon, relevanceHint, keywords?, feeds: TopicFeed[] }`; `TOPICS` has 16 topics; `MAX_TOPICS = 10`; `DEFAULT_TOPIC_IDS = ['ai','engineering','open-source']`.
- `buildFeedsForTopics(ids)` builds the feed list for a selection: **every** feed of every selected topic with `enabled: true`, deduplicated by feed id (first listing wins).
- `applyTopicsToFeeds(current, ids)` builds the feeds for a new selection and keeps the user's `enabled` state for feeds that already exist, using `known.get(f.id)?.enabled ?? true` for new ones; custom feeds (ids not in the registry) are kept.
- `needsKeywordFilter(feedId)`: a feed is keyword pre-filtered if it is custom or flagged `mixed`. `keywordRegexForTopics` unions the `keywords` of the selected topics; only the three tech topics define keywords.

Feed counts per topic now: AI 11, Engineering 9, Open Source 6, Health 4, Sports 4, Security 3, Science 3, Business 3, World News 3, Gaming 3, Movies & TV 3, Music 3, Startups 2, Space 2, Fitness 2, Finance 2. Only one feed id appears under two topics: `hacker-news` (Engineering and Startups, `mixed: true`).

Other users of these builders (all must keep working):

- `src/constants/defaultFeeds.ts`: `DEFAULT_FEEDS = buildFeedsForTopics(DEFAULT_TOPIC_IDS)`, `DEFAULT_FEEDS_VERSION = 2`.
- `src/services/storage.ts`: `getFeeds()` seeds `DEFAULT_FEEDS` on a brand-new install; for an install with an older saved version it adds `DEFAULT_FEEDS` entries that are not yet known; `completeOnboarding()` calls `applyTopicsToFeeds(await this.getFeeds(), topics)`.
- `src/components/SettingsModal.tsx`: toggling a topic calls `applyTopicsToFeeds`; the Feeds page gets `defaultFeeds={buildFeedsForTopics(topicIds)}` for its **Reset** button.

### The problem

Selecting AI + Engineering + Open Source switches on 26 feeds, but a topic like Finance gives 2. The user wants it standardised: **each selected topic contributes 5 enabled feeds**, so for example AI + Open Source + Health gives at most 15 enabled feeds (5 + 5 + 5).

---

## 2. Design (decided, do not re-open)

1. **A per-feed `default` flag** in the registry. Only default feeds start enabled. Each topic has **exactly 5** default feeds (4 only where, after real searching, no good fifth feed can be found; report each such case).
2. **Non-default feeds stay in the registry and in the Feeds list, switched off**, so the user can turn them on. Do not delete existing feeds.
3. `buildFeedsForTopics` sets `enabled: !!f.default`. `applyTopicsToFeeds` keeps the user's saved state for feeds that already exist and, for new ones, uses the feed's default state (not a blanket `true`). Because `DEFAULT_FEEDS` and the Reset button both come from `buildFeedsForTopics`, they follow automatically.
4. **A feed that appears under more than one topic is never a default** (today only `hacker-news`). Reason: `buildFeedsForTopics` deduplicates by id, first listing wins, so a shared default could be counted for the wrong topic and break "5 per topic". Hacker News therefore stays available (switched off) under Engineering and Startups.
5. **Existing installs are not changed.** Do **not** bump `DEFAULT_FEEDS_VERSION` and do not edit the migration in `storage.ts`. Anyone who already has feeds enabled keeps exactly their saved states; the new limit only applies when feeds are created from a topic selection (first-run, adding a topic in Settings, Reset). Also keep every existing feed id unchanged for the same reason.
6. **Custom feeds are never limited or counted.**
7. **Prefer on-topic feeds** as defaults over general ones that need the keyword pre-filter (`mixed`), and prefer feeds that publish regularly. Do not mark feeds of the non-tech topics `mixed`: `keywordRegexForTopics` would then apply the tech keywords (when a tech topic is also selected) and drop good articles.
8. **The app's parser reads only RSS 2.0 and Atom.** RSS 1.0 / RDF feeds now fail visibly ("is not an RSS or Atom feed"). Do not add RDF feeds.

### Recommended default sets for the three existing big topics (Task 2)

- **AI (5):** `google-blog-ai`, `openai-news`, `huggingface-blog`, `techcrunch-ai`, `ars-ai`
- **Engineering (5):** `cloudflare-blog`, `pragmatic-engineer`, `infoq`, `netflix-tech`, `stack-overflow-blog`
- **Open Source (5):** `github-open-source`, `lwn`, `its-foss`, `linux-foundation`, `openssf`

If you find a clear reason to swap one (for example a dead feed), say so in the report.

---

## 3. Tasks

### Task 1: Add the "default feed" flag and make the builders enable only defaults

**File:** `src/constants/topics.ts` (logic only; no feed data changes yet).

**Do:**

1. Add `default?: boolean` to `TopicFeed` with a one-line comment (starts enabled when the topic is picked; max 5 per topic; never on a feed shared by several topics). Export `DEFAULT_FEEDS_PER_TOPIC = 5` next to `MAX_TOPICS`.
2. In `buildFeedsForTopics`, set `enabled: !!f.default` instead of `true`.
3. In `applyTopicsToFeeds`, replace `known.get(f.id)?.enabled ?? true` with `known.get(f.id)?.enabled ?? f.enabled` (the built entry already carries its default state).
4. Update the comments above both functions to describe the new behaviour (short).
5. Do not touch `defaultFeeds.ts`, `storage.ts`, or any component.

**Acceptance:** `tsc` and `lint` clean. State plainly in the report that until Task 2 no feed is flagged, so right now **every** new feed list would start with all feeds disabled; this is a temporary state, so do not stop to test the app between Tasks 1 and 2 (continue to Task 2 in the same session if the user allowed it, otherwise say so clearly).

---

### Task 2: Flag 5 default feeds for AI, Engineering, Open Source

**File:** `src/constants/topics.ts` (data).

**Do:**

1. Add `default: true` to the 5 feeds listed in section 2 for each of the three topics. No other change to these topics: ids, urls, names, `mixed` flags and order stay as they are.
2. Confirm `hacker-news` has no `default` under either topic.

**Acceptance:** `tsc` and `lint` clean. Reason it through and report: with AI + Engineering + Open Source (the seeded list for a new install) exactly 15 feeds are enabled and 11 are listed disabled.

---

### Task 3: Research and add feeds so every topic has 5 default feeds

**File:** `src/constants/topics.ts` (data). **No unverified URL may be added.**

Topics that need new feeds (current default-eligible count to 5): Health 4 (+1), Sports 4 (+1), Security 3 (+2), Science 3 (+2), Business 3 (+2), World News 3 (+2), Gaming 3 (+2), Movies & TV 3 (+2), Music 3 (+2), Startups 1 non-shared (+4), Space 2 (+3), Fitness 2 (+3), Finance 2 (+3). That is about 28 new feeds. Aim for 5 default per topic; accept 4 only after a real search and say why.

**Candidates to test first** (from memory, **unverified**; replace any that fail):

- Security: Schneier on Security `https://www.schneier.com/feed/atom/`, Ars Technica Security `https://arstechnica.com/security/feed/`, SecurityWeek `https://feeds.feedburner.com/securityweek`, Dark Reading, CISA alerts
- Startups: Crunchbase News `https://news.crunchbase.com/feed/`, VentureBeat `https://venturebeat.com/feed/`, Y Combinator blog, Product Hunt `https://www.producthunt.com/feed`, TechCrunch Venture
- Science: Nature `https://www.nature.com/nature.rss`, Science News `https://www.sciencenews.org/feed`, Phys.org, Live Science `https://www.livescience.com/feeds/all`, New Scientist
- Space: SpaceNews `https://spacenews.com/feed/`, Universe Today `https://www.universetoday.com/feed`, Ars Technica Space `https://arstechnica.com/space/feed/`, NASA APOD, Sky & Telescope
- Health: Harvard Health, WHO news, Medical News Today, Guardian Health
- Fitness: Breaking Muscle `https://breakingmuscle.com/feed/`, Verywell Fit, Healthline fitness, Runner's World, Guardian lifestyle/fitness
- Business: Harvard Business Review, Fast Company `https://www.fastcompany.com/latest/rss`, Forbes Business, Business Insider
- Finance: Yahoo Finance `https://finance.yahoo.com/news/rssindex`, Investopedia, Seeking Alpha market news, NYT Business
- World News: NYT World `https://rss.nytimes.com/services/xml/rss/nyt/World.xml`, The Guardian World `https://www.theguardian.com/world/rss`, DW `https://rss.dw.com/rdf/rss-en-all` (RDF: **reject** if it is RDF), France 24
- Gaming: Kotaku, Eurogamer `https://www.eurogamer.net/feed`, PC Gamer `https://www.pcgamer.com/rss/`, Rock Paper Shotgun `https://www.rockpapershotgun.com/feed`
- Movies & TV: IndieWire `https://www.indiewire.com/feed/`, Deadline `https://deadline.com/feed/`, /Film `https://www.slashfilm.com/feed/`, Collider
- Music: Stereogum `https://www.stereogum.com/feed/`, Consequence `https://consequence.net/feed/`, NME, Billboard
- Sports: Sky Sports, Yahoo Sports, ESPN Cricinfo `https://www.espncricinfo.com/rss/content/story/feeds/0.xml`

**Do:**

1. For every candidate, check it from the shell with the app's own User-Agent:

   ```bash
   curl -sL -A "FeedMe-Mobile/1.0 (React Native)" -H "Accept: application/rss+xml, application/xml, text/xml, */*" -o "$TEMP/feed.xml" -w "%{http_code} %{content_type}\n" "<url>"
   ```

   A feed **passes** only if: HTTP 200, the body contains an `<rss` or `<feed` root (not `rdf:RDF`, not HTML), it has at least one `<item` or `<entry`, and its newest item is no more than about 60 days old. Search the web for replacements when a candidate fails. Keep a table (topic, name, url, status, newest item date, pass or fail) for the report.
2. Add each passing feed to its topic in `TOPICS` with a unique, lowercase, hyphenated `id` that does not collide with any existing id (the ids of existing feeds must not change), a clear `name`, the verified `url`, and `default: true` for the ones that make up the topic's 5 defaults. Extra passing feeds beyond 5 may be added without `default`.
3. Do **not** set `mixed` on any feed of a non-tech topic (see section 2, point 7). Do not add the same feed id under two topics; if a source is wanted by two topics, use two different feeds (for example a section feed per topic).
4. Keep entries tidy: same property order and quoting style as the existing entries (use double quotes only around names containing an apostrophe, as `It's FOSS` does).
5. Delete `$TEMP/feed.xml` and any other temporary files afterwards.

**Acceptance:** `tsc` and `lint` clean; the table is in the report; every topic has exactly 5 default feeds or a stated reason for 4. Flag feeds you consider fragile (Cloudflare-protected, rate-limited, geo-blocked) in the report, because the same network environment may behave differently on a phone.

---

### Task 4: Verify the numbers with a throwaway script and a trace of the user flows

**Do:**

1. Write a throwaway script in `$TEMP` that reads `src/constants/topics.ts` as text and, for each topic block, extracts the feeds (`id`, `url`, `default`, `mixed`). Report and check:
   - every topic has between 4 and 5 default feeds, and 5 for all topics unless Task 3 reported otherwise;
   - no feed id appears under two topics **and** is default;
   - all feed ids are unique except the known shared `hacker-news`;
   - no `mixed` feed in a non-tech topic;
   - the total default count equals the sum over topics.
2. Trace by reading the code, for each case below, how many feeds end up **enabled** and say why:

| # | Scenario | Expect |
|---|---|---|
| 1 | Fresh install, picks AI + Open Source + Health | 15 enabled: 5 + 5 + 5 (seeded AI/OSS feeds keep their default states; Health feeds start from their default flags; Engineering feeds are dropped) |
| 2 | Fresh install, picks all 10 allowed topics | at most 50 enabled |
| 3 | Fresh install, picks AI only | 5 enabled, the other 6 AI feeds listed as disabled |
| 4 | Fresh install, picks Engineering + Startups | 10 enabled; `hacker-news` is listed under both and is disabled |
| 5 | Existing user with 26 enabled feeds, no change | still 26 enabled; nothing is switched off |
| 6 | Existing user adds Health in Settings → Topics | their AI/Eng/OSS states unchanged; Health adds 5 enabled |
| 7 | Settings → Feeds → Reset (topics AI + Health) | 10 enabled; custom feeds removed as the Reset text already says |
| 8 | User adds a custom feed | not counted, enabled as before |
| 9 | User switches a non-default feed on by hand | stays on; topic changes later keep that state |

3. If any row does not hold, stop and report instead of patching around it.

**Acceptance:** script output and the table (with your reasoning per row) are in the report. Delete the script.

---

### Task 5: Final verification and docs

**Do:**

1. Run all four checks (tsc, lint, expo-doctor, Android bundle smoke test; delete the export folder afterwards).
2. Leftovers: scratch files in the repo (`git status` should show only `src/constants/topics.ts` modified and `implementation.md`, besides whatever the user already had uncommitted); unused exports.
3. `README.md`: in the Features line "Topic-driven feeds" add that each picked topic starts with 5 feeds enabled and the others are available (switched off) under Settings → Feeds. In the structure block no change is needed.
4. Give the user a final manual test list and a per-file summary. **Do not commit.** Remind the user that existing installs keep their current feeds on purpose, and how to try the new behaviour (Settings → Feeds → Reset, or a fresh install / clear app data).

**Final manual test list for the user:**

| # | Scenario | Expect |
|---|---|---|
| 1 | Fresh install (clear app data), pick AI, Open Source, Health | Settings → Feeds shows 15 enabled of the total |
| 2 | Pick one topic only | 5 enabled |
| 3 | Settings → Topics, add one topic | Enabled count grows by 5 |
| 4 | Settings → Feeds → Reset | Only each topic's 5 defaults are on |
| 5 | Switch a non-default feed on | It stays on after reopening Settings |
| 6 | Sync with the new defaults | Articles arrive from the new feeds; failed-feed count stays low |
| 7 | Existing install | Feeds and their on/off states unchanged |

---

## 4. Out of scope (do not do)

- Changing existing users' saved feeds, bumping `DEFAULT_FEEDS_VERSION`, or editing the migration.
- A new UI (counters, limits, warnings) or changes to onboarding and Settings screens.
- A hard cap that stops the user from enabling more than 5 feeds per topic; the 5 is only the starting state.
- Adding RDF or non-RSS/Atom sources, or any package.
- Changing the sync pipeline, the Gemini service, or committing to git.

## 5. Progress log

Add one line per finished task: date, task number, what you did, anything surprising, anything you could not verify.
- 2026-11-02: Task 1 - Added default?: boolean to TopicFeed, exported DEFAULT_FEEDS_PER_TOPIC = 5, updated buildFeedsForTopics (enabled: !!f.default) and applyTopicsToFeeds (known.get(f.id)?.enabled ?? f.enabled). Currently all new lists start with 0 enabled feeds until Task 2/3 flag them. tsc and lint clean.
- 2026-11-02: Task 2 - Flagged 5 default feeds each for AI, Engineering, and Open Source. Verified hacker-news has no default. Verified with DEFAULT_TOPIC_IDS that exactly 15 feeds are enabled and 11 disabled. tsc and lint clean.
- 2026-11-02: Task 3 - Researched and validated candidate feeds across all 13 remaining topics via curl using app User-Agent (HTTP 200, valid RSS/Atom root, item count > 0, publish date <= 60d). Added 29 verified feeds with default: true and flagged existing non-shared feeds as default. Verified all 16 topics now have exactly 5 default feeds (80 total). tsc and lint clean.
- 2026-11-02: Task 4 - Verified topics registry and feeds with throwaway script (80 total defaults, 5 per topic, hacker-news sole shared non-default, no non-tech mixed feeds). Traced and verified all 9 user flow scenarios. tsc and lint clean.
- 2026-11-02: Task 5 - All 4 checks passed (tsc, lint, expo-doctor 20/20, Android bundle smoke test exported 1467 modules cleanly). Updated README.md Topic-driven feeds feature line. Verified no scratch files or unexpected git changes.

