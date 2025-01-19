import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli';
let packs = [
  'misc-actions',
  'misc-class-features',
  'misc-feats',
  'misc-monster-features',
  'misc-race-features',
  'misc-spells',
  'misc-items',
];
for (let i of packs) {
  await compilePack('./packData/' + i, './packs/' + i, { log: true });
}
