# Typography rules

Native only — iOS and Android, phone and tablet. Everything below is enforced by convention, not by
a component: there is no local `Text` wrapper to route through, and there must not be one. See
[CLAUDE.md §3](../CLAUDE.md#3-the-ui) for the wider UI rules this sits under.

## Rules

1. Render every string with `Text` from `react-native-paper`, passing a `variant`.
2. Never write `fontSize`, `lineHeight`, `fontWeight` or `letterSpacing` at a call site. Change
   `src/themes.js` — which today carries no `fonts` key at all, so changing a size means adding one.
   §2.
3. Never import `Text` from `react-native`.
4. Use only these six variants: `headlineMedium`, `headlineSmall`, `titleMedium`, `bodyMedium`,
   `bodySmall`, `labelMedium`. Adding a seventh is a decision — write down what it is for.
5. Never pass `variant` to `Button`, `Chip`, `Dialog.Title` or `Appbar.Content`; they choose their
   own. Do pass `titleVariant="titleMedium"` to `Card.Title`, whose default is body type.
6. Never swap a variant on a breakpoint or a device check.
7. Set `maxFontSizeMultiplier={1.3}` on table and list-row text. Never cap body text, forms,
   dialogs, or error messages.

The rest of this file is why. Read it before overriding a rule, not before following one.

**Contents**

1. [The one rule](#1-the-one-rule)
2. [The variants you type](#2-the-variants-you-type)
3. [The variants Paper picks for you](#3-the-variants-paper-picks-for-you)
4. [Text does not scale with screen width](#4-text-does-not-scale-with-screen-width)
5. [Capping the OS font scale](#5-capping-the-os-font-scale)
6. [What is deliberately not here](#6-what-is-deliberately-not-here)

---

## 1. The one rule

**Every string renders through `Text` from `react-native-paper` with a `variant`, and the theme is
the only place a size is ever defined.**

Paper's `Text` reads `theme.fonts[variant]` off `PaperProvider`'s context
(`react-native-paper/lib/commonjs/components/Typography/Text.js`), so `src/themes.js` is already the
single choke point every piece of text passes through. Nothing needs building to get that property,
and it reaches further than a hand-rolled wrapper would — `Button`, `Card.Title`, `Appbar.Content`
and `HelperText` resolve through the same theme.

Which gives three prohibitions:

- **No local `Text` component.** A second text primitive means two right answers and a choice at
  every call site.
- **No inline `fontSize`, `lineHeight`, `fontWeight`, or `letterSpacing`.** If a size is needed that
  no variant provides, the variant list is wrong — fix the theme, not the call site.
- **No `Text` from `react-native`.** It bypasses the theme entirely and renders unstyled.

Changing the scale globally is `configureFonts` in `src/themes.js`, applied once. Every Paper
component follows on the next render.

---

## 2. The variants you type

MD3 ships fifteen variants because it spans watch to desktop. On one platform several land on the
same pixel size and differ only in weight and tracking, which is where guesswork comes from — three
variants at 14pt means three plausible answers for one piece of text. Pick one per size:

| Variant | Size / leading | Use |
| --- | --- | --- |
| `headlineMedium` | 28 / 36 | the title of a screen that is *only* that title and its actions — sign-in, onboarding, a full-screen blocking state. One per screen, and that screen carries no other content |
| `headlineSmall` | 24 / 32 | a screen title sitting above real content where there is no Appbar, empty states, a dashboard's single big number |
| `titleMedium` | 16 / 24 | list-item primary text, card titles, product names, section headers — the workhorse |
| `bodyMedium` | 14 / 20 | default body, field values, descriptions |
| `bodySmall` | 12 / 16 | secondary data — SKUs, counts, timestamps |
| `labelMedium` | 12 / 16 | chips, badges, table column headers, overlines |

The effective scale is **28 / 24 / 16 / 14 / 12**. Five sizes, with 12 carrying two roles:
`bodySmall` for data, `labelMedium` for labels. They are the same size and differ by weight and a
0.5 letter-spacing, which is exactly what makes a column header read as a header rather than as
another row of data.

The two headline sizes are the only pair whose split is about the *screen*, not the text. 28 is for a
screen with nothing to compete with — it is the whole screen's subject. 24 is for a title that has
content underneath it and must not shout over it. If a screen has a list, a form, or a card on it,
its title is `headlineSmall`.

### Where those sizes actually come from

**Not from `src/themes.js` yet.** It spreads `MD3LightTheme` / `MD3DarkTheme` and overrides `colors`
only, so every size above is Paper's own MD3 default reaching the app untouched. There is nothing in
that file to edit today.

Rule 2 still holds — it says where a size change *goes*, not that one has already been made. To
change one, add a `fonts` key alongside `colors` in both theme objects:

```js
import { configureFonts } from 'react-native-paper';

// Keyed by variant. Each entry is merged over that variant's MD3 default, so naming only the
// property you are changing keeps fontFamily, fontWeight and letterSpacing (fonts.js:70-75).
const fonts = configureFonts({ config: { headlineMedium: { fontSize: 26 } } });

export const LightTheme = { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, ...lightColors }, fonts };
```

**The trap is a config with no variant key.** `configureFonts` checks whether every value in
`config` is a non-object (`fonts.js:64`) and, if so, treats the whole thing as a *flat* config and
merges it into **all fifteen variants**. So `config: { fontSize: 26 }` — one level shallower than the
example — silently resizes the entire typescale. Always key by variant.

Both themes need the key: `LightTheme` and `DarkTheme` are separate objects, and `fonts` on one does
not reach the other.

### Not in the list, and why

| Cut | Reason |
| --- | --- |
| `displayLarge` / `Medium` / `Small` (57/45/36) | Marketing hero type. An app screen has no hero |
| `headlineLarge` (32) | Sits between `headlineMedium` and the display sizes and does the job of neither. `Appbar mode="large"` already reaches `headlineMedium` on its own |
| `titleSmall` (14) | Collides with `bodyMedium`; `labelLarge` already occupies 14 via `Button` |
| `bodyLarge` (16) | Collides with `titleMedium`. Use `titleMedium` for emphasis, `bodyMedium` for text |
| `labelSmall` (11) | Too small to read at arm's length. 12 already covers dense |

Adding one back is a decision, not a default. Write down what it is for.

---

## 3. The variants Paper picks for you

Verified against `react-native-paper@5.15.3`. Do not pass a `variant` to these — they choose one, and
overriding it breaks the component's own spacing:

| Component | Variant | Source |
| --- | --- | --- |
| `Button`, `Chip` | `labelLarge` | `Button/Button.js:163`, `Chip/Chip.js:154` |
| `Dialog.Title` | `headlineSmall` | `Dialog/DialogTitle.js:58` |
| `Appbar.Content` | `titleLarge` / `headlineSmall` / `headlineMedium` by `mode` | `Appbar/utils.js:72-75` |

Two that need attention:

**`Card.Title` defaults to `bodyLarge` for the title and `bodyMedium` for the subtitle**
(`Card/CardTitle.js:41,46`) — body type for a heading. Pass `titleVariant="titleMedium"` so a card
title reads as a title.

**`List.Item` uses no variant at all.** It reads a raw `fontSize` out of its own stylesheet, so its
text sits outside the theme. Nothing to fix, but a list row will not follow a scale change made in
`src/themes.js` — restyle it through `titleStyle` / `descriptionStyle` if it drifts.

---

## 4. Text does not scale with screen width

**Never swap a variant on a breakpoint.** No `isTablet ? 'headlineSmall' : 'titleMedium'`.

Reading distance barely changes between a phone and a handheld tablet — both sit around 30-40 cm — so
physical text size should stay constant. What changes on a tablet is how much fits and how long the
lines get: 14pt across 400dp gives roughly 45 characters per line, near optimal; the same 14pt across
1000dp gives 110, which is unreadable because of the measure, not the size.

For a data-heavy app it is worse than neutral. A tablet's value is more rows visible at once. Scale
the type up with the viewport and the extra screen is spent making each row taller, so the larger
device shows less.

The tablet exception is real but a breakpoint cannot serve it: a tablet on a counter or mounted on a
cart is read at 60-70 cm, and a tablet in someone's hands is not — **viewport width cannot tell you
reading distance.** The lever for that is user preference, and it already exists. React Native honors
the OS accessibility text setting on both platforms and scales `lineHeight` with it, so MD3's
absolute leading stays proportional:

- iOS — `RCTTextAttributes.mm:141`, `lineHeight * self.effectiveFontSizeMultiplier`
- Android — `TextAttributes.kt`, `effectiveLineHeight` converts through `toPixelFromSP()`, which
  applies `fontScale`; `letterSpacing` too

So a user who needs larger text sets it once, system-wide, and every Paper component follows. Nothing
to build.

**What does respond to width:** column count (single pane, then list-detail), gutters and padding,
maximum measure on prose, row density, how many table columns are visible, and touch target sizing.
That is where the tablet layout work belongs.

---

## 5. Capping the OS font scale

Dense data and a 200% accessibility setting fight each other — a table at that scale is unusable.

Paper already exposes React Native's `maxFontSizeMultiplier` on the components that matter, including
separately for a list row's two lines (`titleMaxFontSizeMultiplier`, `descriptionMaxFontSizeMultiplier`)
and on `Card.Title`.

The division:

- **Cap around `1.3`** on tables, list rows, and anything laid out in columns — content that is
  scanned.
- **Never cap** body text, dialogs, form fields, or error messages — content that is read, and where
  the accessibility setting exists to do its job.

A cap is a layout decision. Applying one globally defeats the setting entirely.

---

## 6. What is deliberately not here

Recorded so it is not re-litigated.

**No port of Bluesky's ALF typography system.** It was evaluated. Its central mechanism —
`normalizeTextStyles()` treating `lineHeight` as a ratio of the already-scaled font size — exists
because that codebase applies a second, JS-side scale multiplier that touches only `fontSize`, so its
leading would desync without the ratio math. There is no second scale axis here, and React Native
already scales absolute `lineHeight` correctly (§4), so MD3's absolute leading is already right. The
rest of that system is web machinery: the `!IS_NATIVE` lineHeight fallback, the
`numberOfLines={1}` react-native-web overflow fix, `-webkit-text-size-adjust`, and web-only `role`
attributes on heading elements. None of it applies.

**No in-app text-size control.** It is the correct shape for one — three steps mapped over the
typescale via `configureFonts`, held in state, passed to `PaperProvider` — and roughly eight lines
when it is wanted. It is not wanted until a settings screen exists to expose it, and the OS setting
already covers the need.

**No emoji-splitting.** Bluesky splits emoji into a nested `Text` forced to the system font because
Inter carries no emoji glyphs. This project loads no custom typeface, and the system font has emoji.
Revisit only when a brand font is added.
