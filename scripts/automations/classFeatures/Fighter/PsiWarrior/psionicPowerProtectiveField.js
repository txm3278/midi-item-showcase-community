// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect aura, that effect will trigger a reaction by the Fighter
// when the fighter or a creature he can see within range is damaged to allow him to use the feature
// to reduce the target's damage instead.
// v2.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preTargeting],[postActiveEffects],[preTargetDamageApplication]
//  - Active Auras
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Class Feature Type: Psionic Power
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
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
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Psionic Power: Protective Field - Aura:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preTargetDamageApplication
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 30
//        - Check Token Height: (checked)
//        - Walls Block this Aure?: No
//
//  Note: A scale dice value must be configured on the 'Psi Warrior' subclass,
//        its data value should resolve to '@scale.psi-warrior.psionic-power'.
//
// Usage:
// This item has a passive effect that adds an active aura effect.
// It is also a manual reaction item that gets triggered by the active aura effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting phase of Psionic Power: Protective Field item:
//   Validates that item was triggered by the remote preTargetDamageApplication phase,
//   otherwise the item workflow execution is aborted.
// In the preTargetDamageApplication phase of a target having the Psionic Power: Protective Field's Active Aura Effect:
//   Validates that the item was triggered by source actor of the Psionic Power: Protective Field is not incapacitated,
//   can see the target and has not used its reaction. If the conditions are fulfilled,
//   the Psionic Power: Protective Field item is triggered as a reaction on the source actor client's.
//   If the reaction was used and completed successfully, the target's damage is reduced by the amount specified in the flag
//   set by the executed reaction.
// In the postActiveEffects phase of Psionic Power: Protective Field item:
//   A damage reduction flag is set on the actor to be used by the macro in the preTargetDamageApplication phase.
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
  const debug = true;

  if (!isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '2.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol', 'ActiveAuras'];
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
    return handleProtectiveFieldOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'preTargetDamageApplication'
  ) {
    // MidiQOL TargetOnUse item macro for Psionic Power: Protective Field Aura
    return await handleProtectiveFieldAuraOnUsePreTargetDamageApplication(
      workflow,
      token,
      scope.macroItem
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    // MidiQOL OnUse item macro for Psionic Power: Protective Field
    return await handleProtectiveFieldOnUsePostActiveEffects(workflow, actor);
  }

  /**
   * Handles the preTargeting phase of the Psionic Power: Protective Field item midi-qol workflow.
   * Validates that the reaction was triggered by the preTargetDamageApplication phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Psionic Power: Protective Field item.
   *
   * @returns true if all requirements are fulfilled, false otherwise.
   */
  function handleProtectiveFieldOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'preTargetDamageApplication' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the Fighter is damaged.`;
      ui.notifications.warn(msg);
      return false;
    }

    setProperty(
      currentWorkflow,
      'options.workflowOptions.fastForwardDamage',
      true
    );
    return true;
  }

  /**
   * Handles the preTargetDamageApplication of the Psionic Power: Protective Field item midi-qol workflow.
   * Triggers a remote reaction on the Fighter's client to reduce the damage instead of the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Token5e} targetToken The target token that is damaged.
   * @param {Item5e} sourceItem The Psionic Power: Protective Field item.
   */
  async function handleProtectiveFieldAuraOnUsePreTargetDamageApplication(
    currentWorkflow,
    targetToken,
    sourceItem
  ) {
    // Skip this phase if it was triggered by the sourceItem
    if (currentWorkflow.itemUuid === sourceItem?.uuid) {
      return;
    }
    // Skip this phase if the item did not applied damage or it was healing
    if (
      !currentWorkflow.damageItem?.appliedDamage ||
      currentWorkflow.damageItem?.appliedDamage < 0
    ) {
      return;
    }
    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`,
        sourceActor,
        targetToken
      );
      return;
    }

    const sourceToken = MidiQOL.tokenForActor(sourceActor);
    if (!sourceToken) {
      console.error(`${DEFAULT_ITEM_NAME} | No source token could be found.`);
      return;
    }

    const self = sourceToken.document.uuid === targetToken.document.uuid;
    if (!self && !MidiQOL.canSee(sourceToken, targetToken)) {
      // There is no line of sight to the target or the target is not visible
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | There is no line of sight to the target.`
        );
      }
      return;
    }

    // Remove previous damage prevention value
    await DAE.unsetFlag(sourceActor, 'protectiveFieldPreventedDmg');

    const result = await elwinHelpers.doThirdPartyReaction(
      currentWorkflow.item,
      targetToken,
      sourceItem,
      'preTargetDamageApplication',
      { debug }
    );

    if (
      result?.uuid === sourceItem.uuid &&
      DAE.getFlag(sourceActor, 'protectiveFieldPreventedDmg') > 0
    ) {
      const damageItem = currentWorkflow.damageItem;
      const preventedDmg = DAE.getFlag(
        sourceActor,
        'protectiveFieldPreventedDmg'
      );
      elwinHelpers.reduceAppliedDamage(damageItem, preventedDmg);
    }
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
        result,
        damageItem: currentWorkflow.damageItem,
        preventedDmg: DAE.getFlag(sourceActor, 'protectiveFieldPreventedDmg'),
      });
    }
  }

  /**
   * Handles the postActiveEffects of the Psionic Power: Protective Field item midi-qol workflow.
   * The owner of the feature HP's are reduced by the damage to be applied to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow The midi-qol curent workflow.
   * @param {Actor5e} sourceActor Owner of the Psionic Power: Protective Field item.
   */
  async function handleProtectiveFieldOnUsePostActiveEffects(
    currentWorkflow,
    sourceActor
  ) {
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
