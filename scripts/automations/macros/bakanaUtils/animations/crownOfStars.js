// Original animation author Xenophes
// Rewritten animation by @bakanabaka

/**
 * @param token The token this effect should occur on
 * @param effect The active effect this should be tied to if any, undefined if none
 * @param moteCount The number of motes to space equally around the token
 * @param id A unique name if for some reason more than one of this effect is run on this actor
 * @param file A JB2A animation to swirl around you
 * @param scale Scale factor for the animation
 */
function create(
  token,
  moteCount,
  {
    effect = undefined,
    id = 'Crown of Stars',
    file = 'jb2a.twinkling_stars.points07.white',
    scale = 0.5,
  } = {}
) {
  if (!macroUtil.dependsOn.hasRecommended({ id: 'sequencer' })) return;
  if (file.startsWith('jb2a.'))
    if (
      !macroUtil.dependsOn.hasSomeRecommended([
        { id: 'jb2a_patreon' },
        { id: 'JB2A_DnD5e' },
      ])
    )
      return;

  function rotateSprites(sequence) {
    sequence = sequence
      .effect()
      .file(file)
      .from(token, { cacheLocation: true });

    if (effect) sequence = sequence.tieToDocuments(effect);

    return sequence
      .attachTo(token)
      .scale(scale)
      .fadeIn(300)
      .fadeOut(500)
      .aboveLighting()
      .persist();
  }

  function loopDaLoop(sequence, objectName, delay) {
    return sequence.loopProperty(objectName, 'rotation', {
      from: 0,
      to: 360,
      duration: 5000,
      delay: delay,
    });
  }

  function createStarMoteEffect(sequence, idx) {
    sequence = rotateSprites(sequence);
    sequence = loopDaLoop(sequence, 'sprite', 500);
    sequence = loopDaLoop(sequence, 'spriteContainer', 0);
    return sequence
      .spriteOffset({ x: 0.5 }, { gridUnits: true })
      .rotate((360 / moteCount) * idx)
      .name(`${id} - ${idx}`);
  }

  let starsSequence = new Sequence();
  for (let idx = 1; idx <= moteCount; ++idx)
    starsSequence = createStarMoteEffect(starsSequence, idx);
  starsSequence.play();
}

async function remove(token, { id }, idx) {
  await Sequencer.EffectManager.endEffects({
    name: `${id} - ${idx}`,
    objects: token,
  });
}

async function destroy(token, { id }) {
  await Sequencer.EffectManager.endEffects({
    name: `${id} - *`,
    objects: token,
  });
}

export const crownOfStars = {
  create: create,
  remove: remove,
  destroy: destroy,
};
