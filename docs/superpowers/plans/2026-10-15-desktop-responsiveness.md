# Desktop Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Nola's desktop workspace to 90vw (up to 2,200px) and remove both desktop note-composer buttons without changing mobile note entry.

**Architecture:** Keep the existing Next.js layout and CSS grid. Change only the desktop `.app-shell` sizing and visibility of `.desktop-capture-action` and `.workspace-compose-button`; leave mobile breakpoints and underlying note behavior intact.

**Tech Stack:** Next.js App Router, React, CSS in `src/app/globals.css`.

## Global Constraints

- At viewport widths of 1,024px and above, `.app-shell` uses 90vw with a 2,200px maximum.
- At widths of 1,024px and above, both desktop note-composer controls are hidden; the search field remains.
- Below 1,024px, mobile note-entry behavior remains unchanged.
- Do not change note data, routes, or local-first/offline behavior.

---

### Task 1: Widen the desktop shell and remove its note buttons

**Files:**
- Modify: `src/app/globals.css` (desktop `@media (min-width: 1024px)` block near line 2549)

**Interfaces:**
- Consumes: existing `.app-shell`, `.desktop-capture-action`, and `.workspace-compose-button` styles.
- Produces: a desktop shell sized to the approved viewport width; desktop note controls are not visible or keyboard-focusable.

- [x] **Step 1: Update only the desktop media rule**

```css
@media (min-width: 1024px) {
  .app-shell {
    width: 90vw;
    max-width: 2200px;
  }

  .desktop-capture-action,
  .workspace-compose-button {
    display: none;
  }
}
```

Keep the existing desktop grid columns, gaps, and padding declarations in this same media rule. The mobile media rules remain unchanged.

- [x] **Step 2: Run required static checks**

Run `npm run lint` and `npm run typecheck` from the repository root. Expected: both exit successfully.

- [x] **Step 3: Verify responsive behavior in the browser**

At desktop widths 1,280px, 1,600px, and 1,920px, confirm the shell measures 90vw (under the 2,200px cap), the workspace has no horizontal overflow, and both note controls are hidden. At 390px, confirm the existing floating pencil remains available.

- [x] **Step 4: Check the final diff**

Run `git diff --check` and confirm only the desktop CSS block changed for implementation.
