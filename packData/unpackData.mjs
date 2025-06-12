import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
import * as fs from 'node:fs';

let itemPacks = [
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
  'misc-feats-2024',
  'misc-items-2024',
  'misc-spells-2024',
  'misc-third-party',
];
let actorPacks = ['misc-actors'];

itemPacks.forEach((pack) => {
  const path = `./packData/${pack}`;
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
});

actorPacks.forEach((pack) => {
  const path = `./packData/${pack}`;
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
});

for (let i of itemPacks) {
  await extractPack('packs/' + i, 'packData/' + i, {
    log: true,
    documentType: 'Item',
  });
}
for (let i of actorPacks) {
  await extractPack('packs/' + i, 'packData/' + i, {
    log: true,
    documentType: 'Actor',
  });
}
