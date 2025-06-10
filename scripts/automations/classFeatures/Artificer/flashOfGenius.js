// ##################################################################################################
// Author: Elwin#1410 based on SagaTympana version
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Artificer
// when a creature within range rolls a saving throw or ability check to allow them to add a bonus on the roll.
// v2.1.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item/actor macro [preTargeting][preActiveEffects][tpr.isPostCheckSave]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction activity that gets triggered by the third party reaction effect when appropriate or it can be triggered manually.
//
// Description:
// In the preTargeting (item OnUse) phase of the activity (in owner's workflow):
//   Validates that activity was triggered manually or by the remote tpr.isPostCheckSave target on use,
//   otherwise the activity workflow execution is aborted.
// In the preActiveEffects (item OnUse) phase of the activity (in owner's workflow):
//   Validates that the activity was triggered manually otherwise it disables the application of the bonus AE.
// In the tpr.isPostCheckSave (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, a bonus is added to the target save roll,
//   and the success is reevaluated, then the workflow's save data for the target is updated accordingly.
// ###################################################################################################

export async function flashOfGenius({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Flash of Genius';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    // MidiQOL OnUse item macro for Flash of Genius
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preActiveEffects') {
    return handleOnUsePreActiveEffects(workflow);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isPostCheckSave.post') {
    await handleTargetOnUseIsPostCheckSavePost(workflow, scope.macroItem, token, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Flash of Genius activity.
   * Validates that the reaction was triggered manually or by the tpr.isPostCheckSave target on use.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Flash of Genius item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.isReaction &&
      (currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isPostCheckSave' ||
        !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid))
    ) {
      // Reaction should only be triggered by third party reaction AE or manually
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature needs to roll a save or an ability test.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the preActiveEffects phase of the Flash of Genius activity.
   * Disables the application of AE on target when the reaction is not triggered manually.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @return {{haltEffectsApplication: true}|undefined} If not triggered manually returns an object to stop midi from applying the AE,
   *                                                    otherwise undefined.
   */
  function handleOnUsePreActiveEffects(currentWorkflow) {
    // Apply AE on target only when reaction is triggered manually.
    if (currentWorkflow.workflowOptions?.isReaction) {
      return { haltEffectsApplication: true };
    }
  }

  /**
   * Handles the tpr.isPostCheckSave post reaction of the Flash of Genius activity in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, adds the int bonus to the rolled check and revalidates if it
   * can transform a failed check into a success.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Flash of Genius item.
   * @param {Token5e} target - The target.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsPostCheckSavePost(currentWorkflow, sourceItem, target, thirdPartyReactionResult) {
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }
    const sourceActor = sourceItem.actor;
    if (!sourceActor) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
      return;
    }

    const saveDisplayDatum = currentWorkflow.saveDisplayData.find((sdd) => sdd.target === target);
    if (!saveDisplayDatum || !saveDisplayDatum?.rollDetail || currentWorkflow.saveDC === undefined) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | No saveDisplayData found for the target, missing rollDetail or missing saveDC.`,
        {
          currentWorkflow,
          target,
        }
      );
      return;
    }

    const abilityMod = sourceActor.getRollData().abilities?.int?.mod ?? 0;
    const bonusRoll = await new Roll(`${abilityMod}`).evaluate();
    saveDisplayDatum.rollDetail = MidiQOL.addRollTo(saveDisplayDatum.rollDetail, bonusRoll);

    saveDisplayDatum.rollTotal += abilityMod;
    saveDisplayDatum.rollHTML = await MidiQOL.midiRenderRoll(saveDisplayDatum.rollDetail);

    // TODO support fumble on saves???
    if (currentWorkflow.failedSaves?.has(target)) {
      // validate if the added bonus makes the save successful
      if (saveDisplayDatum.rollTotal < currentWorkflow.saveDC) {
        // Nothing to do, it still fails
        return;
      }
      // Change data from failed to success
      currentWorkflow.failedSaves.delete(target);
      currentWorkflow.saves?.add(target);

      saveDisplayDatum.saveString = game.i18n.localize('midi-qol.save-success');
      saveDisplayDatum.saveSymbol = 'fa-check';
      saveDisplayDatum.saveClass = 'success';
    }
  }
}
