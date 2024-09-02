export async function tensersTransformation({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
  options,
}) {
  let exAtk = actor.items.getName('Extra Attack');
  if (exAtk) return;
  let featuresToGrant = await game.packs.get('midi-item-showcase-community.misc-spell-items').getDocuments({name: 'Extra Attack (Special)'});
  await actor.createEmbeddedDocuments('Item', featuresToGrant);
}
