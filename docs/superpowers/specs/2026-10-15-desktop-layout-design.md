# Desktop workspace width and note controls

**Date:** 2026-10-15
**Status:** Design approved

## Goal

Use more of the desktop viewport on Nola's spending screen and remove both desktop note-composer buttons. Keep the existing mobile layout and note-entry controls.

## Current behavior

At desktop widths, `.app-shell` is capped at 1,480px and the Spending workspace has a labeled header button plus a floating pencil button. On wide screens this leaves excess horizontal space around the app.

## Design

- At widths of 1,024px and above, size `.app-shell` to 90vw with a 2,200px maximum. Preserve the existing desktop navigation and responsive workspace grid so columns expand with the available width.
- Hide both desktop note-composer controls: `.desktop-capture-action` and the `.workspace-compose-button` inside the desktop workspace dock. Keep the dock's search field.
- Preserve both mobile note-entry controls and all existing note routes and data behavior.

## User impact

Desktop users can browse and manage existing notes but will no longer have a direct note-composer button on Spending or Folders. Mobile note creation remains available. No note data or routes change.

## Acceptance checks

- At 1,280px, 1,600px, and 1,920px desktop viewport widths, the app shell uses approximately 90% of the viewport, capped at 2,200px.
- Neither desktop note-composer button is visible at widths of 1,024px or above.
- Mobile note-entry behavior remains unchanged below 1,024px.
- The sidebar and workspace columns remain readable without horizontal overflow.
