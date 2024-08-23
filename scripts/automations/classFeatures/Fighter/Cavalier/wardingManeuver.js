// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Fighter
// when a creature within range is hit to allow him to add an AC bonus.
// v1.0.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor macro [preTargeting][postActiveEffects][tpr.isHit]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction only on allies)
//   - Range: 5 feet
//   - Limited Uses: x of max(@abilities.con.mod,1) per Long Rest
//   - Uses Prompt: (checked)
//   - Action Type: Other
//   - Damage formula:
//     1d8 | None
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//       ItemMacro | After Active Effects
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isHit" && fromUuidSync(tpr.actorUuid)?.items.some(i => ((i.type === "weapon" && ["simpleM", "martialM"].includes(i.system?.type?.value)) || (i.type === "equipment" && i.system?.type?.value === "shield")) && i.system.equipped)
//   - This item macro code must be added to the DIME code of the item.
// One effect must also be added:
//   - Warding Maneuver:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isHit|canSee=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
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
  const debug = false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.2.2'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
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
    handleTargetOnUseIsHitPost(
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
   * Handles the preTargeting phase of the Warding Maneuver item midi-qol workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - midi-qol current workflow.
   * @param {Item5E} sourceItem - The Warding Maneuver item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature is hit.`;
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
  function handleTargetOnUseIsHitPost(
    currentWorkflow,
    targetToken,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (thirdPartyReactionResult?.uuid !== sourceItem.uuid) {
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
    // TODO remove noOnuseMacro when dnd v2.4.1 support is removed
    currentWorkflow.checkHits({
      noProvokeReaction: true,
      noOnuseMacro: true,
      noOnUseMacro: true,
      noTargetOnuseMacro: true,
    });

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
          const effectUuid = targetToken.actor?.effects.find(
            (ae) => ae.origin === sourceItem.uuid
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

    const acBonus = currentWorkflow.damageRolls[0]?.total;
    if (!acBonus) {
      if (debug) {
        // No AC bonus skip AE
        console.warn(`${DEFAULT_ITEM_NAME} | No AC bonus.`, {
          damageRolls: currentWorkflow.damageRolls,
        });
      }
      return;
    }

    // create an active effect on target for AC bonus and damage resistance in case it still hits.
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
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
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - AC Bonus/Damage Resistance`,
    };
    foundry.utils.setProperty(targetEffectData, 'flags.dae.specialDuration', [
      'isHit',
    ]);

    await MidiQOL.socket().executeAsGM('createEffects', {
      actorUuid: targetActor.uuid,
      effects: [targetEffectData],
    });
  }
}
