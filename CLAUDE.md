# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build (also runs type-check and lint)
npm run start     # Serve the production build
npm run lint      # ESLint via next lint
npx tsc --noEmit  # Type-check without emitting
```

No test suite is configured.

## Architecture

This is a **Next.js 14 App Router** static single-page CV site for judoka Timothé François, branded as "IpponId". There is no database, no auth, and no API routes — all content is loaded from a single JSON file at build time.

### Data → Page flow

```
data/judoka.json
  └─► app/page.tsx          (imports JSON, generates OG metadata, iterates layout array)
        └─► lib/blockRegistry.tsx   (maps BlockName → render function)
              └─► components/blocks/*.tsx  (receive typed props, never import JSON directly)
```

The `data.layout` array in `judoka.json` controls which blocks appear and in what order. Adding a block to the page requires three coordinated changes:
1. Add the name to the `BlockName` union in [types/judoka.ts](types/judoka.ts)
2. Create the component in `components/blocks/`
3. Register it in [lib/blockRegistry.tsx](lib/blockRegistry.tsx) with a renderer that slices the needed fields from `JudokaData`

Components **never** import `judoka.json` directly — `blockRegistry.tsx` is the single coupling point between data and UI.

### Layout components

`components/layout/Header.tsx` — sticky nav with anchor links to each block's `id` (`#bio`, `#palmares`, etc.). Links correspond to the `id` attributes set in `app/page.tsx`'s block loop.

`components/layout/Footer.tsx` — social links (instagram, youtube) rendered conditionally if present in `data.social`.

### Design tokens

Tailwind is extended in [tailwind.config.ts](tailwind.config.ts) with a Material Design-inspired Judo Blue palette and medal accents:

- **Primary:** `#000666` (Judo Blue) / `primary-container: #1a237e`
- **Tertiary / gold accent:** `tertiary-container: #cba72f`
- **Medal colours:** `medal-gold: #FFD700`, `medal-silver: #C0C0C0`, `medal-bronze: #CD7F32`
- **Fonts:** `font-montserrat` (headlines, Black 900) / `font-inter` (body, labels)
- **Layout spacing:** `px-margin-mobile md:px-margin-desktop` (`16px` / `64px`) used consistently across all sections; max-width `max-w-container-max` (`1280px`)
- **Texture utility:** `.gi-texture-dark` — subtle radial dot pattern used as overlay on dark sections

Section headers follow a consistent pattern: a `w-1 h-8 bg-tertiary-container` accent bar + `font-montserrat text-headline-md font-bold text-primary uppercase` heading.

### Images

Static images live in `public/images/` and are referenced by path in `data/judoka.json`. All `<img>` tags use `next/image` (`<Image>`). Images not yet placed in `public/images/` will show the `bg-surface-container` / `bg-primary-container` background colour as a placeholder.

### Fonts

Loaded via `next/font/google` in [app/layout.tsx](app/layout.tsx) and exposed as CSS variables `--font-montserrat` and `--font-inter`, consumed by the Tailwind `font-montserrat` / `font-inter` utilities.
