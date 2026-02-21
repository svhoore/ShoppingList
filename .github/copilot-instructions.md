# Our Shopping List — Copilot Instructions

## Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no config file)
- Firebase Firestore (real-time `onSnapshot` listeners, offline persistence enabled)
- vite-plugin-pwa (service worker + manifest, `registerType: 'prompt'`)
- React Router v7 for routing

## Architecture
- `src/lib/firebase.ts` — Firebase init, exports `db`
- `src/context/HouseholdContext.tsx` — React Context for household session (persisted in localStorage)
- `src/hooks/useHousehold.ts` — All Firestore CRUD operations via real-time listener
- `src/pages/` — JoinScreen, Dashboard, ListView
- `src/components/` — SwipeableItem, ConfirmDialog, UpdatePrompt

## Conventions
- iOS Reminders-style UI: circle checkboxes, swipe-to-delete, sticky bottom input bar
- Light mode only, Apple system font stack
- Custom Tailwind colors: `ios-bg`, `ios-text`, `ios-secondary`, `ios-blue`, `ios-red`, `ios-green`
- CSS transitions only (no animation library)
- Mobile-first, uses `safe-area-inset-bottom` for iPhone

## Data Model
Single Firestore collection `households` where each document ID is the household slug.
Each document contains a `lists[]` array of `{ listName, items[] }`.
Items have `{ id, text, completed, createdAt }`.

## Environment Variables
All prefixed with `VITE_FIREBASE_`. See `.env.example`.
