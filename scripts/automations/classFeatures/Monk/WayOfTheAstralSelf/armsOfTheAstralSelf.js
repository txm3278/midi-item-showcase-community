// ##################################################################################################
// Monk - Way of the Astral Self - Arms of the Astral Self
// Summons spectral hands and adds a new attack to the Unarmed Strike weapon to use these arms instead.
// v2.1.0
// Author: Elwin#1410 based on Spoob
// Dependencies:
//  - DAE
//  - MidiQOL "OnUseMacro" ItemMacro[preItemRoll],[preAoETargetConfirmation],[postActiveEffects]
//
// Usage:
// This item needs to be used to activate. When activated the selected targets around must succeed on a Dex save or
// take damage from the summoned spectral hands, a new activity is added to the Unarmed Strike to allow
// using the spectral arms to make an attack and an effect is added to use Wis modifier instead of Str modifier
// on Str ability checks and saves.
//
// Description:
// In the preAoETargetConfirmation phase of the Arms of the Astral Self Summon activity (in owner's workflow):
//   Filters the user's currently selected targets to only keep enemies that can be seen by the attacker.
// In the postActiveEffects phase of the Arms of the Astral Self Summon activity (in owner's workflow):
//   It applies an enchantement to the Unarmed Strike to add a new attack allowing to use the Spectral Hands
//  instead.
// In the preItemRoll phase of the Unarmed Strike Attack with Spectral Hands activity (in owner's workflow):
//   If it's the attacker's turn, increase the item and the activity reach.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = 'Arms of the Astral Self';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.2')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function armsOfTheAstralSelf({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse') {
    // Remove target that cannot be seen and only keep enemies by default
    if (scope.rolledActivity?.identifier === 'summon') {
      if (args[0].macroPass === 'preAoETargetConfirmation') {
        handleOnUsePreAoETargetConfirmation(token);
      } else if (args[0].macroPass === 'postActiveEffects') {
        await handleOnUsePostActiveEffects(actor, workflow, scope);
      }
    } else if (scope.rolledActivity?.identifier === 'attack-with-spectral-arms')
      if (args[0].macroPass === 'preItemRoll') {
        handleOnUsePreItemRoll(token, workflow);
      }
  }
}

/**
 * Handles the on use pre AoE target confirmation phase of the Arms of the Astral Self of the Summon activity.
 * Filters the user's currently selected targets to only keep enemies that can be seen by the attacker.
 *
 * @param {Token5e} token - The token associated to the actor using the activity.
 */
function handleOnUsePreAoETargetConfirmation(token) {
  const targetIds = Array.from(game.user?.targets ?? [])
    .filter((t) => (token?.document?.disposition ?? 1) * t.document.disposition < 0 && MidiQOL.canSee(token, t))
    .map((t) => t.id);
  if (!game.user) {
    return;
  }
  if (game.release.generation > 12) {
    canvas.tokens?.setTargets(targetIds);
  } else {
    game.user?.updateTokenTargets(targetIds);
    game.user?.broadcastActivity({ targets: targetIds });
  }
}

/**
 * Handles the on use post active effects phase of the Arms of the Astral Self of the Summon activity.
 * It applies an enchantement to the Unarmed Strike to add a new attack allowing to use the Spectral Arms instead.
 *
 * @param {Actor5e} actor - The owner of the Arms of the Astral Self item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 */
async function handleOnUsePostActiveEffects(actor, workflow, scope) {
  const selfEffect = actor.effects.find((a) => a.origin === scope.rolledActivity.uuid);
  if (!selfEffect) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Arms Of the Astral Self effect`, { workflow });
    return;
  }

  const unarmedStrike = actor.itemTypes.weapon.find((a) => a.identifier === 'unarmed-strike');
  if (!unarmedStrike) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Unarmed Strike item`, { workflow });
    return;
  }

  const applyArmsActivity = scope.rolledItem.system.activities.find(
    (a) => a.identifier === 'apply-arms-to-unarmed-strike'
  );
  if (!applyArmsActivity) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Apply Arms to Unarmed Strike activity`, { workflow });
    return;
  }

  const enchantmentEffectData = applyArmsActivity.effects?.[0]?.effect.toObject();
  if (!enchantmentEffectData) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing enchantment effect`, { workflow });
    return;
  }

  // Add enchantment to unarmed strike
  const enchantmentEffect = await elwinHelpers.applyEnchantmentToItemFromOtherActivity(
    workflow,
    applyArmsActivity,
    enchantmentEffectData,
    unarmedStrike
  );
  if (!enchantmentEffect) {
    console.error(`${DEFAULT_ITEM_NAME} | Enchantment effect could not be created.`, enchantmentEffectData);
    return;
  }

  // Add dependency on each other
  await selfEffect.addDependent(enchantmentEffect);
  // Note: We need to wait because addDependent on the enchantment riders are not awaited....
  await wait(5);
  await enchantmentEffect.addDependent(selfEffect);

  let attAbility = 'str';
  if (actor.system.abilities.dex.mod >= Math.max(actor.system.abilities.str.mod, actor.system.abilities.wis.mod)) {
    attAbility = 'dex';
  } else if (
    actor.system.abilities.wis.mod >= Math.max(actor.system.abilities.str.mod, actor.system.abilities.dex.mod)
  ) {
    attAbility = 'wis';
  } else if (
    actor.system.abilities.str.mod >= Math.max(actor.system.abilities.dex.mod, actor.system.abilities.wis.mod)
  ) {
    attAbility = 'str';
  }
  await unarmedStrike.system.activities
    ?.find((a) => a.identifier === 'attack-with-spectral-arms')
    ?.update({
      'attack.ability': attAbility,
      'midiProperties.automationOnly': false,
      'damage.includeBase': false,
    });

  ui.notifications.notify('Attack with Spectral Arms added to Unarmed Strike.');
}

/**
 * Handles the on use pre item roll phase of the Unarmed Strike of the Attack with Spectral Arms activity.
 * Increases the reach by 5' if it's the token's combat turn.
 *
 * @param {Token5e} token - The token associated to the actor using the activity.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
function handleOnUsePreItemRoll(token, workflow) {
  // Update spectral arms reach flag if it's the actor's turn
  if (token?.combatant?.id === game.combat?.combatant?.id) {
    if (workflow.item?.system.range?.reach) {
      // This is needed to be taken into account by the item and activity preparedData
      workflow.item.actor._embeddedPreparation = true;
      workflow.item.updateSource({ 'system.range.reach': workflow.item.system.range.reach + 5 });
      delete workflow.item.actor._embeddedPreparation;
      workflow.item.prepareFinalAttributes();
      workflow.activity = workflow.item.system.activities.get(workflow.activity.id);
    }
  }
}

/**
 * Wait for the specified number of milliseconds.
 *
 * @param {number} ms number of ms to wait.
 */
async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
