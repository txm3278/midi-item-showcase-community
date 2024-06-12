// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within range attacks to allow him to add disadvantage on the attack to hit.
// v2.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting][tpr.isPreAttacked]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Activation cost: 1 Reaction
//   - Target: 1 Enemy (RAW it's Creature, but use Enemy to trigger reaction only on enemies)
//   - Action Type: (empty)
//   - Range: 30 feet
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - No Full cover: (checked)
//   - Activation Conditions
//     - Reaction:
//       reaction === "reaction === "tpr.isPreAttacked" && (targetUuid === tpr?.tokenUuid || ((tpr?.actor?.classes?.cleric?.levels ?? 0) >= 6) && fromUuidSync(targetUuid)?.disposition === fromUuidSync(tpr?.tokenUuid)?.disposition)"
//   - This item macro code must be added to the DIME code of the item.
// One effect must also be added:
//   - Warding Flare:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isPreAttacked|triggerSource=attacker;canSee=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// In the preTargeting (item OnUse) phase of the Warding Flare item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isPreAttacked target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isPreAttacked (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow is set to roll the attack with
//   disadvantage.
// ###################################################################################################

export async function wardingFlare({
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
  const DEFAULT_ITEM_NAME = 'Warding Flare';
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
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isPreAttacked.post'
  ) {
    handleTargetOnUseIsPreAttackedPost(
      workflow,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  }

  /**
   * Handles the preTargeting phase of the Warding Flare item midi-qol workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - midi-qol current workflow.
   * @param {Item5E} sourceItem - The Warding Flare item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'tpr.isPreAttacked' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature attacks.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isPreAttacked post reaction of the Warding Flare item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, adds disadvantage to the attack roll.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Spirit Shield item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  function handleTargetOnUseIsPreAttackedPost(
    currentWorkflow,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (thirdPartyReactionResult?.uuid !== sourceItem.uuid) {
      return;
    }
    if (currentWorkflow.actor.system?.traits?.ci?.value?.has('blinded')) {
      if (debug) {
        console.warn(`{DEFAULT_ITEM_NAME} | Attacker is immune to blindness.`);
      }
      return;
    }

    // Note: at this point midi as already evaluated its ADV/DIS flags, we need to update it
    // if already defined or add one if not.
    let disValue = currentWorkflow.attackAdvAttribution.find((i) =>
      i.startsWith('DIS:attack.all')
    );
    if (disValue) {
      currentWorkflow.attackAdvAttribution.delete(disValue);
      disValue += ', ' + sourceItem.name;
    } else {
      disValue = 'DIS:attack.all ' + sourceItem.name;
    }
    currentWorkflow.attackAdvAttribution.add(disValue);
    currentWorkflow.disadvantage = true;
  }
}
