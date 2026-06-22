# Favicon IpponId Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le favicon Next.js par défaut par le wordmark "IpponId" dans les trois formats attendus par Next.js 14 App Router.

**Architecture:** Un script Node.js autonome (`scripts/generate-favicon.js`) récupère Montserrat Bold depuis Google Fonts, l'embarque en base64 dans des SVG intermédiaires, puis utilise `sharp` pour rasteriser `apple-icon.png` et `favicon.ico`. `app/icon.svg` est écrit statiquement avec un `@import` Google Fonts (chargé par le navigateur). Les trois fichiers sont commitée et détectés automatiquement par Next.js à la compilation.

**Tech Stack:** Node.js built-ins (`https`, `fs`, `path`, `Buffer`), `sharp` (déjà installé), SVG, PNG-in-ICO binary format.

## Global Constraints

- Couleurs : Judo Blue `#1B3A6B`, Gold `#D4A017`, Blanc `#FFFFFF`
- Police : Montserrat Bold (weight 700), sans fallback visible à cette taille
- "IpponId" s'écrit sans espace : `<tspan>Ippon</tspan><tspan>Id</tspan>` collés
- `app/layout.tsx` : ne pas modifier (pas de `<link rel="icon">` manuel)
- Les fichiers générés sont commités (le script n'est pas lancé au build)
- Zéro nouvelle dépendance npm

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `app/icon.svg` | Créer | SVG statique, chargé par navigateurs modernes (HiDPI) |
| `app/apple-icon.png` | Créer | PNG 180×180 généré par le script |
| `app/favicon.ico` | Écraser | ICO 32×32 (PNG-in-ICO) généré par le script |
| `scripts/generate-favicon.js` | Créer | Script de génération autonome |

---

## Task 1: `app/icon.svg` — wordmark SVG statique

**Files:**
- Create: `app/icon.svg`

**Interfaces:**
- Produit: `/icon` (servi par Next.js), balise `<link rel="icon" type="image/svg+xml">` injectée automatiquement

- [ ] **Step 1: Écrire `app/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">
  <style>@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700')</style>
  <rect width="100" height="40" fill="#FFFFFF"/>
  <text x="50" y="27" text-anchor="middle" font-family="'Montserrat',sans-serif" font-weight="700" font-size="22">
    <tspan fill="#1B3A6B">Ippon</tspan><tspan fill="#D4A017">Id</tspan>
  </text>
</svg>
```

Logique des dimensions :
- viewBox `0 0 100 40` → ratio ~2.5:1, adapté à un wordmark horizontal
- font-size 22 sur largeur 100 → "IpponId" occupe ~73px, laisse ~13px de marge de chaque côté
- `y="27"` = `height/2 + font-size × 0.35` = `20 + 7.7` → baseline visuellement centrée

- [ ] **Step 2: Vérifier le rendu SVG dans le navigateur**

Ouvrir directement `app/icon.svg` dans Chrome/Firefox. Vérifier :
- "Ippon" bleu marine, "Id" doré, pas d'espace entre les deux
- Texte centré dans le rectangle blanc
- Montserrat Bold chargée (nécessite internet ; à défaut le navigateur fallback sur sans-serif)

- [ ] **Step 3: Commit**

```bash
git add app/icon.svg
git commit -m "feat: add IpponId wordmark as app/icon.svg"
```

---

## Task 2: Script de génération + `apple-icon.png` + `favicon.ico`

**Files:**
- Create: `scripts/generate-favicon.js`
- Create: `app/apple-icon.png` (généré par le script)
- Overwrite: `app/favicon.ico` (généré par le script)

**Interfaces:**
- Consomme: `sharp` (importé depuis `node_modules`)
- Produit: `app/apple-icon.png` (180×180 PNG), `app/favicon.ico` (ICO avec PNG 32×32 embarqué)

- [ ] **Step 1: Vérifier que sharp est disponible**

```bash
node -e "require('sharp'); console.log('sharp OK')"
```

Résultat attendu : `sharp OK`

- [ ] **Step 2: Écrire `scripts/generate-favicon.js`**

```javascript
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchUrl(res.headers.location, headers));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    ).on('error', reject);
  });
}

async function fetchMontserratBold() {
  // Old IE UA → Google Fonts returns TTF (not woff2), compatible avec librsvg
  const cssBuffer = await fetchUrl(
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap',
    { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 5.5; Windows NT 5.0)' }
  );
  const css = cssBuffer.toString('utf8');
  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error('URL de font introuvable dans le CSS Google Fonts:\n' + css);
  const fontBuffer = await fetchUrl(match[1]);
  return fontBuffer.toString('base64');
}

function makeSvg({ width, height, fontSize, bgColor, ipponColor, idColor, fontBase64 }) {
  const x = width / 2;
  const y = Math.round(height / 2 + fontSize * 0.35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>@font-face{font-family:'Montserrat';font-weight:700;src:url('data:font/truetype;base64,${fontBase64}')format('truetype')}</style></defs>
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  <text x="${x}" y="${y}" text-anchor="middle" font-family="'Montserrat',sans-serif" font-weight="700" font-size="${fontSize}"><tspan fill="${ipponColor}">Ippon</tspan><tspan fill="${idColor}">Id</tspan></text>
</svg>`;
}

function pngToIco(pngBuffer) {
  // Format PNG-in-ICO : header 6 octets + 1 entrée 16 octets + données PNG
  const offset = 22;
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type = icon
  dir.writeUInt16LE(1, 4); // count = 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);                    // width
  entry.writeUInt8(32, 1);                    // height
  entry.writeUInt8(0, 2);                     // colorCount
  entry.writeUInt8(0, 3);                     // reserved
  entry.writeUInt16LE(1, 4);                  // planes
  entry.writeUInt16LE(32, 6);                 // bitCount
  entry.writeUInt32LE(pngBuffer.length, 8);   // bytesInRes
  entry.writeUInt32LE(offset, 12);            // imageOffset

  return Buffer.concat([dir, entry, pngBuffer]);
}

async function main() {
  const appDir = path.resolve(__dirname, '..', 'app');

  console.log('Fetching Montserrat Bold from Google Fonts...');
  const fontBase64 = await fetchMontserratBold();
  console.log('Font OK');

  // apple-icon.png : 180×180, fond navy, "Ippon" blanc + "Id" or
  const appleSvg = makeSvg({
    width: 180, height: 180, fontSize: 38,
    bgColor: '#1B3A6B', ipponColor: '#FFFFFF', idColor: '#D4A017',
    fontBase64,
  });
  await sharp(Buffer.from(appleSvg)).png().toFile(path.join(appDir, 'apple-icon.png'));
  console.log('✓ app/apple-icon.png');

  // favicon.ico : rendu à 256×256 puis downscale à 32×32 pour la qualité
  const faviconSvg = makeSvg({
    width: 256, height: 256, fontSize: 62,
    bgColor: '#FFFFFF', ipponColor: '#1B3A6B', idColor: '#D4A017',
    fontBase64,
  });
  const pngBuf = await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), pngToIco(pngBuf));
  console.log('✓ app/favicon.ico');

  console.log('\nDone. Run: npm run dev');
}

main().catch((err) => { console.error(err); process.exit(1); });
```

Logique des dimensions :
- `apple-icon` : font-size 38 → texte ~127px sur fond 180px (marge ~26px de chaque côté)
- `favicon` : SVG 256×256 avec font-size 62 → rendu propre à grande résolution, downscalé à 32×32 par sharp (meilleur antialiasing que le rendu natif à 32px)
- `y = height/2 + fontSize × 0.35` → baseline visuellement centrée pour cap-height Montserrat

- [ ] **Step 3: Lancer le script (internet requis)**

```bash
node scripts/generate-favicon.js
```

Résultat attendu :
```
Fetching Montserrat Bold from Google Fonts...
Font OK
✓ app/apple-icon.png
✓ app/favicon.ico

Done. Run: npm run dev
```

Si erreur `No font URL` : Google Fonts a changé son format CSS. Inspecter manuellement `https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap` avec l'UA mentionné et ajuster le regex dans `fetchMontserratBold()`.

- [ ] **Step 4: Vérifier les fichiers générés**

```bash
ls -lh app/apple-icon.png app/favicon.ico
file app/favicon.ico
```

Résultat attendu :
- `apple-icon.png` : ~10-30 kB
- `favicon.ico` : ~2-5 kB
- `file app/favicon.ico` : doit indiquer `MS Windows icon resource`

Pour prévisualiser visuellement `apple-icon.png` : l'ouvrir dans un visionneur d'images. Pour `favicon.ico` : lancer le serveur (Task 3 Step 1).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-favicon.js app/apple-icon.png app/favicon.ico
git commit -m "feat: add IpponId wordmark favicons (apple-icon, ico) via generate script"
```

---

## Task 3: Vérification finale en dev

**Files:**
- Aucun fichier modifié dans cette tâche

- [ ] **Step 1: Lancer le serveur de développement**

```bash
npm run dev
```

Ouvrir `http://localhost:3000` dans le navigateur.

- [ ] **Step 2: Vérifier le favicon dans l'onglet**

Dans Chrome/Firefox : l'onglet doit afficher le wordmark "IpponId" (Ippon bleu + Id doré).

Si l'onglet affiche encore l'ancien favicon : forcer le rechargement de `http://localhost:3000/favicon.ico` directement, puis hard-refresh (Ctrl+Shift+R).

- [ ] **Step 3: Vérifier les endpoints Next.js**

- `http://localhost:3000/icon` → SVG blanc avec wordmark bleu/or
- `http://localhost:3000/apple-icon` → PNG 180×180 fond navy, texte blanc/or

- [ ] **Step 4: Vérifier les balises `<head>` injectées**

DevTools → Elements → `<head>`. Next.js doit avoir injecté :
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/icon?<hash>" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="/apple-icon?<hash>" sizes="180x180">
```

Si une des balises manque : vérifier que le fichier correspondant est bien dans `app/` avec le nom exact attendu par Next.js (`icon.svg`, `apple-icon.png`, `favicon.ico`).

- [ ] **Step 5: Commit final si ajustements**

Si des retouches visuelles ont été nécessaires (font-size, couleurs) après prévisualisation :

```bash
# Re-lancer le script après modifications
node scripts/generate-favicon.js
git add app/apple-icon.png app/favicon.ico scripts/generate-favicon.js
git commit -m "fix: ajust favicon dimensions after visual review"
```
