export async function misleadSwitch({
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
  const spawnedId = actor.getFlag('midi-item-showcase-community', 'mislead.spawnedTokenId');
  const currentVision = actor.getFlag('midi-item-showcase-community', 'mislead.sight');
  const itemS = actor.getFlag('midi-item-showcase-community', 'mislead.item');
  console.log(spawnedId);
  if (!canvas.scene.tokens.get(spawnedId)) return;
  let target;
  let remove;
  if (currentVision) {
    target = actor;
    remove = canvas.scene.tokens.get(spawnedId).actor;
  } else {
    target = canvas.scene.tokens.get(spawnedId).actor;
    remove = actor;
  }
  let activeEffect = await target.createEmbeddedDocuments('ActiveEffect', [
    remove.effects.getName('Mislead - Blinded'),
  ]);
  await remove.deleteEmbeddedDocuments('ActiveEffect', [
    remove.effects.getName('Mislead - Blinded').id,
  ]);
  await actor.setFlag('midi-item-showcase-community', 'mislead.sight', !currentVision);
  MidiQOL.addConcentrationDependent(target, activeEffect[0], itemS);
}
