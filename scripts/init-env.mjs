import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
try {
  await copyFile(
    new URL('../.env.example', import.meta.url),
    new URL('../.env', import.meta.url),
    constants.COPYFILE_EXCL,
  );
  console.log('Created root .env. Development credentials only.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('Existing .env preserved.');
  else throw error;
}
const path = new URL('../.env', import.meta.url);
let contents = await readFile(path, 'utf8');
const key = contents.match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim();
if (!key && !process.env.AUTH_SECRET) {
  if (/^NODE_ENV=production\s*$/m.test(contents) || process.env.NODE_ENV === 'production')
    throw new Error('Provision AUTH_SECRET through production secret management.');
  const line = 'AUTH_SECRET=' + randomBytes(32).toString('hex');
  contents = /^AUTH_SECRET=/m.test(contents)
    ? contents.replace(/^AUTH_SECRET=.*$/m, line)
    : contents.trimEnd() + '\n\n' + line + '\n';
  await writeFile(path, contents);
  console.log('Generated a private local authentication secret; existing settings preserved.');
}
if (process.argv.includes('--seed')) {
  if (/^NODE_ENV=production\s*$/m.test(contents) || process.env.NODE_ENV === 'production')
    throw new Error('Development seed credentials are forbidden in production.');
  for (const [name, value] of [
    ['SEED_EMAIL', 'developer@ventro.test'],
    ['SEED_PASSWORD', randomBytes(24).toString('base64url')],
  ]) {
    if (!contents.match(new RegExp('^' + name + '=(.+)$', 'm'))?.[1]?.trim()) {
      const line = name + '=' + value;
      contents = new RegExp('^' + name + '=', 'm').test(contents)
        ? contents.replace(new RegExp('^' + name + '=.*$', 'm'), line)
        : contents.trimEnd() + '\n' + line + '\n';
    }
  }
  await writeFile(path, contents);
  console.log('Local seed credentials provisioned in ignored root .env; values are not printed.');
}
