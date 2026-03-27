# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `pnpm dev` (uses Turbopack)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Typecheck:** `pnpm typecheck`
- **Add UI component:** `npx shadcn@latest add <component>`

## Architecture

Next.js 16 App Router project with React 19, Tailwind CSS v4, and shadcn/ui (radix-nova style).

- `app/` — App Router pages and layouts. Uses React Server Components by default.
- `components/ui/` — shadcn/ui components (added via CLI, can be customized).
- `components/` — App-level shared components (e.g., `theme-provider.tsx` wraps `next-themes`).
- `lib/utils.ts` — `cn()` helper using `clsx` + `tailwind-merge`.
- `hooks/` — Custom React hooks.

**Path alias:** `@/*` maps to project root (e.g., `@/components/ui/button`).

## Key Conventions

- Package manager: **pnpm**
- Tailwind CSS v4 with PostCSS — styles and theme variables are in `app/globals.css`
- ESLint config: Next.js core-web-vitals + TypeScript rules (flat config in `eslint.config.mjs`)
- Prettier with `prettier-plugin-tailwindcss` for class sorting
- Fonts: Inter (sans) and Geist Mono loaded via `next/font/google`
