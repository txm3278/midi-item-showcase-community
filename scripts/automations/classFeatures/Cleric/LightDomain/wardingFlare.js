// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within range attacks to allow him to add disadvantage on the attack to hit.
// v3.0.2
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting][tpr.isPreAttacked]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: RAW target should be Creature, but use Enemy to trigger reaction only on enemies.
//
// Description:
// In the preTargeting (item OnUse) phase of the reaction activity (in owner's workflow):
//   Validates that activity was triggered by the remote tpr.isPreAttacked target on use,
//   otherwise the activity workflow execution is aborted.
// In the tpr.isPreAttacked (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow is set to roll the attack with
//   disadvantage.
// ###################################################################################################

export async function wardingFlare({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Warding Flare';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol'];
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
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isPreAttacked.post') {
    handleTargetOnUseIsPreAttackedPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Warding Flare reaction activity workflow.
   * Validates that the reaction was triggered by the isPreAttacked phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5E} sourceItem - The Warding Flare item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isPreAttacked' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature attacks.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isPreAttacked post reaction of the Warding Flare item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, adds disadvantage to the attack roll.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Warding Flare item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  function handleTargetOnUseIsPreAttackedPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }
    if (currentWorkflow.actor.system?.traits?.ci?.value?.has('blinded')) {
      if (debug) {
        console.warn(`{DEFAULT_ITEM_NAME} | Attacker is immune to blindness.`);
      }
      return;
    }

    // Note: at this point midi as already evaluated its ADV/DIS flags, we need to update it
    // if already defined or add one if not.
    let disValue = currentWorkflow.attackAdvAttribution.find((i) => i.startsWith('DIS:attack.all'));
    if (disValue) {
      currentWorkflow.attackAdvAttribution.delete(disValue);
      disValue += ', ' + sourceItem.name;
    } else {
      disValue = 'DIS:attack.all ' + sourceItem.name;
    }
    currentWorkflow.attackAdvAttribution.add(disValue);
    currentWorkflow.disadvantage = true;
  }
}
