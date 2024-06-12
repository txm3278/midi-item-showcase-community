// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction effect, that effect will trigger a reaction by the Fighter
// when the fighter or a creature he can see within range is damaged to allow him to use the feature
// to reduce the target's damage instead.
// v3.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preTargeting],[postActiveEffects],[tpr.isDamaged]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Class Feature Type: Psionic Power
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction on allies only)
//   - Range: 30 feet
//   - Resource Consumption: 1 | Psionic Power | Item Uses (to be set when added to an actor)
//   - Action Type: Other
//   - Damage formula:
//     max(@scale.psi-warrior.psionic-power +@abilities.int.mod, 1) | No Damage
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//       ItemMacro | After Active Effects
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - No Full cover: (checked)
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isDamaged"
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Psionic Power: Protective Field:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isDamaged|canSee=true;pre=true;post=true
//
//  Note: A scale dice value must be configured on the 'Psi Warrior' subclass,
//        its data value should resolve to '@scale.psi-warrior.psionic-power'.
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting (item OnUse) phase of the item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isDamaged target on use,
//   otherwise the item workflow execution is aborted.
// In the postActiveEffects (item onUse) phase of the item (in owner's workflow):
//   A damage reduction flag is set on the item's owner to be used by the post macro of the tpr.isDamaged reaction.
// In the tpr.isDamaged (TargetOnUse) pre macro (in attacker's workflow) (on other target):
//   Unsets the previous damage reduction flag on the item's owner.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, the target's damage is reduced by the amount
//   specified in the flag set by the executed reaction on the item's owner.
// ###################################################################################################

export async function psionicPowerProtectiveField({
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
  const DEFAULT_ITEM_NAME = 'Psionic Power: Protective Field';
  const debug = false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.2'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
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
    // MidiQOL OnUse item macro for Psionic Power: Protective Field
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isDamaged.pre'
  ) {
    // MidiQOL TargetOnUse pre macro for Psionic Power: Protective Field pre reaction in the triggering midi-qol workflow

    // Remove previous damage prevention value
    await DAE.unsetFlag(scope.macroItem.actor, 'protectiveFieldPreventedDmg');
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isDamaged.post'
  ) {
    // MidiQOL TargetOnUse post macro for Psionic Power: Protective Field post reaction
    handleIsDamagedPost(
      workflow,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    // MidiQOL OnUse item macro for Psionic Power: Protective Field
    await handleOnUsePostActiveEffects(workflow, actor);
  }

  /**
   * Handles the preTargeting phase of the Psionic Power: Protective Field item.
   * Validates that the reaction was triggered by the tpr.isDamaged phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Psionic Power: Protective Field item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'tpr.isDamaged' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reaction
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the Fighter is damaged.`;
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
   * Handles the tpr.isDamaged post reaction execution of the Psionic Power: Protective Field item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, reduces the damage aplied to the target by the rolled amount of the reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Psionic Power: Protective Field item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  function handleIsDamagedPost(
    currentWorkflow,
    sourceItem,
    thirdPartyReactionResult
  ) {
    const sourceActor = sourceItem.actor;
    if (
      thirdPartyReactionResult?.uuid === sourceItem.uuid &&
      currentWorkflow.damageItem &&
      DAE.getFlag(sourceActor, 'protectiveFieldPreventedDmg') > 0
    ) {
      const preventedDmg = DAE.getFlag(
        sourceActor,
        'protectiveFieldPreventedDmg'
      );
      elwinHelpers.reduceAppliedDamage(
        currentWorkflow.damageItem,
        preventedDmg
      );
    }
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
        result: thirdPartyReactionResult,
        damageItem: currentWorkflow.damageItem,
        preventedDmg: DAE.getFlag(sourceActor, 'protectiveFieldPreventedDmg'),
      });
    }
  }

  /**
   * Handles the postActiveEffects of the Psionic Power: Protective Field item midi-qol workflow.
   * The owner of the feature HP's are reduced by the damage to be applied to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Actor5e} sourceActor - The owner of the Psionic Power: Protective Field item.
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
    await DAE.setFlag(
      sourceActor,
      'protectiveFieldPreventedDmg',
      currentWorkflow.damageTotal
    );

    const infoMsg = `<p>You prevent <strong>${currentWorkflow.damageTotal}</strong> points of damage to <strong>\${tokenName}</strong>.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard(
      'beforeButtons',
      workflow,
      elwinHelpers.getTargetDivs(targetToken, infoMsg)
    );
  }
}
