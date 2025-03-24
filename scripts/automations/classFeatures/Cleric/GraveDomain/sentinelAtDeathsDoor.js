// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within range is hit by a critical to allow him to convert it to a normal hit.
// v4.0.2
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting],[tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
// Note: RAW target should be Creature, but use Ally to trigger reaction only on allies
//
// Description:
// In the preTargeting (item OnUse) phase of the Sentinel at Death's Door reaction activity (in owner's workflow):
//   Validates that activity was triggered by the remote tpr.isHit target on use,
//   otherwise the activity workflow execution is aborted.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow critical hit is converted to
//   a normal hit.
// ###################################################################################################

export async function sentinelAtDeathsDoor({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = "Sentinel at Death's Door";
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  const dependencies = ['dae', 'midi-qol'];
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
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
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isHit.post') {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    await handleTargetOnUseIsHitPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Sentinel at Death's Door reaction activity.
   * Validates that the reaction was triggered by the tpr.isHit remote reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sentinel at Death's Door item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by third party reaction
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isHit post macro of the Sentinel at Death's Door item.
   * If the reaction was used and completed successfully, converts a critical hit on the target into a normal hit.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sentinel at Death's Door item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { thirdPartyReactionResult });
    }
    if (sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      // Convert critical hits into normal hit
      await elwinHelpers.convertCriticalToNormalHit(currentWorkflow);
    }
  }
}
