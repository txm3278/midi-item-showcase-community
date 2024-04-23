// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect aura, that effect will trigger a reaction by the Paladin
// when a creature within range is damaged to allow him to use the feature to take the target's damage instead.
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
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
//   - Range: 5 Feet
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//       ItemMacro | After Active Effects
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Divine Allegiance - Aura:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preTargetDamageApplication
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 5
//        - Ignore self? (checked)
//        - Check Token Height: (checked)
//        - Walls Block this Aure?: Yes
//
// Usage:
// This item has a passive effect that adds an active aura effect.
// It is also a manual reaction item that gets triggered by the active aura effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting phase of Divine Allegiance item:
//   Validates that item was triggered by the remote preTargetDamageApplication phase,
//   otherwise the item workflow execution is aborted.
// In the preTargetDamageApplication phase of a target having the Divine Allegiance's Active Aura Effect:
//   Validates that the item was triggered by source actor of the Divine Allegiance is not incapacitated and
//   has not used its reaction. If the conditions are fulfilled, a flag is set on the feature's actor with the total damage to be applied
//   to the target, then the Divine Allegiance item is triggered as a reaction on the source actor client's.
//   If the reaction was used and completed successfully, the target's damage is reduced to zero.
// In the postActiveEffects phase of Divine Allegiance item:
//   The total damage to be taken for the target specified in a flag is applied to the owner's hp
//   and the flag is unset.
// ###################################################################################################

export async function divineAllegiance({
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
  const DEFAULT_ITEM_NAME = 'Divine Allegiance';
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
    // MidiQOL OnUse item macro for Divine Allegiance
    return handleDivineAllegianceOnUsePreTargeting(workflow, macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'preTargetDamageApplication'
  ) {
    // MidiQOL TargetOnUse item macro for Divine Allegiance Aura
    return await handleDivineAllegianceAuraOnUsePreTargetDamageApplication(
      workflow,
      token,
      macroItem
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    // MidiQOL OnUse item macro for Divine Allegiance
    await handleDivineAllegianceOnUsePostActiveEffects(workflow, actor);
  }

  /**
   * Handles the preTargeting phase of the Divine Allegiance item midi-qol workflow.
   * Validates that the reaction was triggered by the preTargetDamageApplication phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Divine Allegiance item.
   *
   * @returns true if all requirements are fulfilled, false otherwise.
   */
  function handleDivineAllegianceOnUsePreTargeting(
    currentWorkflow,
    sourceItem
  ) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'preTargetDamageApplication' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the Paladin is damaged.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the preTargetDamageApplication of the Divine Allegiance item midi-qol workflow.
   * Triggers a remote reaction on the Paladin's client to take the damage instead of the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Token5e} targetToken The target token that is damaged.
   * @param {Item5e} sourceItem The Divine Allegiance item.
   */
  async function handleDivineAllegianceAuraOnUsePreTargetDamageApplication(
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

    // Set damage to be applied, to be available for remote reaction
    const preventedDmg = currentWorkflow.damageItem.appliedDamage;
    await DAE.setFlag(sourceActor, 'divineAllegianceAppliedDmg', preventedDmg);

    const result = await elwinHelpers.doThirdPartyReaction(
      currentWorkflow.item,
      targetToken,
      sourceItem,
      'preTargetDamageApplication',
      { debug }
    );

    if (result?.uuid === sourceItem.uuid) {
      const damageItem = currentWorkflow.damageItem;
      elwinHelpers.reduceAppliedDamage(damageItem, preventedDmg);
    }
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
        result,
        damageItem: currentWorkflow.damageItem,
        preventedDmg,
      });
    }
  }

  /**
   * Handles the postActiveEffects of the Divine Allegiance item midi-qol workflow.
   * The owner of the feature HP's are reduced by the damage to be applied to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow The midi-qol curent workflow.
   * @param {Actor5e} sourceActor Owner of the Divine Allegiance item.
   */
  async function handleDivineAllegianceOnUsePostActiveEffects(
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
