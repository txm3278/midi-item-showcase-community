import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
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
  await compilePack('./packData/' + i, './packs/' + i, { log: true });
}

for (let i of actorPacks) {
  await compilePack('./packData/' + i, './packs/' + i, { log: true });
}
