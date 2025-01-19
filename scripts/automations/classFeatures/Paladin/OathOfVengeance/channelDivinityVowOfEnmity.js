// ##################################################################################################
// Read First!!!!
// Marks a target for "Channel Divinity: Vow of Enmity", and gives advantage on attacks against it.
// v3.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item/actor macro,[preAttackRoll][postActiveEffects]
//
// Usage:
// This item need to be used to activate. It marks the target and gives advantage to any attack made to this target.
//
// Note: It may not auto remove the effect if the marked target becomes Unconscious with more than 0 HP immediately.
//       It will do so on the next actor update, this is due to when DAE evaluates the expression. This could probably
//       fixed in a future DAE version.
//       The Utter Vow activity consumption must be set to the Channel Divinity item when added to an actor.
//
// Description:
// In the preAttackRoll phase of any item activity of the marker (in owner's workflow):
//   Gives advantage to the marker if the target is marked by him.
// In the postActiveEffects phase of this feature's activity (in owner's workflow):
//   Updates the self active effect to delete the target active effect when deleted and vice versa.
// ###################################################################################################

export async function channelDivinityVowOfEnmity({
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
  const DEFAULT_ITEM_NAME = 'Channel Divinity: Vow of Enmity';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  const dependencies = ['dae', 'times-up', 'midi-qol'];
  if (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
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

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll') {
    if (!workflow.targets?.size) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No targets.`);
      }
      return;
    }
    const allTargetsMarked = workflow.targets.every((t) =>
      t.actor?.appliedEffects.some(
        (ae) => !ae.transfer && ae.origin?.startsWith(scope.macroItem.uuid)
      )
    );
    if (!allTargetsMarked) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not all targets are marked.`, {
          targets: workflow.targets,
        });
      }
      return;
    }

    workflow.advantage = true;
    workflow.attackAdvAttribution.add(`ADV:${scope.macroItem.name}`);
    workflow.advReminderAttackAdvAttribution.add(`ADV:${scope.macroItem.name}`);
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    if (!workflow.effectTargets?.size) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No effect applied to target.`);
      }
      return;
    }
    // TODO should we allow targeting an unconscious creature or having 0 HP?

    const tokenTarget = workflow.effectTargets.first();
    const appliedEffect = tokenTarget.actor.appliedEffects.find(
      (ae) => !ae.transfer && ae.origin?.startsWith(scope.macroItem.uuid)
    );
    if (!appliedEffect) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | No applied effect found on target actor.`
        );
      }
      return;
    }

    // Find AE on self to add dependency
    const selfEffect = actor.appliedEffects.find(
      (ae) => !ae.transfer && ae.origin?.startsWith(scope.macroItem.uuid)
    );
    if (!selfEffect) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No self effect found on actor.`);
      }
      return;
    }
    await selfEffect.addDependent(appliedEffect);
    await MidiQOL.addDependent(appliedEffect, selfEffect);
  }
}
