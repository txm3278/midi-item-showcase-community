export async function healer({
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
  if (args[0].macroPass === 'preItemRoll') {
    const target = args[0].targets[0]?.actor;
    if (!target) return;
    if (target.effects.find((e) => e.name === 'Healer Feat')) {
      await ChatMessage.create(
        {
          user: game.user.id,
          content: `<b>Healer</b><br>This creature must finish a <b>short</b> or <b>long rest</b> before benefiting from the Healer feat.`,
          speaker: ChatMessage.getSpeaker({ actor: target }),
        },
        {}
      );
      return false;
    }
  }
  if (args[0].macroPass === 'postDamageRoll') {
    let damage = '0';
    const target = args[0].targets[0]?.actor;
    const macroData = args[0];
    const sourceItem = fromUuidSync(macroData.sourceItemUuid);
    const imgPropName = game.version < 12 ? 'icon' : 'img';
    const EffectData = {
      changes: [],
      duration: {
        seconds: 999999,
      },
      [imgPropName]: sourceItem.img,
      label: 'Healer Feat',
      origin: macroData.sourceItemUuid,
      transfer: false,
      flags: {
        dae: {
          stackable: 'none',
          specialDuration: ['longRest', 'shortRest'],
        },
      },
    };
    const dialog = await Dialog.wait({
      title: `${item.name}`,
      content: 'What do you want to do?',
      buttons: {
        stabilize: {
          icon: '<image src="icons/svg/regen.svg" width="30" height="30" style="border:0px">',
          label: 'Stabilize the target and heal for 1hp',
          callback: () => {
            damage = '1';
          },
        },
        healing: {
          icon: '<image src="icons/svg/heal.svg" width="30" height="30" style="border:0px">',
          label: 'Heal the target (once per short rest)',
          callback: () => {
            if (!target) return;
            const hd = target.system.details.level;
            damage = '1d6 + 4 + ' + hd;
          },
        },
      },
      default: 'stabilize',
    });

    if (damage != '1') {
      await MidiQOL.socket().executeAsGM('createEffects', {
        actorUuid: target.uuid,
        effects: [EffectData],
      });
    }
    const damageRoll = await new Roll(damage).roll({ async: true });
    workflow.setDamageRoll(damageRoll);
    return;
  }
}
