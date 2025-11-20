// ##################################################################################################
// Negative Energy Flood
// Applies the effect of the spell on the target.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [off]
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[preItemRoll],[preActiveEffects],[preCompleted]
//
// Usage:
// This spell needs to be used to activate. When cast, it damages the target unless it's an undead
// in which case it gives it temporary hit points. If the target dies from the damage,
// it rises as a zombie at the start of the caster's next turn.
//
// Description:
// In the preItemRoll phase of the Negative Energy Flood Cast activity (in owner's workflow):
//   Cancels the workflow if the selected target is an undead.
// In the preActiveEffects phase of the Negative Energy Flood Cast activity (in owner's workflow):
//   If the target is not dead, prevents applying the activity's associated AE.
// In the preComplete phase of the Negative Energy Flood Cast activity (in owner's workflow):
//   If the target is an undead and the workflow is aborted, executes the Heal Undead activity.
// In the "off" DAE macro call:
//   If the expiry reason is "times-up:expired" or "times-up:turnStartSource" executes the Rise As Zombie activity
//   on the actor on which the AE was applied.
// ###################################################################################################

// Default name of the spell
const DEFAULT_ITEM_NAME = "Negative Energy Flood";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  const dependencies = ["dae", "midi-qol"];
  if (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

/**
 * If the requirements are met, returns true, false otherwise.
 *
 * @param {string} name - The name of the item for which to check the dependencies.
 * @param {string[]} dependencies - The array of module ids which are required.
 *
 * @returns {boolean} true if the requirements are met, false otherwise.
 */
function requirementsSatisfied(name, dependencies) {
  let missingDep = false;
  dependencies.forEach((dep) => {
    if (!game.modules.get(dep)?.active) {
      const errorMsg = `${name} | ${dep} must be installed and active.`;
      ui.notifications.error(errorMsg);
      console.warn(errorMsg);
      missingDep = true;
    }
  });
  return !missingDep;
}

export async function negativeEnergyFlood({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preItemRoll") {
    if (scope.rolledActivity?.identifier === "cast") {
      return handleOnUsePreItemRoll(workflow);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
    if (scope.rolledActivity?.identifier === "cast") {
      return handleOnUsePreActiveEffects(workflow);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preCompleted") {
    if (scope.rolledActivity?.identifier === "cast") {
      await handleOnUsePreCompleted(workflow);
    }
  } else if (args[0] === "off") {
    await handleOffEffect(scope.lastArgValue, item);
  }
}

/**
 * Handles the on use postActiveEffects phase of the Negative Energy Flood of the Save activity.
 * If the target is an undead, aborts the workflow.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
function handleOnUsePreItemRoll(workflow) {
  if (MidiQOL.raceOrType(workflow.targets.first()) === "undead") {
    // Cancel save, this will instead trigger a heal.
    workflow.aborted = true;
    return false;
  }
}
/**
 * Handles the on use postActiveEffects phase of the Negative Energy Flood of the Cast activity.
 * If the target is not dead, prevents applying the activity's associated AE.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
function handleOnUsePreActiveEffects(workflow) {
  const target = workflow.hitTargets.first();
  if (!isTargetDead(workflow, target)) {
    return { haltEffectsApplication: true };
  }
}

/**
 * Handles the on use preCompleted phase of the Negative Energy Flood of the Cast activity.
 * If the target is an undead and the workflow is aborted, executes the Heal Undead activity.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUsePreCompleted(workflow) {
  if (!workflow.aborted || MidiQOL.raceOrType(workflow.targets.first()) !== "undead") {
    // Not an undead or not aborted do nothing.
    return false;
  }
  const healUndead = workflow.item.system.activities.find((a) => a.identifier === "heal-undead");
  if (!healUndead) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Item does not have the Heal Undead activity.`);
    }
    return;
  }
  await MidiQOL.completeActivityUse(healUndead, {}, {}, {});
}

/**
 * Handles the off effect of the Negative Energy Flood.
 * If the AE expiry reason is "times-up:expired" or "times-up:turnStartSource", excutes the Rise as Zombie activity
 * targeting the actor on which the AE was applied.
 *
 * @param {object} lastArg - The last argument value.
 * @param {Item5e} sourceItem - The Negative Energy Flood item.
 */
async function handleOffEffect(lastArg, sourceItem) {
  if (!["times-up:expired", "times-up:turnStartSource"].includes(foundry.utils.getProperty(lastArg, "expiry-reason"))) {
    // Not expired
    return;
  }
  // Call transorm activity
  const riseAsZombieActivity = await sourceItem.system.activities.find((a) => a.identifier === "rise-as-zombie");
  if (!riseAsZombieActivity) {
    console.warn(`${DEFAULT_ITEM_NAME} | Missing Rise as Zombie activity.`);
    return;
  }
  const config = {
    midiOptions: {
      targetUuids: [lastArg.tokenUuid],
    },
  };
  MidiQOL.completeActivityUse(riseAsZombieActivity, config, {}, {});
}

/**
 * Returns true if the target is considered dead.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Token5e} target - The target token to analyze.
 *
 * @returns {boolean} true if the target is considered dead, false otherwise.
 */
function isTargetDead(workflow, target) {
  if (!target?.actor) {
    return false;
  }
  if (!["character", "npc"].includes(target.actor.type)) {
    // Not a real actor
    return false;
  }
  if (target.actor.statuses.has("dead")) {
    // Target has dead status
    return true;
  }
  // Get damage item for token only if the old HP was not 0 already and the new is 0
  const damageItem = workflow.damageList?.find(
    (dmgItem) => dmgItem.targetUuid === target.document.uuid && dmgItem.oldHP !== 0 && dmgItem.newHP === 0
  );
  if (!damageItem) {
    return false;
  }
  // Note: use same logic has in dnd5e to detemrine is it's an important NPC
  const importantNpc =
    target.actor.type === "npc" &&
    (!foundry.utils.isEmpty(target.actor.classes) || target.actor.system.traits.important);
  if (importantNpc || target.actor.type === "character") {
    // if PC or important NPC check is massive damage rule applies
    const remainingDamage = damageItem.healingAdjustedTotalDamage - damageItem.hpDamage - damageItem.tempDamage;
    return remainingDamage >= target.actor.system.attributes.hp.max;
  } else {
    // Normal NPC
    return true;
  }
}
