// ##################################################################################################
// Read First!!!!
// Handles the ability to add a damage bonus when the conditions are met as well as the ability
// to make a bonus melee weapon attack when the actor scores a critical hit or brings a target to 0 HP with a melee weapon.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat and an active feat. It adds an optional damage bonus when the conditions are met.
// After a weapon attack, it will also prompt to make a bonus attack if the conditions are met.
//
// Description:
// In the postActiveEffects (OnUse) phase (on any owner's item other than Greater Weapon Master):
//   If the item used is a melee weapon, and it was a critical or at least one target was dropped to 0 HP,
//   prompt the user to make a bonus attack with the same weapon. If confirmed, then MidiQOL.completeItemUseV2 is called on this item.
// ###################################################################################################


export async function greatWeaponMaster2024({
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
  const DEFAULT_ITEM_NAME = 'Great Weapon Master';
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.2')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] }, arguments);
  }
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (scope.rolledItem?.uuid !== scope.macroItem.uuid) {
      await handleOnUsePostActiveEffectsOtherItems(workflow, scope.macroItem, scope.rolledItem);
    }
  }

  /**
 * If the item used is a melee weapon, and it was a critical or at least one target was dropped to 0 HP,
 * grants one charge to use the special bonus attack if it was not already granted.
 *
 * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Great Weapon Master item.
 * @param {Item5e} usedItem - The item used for the current workflow.
 */
  async function handleOnUsePostActiveEffectsOtherItems(currentWorkflow, sourceItem, usedItem) {
    if (
      !elwinHelpers.isMeleeWeapon(usedItem) ||
    currentWorkflow.activity?.type !== 'attack' ||
    currentWorkflow.activity?.attack?.type?.classification !== 'weapon'
    ) {
    // Not an attack from a melee weapon...
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not an attack from a melee weapon.`);
      }
      return;
    }

    let allowBonusAction = currentWorkflow.isCritical;
    let reduceToZeroHp = false;
    if (!allowBonusAction && currentWorkflow.hitTargets.size > 0) {
      reduceToZeroHp = currentWorkflow.damageList?.some(
        (dmgItem) => dmgItem.wasHit && dmgItem.oldHP !== 0 && dmgItem.newHP === 0
      );
      allowBonusAction = reduceToZeroHp;
    }
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME, { allowBonusAction, isCritical: currentWorkflow.isCritical, reduceToZeroHp });
    }
    if (!allowBonusAction) {
      return;
    }

    if (
      await foundry.applications.api.DialogV2.confirm({
        window: { title: `${sourceItem.name} - Hew` },
        content: `Make a special bonus attack?`,
        defaultYes: true,
        modal: true,
        rejectClose: false,
      })
    ) {
      doBonusAttack(sourceItem, usedItem, currentWorkflow.activity.id);
    }
  }

  /**
 * Do a complete item use with the specified weapon but changing its attack activities activation
 * to special or bonus depending on the rules version.
 *
 * @param {Item5e} sourceItem - The Great Weapon Master item.
 * @param {Item5e} weaponItem - The weapon with which to attack.
 * @param {Activity} activityId - Id of the activity triggering bonus attack.
 */
  async function doBonusAttack(sourceItem, weaponItem, activityId) {
  // Change activation type to special so it is not considered as an Attack Action
    const weaponItemData = weaponItem.toObject();
    weaponItemData._id = foundry.utils.randomID();
    weaponItemData.name += ' (Hew)';
    const activity = weaponItemData.system.activities[activityId];
    if (!activity) {
      return;
    }
    activity.activation ??= {};
    activity.activation.type = 'bonus';
    activity.activation.cost = null;

    const weaponCopy = new Item.implementation(weaponItemData, { parent: sourceItem.actor });
    weaponCopy.prepareData();
    weaponCopy.prepareFinalAttributes();

    const config = {
      midiOptions: {
        ignoreUserTargets: true,
        workflowOptions: { targetConfirmation: 'always' },
        activityId: activityId,
      },
    };
    const message = {
      data: {
        flags: {
          dnd5e: {
            item: { data: weaponCopy.toObject() },
          },
        },
      },
    };
    return await MidiQOL.completeItemUseV2(weaponCopy, config, {}, message);
  }

}