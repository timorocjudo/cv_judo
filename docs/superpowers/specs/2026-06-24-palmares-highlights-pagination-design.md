# Design — Palmarès Highlights + Pagination par saison

Date: 2026-06-24  
Branche: bugfix-lot1

## Résumé

Deux évolutions sur la page profil publique :
1. Bloc **Highlights** dans le Hero — les 3 meilleurs résultats du judoka, animés.
2. **Pagination par saison** dans PalmaresBlock — seule la saison en cours est visible par défaut.

Le dashboard garde l'affichage complet inchangé.

---

## 1. `lib/highlightsService.ts`

### Signature

```ts
getBestResults(palmares: PalmaresEntry[], count: number = 3): PalmaresEntry[]
```

### Logique de priorité

Chaque entrée reçoit un **score de priorité** (plus bas = meilleur) :

| Score | Critère |
|---|---|
| 1 | National Individuel + or (gold) |
| 2 | National (tout type) + or |
| 3 | National + podium (silver/bronze) |
| 4 | Régional + or |
| 5 | Régional + podium |
| 6 | Départemental + or |
| 7 | Tout le reste |

**Tiebreaker** : date la plus récente gagne (desc).

**Détection du niveau** depuis le champ `level` existant :
- `level.toLowerCase().includes("national")` → national
- Sous-type individuel : `level.toLowerCase().includes("individuel")` → score 1 pour l'or
- `level.toLowerCase().includes("régional") || level.toLowerCase().includes("region")` → régional
- `level.toLowerCase().includes("départemental") || level.toLowerCase().includes("departement")` → départemental

> Note : la détection par mots-clés sur le titre de la compétition est une fallback si `level` est vide — non implémenté dans v1 mais documenté pour une future affinage.

### Résultat attendu pour Timothé
1. Champion de France Individuel 2024-03-25 (score 1)
2. Champion de France Individuel 2023-03-26 (score 1, récence 2e)
3. Champion de France Équipe 2023-05-13 (score 2)

---

## 2. HeroBlock — Bloc Highlights

### Props
`HeroBlock` reçoit un nouveau prop : `palmares: PalmaresEntry[]`  
Mis à jour dans `lib/blockRegistry.tsx` : `data.palmares` passé au renderer.

### Conditions d'affichage
- Affiché uniquement si `palmares.length >= 1`
- Positionné juste après les badges (club, catégorie, grade), avant les liens sociaux

### Design de chaque card
```
[ 🥇 ] Champion de France          [badge: -73kg]
        Champ. de France Individuel · 2024
```
- **Gauche** : cercle médaille coloré (or=#FFD700/gradient, argent=#C0C0C0, bronze=#CD7F32, null=bleu marine #000666)
- **Centre haut** : `entry.result` en `font-montserrat font-black` couleur de la médaille (ou blanc pour non-médaillé)
- **Centre bas** : `entry.competition · année` en `font-inter text-xs text-white/60`
- **Droite** : `entry.category` en badge discret `text-white/50 border-white/20`

### Layout
- Mobile : `flex-col gap-2` (empilé)
- Desktop : `grid grid-cols-3 gap-3`

### Animation Framer Motion
Stagger de 80ms entre les cards, déclenchée **après** les badges (delay = badge delay final + 0.10 + index * 0.08).  
Réutilise le pattern `initial: { opacity: 0, y: 20 }` déjà en place. Respecte `useReducedMotion`.

---

## 3. PalmaresBlock — Pagination par saison

### Changement de mode de rendu
PalmaresBlock passe en `'use client'` (aucune dépendance serveur, pur rendu). `PalmaresStatsCounter` était déjà client.

### State
```ts
const [expanded, setExpanded] = useState(false)
```

### Logique d'affichage
- `seasons[0]` = saison la plus récente → toujours affichée complètement
- `seasons.slice(1)` = saisons précédentes → masquées si `!expanded`
- Si `seasons.length === 1` → pas de bouton, tout affiché

### Compteur de saisons cachées
```ts
const hiddenCount = seasons.slice(1).reduce((sum, s) => sum + bySeason[s].length, 0)
```

### Bouton
```
Voir les saisons précédentes (X résultats) [chevron ↓]
```
- Centré, style discret `text-on-surface-variant`
- Icône chevron : `rotate-0` collapsed / `rotate-180` expanded (transition 200ms)
- Une fois déplié, bouton "Réduire" en bas des saisons (même style, chevron ↑)

### Compteur de stats
`computePalmaresStats(palmares)` reçoit **tout** le palmarès (inchangé). Quand `!expanded && seasons.length > 1`, affichage d'un sous-texte discret :  
`"sur {seasons.length} saisons"` sous le compteur principal.

---

## 4. Tests — `__tests__/unit/highlightsService.test.ts`

| Cas | Assertion |
|---|---|
| Palmarès vide | Retourne `[]` |
| 1 seul résultat | Retourne ce seul résultat |
| Plusieurs même niveau | Le plus récent en premier |
| 1 national parmi des régionaux | Le national sort en #1 |
| Plus de 3 résultats | Exactement 3 retournés |
| Uniquement départementaux | 3 premiers sans erreur |

---

## 5. Ce qui NE change PAS

- `app/dashboard/[profileId]/palmares/page.tsx` — affichage complet, pas de pagination
- Le bloc Highlights n'apparaît pas dans le dashboard
- `PalmaresStatsCounter` — inchangé (reçoit déjà les stats complètes)

---

## 6. Checklist tests manuels

- [ ] Profil avec 1 seule saison → pas de bouton "Voir plus"
- [ ] Profil avec plusieurs saisons → bouton visible, chevron s'anime à l'ouverture et à la fermeture
- [ ] Palmarès vide → section Highlights absente dans le Hero, pas d'erreur
- [ ] Highlights de Timothé → 2 titres Champion de France Individuel en #1 et #2
- [ ] Stats "sur X saisons" s'affiche quand replié, disparaît quand déplié
- [ ] Animation stagger des cards Highlights respecte `prefers-reduced-motion`
