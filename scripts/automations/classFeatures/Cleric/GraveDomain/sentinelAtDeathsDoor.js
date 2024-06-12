// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within range is hit by a critical to allow him to convert it to a normal hit.
// v3.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting],[tpr.isHit]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction only on allies)
//   - Range: 30 feet
//   - Limited Uses: 1 of @abilities.wis.mod per Long Rest
//   - Uses Prompt: (checked)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - No Full cover: (checked)
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isHit" && workflow.isCritical
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Sentinel at Death's Door:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isHit|canSee=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// In the preTargeting (item OnUse) phase of the Sentinel at Death's Door item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isHit target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, the current workflow critical hit is converted to
//   a normal hit.
// ###################################################################################################

export async function sentinelAtDeathsDoor({
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
  const DEFAULT_ITEM_NAME = "Sentinel at Death's Door";
  const debug = false;

  const dependencies = ['dae', 'midi-qol'];
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
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    await handleTargetOnUseIsHitPost(
      workflow,
      token,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  }

  /**
   * Handles the preTargeting phase of the Sentinel at Death's Door item.
   * Validates that the reaction was triggered by the tpr.isHit remote reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sentinel at Death's Door item.
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
      // Reaction should only be triggered by third party reaction
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isHit post macro of the Sentinel at Death's Door item.
   * If the reaction was used and completed successfully, converts a critical hit on the target into a normal hit.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is hit.
   * @param {Item5e} sourceItem - The Sentinel at Death's Door item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(
    currentWorkflow,
    targetToken,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', {
        thirdPartyReactionResult,
      });
    }
    if (thirdPartyReactionResult?.uuid === sourceItem.uuid) {
      // Convert critical hits into normal hit
      await elwinHelpers.convertCriticalToNormalHit(currentWorkflow);
    }
  }
}
