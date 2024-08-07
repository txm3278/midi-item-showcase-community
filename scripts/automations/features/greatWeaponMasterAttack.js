// ##################################################################################################
// Read First!!!!
// Handles the ability to make a bonus melee weapon attack when the actor scores a critical hit or brings a
// target to 0 HP with a melee weapon.
// v2.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [on][each]
//  - Times Up
//  - MidiQOL "on use" item macro [postActiveEffects]
//  - Elwin Helpers world script
//
// How to configure:
// The item details must be:
//   - Feature Type: Feat
//   - Activation cost: 1 Bonus Action
//   - Limited Uses: 0 of 1 per Charges
//   - Uses Prompt: (checked)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before item is rolled (*)
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feat.
// One effect must also be added:
//   - Great Weapon Master Attack:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Duration:
//        - Macro Repeat: End of each turn
//      - Effects:
//          - macro.itemMacro | Custom |
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,postActiveEffects
//
// Usage:
// This is a passive feat and an active feat. The passive part will add a charge when the requirements are met and remove
// it at the end of the owner's turn. The active part will prompts a dialog to choose weapon with which to make the bonus attack.
// Then MidiQOL.completeItemUse is called on this item. If no target is selected and the midi settings for target confirmation
// are not active or do not trigger on 'noneTargeted', the user's is asked to confirm a target before  MidiQOL.completeItemUse is called.
//
// Description:
// In the postDamageRoll (OnUse) phase (on any item other than Greater Weapon Master Attack):
//   If item used is a melee weapon, and it was a critical or at least one target was dropped to 0 HP,
//   grants one charge to use the special bonus attack if it was not already granted.
// In the preItemRoll (OnUse) phase (on Greater Weapon Master Attack):
//   Prompts the user to select an equipped melee weapon with which to make the bonus attack.
//   If no target is selected and the midi settings for target confirmation are not active or do not trigger on 'noneTargeted',
//   the user's is asked to confirm a target.
// In the postDamageRoll (OnUse) phase (on Greater Weapon Master Attack):
//   Calls MidiQOL.completeItemUse with the selected weapon.
// ###################################################################################################

export async function greatWeaponMasterAttack({
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
  const DEFAULT_ITEM_NAME = 'Great Weapon Master Attack';
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.0'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    const filteredWeapons = getEquippedMeleeWeapons(actor);
    if (filteredWeapons.length === 0) {
      const msg = `${DEFAULT_ITEM_NAME} | No melee weapon equipped.`;
      ui.notifications.warn(msg);
      return false;
    }

    const chosenWeaponId = actor.getFlag(
      MODULE_ID,
      'greatWeaponMaster.weaponChoiceId'
    );
    let weaponItem = filteredWeapons[0];
    if (filteredWeapons.length > 1) {
      weaponItem = await getSelectedWeapon(
        scope.macroItem,
        filteredWeapons,
        chosenWeaponId
      );
    }
    if (!weaponItem) {
      // Bonus attack was cancelled
      const msg = `${DEFAULT_ITEM_NAME} | No weapon selected for the bonus attack.`;
      ui.notifications.warn(msg);
      return false;
    }
    // Keep weapon choice for next time (used as pre-selected choice)
    await actor.setFlag(
      MODULE_ID,
      'greatWeaponMaster.weaponChoiceId',
      weaponItem.id
    );

    // Keep selected weapon in options
    workflow.options.greatWeaponMasterWeapon = weaponItem;
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    if (scope.rolledItem?.uuid === scope.macroItem.uuid) {
      const weaponItem = workflow.options?.greatWeaponMasterWeapon;
      if (!weaponItem) {
        ui.notifications.warn(
          `${DEFAULT_ITEM_NAME}: No selected weapon for bonus attack, reallocate spent resource if needed.`
        );
        return;
      }
      // Change action cost to Special to not be take as an Attack Action
      const weaponCopy = weaponItem.toObject();
      delete weaponCopy._id;
      // Change activation type to special so it is not considered as an Attack Action
      weaponCopy.system.activation = foundry.utils.deepClone(
        weaponCopy.system.activation ?? {}
      );
      weaponCopy.system.activation.type = 'special';
      weaponCopy.system.activation.cost = null;

      const options = {
        showFullCard: false,
        createWorkflow: true,
        configureDialog: true,
        workflowOptions: { autoRollAttack: true },
      };
      const attackItem = new CONFIG.Item.documentClass(weaponCopy, {
        parent: actor,
        temporary: true,
      });

      await MidiQOL.completeItemUse(attackItem, {}, options);
    } else {
      if (
        scope.rolledItem?.type !== 'weapon' ||
        scope.rolledItem?.system?.actionType !== 'mwak'
      ) {
        // Not a melee weapon...
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | Not a melee weapon.`);
        }
        return;
      }
      // Adds a charge to the bonus action if the conditions are met.
      if (actor.getFlag(MODULE_ID, 'greatWeaponMaster.bonus')) {
        // A bonus action was already granted
        return;
      }
      let allowBonusAction = workflow.isCritical;
      let reduceToZeroHp = false;
      if (!allowBonusAction && workflow.hitTargets.size > 0) {
        reduceToZeroHp = workflow.damageList?.some(
          (dmgItem) =>
            dmgItem.wasHit && dmgItem.oldHP !== 0 && dmgItem.newHP === 0
        );
        allowBonusAction = reduceToZeroHp;
      }
      if (debug) {
        console.warn(DEFAULT_ITEM_NAME, {
          allowBonusAction,
          isCritical: workflow.isCritical,
          reduceToZeroHp,
        });
      }
      if (allowBonusAction) {
        // Set one charge to the Heavy Weapon Master Attack bonus action for this turn and keep id of weapon that did it
        await scope.macroItem.update({
          'system.uses.value': 1,
        });
        await actor.setFlag(MODULE_ID, 'greatWeaponMaster', {
          bonus: true,
          weaponChoiceId: scope.rolledItem.id,
        });

        // Add chat message saying a bonus attack can be made
        const message = `<p><strong>${scope.macroItem.name}</strong> - You can make a special bonus attack.</p>`;
        MidiQOL.addUndoChatMessage(
          await ChatMessage.create({
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            content: message,
            speaker: ChatMessage.getSpeaker({ actor, token }),
            whisper: ChatMessage.getWhisperRecipients('GM').map((u) => u.id),
          })
        );
      }
    }
  } else if (args[0] === 'on') {
    // Clear item state when first applied
    await item.update({ 'system.uses.value': 0 });
  } else if (args[0] === 'each') {
    // Reset the Heavy Weapon Master Attack bonus action to 0 charge
    if (
      item.system?.uses?.value > 0 ||
      foundry.utils.getProperty(
        actor,
        `flags.${MODULE_ID}.greatWeaponMaster.bonus`
      )
    ) {
      await item.update({ 'system.uses.value': 0 });
      await actor.setFlag(MODULE_ID, 'greatWeaponMaster.bonus', false);
    }
  }

  /**
   * Returns a list of equipped melee weapons for the specified actor.
   *
   * @param {Actor5e} sourceActor token actor
   * @returns {Item5e[]} list of equipped melee weapons.
   */
  function getEquippedMeleeWeapons(sourceActor) {
    return sourceActor.itemTypes.weapon.filter(
      (w) => w.system.equipped && w.system.actionType === 'mwak'
    );
  }

  /**
   * Prompts a dialog to select a weapon and returns the id of the selected weapon.
   *
   * @param {Item5e} sourceItem item for which the dialog is prompted.
   * @param {Item5e[]} weaponChoices array of weapon items from which to choose.
   * @param {string} defaultChosenWeaponId id of weapon to be selected by default.
   *
   * @returns {Item5e|null} the selected weapon.
   */
  async function getSelectedWeapon(
    sourceItem,
    weaponChoices,
    defaultChosenWeaponId
  ) {
    const defaultWeapon = weaponChoices.find(
      (i) => i.id === defaultChosenWeaponId
    );
    return elwinHelpers.ItemSelectionDialog.createDialog(
      `⚔️ ${sourceItem.name}: Choose a Weapon`,
      weaponChoices,
      defaultWeapon
    );
  }
}
