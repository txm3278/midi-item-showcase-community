import { extractPack } from '@foundryvtt/foundryvtt-cli';

let itemPacks = [
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

for (let i of itemPacks) {
  await extractPack('packs/' + i, 'packData/' + i, {
    log: true,
    documentType: 'Item',
    clean: true,
  });
}
