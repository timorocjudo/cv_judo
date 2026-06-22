# Favicon IpponId — Design Spec

**Date:** 2026-06-22  
**Branche:** bugfix-lot1

## Objectif

Remplacer le favicon Next.js par défaut par le wordmark "IpponId" aux couleurs du site, en produisant trois fichiers détectés automatiquement par Next.js 14 App Router.

## Couleurs

| Token       | Hex       | Usage                          |
|-------------|-----------|-------------------------------|
| Judo Blue   | `#1B3A6B` | "Ippon" dans icon.svg/favicon, fond apple-icon |
| Gold        | `#D4A017` | "Id" dans tous les fichiers   |
| Blanc       | `#FFFFFF`  | Fond icon.svg/favicon, "Ippon" sur apple-icon |

## Fichiers produits

### `app/icon.svg`
- viewBox `0 0 100 40`, fond blanc `#FFFFFF`
- `<style>` avec `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700')` — chargé par le navigateur, garde le SVG léger
- `<text>` unique, `font-family="'Montserrat', sans-serif"`, `font-weight="700"`, centré (x=50 y=26, `text-anchor="middle"`)
- Deux `<tspan>` collés sans espace : `"Ippon"` fill=`#1B3A6B` + `"Id"` fill=`#D4A017`
- Prioritaire sur `favicon.ico` dans les navigateurs modernes (haute densité)

### `app/apple-icon.png`
- 180×180 px, fond plein `#1B3A6B`
- `"Ippon"` en blanc `#FFFFFF` + `"Id"` en or `#D4A017`, Montserrat Bold, centré
- Généré par sharp via SVG intermédiaire 180×180 avec `@font-face` et Montserrat Bold encodée en base64

### `app/favicon.ico`
- 32×32 px, fond blanc `#FFFFFF`
- `"Ippon"` `#1B3A6B` + `"Id"` `#D4A017`, Montserrat Bold
- Généré : sharp rasterise un SVG 32×32 → PNG buffer → wrappé en PNG-in-ICO (format natif ICO avec PNG embarqué, supporté depuis Windows Vista/Chrome/Firefox)
- Zéro dépendance supplémentaire (ICO header construit manuellement avec Buffer Node.js)

### `app/layout.tsx`
- Aucun changement. Pas de `<link rel="icon">` manuel → détection automatique Next.js active.

## Script de génération

**Fichier :** `scripts/generate-favicon.js`  
**Runtime :** Node.js (`node scripts/generate-favicon.js`)  
**Dépendances :** `sharp` (déjà dans `package.json`), `https` (Node built-in)

### Étapes du script

1. **Fetch Montserrat Bold** — requête HTTPS vers l'API Google Fonts CSS, extraction de l'URL de la font `.ttf`/`.woff2`, fetch des bytes binaires, encodage base64
2. **Générer apple-icon.png** — SVG 180×180 avec `@font-face` base64 → `sharp().png()` → write `app/apple-icon.png`
3. **Générer favicon.ico** — SVG 32×32 avec `@font-face` base64 → `sharp().png()` → PNG buffer → ICO wrapper → write `app/favicon.ico`
4. **Écrire icon.svg** — SVG avec Google Fonts `@import` (sans base64, pour que les navigateurs le chargent) → write `app/icon.svg`

### Format ICO (PNG-in-ICO)

```
Offset  Size  Description
0       2     Reserved = 0
2       2     Type = 1 (icon)
4       2     Count = 1
--- ICONDIRENTRY ---
6       1     Width = 32
7       1     Height = 32
8       1     ColorCount = 0
9       1     Reserved = 0
10      2     Planes = 1
12      2     BitCount = 32
14      4     BytesInRes = PNG_SIZE
18      4     ImageOffset = 22
--- PNG DATA ---
22      N     PNG bytes
```

## Prévisualisation

Après `node scripts/generate-favicon.js`, lancer `npm run dev` et ouvrir `http://localhost:3000`. Le favicon s'affiche dans l'onglet du navigateur. Pour tester `apple-icon.png`, inspecter `http://localhost:3000/apple-icon` (servi automatiquement par Next.js).

## Contraintes

- sharp doit être disponible (`npm ls sharp` doit répondre)
- Le script nécessite un accès internet au moment de la génération (fetch Google Fonts)
- Les fichiers générés sont commités dans le dépôt — le script n'est pas lancé au build
