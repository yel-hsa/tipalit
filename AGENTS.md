# tipalit

pnpm monorepo: a Vite web admin dashboard, an Expo mobile app, and a shared service package.

## Workspaces

- `apps/web` (`@tipalit/web`) - Vite + React + Tailwind CSS v4 admin dashboard for desktop
- `apps/mobile` (`@tipalit/mobile`) - Expo + React Native app for students, with a moderation tab for admins
- `packages/services` (`@tipalit/services`) - domain types, Firebase and mock adapters, seed content, shared helpers
- `functions` - Cloud Functions triggers and callables

## Development

- Web: `corepack pnpm dev` (Vite on `$PORT`, default 8443)
- Mobile: `corepack pnpm dev:mobile` (Metro; scan the QR code with Expo Go)
- Typecheck everything: `corepack pnpm typecheck`
- Tests: `corepack pnpm test` (shape tests + Firestore rules suite)

## Project structure

Start with the task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

Web:

- `apps/web/main.tsx` - entrypoint; imports `bootstrap.ts` before the app
- `apps/web/bootstrap.ts` - installs the browser platform and Firebase config into `@tipalit/services`
- `apps/web/App.tsx` - routing, app state, optimistic mutations, overlays
- `apps/web/index.css` - Tailwind CSS v4 import and global font wiring
- `apps/web/index.html` - Vite HTML shell loading `/main.tsx`
- `apps/web/vite.config.ts` - React, Tailwind CSS v4, and Figma Make plugins

Mobile:

- `apps/mobile/index.ts` - Expo entrypoint; registers `App`
- `apps/mobile/App.tsx` - session gate (sign in, onboarding, shell)
- `apps/mobile/src/bootstrap.ts` - installs the native platform and Firebase config
- `apps/mobile/src/session.tsx` - session and profile context
- `apps/mobile/src/AppShell.tsx` - tab bar and overlay routing
- `apps/mobile/src/theme.ts` - colors, radii, spacing

Shared:

- `packages/services/types.ts` - domain types and service interfaces (the adapter contract)
- `packages/services/platform.ts` - host-provided storage and timers
- `packages/services/index.ts` - adapter selection

## Dependencies

- Runtime: React 19, React DOM 19, React Native 0.88, Expo 58
- Styling: Tailwind CSS v4 on web; `StyleSheet` on mobile
- Build tooling: Vite 8, TypeScript 5.7 (web) / 6.0 (mobile), `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

Web uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin. `apps/web/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or theme customization in `apps/web/index.css`. No Tailwind config file or PostCSS config is needed.

Mobile uses React Native `StyleSheet` with values from `apps/mobile/src/theme.ts`. The Astra kit is web-only; mobile has its own primitives in `apps/mobile/src/components/ui.tsx`.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Import shared code from `@tipalit/services`, never by relative path across workspaces.
- Never read `import.meta.env`, `window`, or `localStorage` inside `packages/services`; install host values through `setPlatform` / `setFirebaseConfig` / `setDataAdapter`.
