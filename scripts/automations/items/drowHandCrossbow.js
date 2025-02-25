// ##################################################################################################
// Read First!!!!
// On hit applies the Drow Poison effect.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro, [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// ON hit applies the Drow Poison effect, including extra unconscious status when save failed by 5 or more.
//
// Description:
// In the postActiveEffects (OnUse) phase (of the Drow Hand Crossbow):
//   Adds the unconscious status if the target failed its save by 5 or more.
// ###################################################################################################

export async function drowHandCrossbow({
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
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Drow Hand Crossbow';
  const MODULE_ID = 'midi-item-showcase-community';
  const COATING_EFFECT_IDENT = 'coating-effect';
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '3.1'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    return handleOnUsePostActiveEffects(workflow, scope.rolledItem);
  }

  /**
   * Handles the application of the coating effect activity when a coated weapon or ammo hits.
   *
   * @param {object} parameters - The MidiQOL macro parameters
   * @param {MidiQOL.Workflow} parameters.workflow - The MidiQOL current workflow.
   * @param {Item5e} parameters.rolledItem - The item used.
   */
  async function handleOnUsePostActiveEffects(currentWorkflow, rolledItem) {
    if (!currentWorkflow.hitTargets?.size || currentWorkflow.aborted) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | No target hit or workflow was aborted.`,
          currentWorkflow
        );
      }
      return;
    }

    const coatedItem = rolledItem;
    const appliedCoating = {
      conditionalStatuses: [
        {
          status: 'unconscious',
          specialDurations: ['isDamaged'],
          condition:
            'target?.statuses?.poisoned && (targetData?.saveTotal + 5) <= targetData?.saveDC',
        },
      ],
    };
    const target = workflow.hitTargets.first();
    elwinHelpers.coating.handleCoatingEffectActivityConditionalStatuses(
      currentWorkflow,
      coatedItem,
      target,
      appliedCoating
    );
  }
}
