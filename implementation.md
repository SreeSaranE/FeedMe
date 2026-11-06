# Implementation plan: sidebar (drawer) navigation

This file is the brief for a fresh CLI agent. Do the tasks **one at a time, in order**. After each task: run the checks in "Checks after every task", tick its box below, add one line to the "Progress log" at the bottom, and **stop and report** before starting the next task unless the user told you to continue.

Earlier plans are finished. This plan adds a left sidebar to the feed screen and moves the Viewed, Bookmarks and Settings icons out of the top bar into it. Line numbers and file contents below are accurate as of this writing, but **re-read each file before you edit it** because the user edits files between turns.

## Checklist

- [x] Task 1: Pure helper that builds the sidebar sections (topics, their enabled feeds, unread counts)
- [x] Task 2: `Sidebar` component (animated drawer, rows, collapsible categories)
- [x] Task 3: Wire it into the feed screen and slim down the top bar
- [x] Task 4: Wording ("History"), docs, final verification

---

## 0. Read this first

### Rules from the project (`AGENTS.md`, must follow)

- Expo / React Native app. Prioritize mobile-first patterns, performance, cross-platform behaviour.
- `expo` is SDK **58**, React Native 0.88, React 19.3. **Do not trust memory** for Expo / RN APIs. Before touching one, read `https://docs.expo.dev/versions/v58.0.0/` (or `https://docs.expo.dev/llms.txt`). This plan uses only core React Native APIs (`Animated`, `PanResponder`, `BackHandler`, `AccessibilityInfo`, `useWindowDimensions`) plus packages already installed. Check the RN docs for `PanResponder` and `BackHandler` if unsure.
- Routes live in `src/app/`; non-route code stays outside it.
- Install packages only with `npx expo install <pkg>`. **This plan needs no new packages. Do not add any.** In particular do **not** add `react-native-reanimated`, `react-native-gesture-handler`, `react-native-worklets` or `@react-navigation/drawer` / Expo Router `Drawer`. They exist in `node_modules` only as transitive packages, are not declared dependencies, and would grow the APK we just shrank.
- Do not create or edit `ios/` or `android/`.
- Run `npx expo lint` and `npx tsc --noEmit` before declaring any task done.

### Rules from the user

- **Do not commit or push anything.** Leave all changes uncommitted.
- Match the surrounding code: comment density, naming, idiom (functional components, `StyleSheet.create` at the bottom, `useTheme()` colours, `spacing` / `radius` / `type` tokens from `src/theme.ts`, Ionicons imported as `import Ionicons from '@expo/vector-icons/Ionicons'`).
- Do not write repo files with shell heredocs (apostrophes break them). Use the Write / Edit tools. Throwaway scripts go in the OS temp folder and are deleted afterwards.
- Use they/them for anyone whose pronouns are not stated.
- Do only what the current task says. Do not touch the pipeline, Gemini service, storage, onboarding, or the article page.

### What the user asked for (their words)

The sidebar contains:

```
App name        settings icon
---
Bookmarks
History
---
Category
ai  v
 - TechCrunch
 - NVIDIA
 - Open AI

Security  v
 - Krebs on Security
```

"after adding these in side bar: viewed, bookmark, settings icons from top navbar should be removed."

---

## 1. How the app is built today (analysis)

### Structure

- Expo Router. `src/app/_layout.tsx` is the root: fonts, `GateProvider`, `Stack.Protected` guards for `(onboarding)` and `(app)`.
- `src/app/(app)/_layout.tsx` wraps a `Stack` in `AppStateProvider`. Screens: `index.tsx` (the feed) and `article/[id].tsx`.
- All app state is one hook, `src/hooks/useAppState.ts`, shared through `useApp()` (`src/features/articles/AppStateContext.tsx`). It owns articles, feeds, settings, sync, **and the filter state**.
- The feed screen `src/app/(app)/index.tsx` (284 lines) renders: `SafeAreaView` > `ActionBar` (`src/components/Header.tsx`) > a `listArea` holding `AnimatedFlatList` and a collapsible overlay with `FilterBar` (search + chips) > `SettingsModal`.
- `SettingsModal` is a RN `Modal` (`pageSheet`) with internal pages, drafts saved on close. It is opened by `isSettingsOpen` state in `index.tsx`.

### Filter model (important: the sidebar must reuse it, not replace it)

`useAppState` already has four independent pieces of filter state, all exposed:

| State | Setter | Meaning |
|---|---|---|
| `showBookmarksOnly` | `setShowBookmarksOnly` | Saved view (bookmarked, read or not) |
| `showReadOnly` | `setShowReadOnly` | Read view (what the user calls History / Viewed) |
| `selectedCategory` -> `activeCategory` | `setSelectedCategory` | `'All'`, a topic id (`'ai'`), or `'other'`. Matches `article.category` (set by Gemini, not by the feed) through `articleMatchesTopic` |
| `selectedSource` -> `activeSource` | `setSelectedSource` | `'All'` or a feed name. Matches `article.sourceName`, which the pipeline sets to `feed.name` (`pipelineService.ts:152`) |

Neither flag set = Home (unread only). `viewArticles` applies the view, then `filteredArticles` applies category, source and search.

Two derived values matter:

- `activeSource` silently falls back to `'All'` when the chosen source has **no articles in the current view** (`availableSources` is built from `viewArticles`). So a sidebar feed row with zero articles must not be tappable, or it would "select" and then show everything.
- `activeCategory` falls back to `'All'` when its chip is gone.

The chips in `FilterBar` (topic chips, source chips) stay as they are. If the sidebar drives the **same setters**, the chips and the sidebar highlight stay in sync with no new state model. That is the design of this plan. **Do not add a new "selection" state or touch the filter logic in `useAppState.ts`.**

### Topics and feeds

- `src/constants/topics.ts`: `TOPICS` (16, each with `id`, `label`, `icon`, `feeds`), `resolveTopics(ids)` (selected topics in registry order; falls back to defaults), `articleMatchesTopic`.
- `FeedConfig` (`src/types/index.ts`): `{ id, name, url, enabled, category? }`. For registry feeds `category` is the **topic label** (`'AI'`, set in `buildFeedsForTopics`). Custom feeds added in Settings get `category: 'Custom Feed'` (`FeedsSettings.tsx:45`). A feed listed under two topics (Hacker News) appears once, under the first selected topic that lists it.
- Selected topics: `settings.selectedTopics`. Enabled feeds: `feeds.filter(f => f.enabled)`.

### Current top bar (`src/components/Header.tsx`, `ActionBar`)

Title "FeedMe" + status/count text on the left; icon buttons: Viewed (`checkmark-done`), Bookmarks (`bookmark`), Sync (`refresh`, spinner while syncing), Settings (`settings-outline`). A 2px sync progress line sits along its bottom edge. `index.tsx` passes the toggle handlers, which also call `resetListPosition()` and clear the other view flag.

### Patterns to follow

- Animations: core `Animated`, `useNativeDriver: true`, `Easing.out(Easing.cubic)`, ~200ms (see `index.tsx` `setRevealed`, `ProgressDots`, `OnboardingTopBar`). Reduce-motion is honoured with `AccessibilityInfo.isReduceMotionEnabled()` plus the `reduceMotionChanged` listener (copy the pattern from `ProgressDots.tsx` / `OnboardingTopBar.tsx`).
- Theming: `useTheme()` colours, `type.*` text styles (Poppins), hairline separators, rounded `surface` fills. No shadows in dark mode (see `settings/shared.tsx` `Card`).
- Safe areas: `react-native-safe-area-context` (`useSafeAreaInsets`). The Android app is edge-to-edge.
- Every touchable has `accessibilityRole` and, for icon-only buttons, `accessibilityLabel`; selected state via `accessibilityState`.

### Design decisions (already made; follow them)

1. **Custom drawer, no navigation library.** Built from `Animated` + `PanResponder`, mounted inside the feed screen.
2. **Sidebar rows drive the existing filter setters.** Each row = "set all four filter values at once", then `resetListPosition()`, then close the drawer.
3. **Home row added.** The user's spec has no way back to the unread feed once Bookmarks or History is open. Add a **Home** row (icon `home-outline`) as the first row of the Bookmarks / History group. Tapping the already-active Bookmarks or History row also returns Home (same as the old toggle icons). If the user later wants it removed, it is one line.
4. **"History" = the existing Read view** (`showReadOnly`). Same data, new name.
5. **Category row has two tap targets.** Tapping the label selects that topic (`selectedCategory = topic.id`, view = Home, source = All) and closes the drawer. Tapping the chevron (larger hit area) expands or collapses its feeds without selecting.
6. **Feed rows** select the feed (`selectedSource = feed.name`, category = All, view = Home) and close the drawer. They show the unread count on the right. A feed with 0 unread is dimmed and disabled.
7. **Which feeds are listed:** only enabled feeds, grouped under the user's selected topics in registry order, by matching `feed.category === topic.label`. Enabled feeds whose category matches no selected topic (custom feeds, or a feed of a topic deselected later) go in a last group named **Custom feeds** whose header only expands/collapses (it is not a category and cannot be selected).
8. **Expanded state** is in-memory only. Initially collapsed, except the group that holds the active feed or active category, which auto-expands when the drawer opens.
9. **Opening:** a menu button in the top bar. Closing: tap the dimmed backdrop, swipe the drawer left, Android hardware back, or choosing an item. **No edge-swipe-to-open**: on Android with gesture navigation the screen edge belongs to the system back gesture and the two would fight. (It can be added later.)
10. **Settings from the sidebar:** close the drawer, then open the existing `SettingsModal` once the close animation has finished (do not animate a drawer and present a modal at the same moment). `SettingsModal` itself is unchanged.
11. **Top bar after the change:** menu button (left), "FeedMe" + status/count text, Sync button (right). The Viewed, Bookmarks and Settings icons are removed. Sync stays because it is a frequent action and shows sync state.

---

## 2. Tasks

### Task 1: Pure helper that builds the sidebar sections

**New file:** `src/features/sidebar/sections.ts`. Pure TypeScript, no React, no RN imports (so it can be checked with a throwaway script).

```ts
export interface SidebarFeed {
  id: string;
  name: string;      // matches article.sourceName
  unread: number;    // unread articles from this feed
}

export interface SidebarSection {
  key: string;       // topic id, or 'custom'
  label: string;     // topic.label, or 'Custom feeds'
  topicId: string | null; // null for the custom group (not selectable)
  feeds: SidebarFeed[];
  unread: number;    // sum of its feeds
}

export function buildSidebarSections(
  topics: Topic[],             // resolveTopics(settings.selectedTopics)
  feeds: FeedConfig[],
  articles: SummarizedArticle[]
): SidebarSection[]
```

Rules:

- Count unread once: build a `Map<string, number>` of `sourceName -> count` over `articles` where `!a.isRead`. Ignore `isSample` articles (they are not real feeds). Then each feed's `unread` is a map lookup (O(articles + feeds), no nested loop).
- One section per topic in `topics` order. Its feeds are `feeds.filter(f => f.enabled && f.category === topic.label)`, in the order they already have in `feeds`. Keep topics that have zero enabled feeds (the row shows with no children).
- If any enabled feed belongs to no listed topic, append one `custom` section holding them.
- A feed name appearing twice (should not happen) must not crash; just list both.

Also export a tiny helper `sectionHasActive(section, activeCategory, activeSource): boolean` used for the auto-expand rule (true when `section.topicId === activeCategory` or any feed `name === activeSource`).

**Checks for this task** (in addition to the standard checks): write a throwaway script in the temp folder (never in the repo) that imports nothing from React Native, feeds the helper a handful of fake topics / feeds / articles, and asserts: grouping, counts, disabled feeds excluded, custom group appears only when needed, read and sample articles not counted. Delete the script afterwards. If importing TS from a script is awkward without new packages, instead re-read the function carefully against these rules and say so in the progress log; do not install anything.

### Task 2: `Sidebar` component

**New files** (keep each small):

- `src/components/sidebar/Sidebar.tsx`: the drawer shell (animation, backdrop, gestures, header, scrolling body).
- `src/components/sidebar/SidebarRows.tsx`: `SidebarRow` (icon + label + optional trailing text, active state), `SectionHeader` (label, chevron button, optional select).

Props of `Sidebar`:

```ts
interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;            // fired after the close animation ends (used to open Settings)
  sections: SidebarSection[];
  view: 'home' | 'saved' | 'read';  // from showBookmarksOnly / showReadOnly
  activeCategory: string;
  activeSource: string;
  onSelectHome: () => void;
  onSelectSaved: () => void;
  onSelectRead: () => void;
  onSelectCategory: (topicId: string) => void;
  onSelectFeed: (feedName: string) => void;
  onOpenSettings: () => void;
}
```

Behaviour and layout:

- **Mounting:** hold an internal `mounted` state. Render `null` when `!visible && !mounted`. Animate one `Animated.Value` `progress` (0 closed, 1 open): drawer `translateX` from `-width` to `0`, backdrop `opacity` from 0 to 0.4 (black). Open ~220ms, close ~180ms, `Easing.out(Easing.cubic)`, native driver. On close finish: `setMounted(false)` then `onClosed?.()`.
- **Reduce motion:** if reduce-motion is on, set the value directly (no timing) but still run the same mount / `onClosed` logic.
- **Size:** `width = Math.min(320, windowWidth * 0.84)` via `useWindowDimensions`. Full height, absolute-fill overlay (`StyleSheet.absoluteFill`) above everything. Drawer background `colors.background`, a right hairline border `colors.separator`. Backdrop is a `Pressable` over the rest; `accessibilityLabel="Close menu"`.
- **Safe areas:** use `useSafeAreaInsets()`: `paddingTop: insets.top`, `paddingBottom: insets.bottom`, `paddingLeft: insets.left`. The overlay itself must cover the status bar area, so the screen mounts it **outside** the `SafeAreaView` (Task 3).
- **Header row** (height 52, like the old bar): `FeedMe` in `type.headline` on the left; on the right a settings icon button (`settings-outline`, 22, 44x44 touch target, `accessibilityLabel="Settings"`) calling `onOpenSettings`.
- Hairline separator.
- **Group 1:** `Home` (`home-outline` / `home`), `Bookmarks` (`bookmark-outline` / `bookmark`), `History` (`checkmark-done-outline` / `checkmark-done`). Active row: `colors.surface` pill background, icon and text in `colors.accent`, `accessibilityState={{ selected: true }}`. Home is active when `view === 'home' && activeCategory === 'All' && activeSource === 'All'`.
- Hairline separator, then a small caption label `Categories` (`type.caption`, `colors.textSecondary`, same look as `SectionLabel` in `settings/shared.tsx` but no need to import it).
- **Sections:** for each `SidebarSection`, a `SectionHeader` and, if expanded, its feed rows (indented, `type.body`, trailing unread count in `colors.textSecondary`).
  - Header label tap: calls `onSelectCategory(section.topicId)` (not for the custom group). Chevron button (`chevron-down` / `chevron-up`... use one chevron that rotates or swaps, hit slop 8, `accessibilityLabel` "Expand <label>" / "Collapse <label>", `accessibilityState={{ expanded }}`) toggles expansion. Hide the chevron when the section has no feeds.
  - Header is active when `view === 'home' && activeCategory === section.topicId && activeSource === 'All'`.
  - Feed row active when `view === 'home' && activeSource === feed.name`. A feed with `unread === 0`: `opacity 0.4`, `disabled`, no count shown.
  - Show a section's unread total next to the label only if > 0, muted.
- **Expanded state:** `useState<Set<string>>`. When the drawer opens (`visible` goes true), expand every section for which `sectionHasActive(...)` is true, **adding to** what is already expanded. Use the "adjust state during render" pattern used in `SettingsModal.tsx` (`wasVisible`) rather than an effect, because the lint rule `react-hooks/set-state-in-effect` is on.
- **Body:** a `ScrollView` (`showsVerticalScrollIndicator={false}`). A plain `ScrollView` is fine (at most ~10 topics x ~11 feeds, and it only exists while the drawer is mounted).
- **Gestures:** a `PanResponder` on the drawer container (`useRef(PanResponder.create(...)).current`; follow the RN docs; note that React 19's lint may flag reading refs during render, if so create it with `useMemo` / `useState(() => ...)` initialiser):
  - `onMoveShouldSetPanResponder`: claim the gesture only when it is clearly horizontal and to the left: `dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.5`. Never claim vertical drags (the list must scroll).
  - On move: set `progress` to `1 - Math.min(1, -dx / width)`.
  - On release: if `dx < -width * 0.3` or `vx < -0.5`, close; else animate back to 1.
- **Hardware back (Android):** while `visible`, register `BackHandler.addEventListener('hardwareBackPress', ...)` that calls `onClose` and returns `true`; remove it on cleanup.
- **Accessibility:** drawer container `accessibilityViewIsModal` (iOS) and the backdrop labelled; rows as buttons.
- Fonts and colours only from `useTheme` / `type`; no hard-coded colours except the backdrop black.

The component is presentational: it does **not** read `useApp()`. The screen passes everything in.

### Task 3: Wire into the feed screen, slim down the top bar

#### 3a. `src/components/Header.tsx` (`ActionBar`)

- Remove props `onSettingsPress`, `showBookmarksOnly`, `onToggleBookmarks`, `onToggleRead` and their three icon buttons. Keep `showReadOnly` and `showBookmarksOnly` **only if still needed for the caption** (see Task 4); otherwise pass a single optional `viewLabel?: string` and use it for the caption prefix. Prefer `viewLabel` (`'History'`, `'Saved'` or undefined); it is simpler than two booleans.
- Add `onMenuPress: () => void` and a leading menu button: `menu-outline` icon, 22, same `iconButton` style (44x44), `accessibilityLabel="Open menu"`. Place it at the start of the row; the title block follows. Reduce `paddingLeft` so the icon button sits on the same 16px gutter as the list (the icon is centred in 44px, so use `paddingLeft: spacing.xs` on the bar and let the title keep its natural spacing; check visually that the title is not cramped).
- Keep the Sync button and the progress line exactly as they are. Update the component's doc comment ("app name + count on the left, ... actions").

#### 3b. `src/app/(app)/index.tsx`

- New state: `const [isSidebarOpen, setIsSidebarOpen] = useState(false);` and a `pendingSettings` ref (`useRef(false)`).
- Wrap the screen: `return ( <View style={styles.root}> <SafeAreaView ...>...</SafeAreaView> <Sidebar .../> </View> )` with `root: { flex: 1 }` and the background colour. The `Sidebar` must be a sibling **after** the `SafeAreaView`, not inside it. Keep `SettingsModal` where it is.
- Selection handlers (all call `resetListPosition()` first, then set state, then `setIsSidebarOpen(false)`):
  - `selectHome`: `setShowBookmarksOnly(false); setShowReadOnly(false); setSelectedCategory('All'); setSelectedSource('All')`. (This is `resetFilters` minus clearing the search text; **keep the search text**, like the old toggles did. Do not call `resetFilters`.)
  - `selectSaved`: if already in the saved view, behave like `selectHome`; else `setShowBookmarksOnly(true); setShowReadOnly(false); setSelectedCategory('All'); setSelectedSource('All')`.
  - `selectRead`: same pattern with `showReadOnly`.
  - `selectCategory(id)`: view flags false, `setSelectedCategory(id)`, `setSelectedSource('All')`.
  - `selectFeed(name)`: view flags false, `setSelectedCategory('All')`, `setSelectedSource(name)`.
- Sidebar data: `const topics = useMemo(() => resolveTopics(settings.selectedTopics), [settings.selectedTopics]);` and `const sections = useMemo(() => buildSidebarSections(topics, feeds, articles), [topics, feeds, articles]);`. This needs `articles` from `useApp()` (already exposed by the hook, not yet destructured here). Do not change `useAppState`.
- `view` prop: `showReadOnly ? 'read' : showBookmarksOnly ? 'saved' : 'home'`.
- Settings: `onOpenSettings={() => { pendingSettings.current = true; setIsSidebarOpen(false); }}` and `onClosed={() => { if (pendingSettings.current) { pendingSettings.current = false; setIsSettingsOpen(true); } }}`. The `EmptyState` "open settings" button keeps calling `setIsSettingsOpen(true)` directly (the drawer is closed there).
- `ActionBar` call: remove the removed props, add `onMenuPress={() => setIsSidebarOpen(true)}` and `viewLabel`.
- Do not change the list, refresh control, collapsible top block or scroll logic.

#### 3c. Behaviour to confirm by reading the code (no device needed, state it in the report)

- Opening an article from a filtered view and coming back keeps the filter and a closed drawer (state lives in the layout context and the screen's local drawer state).
- Choosing a category / feed / Bookmarks / History while the search box has text keeps the text.
- `EmptyState` paths still work: "Back to your feed" calls `handleResetFilters`; unchanged.

### Task 4: Wording, docs, final verification

- **Wording:** the user calls the read view "History" (and "viewed" before). Make the UI consistent:
  - Caption prefix in the top bar: `History · 12 articles` / `Saved · 3 articles` (was `Read ·`).
  - `src/components/EmptyState.tsx` read-view copy: title `No history yet`, body `Articles you have read, or marked as read, will show up here.` Leave the bookmarks copy. Leave the "Back to your feed" button.
  - The old accessibility labels "Show read articles" / "Show saved articles" disappear with the icons.
- **README.md:** update the feature list / usage text where it mentions the top-bar icons (Viewed, Bookmarks, Settings) so it describes the sidebar. Keep the same tone and length. If it does not mention them, add one short line.
- **Search the repo** (`src`, `README.md`) for leftovers: `onSettingsPress`, `onToggleBookmarks`, `onToggleRead`, "Show read articles", "Read ·". Nothing should remain.
- Full checks, then trace these flows by reading the code and report each as pass or fail:
  1. Open drawer, tap Bookmarks: saved view, chips reset, drawer closes, caption says `Saved ·`.
  2. Tap Bookmarks again (reopen the drawer): back to Home.
  3. Tap History with none read: empty-state "No history yet", "Back to your feed" returns Home.
  4. Expand a category, tap a feed with unread: list shows only that feed, the source chip is highlighted, Home row not highlighted, feed row highlighted.
  5. Tap a feed with 0 unread: nothing happens (disabled).
  6. Tap a category label: topic chip selected, source chip cleared.
  7. Settings from the drawer: drawer closes, then the Settings modal opens; Done returns to the feed with the drawer closed.
  8. Android back with drawer open: closes it, does not leave the app.
  9. User with a custom feed enabled: a `Custom feeds` group appears; its header only expands.
  10. User deselects a topic in Settings: its section disappears from the drawer; its feeds that remain enabled appear under `Custom feeds`.

---

## 3. Checks after every task

1. `npx tsc --noEmit` (no errors).
2. `npx expo lint` (no errors; do not add `eslint-disable` except where the code base already uses the same one for the same reason).
3. Re-read your diff. Confirm no new dependencies in `package.json` and no changes to `app.json`, `ios/`, `android/`.
4. `git status` shows only files you meant to touch; **nothing committed**.

Expected files by the end: new `src/features/sidebar/sections.ts`, `src/components/sidebar/Sidebar.tsx`, `src/components/sidebar/SidebarRows.tsx`; edited `src/components/Header.tsx`, `src/app/(app)/index.tsx`, `src/components/EmptyState.tsx`, `README.md`, `implementation.md` (checklist and log).

## 4. Out of scope

- Edge-swipe to open the drawer (conflicts with Android back gesture).
- Persisting expanded sections or the last selected view across launches.
- Changing sync, filters logic, feed registry, the article page, onboarding or Settings pages.
- A tablet / wide-screen permanent sidebar.

## 5. Progress log

(Add one line per finished task: task number, what was done, checks result.)
- 2026-11-03: Task 1 - Created src/features/sidebar/sections.ts with buildSidebarSections and sectionHasActive. Verified with unit tests in $TEMP (unread map O(articles), disabled feeds excluded, isSample/read ignored, custom section appended only when unmapped enabled feeds exist). tsc and lint clean.
- 2026-11-03: Task 2 - Implemented SidebarRows.tsx (SidebarRow with badge, pill styling, disabled state, and SectionHeader with dual tap targets for topic selection and chevron expansion) and Sidebar.tsx (animated drawer with translate and backdrop fade, reduced motion support, safe area insets, Android hardware back press, left-swipe PanResponder, and auto-expanding active section). tsc and lint clean.
- 2026-11-03: Task 3 - Updated Header.tsx (ActionBar: added leading menu button, viewLabel support, removed Viewed/Bookmarks/Settings buttons) and wired Sidebar into index.tsx with selection handlers, outside SafeAreaView, settings coordination via onClosed, and viewLabel. Confirmed filter persistence, search text preservation, and EmptyState behavior. tsc and lint clean.
- 2026-11-03: Task 4 - Updated EmptyState.tsx read-view title to "No history yet", updated README.md with sidebar navigation feature description, confirmed zero leftover references across src/ and README.md, ran full checks (tsc, expo lint, expo-doctor 20/20 clean), and verified all 10 user flows.
