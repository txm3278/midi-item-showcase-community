// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Fighter
// when a creature within range is hit to allow him to add an AC bonus.
// v2.0.0
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
// In the postActiveEffects (item onUse) phase of Warding Maneuver item (in owner's workflow):
//   Applies an AE to add an AC bonus (using the rolled "damage") and damage resistance to the target.
// ###################################################################################################

export async function wardingManeuver({
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
  const DEFAULT_ITEM_NAME = 'Warding Maneuver';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '3.0'
    )
  ) {
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
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isHit.post'
  ) {
    await handleTargetOnUseIsHitPost(
      workflow,
      token,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    await handleOnUsePostActiveEffects(workflow, scope.macroItem);
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
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.options?.thirdPartyReaction?.activityUuids?.includes(
        currentWorkflow.activity?.uuid
      )
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature is hit.`;
      ui.notifications.warn(msg);
      return false;
    }

    foundry.utils.setProperty(
      currentWorkflow,
      'options.workflowOptions.fastForwardDamage',
      true
    );
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
  async function handleTargetOnUseIsHitPost(
    currentWorkflow,
    targetToken,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (
      !sourceItem.system.activities?.some(
        (a) => a.uuid === thirdPartyReactionResult?.uuid
      )
    ) {
      return;
    }

    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`,
        { sourceActor, targetToken }
      );
      return;
    }

    // Recompute checkHits to take into account the AC bonus
    currentWorkflow.checkHits({
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
      Hooks.once(
        `midi-qol.postCleanup.${currentWorkflow.itemUuid}`,
        async (currentWorkflow2) => {
          if (
            !elwinHelpers.isMidiHookStillValid(
              DEFAULT_ITEM_NAME,
              'midi-qol.postCleanup',
              "'delete Bonus AC AE'",
              currentWorkflow,
              currentWorkflow2,
              debug
            )
          ) {
            return;
          }
          // Delete AE if it's still on the target (when attack was a hit but missed due to AE bonus)
          const effectUuid = targetToken.actor?.effects.find((ae) =>
            ae.origin?.startsWith(sourceItem.uuid)
          )?.uuid;
          if (effectUuid) {
            await MidiQOL.socket().executeAsGM('removeEffect', { effectUuid });
          }
        }
      );
    }
  }

  /**
   * Handles the postActiveEffects of the Warding Maneuver item midi-qol workflow.
   * An AE is applied to add an AC bonus and damage resistance to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Warding Maneuver item.
   */
  async function handleOnUsePostActiveEffects(currentWorkflow, sourceItem) {
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
    if (currentWorkflow.aborted) {
      if (debug) {
        // Workflow was aborted do not trigger action
        console.warn(
          `${DEFAULT_ITEM_NAME} | Workflow was aborted, ${sourceItem.name} is also cancelled.`
        );
      }
      return;
    }

    const acBonus = currentWorkflow.utilityRolls?.reduce(
      (acc, r) => acc + r.total,
      0
    );
    if (acBonus === undefined) {
      if (debug) {
        // No AC bonus skip AE
        console.warn(`${DEFAULT_ITEM_NAME} | No AC bonus.`, {
          utilityRolls: currentWorkflow.utilityRolls,
        });
      }
      return;
    }

    // create an active effect on target for AC bonus and damage resistance in case it still hits.
    const duration = sourceItem.actor?.inCombat
      ? { turns: 1, rounds: 0 }
      : { seconds: 1 };
    const targetEffectData = {
      changes: [
        // Flag to add AC bonus
        {
          key: 'system.attributes.ac.bonus',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: acBonus,
          priority: 20,
        },
        // Flag to add damage resistance to all (the feature says damage from the attack,
        // so it should include any damage type done by the attack)
        {
          key: 'system.traits.dr.all',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: 'true',
          priority: 20,
        },
      ],
      transfer: false,
      origin: sourceItem.uuid, // flag the effect as associated to the source item used
      duration,
      img: sourceItem.img,
      name: `${sourceItem.name} - AC Bonus/Damage Resistance`,
      'flags.dae': { specialDuration: ['isHit'], stackable: 'noneName' },
    };

    await MidiQOL.socket().executeAsGM('createEffects', {
      actorUuid: targetActor.uuid,
      effects: [targetEffectData],
    });
  }
}
