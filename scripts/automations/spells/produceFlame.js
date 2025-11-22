// ##################################################################################################
// Produce Flame
// Creates an AE that produces light and allows to hurl the flame on a creature ending the light effect.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [off]
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//
// Usage:
// This spell needs to be used to activate. When the cast activity is used it creates an AE that produces light and
// another activity allows to hurl the flame on a creature ending the light effect. A third activity combines
// the cast and hurl in the same action.
//
// Description:
// In the postActiveEffects phase of the Produce Flame Cast activity (in owner's workflow):
//   Sets the automationOnly flag to false on the Hurl Fire activity.
// In the postActiveEffects phase of the Produce Flame Cast and Hurl activity (in owner's workflow):
//    Registers a hook on midi-qol.RollComplete to execute the Hurl Fire activity.
// In the postActiveEffects phase of the Produce Flame Hurl Fire activity (in owner's workflow):
//   Deletes the Produce Flame AE from the actor.
// In the midi-qol.RollComplete hook (in owner's workflow):
//   Executes the Hurl Fire activity on a Produce Flame synthetic item on which the activation type
//   of the activity has been changed to special.
// In the "off" DAE macro call:
//   Sets the automationOnly flag to true on the Hurl Fire activity.
// ###################################################################################################

// Default name of the spell
const DEFAULT_ITEM_NAME = "Produce Flame";

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

export async function produceFlame({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    if (scope.rolledActivity?.identifier === "cast") {
      await handleOnUseCastPostActiveEffects(workflow);
    } else if (scope.rolledActivity?.identifier === "cast-and-hurl") {
      await handleOnUseCastAndHurlPostActiveEffects(workflow, debug);
    } else if (scope.rolledActivity?.identifier === "hurl-fire") {
      await handleOnUseHurlFirePostActiveEffects(workflow);
    }
  } else if (args[0] === "off") {
    // Hide Hurl Fire activity
    await item.system.activities
      .find((a) => a.identifier === "hurl-fire")
      ?.update({ "midiProperties.automationOnly": true });
  }
}

/**
 * Handles the on use postActiveEffects phase of the Produce Flame of the Cast activity.
 * Sets the automationOnly flag to false on the Hurl Fire activity.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUseCastPostActiveEffects(workflow) {
  const hurlFireActivity = workflow.item.system.activities.find((a) => a.identifier === "hurl-fire");
  if (!hurlFireActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Item does not have the Hurl Fire activity.`);
    }
    return;
  }
  await hurlFireActivity.update({ "midiProperties.automationOnly": false });
}

/**
 * Handles the on use postActiveEffects phase of the Produce Flame of the Cast and Hurl Fire activity.
 * Registers a hook on midi-qol.RollComplete to execute the Hurl Fire activity on a synthetic item
 * on which the activation type of the activity has been changed to special.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUseCastAndHurlPostActiveEffects(workflow, debug) {
  const hurlFireActivity = workflow.item.system.activities.find((a) => a.identifier === "hurl-fire");
  if (!hurlFireActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Item does not have the Hurl Fire activity.`);
    }
    return;
  }

  // Create a modified synthetic modified feature to change the hurl fire activity action type
  const produceFlameItemData = workflow.item.toObject();
  produceFlameItemData._id = foundry.utils.randomID();
  foundry.utils.setProperty(
    produceFlameItemData,
    `system.activities.${hurlFireActivity.id}.activation.type`,
    "special"
  );
  foundry.utils.setProperty(produceFlameItemData, "flags.midi-qol.syntheticItem", true);

  const produceFlameCopy = new Item.implementation(produceFlameItemData, { parent: workflow.item.actor });
  // Need to prepare data because constructor does not.
  produceFlameCopy.prepareData();
  produceFlameCopy.prepareFinalAttributes();
  produceFlameCopy.applyActiveEffects();

  const config = {
    midiOptions: {
      activityId: hurlFireActivity.id,
      workflowOptions: { targetConfirmation: "always" },
    },
  };
  if (workflow.targets.has(workflow.token)) {
    // Clear current selected token because it's the caster, this will force selection of another target.
    canvas.tokens?.setTargets([workflow.tokenId], { mode: "release" });
    config.midiOptions.targetUuids = [];
  }

  // Register hook to call hurl fire after roll is complete
  Hooks.once(`midi-qol.RollComplete.${workflow.itemUuid}`, async (workflow2) => {
    if (
      !elwinHelpers.isMidiHookStillValid(
        DEFAULT_ITEM_NAME,
        "midi-qol.RollComplete",
        produceFlameItemData.name,
        workflow,
        workflow2,
        debug
      )
    ) {
      return;
    }
    await MidiQOL.completeItemUse(produceFlameCopy, config, {}, {});
  });
}

/**
 * Handles the on use postActiveEffects phase of the Produce Flame of the Hurl Fire activity.
 * Deletes the Produce Flame AE from the actor.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUseHurlFirePostActiveEffects(workflow) {
  await workflow.actor.effects.find((ae) => ae.name === workflow.item.name)?.delete();
}
