import { copyFile } from 'node:fs/promises';
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
