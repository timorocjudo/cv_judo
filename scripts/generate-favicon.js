'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(
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
  const fontUrl = match[1].replace(/['"]/g, '');
  const fontBuffer = await fetchUrl(fontUrl);
  return fontBuffer.toString('base64');
}

function makeSvg({ width, height, fontSize, bgColor, ipponColor, idColor, fontBase64 }) {
  const x = width / 2;
  const y = Math.round(height / 2 + fontSize * 0.35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>@font-face{font-family:'Montserrat';font-weight:700;src:url('data:font/truetype;base64,${fontBase64}') format('truetype')}</style></defs>
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
