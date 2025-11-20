// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Fighter
// when a creature within range is hit to allow him to add an AC bonus.
// v2.3.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor macro [preTargeting],[postActiveEffects],[tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: RAW target should be Creature, but use Ally to trigger reaction only on allies
//
// Description:
// In the preTargeting (item OnUse) phase of the Warding Maneuver item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isHit target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, recomputes the hit check if the target was hit
//   to include the AC bonus that was added.
// ###################################################################################################

export async function wardingManeuver({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = "Warding Maneuver";
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.3.0")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize(
      "midi-item-showcase-community.ElwinHelpersRequired"
    )}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isHit.post") {
    await handleTargetOnUseIsHitPost(workflow, token, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Warding Maneuver reaction activity workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5E} sourceItem - The Warding Maneuver item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== "tpr.isHit" ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature is hit.`;
      ui.notifications.warn(msg);
      return false;
    }

    foundry.utils.setProperty(currentWorkflow.workflowOptions, "fastForwardDamage", true);
    return true;
  }

  /**
   * Handles the tpr.isHit post reaction of the Warding Maneuver item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, recomputes if the target was hit to include
   * the AC bonus that was added.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is hit.
   * @param {Item5e} sourceItem - The Warding Maneuver item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(currentWorkflow, targetToken, sourceItem, thirdPartyReactionResult) {
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }

    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`, { sourceActor, targetToken });
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

    // Register postCleanup hook to delete added AE in case of a miss (there is no isMissed special duration)
    if (!currentWorkflow.hitTargets.has(targetToken)) {
      Hooks.once(`midi-qol.postCleanup.${currentWorkflow.itemUuid}`, async (currentWorkflow2) => {
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            "midi-qol.postCleanup",
            "'delete Bonus AC AE'",
            currentWorkflow,
            currentWorkflow2,
            debug
          )
        ) {
          return;
        }
        // Delete AE if it's still on the target (when attack was a hit but missed due to AE bonus)
        const effectId = targetToken.actor?.effects.find((ae) => ae.origin?.startsWith(sourceItem.uuid))?.id;
        if (effectId) {
          await MidiQOL.removeEffects({ actorUuid: targetToken.actor.uuid, effects: [effectId] });
        }
      });
    }
  }
}
