// ##################################################################################################
// Monk - Way of the Astral Self - Awakened Astral Self
// Adds the Awakened effects and summons the Arms, Visage and Body of the Astral Self.
// v1.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//
// Usage:
// This item needs to be used to activate. When activated, it adds a bonus to AC and summons at no cost Arms, Visage
// and Body of the Astral Self.
//
// Description:
// In the postActiveEffects phase of the Awakened Astral Self Summon activity (in owner's workflow):
//   Applies its bonus to AC AE and summons Arms, Visage and Body of the Astral Self at no cost.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Awakened Astral Self";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  const dependencies = ["dae", "times-up", "midi-qol"];
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

export async function awakenedAstralSelf({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    if (scope.rolledActivity?.identifier === "summon") {
      await handleOnUsePostActiveEffects(actor, workflow);
    }
  }
}

/**
 * Handles the postActiveEffects of the Awakened Astral Self Summon activity.
 * Summons Arms, Visage and Body of the Astral Self at no cost.
 *
 * @param {Actor5e} sourceActor - The owner of the Awakened Astral Self item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUsePostActiveEffects(sourceActor, workflow) {
  const summonItemIdentifiers = ["arms-of-the-astral-self", "visage-of-the-astral-self", "body-of-the-astral-self"];
  const partsToSummon = sourceActor.itemTypes.feat
    .filter((i) => summonItemIdentifiers.includes(i.identifier))
    .sort((a, b) => indexOfIdentifier(summonItemIdentifiers, a) - indexOfIdentifier(summonItemIdentifiers, b));

  for (let summonItem of partsToSummon) {
    let summonActivity = summonItem.system.activities.find((a) => a.identifier === "summon");
    if (!summonActivity) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing summon activity in ${summonItem}`, partsToSummon);
      continue;
    }

    // Create a synthetic modified feature to change the summon activity action type and consumption
    const summonItemData = summonItem.toObject();
    summonItemData._id = foundry.utils.randomID();
    foundry.utils.setProperty(summonItemData, `system.activities.${summonActivity.id}.activation.type`, "");
    foundry.utils.setProperty(summonItemData, `system.activities.${summonActivity.id}.consumption.targets`, []);
    foundry.utils.setProperty(summonItemData, "flags.midi-qol.syntheticItem", true);

    summonItem = new Item.implementation(summonItemData, { parent: sourceActor });
    // Need to prepare data because constructor does not.
    summonItem.prepareData();
    summonItem.prepareFinalAttributes();
    summonItem.applyActiveEffects();

    const config = {
      midiOptions: {
        activityId: summonActivity.id,
        targetUuids: [workflow.tokenUuid],
        workflowOptions: { targetConfirmation: "none", autoConsumeResource: "never", awakenedAstralSelf: true },
      },
    };
    await MidiQOL.completeItemUse(summonItem, config, { configure: false }, {});
  }
}

/**
 * Finds the index of the specified item in the array of item identifiers.
 *
 * @param {Array<string>} identifiers - Array of item identifiers.
 * @param {Item5e} item - The item for which to find its index in the identifiers.
 * @returns {numer} index of item in the identifiers, -1 if not found.
 */
function indexOfIdentifier(identifiers, item) {
  return identifiers.findIndex((value, index) => value === item.identifier);
}
