export async function potionOfHealing({
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
  //Prompts to use an action to drink the whole potion (full value) or bonus action to use the die roll. Also allows throwing up to 30 ft as a regular action to apply the healing to a targeted ally.
  //Item onUse ItemMacro | Before damage is rolled

  const hasUsedBonusAction = MidiQOL.hasUsedBonusAction(actor);
  let inRange = false;
  const target = args[0].targets[0].object;
  if (MidiQOL.computeDistance(token, target) > 5) inRange = true;
  if (inRange) {
    inRange = MidiQOL.findNearby(null, token, item.system.range.value, {
      includeIncapacitated: true,
      isSeen: true,
    }).some((t) => t === target);
    if (inRange) return true;
    else {
      ui.notifications.warn(
        'You tried to throw the healing potion too far (or you cannot see the target)!'
      );
      return false;
    }
  }

  let dialog = 'action';
  if (args[0].macroPass === 'preDamageRoll' && !hasUsedBonusAction) {
    dialog = await Dialog.wait({
      title: 'Do you want to use this as an Action or a Bonus Action?',
      buttons: {
        Action: {
          label: 'Action',
          callback: () => {
            return 'action';
          },
        },
        Bonus: {
          label: 'Bonus',
          callback: () => {
            return 'bonus';
          },
        },
      },
      close: () => {
        return 'action';
      },
    });
  }
  if (dialog === 'action') {
    const imgPropName = game.version < 12 ? 'icon' : 'img';
    const effectData = {
      changes: [{ key: 'flags.midi-qol.max.damage.heal', mode: 0, value: 1 }],
      name: item.name,
      origin: item.uuid,
      [imgPropName]: item.img,
      flags: { dae: { specialDuration: ['DamageDealt'] } },
    };
    return await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }
  if (dialog === 'bonus') await MidiQOL.setBonusActionUsed(actor);
}
