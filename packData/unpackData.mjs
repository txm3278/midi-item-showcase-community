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
];
let actorPacks = ['misc-actors'];

itemPacks.forEach((pack) => fs.rmSync(`./packData/${pack}`, { recursive: true }));
actorPacks.forEach((pack) => fs.rmSync(`./packData/${pack}`, { recursive: true }));

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
