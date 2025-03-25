// ##################################################################################################
// Read First!!!!
// Adds a dice modifier to the base weapon damage when the conditions are met.
// v1.0.0
// Author: Elwin#1410 based on WurstKorn version
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro, [preDamageRoll]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a die modifier to base damage of two handed weapon attacks.
//
// Description:
// In the preDamageRoll phase of any activity (in owner's workflow):
//   If the activity is a weapon attack from a melee weapon having the two-handed or versatile property,
//   adds a hook on dnd5e.preRollDamageV2 to add dice modifiers.
// In the dnd5e.preRollDamageV2 hook (in owner's workflow):
//   If the workflow associated to the current activity is the same as the one received in the preDamageRoll
//   and the attackMode is two-handed, adds a dice modifier all base weapon dice rolls to
//   reroll 1 and 2 or min 3 depending on the rules version.
// ###################################################################################################

export async function greatWeaponFighting({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const DEFAULT_ITEM_NAME = 'Great Weapon Fighting';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3')) {
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRoll') {
    if (
      scope.rolledItem.type !== 'weapon' ||
      !['simpleM', 'martialM'].includes(scope.rolledItem.system.type?.value) ||
      !workflow.activity?.hasAttack ||
      workflow.activity.attack.type?.classification !== 'weapon' ||
      !(scope.rolledItem.system.properties?.has('two') || scope.rolledItem.system.properties?.has('ver'))
    ) {
      // Not an attack from a melee weapon having the versatile or two handed property
      return;
    }
    const modifier = elwinHelpers.getRules(scope.macroItem) === 'modern' ? 'min3' : 'r<=2';

    Hooks.once('dnd5e.preRollDamageV2', (rollConfig, dialogConfig, messageConfig) => {
      if (rollConfig?.workflow?.id !== workflow.id) {
        // Different activity workflow, remove hook
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | dnd5e.preRollDamageV2 called on different workflow`, {
            rollConfig,
            dialogConfig,
            messageConfig,
          });
        }
        return;
      }
      if (rollConfig.attackMode !== 'twoHanded') {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | dnd5e.preRollDamageV2 attackMode was not twoHanded`, {
            rollConfig,
            dialogConfig,
            messageConfig,
          });
        }
        return;
      }

      // Get only base weapon rolls
      const rolls = rollConfig.rolls?.filter((r) => r.base) ?? [];
      for (let roll of rolls) {
        if (!roll.parts?.length) {
          continue;
        }
        for (let i = 0; i < roll.parts.length; i++) {
          roll.parts[i] = addModifiers(roll.parts[i], modifier);
        }
      }
    });
  }

  /**
   * Adds modifiers to each die found in the received formula.
   * @param {string} formula - formula in which to add a die modifiers.
   * @returns {string} the modified formula.
   */
  function addModifiers(formula, ...modifiers) {
    const roll = new Roll(formula);
    for (let die of roll.dice) {
      die.modifiers.push(...modifiers);
    }
    return roll.formula;
  }
}
