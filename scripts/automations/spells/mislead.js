export async function mislead({
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

  let updates = {
    token: {
      name: `${actorD.name}`,
      texture: token.document.texture,
      detectionModes: token.document.detectionModes,
      sight: token.document.sight,
      rotation: token.document.rotation,
    },
    actor: {
      name: `${actorD.name} Mislead`,
      system: {
        attributes: {
          hp: {
            value: 100,
            max: 100,
          },
          movement: {
            walk: actorD.system.attributes.movement.walk * 2,
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
      const concFlag = sourceActor.getFlag('midi-qol', 'concentration-data');
      concFlag.removeUuids.push(token.uuid);
      await sourceActor.setFlag('midi-qol', 'concentration-data', concFlag);
    },
  };
  const options = { controllingActor: actorD };
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

  await token.actor.setFlag(
    'midi-item-showcase-community',
    'mislead.spawnedTokenId',
    ids[0]
  );
  await token.actor.setFlag(
    'midi-item-showcase-community',
    'mislead.sight',
    false
  );
  const spawnedActor = canvas.scene.tokens.get(ids[0]).actor;
  await DAE.setFlag(spawnedActor, 'spawnedByTokenUuid', token.document.uuid);

  let itemData;
  const gamePack = game.packs.get(
    'midi-item-showcase-community.MISC Spell Items'
  );
  if (!gamePack) {
    ui.notifications.warn('Invalid compendium specified!');
    return false;
  }
  let packIndex = await gamePack.getIndex({
    fields: ['name', 'type', 'folder'],
  });
  let match = packIndex.find((item) => item.name === 'Mislead - Switch');
  if (match) {
    itemData = (await gamePack.getDocument(match._id))?.toObject();
  } else {
    ui.notifications.warn(
      'Item not found in specified compendium! Check spelling?'
    );
    return undefined;
  }

  if (!itemData) return;

  let effectData = {
    name: itemData.name + ' Item',
    icon: '', //Blank to avoid showing up as a status icon.
    duration: {
      seconds: 3600,
    },
    origin: workflow.item.uuid,
    flags: {
      effectmacro: {
        onDelete: {
          script:
            "warpgate.revert(token.document, '" + itemData.name + " Item');",
        },
      },
      dae: {
        transfer: false,
        stackable: 'multi',
        macroRepeat: 'none',
      },
    },
  };

  let effectUpdates = {
    embedded: {
      Item: {
        [itemData.name]: itemData,
      },
      ActiveEffect: {
        [effectData.name]: effectData,
      },
    },
  };
  let effectOptions = {
    permanent: false,
    name: effectData.name,
    description: effectData.name,
  };

  await warpgate.mutate(token.document, effectUpdates, {}, effectOptions);

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
