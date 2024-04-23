export async function channelDivinityDivineSpark({
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
  const clericLevel = actor.classes.cleric?.levels;
  let damageDice = 1;
  if (clericLevel > 17) {
    damageDice = 4;
  } else if (clericLevel > 12) {
    damageDice = 3;
  } else if (clericLevel > 6) {
    damageDice = 2;
  }

  const choices = [
    {
      label: 'Healing',
      value: { id: 'healing', string: 'Healing' },
    },
    {
      label: 'Radiant damage',
      value: { id: 'radiant', string: 'Radiant' },
    },
    {
      label: 'Necrotic damage',
      value: { id: 'necrotic', string: 'Necrotic' },
    },
  ];

  const choice = await warpgate.buttonDialog(
    { buttons: choices, title: 'Divine Spark' },
    'column'
  );

  let itemData;
  if (choice.id === 'healing') {
    itemData = {
      name: 'Channel Divinity: Divine Spark (Heal)',
      type: 'feat',
      img: 'icons/magic/light/explosion-star-small-blue-yellow.webp',
      system: {
        description: {
          value: `<p>As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at them. Roll ${damageDice}d8 and add your Wisdom modifier. You restore Hit Points to the creature equal to that total</p>`,
          chat: '',
          unidentified: '',
        },
        activation: {
          type: 'action',
          cost: 1,
        },
        target: {
          value: 1,
          type: 'creature',
        },
        range: {
          value: 30,
          units: 'ft',
        },
        ability: 'wis',
        actionType: 'heal',
        damage: {
          parts: [['1d8[healing] + @mod', 'healing']],
        },
      },
      flags: {
        midiProperties: {
          magicdam: true,
          magiceffect: true,
        },
      },
    };
  } else if (choice) {
    itemData = {
      name: 'Channel Divinity: Divine Spark (Harm)',
      type: 'feat',
      img: 'icons/magic/light/explosion-star-small-blue-yellow.webp',
      system: {
        description: {
          value: `<p>As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at them. Roll ${damageDice}d8 and add your Wisdom modifier. You force the creature to make a Constitution saving throw. On a failed save, the creature takes ${choice.string} damage equal to that total. On a successful save, the creature takes half as much damage (round down).</p>`,
          chat: '',
          unidentified: '',
        },
        activation: {
          type: 'action',
          cost: 1,
        },
        target: {
          value: 1,
          type: 'creature',
        },
        range: {
          value: 30,
          units: 'ft',
        },
        ability: 'wis',
        actionType: 'save',
        damage: {
          parts: [[`1d8[${choice.id}] + @mod`, choice]],
        },
        formula: '',
        save: {
          ability: 'con',
          dc: null,
          scaling: 'spell',
        },
      },
      flags: {
        midiProperties: {
          halfdam: true,
          magicdam: true,
          magiceffect: true,
        },
      },
    };
  }

  if (choice) {
    let itemToRoll = new Item.implementation(itemData, { parent: actor });
    await MidiQOL.completeItemUse(itemToRoll);
    game.messages.get(args[0].itemCardId).delete();
  }
}
