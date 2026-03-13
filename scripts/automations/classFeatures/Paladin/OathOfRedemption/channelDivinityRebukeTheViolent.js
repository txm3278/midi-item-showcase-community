// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect, that effect will trigger a reaction by the Paladin when a creature within range
// is damaged to allow him to use the feature to apply retribution damage to the attacker.
// v2.4.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [tpr.isDamaged]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
// Note: RAW target should be Creature, but use Ally to trigger reaction on allies only
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, registers a hook to apply the retribution damage
//   to the attacker after the current workflow has completed.
// In the midi-qol.RollComplete hook (in attacker's workflow):
//   The retribution activity is used to apply the retribution damage to the attacker on the Rebuke the Violent item owner's client.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Channel Divinity: Rebuke the Violent";

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
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function channelDivinityRebukeTheViolent({
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

  if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isDamaged.post") {
    // MidiQOL TargetOnUse post item macro for Rebuke the Violent post reaction
    await handleTargetOnUseIsDamagedPost(workflow, scope.macroItem, scope.options?.thirdPartyReactionResult, debug);
  }
}

/**
 * Handles the tpr.isDamaged post macro of the Rebuke the Violent item.
 * If the reaction was used and completed successfully, an activity is used to apply the retribution damage to the attacker.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Rebuke the Violent item.
 * @param {object} thirdPartyReactionResult - The third party reaction result.
 * @param {boolean} debug - Flag to indicate if debug mode is enabled.
 */
async function handleTargetOnUseIsDamagedPost(workflow, sourceItem, thirdPartyReactionResult, debug) {
  if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
    return;
  }
  const sourceActor = sourceItem.actor;

  if (!sourceActor) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
    return;
  }

  // Set damage to be applied, to be available for remote reaction
  const totalDamage = workflow.damageItem?.totalDamage ?? 0;
  if (!(totalDamage > 0)) {
    // No damage dealt
    return;
  }
  // Build the retribution damage to apply to the attacker.
  // Damage the attacker
  const retributionActivity = sourceItem.system.activities?.find((a) => a.identifier === "retribution-damage");
  if (!retributionActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Could not find valid the save activity for retribution.`);
    }
    return;
  }
  // Save current retribution damage for formula in activity
  await DAE.setFlag(sourceActor, "rebukeTheViolentRetributionDmg", totalDamage);

  // Send the item roll to user's client, after the completion of this workflow
  let player = MidiQOL.playerForActor(sourceActor);
  if (!player?.active) {
    // Find first active GM player
    player = game.users?.activeGM;
  }
  if (!player) {
    console.error(`${DEFAULT_ITEM_NAME} | Could not find player for actor ${sourceActor}`);
    return;
  }

  const usage = {
    midiOptions: {
      targetUuids: [workflow.tokenUuid],
      configureDialog: false,
      workflowOptions: { autoRollDamage: "always", fastForwardDamage: true },
      targetConfirmation: "none",
    },
  };

  const data = {
    activityUuid: retributionActivity.uuid,
    actorUuid: sourceActor.uuid,
    usage,
  };

  // Register hook to call retribution damage after roll is complete
  Hooks.once(`midi-qol.RollComplete.${workflow.itemUuid}`, async (workflow2) => {
    if (
      !elwinHelpers.isMidiHookStillValid(
        DEFAULT_ITEM_NAME,
        "midi-qol.RollComplete",
        retributionActivity.name,
        workflow,
        workflow2,
        debug,
      )
    ) {
      return;
    }
    await MidiQOL.socket().executeAsUser("completeActivityUse", player.id, data);
  });
}
