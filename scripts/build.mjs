import { readFile, writeFile, cp, mkdir, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(path.join(root, 'data/places.json'), 'utf8'));
const ids = new Set();
for (const p of data.places) {
  if (!p.id || ids.has(p.id) || !p.name || !Array.isArray(p.photos)) throw new Error('Invalid or duplicate place');
  ids.add(p.id);
  if (!Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180) throw new Error(`Invalid coordinates: ${p.id}`);
  for (const photo of p.photos) {
    for (const key of ['src', 'thumbnail']) {
      if (!photo[key]?.startsWith('assets/') || photo[key].includes('..')) throw new Error('Invalid photo path');
      await access(path.join(root, 'site', photo[key]));
    }
    if (!photo.alt) throw new Error(`Missing photo description: ${p.id}`);
  }
}
const out = path.join(root, 'docs');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(path.join(root, 'site'), out, { recursive: true });
await writeFile(path.join(out, 'places.json'), JSON.stringify(data, null, 2) + '\n');
await writeFile(path.join(out, '.nojekyll'), '');
console.log(`Built ${data.places.length} places / ${data.places.reduce((n,p)=>n+p.photos.length,0)} photos into docs/`);
