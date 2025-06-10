// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect, that effect will trigger a reaction by the Paladin when a creature within range
// is damaged to allow him to use the feature to apply retribution damage to the attacker.
// v2.2.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preTargeting],[tpr.isDamaged]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
// Note: RAW target should be Creature, but use Ally to trigger reaction on allies only
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting (item OnUse) phase of the reaction activity or retribution activity (in owner's workflow):
//   If save activity continue execution.
//   Else validates that item was triggered by the remote tpr.isDamaged target on use,
//   otherwise the activity workflow execution is aborted.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, registers a hook to apply the retribution damage
//   to the attacker after the current workflow has completed.
// In the midi-qol.RollComplete hook (in attacker's workflow):
//   The retribution activity is used to apply the retribution damage to the attacker on the Rebuke the Violent item owner's client.
// ###################################################################################################

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
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Channel Divinity: Rebuke the Violent';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
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
    // MidiQOL OnUse item macro for Rebuke the Violent
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isDamaged.post') {
    // MidiQOL TargetOnUse post item macro for Rebuke the Violent post reaction
    await handleTargetOnUseIsDamagedPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Rebuke the Violent item.
   * Validates that the reaction was triggered by the tpr.isDamaged target on use.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Rebuke the Violent item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (currentWorkflow.activity?.type !== 'reaction') {
      return true;
    }
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isDamaged' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by aura
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature of the Paladin is damaged.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isDamaged post macro of the Rebuke the Violent item.
   * If the reaction was used and completed successfully, an activity is used to apply the retribution damage to the attacker.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Rebuke the Violent item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsDamagedPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }
    const sourceActor = sourceItem.actor;

    if (!sourceActor) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
      return;
    }

    // Set damage to be applied, to be available for remote reaction
    const totalDamage =
      currentWorkflow.damageItem?.damageDetail?.reduce(
        (acc, d) => acc + (['temphp', 'midi-none'].includes(d.type) ? 0 : d.value),
        0
      ) ?? 0;
    if (!(totalDamage > 0)) {
      // No damage dealt
      return;
    }
    // Build the retribution damage to apply to the attacker.
    // Damage the attacker
    const retributionActivity = sourceItem.system.activities?.find((a) => a.identifier === 'retribution-damage');
    if (!retributionActivity) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Could not find valid the save activity for retribution.`);
      }
      return;
    }
    // Save current retribution damage for formula in activity
    await DAE.setFlag(sourceActor, 'rebukeTheViolentRetributionDmg', totalDamage);

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
        targetUuids: [currentWorkflow.tokenUuid],
        configureDialog: false,
        workflowOptions: { autoRollDamage: 'always', fastForwardDamage: true },
        targetConfirmation: 'none',
      },
    };

    const data = {
      activityUuid: retributionActivity.uuid,
      actorUuid: sourceActor.uuid,
      usage,
    };

    // Register hook to call retribution damage after roll is complete
    Hooks.once(`midi-qol.RollComplete.${currentWorkflow.itemUuid}`, async (currentWorkflow2) => {
      if (
        !elwinHelpers.isMidiHookStillValid(
          DEFAULT_ITEM_NAME,
          'midi-qol.RollComplete',
          retributionActivity.name,
          currentWorkflow,
          currentWorkflow2,
          debug
        )
      ) {
        return;
      }
      await MidiQOL.socket().executeAsUser('completeActivityUse', player.id, data);
    });
  }
}
