# Nola Design Reference: Luna-Inspired Direction

Date reviewed: 2026-10-06

> Superseded for app implementation by [Nola flat Apple-inspired design](superpowers/specs/2026-10-06-nola-flat-apple-design.md). The user approved compact recent spending, pure white/black themes, system typography, small bright Remix icons, and borderless blue actions. Purple accents, Inter, large summaries, and widespread pill controls below are historical reference only.

Reference site: [lunabudgeting.com](https://lunabudgeting.com/)

Pages reviewed:

- [Home](https://lunabudgeting.com/)
- [Pricing](https://lunabudgeting.com/pricing)
- [About](https://lunabudgeting.com/about)
- [Guides](https://lunabudgeting.com/resources)
- Mobile layout at 390 x 844
- Desktop layout at 1280 x 900

## Summary

Luna uses a bright, editorial product presentation built around three ideas:

1. Large, confident black typography establishes the personality immediately.
2. Real product screenshots do most of the explaining.
3. A vivid purple accent adds energy without turning the interface into a purple gradient system.

The result feels personal, indie, and unusually direct for a finance product. It is polished enough to feel trustworthy, but informal enough to feel made by a person rather than a financial institution.

For Nola, adopt the design language and composition rules, not Luna's exact logo, dog mascot, copy, screenshots, or brand assets.

## Visual Identity

### Base palette

- Page background: pure white.
- Primary ink: near-black. The inspected homepage heading resolves to `rgb(18, 18, 18)`.
- Supporting text: medium gray. The inspected homepage subtitle resolves to `rgb(94, 94, 94)`.
- Action accent: saturated violet-purple. The inspected primary button resolves to `rgb(94, 23, 235)`.
- Image wells: warm off-white surfaces that soften screenshots and editorial images.
- Supporting surfaces: very light neutral cards with faint borders or shadows.

The palette is intentionally small. Purple is used for action, links, active navigation, small labels, and occasional illustration details. It is not used as a page-wide background or as a large decorative gradient.

### Typography

- Primary typeface: Inter or a similar modern grotesk sans-serif.
- Homepage H1 at desktop: approximately 65px, 900 weight, 71.5px line height.
- Homepage H1 at mobile: approximately 33px, 900 weight, 36px line height.
- Supporting copy is gray, medium weight, and kept to a narrow readable measure.
- Section headings are large and sentence-like rather than formal marketing labels.
- Headings are allowed to wrap naturally. The line break is part of the composition.

Typography is the main brand device. There is no need for a complex display font, ornamental lettering, or many type styles.

### Shape language

- Primary actions are rounded pills with generous horizontal padding.
- Content cards use restrained rounding rather than sharp dashboard rectangles.
- Image wells and media panels use soft rounded corners.
- Pricing cards are lightly framed and separated with subtle elevation.
- The page avoids heavy borders, glass effects, hard shadows, and dense control chrome.

The shapes are friendly, but the page remains spacious and editorial rather than bubbly.

## Page Composition

### Global header

The desktop header is a wide, centered row with roughly 24px internal padding. It places the compact brand mark on the left, text navigation in the middle/right, and one filled primary action at the far right.

Navigation labels are short:

- Pricing
- About
- Guides
- Features
- Android
- Download Luna

The active page is indicated by the purple text color. The header is visually quiet and does not compete with the hero.

For Nola, use the Nola icon and wordmark at the left, keep navigation compact, and make the primary action the most visually distinct control. On the authenticated app, this should translate into a compact top bar rather than a marketing navigation row.

### Hero

The homepage hero is a two-column composition:

- Left: a very large headline, one short supporting paragraph, a purple download button, and a small reassurance line.
- Right: a large phone mockup showing the actual product.

The hero does not use a card around the text. White space is the container. The product screenshot is large enough to function as a visual promise, not a tiny decorative image.

The message is short and emotionally specific: the product should be something the user wants to open, not merely something they should use.

For Nola, the equivalent hero message should emphasize a calmer relationship with everyday money, while showing the real Nola dashboard or add-expense flow at useful scale.

### Feature sections

The homepage groups features into two editorial bands:

- A friendly basics section that explains the daily habit: expense tracking, widgets, reminders.
- A capability section that explains optional depth: budgeting, income tracking, accounts, reports, recurring expenses, customization.

Each section begins with a large heading and a one-sentence explanation, followed by a three-column grid of visual cards on desktop. Each card contains a real app screenshot in a warm off-white image well and a short label beneath it.

The content hierarchy is deliberately simple: section heading, sentence, visual proof, label. There are no long feature paragraphs or dense comparison tables on the homepage.

For Nola, group screens by user intent rather than by technical module:

- Start with: Add an expense, today, recent history.
- Go deeper with: budgets, savings goals, income, accounts, insights.
- Build trust with: privacy, offline use, export, and localization.

### Personal story section

The About page and homepage include a wide, lightly tinted personal note from the creator. It uses first-person writing, a plainspoken origin story, and small identity markers for the creator and product mascot.

This section is important to the design because it explains why the product exists. It turns a finance tool into a personal project with a point of view.

For Nola, use the same honesty without copying Luna's story. The content should explain the problem Nola is trying to make calmer: tracking spending, staying aware, and keeping control without bank-linking pressure or financial shame.

### Social proof and behind-the-scenes content

The site treats the creator's YouTube and Instagram presence as part of the product story. Each channel is shown in a generous, rounded media card with recognizable platform branding, a clear open action, and a collage of real content.

This is not a conventional testimonial section. It is build-in-public proof: the user can see the person behind the app and follow the work.

For Nola, this is optional. If used, it should be a single creator or product-story section, not a noisy social feed.

### Pricing and FAQ

The pricing page keeps the same visual system:

- Centered oversized title.
- Short gray explanation below it.
- Three simple pricing cards in one row on desktop.
- Checkmark feature lists with generous vertical rhythm.
- A large FAQ heading and sparse accordion rows below.

The pricing cards are easy to compare because the visual treatment is intentionally restrained. The page does not use a dramatic highlighted card, complex gradients, or a dense feature matrix.

### Guides and editorial content

The guides page extends the same visual language into content marketing:

- A large rounded feature block with a short label, large heading, copy, CTA, and a single editorial image.
- A practical first-read card split between a large image and a text panel.
- Three colored category cards with small numbered markers.
- A responsive grid of article cards with image, title, description, and a small purple read action.
- A full-width purple closing CTA.

The page feels like a magazine index rather than a documentation dashboard. Images are warm, colorful, and concrete: cafes, rooms, markets, and everyday objects.

For Nola, use this pattern for help and budgeting education pages, while keeping the actual finance workspace denser and more task-focused.

## Responsive Behavior

At 390px wide, Luna changes from a two-column presentation to a single vertical flow:

- The desktop navigation collapses into a compact header with the logo and a small menu control.
- The hero text is centered and constrained to roughly 280px.
- The phone screenshot moves below the CTA.
- Feature cards stack one per row.
- Footer columns stack into a narrow reading order.
- Large headings are reduced to approximately 33px without losing their heavy weight.

The mobile page remains generous rather than compressed. Images still receive large warm wells, and the primary CTA remains easy to tap.

Nola should use the same principle: change the composition at the breakpoint instead of merely shrinking desktop layouts. Preserve 44px or larger touch targets, clear vertical rhythm, and readable copy in English, Russian, and Uzbek Latin.

## Interaction and Motion

The visual system is mostly static and confident. The important interaction cues are:

- Filled purple pill buttons for primary actions.
- Purple active navigation and links.
- Clickable visual feature cards.
- Accordion rows for FAQs.
- External content cards with explicit open actions.

Motion should support hierarchy rather than decorate it. For Nola, use short opacity/translate transitions for section entry, pressed-state scale or color feedback on pills, and gentle expansion for accordions. Avoid continuous animation, parallax, or decorative floating effects.

## Design Principles To Carry Into Nola

### 1. Lead with the feeling of use

Nola should describe the experience in human terms: knowing where money went, feeling less anxious, and making the next decision easier. Avoid leading with database-like feature names.

### 2. Show the product directly

Use real Nola screen captures or carefully framed screen previews. A finance app is easier to trust when the interface is visible and legible.

### 3. Keep one strong accent

Use the Nola icon's deep plum and warm ivory as the core identity, then choose one vivid purple or plum action color. Keep the rest of the interface white, near-black, gray, and warm off-white.

### 4. Use large type and fewer words

A short, heavy heading should do more work than a paragraph of product claims. Make the supporting copy concrete and conversational.

### 5. Make depth optional

Luna's "simple, but powerful" structure is a useful model for Nola. Let the first view feel calm and focused, while advanced tools such as recurring transactions, category budgets, accounts, exports, and insights remain discoverable rather than overwhelming.

### 6. Preserve Nola's product responsibilities

The redesign must keep Nola's existing strengths: local-first behavior, offline recovery, authentication, multilingual UI, light and dark themes, accessible controls, exports, and safe account deletion. Luna's public site is light and presentation-focused; Nola's working product still needs operational density and dark-mode parity.

## Nola Component Translation

| Luna pattern | Nola adaptation |
| --- | --- |
| Large editorial hero | Home dashboard header with current balance, spending summary, and one primary add-expense action |
| Phone screenshot | Real Nola screen preview or focused dashboard composition |
| Basics feature grid | Quick actions: add expense, history, recurring item, payment method |
| Powerful feature grid | Budgets, savings goals, income, accounts, insights, export |
| Purple pill CTA | Add expense, save, continue, or download/export primary actions |
| Warm image well | Soft neutral surface behind charts, goal progress, or empty-state illustrations |
| Personal story block | Privacy/local-first explanation and a short Nola origin statement |
| Pricing FAQ accordion | Settings/help rows and expandable explanations |
| Guide card grid | Public budgeting guides and contextual help articles |

## Guardrails

- Do not copy Luna's logo, dog mascot, exact purple, screenshots, wording, or layout pixel-for-pixel.
- Do not turn Nola into a marketing landing page inside the authenticated workspace.
- Do not hide financial status behind oversized decorative cards.
- Do not use purple gradients, glassmorphism, or noisy dashboard decoration as substitutes for hierarchy.
- Do not let large headings or decorative media reduce form clarity, localization space, or touch-target size.
- Keep data-dense views scannable with compact rows and meaningful grouping.
- Keep visual previews and editorial sections separate from the transaction-editing workflow.

## Recommended First Pass

1. Establish Nola tokens: white background, near-black ink, gray secondary text, deep plum identity, one purple action color, warm off-white surfaces, restrained rounding.
2. Rework the home screen around a large, calm summary and a clear add-expense action.
3. Rebuild the feature areas as intent-based groups with real Nola screen compositions.
4. Apply the same typography, CTA, card, and spacing system to history, insights, settings, and public guides.
5. Verify mobile at 375px and 390px, tablet at 768px, and desktop at 1280px in both light and dark mode.
