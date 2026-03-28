// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Fighter
// when a creature within range is hit to allow him to add an AC bonus.
// v2.4.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor macro [tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: RAW target should be Creature, but use Ally to trigger reaction only on allies
//
// Description:
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, recomputes the hit check if the target was hit
//   to include the AC bonus that was added.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Warding Maneuver";

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

export async function wardingManeuver({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isHit.post") {
    await handleTargetOnUseIsHitPost(workflow, token, scope.macroItem, scope.options?.thirdPartyReactionResult, debug);
  }
}

/**
 * Handles the tpr.isHit post reaction of the Warding Maneuver item in the triggering midi-qol workflow.
 * If the reaction was used and completed successfully, recomputes if the target was hit to include
 * the AC bonus that was added.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Token5e} targetToken - The target token that is hit.
 * @param {Item5e} sourceItem - The Warding Maneuver item.
 * @param {object} thirdPartyReactionResult - The third party reaction result.
 * @param {boolean} debug - Flag indicating if debug mode is enabled.
 */
async function handleTargetOnUseIsHitPost(workflow, targetToken, sourceItem, thirdPartyReactionResult, debug) {
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
  workflow.hitTargets = new Set();
  await workflow.checkHits({
    noProvokeReaction: true,
    noOnUseMacro: true,
    noTargetOnuseMacro: true,
  });
  // Adjust attack roll target AC, it is used by dnd5e chat message to display the attack result
  elwinHelpers.adjustAttackRollTargetAC(workflow);
  // Redisplay attack roll for new result
  await workflow.displayAttackRoll();

  // Register postCleanup hook to delete added AE in case of a miss (there is no isMissed special duration)
  if (!workflow.hitTargets.has(targetToken)) {
    Hooks.once(`midi-qol.postCleanup.${workflow.itemUuid}`, async (workflow2) => {
      if (
        !elwinHelpers.isMidiHookStillValid(
          DEFAULT_ITEM_NAME,
          "midi-qol.postCleanup",
          "'delete Bonus AC AE'",
          workflow,
          workflow2,
          debug,
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
