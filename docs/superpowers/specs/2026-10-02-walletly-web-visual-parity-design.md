# Walletly Web Visual Parity

## Source of truth

The retained Expo implementation under `expo-retired/src-before-next` is the visual source of truth. The Next.js app keeps its web routing, Supabase data layer, offline persistence, and accessible browser interactions, while matching the Expo app's visual hierarchy and component language.

## Visual system

- Use the original lavender light palette and near-black dark palette from `src/theme/index.ts`.
- Keep the original type scale: 42px display, 36px amounts, 24px titles, 17px sections, 16px body, and compact 13px/11px utility text.
- Use 12px content radii, 16px controls, 28px sheets, and full-pill navigation and segmented controls.
- Keep the wallet card as the signature surface: a restrained blue-lavender gradient, Walletly mark, visibility control, month total, and weekly total.
- Use 44px minimum touch targets, visible keyboard focus, reduced-motion support, and semantic color tokens in both modes.

## Responsive composition

- Mobile keeps the Expo composition: greeting header, wallet card, four quick actions, recent activity, and a floating liquid-glass tab bar with a separate add button.
- Tablet expands content width without turning the mobile shell into a dense dashboard.
- Desktop replaces the floating tab bar with a quiet sidebar while preserving the same labels, icons, active state, and add action.
- Expense entry uses horizontal category choices, pill payment choices, a currency control, and a sheet-like custom-category flow instead of browser-default select styling.

## Verification

Verify light and dark modes at 375px, tablet, and desktop widths. Exercise the home, add/edit, history filters, insights, profile, settings, offline state, and PWA shell after the visual pass.
