// ##################################################################################################
// Monk - Way of the Drunken Master - Intoxicated Frenzy
// When Flurry of Blows is used, informs the owner on the conditions needed to use the extra attacks granted by this feature.
// If CPR is active, updates the allowed number of Flurry of Blows attacks.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [on],[off]
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat. When Flurry of Blows is used, it informs the owner on the conditions needed to use
// the extra attacks granted by this feature. If CPR is active, also increases the allowed number of Flurry of Blows attacks.
//
// Description:
// In the postActiveEffects (item OnUse) phase of any item of the Intoxicated Frenzy item's owner (in owner's workflow):
//   If the activity used is Flurry of Blows, it informs the owner on the conditions needed to use
//   the extra attacks granted by this feature.
//   If CPR is active increases the Flurry of Blows number of attacks if it was not already increased.
// In the "on" DAE macro call:
//   If CPR is active, increases the Flurry of Blows number of attacks if it was not already increased.
// In the "off" DAE macro call:
//   If CPR is active, removes the added Flurry of Blows extra attacks.
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
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.8")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize(
      "midi-item-showcase-community.ElwinHelpersRequired"
    )}`;
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
      arguments
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    // Activates when Flurry of Blows is used
    if (isFlurryOfBlows(workflow)) {
      await handleOnUsePostActiveEffects(actor, workflow, scope.macroItem);
    }
  } else if (args[0] === "on") {
    adjustFlurryOfBlowsAttacks(actor, null, true);
  } else if (args[0] === "off") {
    adjustFlurryOfBlowsAttacks(actor, null, false);
  }
}

/**
 * Handles the on use post active effects phase of the Flurry of Blows Item/activity.
 * Adds info to the Fluury of Blows chat message about the restrictions for the extra attacks granted by this feature
 * and if CPR is active, adjust the number of attacks for Flurry of Blows.
 *
 * @param {Actor5e} actor - The owner of the Intoxicated Frenzy item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Intoxicated Frenzy item.
 */
async function handleOnUsePostActiveEffects(actor, workflow, sourceItem) {
  // TODO increase number of flurry of blows attacks
  // Add info about additional attacks
  const infoMsg = `${sourceItem.name} allows you can make 3 more attacks but all attacks must be on different targets.`;
  await elwinHelpers.insertTextIntoMidiItemCard("beforeHitsDisplay", workflow, infoMsg);
  await adjustFlurryOfBlowsAttacks(actor, workflow.item, true);
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
 * If CPR is active, adjust the number of attacks for Flurry of Blows, either adding extra attacks them or removing them.
 *
 * @param {Actor5e} actor - The actor owner of the Intoxicated Frenzy feature.
 * @param {Item5e} item - The item for Flurry of Blows, if not specified, it is fetched from the actor.
 * @param {boolean} increase - Flag to indicate if the extra attacks should be added or removed from Flurry of Blows.
 */
async function adjustFlurryOfBlowsAttacks(actor, item, increase) {
  if (!game.modules.get("chris-premades")?.active) {
    return;
  }
  let effectiveItem = item;
  if (!effectiveItem) {
    const items = actor.items.filter(
      (i) =>
        (i.identifier === KI_IDENT &&
          elwinHelpers.getRules(i) === "legacy" &&
          i.system.activities.some((a) => a.identifier === FLURRY_OF_BLOWS_IDENT)) ||
        (i.identifier === FLURRY_OF_BLOWS_IDENT && elwinHelpers.getRules(i) === "legacy") ||
        (i.identifier === MONKS_FOCUS_IDENT &&
          elwinHelpers.getRules(i) === "modern" &&
          i.system.activities.some((a) => a.identifier === FLURRY_OF_BLOWS_IDENT))
    );
    if (!items.length) {
      // No Flurry of Blows item or activity
      return;
    }
    effectiveItem = items[0];
  }
  if (effectiveItem.identifier !== MONKS_FOCUS_IDENT) {
    // Note: Currently CPR only supports modern Monk class and Flurry of Blows
    return;
  }

  const origAttacks = effectiveItem.getFlag(MODULE_ID, "intoxicatedFrenzyFlurryOfBlowsAttacks");
  const attacks = chrisPremades.utils.itemUtils.getConfig(effectiveItem) ?? 2;
  if (increase) {
    if (!origAttacks) {
      await effectiveItem.setFlag(MODULE_ID, "intoxicatedFrenzyFlurryOfBlowsAttacks", attacks);
      await chrisPremades.utils.itemUtils.setConfig(effectiveItem, attacks + 3);
      return;
    }
    // Adjust to have a diff of 3
    const diff = attacks - origAttacks;
    if (diff === 3) {
      // Nothing to do, was already set
    } else if (diff < 3) {
      // Adjust to have at least 3 more attacks
      await chrisPremades.utils.itemUtils.setConfig(effectiveItem, attacks + (3 - diff));
    }
    // Otherwise do nothing, something else added attacks
  } else {
    if (!origAttacks) {
      // Nothing to do, was not set
      return;
    }
    const diff = attacks - origAttacks;
    // Adjust to remove at least 3 more attacks, minimum original value
    await effectiveItem.unsetFlag(MODULE_ID, "intoxicatedFrenzyFlurryOfBlowsAttacks");
    await chrisPremades.utils.itemUtils.setConfig(effectiveItem, origAttacks + Math.max(diff - 3, 0));
  }
}
