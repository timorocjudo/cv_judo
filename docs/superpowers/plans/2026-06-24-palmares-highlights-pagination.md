# Palmarès Highlights + Pagination par saison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bloc Highlights dans le Hero et une pagination par saison dans PalmaresBlock sur la page profil publique.

**Architecture:** `lib/highlightsService.ts` expose une fonction pure `getBestResults` ; `HeroBlock` reçoit un nouveau prop `palmares` via `blockRegistry` et affiche jusqu'à 3 highlights ; `PalmaresBlock` passe en client component pour gérer un état local d'expansion des saisons précédentes.

**Tech Stack:** Next.js 14 App Router, React (useState, Framer Motion), TypeScript, Vitest

## Global Constraints

- Aucun changement dans le dashboard (`app/dashboard/[profileId]/palmares/page.tsx`)
- Les highlights n'apparaissent pas dans le dashboard
- `PalmaresStatsCounter` reçoit toujours le palmarès complet (toutes saisons)
- Tous les composants respectent `useReducedMotion` pour les animations
- Styles : Tailwind uniquement, pas de CSS inline hormis les couleurs dynamiques de médaille (radial-gradient)
- Test runner : `npx vitest run` (alias `npm run test`)

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `lib/highlightsService.ts` | Créer | Fonction `getBestResults` — sélection et tri des meilleurs résultats |
| `__tests__/unit/highlightsService.test.ts` | Créer | 6 tests Vitest sur `getBestResults` |
| `lib/blockRegistry.tsx` | Modifier | Passer `data.palmares` au renderer de `HeroBlock` |
| `components/blocks/HeroBlock.tsx` | Modifier | Prop `palmares`, section Highlights avec animation stagger |
| `components/blocks/PalmaresBlock.tsx` | Modifier | `'use client'`, `useState`, pagination par saison, note "sur X saisons" |

---

## Task 1: lib/highlightsService.ts (TDD)

**Files:**
- Create: `lib/highlightsService.ts`
- Create: `__tests__/unit/highlightsService.test.ts`

**Interfaces:**
- Produces: `getBestResults(palmares: PalmaresEntry[], count?: number): PalmaresEntry[]`

---

- [ ] **Step 1 : Écrire les tests (fichier complet)**

Créer `__tests__/unit/highlightsService.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { getBestResults } from '@/lib/highlightsService'
import type { PalmaresEntry } from '@/types/judoka'

function makeEntry(overrides: Partial<PalmaresEntry> = {}): PalmaresEntry {
  return {
    date: '2024-01-01',
    competition: 'Championnat test',
    result: 'Champion',
    category: '-73kg',
    level: 'National Individuel',
    medal: 'gold',
    ...overrides,
  }
}

describe('getBestResults', () => {
  it('palmarès vide → tableau vide', () => {
    expect(getBestResults([])).toEqual([])
  })

  it('un seul résultat → retourné seul', () => {
    const entry = makeEntry({ level: 'Régional', medal: 'gold' })
    expect(getBestResults([entry])).toEqual([entry])
  })

  it('plusieurs résultats de même niveau → le plus récent en premier', () => {
    const older = makeEntry({ date: '2022-01-01', level: 'Régional', medal: 'gold' })
    const newer = makeEntry({ date: '2024-01-01', level: 'Régional', medal: 'gold' })
    const results = getBestResults([older, newer], 1)
    expect(results[0]).toBe(newer)
  })

  it('un national parmi des régionaux → le national en #1', () => {
    const regional = makeEntry({ level: 'Régional', medal: 'gold' })
    const national = makeEntry({ level: 'National', medal: 'gold' })
    const results = getBestResults([regional, national], 1)
    expect(results[0]).toBe(national)
  })

  it('plus de 3 résultats → exactement 3 retournés', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ date: `2024-0${i + 1}-01`, level: 'Régional', medal: 'gold' })
    )
    expect(getBestResults(entries)).toHaveLength(3)
  })

  it('uniquement des départementaux → 3 retournés sans erreur', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ date: `2024-0${i + 1}-01`, level: 'Départemental', medal: 'gold' })
    )
    const results = getBestResults(entries)
    expect(results).toHaveLength(3)
    results.forEach((r) => expect(r.level).toBe('Départemental'))
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
npx vitest run __tests__/unit/highlightsService.test.ts
```

Attendu : erreur `Cannot find module '@/lib/highlightsService'`

- [ ] **Step 3 : Implémenter lib/highlightsService.ts**

Créer `lib/highlightsService.ts` :

```ts
import type { PalmaresEntry } from '@/types/judoka'

// Level detection uses the `level` field directly.
// Keyword detection on competition title is a future improvement (not implemented in v1).
type LevelCategory = 'national-individuel' | 'national' | 'régional' | 'départemental' | 'other'

function detectLevel(level: string): LevelCategory {
  const l = level.toLowerCase()
  if (l.includes('national')) {
    return l.includes('individuel') ? 'national-individuel' : 'national'
  }
  if (l.includes('régional') || l.includes('regional') || l.includes('région') || l.includes('region')) {
    return 'régional'
  }
  if (
    l.includes('départemental') || l.includes('departemental') ||
    l.includes('département') || l.includes('departement')
  ) {
    return 'départemental'
  }
  return 'other'
}

// Lower score = higher priority.
// 1 — National Individuel + or
// 2 — National (tout type) + or
// 3 — National (tout type) + autre podium
// 4 — Régional + or
// 5 — Régional + autre podium
// 6 — Départemental + or
// 7 — tout le reste
function entryPriority(entry: PalmaresEntry): number {
  const lvl = detectLevel(entry.level)
  const isGold = entry.medal === 'gold'
  const hasPodium = entry.medal != null

  if (lvl === 'national-individuel' && isGold) return 1
  if (lvl === 'national' && isGold) return 2
  if ((lvl === 'national-individuel' || lvl === 'national') && hasPodium) return 3
  if (lvl === 'régional' && isGold) return 4
  if (lvl === 'régional' && hasPodium) return 5
  if (lvl === 'départemental' && isGold) return 6
  return 7
}

export function getBestResults(palmares: PalmaresEntry[], count = 3): PalmaresEntry[] {
  if (palmares.length === 0) return []
  return [...palmares]
    .sort((a, b) => {
      const diff = entryPriority(a) - entryPriority(b)
      if (diff !== 0) return diff
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, count)
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
npx vitest run __tests__/unit/highlightsService.test.ts
```

Attendu : `6 passed`

- [ ] **Step 5 : Commit**

```bash
git add lib/highlightsService.ts __tests__/unit/highlightsService.test.ts
git commit -m "feat: getBestResults — sélection des meilleurs résultats du palmarès"
```

---

## Task 2: HeroBlock — Section Highlights

**Files:**
- Modify: `components/blocks/HeroBlock.tsx`
- Modify: `lib/blockRegistry.tsx`

**Interfaces:**
- Consumes: `getBestResults(palmares: PalmaresEntry[], count?: number): PalmaresEntry[]` from Task 1
- `HeroBlockProps` ajoute `palmares: PalmaresEntry[]`

---

- [ ] **Step 1 : Mettre à jour lib/blockRegistry.tsx**

Dans `lib/blockRegistry.tsx`, modifier le renderer `hero` pour passer `data.palmares` :

```ts
// Avant :
hero: (data) => <HeroBlock identity={data.identity} social={data.social} slug={data.slug} visibility={data.visibility} />,

// Après :
hero: (data) => <HeroBlock identity={data.identity} social={data.social} slug={data.slug} visibility={data.visibility} palmares={data.palmares} />,
```

- [ ] **Step 2 : Mettre à jour HeroBlock — props, imports, constantes**

En haut de `components/blocks/HeroBlock.tsx`, modifier l'import des types et ajouter les imports du service :

```ts
// Modifier la ligne import existante :
import type { Identity, Social, PalmaresEntry, MedalType } from '@/types/judoka'
// Ajouter après les imports existants :
import { getBestResults } from '@/lib/highlightsService'
```

Ajouter les constantes de médaille pour les highlights AVANT la définition de `socialIcons` (ou juste après, dans le scope du module) :

```ts
const MEDAL_HIGHLIGHT: Record<NonNullable<MedalType>, { bg: string; text: string; rank: string }> = {
  gold:   { bg: 'radial-gradient(circle at 35% 35%, #FFD700, #cba72f)', text: '#FFD700', rank: '1' },
  silver: { bg: 'radial-gradient(circle at 35% 35%, #C0C0C0, #767683)', text: '#C0C0C0', rank: '2' },
  bronze: { bg: 'radial-gradient(circle at 35% 35%, #CD7F32, #8d6e63)', text: '#CD7F32', rank: '3' },
}
const HIGHLIGHT_DEFAULT = {
  bg: 'radial-gradient(circle at 35% 35%, #1a237e, #000666)',
  text: 'white',
  rank: '',
}
```

- [ ] **Step 3 : Mettre à jour HeroBlockProps et le corps du composant**

Modifier l'interface `HeroBlockProps` :

```ts
interface HeroBlockProps {
  identity: Identity
  social: Social
  slug: string
  visibility: 'draft' | 'private' | 'public'
  palmares: PalmaresEntry[]   // ← nouveau
}
```

Modifier la signature du composant pour déstructurer `palmares` :

```ts
export default function HeroBlock({ identity, social, slug, visibility, palmares }: HeroBlockProps) {
```

Ajouter au début du corps du composant (après la ligne `const belt = ...`) :

```ts
const highlights = getBestResults(palmares)
```

Ajouter le calcul du delay des highlights **après** les variables `badges` et `badgeMotion` existantes :

```ts
const highlightBaseDelay = totalNameWords * 0.08 + 0.06 + badges.length * 0.06 + 0.10
```

- [ ] **Step 4 : Insérer la section Highlights dans le JSX**

Dans le JSX de HeroBlock, localiser le bloc des badges animés (`{/* Animated badges */}`). Ajouter la section Highlights **immédiatement après** ce bloc (avant `{/* Social links */}`) :

```tsx
{/* Highlights */}
{highlights.length > 0 && (
  <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
    {highlights.map((entry, i) => {
      const m = entry.medal ? MEDAL_HIGHLIGHT[entry.medal] : HIGHLIGHT_DEFAULT
      const motionProps = shouldReduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.25, ease: 'easeOut' as const, delay: highlightBaseDelay + i * 0.08 },
          }
      return (
        <motion.div
          key={`hl-${i}`}
          className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 border border-white/20"
          {...motionProps}
        >
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-montserrat text-sm font-black text-white shadow-md"
            style={{ background: m.bg }}
            aria-hidden="true"
          >
            {m.rank}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-montserrat text-sm font-black leading-tight" style={{ color: m.text }}>
              {entry.result}
            </p>
            <p className="font-inter text-xs text-white/60 mt-0.5 truncate">
              {entry.competition} · {new Date(entry.date).getFullYear()}
            </p>
          </div>
          {entry.category && (
            <span className="flex-shrink-0 self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20 text-white/50">
              {entry.category}
            </span>
          )}
        </motion.div>
      )
    })}
  </div>
)}
```

- [ ] **Step 5 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 6 : Commit**

```bash
git add components/blocks/HeroBlock.tsx lib/blockRegistry.tsx
git commit -m "feat: bloc Highlights dans le HeroBlock — 3 meilleurs résultats animés"
```

---

## Task 3: PalmaresBlock — Pagination par saison

**Files:**
- Modify: `components/blocks/PalmaresBlock.tsx`

**Interfaces:**
- Consumes: `PalmaresBlock({ palmares, birthDate, slug })` — inchangé
- État interne : `expanded: boolean`, `setExpanded`

---

- [ ] **Step 1 : Passer en client component et ajouter useState**

En haut de `components/blocks/PalmaresBlock.tsx`, ajouter la directive **sur la première ligne** du fichier :

```ts
'use client'
```

Modifier l'import React existant (`import type { PalmaresEntry, MedalType } from '@/types/judoka'` — pas d'import React explicite actuellement). Ajouter l'import useState :

```ts
import { useState } from 'react'
```

- [ ] **Step 2 : Ajouter l'état et les calculs de pagination**

Au début du corps de `PalmaresBlock`, après les calculs de `bySeason` et `seasons` existants, ajouter :

```ts
const [expanded, setExpanded] = useState(false)

const currentSeason = seasons[0]
const previousSeasons = seasons.slice(1)
const hiddenCount = previousSeasons.reduce((sum, s) => sum + bySeason[s].length, 0)
const hasPreviousSeasons = previousSeasons.length > 0
```

- [ ] **Step 3 : Mettre à jour le rendu — saison courante + saisons précédentes**

Remplacer le bloc `<div className="space-y-10">` et son contenu par la version paginée.

Remplacer ceci :

```tsx
<div className="space-y-10">
  {seasons.map((startYear) => (
    <div key={startYear}>
      {/* Season header */}
      ...
    </div>
  ))}
</div>
```

Par ceci (garder le contenu interne des cartes de résultat strictement identique — seule la structure de la liste change) :

```tsx
<div className="space-y-10">
  {/* Saison courante — toujours affichée */}
  {currentSeason !== undefined && (
    <SeasonGroup
      startYear={currentSeason}
      entries={bySeason[currentSeason]}
      birthDate={birthDate}
      slug={slug}
    />
  )}

  {/* Bouton dépliage — uniquement s'il y a des saisons précédentes et qu'elles sont repliées */}
  {hasPreviousSeasons && !expanded && (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
      >
        Voir les saisons précédentes ({hiddenCount} résultat{hiddenCount > 1 ? 's' : ''})
        <svg
          className="w-4 h-4 transition-transform duration-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )}

  {/* Saisons précédentes — visibles uniquement si expanded */}
  {expanded && previousSeasons.map((startYear) => (
    <SeasonGroup
      key={startYear}
      startYear={startYear}
      entries={bySeason[startYear]}
      birthDate={birthDate}
      slug={slug}
    />
  ))}

  {/* Bouton repliage — en bas des saisons, uniquement si expanded */}
  {hasPreviousSeasons && expanded && (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
      >
        Réduire
        <svg
          className="w-4 h-4 rotate-180 transition-transform duration-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 4 : Extraire SeasonGroup comme composant local**

Pour éviter la duplication du rendu d'une saison, extraire la logique de rendu d'une saison en composant local **dans le même fichier**, avant `PalmaresBlock` :

```tsx
interface SeasonGroupProps {
  startYear: number
  entries: PalmaresEntry[]
  birthDate: string | undefined
  slug: string
}

function SeasonGroup({ startYear, entries, birthDate, slug }: SeasonGroupProps) {
  return (
    <div>
      {/* Season header */}
      <div className="flex items-center gap-4 mb-5">
        <span className="font-montserrat text-3xl md:text-5xl font-black text-primary-container flex-shrink-0">
          {getSeasonLabel(startYear)}
        </span>
        <div className="flex-1 h-px bg-primary/20" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {entries.map((entry, i) => {
          const medal = entry.medal ? MEDAL_STYLES[entry.medal] : null
          return (
            <article
              key={i}
              id={entry.id ? `result-${entry.id}` : undefined}
              className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"
              style={{ borderLeft: `4px solid ${medal?.border ?? '#c6c5d4'}` }}
            >
              <div className="px-4 py-5 flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-inter text-xs uppercase tracking-widest text-on-surface-variant mb-1 leading-snug">
                    {formatDate(entry.date)} · {entry.level}{entry.city ? ` · ${entry.city}` : ''}
                  </p>
                  {medal ? (
                    <p
                      className="font-montserrat text-xl font-black leading-tight mb-1"
                      style={{ color: medal.dot }}
                    >
                      {entry.result}
                    </p>
                  ) : (
                    <p className="font-inter text-sm font-semibold text-on-surface-variant leading-tight mb-1">
                      {entry.result}
                    </p>
                  )}
                  <h3 className="font-inter text-base font-semibold text-primary leading-snug mb-3">
                    {entry.competition}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                      {entry.category}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                      {computeAgeCategory(birthDate, entry.date)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  {entry.id && process.env.NEXT_PUBLIC_SITE_URL && (
                    <PalmaresShareButton slug={slug} resultId={entry.id} />
                  )}
                  {entry.podiumPhoto && (
                    <PodiumPhotoButton
                      photo={entry.podiumPhoto}
                      alt={`Photo du podium — ${entry.competition} ${entry.result}`}
                    />
                  )}
                  {medal && (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-montserrat text-base font-black text-white shadow-md"
                      style={{
                        background: `radial-gradient(circle at 35% 35%, ${medal.border}, ${medal.dot})`,
                      }}
                      aria-label={`Médaille ${medal.label}`}
                      role="img"
                    >
                      {medal.rank}
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5 : Ajouter la note "sur X saisons" sous le compteur de stats**

Localiser le bloc `{stats && (...)}` dans `PalmaresBlock`. Entourer le `<PalmaresStatsCounter>` d'un fragment pour ajouter la note conditionnelle :

```tsx
{stats && (
  <>
    <PalmaresStatsCounter
      totalCompetitions={stats.totalCompetitions}
      totalPodiums={stats.totalPodiums}
    />
    {!expanded && hasPreviousSeasons && (
      <p className="font-inter text-xs text-on-surface-variant mb-8 -mt-6">
        sur {seasons.length} saisons
      </p>
    )}
  </>
)}
```

- [ ] **Step 6 : Vérifier les types**

```bash
npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 7 : Lancer tous les tests**

```bash
npm run test
```

Attendu : tous les tests passent (dont les 6 nouveaux de highlightsService)

- [ ] **Step 8 : Commit**

```bash
git add components/blocks/PalmaresBlock.tsx
git commit -m "feat: pagination par saison dans PalmaresBlock + note sur X saisons"
```

---

## Checklist tests manuels (à faire après l'implémentation)

- [ ] Highlights de Timothé : les 2 titres Champion de France Individuel sont en #1 et #2
- [ ] Palmarès vide : section Highlights absente dans le Hero, pas d'erreur JS
- [ ] Profil avec 1 seule saison : pas de bouton "Voir les saisons précédentes"
- [ ] Profil avec plusieurs saisons : bouton visible, affiche le bon count de résultats cachés
- [ ] Chevron s'anime en rotation à l'ouverture et à la fermeture
- [ ] Bouton "Réduire" apparaît en bas une fois les saisons précédentes dépliées
- [ ] Note "sur X saisons" visible quand replié, disparaît quand déplié
- [ ] Animations Highlights : stagger visible, respecte `prefers-reduced-motion`
- [ ] Dashboard `/dashboard/[profileId]/palmares` : inchangé, toutes les saisons visibles
