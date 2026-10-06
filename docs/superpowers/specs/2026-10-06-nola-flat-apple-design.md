# Nola flat Apple-inspired direction

Date: 2026-10-06
Status: Implemented from the user-approved paired Home concept, using Remix Icon as requested.

## Intent

An entirely flat personal spending app with familiar Apple-style typography, actions, and list structure. The user explicitly rejects depth effects. The existing white light theme, black dark theme, recent-spending priority, English/Russian/Uzbek support, and nineteen exclusions remain requirements.

This is an Apple-inspired web interface in the active Next.js PWA. Apply Apple foundations to its layout, accessibility, color, and writing; do not claim the browser interface uses UIKit or native SF Symbols.

## Review of the rejected direction

Rating: Needs work for the user's intended aesthetic. This is a craft judgment, not a claim that all panels or shadows violate Apple's guidelines.

- The many rounded fields, tinted containers, filled navigation selection, bordered moving selection pill, and remaining shadows give controls a layered appearance. Remove these treatments for this brief.
- Floating expense and goal sheets suggest depth. Replace them with opaque full-screen editing views on phones, with Cancel and Save in a plain toolbar. Use inline edit panes or dedicated pages on wider screens, with no dimmed scrim or floating panel.
- Thin duotone category glyphs and persistent trash icons make the list feel like a custom dashboard. Use small flat glyphs, prominent expense descriptions, secondary category labels, and a contextual edit/delete action instead of visible delete controls on every row. Keep accessible keyboard and touch alternatives to gestures.
- Recent-spending-first hierarchy, right-aligned complete amounts, language support, readable colors, and keyboard/focus behavior should survive the redesign.

## Flatness is a hard requirement

No shadows, inset shadows, gradients, glass, blur, translucent UI surfaces, raised cards, bevels, glossy highlights, floating pill bars, simulated light sources, or layered sheet effects. No scale, parallax, or slide animations implying that controls lift off the page.

Use spacing and one-pixel neutral separators to express groups. Content rows and navigation remain on the same white or black canvas. Color belongs to small glyphs and a few purposeful actions. Selection uses a clear checkmark or text/icon state with no raised plate behind it. Functional dialogs may require temporary focus isolation, but their appearance must be opaque and flat.

This is an explicit user exception to current HIG recommendations for Liquid Glass and elevated dark backgrounds. Keep the useful Apple principles without those materials. Preserve app-level Light/Dark/System preferences because the user requested them and the PWA already supports them.

## Proposed tokens

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#FFFFFF` | `#000000` |
| Primary text | `#111111` | `#F5F5F7` |
| Secondary text | `#636366` | `#AEAEB2` |
| Action blue | `#0064D9` | `#409CFF` |
| Small orange glyph | `#B45F00` | `#FF9F0A` |
| Small green glyph | `#16753D` | `#32D74B` |

These are proposed custom adaptive web colors, not hard-coded native system color APIs. Verify rendered text at 4.5:1 and essential glyphs at 3:1 or above in each theme. Continue to support increased contrast, reduced motion, and text enlargement.

Use the platform system sans-serif font. On Apple devices, the system font stack supplies the familiar Apple typography. Avoid thin weights. Proposed scale: toolbar title 17px semibold, content heading 22px semibold, primary transaction description 17px regular/medium, amounts 15–17px medium with tabular figures, secondary category/date text 13px regular. Use rem units for scaling. Keep 44px interaction areas and approximately 60px ordinary transaction rows; rows grow with larger text.

## Home and navigation

The Home screen's single job is to help someone recognize their recent spending quickly. Expense description/merchant is the primary text when a note exists; category is secondary. A small bright glyph identifies the category. The distinctive element is this clear, colorful spending list rather than a branded control system.

Compact layout:

```text
                  Nola                 Add

Recent spending                       All

Today
orange glyph  Coffee                  $4.50
              Food
              ----------------------------
blue glyph    Groceries               $34.80
              Shopping

Yesterday
green glyph   Bus fare                $12.00
              Transport

...more recent spending...

Small spending summary as plain text

Home       Activity      Insights     Profile
```

Use a plain bottom tab bar on the same canvas, with filled vector icons, short labels, a blue active icon/label, and no selection pill. Actions stay in the toolbar. On wide screens, use a plain navigation column beside the spending list; secondary summaries appear as text with separators, not cards.

## Other flows

- Expense and goal editing: opaque full-screen phone views, a short toolbar title, borderless Cancel/Save, and simple named form rows. No scrims or floating sheets.
- Settings/profile/management: plain grouped rows with disclosure chevrons and checkmarks. Appearance and language selectors use named rows instead of three raised segments.
- Insights: compact plain text summaries and simple solid chart marks on the canvas. No stat-card grid, decorative graph backgrounds, or large hero total.
- Authentication/onboarding/legal/error states: the same flat typography and action language, with existing behavior and all three languages preserved.
- Financial values stay complete and readable. Keep the fractional UZS display correction and the tested editing, offline, export, and savings behavior already implemented.

## HIG basis and trade-offs

Read the apple-design skill, cross-platform guidance, and ten relevant reference pages: accessibility, layout, typography, color, designing for iOS, lists and tables, buttons, tab bars, dark mode, and icons.

- `layout.md > Visual hierarchy`: "Order content by relative importance." This supports recent spending leading the screen.
- `lists-and-tables.md > Best practices`: "Prefer displaying text in a list or table." This supports a plain transaction list.
- `typography.md > Conveying hierarchy`: "Minimize the number of typefaces you use". Keep one system family and meaningful weight/size changes.
- `icons.md > Best practices`: "Create a recognizable, highly simplified design." Use a consistent flat vector family.
- `buttons.md > Best practices`: "Always include a press state for a custom button." Use a flat state cue without shadows or hover fading.
- `tab-bars.md > Best practices`: "Use a tab bar to support navigation, not to provide actions." Keep Add in the toolbar.
- `accessibility.md > Vision`: "Convey information with more than color alone." Retain readable labels and explicit selected states.

Apple's current material/depth guidance is intentionally overridden by the user's explicit aesthetic. The proposal preserves familiar hierarchy and control behavior without copying those effects.

## Review boundary

The user approved the paired light/dark Home concept and requested a different icon pack. Use Remix Icon: filled glyphs for content/navigation and simple line glyphs for toolbar actions, from one consistent family. Keep stored category/goal identifiers compatible. Apply the direction across every current screen, then rerun lint, typecheck, interaction, localization, contrast, and visual checks.
