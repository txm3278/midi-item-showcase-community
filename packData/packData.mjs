import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs';

let packs = [
  'misc-actions',
  'misc-class-features',
  'misc-class-features-2024',
  'misc-feats',
  'misc-feats-2024',
  'misc-items',
  'misc-items-2024',
  'misc-monster-features',
  'misc-monster-features-2024',
  'misc-race-features',
  'misc-spells',
  'misc-spells-2024',
  'misc-third-party',
];

for (let i of packs) {
  let path = './packData/' + i;
  if (fs.existsSync(path)) {
    await compilePack(path, './packs/' + i, { log: true });
  } else {
    console.warn(`Directory ${path} does not exist.`);
  }
}
