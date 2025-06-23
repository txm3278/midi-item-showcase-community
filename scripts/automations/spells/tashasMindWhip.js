// ##################################################################################################
// Tasha's Mind Whip
// Applies an effect that prevents taking a Reaction on targets that failed their save in addition of damage.
// v2.0.0
// Author: Elwin#1410 based on MotoMoto
// Dependencies:
//  - DAE [each]
//  - MidiQOL "OnUseMacro" ItemMacro[prePreambleComplete],[postActiveEffects]
//
// Usage:
// This item needs to be used to activate. When activated the selected targets must save or take damage and
// have an affect the prevents them to take a Reaction until the end of their next turn.
//
// Description:
// In the prePreambleComplete phase of the Tasha's Mind Whip Save activity (in owner's workflow):
//   If there is more than one target is selected, validates that they are within 30 feet of each other otherwise
//   the spell is aborted and consumption is refunded if needed.
// In the postActiveEffects phase of the Tasha's Mind Whip Save activity (in owner's workflow):
//   For each target that failed its save, updates the Reaction effect to remove its default special duration.
// When a target with the Tasha's Mind Whip AE turn starts [each]:
//   Displays a dialog to remind that the affected creature and only take a move, an action or a bonus action during this turn.
// ###################################################################################################

// Default name of the spell
const DEFAULT_ITEM_NAME = "Tasha's Mind Whip";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  const dependencies = ['dae', 'midi-qol'];
  if (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

/**
 * If the requirements are met, returns true, false otherwise.
 *
 * @param {string} name - The name of the item for which to check the dependencies.
 * @param {string[]} dependencies - The array of module ids which are required.
 *
 * @returns {boolean} true if the requirements are met, false otherwise.
 */
function requirementsSatisfied(name, dependencies) {
  let missingDep = false;
  dependencies.forEach((dep) => {
    if (!game.modules.get(dep)?.active) {
      const errorMsg = `${name} | ${dep} must be installed and active.`;
      ui.notifications.error(errorMsg);
      console.warn(errorMsg);
      missingDep = true;
    }
  });
  return !missingDep;
}

export async function tashasMindWhip({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'prePreambleComplete') {
    handleOnUsePrePreambleComplete(workflow);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    await handleOnUsePostActiveEffects(workflow);
  } else if (args[0] === 'each') {
    const effectImage = scope.effect.img;
    const tokenName = MidiQOL.getTokenPlayerName(token);
    await foundry.applications.api.DialogV2.prompt({
      window: { title: `${scope.effect.name} - Effect Reminder` },
      position: { width: 400 },
      content: `<img src="${effectImage}"><br/><br/><p>${tokenName} can't take a reaction until the end of this turn. Moreover, on this turn, ${tokenName} must choose whether it gets a <strong>move</strong>, an <strong>action</strong>, or a <strong>bonus action</strong>; it gets <strong>only one of the three</strong>.</p>`,
    });
  }
}

/**
 * Handles the on use prePreambleComplete phase of the Tasha's Mind Whip of the Save activity.
 * If there is more than one target is selected, validates that they are within 30 feet of each other otherwise
 * the spell is aborted and consumption is refunded if needed.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
function handleOnUsePrePreambleComplete(workflow) {
  if (workflow.targets?.size <= 1) {
    return;
  }
  const targets = [...workflow.targets];
  for (let i = 0; i < targets.length - 1; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      if (!MidiQOL.checkDistance(targets[i], targets[j], 30, { wallsBlock: false, includeCover: false })) {
        workflow.aborted = true;
        // Targets must be wihtin 30' of each others
        ui.notifications.warn(`${workflow.item.name} | The targets must be within 30 feet of each other.`);
        return;
      }
    }
  }
}

/**
 * Handles the on use postActiveEffects phase of the Tasha's Mind Whip of the Save activity.
 * For each target that failed its save, updates the Reaction effect to remove its default special duration.
 * This allows to keep it until the end of the target's next turn.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUsePostActiveEffects(workflow) {
  if (!workflow.effectTargets?.size) {
    // No target affected by spell
    return;
  }
  for (let target of workflow.effectTargets) {
    const reactionEffect = target.actor?.effects?.find((ae) => ae.id === MidiQOL.midiReactionEffect?.id);
    if (!reactionEffect) {
      continue;
    }
    const data = {
      actorUuid: target.actor.uuid,
      updates: [{ _id: reactionEffect.id, 'flags.dae.specialDuration': [] }],
    };
    // Note: we use socketlib directly otherwise MidiQOL prompts a warning
    await socketlib?.modules.get('midi-qol')?.executeAsGM('updateEffects', data);
  }
}
