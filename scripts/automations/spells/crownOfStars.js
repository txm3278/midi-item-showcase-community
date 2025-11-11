// ##################################################################################################
// Read First!!!!
// Creates animations of star motes around the caster (if Sequencer is avaialble) and allows to make a
// special attack with a star mote which removes one mote each time. When no star mote remains the spell
// is ended.
// v2.0.2
// Author: Elwin#1410, based on Bakana and Xenophes
// Dependencies:
//  - DAE [off]
//  - MidiQOL "on use" item macro [preItemRoll],[postActiveEffects]
//  - Elwin Helpers world script
//  - Active Token Effects
//  - Sequencer (optional)
//  - JB2A free or patreon (optional)
//
// Usage:
//  When cast, star motes appears around the caster (if Sequencer is available) and a Star Mote Attack
//  activity is made available to be used to make attacks with the star motes.
//
// Description:
// In the preItemRoll (OnUse) phase of the Crown of Stars Start Mote Attack activity (in owner's workflow):
//   Disables dialog configuration, otherwise by default prompts to upcast which is not doable for this activity.
// In the postActiveEffects (OnUse) phase of the Crown of Stars Cast activity (in owner's workflow):
//   Makes the Star Mote Attack activity available and creates an animation (when sequencer is available) for the star motes.
// In the postActiveEffects (OnUse) phase of the Crown of Stars Start Mote Attack activity (in owner's workflow):
//   Removes a star mote and adjust the animation if one exists, it also updates the light emitted when there are 3 stars or less remaining.
// In the off phase:
//   Reverts the changes done to the Crown of Stars item when it was cast.
// ###################################################################################################

export async function crownOfStars({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Crown of Stars';
  const MODULE_ID = 'midi-item-showcase-community';
  const ANIMATION_FILE = 'jb2a.twinkling_stars.points07.white';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol', 'ATL'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    if (workflow.activity?.identifier === 'star-mote-attack') {
      // Disable dialog configuration that displays upcasting choice which should not be available for the attack.
      foundry.utils.setProperty(options, 'dialog.configure', false);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (workflow.activity?.identifier === 'cast') {
      await handleCastOnUsePostActiveEffects(workflow, actor, scope.macroItem, token);
    } else if (workflow.activity?.identifier === 'star-mote-attack') {
      await handleStartMoteAttackOnUsePostActiveEffects(actor, scope.macroItem, token);
    }
  } else if (args[0] === 'off') {
    // DAE off item macro for Crown of Stars effect
    await handleOffEffect(actor, token, scope.macroActivity?.item ?? scope.macroItem);
  }

  /**
   * Makes the Star Mote Attack activity available and creates an animation (when sequencer is available) for the star motes.
   *
   * @param {MidiQOL.workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Actor5e} sourceActor - The actor casting the spell.
   * @param {Item5e} sourceItem - The Corwn of Stars item.
   * @param {Token5e} sourceToken - The token associated to the actor.
   */
  async function handleCastOnUsePostActiveEffects(currentWorkflow, sourceActor, sourceItem, sourceToken) {
    const moteCount = 2 * (currentWorkflow.castData?.castLevel ?? 7) - 7;
    const effectUniqueName = `[${sourceActor.id}] ${sourceItem.identifier}`;

    const starMoteAttackActivity = sourceItem.system.activities?.find((a) => a.identifier === 'star-mote-attack');
    if (!starMoteAttackActivity) {
      console.error(`${sourceItem.name} | Missing Star Mote Attack activity.`);
      return;
    }
    const effect = sourceActor.effects.find((ae) =>
      ae.changes.find((c) => c.key === `flags.${MODULE_ID}.crownOfStarsMotes`)
    );
    if (!effect) {
      console.error(`${sourceItem.name} | Missing Crown of Stars effect.`);
      return;
    }

    const changes = foundry.utils.deepClone(effect.changes);
    changes.find((ch) => ch.key === `flags.${MODULE_ID}.crownOfStarsMotes`).value = JSON.stringify(
      [...Array(moteCount).keys()].map((i) => i + 1)
    );
    await effect.update({ changes: changes });
    await starMoteAttackActivity.update({ 'midiProperties.automationOnly': false });
    await currentWorkflow.activity.update({ 'midiProperties.automationOnly': true });

    // Create animation
    createStartMotesAnimation(sourceToken, moteCount, {
      effect: effect,
      id: effectUniqueName,
      file: ANIMATION_FILE,
    });
  }

  /**
   * Removes a star mote and adjust the animation if one exists, it also updates
   * the light emitted when there are 3 stars or less remaining.
   *
   * @param {Actor5e} sourceActor - The actor attacking with a Start Mote.
   * @param {Item5e} sourceItem - The Crown of Stars item.
   * @param {Token5e} sourceToken - The token associated to the actor.
   */
  async function handleStartMoteAttackOnUsePostActiveEffects(sourceActor, sourceItem, sourceToken) {
    const effectUniqueName = `[${sourceActor.id}] ${sourceItem.identifier}`;

    // Determine at random which star mote to remove, and update remaining array accordingly.
    const remainingStars = foundry.utils.deepClone(sourceActor.getFlag(MODULE_ID, 'crownOfStarsMotes'));
    const randomIndex = Math.floor(Math.random() * remainingStars.length);
    const randomStar = remainingStars[randomIndex];
    remainingStars[randomIndex] = remainingStars[remainingStars.length - 1];
    remainingStars.pop();

    // Update the AE accordingly
    const effect = sourceActor.effects.find((ae) =>
      ae.changes.some((ch) => ch.key === `flags.${MODULE_ID}.crownOfStarsMotes`)
    );
    if (!effect) {
      console.error(`${sourceItem.name} | Missing Crown of Stars effect.`);
      return;
    }
    const changes = foundry.utils.deepClone(effect.changes);
    changes.find((ch) => ch.key === `flags.${MODULE_ID}.crownOfStarsMotes`).value = JSON.stringify(remainingStars);
    if (remainingStars.length <= 3) {
      // Remove bright light emission and reduce the dim one
      const brightIndex = changes.findIndex((ch) => ch.key === 'ATL.light.bright');
      if (brightIndex >= 0) {
        changes.splice(brightIndex, 1);
      }
      changes.find((ch) => ch.key === 'ATL.light.dim').value = '30';
    }
    await effect.update({ changes: changes });

    await removeOneStarMoteAnimation(sourceToken, effectUniqueName, randomStar);

    // Delete effect when no star remains.
    if (!remainingStars.length) {
      await effect?.delete();
    }
  }

  /**
   * Reverts changes that were done to the item on casting of the spell.
   *
   * @param {Actor5e} souceActor - The actor on which the effect was removed.
   * @param {Token5e} sourceToken - The token associated to the actor.
   * @param {Item5e} sourceItem - The Crown of Stars item.
   */
  async function handleOffEffect(sourceActor, sourceToken, sourceItem) {
    const starMoteAttackActivity = sourceItem.system.activities?.find((a) => a.identifier === 'star-mote-attack');
    if (!starMoteAttackActivity) {
      console.error(`${sourceItem.name} | Missing Star Mote Attack activity.`);
    }
    const castActivity = sourceItem.system.activities?.find((a) => a.identifier === 'cast');
    if (!castActivity) {
      console.error(`${sourceItem.name} | Missing Cast activity.`);
    }
    await starMoteAttackActivity?.update({ 'midiProperties.automationOnly': true });
    await castActivity?.update({ 'midiProperties.automationOnly': false });
  }

  /**
   * Creates multiple star mote animations on the specified token.
   *
   * @param {Token5e} token - The token this effect should occur on.
   * @param {number} moteCount The number of motes to space equally around the token.
   * @param {object} options - Animation options.
   * @param {ActiveEffect} options.effect - The active effect this should be tied to if any, undefined if none.
   * @param {string} options.id - A unique name if for some reason more than one of this effect is run on this actor.
   * @param {string} options.file - A JB2A animation to swirl around the token.
   * @param {string} options.scale - Scale factor of the animation.
   * @param {string} options.radius - Radius of the circle animation.
   */
  function createStartMotesAnimation(
    token,
    moteCount,
    {
      effect = undefined,
      id = DEFAULT_ITEM_NAME,
      file = 'jb2a.twinkling_stars.points07.white',
      scale = 0.5,
      radius = 0.5,
    } = {}
  ) {
    if (!game.modules.get('sequencer')?.active) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Sequencer not available, no animation will be created.`);
      }
      return;
    }
    if (file.startsWith('jb2a.')) {
      if (!foundry.utils.hasProperty(Sequencer.Database.entries, 'jb2a')) {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | No animation registered for one starting with jb2a.`);
        }
        return;
      }
    }

    // This helper creates and configures a single mote effect section.
    function createMote(idx) {
        const moteEffect = new Sequence()
            .effect()
            .file(file)
            .attachTo(token)
            .scale(scale)
            .fadeIn(300)
            .fadeOut(500)
            .aboveLighting()
            .persist()
            .name(`${id} - ${idx}`)
            .spriteOffset({ x: radius }, { gridUnits: true })
            .rotate((360 / moteCount) * idx);

        // Tie to an Active Effect if one is provided
        if (effect) {
            moteEffect.tieTo(effect);
        }

        // Add looping rotations
        moteEffect.loopProperty("sprite", "rotation", { from: 0, to: 360, duration: 5000, delay: 500 });
        moteEffect.loopProperty("spriteContainer", "rotation", { from: 0, to: 360, duration: 5000, delay: 0 });

        return moteEffect;
    }

    // Create a sequence and add each mote to it.
    const starsSequence = new Sequence();
    for (let idx = 1; idx <= moteCount; idx++) {
        starsSequence.addSequence(createMote(idx));
    }
    starsSequence.play();
  }

  /**
   * Removes one of the star mote animation from the specified token.
   *
   * @param {Token5e} token - The token on which the animations were created.
   * @param {string} id - Base identifier of the star motes animations.
   * @param {number} idx - Index of star mote animation.
   */
  async function removeOneStarMoteAnimation(token, id, idx) {
    if (game.modules.get('sequencer')?.active) {
      await Sequencer.EffectManager.endEffects({
        name: `${id} - ${idx}`,
        objects: token,
      });
    }
  }
}
