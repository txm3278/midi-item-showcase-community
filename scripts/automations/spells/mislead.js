export async function mislead({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
}) {
  let updates = {
    token: {
      name: `${actor.name}`,
      texture: token.document.texture,
      detectionModes: token.document.detectionModes,
      sight: token.document.sight,
      rotation: token.document.rotation,
    },
    actor: {
      name: `${actor.name} Mislead`,
      system: {
        attributes: {
          hp: {
            value: 100,
            max: 100,
          },
          movement: {
            walk: actor.system.attributes.movement.walk * 2,
          },
        },
        details: {
          type: {
            custom: 'NoTarget',
            value: 'custom',
          },
        },
      },
    },
    flags: {
      'mid-qol': {
        neverTarget: true,
      },
    },
  };
  const callbacks = {
    post: async (template, token, updates) => {
      const sourceActorOrToken = fromUuidSync(
        updates.actor.flags.warpgate.control.actor
      );
      const sourceActor = sourceActorOrToken.actor ?? sourceActorOrToken;
      MidiQOL.addConcentrationDependent(sourceActor, token, item);
    },
  };
  const options = { controllingActor: actor };
  const spawningActor = game.actors.getName('Mislead');
  if (!spawningActor) {
    ui.notifications.warn(
      'Actor named "Mislead" not found. Please create actor.'
    );
    return false;
  }
  const ids = await warpgate.spawnAt(
    token.center,
    await spawningActor.getTokenDocument(),
    updates,
    callbacks,
    options
  );
  if (!ids) return;

  await actor.setFlag(
    'midi-item-showcase-community',
    'mislead.spawnedTokenId',
    ids[0]
  );
  await actor.setFlag(
    'midi-item-showcase-community',
    'mislead.item',
    item
  );
  await actor.setFlag(
    'midi-item-showcase-community',
    'mislead.sight',
    false
  );
  const spawnedActor = canvas.scene.tokens.get(ids[0]).actor;
  await DAE.setFlag(spawnedActor, 'spawnedByTokenUuid', token.document.uuid);

  let hookIdForSpawnedCreatures = Hooks.on(
    'preDeleteToken',
    async (tokenDoc) => {
      const sourceTokenUuid = tokenDoc.actor.getFlag(
        'dae',
        'spawnedByTokenUuid'
      );
      if (!sourceTokenUuid) return;
      new Sequence()
        .effect()
        .atLocation(tokenDoc.object.center)
        .file(`jb2a.smoke.puff.centered.grey.2`)
        .scale(tokenDoc.width / canvas.scene.grid.distance)
        .play();
      const sourceActor = fromUuidSync(sourceTokenUuid).actor;
      const spawnedId = sourceActor.getFlag(
        'midi-item-showcase-community',
        'mislead.spawnedTokenId'
      );
      if (!spawnedId) return;
      let spawnedTokenDoc;
      if (canvas.scene.tokens.get(spawnedId)) {
        spawnedTokenDoc = canvas.scene.tokens.get(spawnedId);
      }
      if (spawnedTokenDoc) {
        await sourceActor.unsetFlag(
          'midi-item-showcase-community',
          'mislead.spawnedTokenId'
        );
        Hooks.off('preDeleteToken', hookIdForSpawnedCreatures);
      }
    }
  );
}
