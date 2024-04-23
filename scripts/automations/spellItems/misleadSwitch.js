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
  const actorD = game.actors.get(args[0].actor._id);
  const spawnedId = actorD.getFlag('midi-qol', 'misc.mislead.spawnedTokenId');
  const currentVision = token.actor.getFlag('midi-qol', 'misc.mislead.sight');
  const effectId = token.actor.getFlag('midi-qol', 'misc.mislead.effectId');
  if (!canvas.scene.tokens.get(spawnedId)) return;
  let effectData = {
    label: 'Mislead - Blinded',
    icon: '',
    origin: workflow.item.uuid,
    changes: [
      {
        key: 'macro.CE',
        mode: 0,
        value: 'Blinded',
        priority: 20,
      },
      {
        key: 'macro.CE',
        mode: 0,
        value: 'Deafened',
        priority: 20,
      },
    ],
  };
  let target;
  let remove;
  if (currentVision) {
    target = actorD;
    remove = canvas.scene.tokens.get(spawnedId).actor;
  } else {
    target = canvas.scene.tokens.get(spawnedId).actor;
    remove = actorD;
  }
  let activeEffect = await target.createEmbeddedDocuments('ActiveEffect', [
    effectData,
  ]);
  await remove.deleteEmbeddedDocuments('ActiveEffect', [
    remove.effects.getName('Mislead - Blinded').id,
  ]);
  await token.actor.setFlag(
    'midi-qol',
    'misc.mislead.effectId',
    activeEffect[0].id
  );
  await token.actor.setFlag('midi-qol', 'misc.mislead.sight', !currentVision);
}
