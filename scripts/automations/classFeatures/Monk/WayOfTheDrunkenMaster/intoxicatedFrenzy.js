// ##################################################################################################
// Monk - Way of the Drunken Master - Intoxicated Frenzy
// When Flurry of Blows is used, informs the owner on the conditions needed to use the extra attacks granted by this feature.
// v1.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat. When Flurry of Blows is used, it informs the owner on the conditions needed to use
// the extra attacks granted by this feature.
//
// Description:
// In the postActiveEffects (item OnUse) phase of any item of the Intoxicated Frenzy item's owner (in owner's workflow):
//   If the activity used is Flurry of Blows, it informs the owner on the conditions needed to use
//   the extra attacks granted by this feature.
// In the flurryOfBlowsConditionalExtraAttacks (item OnUse) phase of Flurry of Blows item/activity (in owner's workflow):
//   Verifies if an extra attack can be made, the extra number of attacks done by this feat must be less or equal than 3 and
//   all attacked targets must be different. Also, the received nearby targets parameter is modified to remove the
//   targets that were already attacked.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Intoxicated Frenzy";
const MODULE_ID = "midi-item-showcase-community";
const KI_IDENT = "ki";
const FLURRY_OF_BLOWS_IDENT = "flurry-of-blows";
const MONKS_FOCUS_IDENT = "monks-focus";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.9")) {
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

export async function intoxicatedFrenzy({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    // Activates when Flurry of Blows is used
    if (isFlurryOfBlows(workflow)) {
      await handleOnUsePostActiveEffects(actor, workflow, scope.macroItem);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "flurryOfBlowsConditionalExtraAttacks") {
    return canMakeExtraAttack(
      scope.options?.nbStartingAttacks,
      scope.options?.attackedTargets,
      scope.options?.nearbyTargets,
    );
  }
}

/**
 * Handles the on use post active effects phase of the Flurry of Blows Item/activity.
 * Adds info to the Fluury of Blows chat message about the restrictions for the extra attacks granted by this feature.
 *
 * @param {Actor5e} actor - The owner of the Intoxicated Frenzy item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Intoxicated Frenzy item.
 */
async function handleOnUsePostActiveEffects(actor, workflow, sourceItem) {
  // Add info about additional attacks
  const infoMsg = `${sourceItem.name} allows you can make 3 more attacks but all attacks must be on different targets.`;
  await elwinHelpers.insertTextIntoMidiItemCard("beforeHitsDisplay", workflow, infoMsg);
}

/**
 * Returns true if the activity used is Flurry of Blows. It supports legacy and modern rules.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @returns {boolean} Indicates if the activity used is Flurry of Blows.
 */
function isFlurryOfBlows(workflow) {
  const rules = elwinHelpers.getRules(workflow.item);
  if (rules === "legacy") {
    return (
      (workflow.item?.identifier === KI_IDENT && workflow.activity?.identifier === FLURRY_OF_BLOWS_IDENT) ||
      workflow.item?.identifier === FLURRY_OF_BLOWS_IDENT
    );
  } else {
    return workflow.item?.identifier === MONKS_FOCUS_IDENT && workflow.activity?.identifier === FLURRY_OF_BLOWS_IDENT;
  }
}

/**
 * Evaluates if an extra Flurry of Blows attack can be made.
 *
 * @param {number} nbStartingAttacks - The number of attacks that has been made before the first call to this item.
 * @param {Token5e[]} attackedTargets - The list of tokens that have been attacked, it may contain duplicates if the same token was attacked more than once (should not be modified).
 * @param {Token5e[]} nearbyTargets - The list of nearby targets that can be attacked (can be modified to remove invalid targets for the item extra attacks).
 * @returns {boolean} True if an extra Flurry of Blows attack can be made, false otherwise.
 */
function canMakeExtraAttack(nbStartingAttacks, attackedTargets, nearbyTargets) {
  if (nbStartingAttacks === undefined || attackedTargets === undefined || nearbyTargets === undefined) {
    return false;
  }
  let tmpAttackedTargets = new Set(attackedTargets);
  if (tmpAttackedTargets.size !== attackedTargets.length) {
    return false;
  }
  if (attackedTargets.length - nbStartingAttacks >= 3) {
    return false;
  }
  // Remove already attacked targets from nearby targets
  for (let target of attackedTargets) {
    const index = nearbyTargets.indexOf(target);
    if (index > -1) {
      // only splice if the item is found
      nearbyTargets.splice(index, 1);
    }
  }
  return !!nearbyTargets.length;
}
