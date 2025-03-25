// ##################################################################################################
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Bard
// when an ally or himself forces a creature to roll a saving throw. When doing so, the saving
// throw ability is changed to Charisma and if the target fails its save it takes extra damage.
// v2.1.1
// Author: Elwin#1410
// Dependencies:
//  - DAE, macro [off]
//  - Times Up
//  - MidiQOL "on use" item macro,[preTargeting][preActiveEffects][tpr.isPreCheckSave]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: A scale dice value must be configured on the 'Bard' class,
//       its data value should resolve to '@scale.bard.bardic-inspiration'.
//       Need to set reaction activity consumption to Bardic Inspiration item when added to an actor
//
// Description:
// In the preTargeting (item OnUse) phase of the reaction activity (in owner's workflow):
//   Validates that activity was triggered manually or by the remote tpr.isPreCheckSave target on use,
//   otherwise the activity workflow execution is aborted.
// In the tpr.isPreCheckSave (TargetOnUse) post macro (in attacker's workflow) (on target):
//   If the reaction was used and completed successfully, changes the save item ability to Charisma
//   and registers a hook to damage the target if the target failed its save after the current workflow has completed.
// In the midi-qol.RollComplete hook (in attacker's workflow):
//   If the target failed its save, inflict it extra damage using the Sorrowful Fate item's damage activity
//   executed on the feat onwer's client.
// If the Sorrowful Fate AE on the target expires [off]:
//   If the expiry reason is because the target reached 0 HP, a chat message is created to remind the
//   target to die in a dramatic way.
// ###################################################################################################

export async function sorrowfulFate({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Sorrowful Fate';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3.0')) {
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
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preActiveEffects') {
    // Validates that the item is the damage activity
    if (workflow.activity?.type === 'damage') {
      return await handleOnUsePreActiveEffects(workflow);
    }
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isPreCheckSave.post') {
    handleTargetOnUseIsPreCheckSavePost(workflow, scope.macroItem, token, options?.thirdPartyReactionResult);
  } else if (args[0] === 'off') {
    if (foundry.utils.getProperty(scope.lastArgValue, 'expiry-reason') !== 'midi-qol:zeroHP') {
      // Not expired due to zero HP
      return;
    }
    // Output a chat message to remind actor of making a scene while dying
    const player = MidiQOL.playerForActor(actor);
    const tokenName = (MidiQOL.configSettings().useTokenNames ? token.name : actor.name) ?? '<unknown>';
    await ChatMessage.create({
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: `${tokenName} is magically compelled to utter darkly poetic final words before succumbing from their injuries`,
      speaker: { user: game.users.activeGM },
      whisper: player ? [player.id] : [],
    });
  }

  /**
   * Handles the preTargeting phase of the Sorrowful Fate activity.
   * If the activity is a reaction, validates that the reaction was triggered by the isPreCheckSave phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sorrowful Fate item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (currentWorkflow.activity?.type !== 'utility') {
      return true;
    }
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isPreCheckSave' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature forces another creature to make a saving throw.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the preActiveEffects phase of the 'Sorrowful Fate - Damage' item midi-qol workflow.
   * Disables the application of AE on target when it already has 0 HP.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @return {{haltEffectsApplication: true}|undefined} If target has 0 HP returns an object to stop midi from applying the AE,
   *                                                    otherwise undefined.
   */
  async function handleOnUsePreActiveEffects(currentWorkflow) {
    // Do not apply AE on target when it has 0 HP.
    const targetToken = currentWorkflow.targets.first();
    if (targetToken?.actor?.system?.attributes?.hp?.value === 0) {
      // Output a chat message to remind actor of making a scene while dying
      const player = MidiQOL.playerFor(targetToken);
      const tokenName =
        (MidiQOL.configSettings().useTokenNames ? targetToken.name : targetToken.actor?.name) ?? '<unknown>';
      await ChatMessage.create({
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: `${tokenName} is magically compelled to utter darkly poetic final words before succumbing from their injuries`,
        speaker: { user: game.users.activeGM },
        whisper: player ? [player.id] : [],
      });
      return { haltEffectsApplication: true };
    }
  }

  /**
   * Handles the tpr.isPreCheckSave post reaction of the Sorrowful Fate item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, changes the current save item ability to Charisma and
   * registers a hook to inflict extra damage on a failed save.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sorrowful Fate item.
   * @param {Token5e} target - The target.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  function handleTargetOnUseIsPreCheckSavePost(currentWorkflow, sourceItem, target, thirdPartyReactionResult) {
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }
    if (!currentWorkflow.saveActivity?.save) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Activity is not a save.`, currentWorkflow);
      }
      return;
    }
    // Change save ability to Charisma
    // TODO check if saveItem from this item or another one (e.g.: ammunitions) ....
    const updates = {};
    foundry.utils.setProperty(
      updates,
      `system.activities.${currentWorkflow.saveActivity.id}.save.ability`,
      new Set(['cha'])
    );

    // TODO support saveActivity on other item???
    if (currentWorkflow.saveActivity.item.id === currentWorkflow.item.id) {
      currentWorkflow.item = currentWorkflow.item.clone(updates, { keepId: true });
      currentWorkflow.activity = currentWorkflow.item.system.activities.get(currentWorkflow.activity.id);
    }

    // Register hook to call extra damage after roll is complete if the save was failed
    Hooks.once(`midi-qol.RollComplete.${currentWorkflow.itemUuid}`, async (currentWorkflow2) => {
      if (
        !elwinHelpers.isMidiHookStillValid(
          DEFAULT_ITEM_NAME,
          'midi-qol.RollComplete',
          `${sourceItem.name} - Damage`,
          currentWorkflow,
          currentWorkflow2,
          debug
        )
      ) {
        return;
      }
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | midi-qol.RollComplete.`, { currentWorkflow });
      }
      if (!currentWorkflow.failedSaves?.has(target)) {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | The target succeeded on its saving throw, no extra damage.`, {
            currentWorkflow,
            target,
          });
        }
        return;
      }

      const sourceActor = sourceItem.actor;
      const bonusDamageActivity = sourceItem.system.activities?.find((a) => a.identifier === 'damage');
      if (!bonusDamageActivity) {
        console.warn(`${DEFAULT_ITEM_NAME} | Could not find valid the damage activity for ${sourceItem.name}.`);
        return;
      }

      let player = MidiQOL.playerForActor(sourceActor);
      if (!player?.active) {
        // Find first active GM player
        player = game.users?.activeGM;
      }
      if (!player?.active) {
        console.warn(`${DEFAULT_ITEM_NAME} | No active player or GM for actor.`, sourceActor);
        return;
      }

      const usage = {
        midiOptions: {
          targetUuids: [target.document.uuid],
          configureDialog: false,
          workflowOptions: { fastForwardDamage: true, targetConfirmation: 'none' },
        },
      };

      const data = {
        activityUuid: bonusDamageActivity.uuid,
        actorUuid: sourceActor.uuid,
        usage,
      };

      await MidiQOL.socket().executeAsUser('completeActivityUse', player.id, data);
    });
  }
}
