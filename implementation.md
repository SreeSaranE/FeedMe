# Implementation plan: three medium-severity fixes (feed URLs, chip keys, HTML entities)

This file is the brief for a fresh CLI agent. Do the tasks **one at a time, in order**. After each task: run the checks in "Checks after every task", tick its box below, add one line to the "Progress log" at the bottom, and **stop and report** before starting the next task unless the user told you to continue.

The previous plans (article page, refinements, image/scrape/auto-delete fixes) are finished and verified. This plan fixes three more issues found in review. Everything in section 2 was verified by reading the code; line numbers are accurate as of this writing, but **re-read each file before you edit it** because lines move.

## Checklist

- [x] Task 1: Normalise custom feed URLs (missing `https://`, `feed://`)
- [x] Task 2: Unique React keys in the filter bar chips
- [x] Task 3: Decode common named HTML entities (`&mdash;`, `&rsquo;`, ...)
- [x] Task 4: Final verification and docs

---

## 0. Read this first

### Rules from the project (`AGENTS.md`, must follow)

- Expo / React Native app. Prioritize mobile-first patterns, performance, cross-platform behaviour.
- `expo` is SDK **58** (React Native 0.88, React 19.3). **Do not trust memory** for Expo / RN APIs. This plan only touches plain TypeScript and existing React Native components (`Pressable`, `ScrollView`, `TextInput`); no new Expo or RN API should be needed. If you reach for one, read `https://docs.expo.dev/versions/v58.0.0/` first.
- Routes live in `src/app/`; non-route code stays outside it.
- Install packages only with `npx expo install <pkg>`. **This plan needs no new packages. Do not add any.**
- Do not create or edit `ios/` or `android/`.

### Rules from the user

- **Do NOT commit or push anything to git** (repo: `https://github.com/SreeSaranE/FeedMe`). Leave all changes uncommitted.
- Do only what the current task says. Do not refactor unrelated code. Do not touch navigation, onboarding, the Gemini service, the sync pipeline, or the article page.
- Match the surrounding code: naming, comment density (short comments that say *why*), idioms. Use theme tokens from `src/theme.ts`; no hardcoded colours.
- If you refer to the user, use they/them.

### Checks after every task

Run from `D:\11-Projects\03-me\feedMe`:

```bash
npx tsc --noEmit        # must print no errors
npx expo lint           # must print no errors or warnings
```

At the end of Task 4 also run:

```bash
npx expo-doctor         # expect 20/20 passed
npx expo export --platform android --output-dir "$TEMP/feedme-export"   # bundle smoke test; delete the folder afterwards
```

There is **no test runner** in this project. For pure functions (Tasks 1 and 3) verify with a throwaway script in `$TEMP` (never in the repo): copy the function body, run it with `node`, report the output, delete the script. Do not add test files or test dependencies. You cannot run the app on a device, so in every report say what you could **not** verify and give the user a short manual test.

### Environment gotchas

- Windows. Use Bash tool POSIX syntax or PowerShell. **Do not write files with shell heredocs** for repo files (apostrophes and backticks break them); use the Write / Edit tools. (A heredoc for a scratch script in `$TEMP` is fine if it contains no apostrophes; otherwise use Write.)
- The user edits files between your turns. **Read a file before editing it** and treat the disk as truth.
- ESLint rules that have bitten before: `react/no-unescaped-entities`, `react-hooks/set-state-in-effect`.

---

## 1. Project context (only what these tasks touch)

```
src/
  utils/                          small pure helpers (date.ts lives here)
  services/rssParser.ts           decodeEntities, cleanHtmlText, fetchFeedEntries (fetches feed.url)
  components/FilterBar.tsx        search field + horizontal chips: All, topic chips, divider, source chips
  components/settings/FeedsSettings.tsx   feed list, "Add" form (name + RSS URL), Reset
```

Feeds are stored as `FeedConfig { id, name, url, enabled, category }` (see `src/types`). `FeedsSettings.add` builds the object from the raw text input and passes it to `onChange`, which saves it.

---

## 2. Root causes (each verified against the code)

### A. Custom feed URL is saved exactly as typed (`FeedsSettings.tsx:31-49`)

`add()` only checks that name and URL are non-empty, then saves `url: url.trim()`. The input is a plain `TextInput` with `keyboardType="url"`, which does not add a scheme. `RssParserService.fetchFeedEntries` passes `feed.url` straight to `fetch`. A URL without `http(s)://` is reported to fail on Android's network stack (relative or malformed URL), the error is caught per feed in `runSync` and counted in `failedFeeds` on **every** sync. Nothing ever corrects the stored value, so the feed stays broken until the user deletes it.

Two things the report did not mention, fix them in the same task:

- `feed://example.com/rss` is a common way to publish feeds; it has a scheme, so a simple "starts with http" check would turn it into `https://feed://...`. It must become `https://example.com/rss` (or `http://` is not appropriate; use https).
- Feeds **already saved** without a scheme (anyone who added one before this fix) stay broken even after the add form is fixed. Normalising again at fetch time repairs them without a migration.

Do **not** use `new URL()` to validate: the URL implementation in React Native is incomplete, and strict validation would reject things that work. Use a small regex-based helper.

### B. Chip `key` is the label text (`FilterBar.tsx:29-31`)

```tsx
const chip = (label, selected, onPress) => (<Pressable key={label} ...>
```

The `All` chip, every topic chip (keyed by topic **label**, not id) and every source chip (keyed by source name) share one key namespace inside a single `ScrollView`. Any overlap produces a duplicate key: a source literally named `All`, or a source named like a topic (a feed called "Science", "Health" or "Gaming" is plausible, and custom feeds can be named anything). React then logs a duplicate-key warning and may drop or duplicate a chip when the list changes.

Be accurate in the report: this is a `ScrollView` with ordinary children, not a recycling list, so it is not a "view recycling" bug; the real impact is the warning and a chip possibly rendering wrongly after an update. Severity is low-medium; the fix is still trivial and correct.

Note the collision cannot happen inside one group (topic ids are unique; `availableSources` comes from a `Set`), only across groups, so prefixing by group is sufficient.

### C. `decodeEntities` knows only numeric and six XML entities (`rssParser.ts:15-25`)

Numeric entities (`&#8217;`, `&#x2019;`) and `&nbsp; &lt; &gt; &quot; &apos; &amp;` are handled. Named typographic entities are not (`&mdash; &ndash; &rsquo; &lsquo; &ldquo; &rdquo; &hellip;` and more), and feeds do emit them (they arrive raw because the XML parser only resolves the five XML entities). `decodeEntities` is called from `cleanHtmlText`, which produces **titles, summaries and tags**, so raw `&rsquo;` shows up in headlines and the text sent to Gemini.

Constraints that shape the fix:

- `&amp;` is deliberately decoded **last** ("so `&amp;lt;` isn't double-decoded"). The new named-entity step must run **before** that line, and must leave unknown names untouched.
- HTML entity names are **case-sensitive** (`&Eacute;` is not `&eacute;`); do not lowercase.
- Articles **already stored** keep their old title text. No migration: they age out via the auto-delete setting. Say so in the report.

---

## 3. Decisions (do not re-open)

1. Task 1 adds one helper `normalizeFeedUrl` in a new file `src/utils/url.ts` (pure, no imports) and uses it in two places: the add form and `fetchFeedEntries`. It does not validate beyond adding a scheme; a genuinely bad URL still fails at sync like before.
2. Task 2 changes only `FilterBar.tsx`: `chip` gets an explicit `key` argument; keys are prefixed `all`, `cat-<id>`, `src-<name>`. No behaviour or style change.
3. Task 3 adds a named-entity map in `rssParser.ts` with a bounded list of common entities (about 30), applied in the existing replace chain before `&amp;`. No library (`he`, `entities`) and no giant table.
4. No storage-format change, no UI change, no new setting.

---

## 4. Tasks

### Task 1: Normalise custom feed URLs

**Files:** new `src/utils/url.ts`; `src/components/settings/FeedsSettings.tsx`; `src/services/rssParser.ts` (`fetchFeedEntries` only).

**Do:**

1. Create `src/utils/url.ts` exporting `normalizeFeedUrl(raw: string): string` with these rules, in order:
   - `trim()` the input; if empty return `''`.
   - `feed://` or `feed:https://` (case-insensitive) prefix: strip it and continue as a scheme-less URL (result gets `https://`). For `feed:https://x` keep the inner `https://x`.
   - Already matches `/^https?:\/\//i`: return it unchanged.
   - Starts with `//`: prefix `https:`.
   - Anything else (no scheme): prefix `https://`.
   - Another scheme (`ftp://`, `file://`, `javascript:` ...): do not try to be clever; with the rules above `ftp://x` would become `https://ftp://x`, so first check `/^[a-z][a-z0-9+.-]*:\/\//i` and, if the scheme is not http(s) or feed, return the input unchanged so it fails visibly at sync instead of being mangled.
   Add a short comment saying why (Android fetch rejects scheme-less URLs). Match the style of `src/utils/date.ts`.
2. `FeedsSettings.add`: compute `const feedUrl = normalizeFeedUrl(url)` after the emptiness check (keep the existing alert), and save `url: feedUrl`.
3. `RssParserService.fetchFeedEntries`: call `fetchTextWithTimeout(normalizeFeedUrl(feedUrl), ...)` so feeds saved earlier without a scheme work too. Do not change the saved value, the error messages or the rest of the function.
4. Do not add duplicate-URL detection or reachability checks; out of scope.

**Verify (throwaway script):** copy `normalizeFeedUrl` into `$TEMP` and report the output for:

| Input | Expect |
|---|---|
| `feeds.arstechnica.com/arstechnica/index` | `https://feeds.arstechnica.com/arstechnica/index` |
| `  https://a.com/rss  ` | `https://a.com/rss` |
| `HTTP://A.com/rss` | unchanged (`HTTP://A.com/rss`) |
| `http://a.com/rss` | unchanged (stays http) |
| `feed://a.com/rss` | `https://a.com/rss` |
| `feed:https://a.com/rss` | `https://a.com/rss` |
| `//a.com/rss` | `https://a.com/rss` |
| `ftp://a.com/rss` | `ftp://a.com/rss` (unchanged) |
| `   ` | `` (empty) |

**Acceptance:** `tsc` and `lint` clean; table matches; the add-form alert for empty input still works. Manual test for the user: Settings → Feeds → Add, enter a name and `feeds.arstechnica.com/arstechnica/index`, sync; the feed loads and the failed-feed count does not grow. The stored URL shown under the name starts with `https://`. A feed added earlier without a scheme starts working after the update.

---

### Task 2: Unique React keys in the filter bar

**File:** `src/components/FilterBar.tsx`.

**Do:**

1. Change `chip` to take a key: `const chip = (key: string, label: string, selected: boolean, onPress: () => void) => (<Pressable key={key} ...>`. Remove `key={label}`.
2. Update the three call sites:
   - `chip('all', 'All', ...)`
   - `chip(\`cat-${cat.id}\`, cat.label, ...)`
   - `chip(\`src-${source}\`, source, ...)`
3. Nothing else changes: styles, selection logic and the `onSelectSource(selected ? 'All' : source)` toggle stay as they are.

**Acceptance:** `tsc` and `lint` clean; `grep "key={label}" src` returns nothing. In the report, state that you could not reproduce the React warning without a device, but by reading the code every key is now unique across groups. Manual test for the user: add a custom feed named `All` (and one named like a topic, e.g. `Science`), sync so both appear as source chips; the chip row shows each chip once, tapping each selects only that chip, and the Metro console shows no "same key" warning.

---

### Task 3: Decode common named HTML entities

**File:** `src/services/rssParser.ts`, function `decodeEntities` (line ~15).

**Do:**

1. Add a module-level map above `decodeEntities`, for example:

   ```ts
   // Common named HTML entities; feeds emit these and the XML parser only resolves the five XML ones.
   const NAMED_ENTITIES: Record<string, string> = {
     mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
     lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201A',
     ldquo: '\u201C', rdquo: '\u201D', bdquo: '\u201E',
     laquo: '\u00AB', raquo: '\u00BB', bull: '\u2022', middot: '\u00B7',
     copy: '\u00A9', reg: '\u00AE', trade: '\u2122', deg: '\u00B0',
     times: '\u00D7', divide: '\u00F7', plusmn: '\u00B1',
     euro: '\u20AC', pound: '\u00A3', yen: '\u00A5', cent: '\u00A2',
     sect: '\u00A7', para: '\u00B6', frac12: '\u00BD', rarr: '\u2192', larr: '\u2190',
     eacute: '\u00E9', egrave: '\u00E8', uuml: '\u00FC', ouml: '\u00F6', auml: '\u00E4', ntilde: '\u00F1',
   };
   ```

   Use `\u` escapes (not literal characters) so the file encoding cannot corrupt them. Trim or extend the list sensibly; keep it small.
2. In `decodeEntities`, add one step **after** the `&apos;` replace and **before** the `&amp;` replace:

   ```ts
   .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => NAMED_ENTITIES[name] ?? match)
   ```

   Unknown names (including `amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, which are handled by their own steps) must pass through unchanged. Case-sensitive lookup, no lowercasing. Keep the existing comment on the `&amp;` line.
3. Do not touch `cleanHtmlText`, the numeric-entity steps, or any caller.

**Verify (throwaway script):** copy the map and `decodeEntities` into `$TEMP` and report:

| Input | Expect |
|---|---|
| `Rock&rsquo;n&rsquo;roll &mdash; live&hellip;` | `Rock’n’roll — live…` |
| `&ldquo;Quoted&rdquo; &ndash; text` | `“Quoted” – text` |
| `Tom &amp; Jerry` | `Tom & Jerry` |
| `&amp;mdash;` | `&mdash;` (literal, **not** decoded twice) |
| `&amp;lt;b&amp;gt;` | `&lt;b&gt;` (not decoded twice) |
| `&unknownentity; AT&T` | unchanged |
| `&Eacute;` (not in the map) | unchanged (`&Eacute;`) |
| `caf&eacute; &#8217; &#x2019;` | `café ’ ’` |

**Acceptance:** `tsc` and `lint` clean; table matches. State that existing stored articles keep their old text (no migration) and refresh as new articles arrive. Manual test for the user: sync a feed whose headlines use typographic punctuation; headlines show real dashes and quotes, not `&mdash;` or `&rsquo;`.

---

### Task 4: Final verification and docs

**Do:**

1. Run all four checks (tsc, lint, expo-doctor, Android bundle smoke test; delete the export folder afterwards).
2. Search for leftovers: unused imports or variables in the files you changed, and scratch files left in the repo (`git status` should show only `src/utils/url.ts` as new, plus `FeedsSettings.tsx`, `FilterBar.tsx`, `rssParser.ts` modified, and `implementation.md`, besides what was already uncommitted).
3. `README.md`: in the project-structure block no change is needed unless you added a notable file; add `utils/url.ts` only if the block already lists other `utils` files. Add one short clause to the Features line "Customizable feeds" saying a missing `https://` is added for you. No other README change.
4. Give the user a final manual test list and a per-file summary. **Do not commit.**

**Final manual test list for the user:**

| # | Scenario | Expect |
|---|---|---|
| 1 | Add a feed typed without `https://` | Saved with `https://`, syncs, failed count unchanged |
| 2 | Add `feed://example.com/rss` | Saved as `https://example.com/rss` |
| 3 | Feed saved earlier without a scheme | Works after the update |
| 4 | Custom feed named `All` or like a topic | One chip each, no key warning, taps select the right chip |
| 5 | Headlines with typographic punctuation (new articles) | Real characters shown |
| 6 | Old stored articles with raw `&rsquo;` | Unchanged until they age out (expected) |

---

## 5. Out of scope (do not do)

- Validating that a feed URL is reachable or a real feed, duplicate-feed detection, or rewriting `http` to `https`.
- A full HTML-entity library or the complete 2000-entry HTML table.
- Migrating already-stored article text.
- Any change to the sync pipeline, Gemini service, storage format, navigation, or committing to git.

## 6. Progress log

Add one line per finished task: date, task number, what you did, anything surprising, anything you could not verify.

- 2026-10-31: Task 1 - Created src/utils/url.ts with normalizeFeedUrl to handle missing schemes, feed:// wrappers, and protocol prefixes. Integrated in FeedsSettings.add and RssParserService.fetchFeedEntries. Verified with throwaway test script across all 9 specified test cases; tsc and lint clean. Live Android fetch unverified.
- 2026-10-31: Task 2 - Updated FilterBar.tsx to accept an explicit key parameter on chip with all, cat-${cat.id}, and src-${source} namespaces; verified grep key={label} returns empty; tsc and lint clean. Device warning suppression unverified.
- 2026-10-31: Task 3 - Added NAMED_ENTITIES map in src/services/rssParser.ts and plugged case-sensitive lookup into decodeEntities before &amp; replacement. Verified with throwaway test script on all 8 test cases; tsc and lint clean. Physical rendering of newly published feed titles unverified.
- 2026-10-31: Task 4 - Updated README.md Customizable feeds feature line, confirmed zero leftover variables/scratch files, and ran full test suite (tsc, lint, expo-doctor, Android export smoke test). Plan complete. Changes left uncommitted.

