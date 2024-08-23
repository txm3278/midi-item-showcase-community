// ##################################################################################################
// Author: Elwin#1410 based on SagaTympana version
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Artificer
// when a creature within range rolls a saving throw or ability check to allow them to add a bonus on the roll.
// v1.0.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor macro [preTargeting][tpr.isPreCheckSave]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction on allies only)
//   - Range: 30 feet
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - No Full cover: (checked)
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isPreCheckSave"
//   - This item macro code must be added to the DIME code of this feature.
// Two effects must also be added:
//   - Flash of Genius:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isPreCheckSave|canSee=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate or it can be triggered manually.
//
// Description:
// In the preTargeting (item OnUse) phase of the Flash of Genius item (in owner's workflow):
//   Validates that item was triggered manually or by the remote tpr.isPreCheckSave target on use,
//   otherwise the item workflow execution is aborted.
// ###################################################################################################

export async function flashOfGenius({
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
  const DEFAULT_ITEM_NAME = 'Flash of Genius';
  const debug = false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.2.4'
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
    // MidiQOL OnUse item macro for Flash of Genius
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  }

  /**
   * Handles the preItemRoll phase of the Flash of Genius item midi-qol workflow.
   * Validates that the reaction was triggered manually or by the tpr.isPreCheckSave target on use.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Flash of Genius item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.isReaction &&
      (currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'tpr.isPreCheckSave' ||
        !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
          sourceItem.uuid
        ))
    ) {
      // Reaction should only be triggered by third party reaction AE or manually
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature needs to roll a save or an ability test.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }
}
