// ##################################################################################################
// Author: Elwin#1410
// v2.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preAttackRoll]
//  - Elwin Helpers world script
//
// Usage:
//   Needs to be used to activate. The next attack roll will have a value 10 instead of rolling the d20.
//
//
// Description:
// In the preAttackRoll (item OnUse) phase of the use activity (in owner's workflow):
//   Adds a hook on dnd5e.postAttackRollConfiguration to set the d20 rolled value to 10.
// In the dnd5e.postAttackRollConfiguration hook (in owner's workflow):
//   If the workflow associated to the current activity is the same as the one received in the preAttackRoll,
//   sets the value of the d20 dice to 10.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = 'Clockwork Amulet';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

/**
 * Adds a hook on dnd5e.postAttackRollConfiguration to set the d20 rolled value to 10.
 * In the dnd5e.postAttackRollConfiguration hook if the workflow associated to the current activity
 * is the same as the one received in the preAttackRoll, sets the value of the d20 dice to 10.
 *
 * @param {object} params - The MidiQOL or DAE macro function parameters.
 */
export async function clockworkAmulet({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!checkDependencies()) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (!(args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll')) {
    return;
  }

  const event = 'dnd5e.postAttackRollConfiguration';
  elwinHelpers.registerWorkflowHook(workflow, event, (rolls, rollConfig, dialogConfig, messageConfig) => {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | ${event}`, { rolls, rollConfig, dialogConfig, messageConfig });
    }
    if (
      !elwinHelpers.isMidiHookStillValid(DEFAULT_ITEM_NAME, event, 'Forgo d20', workflow, rollConfig.workflow, debug)
    ) {
      return;
    }
    if (rollConfig.subject?.uuid !== workflow.activity?.uuid) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | ${event} attack is not from rolled activity`, {
          rolls,
          rollConfig,
          dialogConfig,
          messageConfig,
        });
      }
      return;
    }
    // Force d20 result to 10
    rolls[0]?.dice[0]?.results.push({ result: 10, active: true });
  });
}
