// ##################################################################################################
// Read First!!!!
// When an attack hits an undead, adds a damage bonus and applies an effect that forces disadvantage on saves against Turn Undead.
// v1.0.0
// Author: Elwin#1410 based on SagaTympana version
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preDamageRoll],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
//   When eqipped and attuned and an attack hits againt an undead, it adds a damage bonus and an effect
//   that forces disadvantage on saves against Turn Undead.
//
// Description:
// In the preDamageRoll (item OnUse) phase of the Corspe Slayer attack activity (in owner's workflow):
//   If there is only one hit target and it's an undead, adds a hook on dnd5e.preRollDamageV2 to add the damage bonus.
// In the dnd5e.preRollDamageV2 hook (in owner's workflow):
//   Adds the Undead extra damage bonus.
// In the postActiveEffects (item OnUse) phase of the Corspe Slayer attack activity (in owner's workflow):
//   If there is only one hit target and it's an undead, finds the Corpse Slayer Weapon effect and applies it to the target.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = 'Corspe Slayer Weapon';
const WORLD_ID = 'world';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function corpseSlayerWeapon({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRoll') {
    handleOnUsePreDamageRoll(scope, workflow, debug);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    await handleOnUsePostActiveEffects(scope, workflow, debug);
  }
}

/**
 * Validates that the item used is attuned, that the activity is an attack weapon
 * and that there is only one target of type undead.
 * @param {object} scope - The midi call macro scope.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {boolean} True if the activity and target are valid, false otherwise.
 */
function validateActivityAndTarget(scope, workflow, debug) {
  if (
    !scope.rolledItem?.system.attuned ||
    !scope.rolledActivity?.hasAttack ||
    scope.rolledActivity?.attack?.type.classification !== 'weapon'
  ) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Item not attuned or not a weapon attack activity.`, {
        item: scope.rolledItem,
        activity: scope.rolledActivity,
      });
    }
    return false;
  }
  if (workflow.hitTargets?.size !== 1 || MidiQOL.raceOrType(workflow.hitTargets.first()) !== 'undead') {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Multiple hit targets or hit target is not an undead.`);
    }
    return false;
  }
  return true;
}

/**
 * Handles the pre damage roll of the Attack activity.
 * Adds the extra damage to the target if the activity and target are valid.
 * @param {object} scope - The midi call macro scope.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
function handleOnUsePreDamageRoll(scope, workflow, debug) {
  if (!validateActivityAndTarget(scope, workflow, debug)) {
    return;
  }
  const event = 'dnd5e.preRollDamageV2';
  elwinHelpers.registerWorkflowHook(
    workflow,
    event,
    (rollConfig, dialogConfig, messageConfig) => {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | ${event}`, { rollConfig, dialogConfig, messageConfig });
      }
      // Make sure it's the same workflow
      if (
        !elwinHelpers.isMidiHookStillValid(
          DEFAULT_ITEM_NAME,
          event,
          'Add undead damage bonus',
          workflow,
          rollConfig.workflow,
          debug
        )
      ) {
        return;
      }
      if (rollConfig.subject?.uuid !== workflow.activity?.uuid) {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | ${event} damage is not from scope.rolledActivity`, {
            rollConfig,
            dialogConfig,
            messageConfig,
          });
        }
        return;
      }
      // Add damage bonus
      const corpseSlayerWeaponBonus = '1d8';
      rollConfig.rolls[0]?.parts?.push(corpseSlayerWeaponBonus);
    },
    'corpseSlayerWeapon'
  );
}

/**
 * Handles the post active effects of the Attack activity.
 * Adds the effect to the target if the activity and target are valid.
 * @param {object} scope - The midi call macro scope.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostActiveEffects(scope, workflow, debug) {
  if (!validateActivityAndTarget(scope, workflow, debug)) {
    return;
  }
  const corpseSlayerEffect = workflow.item?.effects.find(
    (ae) => !ae.transfer && ae.getFlag(WORLD_ID, 'corpseSlayerWeapon') === true
  );
  if (!corpseSlayerEffect) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | handleOnUsePostActiveEffects: Missing Corspe Slayer active effect.`);
    }
    return;
  }
  const corpseSlayerEffectData = corpseSlayerEffect.toObject();
  corpseSlayerEffectData.origin = workflow.activity?.uuid ?? workflow.item.uuid;
  await MidiQOL.createEffects({
    actorUuid: workflow.hitTargets.first()?.actor?.uuid,
    effects: [corpseSlayerEffectData],
  });
}
