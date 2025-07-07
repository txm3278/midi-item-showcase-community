// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect, that effect will trigger a reaction by the Paladin
// when a creature within range is damaged to allow him to use the feature to take the target's damage instead.
// v4.0.2
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preTargeting],[postActiveEffects],[tpr.isDamaged]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction activity that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting (item OnUse) phase of the activity (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isDamaged target on use,
//   otherwise the activity workflow execution is aborted.
// In the postActiveEffects (item onUse) phase of the activity (in owner's workflow):
//   The total damage to be taken for the target specified in a flag is applied to the owner's hp
//   and the flag is unset.
// In the tpr.isDamaged (TargetOnUse) pre macro (in attacker's workflow) (on other target):
//   Sets a flag on the feature's actor with the total damage to be applied to the target.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, the target's damage is reduced to zero.
// ###################################################################################################

export async function divineAllegiance({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Divine Allegiance';
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
    // MidiQOL OnUse item macro for Divine Allegiance
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isDamaged.pre') {
    // MidiQOL TargetOnUse pre macro for Divine Allegiance pre reaction
    return await handleTargetOnUseIsDamagedPre(workflow, scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isDamaged.post') {
    // MidiQOL TargetOnUse post item macro for Divine Allegiance post reaction
    handleTargetOnUseIsDamagedPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    // MidiQOL OnUse item macro for Divine Allegiance
    await handleOnUsePostActiveEffects(workflow, actor);
  }

  /**
   * Handles the preTargeting phase of the Divine Allegiance activity.
   * Validates that the reaction was triggered by the tpr.isDamaged target on use.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Divine Allegiance item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
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
   * Handles the tpr.isDamaged pre macro of the Divine Allegiance activity in the triggering midi-qol workflow.
   * Sets a flag on the owner with the damage to be taken, will be used by the reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Divine Allegiance item.
   *
   * @returns {object} undefined when all conditions are met, an object with skip attribute to true if the reaction must be skipped.
   */
  async function handleTargetOnUseIsDamagedPre(currentWorkflow, sourceItem) {
    const sourceActor = sourceItem.actor;

    if (!sourceActor) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
      return { skip: true };
    }
    // Set damage to be applied, to be available for remote reaction
    const totalDamage = currentWorkflow.damageItem.damageDetail.reduce(
      (acc, d) => acc + (['temphp', 'midi-none'].includes(d.type) ? 0 : d.value),
      0
    );
    const preventedDmg = totalDamage;
    currentWorkflow.divineAllegianceAppliedDmg = preventedDmg;
    await DAE.setFlag(sourceActor, 'divineAllegianceAppliedDmg', preventedDmg);
  }

  /**
   * Handles the tpr.isDamaged post macro of the Divine Allegiance activity.
   * If the reaction was used and completed successfully, reduces the item's owner hp by the amount of damage that the target would have taken.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Divine Allegiance item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  function handleTargetOnUseIsDamagedPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
    const preventedDmg = currentWorkflow.divineAllegianceAppliedDmg;
    if (sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid) && preventedDmg) {
      elwinHelpers.reduceAppliedDamage(currentWorkflow.damageItem, preventedDmg, sourceItem);
    }
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
        result: thirdPartyReactionResult,
        damageItem: currentWorkflow.damageItem,
        preventedDmg,
      });
    }
  }

  /**
   * Handles the postActiveEffects phase of the Divine Allegiance activity.
   * The owner of the feature HP's are reduced by the damage to be applied to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Actor5e} sourceActor - The owner of the Divine Allegiance item.
   */
  async function handleOnUsePostActiveEffects(currentWorkflow, sourceActor) {
    const targetToken = currentWorkflow.targets.first();
    if (!targetToken) {
      // No target found
      return;
    }
    const targetActor = targetToken.actor;
    if (!targetActor) {
      // No actor found
      return;
    }
    const appliedDmg = DAE.getFlag(sourceActor, 'divineAllegianceAppliedDmg');
    await sourceActor.applyDamage(appliedDmg);
    await DAE.unsetFlag(sourceActor, 'divineAllegianceAppliedDmg');

    const infoMsg = `<p>You take <strong>${appliedDmg}</strong> points of damage instead to <strong>\${tokenName}</strong>.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard(
      'beforeButtons',
      workflow,
      elwinHelpers.getTargetDivs(targetToken, infoMsg)
    );
  }
}
