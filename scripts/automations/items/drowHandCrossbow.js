// ##################################################################################################
// Read First!!!!
// On hit applies the Drow Poison effect.
// v1.1.1
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "on use" item macro, [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// ON hit applies the Drow Poison effect, including extra unconscious status when save failed by 5 or more.
//
// Description:
// In the postActiveEffects (OnUse) phase (of the Drow Hand Crossbow):
//   Adds the unconscious status if the target failed its save by 5 or more.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Drow Hand Crossbow";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (foundry.utils.isNewerVersion("3.5.11", globalThis?.elwinHelpers?.version ?? "1.1")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "midi-qol"];
  if (game.release.generation < 14) {
    dependencies.push("times-up");
  }
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function drowHandCrossbow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    await handleOnUsePostActiveEffects(workflow, scope.rolledItem);
  }
}

/**
 * Handles the application of the coating effect activity when a coated weapon or ammo hits.
 *
 * @param {MidiQOL.Workflow} workflow - The MidiQOL current workflow.
 * @param {Item} coatedItem - The Drow Hand Crossbow.
 */
async function handleOnUsePostActiveEffects(workflow, coatedItem) {
  if (!workflow.hitTargets?.size || workflow.aborted) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No target hit or workflow was aborted.`, workflow);
    }
    return;
  }

  const appliedCoating = {
    conditionalStatuses: [
      {
        status: "unconscious",
        specialDurations: ["isDamaged"],
        condition: "target?.statuses?.poisoned && (targetData?.saveTotal + 5) <= targetData?.saveDC",
      },
    ],
  };
  const target = workflow.hitTargets.first();
  elwinHelpers.coating.handleCoatingEffectActivityConditionalStatuses(workflow, coatedItem, target, appliedCoating);
}
