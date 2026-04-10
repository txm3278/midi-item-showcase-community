// ##################################################################################################
// Read First!!!!
// Allows to stabilize a creature without the need to roll a Medecine check.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// When used, it stabilizes a target without the need to roll a Medecine check.
//
// Description:
// In the postActiveEffects (OnUse) phase of Healer's Kit - Stabilize activity (in owner's workflow):
//   Calls elwinHelpers.stabilize to stabilize the target.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Healer's Kit";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.12")) {
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

export async function healersKit({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    await elwinHelpers.stabilize(workflow.hitTargets?.first()?.actor, scope.rolledActivity);
  }
}
