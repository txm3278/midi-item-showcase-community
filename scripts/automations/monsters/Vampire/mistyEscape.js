export async function mistyEscape({
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
  let tokenImg;
  if (game.modules.get('jb2a_patreon')?.active) {
    tokenImg =
      'modules/jb2a_patreon/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm';
  } else if (game.modules.get('JB2A_DnD5e')?.active) {
    tokenImg =
      'modules/JB2A_DnD5e/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm';
  }
  const imgPropName = game.version < 12 ? 'icon' : 'img';
  const mistForm = {
    mutation: 'Mist Form',
    token: {
      name: 'Cloud of Mist',
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
      // change these to match your items to be removed while in mist form
      Item: {
        'Bite (Bat or Vampire Form Only)': warpgate.CONST.DELETE,
        Bite: warpgate.CONST.DELETE,
        'Unarmed Strike (Vampire Form Only)': warpgate.CONST.DELETE,
        'Unarmed Strike': warpgate.CONST.DELETE,
        'Multiattack (Vampire Form Only)': warpgate.CONST.DELETE,
      },
      ActiveEffect: {
        'Mist Form': {
          [imgPropName]: 'icons/svg/acid.svg',
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

  let updates = mistForm;

  async function transform(token) {
    new Sequence().animation().on(token).fadeOut(0).waitUntilFinished().play();

    await warpgate.revert(token.document);

    new Sequence()

      .sound()
      .file('modules/dnd5e-animations/assets/sounds/Spells/Fear.mp3') // sound file from D&D5E Animations module
      .volume(0.2)
      //.fadeInAudio(100)
      //.fadeOutAudio(2000)
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
    await warpgate.mutate(token.document, updates, {});

    new Sequence().animation().on(token).fadeIn(250).play();
  }

  // If the chosen form is neither Bat Form nor Cloud of Mist, revert the mutation
  await transform(token);

  const targetUuid = game.user.targets.first()?.actor.uuid;
  if (
    targetUuid &&
    game.dfreds.effectInterface.hasEffectApplied('Dead', targetUuid)
  ) {
    await game.dfreds.effectInterface.removeEffect({
      effectName: 'Dead',
      uuid: targetUuid,
    });
  }
}
