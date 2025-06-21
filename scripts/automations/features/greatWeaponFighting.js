// ##################################################################################################
// Read First!!!!
// Adds a dice modifier to the base weapon damage when the conditions are met.
// v1.2.0
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
// In the preDamageRollConfig phase of any activity (in owner's workflow):
//   If the activity is a weapon attack from a melee weapon having the two-handed or versatile property and
//   the attack mode is two handed, calls elwinHelpers.damageConfig.updateCustom to add a hook on dnd5e.preRollDamageV2
//   that adds dice modifier. The modifier is added to all base weapon dice rolls as well as those added by enchantments
//   to reroll 1 and 2 or min 3 depending on the rules version.
// ###################################################################################################

export async function greatWeaponFighting({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const DEFAULT_ITEM_NAME = 'Great Weapon Fighting';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.2')) {
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRollConfig') {
    if (
      scope.rolledItem.type !== 'weapon' ||
      !['simpleM', 'martialM'].includes(scope.rolledItem.system.type?.value) ||
      !scope.rolledActivity?.hasAttack ||
      scope.rolledActivity?.attack.type?.classification !== 'weapon' ||
      !(scope.rolledItem.system.properties?.has('two') || scope.rolledItem.system.properties?.has('ver')) ||
      workflow.attackMode !== 'twoHanded'
    ) {
      // Not an attack from a melee weapon having the versatile or two handed property
      return;
    }
    const modifier = elwinHelpers.getRules(scope.macroItem) === 'modern' ? 'min3' : 'r<=2';
    // TODO migrate to after postDamageRollConfig? so it applies to all bonuses added in dnd5e.preRollDamageV2...
    elwinHelpers.damageConfig.updateCustom(
      scope,
      workflow,
      { flavor: scope.macroItem.name, debug },
      (rollConfig, dialogConfig, messageConfig) => {
        // Get only base weapon rolls or those added by enchantments
        let index = 0;
        for (let roll of rollConfig.rolls ?? []) {
          if (roll.parts?.length && (roll.base || rollConfig.workflow?.activity?.damage?.parts[index]?.enchantment)) {
            for (let i = 0; i < roll.parts.length; i++) {
              roll.parts[i] = addModifiers(roll.parts[i], roll.data, modifier);
            }
          }
          index++;
        }
      }
    );
  }

  /**
   * Adds modifiers to each die found in the received formula.
   * @param {string} formula - formula in which to add a die modifiers.
   * @param {object} data - data to replace values in the formula.
   * @returns {string} the modified formula.
   */
  function addModifiers(formula, data, ...modifiers) {
    const roll = new Roll(formula, data);
    for (let die of roll.dice) {
      die.modifiers.push(...modifiers);
    }
    return roll.dice.length ? roll.formula : formula;
  }
}
