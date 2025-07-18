// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the owner of the feat
// when himself or a creature within range is hit to allow him to add an AC bonus that could
// turn the hit into a miss.
// v4.2.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting],[tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction active effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// In the preTargeting (item OnUse) phase of the Gift of the Metallic Dragon item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isHit target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow check hits it re-executed to
//   taken into account the AC bonus and validate if the attack is still a hit.
// ###################################################################################################

export async function giftOfTheMetallicDragon({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
  options,
}) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Gift of the Metallic Dragon';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
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
    await handleTargetOnUseIsHitPost(workflow, token, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Gift of the Metallic Dragon item.
   * Validates that the reaction was triggered by the tpr.isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Gift of the Metallic Dragon item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by third party reaction effect
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isHit post reaction of the Gift of the Metallic Dragon item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, adds an AC bonus which could convert a hit on the target into a miss.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is hit.
   * @param {Item5e} sourceItem - The Gift of the Metallic Dragon item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(currentWorkflow, targetToken, sourceItem, thirdPartyReactionResult) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { thirdPartyReactionResult });
    }
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }

    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`, { sourceActor, targetToken });
      return;
    }

    const sourceToken = MidiQOL.tokenForActor(sourceActor);
    if (!sourceToken) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No source token could be found.`);
      }
      return;
    }

    // Recompute checkHits to take into account the AC bonus
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
