// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within range is hit by a critical to allow him to convert it to a normal hit.
// v4.2.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
// Note: RAW target should be Creature, but use Ally to trigger reaction only on allies
//
// Description:
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow critical hit is converted to
//   a normal hit.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Sentinel at Death's Door";

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
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function sentinelAtDeathsDoor({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isHit.post") {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    await handleTargetOnUseIsHitPost(workflow, scope.macroItem, scope.options?.thirdPartyReactionResult, debug);
  }
}

/**
 * Handles the tpr.isHit post macro of the Sentinel at Death's Door item.
 * If the reaction was used and completed successfully, converts a critical hit on the target into a normal hit.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Sentinel at Death's Door item.
 * @param {object} thirdPartyReactionResult - The third party reaction result.
 * @param {boolean} debug - Flag to indicate if debug mode is enabled.
 */
async function handleTargetOnUseIsHitPost(workflow, sourceItem, thirdPartyReactionResult, debug) {
  if (debug) {
    console.warn(DEFAULT_ITEM_NAME + " | reaction result", { thirdPartyReactionResult });
  }
  if (sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
    // Convert critical hits into normal hit
    await elwinHelpers.convertCriticalToNormalHit(workflow);
  }
}
