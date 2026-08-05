# User Chart Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move user chart upload and management from the public gallery into a dedicated `/my-charts.html` page.

**Architecture:** Keep the existing single Vue application and lightweight pathname routing. `App.vue` selects either the public gallery or user workspace, while `HeaderBar.vue` owns login and workspace navigation. The build script creates an OSS-compatible `/my-charts.html`.

**Tech Stack:** Vue 3, TypeScript, Vite, static OSS deployment

---

### Task 1: Header account navigation

**Files:**
- Modify: `src/components/HeaderBar.vue`
- Modify: `src/style.css`

- [x] Add `user` prop and login/logout events.
- [x] Render provider login buttons for anonymous users.
- [x] Render profile, workspace link, and logout for authenticated users.
- [x] Verify mobile header remains usable.

### Task 2: Page-level route split

**Files:**
- Modify: `src/App.vue`
- Modify: `src/utils/routes.ts`

- [x] Add `isUserWorkspacePath()` route helper.
- [x] Render gallery-only content outside `/my-charts.html`.
- [x] Render `UserChartPanel` only inside `/my-charts.html`.
- [x] Avoid loading public chart data on the workspace page.
- [x] Synchronize pathname state on `popstate`.

### Task 3: Workspace presentation

**Files:**
- Modify: `src/components/UserChartPanel.vue`
- Modify: `src/style.css`

- [x] Add a compact workspace heading and return-to-gallery link.
- [x] Keep the existing OAuth and chart CRUD behaviors.
- [x] Use a dedicated workspace layout without affecting gallery spacing.

### Task 4: Static deployment route

**Files:**
- Create: `scripts/generate-static-routes.mjs`
- Modify: `package.json`

- [x] Copy built `dist/index.html` to `dist/my-charts.html`.
- [x] Run static route generation after every production build.
- [x] Verify the generated path exists.

### Task 5: Verification and release

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-user-chart-workspace-design.md`
- Modify: `docs/superpowers/plans/2026-08-06-user-chart-workspace.md`

- [x] Run `npm run build`.
- [x] Verify `dist/my-charts.html`.
- [x] Deploy the new entry HTML and hashed assets to OSS.
- [x] Verify `/` has no upload form.
- [x] Verify `/my-charts.html` has the workspace.
- [ ] Commit and push to `origin/main`.
