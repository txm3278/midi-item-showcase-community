export async function swornEnemy({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
}) {
  if (workflow.targets.size != 1) return;
  let seconds = 604800;
  let targetEffectData = {
    name: 'Sworn Enemy',
    icon: workflow.item.img,
    origin: workflow.item.uuid,
    duration: {
      seconds: seconds,
    },
    flags: {
      dae: {
        specialDuration: ['zeroHP'],
      },
      effectmacro: {
        onDelete: {
          script:
            'let sourceActor = origin.parent\nlet sourceActorUuid = sourceActor.uuid\nlet sourceEffect = sourceActor.effects.getName("Sworn Enemy")\n\nif (!sourceEffect) {\n    return;\n} else {\n    await MidiQOL.socket().executeAsGM("deleteEffects", {\n    actorUuid: sourceActorUuid,\n    effectsToDelete: [sourceEffect.id],\n  });\n}',
        },
      },
    },
  };
  await chrisPremades.helpers.createEffect(
    workflow.targets.first().actor,
    targetEffectData
  );
  async function effectMacro() {
    await warpgate.revert(token.document, 'Sworn Enemy');
    let targetTokenId = effect.changes[0].value;
    let targetToken = canvas.scene.tokens.get(targetTokenId);
    if (!targetToken) return;
    let targetActor = targetToken.actor;
    let targetEffect = chrisPremades.helpers.findEffect(
      targetActor,
      'Sworn Enemy'
    );
    if (!targetEffect) return;
    await chrisPremades.helpers.removeEffect(targetEffect);
  }
  let sourceEffectData = {
    name: 'Sworn Enemy',
    icon: workflow.item.img,
    changes: [
      {
        key: 'flags.chris-premades.spell.huntersMark',
        mode: 5,
        value: workflow.targets.first().id,
        priority: 20,
      },
      {
        key: 'flags.midi-qol.disadvantage.attack.all',
        mode: 0,
        value: "item.name !== 'Oathbow'",
        priority: 20,
      },
    ],
    transfer: false,
    origin: workflow.item.uuid,
    duration: {
      seconds: seconds,
    },
    flags: {
      effectmacro: {
        onDelete: {
          script: chrisPremades.helpers.functionToString(effectMacro),
        },
      },
    },
  };

  let updates = {
    embedded: {
      ActiveEffect: {
        [sourceEffectData.name]: sourceEffectData,
      },
    },
  };
  let options = {
    permanent: false,
    name: sourceEffectData.name,
    description: sourceEffectData.name,
  };
  await warpgate.mutate(workflow.token.document, updates, {}, options);
}
