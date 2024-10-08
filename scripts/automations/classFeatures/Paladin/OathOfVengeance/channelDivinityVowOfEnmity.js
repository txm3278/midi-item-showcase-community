// ##################################################################################################
// Read First!!!!
// Marks a target for "Channel Divinity: Vow of Enmity", and gives advantage on attacks against it.
// v2.3.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item/actor macro,[preAttackRoll][postActiveEffects]
//
// How to configure:
// The item details must be:
//   - Feature Type: Class Feature
//   - Class Feature Type: Channel Divinity
//   - Action: 1 Bonus Action
//   - Target: 1 Creature
//   - Range: 10 feet
//   - Duration: 1 minute
//   - Resource Consumption: 1 | Channel Divinity | Item Uses (to be set when added to an actor)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | After Active Effects
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of the feature.
// Two effects must also be added:
//   - Channel Divinity: Vow of Enmity:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Apply to self when item applies target effects (checked)
//      - Duration: empty
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preAttackRoll
//   - Marked by Vow of Enmity:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - An expression if false will remove the AE: !statuses.has("unconscious")
//      - Duration: empty
//      - Special duration:
//        - Zero HP
//
// Usage:
// This item need to be used to activate. It marks the target and gives advantage to any attack made to this target.
//
// Note: It may not auto remove the effect if the marked target becomes Unconscious with more than 0 HP immediately.
//       It will do so on the next actor update, this is due to when DAE evaluates the expression. This could probably
//       fixed in a future DAE version.
//
// Description:
// In the preAttackRoll phase (of any item of the marker):
//   Gives advantage to the marker if the target is marked by him.
// In the postActiveEffects phase:
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
    if (workflow.targets.size < 1) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No targets.`);
      }
      return;
    }
    const allTargetsMarked = workflow.targets.every((t) =>
      t.actor?.appliedEffects.some((ae) => ae.origin === scope.macroItem.uuid)
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
    if (workflow.applicationTargets.size < 1) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No effect applied to target.`);
      }
      return;
    }
    // TODO should we allow targeting an unconscious creature or having 0 HP?

    const tokenTarget = workflow.applicationTargets.first();
    const appliedEffect = tokenTarget.actor.appliedEffects.find(
      (ae) => ae.origin === scope.macroItem.uuid
    );
    if (!appliedEffect) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | No applied effect found on target actor.`
        );
      }
      return;
    }

    // Find AE on self to add delete flag
    const selfEffect = actor.effects.find(
      (ae) => ae.origin === scope.macroItem.uuid
    );
    if (!selfEffect) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No self effect found on actor.`);
      }
      return;
    }
    await selfEffect.addDependent(appliedEffect);
    await MidiQOL.socket().executeAsGM('addDependent', {
      concentrationEffectUuid: appliedEffect.uuid,
      dependentUuid: selfEffect.uuid,
    });
  }
}
