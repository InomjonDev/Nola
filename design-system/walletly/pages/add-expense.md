# Add Expense Page Overrides

> **PROJECT:** Walletly
> **Generated:** 2026-10-02 19:28:18
> **Page Type:** Dashboard / Data View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero headline, 2. Short description, 3. Benefit bullets (3 max), 4. CTA, 5. Footer

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Minimalist: Brand + white #FFFFFF + accent. Buttons: High contrast 7:1+. Text: Black/Dark grey

### Component Overrides

- Avoid: Ignore accessibility motion settings
- Avoid: Animate everything that moves
- Avoid: Use linear for UI transitions

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)
- Animation: Check prefers-reduced-motion media query
- Animation: Animate 1-2 key elements per view maximum
- Animation: Use ease-out for entering ease-in for exiting
- CTA Placement: Center, large CTA button
