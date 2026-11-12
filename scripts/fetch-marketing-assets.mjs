import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const webRequire = createRequire(new URL('../apps/web/package.json', import.meta.url));
const nextRequire = createRequire(webRequire.resolve('next/package.json'));
const sharp = nextRequire('sharp');
const output = new URL('../apps/web/public/media/', import.meta.url);
await mkdir(output, { recursive: true });
const sources = [
  {
    file: 'gathering.webp',
    id: '1492684223066-81342ee5ff30',
    author: 'Pablo Heimplatz',
    page: 'https://unsplash.com/photos/people-partying-with-confetti-ZODcBkEohk8',
  },
  {
    file: 'venue.webp',
    id: '1511578314322-379afb476865',
    author: 'CHUTTERSNAP',
    page: 'https://unsplash.com/photos/conference-room-with-round-tables-Q_KdjKxntH8',
  },
];
const manifest = [];
for (const source of sources) {
  const url =
    'https://images.unsplash.com/photo-' + source.id + '?auto=format&fit=max&w=2000&q=85&fm=jpg';
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
    throw new Error('Image download failed: ' + source.file);
  const original = Buffer.from(await response.arrayBuffer());
  const originalMetadata = await sharp(original).metadata();
  if (!originalMetadata.width || !originalMetadata.height)
    throw new Error('Image dimensions missing');
  let pipeline = sharp(original);
  // Keep the atmosphere and raised hands, cropping out the recognizable faces along the lower edge.
  if (source.file === 'gathering.webp')
    pipeline = pipeline.extract({
      left: 0,
      top: 0,
      width: originalMetadata.width,
      height: Math.floor(originalMetadata.height * 0.78),
    });
  const image = await pipeline
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const metadata = await sharp(image).metadata();
  const blur = await sharp(image).resize({ width: 16 }).webp({ quality: 35 }).toBuffer();
  await writeFile(new URL(source.file, output), image);
  manifest.push({
    ...source,
    download: url,
    license: 'https://unsplash.com/license',
    width: metadata.width,
    height: metadata.height,
    bytes: image.length,
    sha256: createHash('sha256').update(image).digest('hex'),
    blurDataURL: 'data:image/webp;base64,' + blur.toString('base64'),
  });
  console.log('Saved licensed photograph: ' + source.file + ' (' + image.length + ' bytes)');
}
await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
console.log('Asset provenance saved in ' + fileURLToPath(new URL('manifest.json', output)));
