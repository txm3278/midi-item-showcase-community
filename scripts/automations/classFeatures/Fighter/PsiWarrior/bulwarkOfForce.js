// ##################################################################################################
// Fighter - Psi Warrior - Bulwark of Force
// Allows to apply a psychic shield to one or more targets.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item needs to be used to activate either as a free action or one that consumes a Psionic Energy die.
// When activated, it adds a psychic shield to targets. If the owner becomes incapacitated, the effects
// are removed from the targets.
//
//
// Description:
// In the postActiveEffects phase of the Bulwark of Force - Raise Shield activity (in owner's workflow):
//   Makes all applied Psychic Shield effects dependent on the effect that handles deletion when the owner is incapacitated.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Bulwark of Force";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.10")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function bulwarkOfForce({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (scope.rolledActivity.identifier === "raise-shield") {
      handleOnUsePostActiveEffects(workflow, actor);
    }
  }
}

/**
 * Handles the on use post active effects phase of the Bulwark of Force - Raise Shield activity.
 * Makes all applied Psychic Shield effects dependent on the effect that handles deletion when owner is incapacitated.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor} actor - The owner of the Bulwark of Force item.
 */
function handleOnUsePostActiveEffects(workflow, actor) {
  const effectToRemoveWhenIncapacitated = actor.effects.find(
    (ae) => ae.flags?.dae?.selfTargetAlways && ae.origin?.startsWith(workflow.item.uuid),
  );
  if (!effectToRemoveWhenIncapacitated) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing effect to remove applied Psychic Shield when incapacitated.`, {
      actor,
    });
    return;
  }
  for (let target of workflow.effectTargets) {
    const psychicShieldEffect = target?.actor.effects?.find(
      (ae) => !ae.flags?.dae?.selfTargetAlways && ae.origin?.startsWith(workflow.item.uuid),
    );
    if (psychicShieldEffect) {
      MidiQOL.addDependent(effectToRemoveWhenIncapacitated, psychicShieldEffect);
    }
  }
}
