import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
let itemPacks = [
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
let actorPacks = ['misc-actors'];
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
