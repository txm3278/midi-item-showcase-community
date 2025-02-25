import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs';

let packs = [
  'misc-actions',
  'misc-class-features',
  'misc-class-features-items',
  'misc-feats',
  'misc-homebrew',
  'misc-items',
  'misc-items-features',
  'misc-monster-features',
  'misc-race-features',
  'misc-spell-items',
  'misc-spells',
  'misc-unearthed-arcana',
];
let actorPacks = ['misc-actors'];

for (let i of packs) {
  let path = './packData/' + i;
  if (fs.existsSync(path)) {
    await compilePack(path, './packs/' + i, { log: true });
  } else {
    console.warn(`Directory ${path} does not exist.`);
  }
}

for (let i of actorPacks) {
  let path = './packData/' + i;
  if (fs.existsSync(path)) {
    await compilePack(path, './packs/' + i, { log: true });
  } else {
    console.warn(`Directory ${path} does not exist.`);
  }
}
