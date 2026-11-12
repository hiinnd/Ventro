import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import options from '../packages/config/prettier.mjs';
import { markPaths, wordmarkPaths } from '../packages/ui/src/brand-geometry.ts';

const check = process.argv.includes('--check');
const wordmark = (ink) =>
  '<g transform="translate(80 14)" fill="' +
  ink +
  '" fill-rule="evenodd">' +
  wordmarkPaths
    .map(({ x, d }) => '<path transform="translate(' + x + ' 0)" d="' + d + '"/>')
    .join('') +
  '</g>';
const mark = (ink, mono = false) =>
  markPaths
    .map(
      (d, index) =>
        '<path d="' +
        d +
        '" fill="' +
        (index === 0 || mono ? ink : index === 1 ? '#9B8CFF' : '#5CE1C6') +
        '"/>',
    )
    .join('');
const svg = (box, content, title) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
  box +
  '" role="img" aria-labelledby="title"><title id="title">' +
  title +
  '</title>' +
  content +
  '</svg>';
const assets = {};
for (const [surface, ink] of [
  ['light', '#101B35'],
  ['dark', '#F6F7FB'],
]) {
  assets['logo-on-' + surface + '.svg'] = svg(
    '0 0 310 64',
    '<g transform="translate(4 8)">' + mark(ink) + '</g>' + wordmark(ink),
    'VENTRO — horizontal logo on ' + surface,
  );
  assets['symbol-on-' + surface + '.svg'] = svg(
    '0 0 48 48',
    mark(ink),
    'VENTRO — symbol on ' + surface,
  );
  assets['logo-mono-' + surface + '.svg'] = svg(
    '0 0 310 64',
    '<g transform="translate(4 8)">' + mark(ink, true) + '</g>' + wordmark(ink),
    'VENTRO — monochrome logo on ' + surface,
  );
}
assets['favicon.svg'] = svg(
  '0 0 64 64',
  '<rect width="64" height="64" rx="16" fill="#101B35"/><g transform="translate(8 8)">' +
    mark('#F6F7FB') +
    '</g>',
  'VENTRO',
);
assets['app-icon.svg'] = svg(
  '0 0 512 512',
  '<rect width="512" height="512" rx="112" fill="#101B35"/><g transform="translate(88 88) scale(7)">' +
    mark('#F6F7FB') +
    '</g>',
  'VENTRO app icon',
);
const directory = new URL('../apps/web/public/brand/', import.meta.url);
if (!check) await mkdir(directory, { recursive: true });
for (const [name, source] of Object.entries(assets)) {
  const content = await format(source, { ...options, parser: 'html' });
  const path = new URL(name, directory);
  if (check) {
    if ((await readFile(path, 'utf8')) !== content)
      throw new Error('Brand export out of date: ' + name);
  } else await writeFile(path, content);
}
console.log(
  (check ? 'Verified ' : 'Generated ') + Object.keys(assets).length + ' original SVG brand assets.',
);
