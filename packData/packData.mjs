import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
let packs = [
  'misc-actors',
  'misc-actions',
  'misc-class-features',
  'misc-feats',
  'misc-monster-features',
  'misc-race-features',
  'misc-spells',
  'misc-items',
  'misc-unearthed-arcana',
  'misc-homebrew',
  'misc-class-features-items',
  'misc-spell-items',
  'misc-items-features',
];
for (let i of packs) {
  await compilePack('./packData/' + i, './packs/' + i, { log: true });
}
