// ##################################################################################################
// Read First!!!!
// Adds a dice modifier to the base weapon damage when the conditions are met.
// v1.1.1
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
//   If the workflow associated to the current activity is the same as the one received in the preDamageRoll,
//   the rollConfig is for the rolled activity and and the attackMode is two-handed,
//   adds a dice modifier all base weapon dice rolls as well as those added by enchantments
//   to reroll 1 and 2 or min 3 depending on the rules version.
// ###################################################################################################

export async function greatWeaponFighting({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const DEFAULT_ITEM_NAME = 'Great Weapon Fighting';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.0')) {
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
      !scope.rolledActivity?.hasAttack ||
      scope.rolledActivity?.attack.type?.classification !== 'weapon' ||
      !(scope.rolledItem.system.properties?.has('two') || scope.rolledItem.system.properties?.has('ver'))
    ) {
      // Not an attack from a melee weapon having the versatile or two handed property
      return;
    }
    const modifier = elwinHelpers.getRules(scope.macroItem) === 'modern' ? 'min3' : 'r<=2';
    // TODO migrate to after postDamageRollConfig? so it applies to all bonuses added in dnd5e.preRollDamageV2...
    const event = 'dnd5e.preRollDamageV2';
    elwinHelpers.registerWorkflowHook(
      workflow,
      event,
      (rollConfig, dialogConfig, messageConfig) => {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | ${event}`, { rollConfig, dialogConfig, messageConfig });
        }
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            event,
            'Modify base weapon damage dice',
            workflow,
            rollConfig.workflow,
            debug
          )
        ) {
          return;
        }
        if (rollConfig.subject?.uuid !== scope.rolledActivity.uuid) {
          if (debug) {
            console.warn(`${DEFAULT_ITEM_NAME} | ${event} damage is not from scope.rolledActivity`, {
              rollConfig,
              dialogConfig,
              messageConfig,
            });
          }
          return;
        }
        if (rollConfig.attackMode !== 'twoHanded') {
          if (debug) {
            console.warn(`${DEFAULT_ITEM_NAME} | ${event} attackMode was not twoHanded`, {
              rollConfig,
              dialogConfig,
              messageConfig,
            });
          }
          return;
        }

        // Get only base weapon rolls
        const rolls =
          rollConfig.rolls?.filter(
            (r, index) => r.base || rollConfig.workflow?.activity?.damage?.parts[index]?.enchantment
          ) ?? [];
        for (let roll of rolls) {
          if (!roll.parts?.length) {
            continue;
          }
          for (let i = 0; i < roll.parts.length; i++) {
            roll.parts[i] = addModifiers(roll.parts[i], roll.data, modifier);
          }
        }
      },
      'greatWeaponFighting'
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
