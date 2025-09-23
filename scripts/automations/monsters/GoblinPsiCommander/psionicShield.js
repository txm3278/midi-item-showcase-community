// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the owner of the feat
// when himself or a creature within range is hit to allow him to add an AC bonus that could
// turn the hit into a miss.
// v2.2.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting],[tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction active effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: RAW target should be Creature, but use Ally to trigger reaction only on allies.
//
// Description:
// In the preTargeting (OnUse) phase of the Psionic Shield reaction activity (in owner's workflow):
//   Validates that the activity was triggered by the remote tpr.isHit target on use,
//   otherwise the activity workflow execution is aborted.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow check hits is re-executed to
//   take into account the AC bonus and validates if the attack is still a hit.
// ###################################################################################################

export async function psionicShield({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Psionic Shield';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
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
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isHit.post') {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    // Other target, handle reaction
    await handleTargetOnUseIsHitPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Psionic Shield reaction activity.
   * Validates that the reaction was triggered by the tpr.isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Psionic Shield item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.some((u) =>
        sourceItem.system.activities?.some((a) => a.uuid === u)
      )
    ) {
      // Reaction should only be triggered by third party reaction effect
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isHit post reaction of the Psionic Shield item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, re-execute checkHits to see if the added AC bonus
   * could convert a hit on the target into a miss.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Psionic Shield item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { thirdPartyReactionResult });
    }
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }

    // Reset hitTargets and recompute checkHits to take into account the AC bonus
    // TODO Remove when fixed in midi-qol
    currentWorkflow.hitTargets = new Set();
    await currentWorkflow.checkHits({
      noProvokeReaction: true,
      noOnUseMacro: true,
      noTargetOnuseMacro: true,
    });
    // Adjust attack roll target AC, it is used by dnd5e chat message to display the attack result
    elwinHelpers.adjustAttackRollTargetAC(currentWorkflow);
    // Redisplay attack roll for new result
    await currentWorkflow.displayAttackRoll();
  }
}
