// ##################################################################################################
// Author: Elwin#1410 based on SagaTympana version
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Artificer
// when a creature within range rolls a saving throw or ability check to allow them to add a bonus on the roll.
// v2.3.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item/actor macro [preActiveEffects][tpr.isPostCheckSave]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction activity that gets triggered by the third party reaction effect when appropriate or it can be triggered manually.
//
// Description:
// In the preActiveEffects (item OnUse) phase of the activity (in owner's workflow):
//   Validates that the activity was triggered manually otherwise it disables the application of the bonus AE.
// In the tpr.isPostCheckSave (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, a bonus is added to the target save roll,
//   and the success is reevaluated, then the workflow's save data for the target is updated accordingly.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Flash of Genius";

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

export async function flashOfGenius({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
    return handleOnUsePreActiveEffects(workflow);
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isPostCheckSave.post") {
    await handleTargetOnUseIsPostCheckSavePost(workflow, scope.macroItem, token, scope.options?.thirdPartyReactionResult);
  }
}

/**
 * Handles the preActiveEffects phase of the Flash of Genius activity.
 * Disables the application of AE on target when the reaction is not triggered manually.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @return {{haltEffectsApplication: true}|undefined} If not triggered manually returns an object to stop midi from applying the AE,
 *                                                    otherwise undefined.
 */
function handleOnUsePreActiveEffects(workflow) {
  // Apply AE on target only when reaction is triggered manually.
  if (workflow.workflowOptions?.isReaction) {
    return { haltEffectsApplication: true };
  }
}

/**
 * Handles the tpr.isPostCheckSave post reaction of the Flash of Genius activity in the triggering midi-qol workflow.
 * If the reaction was used and completed successfully, adds the int bonus to the rolled check and revalidates if it
 * can transform a failed check into a success.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Flash of Genius item.
 * @param {Token5e} target - The target.
 * @param {Promise<object>} thirdPartyReactionResult - The third party reaction result.
 */
async function handleTargetOnUseIsPostCheckSavePost(workflow, sourceItem, target, thirdPartyReactionResult) {
  if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
    return;
  }
  const sourceActor = sourceItem.actor;
  if (!sourceActor) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
    return;
  }

  const saveDisplayDatum = workflow.saveDisplayData.find((sdd) => sdd.target === target);
  let saveRoll = workflow.tokenSaves[target.document?.uuid ?? "none"];
  if (!saveDisplayDatum || !saveRoll || workflow.saveDC === undefined) {
    console.warn(
      `${DEFAULT_ITEM_NAME} | No saveDisplayData found for the target, missing saveRoll or missing saveDC.`,
      {
        workflow,
        target,
      },
    );
    return;
  }

  const abilityMod = sourceActor.getRollData().abilities?.int?.mod ?? 0;
  const bonusRoll = await new Roll(`${abilityMod}`).evaluate();
  saveRoll = MidiQOL.addRollTo(saveRoll, bonusRoll);

  workflow.tokenSaves[target.document.uuid] = saveRoll;
  saveDisplayDatum.rollTotal = String(saveRoll.total);
  saveDisplayDatum.rollHTML = await MidiQOL.midiRenderRoll(saveRoll);

  if (workflow.failedSaves?.has(target) && !workflow.fumbleSaves?.has(target)) {
    // validate if the added bonus makes the save successful
    if (saveRoll.total < workflow.saveDC) {
      // Nothing to do, it still fails
      return;
    }
    // Change data from failed to success
    workflow.failedSaves.delete(target);
    workflow.saves?.add(target);

    saveDisplayDatum.saveSymbol =
      saveDisplayDatum.saveSymbol !== ""
        ? (target.actor?.hasPlayerOwner ? "" : "midi-qol-npc-save-symbol") + " midi-qol-save-symbol fa-check"
        : "";
    saveDisplayDatum.saveClass = saveDisplayDatum.saveClass !== "" ? "success" : "";
  }
}
