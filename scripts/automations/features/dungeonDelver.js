export async function dungeonDelver({
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
  if (
    args[0].macroPass === 'preTargetDamageApplication' &&
    workflow.actor.name === 'Trap'
  ) {
    const msg = await item.displayCard({ createMessage: false });
    const DIV = document.createElement('DIV');
    DIV.innerHTML = msg.content;
    DIV.querySelector('div.card-buttons').remove();
    await ChatMessage.create({ content: DIV.innerHTML });
    let keptDamage = Math.floor(workflow.damageItem.appliedDamage / 2);
    let ditem = workflow.damageItem;
    if (ditem.oldTempHP > 0) {
      if (keptDamage > ditem.oldTempHP) {
        ditem.newTempHP = 0;
        keptDamage -= ditem.oldTempHP;
        ditem.tempDamage = ditem.oldTempHP;
      } else {
        ditem.newTempHP = ditem.oldTempHP - keptDamage;
        ditem.tempDamage = keptDamage;
        keptDamage = 0;
      }
    }
    let maxHP = args[0].options.token.actor.system.attributes.hp.max;
    ditem.hpDamage = Math.clamped(keptDamage, 0, maxHP);
    ditem.newHP = Math.clamped(ditem.oldHP - keptDamage, 0, maxHP);
    ditem.appliedDamage = keptDamage;
  }

  if (args[0].macroPass === 'preTargetSave' && workflow.actor.name === 'Trap') {
    const imgPropName = game.version < 12 ? 'icon' : 'img';
    const effectData = {
      changes: [
        {
          key: 'flags.midi-qol.advantage.ability.save.all',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: 1,
        },
      ],
      name: `${item.name}: preTargetSave`,
      [imgPropName]: `${item.img}`,
      flags: { dae: { specialDuration: ['isSave'], stackable: 'noneName' } },
    };
    await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }
}
