// ##################################################################################################
// Read First!!!!
// Handles the ability to toggle on/off or prompt the -5 penalty to hit and +10 bonus to the damage on a
// heavy weapon melee attack as well as the ability to make a bonus melee weapon attack when the actor scores
// a critical hit or brings a target to 0 HP with a melee weapon.
// Note: it supports checking for melee weapon attack with a thrown property.
// v3.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [on][every]
//  - Times Up
//  - MidiQOL "on use" item macro [preItemRoll],[preAttackRoll],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat and an active feat. This is a feat that can be toggled on or off, when the Toggle activity's midi property "Toggle effect" is checked
// and the Toggle activity is used, when unchecked, a dialog to activate the feature will be prompted on attacks that meet the requirements.
// If the attack is a melee attack from a heavy weapon for which the attacker is proficient and toggled on or the prompt to activate was accepted,
// an effect to give -5 penalty to hit and a +10 bonus to damage is granted for this attack. The passive part will add a charge when
// the requirements are met and remove it at the end of the owner's turn. The Bonus Attack Activity will prompts a dialog to choose weapon
// with which to make the bonus attack. Then MidiQOL.completeItemUseV2 is called on this item. If no target is selected and the midi settings
// for target confirmation are not active or do not trigger on 'noneTargeted', the user's is asked to confirm a target before MidiQOL.completeItemUseV2 is called.
//
// Description:
// In the preItemRoll (OnUse) phase (on Greater Weapon Master Bonus Attack activity):
//   Prompts the user to select an equipped melee weapon with which to make the bonus attack.
// In the preItemRoll (OnUse) phase (on any owner's item/activity):
//   If the Toggle activity's midi "Toggle Effect" property is checked:
//     If the activity used is not this feat's Toggle activity and the state was set to prompt: set the state to toggled off.
//   Else:
//     Set state to prompt to activate on attack.
//     Delete the toggled on effect.
//     If the activity used is this feat's Toggle activity: block this activity's workflow and prompts a warning.
// In the preAttackRoll (OnUse) phase (on any owner's item):
//   Validates that the item used has the heavy property, that the attack is a melee weapon attack and the actor is proficient with it.
//   If the feat's Toggle activity "Toggle Effect" is unchecked a dialog is prompted to activate the feat on this attack.
//   If the feat is toggled on or the activation has been accepted, it adds an AE to give -5 penaly to melee weapon attack and
//   +10 bonus to damage from a melee weapon attack.
//   This AE only last for one attack.
//   Note: if the weapon has the thrown property, the distance to the target must be less than or equal to 5 ft
//   (10 ft or reach value if the weapon has reach property) to be considered a melee weapon attack.
// In the postActiveEffects (OnUse) phase (on Greater Weapon Master Toggle activity):
//   Sets the state to the next state on->off, off->on, and adds or deletes the toggled on AE if the new state is toggled on or toggled off.
// In the postActiveEffects (OnUse) phase (on Greater Weapon Master Bonus Attack activity):
//   Calls MidiQOL.completeItemUseV2 with the selected weapon.
// In the postActiveEffects (OnUse) phase (on any owner's item other than Greater Weapon Master):
//   If the item used is a melee weapon, and it was a critical or at least one target was dropped to 0 HP,
//   grants one charge to use the special bonus attack if it was not already granted.
// ###################################################################################################

export async function greatWeaponMaster({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Great Weapon Master';
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;
  const OFF_STATE = 0;
  const ON_STATE = 1;
  const PROMPT_STATE = 2;
  const STATES = new Map([
    [ON_STATE, OFF_STATE],
    [OFF_STATE, ON_STATE],
    [PROMPT_STATE, ON_STATE],
  ]);

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
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
    if (isBonusAttackActivity(workflow, scope.macroItem)) {
      return await handleOnUsePreItemRollBonusAttack(workflow, scope.macroItem, actor);
    } else {
      return await handleOnUsePreItemRollOthers(workflow, scope.macroItem, actor);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll') {
    await handleOnUsePreAttackRoll(workflow, scope.macroItem);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (isToggleActivity(workflow, scope.macroItem)) {
      await handleOnUsePostActiveEffectsToggle(scope.macroItem, actor);
    } else if (isBonusAttackActivity(workflow, scope.macroItem)) {
      await handleOnUsePostActiveEffectsBonusAttack(workflow, scope.macroItem);
    } else if (scope.rolledItem?.uuid !== scope.macroItem.uuid) {
      await handleOnUsePostActiveEffectsOtherItems(workflow, scope.macroItem, scope.rolledItem);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRollConfig') {
    if (workflow.item?.getFlag('midi-qol', 'syntheticItem')) {
      // Note: patch to fix problem with getAssociatedItem which does not prepare data when creating a synthetic item
      workflow.activity?.item?.prepareData();
      workflow.activity?.item?.prepareFinalAttributes();
    }
  } else if (args[0] === 'on') {
    // Clear item state when first applied
    await getBonusAttackActivity(item)?.update({ 'uses.spent': 1 });
    await actor.setFlag(MODULE_ID, 'greatWeaponMaster.bonus', false);
  } else if (args[0] === 'each') {
    // Reset the Heavy Weapon Master Attack bonus action to 0 charge
    const attackActivity = getBonusAttackActivity(item);
    if (
      attackActivity?.uses?.spent !== 1 ||
      foundry.utils.getProperty(actor, `flags.${MODULE_ID}.greatWeaponMaster.bonus`)
    ) {
      await attackActivity?.update({ 'uses.spent': 1 });
      await actor.setFlag(MODULE_ID, 'greatWeaponMaster.bonus', false);
    }
  }

  /**
   * Prompts the user to select an equipped melee weapon with which to make the bonus attack.
   * If no target is selected and the midi settings for target confirmation are not active or do not trigger on 'noneTargeted',
   * the user's is asked to confirm a target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Actor5e} sourceActor - The owner of the Great Weapon Master item.
   *
   * @returns true if the activity workflow can continue, false otherwise.
   */
  async function handleOnUsePreItemRollBonusAttack(currentWorkflow, sourceItem, sourceActor) {
    const filteredWeapons = elwinHelpers.getEquippedMeleeWeapons(sourceActor);
    if (filteredWeapons.length === 0) {
      const msg = `${sourceItem.name} | No melee weapon equipped.`;
      ui.notifications.warn(msg);
      return false;
    }

    const chosenWeaponId = sourceActor.getFlag(MODULE_ID, 'greatWeaponMaster.weaponChoiceId');
    let weaponItem = filteredWeapons[0];
    if (filteredWeapons.length > 1) {
      weaponItem = await getSelectedWeapon(sourceItem, filteredWeapons, chosenWeaponId);
    }
    if (!weaponItem) {
      // Bonus attack was cancelled
      const msg = `${sourceItem.name} | No weapon selected for the bonus attack.`;
      ui.notifications.warn(msg);
      return false;
    }
    // Keep weapon choice for next time (used as pre-selected choice) and for postActiveEffects
    await sourceActor.setFlag(MODULE_ID, 'greatWeaponMaster.weaponChoiceId', weaponItem.id);
    return true;
  }

  /**
   * Adjust the behavior of Great Weapon Master feat depending on the value of the Toggle activity's midi "Toggle Effect" property.
   * If the midi "Toggle Effect" property is checked:
   *   If the activity used is not this feat's Toggle activity and the state was set to prompt: set the state to toggle off.
   * Else:
   *   Set prompt to activate on attack.
   *   Delete the toggled on effect.
   *   If the activity used is this feat's Toggle activity: block this activity's workflow and prompts a warning.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Actor5e} sourceActor - The owner of the Great Weapon Master item.
   *
   * @returns true if the activity workflow can continue, false otherwise.
   */
  async function handleOnUsePreItemRollOthers(currentWorkflow, sourceItem, sourceActor) {
    const toggleActivity = getToggleActivity(sourceItem);
    const toggleEffect = toggleActivity?.midiProperties.toggleEffect ?? false;
    if (toggleEffect) {
      const gwmState = sourceItem.getFlag(MODULE_ID, 'greatWeaponMasterState') ?? OFF_STATE;
      if (currentWorkflow.itemUuid !== sourceItem.uuid) {
        // Reset state to toggle off if prompt
        if (gwmState === PROMPT_STATE) {
          await sourceItem.setFlag(MODULE_ID, 'greatWeaponMasterState', OFF_STATE);
        }
      }
    } else {
      await sourceItem.setFlag(MODULE_ID, 'greatWeaponMasterState', PROMPT_STATE);
      await sourceActor.effects.find((ae) => ae.getFlag(MODULE_ID, 'greatWeaponMasterToggledOn'))?.delete();
      if (isToggleActivity(currentWorkflow, sourceItem)) {
        const msg = `${sourceItem.name} | The ${
          currentWorkflow.activity.name ?? 'Toggle'
        } activity can only be triggered when the activity's Midi property 'Toggle Effect' is checked.`;
        ui.notifications.warn(msg);
        return false;
      }
    }
    return true;
  }

  /**
   * When the attack is made with a heavy weapon, is a melee weapon attack and the actor is proficient with it,
   * if in prompt mode ask if the bonus/malus should be added before adding an AE, otherwise if toggled on adds an AE for the bonus/malus.
   * This AE only last for one attack.
   * Note: if the weapon has the thrown property, the distance to the target must be less than or equal to 5 ft
   *       (10 ft or reach value if the weapon has reach property) to be considered a melee weapon attack.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   */
  async function handleOnUsePreAttackRoll(currentWorkflow, sourceItem) {
    const usedItem = currentWorkflow.item;
    if (
      !elwinHelpers.isMeleeWeapon(usedItem) ||
      !elwinHelpers.hasItemProperty(usedItem, 'hvy') ||
      !usedItem?.system?.prof?.hasProficiency ||
      !elwinHelpers.isMeleeWeaponAttack(
        currentWorkflow.activity,
        currentWorkflow.token,
        currentWorkflow.targets.first()
      )
    ) {
      // Only works on proficient heavy melee weapon attacks
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not an heavy melee weapon attack.`);
      }
      return;
    }

    const gwmState = sourceItem.getFlag(MODULE_ID, 'greatWeaponMasterState');
    if (gwmState === OFF_STATE) {
      return;
    } else if (gwmState === PROMPT_STATE) {
      const activate = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${sourceItem.name} - Activation` },
        content: `<p>Use ${sourceItem.name}? (-5 to attack, +10 to damage)</p>`,
        defaultYes: true,
        modal: true,
        rejectClose: false,
      });
      if (!activate) {
        return;
      }
    }
    // Add an AE for -5 to hit +10 dmg
    await addMalusBonusActiveEffect(sourceItem);
  }

  /**
   * Calls MidiQOL.completeItemUseV2 with the selected weapon to make the bonus attack.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   */
  async function handleOnUsePostActiveEffectsBonusAttack(currentWorkflow, sourceItem) {
    const currentActor = currentWorkflow.actor;
    const weaponItem = currentActor?.items.get(currentActor?.getFlag(MODULE_ID, 'greatWeaponMaster.weaponChoiceId'));
    if (!weaponItem) {
      ui.notifications.warn(
        `${sourceItem.name} | No selected weapon for bonus attack, reallocate spent resource if needed.`
      );
      const consumed = MidiQOL.getCachedChatMessage(currentWorkflow.itemCardUuid)?.getFlag('dnd5e', 'use.consumed');
      if (consumed) {
        await currentWorkflow.activity?.refund(consumed);
      }
      return;
    }
    const bonusAttackWorkflow = await doBonusAttack(currentWorkflow, sourceItem, weaponItem);
    if (bonusAttackWorkflow?.aborted) {
      ui.notifications.warn(`${sourceItem.name} | The bonus attack was aborted, reallocate spent resource if needed.`);
      const consumed = MidiQOL.getCachedChatMessage(currentWorkflow.itemCardUuid)?.getFlag('dnd5e', 'use.consumed');
      if (consumed) {
        await currentWorkflow.activity?.refund(consumed);
      }
    }
  }

  /**
   * Sets the state to the next state on->off, off->on, and adds or deletes the toggled on AE if the new state is toggled on or toggled off.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Actor5e} sourceActor - The owner of the Great Weapon Master item.
   */
  async function handleOnUsePostActiveEffectsToggle(sourceItem, sourceActor) {
    const gwmState = sourceItem.getFlag(MODULE_ID, 'greatWeaponMasterState') ?? OFF_STATE;
    await sourceItem.setFlag(MODULE_ID, 'greatWeaponMasterState', STATES.get(gwmState));

    const bonusMalusEffect = sourceActor.effects.find((ae) => ae.getFlag(MODULE_ID, 'greatWeaponMasterToggledOn'));
    if (STATES.get(gwmState) === ON_STATE) {
      // Add AE for toggle mode on
      if (!bonusMalusEffect) {
        await addToggledOnEffect(sourceItem);
      }
    } else {
      await bonusMalusEffect?.delete();
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
      usedItem?.type !== 'weapon' ||
      !['simpleM', 'martialM'].includes(usedItem?.system.type?.value) ||
      currentWorkflow.activity?.actionType !== 'mwak'
    ) {
      // Not a melee weapon...
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a melee weapon.`);
      }
      return;
    }
    // Adds a charge to the bonus action if the conditions are met.
    if (currentWorkflow.actor.getFlag(MODULE_ID, 'greatWeaponMaster.bonus')) {
      // A bonus action was already granted
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

    // Set one charge to the Heavy Weapon Master Attack bonus action for this turn and keep id of weapon that did it
    await getBonusAttackActivity(sourceItem)?.update({ 'uses.spent': 0 });
    await currentWorkflow.actor.setFlag(MODULE_ID, 'greatWeaponMaster', { bonus: true, weaponChoiceId: usedItem.id });

    // Add chat message saying a bonus attack can be made
    const message = await TextEditor.enrichHTML(
      `<p><strong>${sourceItem.name}</strong> - You can make a special bonus attack [[/item ${sourceItem.id} activity=${
        getBonusAttackActivity(sourceItem).id
      }]].</p>`,
      {
        relativeTo: sourceItem.actor,
        rollData: sourceItem.getRollData(),
      }
    );
    MidiQOL.addUndoChatMessage(
      await ChatMessage.create({
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: message,
        speaker: ChatMessage.getSpeaker({ actor: currentWorkflow.actor, token: currentWorkflow.token }),
        whisper: ChatMessage.getWhisperRecipients('GM').map((u) => u.id),
      })
    );
  }

  /**
   * Returns the bonus attack activity of the Great Weapon Master item.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   *
   * @returns {Activity} The bonus attack activity, undefined if not found.
   */
  function getBonusAttackActivity(sourceItem) {
    return sourceItem.system.activities?.find((a) => a.identifier === 'bonus-attack');
  }

  /**
   * Returns true if the current workflow activity is the bonus attack activity of the Great Weapon Master item.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   *
   * @returns {boolean} True if the current workflow activity is the bonus attack activity
   *                    of the Great Weapon Master item, false otherwise.
   */
  function isBonusAttackActivity(currentWorkflow, sourceItem) {
    return sourceItem.uuid === currentWorkflow.itemUuid && currentWorkflow.activity?.identifier === 'bonus-attack';
  }

  /**
   * Returns the toggle activity of the Great Weapon Master item.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   *
   * @returns {Activity} The toggle activity, undefined if not found.
   */
  function getToggleActivity(sourceItem) {
    return sourceItem.system.activities?.find((a) => a.identifier === 'toggle');
  }

  /**
   * Returns true if the current workflow activity is the toggle activity of the Great Weapon Master item.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   *
   * @returns {boolean} True if the current workflow activity is the toggle activity
   *                    of the Great Weapon Master item, false otherwise.
   */
  function isToggleActivity(currentWorkflow, sourceItem) {
    return sourceItem.uuid === currentWorkflow.itemUuid && currentWorkflow.activity?.identifier === 'toggle';
  }

  /**
   * Adds an active effect to show that the feat toggle on state is active.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   */
  async function addToggledOnEffect(sourceItem) {
    // Add AE for toggle mode on
    const effectData = {
      changes: [],
      img: sourceItem.img,
      name: `${sourceItem.name} - Toggled On`,
      origin: sourceItem.uuid,
      transfer: false,
      flags: {
        dae: { showIcon: true, stackable: 'noneName' },
        [MODULE_ID]: {
          greatWeaponMasterToggledOn: true,
        },
      },
    };
    await sourceItem.actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }

  /**
   * Adds an active effect to add a malus to attack and bonus to damage.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   */
  async function addMalusBonusActiveEffect(sourceItem) {
    // Add an AE for -5 to hit +10 dmg
    const effectData = {
      changes: [
        {
          key: 'system.bonuses.mwak.attack',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '-5',
          priority: '20',
        },
        {
          key: 'system.bonuses.mwak.damage',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '+10',
          priority: '20',
        },
      ],
      img: sourceItem.img,
      name: `${sourceItem.name} - Bonus/Malus`,
      origin: sourceItem.uuid,
      transfer: false,
      duration: { turns: 1 },
      flags: { dae: { specialDuration: ['1Attack'], stackable: 'noneName' } },
    };
    await sourceItem.actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }

  /**
   * Prompts a dialog to select a weapon and returns the id of the selected weapon.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Item5e[]} weaponChoices - Array of weapon items from which to choose.
   * @param {string} defaultChosenWeaponId - Id of weapon to be selected by default.
   *
   * @returns {Item5e|null} the selected weapon.
   */
  async function getSelectedWeapon(sourceItem, weaponChoices, defaultChosenWeaponId) {
    const defaultWeapon = weaponChoices.find((i) => i.id === defaultChosenWeaponId);
    return elwinHelpers.ItemSelectionDialog.createDialog(
      `⚔️ ${sourceItem.name}: Choose a Weapon`,
      weaponChoices,
      defaultWeapon
    );
  }

  /**
   * Do a complete item use with the specified weapon but changing its attack activities activation
   * to special or bonus depending on the rules version.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Item5e} weaponItem - The weapon with which to attack.
   */
  async function doBonusAttack(currentWorkflow, sourceItem, weaponItem) {
    // Change activation type to special so it is not considered as an Attack Action
    const weaponItemData = weaponItem.toObject();
    weaponItemData._id = foundry.utils.randomID();
    weaponItemData.name += ` (${getBonusAttackActivity(sourceItem).name})`;
    // Flag item as synthetic
    foundry.utils.setProperty(weaponItemData, 'flags.midi-qol.syntheticItem', true);
    // TODO remove when fixed... Need to add onOnUseMAcro to prepare the item and activity because ChatMessage.getAssociatedItem does not do it...
    let onUseMacroName = foundry.utils.getProperty(weaponItemData, 'flags.midi-qol.onUseMacroName') ?? '';
    const preDamageRollConfigMacro = `[preDamageRollConfig]ItemMacro.${sourceItem.uuid}`;
    foundry.utils.setProperty(
      weaponItemData,
      'flags.midi-qol.onUseMacroName',
      onUseMacroName?.length ? ',' + preDamageRollConfigMacro : preDamageRollConfigMacro
    );

    for (let activityId of Object.keys(weaponItemData.system.activities ?? {})) {
      const activity = weaponItemData.system.activities[activityId];
      if (activity?.type !== 'attack') {
        continue;
      }
      activity.activation ??= {};
      activity.activation.type = 'special';
      activity.activation.cost = null;
    }
    const weaponCopy = new Item.implementation(weaponItemData, { parent: sourceItem.actor });
    weaponCopy.prepareData();
    weaponCopy.prepareFinalAttributes();

    const config = {
      midiOptions: {
        targetUuids: currentWorkflow.targets.size ? [currentWorkflow.targets.first().document.uuid] : [],
        workflowOptions: { autoRollAttack: true },
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
    if (game.release.generation > 12) {
      return await MidiQOL.completeItemUse(weaponCopy, config, {}, message);
    } else {
      return await MidiQOL.completeItemUseV2(weaponCopy, config, {}, message);
    }
  }
}
