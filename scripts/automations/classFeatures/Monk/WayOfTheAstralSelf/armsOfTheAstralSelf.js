export async function armsOfTheAstralSelf({
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
  let attAbility;
  if (
    actor.system.abilities.dex.mod >= actor.system.abilities.str.mod &&
    actor.system.abilities.wis.mod
  ) {
    attAbility = 'dex';
  } else if (
    actor.system.abilities.wis.mod >= actor.system.abilities.str.mod &&
    actor.system.abilities.dex.mod
  ) {
    attAbility = 'wis';
  } else if (
    actor.system.abilities.str.mod >= actor.system.abilities.dex.mod &&
    actor.system.abilities.wis.mod
  ) {
    attAbility = 'str';
  }

  const weaponData = {
    name: 'Spectral Arms',
    type: 'weapon',
    img: 'icons/magic/unholy/strike-hand-glow-pink.webp',
    system: {
      quantity: 1,
      activation: { type: 'action', cost: 1, condition: '' },
      target: { value: 1, type: 'creature' },
      range: { value: 10, long: null, units: 'ft' },
      ability: attAbility,
      actionType: 'mwak',
      attackBonus: '',
      chatFlavor: '',
      critical: null,
      damage: {
        parts: [['@scale.monk.martial-arts[force] + @mod', 'force']],
        versatile: '',
      },
      type: {
        value: 'simpleM',
      },
      proficient: true,
      equipped: true,
      description: 'Punch long, punch good',
    },
    flags: {},
  };

  await actor.createEmbeddedDocuments('Item', [weaponData]);
  ui.notifications.notify('Spectral Arms added to item inventory');
}
