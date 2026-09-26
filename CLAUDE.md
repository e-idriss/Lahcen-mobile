# Quran App — Development Rules

> These rules are binding for every contribution to this project. They cover architecture, code quality, performance, security, accessibility, and — most importantly — the **design system**. Read the Design System section before writing any UI code.

---

## 🔎 Research First — Never Reinvent

**Before writing any non-trivial code, search for an existing library that already solves the problem.** Writing from scratch is the fallback, not the default.

### Mandatory Process
1. **Search first.** Check npm, GitHub, and the Expo docs before implementing. Anything that sounds like a solved problem (date math, lists, gestures, storage, parsing, navigation math, carousels, bottom sheets) almost certainly is.
2. **Prefer the Expo-blessed option.** If Expo documents a package under `docs.expo.dev/versions/latest/sdk/`, use it — it's guaranteed compatible with the managed workflow. Install with `npx expo install`, **never** bare `npm install`, so versions match the SDK.
3. **Never hand-roll** what a maintained library does: list virtualization, gesture handling, animation, SQLite access, font loading, safe-area math, Quran navigation math (juz/hizb/page lookups).

### Vetting Checklist — a library must pass **all** of these
- [ ] **Actively maintained** — published within ~12 months
- [ ] **Real usage** — meaningful weekly downloads; avoid sub-100/wk packages for core functionality
- [ ] **Expo-managed compatible** — ⚠️ **rejects anything depending on `react-native-fs`, or other packages needing manual native linking**
- [ ] **Permissive license** — MIT / Apache-2.0 / BSD / CC-BY
- [ ] **Proportionate dependency weight** — doesn't drag in an unrelated stack (audio, networking) for one small feature
- [ ] **Doesn't fight our architecture** — offline-first; reject network-only SDKs requiring API keys for core reading

Verify these against the **npm registry API**, not blog posts:
```bash
curl -s https://registry.npmjs.org/<pkg> | head -c 2000     # license, deps, last modified
curl -s https://api.npmjs.org/downloads/point/last-week/<pkg>
```

If a library fails vetting, **say why in the commit or PR** rather than silently writing it from scratch. If it passes, use it rather than reimplementing.

### Vetted Decisions (already researched — don't re-litigate)
| Need | Decision | Reason |
|---|---|---|
| Quran navigation math (juz, hizb, page, ruku, ayahId↔surah:ayah) | ✅ **`quran-meta`** | MIT, zero runtime deps, actively maintained, verified to match our Tanzil data exactly |
| List virtualization | ✅ **`@shopify/flash-list`** | Expo-documented, v2 needs no size estimates, 5–10× FlatList |
| Gestures / animation | ✅ **`react-native-gesture-handler` + `react-native-reanimated`** | Expo-blessed, UI-thread |
| Quran text + fonts | ✅ **Bundled Tanzil files** (in repo) | Offline-first; no network dependency |
| `@moustafahelmi/react-native-quran-app` | ❌ **Rejected** | ~9 dl/week; depends on `react-native-fs` (breaks managed workflow) + `react-native-track-player` |
| `@quranjs/api` | ❌ **Rejected for v1** | Network-only, needs OAuth clientId/secret; conflicts with offline-first |
| `quran-json` | ❌ **Rejected** | 78 MB unpacked; our bundled text is far smaller |

⚠️ **`quran-meta` uses 1-based `ayahId` (1–6236); Tanzil's `start` attribute is 0-based.** Convert explicitly at the data-layer boundary and unit-test the conversion.

---

## 🎯 Product Definition

A mobile Quran reading app built with **Expo (React Native)**.

### Core Features (v1)
| Feature | Description |
|---|---|
| **Mushaf reader** | Opens directly onto the Quran. Horizontal page-by-page swiping (RTL). |
| **Surah index** | Browsable/searchable list of all 114 surahs. |
| **Reading** | Continuous, distraction-free Arabic text with Uthmani script. |
| **Search** | Search Arabic text, English translation, and surah names. |
| **Translation** | English (Sahih International), toggleable inline per ayah. |
| **Bookmarks & last-read** | Persisted locally, restored on launch. |

### Non-Negotiables
- The app **opens on the Quran**, not a menu or splash-heavy onboarding.
- The reading surface is **sacred space** — no ads, no badges, no clutter, no gamification.
- **Offline-first.** The full Quran ships in the bundle. Zero network calls required to read.

---

## 📚 Data Assets

All source data is from [Tanzil.net](http://tanzil.net) (CC-BY). **Preserve the copyright headers** and attribute Tanzil in the app's About screen — this is a license requirement, not a courtesy.

| File | Contents | Use |
|---|---|---|
| `quran-simple.txt` | 6236 ayahs, simplified orthography | **Primary display text** — the only text ever shown |
| `quran-uthmani.txt` | 6236 ayahs, Uthmani script w/ full diacritics | Reference/verification only — **never displayed** |
| `en.sahih.txt` | Sahih International English translation | Translation display + search |
| `quran-data.xml` / `.js` | Surah, juz, hizb, page, ruku, manzil, sajda metadata | Navigation & indexes |
| `Elgharib-HAFSTharwatEmara.otf` | Uthmani Quran font | **All Arabic ayah text** |
| `arbfonts_Qurraan_sora.otf` | "Surah Name — Ejazah style" | **Surah name headers only** |

### 🔴 Display Text: `quran-simple.txt` — Not Negotiable

**The display text is `quran-simple.txt`. Always. `quran-uthmani.txt` is never
rendered on screen.**

The Uthmani file encodes Uthmani-only codepoints — alef wasla (`U+0671`, `ٱ`)
chief among them — that the bundled Elgharib font does **not** shape correctly
in this app. Simple orthography renders correctly. This was verified on device;
it is a settled decision, not a preference.

- The database column is named **`text_display`**, sourced from
  `quran-simple.txt`. `text_search` is a normalised derivative of that **same**
  string, so display and search can never drift apart.
- **Never** name a display column `text_uthmani`, and never reintroduce the
  Uthmani file as a display source "for better diacritics."
- **Guard test (must exist and pass):** zero occurrences of `U+0671` in
  `text_display` across all 6236 rows.
  ```sql
  SELECT COUNT(*) FROM ayahs WHERE text_display LIKE '%'||char(1649)||'%'; -- must be 0
  ```
- The Uthmani file stays in `data-src/` only as a cross-check that ayah keys and
  counts line up. If a future font is proven on a real device to shape Uthmani
  correctly, that switch requires an explicit decision recorded here — not a
  silent change.

### Text File Format
Pipe-delimited, `#`-prefixed comment lines at the head and tail:
```
1|1|بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
surah|ayah|text
```
**Always strip `#` comment lines and blank lines when parsing.** Both text files contain a trailing license block that will corrupt a naive parse.

### Metadata Shape
`quran-data.xml` surah attributes: `index, ayas, start, name, tname, ename, type, order, rukus`.
- `start` = **0-based global ayah index** — the offset into the flat 6236-ayah array. This is the key to O(1) surah slicing; use it rather than filtering.
- `type` is `Meccan` | `Medinan`.
- Also available: `<juzs>`, `<hizbs>`, `<pages>`, `<rukus>`, `<manzils>`, `<sajdas>` (with `type="recommended|obligatory"`).

### ⚠️ Ayah 1:1 vs. Basmalah
Every surah except **9 (At-Tawba)** begins with the Basmalah. In this dataset:
- For **Surah 1 (Al-Fatiha)**, the Basmalah **is** ayah 1 and must be numbered as such.
- For **all other surahs**, the Basmalah is a **prefix on ayah 1**, not a separate ayah. It must be rendered as a **centered, standalone header** — never numbered, never part of the ayah body.

Handle this in the data layer with an explicit, tested rule. Getting it wrong is a correctness bug in scripture, which is the most serious class of bug in this app. Write a unit test asserting: 6236 total ayahs, Al-Fatiha has 7, At-Tawba has no Basmalah, and Al-Baqara ayah 1 renders `الٓمٓ` with the Basmalah split off.

---

## 🔤 Typography — Quran Text (Critical)

Both fonts are **standard Unicode Arabic fonts** — they map real Arabic codepoints, not private-use ligature indexes. Pass plain text from the data files straight through; **no glyph-code transformation, no character remapping.**

**Verified coverage:** Elgharib renders **every character** in `quran-uthmani.txt` and `quran-simple.txt` with zero missing glyphs, including `U+06DD` (end-of-ayah), `U+0670` (superscript alef), `U+06DE` (rub el hizb), and `U+06E2` (small high meem). The surah-name font covers all 114 Arabic surah names.

| | Elgharib | Qurraan Sora |
|---|---|---|
| PostScript name | `Elgharib-HAFSTharwatEmara` | `SurahNameEjazahstyle-Regular` |
| unitsPerEm | 2048 | 1000 |
| hhea asc/desc | 2500 / −1400 | 850 / −350 |
| Used for | Ayah text **only** | Surah name headers **only** |

### Rendering Rules
- **Never** apply `fontWeight` or `fontStyle` to either font. There is one weight; faux-bolding destroys the calligraphy. Emphasize with color and size, never weight.
- **Elgharib's ascent/descent is huge (2500/−1400 on 2048 upem ≈ 1.9× em).** Default line height will clip diacritics on Android. Set `lineHeight` explicitly to **≥ 2.0× fontSize** for Arabic text and verify on a real Android device — Android and iOS lay out Arabic differently, and diacritic clipping only shows on one of them.
- Set `writingDirection: 'rtl'` and `textAlign: 'right'` (or `'center'` for the Basmalah) on Arabic text. Do **not** flip the whole app to RTL via `I18nManager` — it inverts the Latin UI too. Scope direction to the text components.

### 🔴 Pager Direction: Right-to-Left — Not Negotiable

A mushaf is bound right to left. **Page 1 is the RIGHTMOST page.** Moving
forward (page 1 → 2) means dragging the page **left to right**, the same motion
as turning a page in a physical mushaf. A default horizontal list does the exact
opposite and is **wrong** — it is a correctness bug, not a preference.

**Implementation (settled):** reverse the pager's data (`604 → 1`). Do not use
`I18nManager.forceRTL` (inverts the entire Latin UI) and do not use a
`scaleX: -1` transform (mirrors the rendered glyphs).

Because the data is reversed, **list index ≠ page number.** Always convert:
```ts
const indexForPage = (page: number): number => TOTAL_PAGES - page;
const pageForIndex = (index: number): number => TOTAL_PAGES - index;
```
Never use a raw scroll index as a page number, or `page - 1` as an index. Every
`initialScrollIndex`, `scrollToIndex`, and `onMomentumScrollEnd` handler goes
through these helpers. Verify on device: the app opens with page 1 on screen,
and swiping the page rightward advances to page 2.
- **Render ayah numbers as Arabic-Indic digits (`U+0660`–`U+0669`) ALONE.** Verified against the font's GSUB table: its `rlig` feature composes the ornate medallion from the digits themselves (`uni0661.rlig`…`uni0669.rlig` for one digit, plus two- and three-digit ligatures covering every ayah number).
- **Do NOT emit `U+06DD` (۝).** In this font it is a separate standalone medallion glyph, not a combining base — including it renders a second, empty circle beside the number. Never draw the medallion manually either (overlaying a number on the glyph); the font already does it correctly.
- Do not substitute a custom image or Latin digits.
- Arabic text must **never** be truncated with an ellipsis mid-ayah, and never `textTransform`-ed.
- Load fonts with `expo-font` and **block the reading UI until loaded** (hold the splash via `expo-splash-screen`). A flash of fallback system Arabic is jarring and misrenders diacritics.

### 🔴 The Page Is a 15-Line Grid

**A mushaf page holds exactly 15 lines.** That is why every printed copy in the
Madani tradition breaks pages identically. The reader reproduces this:

- `lineHeight = usableHeight / 15`, derived from the PAGE, never from the font
  size. The font size is then derived from the line box — the inverse of the
  usual relationship.
- **The page never scrolls and never clips.** Both are symptoms of abandoning
  the grid. A clipped final line is scripture truncated — P0.
- Page density varies from 286 to 1465 characters, so the type is **sized per
  page** to fill its 15 lines. Sparse pages cap at the line-box size rather than
  ballooning; dense pages shrink until they fit.
- Line count is **computed, not measured**: `onTextLayout` does not report
  reliably for a `<Text>` whose children are nested `<Text>` elements, which is
  this component's required structure. The estimate uses
  `ARABIC_CHAR_WIDTH_RATIO`, calibrated against the densest page (552) and
  documented in `tokens.ts`. Recalibrate it if the font or column width changes.
- Surah banners and the Basmalah consume grid lines too — subtract them from the
  15 before fitting.

### 🔴 Mushaf Justification — Density Is the Whole Game

A mushaf page is a **dense, evenly justified block**. Lines with big ragged
holes between words are a **rejected result**, not a minor cosmetic issue.

The cause is mechanical, so treat it mechanically:

- **iOS justifies by stretching inter-word spaces only.** Printed mushafs use
  **kashida** (letter elongation), which Core Text supports but React Native's
  `Text` does not expose. Total slack on a line is fixed; the fewer the words,
  the wider each gap must open.
- Therefore **words-per-line is the control**. Target **6–9 words per line**.
  Below ~5, the line visibly tears.
- This makes the default Arabic size a **typographic constraint, not a taste
  call**. On a ~360pt text column, ~19pt is right; 28pt fits only 3–4 words and
  tears every line. When raising the default, count the words on a rendered
  line before calling it done.
- **Keep the text column wide.** Every point of horizontal padding is slack the
  justifier cannot use. Frame padding on the reading surface stays tight
  (`spacing.md`), which is a deliberate exception to the 20–24pt screen padding.
- **Never inject `U+0640` (tatweel) to fake kashida.** That modifies scripture
  and is forbidden. If true kashida is ever required, it needs a native module —
  not edited text.
- Bind the medallion to its ayah with `U+2060` (word joiner) and put **exactly
  one** space between ayahs. Spaces around the medallion give the justifier
  extra break points precisely where ayahs meet, tearing the line there.

**A page must never clip.** The reading surface scrolls vertically as a safety
valve, because a final line cut off mid-word is scripture truncated — a P0 by
the Handling Scripture rules, not a layout nit.

### Surah Name Font
Feed it the plain Arabic name from the metadata (`الفاتحة`). It has `liga`/`rlig`/`calt` shaping that produces the decorative composition automatically. Use it **only** for surah names — never for UI labels or body copy.

---

## 🎨 Design System

> The bar is **Dribbble-quality**. Not "clean AI default." Every screen should look intentionally art-directed. If a screen looks like unstyled stock components on a white background, it is not done.

### Design Philosophy
This is a spiritual app. The aesthetic is **calm, warm, reverent, and generous with space** — think fine bookbinding and Islamic manuscript illumination, not a SaaS dashboard.

**Principles:**
1. **Content is the hero.** The Arabic text is the most beautiful thing on screen. Every other element recedes.
2. **Generous negative space.** Cramped is disrespectful. When in doubt, add padding.
3. **Restraint over decoration.** One accent color, used sparingly. Ornament appears at moments of significance (surah headers, Basmalah), not everywhere.
4. **Warm, paper-like neutrals.** Never pure `#FFFFFF` on `#000000`. Off-white paper tones and deep warm charcoals.
5. **Depth through layering and tone**, not heavy drop shadows or borders.

### Color Tokens
Define once in `theme/colors.ts`. **Never hardcode a hex value in a component.**

```ts
// Light — "Paper"
const light = {
  bg:          '#FBF7F0',  // warm paper
  surface:     '#FFFDF9',  // raised card
  surfaceSunk: '#F3EDE3',  // wells, search bar
  border:      '#E8DFD0',  // hairlines
  textPrimary: '#1C1917',  // near-black, warm
  textSecond:  '#6B6058',  // metadata
  textMuted:   '#A39889',  // ayah numbers, hints
  accent:      '#0F766E',  // deep teal — actions, active state
  accentSoft:  '#CCFBF1',  // selection wash
  gold:        '#B08D57',  // ornament, surah headers, Basmalah
};

// Dark — "Night reading"
const dark = {
  bg:          '#12100E',  // warm near-black
  surface:     '#1C1917',
  surfaceSunk: '#0D0B0A',
  border:      '#2E2926',
  textPrimary: '#F5EFE6',  // warm off-white — never #FFF
  textSecond:  '#A39889',
  textMuted:   '#6B6058',
  accent:      '#2DD4BF',
  accentSoft:  '#134E4A',
  gold:        '#D4AF7A',
};
```

**Rules:**
- Dark mode is a **first-class citizen**, not an inversion. People read Quran at night — implement it from day one and test every screen in both themes.
- Gold is for **ornament and reverence only** (surah header frames, Basmalah, ayah medallions). Never for buttons or ordinary UI.
- Accent is for **interaction only** (active tab, selected ayah, primary button). Never decorative.
- A **sepia/warm reading theme** is a strong third option — build the theme layer so adding it is trivial.

### Typography Scale
Latin UI type uses a single family with real weights. Prefer a warm, high-quality face — **Inter** as a safe default; a humanist serif for surah English names adds character.

| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `display` | 32 | 700 | 40 | Screen titles |
| `title` | 22 | 600 | 30 | Section headers |
| `body` | 16 | 400 | 24 | Translation, body |
| `label` | 14 | 500 | 20 | List items, buttons |
| `caption` | 12 | 500 | 16 | Metadata, ayah counts |
| `arabic` | 26–34 (user-scalable) | — | **≥ 2.0×** | Ayah text (Elgharib) |
| `surahName` | 32–44 | — | 1.4× | Surah headers (Qurraan Sora) |

Arabic font size **must be user-adjustable** (a reader setting, ~20–44pt). This is the single most-used setting in any Quran app.

### Spacing & Shape
- **4pt base scale**: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. No arbitrary values.
- Screen horizontal padding: **20–24**. Reading surface: **24–28** — text needs breathing room.
- Radii: `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `full: 999`. Be consistent; mixed radii look amateur.
- Shadows: **subtle and warm-tinted**, never harsh black. Prefer tonal separation (`surface` vs `bg`) over shadows. On Android use low `elevation` (1–3).

### Motion
- Durations **150–300ms**. Ease-out for enter, ease-in for exit.
- Use **`react-native-reanimated`** on the UI thread. Never animate with `setState` in a loop.
- Page swipes must feel **native and physical** — gesture-driven and interruptible, not a fixed-duration slide.
- **Respect `useReducedMotion`.** Disable decorative animation when the OS setting is on.
- Every interactive element needs a **press state** (scale ~0.97 or opacity/tone shift). Static-feeling buttons are the fastest tell of a low-effort UI.

### Component Quality Bar
Before considering a screen done:
- [ ] Looks deliberate in **both light and dark** themes
- [ ] All spacing on the 4pt scale; alignment is optically correct
- [ ] Empty, loading, and error states are **designed**, not default spinners or bare text
- [ ] Loading uses **skeletons matching final layout**, never a centered spinner on blank screen
- [ ] Touch targets **≥ 44×44pt**
- [ ] Safe-area insets respected (`react-native-safe-area-context`) — never hardcode notch padding
- [ ] Press/active feedback on every interactive element
- [ ] Verified on a **small device (iPhone SE)** and a large one — no clipping or overflow

### Signature Details
These are what separate this from a generic app. Invest here:
- **Surah header**: an illuminated frame — the surah name in Qurraan Sora, gold hairline ornament, Meccan/Medinan badge, ayah count. This is the app's visual signature.
- **Basmalah**: centered, gold-toned, generous vertical margin, in Elgharib.
- **Ayah medallion**: the `U+06DD` marker in gold, inline with the text flow.
- **Reading progress**: a hairline indicator, not a chunky progress bar.
- **Selected ayah**: soft `accentSoft` wash with rounded corners — not a harsh highlight rectangle.

---

## 🧱 Architecture & Code Quality

### Stack
- **Expo SDK (managed)** + **expo-router** (file-based routing)
- **TypeScript strict mode** — mandatory
- **Zustand** for global state (theme, reader settings, bookmarks)
- **expo-sqlite** for the Quran corpus + FTS search
- **react-native-mmkv** or `expo-secure-store`/AsyncStorage for small settings
- **react-native-reanimated** + **react-native-gesture-handler** for motion
- **expo-font**, **expo-splash-screen**, **react-native-safe-area-context**

### Folder Structure
```
app/                     # expo-router routes only — thin screens
  (reader)/[surah].tsx
  index.tsx
src/
  components/
    ui/                  # Button, Card, Sheet, Skeleton — primitives
    reader/              # AyahView, SurahHeader, Basmalah, PageView
  features/
    reader/              # hooks + logic for reading
    search/
    bookmarks/
  data/                  # DB access, parsers, queries — NO UI
  theme/                 # colors, spacing, typography tokens
  hooks/
  utils/
assets/
  fonts/
  data/                  # bundled .txt / prebuilt .db
```

### Rules
- **Route files stay thin.** Data fetching and business logic live in `features/` hooks or `data/`. A screen file over ~150 lines is a refactor signal.
- **One component, one responsibility.** Components: `PascalCase`. Hooks: `useCamelCase`. Files match the export name.
- **Type everything.** No `any`. No implicit `any`. Props are explicit interfaces. Enable `strict: true`.
- **No inline hex/magic numbers in components** — always theme tokens.
- **No business logic in JSX.** Compute above the `return`, in a `useMemo` or a hook.
- Use `StyleSheet.create` or a styled system consistently — never large inline style objects in the render path.
- Prefer **pure functions** in `data/` and `utils/` — they're the parts worth unit-testing.

---

## ⚡ Performance

Performance **is** a design feature here. Scroll jank in a reading app is disqualifying.

### Data Layer
- **Never load all 6236 ayahs into JS memory.** Ship a **prebuilt SQLite database** generated at build time from the `.txt` files. Do not parse megabytes of text on every cold start.
- Index on `(surah, ayah)` and on the global ayah index. Use `start` from the metadata for O(1) surah range queries.
- Query **per surah or per page**, never the whole corpus.
- Search uses **SQLite FTS5** over the *simple* text (diacritics break naive matching) and the English translation. **Debounce input ~250ms** and run queries off the JS thread where possible.

### Rendering
- Use **`FlashList`** (or `FlatList` with tuned `windowSize`/`maxToRenderPerBatch`) for ayah and surah lists. Never `.map()` a long list.
- **Memoize list items** with `React.memo` and stable `keyExtractor`. Unstable callbacks in `renderItem` defeat memoization — wrap in `useCallback`.
- Reader paging: a **virtualized horizontal pager** rendering ~3 pages (prev/current/next). Never mount all 604 pages.
- Animations run on the **UI thread** via Reanimated worklets. Zero `setState`-driven animation.
- No anonymous inline functions or object literals in `renderItem` props.

### Startup
- Cold start to readable text: **target < 2s**.
- Only fonts, theme, and last-read position block the first paint. Everything else is lazy.
- Bundled DB is read directly — **no copy-on-first-launch of a large file on the main thread** (if a copy is unavoidable, do it async behind the splash with a progress indicator).

### Measure
Profile before optimizing. Use the Expo dev tools / React DevTools Profiler, and test **release builds on a real low-end Android device** — Expo Go on a flagship hides the problems that matter.

---

## 🔒 Security & Privacy

This app handles no accounts and no payments. The privacy posture is therefore simple and strict: **collect nothing.**

- **No analytics, no trackers, no third-party SDKs** that phone home, unless the user explicitly opts in. Reading habits are religious practice — treat them as maximally sensitive.
- **All user data stays on-device.** Bookmarks, last-read, and settings never leave the phone without explicit consent.
- **No secrets in the repo.** Anything sensitive goes in EAS Secrets / env, never committed. `.env` stays in `.gitignore`.
- Client-side code is **never** trustworthy storage for secrets — an API key shipped in an app binary is a public key. If a future feature needs one, it goes behind a backend.
- Request **no permissions** the feature set doesn't need. No contacts, no location, no camera in v1.
- Any future network calls: **HTTPS only**, validate and type all responses, never `dangerouslySetInnerHTML`-style raw injection.
- Keep dependencies **minimal and audited**. Every added package is added attack surface and bundle size. Run `npm audit` before release.
- Use `expo-secure-store` for anything genuinely sensitive; plain AsyncStorage is unencrypted.

---

## ♿ Accessibility

- All interactive elements need `accessibilityRole` and a meaningful `accessibilityLabel`.
- Arabic ayah text should carry `accessibilityLanguage="ar"` so screen readers use the right voice.
- Respect **OS font scaling** for UI text. Arabic text has its own in-app size control — but never hard-lock `allowFontScaling={false}` across the UI.
- Contrast: **≥ 4.5:1** for body text in both themes. Verify the muted tokens especially — `textMuted` is the usual failure.
- Honor `useReducedMotion` for all decorative animation.
- Never convey meaning by color alone.

---

## 🧪 Testing

- **Unit tests** (Jest) for `data/` and `utils/` — parsing, Basmalah handling, surah slicing, search normalization. These are pure functions and there is no excuse for skipping them.
- **Mandatory data-integrity test suite:**
  - Exactly **6236** ayahs parsed
  - Exactly **114** surahs, ayah counts match `quran-data.xml` per surah
  - Al-Fatiha = 7 ayahs (Basmalah counted); At-Tawba has no Basmalah
  - No comment/blank lines leak into parsed output
  - Translation file aligns 1:1 with the Arabic by `(surah, ayah)`
  - Display text is sourced from `quran-simple.txt`: **zero** `U+0671` (alef
    wasla) in `text_display` across all 6236 rows
  - Exactly **112** rows with `has_basmalah = 1`, in the simple text
  - `indexForPage` / `pageForIndex` round-trip for every page 1..604, and
    `indexForPage(1) === 603` (page 1 is the last index — the rightmost page)
- **Component tests** (`@testing-library/react-native`) for reader components and interactive UI.
- Manual QA before release: **both themes**, small + large device, **real Android device**, and Arabic diacritic rendering spot-checked against a printed mushaf.

### Before Commit
```bash
npm run verify          # typecheck + tests + expo-doctor
```
Or individually:
```bash
npx tsc --noEmit        # types
npm run lint            # ESLint + Prettier
npm test                # tests
npx expo-doctor         # config + peer dependency validation
```

### ⚠️ `npx expo-doctor` Is Not Optional

**A green typecheck and a successful bundle do NOT mean the app runs.** Both
passed while the app crashed instantly on launch. Only `expo-doctor` caught the
cause. Run it after every dependency change.

Two failure modes it catches that nothing else does:

1. **Missing peer dependencies.** Native peers must be installed *directly* —
   npm does not auto-install them, and the bundler never notices. `expo-router`
   needs `expo-constants` + `expo-linking`; `react-native-reanimated` needs
   `react-native-worklets`. Missing any of these crashes the app at startup with
   no useful error.
2. **Version drift** from the versions the installed SDK expects.

**Never install with bare `npm install <pkg>` for anything native — use
`npx expo install <pkg>`,** which resolves the SDK-compatible version.

Related traps found the hard way:
- **`npm install --silent` hides ERESOLVE failures.** A package can appear
  "installed" while absent, producing a cascade of confusing `any` type errors.
  Never pass `--silent` to an install; read the output.
- **`babel.config.js` requires `babel-preset-expo` as an explicit devDependency.**
  Adding the config file without the package breaks bundling entirely.
- Peer-dependency conflicts can arise from a floating transitive `react-dom`.
  Pin it to the exact `react` version Expo ships.

---

## 🚫 Never Claim Done Without Proof

**"It typechecks" is not "it works." "It bundles" is not "it works." Neither is
"the tests pass."** A green pipeline says the code compiles, not that a human
looking at the screen sees something correct and beautiful.

Binding rules:
- **Never report a feature as working, done, finished, or verified unless it was
  actually run and observed.** If it was not run on a device or simulator, say
  exactly that: *"typechecks and tests pass; not yet verified on device."*
  Overstating status is worse than an unfinished feature, because it destroys
  the ability to trust every other status report.
- **Never claim a visual result was checked without seeing it.** Arabic shaping,
  diacritic clipping, RTL direction, and layout are only knowable by looking.
- **State what was verified and how**, in one line, whenever reporting work:
  what ran, on what, and what was observed.
- If something cannot be verified in the current environment, **say so plainly
  and name what remains unverified.** That is an acceptable answer. A false
  "done" is not.
- **A screen that has never been seen rendered is not finished.** Ship the
  honest status instead.

## 🚫 The Design Bar Is Not Optional

"Unstyled components on a white background" is a **rejected deliverable**, not a
first draft. Do not hand over a screen that looks like a default React Native
demo and describe it as complete.

Before any UI is called done:
- It uses theme tokens end to end — **zero** hardcoded hex, zero off-scale spacing.
- It was designed in **both light and dark**, not built in one and assumed in the other.
- Empty, loading, and error states are **designed**. A bare `ActivityIndicator`
  centered on a blank screen is not a loading state; use a skeleton matching the
  final layout.
- Every interactive element has a visible press state.
- The signature details in the Design System section (illuminated surah header,
  gold Basmalah, ayah medallion) are **present**, not deferred.

If a design decision is genuinely ambiguous, **ask before building** — do not
default to the plainest possible thing and call it minimalism.

## 📋 Definition of Done

- [ ] TypeScript clean, no `any`, no `@ts-ignore`
- [ ] Lint and format pass
- [ ] Tests written and passing (data logic always covered)
- [ ] No `console.log` left in committed code
- [ ] Verified in **light and dark**, small and large device
- [ ] Verified on a **real Android device** (Arabic rendering + scroll performance)
- [ ] Theme tokens used — no hardcoded colors, spacing on the 4pt scale
- [ ] Empty/loading/error states designed
- [ ] Lists virtualized and memoized; no dropped frames while scrolling
- [ ] Accessibility labels and contrast verified
- [ ] Quran text renders **exactly** as in the source data — no dropped diacritics, correct ayah numbering

---

## ⚠️ Handling Scripture — Above All

The Quran text is not ordinary application content. It must be reproduced **exactly**.

- **Never** hand-edit, "fix," normalize, or reformat the Arabic text of the source data files.
- **Never** substitute a character because a font seems to lack it — investigate the shaping instead.
- **Never** generate Quranic Arabic from memory to fill a gap. Every displayed character comes from the verified source files.
- Correct ayah numbering and surah boundaries are **correctness-critical**. Test them.
- If any rendering looks wrong (missing diacritic, clipped mark, misplaced medallion), treat it as a **P0 bug**, not a cosmetic issue.
