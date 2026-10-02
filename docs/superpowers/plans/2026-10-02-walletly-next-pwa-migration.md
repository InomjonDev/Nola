# Walletly Next.js PWA Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Walletly from Expo React Native to a responsive installable Next.js PWA while retaining Supabase data/auth logic.

**Architecture:** Preserve the Expo app in `expo-retired/`, move active source to Next.js App Router, and reuse domain utilities where they are platform-neutral. Browser providers own theme, language, auth, offline queue, and PWA service worker registration.

**Tech Stack:** Next.js, TypeScript, React, Supabase JS, Tailwind CSS, Lucide React, Web App Manifest, Service Worker.

## Global Constraints

- Keep Supabase as the backend with RLS policies.
- Rebuild UI for the web instead of copying React Native components.
- Preserve English, Russian, and Uzbek Latin localization dictionaries.
- Implement PWA installability, offline shell, static asset caching, and service worker notification click routing.
- Request notification permission only after a user action.
- Do not remove the existing Expo app until the Next.js version has been verified.

---

### Task 1: Project Runtime

- [x] Replace Expo package scripts with Next.js, typecheck, lint, test, build, and PWA validation scripts.
- [x] Add Next, Tailwind, Vercel, and TypeScript configuration.
- [x] Preserve the Expo implementation in `expo-retired/`.

### Task 2: Browser Data Layer

- [x] Reuse Walletly types, mappers, constants, i18n, formatting, and offline queue logic.
- [x] Replace native storage and Supabase auth helpers with browser-safe localStorage and PKCE OAuth helpers.
- [x] Keep local-first mutations and Supabase queue flushing.

### Task 3: Responsive PWA UI

- [x] Build the App Router pages, shell, mobile bottom navigation, desktop navigation, dashboard, expense form, history filters, insights, profile, settings, legal pages, and consent banner.
- [x] Add semantic CSS tokens with light/dark themes and 44px controls.

### Task 4: PWA and Deployment

- [x] Add manifest, service worker, install prompt, icon/screenshot requirements, PWA validator, Vercel config, `.env.example`, deployment docs, and migration note.
- [x] Document the Supabase Edge Function/cron path needed for reliable closed-app reminders.
