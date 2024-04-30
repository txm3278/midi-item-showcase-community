export async function shapechanger({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
}) {
  const vampireForm = {};
  let tokenImg;
  if (game.modules.get('jb2a_patreon')?.active) {
    tokenImg =
      'modules/jb2a_patreon/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm';
  } else if (game.modules.get('JB2A_DnD5e')?.active) {
    tokenImg =
      'modules/JB2A_DnD5e/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm';
  }
  const mistForm = {
    mutation: 'Mist Form',
    token: {
      name: 'Cloud of Mist',
      //scale: 1.5,
      width: 1,
      height: 1,
      img: tokenImg,
      tint: '#B0B0B0',
    },
    actor: {
      system: {
        traits: {
          size: 'med',
          languages: { custom: "Can't speak" },
          di: { value: ['nonmagic'] },
        },
        attributes: {
          movement: { walk: 0, climb: 0, fly: 20, hover: true },
        },
      },
    },
    embedded: {
      Item: {
        'Bite (Bat or Vampire Form Only)': warpgate.CONST.DELETE,
        Bite: warpgate.CONST.DELETE,
        'Unarmed Strike (Vampire Form Only)': warpgate.CONST.DELETE,
        'Unarmed Strike': warpgate.CONST.DELETE,
        'Multiattack (Vampire Form Only)': warpgate.CONST.DELETE,
      },
      ActiveEffect: {
        'Mist Form': {
          icon: 'icons/svg/acid.svg',
          changes: [
            {
              key: 'flags.midi-qol.advantage.ability.save.str',
              mode: 0,
              value: 1,
              priority: 0,
            },
            {
              key: 'flags.midi-qol.advantage.ability.save.dex',
              value: 1,
              mode: 0,
              priority: 0,
            },
            {
              key: 'flags.midi-qol.advantage.ability.save.con',
              value: 1,
              mode: 0,
              priority: 0,
            },
          ],
        },
      },
    },
  };
  const batForm = {
    mutation: 'Bat Form',
    token: {
      name: 'Vampire Bat',
      scale: 0.75,
      img: 'systems/dnd5e/tokens/beast/Bat.webp',
    },
    actor: {
      system: {
        traits: {
          size: 'tiny',
          languages: { custom: "Can't speak" },
        },
        attributes: {
          movement: { fly: 30, walk: 5, hover: true },
        },
      },
    },
    embedded: {
      Item: {
        'Unarmed Strike (Vampire Form Only)': warpgate.CONST.DELETE,
        'Unarmed Strike': warpgate.CONST.DELETE,
        'Multiattack (Vampire Form Only)': warpgate.CONST.DELETE,
      },
    },
  };

  const buttonData = {
    buttons: [
      {
        label: 'Bat Form',
        value: {
          update: batForm,
        },
      },
      {
        label: 'Cloud of Mist',
        value: {
          update: mistForm,
        },
      },
      {
        label: 'Vampire Form',
        value: {
          update: vampireForm,
        },
      },
    ],
  };
  let choice = await warpgate.buttonDialog(buttonData);
  console.log(choice);
  const options = {
    comparisonKeys: { ActiveEffect: 'label' },
    name: choice.update.mutation,
  };
  let updates = choice.update;

  async function transform(token) {
    new Sequence().animation().on(token).fadeOut(0).waitUntilFinished().play();

    await warpgate.revert(token.document);

    new Sequence()

      .sound()
      .file('modules/dnd5e-animations/assets/sounds/Spells/Fear.mp3') // sound file from D&D5E Animations module
      .volume(0.2)
      .timeRange(800, 2850)

      .effect()
      .file('jb2a.bats.loop.01.red')
      .atLocation(token)
      .size(3, { gridUnits: true })
      .playbackRate(1.5)
      .fadeOut(250)

      .effect()
      .file('jb2a.smoke.puff.centered.grey.0')
      .atLocation(token)
      .tint('#0a0a0a')

      .play();

    await warpgate.wait(100);
    await warpgate.mutate(token.document, updates, {}, options);

    new Sequence().animation().on(token).fadeIn(250).play();
  }

  // If the chosen form is neither Bat Form nor Cloud of Mist, revert the mutation
  await transform(token);
}
