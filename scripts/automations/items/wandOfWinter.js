export async function wandOfWinter({
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
  const {
    args: {
      [0]: { macroPass },
    },
    item: {
      system: {
        uses: { value: charges, max },
      },
    },
  } = scope ?? {};
  if (macroPass === 'postActiveEffects') {
    if (!item.system.equipped || item.system.attunement === 1) {
      ui.notifications.info(
        `${item.actor.name} has not attuned to, or has not equipped the Wand of Winter!`
      );
      return false;
    }

    const spells = [
      {
        label: 'Ray of Frost (0)',
        charges: 0,
        callback: 'ray0',
        toHit: 5,
        disabled: false,
        scaling: null,
      },
      {
        label: 'Ray of Frost (5th level) (1)',
        charges: 1,
        callback: 'ray5',
        toHit: 5,
        disabled: charges < 1,
        scaling: 5,
      },
      {
        label: 'Sleet Storm (3)',
        charges: 3,
        callback: 'sleetStorm',
        dc: 15,
        disabled: charges < 3,
      },
      {
        label: 'Ice Storm (4)',
        charges: 4,
        callback: 'iceStorm',
        dc: 15,
        disabled: charges < 4,
      },
    ];
    const payload = {
      title: 'Wand of Winter',
      content: `<style>
            #wow-dialog .dialog-buttons {
                display: grid;
                gap: 1em;
                grid-template-columns: 1fr;
            }
          </style><center>Charges: ${charges}/${max}</center>`,
      buttons: spells.map((i) => ({
        label: i.label,
        callback: () => i.callback,
        disabled: i.disabled,
      })),
      close: () => false,
    };
    const opts = {
      id: 'wow-dialog',
      width: 'auto',
      classes: ['dialog', 'dialog-buttons'],
    };
    const dialog = await Dialog.wait(payload, {}, opts);
    if (!dialog)
      return ui.notifications.info(
        `${item.actor.name} decided not to use the ${this.name}`
      );
    const result = spells.find((s) => s.callback === dialog);
    const [fromPack] = await game.packs
      .get('dnd5e.spells')
      .getDocuments({ name: result.label.split('(')[0].trim() });
    let spell = game.items.fromCompendium(fromPack);
    if (result.dc) {
      spell.system.save.dc = result.dc;
      spell.system.save.scaling = 'flat';
      spell.system.preparation.mode = 'atwill';
    }
    if (result.scaling !== undefined) spell.system.scaling.mode = null;
    if (result.scaling)
      spell.system.damage.parts[0][0] = fromPack._scaleCantripDamage(
        fromPack.system.damage.parts.map((i) => i[0]),
        fromPack.system.scaling.formula,
        result.scaling,
        item.actor.getRollData()
      );
    if (result.toHit) {
      spell.system.attackBonus = `-@prof + ${result.toHit}`;
      spell.system.ability = 'none';
    }
    spell = new Item.implementation(spell, { parent: item.actor });
    spell.prepareFinalAttributes();
    const rollWorkflow = await MidiQOL.completeItemUse(
      spell,
      {},
      { flags: { 'midi-qol': { castedLevel: spell.system.level } } }
    );
    await item.update({
      'system.uses.value': item.system.uses.value - result.charges,
    });
  }
}
