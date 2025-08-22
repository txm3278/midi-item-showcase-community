// ##################################################################################################
// Read First!!!!
// Marks a target by an "Unwavering Mark", it handles the effect of attacks made by a marked targets
// and the special attack that a marked target can trigger from the marker.
// v3.3.0
// Author: Elwin#1410
// Dependencies:
//  - DAE: [off][each]
//  - Times Up
//  - MidiQOL "on use" item macro, [preTargeting][preAttackRoll][preDamageRoll][postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that marks a target when a melee attack is successful.
// It can also be activated to use the Special Attack if one was triggered by a marked target.
// When activated if a marked target triggered a special attack, an attack with a selected weapon
// is made with an additional damage bonus.
//
// Description:
// In the preTargeting phase of the Unwavering Mark Bonus Attack activity (in owner's workflow):
//   Verifies if a marked target triggered a special attack. If not, the activity use is aborted.
// In the preDamageRollConfig phase of the Unwavering Mark special weapon attack activity (in owner's workflow):
//   if the attack was triggered by the Unwavering Mark Bonus Attack activity,
//   calls elwinHelpers.damageConfig.updateBasic to add a hook on dnd5e.preRollDamageV2 that adds damage bonus.
// In the postActiveEffects phase of an item from the owner of an Unwavering Mark item (in owner's workflow):
//   It adds an active effect that gives disadvantage on attacks made by the marked target
//   that does not target the marker if he is within 5ft.
// In the postActiveEffects phase of the Unwavering Mark Bonus Attack activity (in owner's workflow):
//   If a special attack was triggered by a marked target, makes a meele weapon attack with an additional damage bonus.
//   If more than one melee weapon is equipped, it prompts for which weapon to use.
//   If more than one target triggered a special attack, it prompts for which target to attack.
// In the preAttackRoll of an item from a marked target (in the attacker's workflow):
//   If the marked target attacks another target than the marker and the marker is
//   within range, the attacker has disadvantage on his attack roll.
// In the postActiveEffects of an item from a marked target (in the attacker's workflow):
//   If a target that was not the marker received damage from an attack, it flags the marker that
//   this marked target triggered a special attack.
// When the owner of the Unwavering Mark turn ends [each]:
//   Resets the marked targets and the triggered special attacks flag.
// When the Marked by Unwavering Mark expires [off]:
//   Removes the marked token UUID from the triggered special attacks flags of the marker but only
//   if the expiration was not caused by the addition of a new mark on the same token.
// ###################################################################################################

export async function unwaveringMark({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const DEFAULT_ITEM_NAME = 'Unwavering Mark';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis.elwinHelpers?.version ?? '1.1', '3.5.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    if (scope.macroItem.uuid !== scope.rolledItem?.uuid || workflow.activity?.identifier !== 'bonus-attack') {
      // Do nothing if item used is not the bonus attack activity from source item
      return true;
    }

    // Block item usage if no target triggered the special attack
    const specialAttackTargetTokenUuids = DAE.getFlag(actor, 'unwaveringMark.specialAttackTargetTokenUuids') ?? [];

    const specialAttackTargetTokens = getTargetTokens(specialAttackTargetTokenUuids);
    if (specialAttackTargetTokens.length === 0) {
      ui.notifications.warn(`${scope.macroItem.name} | No marked target triggered the Special Attack action.`);
      return false;
    }

    const filteredWeapons = elwinHelpers.getEquippedMeleeWeapons(actor);
    if (filteredWeapons.length === 0) {
      const warnMsg = 'No melee weapon equipped.';
      ui.notifications.warn(`${scope.macroItem.name} | No melee weapon equipped.`);
      return false;
    }
    return true;
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll') {
    if (actor.getFlag(MODULE_ID, 'unwaveringMark.markerTokenUuid')) {
      // When the marked target makes an attack
      handlePreAttackRollByMarkedTarget(workflow, scope.macroItem);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRollConfig') {
    if (workflow?.workflowOptions?.unwaveringMarkSpecialWeaponAttack) {
      // When the special weapon attack rolls damage
      handlePreDamageRollConfigForSpecialWeaponAttack(workflow, scope.macroItem);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    const macroData = args[0];

    if (actor.getFlag(MODULE_ID, 'unwaveringMark.markerTokenUuid')) {
      // When the marked target makes an attack
      await handlePostActiveEffectsByMarkedTarget(macroData, workflow, actor, scope.macroItem);
      return;
    }
    if (scope.rolledItem.uuid !== scope.macroItem.uuid) {
      // Item usage other than the source item
      await handlePostActiveEffectsByMarker(workflow, token, scope.macroItem);
      return;
    }

    // Item usage is special attack
    await handlePostActiveEffectsBySpecialAttack(macroData, workflow, actor, scope.rolledItem);
  } else if (args[0] === 'each') {
    // Unset flag that allows special attack and current turn marked targets at end of each turn
    await DAE.unsetFlag(actor, 'unwaveringMark');
  } else if (args[0] === 'off') {
    const markerTokenUuid = args[1];
    // Remove this token from special attack flag on marker unless the delete is caused by the same origin
    if (
      scope.lastArgValue['expiry-reason'] &&
      scope.lastArgValue['expiry-reason'] !== `new-unwavering-mark:${scope.lastArgValue.origin}`
    ) {
      let specialAttackTargetTokenUuids = DAE.getFlag(markerTokenUuid, 'unwaveringMark.specialAttackTargetTokenUuids');
      if (specialAttackTargetTokenUuids) {
        specialAttackTargetTokenUuids = foundry.utils.deepClone(specialAttackTargetTokenUuids);
        // Remove token from specialAttackTargets
        const foundIdx = specialAttackTargetTokenUuids.indexOf((tu) => tu === scope.lastArgValue.tokenUuid);
        if (foundIdx >= 0) {
          specialAttackTargetTokenUuids.splice(foundIdx, 1);
        }
        if (specialAttackTargetTokenUuids.length > 0) {
          await DAE.setFlag(
            markerTokenUuid,
            'unwaveringMark.specialAttackTargetTokenUuids',
            specialAttackTargetTokenUuids
          );
        } else {
          await DAE.unsetFlag(markerTokenUuid, 'unwaveringMark.specialAttackTargetTokenUuids');
        }
      }
    }
  }

  /**
   * Returns the target tokens associated to the target UUIDs.
   *
   * @param {string[]} targetTokenUuids the UUIDs of target tokens.
   * @returns {Token5e[]} an array of target tokens corresponding to the UUIDs.
   */
  function getTargetTokens(targetTokenUuids) {
    const targetTokens = targetTokenUuids.map((uuid) => fromUuidSync(uuid).object).filter((t) => t);
    return targetTokens;
  }

  /**
   * If the marked target attacks another target than the marker and the marker is
   * within range, the attacker has disadvantage on his attack roll.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem the Unwavering Mark item.
   */
  function handlePreAttackRollByMarkedTarget(currentWorkflow, sourceItem) {
    const markerTokenUuid = actor.getFlag(MODULE_ID, 'unwaveringMark.markerTokenUuid');
    if (!isPassiveEffectActiveForItem(scope.macroItem)) {
      if (debug) {
        const reason = getActiveEffectInactivityReason(markerTokenUuid);
        console.warn(
          `${DEFAULT_ITEM_NAME} | Mark has no effect when source ActiveEffect is not active, reason: ${reason}.`
        );
      }
      return;
    }

    const markerToken = fromUuidSync(markerTokenUuid)?.object;
    if (!markerToken) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Missing token for marker token UUID ${markerTokenUuid}.`);
      }
      return;
    }

    const dist = MidiQOL.computeDistance(currentWorkflow.token, markerToken, true);
    if (dist <= -1 || dist > 5) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Marker token out of range: ${dist}.`);
      }
      return;
    }
    const nonMarkerTargetExists = currentWorkflow.targets.some((t) => t?.document.uuid !== markerTokenUuid);

    if (nonMarkerTargetExists) {
      currentWorkflow.disadvantage = true;
      currentWorkflow.attackAdvAttribution.add(`DIS:${sourceItem.name}`);
      currentWorkflow.advReminderAttackAdvAttribution.add(`DIS:${sourceItem.name}`);
    }
  }

  /**
   * Verifies if the conditions are met to trigger the special attack from the marker,
   * if its the case a flag is set on the marker.
   *
   * @param {object} macroData midi-qol macro data.
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Actor5e} currentActor current actor.
   * @param {Item5e} sourceItem  the Unwavering Mark item.
   */
  async function handlePostActiveEffectsByMarkedTarget(macroData, currentWorkflow, currentActor, sourceItem) {
    if (currentWorkflow.hitTargets.size < 1) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target hit.`);
      }
      return;
    }

    const markerTokenUuid = currentActor.getFlag(MODULE_ID, 'unwaveringMark.markerTokenUuid');
    if (!isPassiveEffectActiveForItem(sourceItem)) {
      if (debug) {
        const reason = getActiveEffectInactivityReason(markerTokenUuid);
        console.warn(
          `${DEFAULT_ITEM_NAME} | Mark has no effect when source ActiveEffect is not active, reason: ${reason}.`
        );
      }
      return;
    }

    if (macroData.targetUuids.every((targetUuid) => targetUuid === markerTokenUuid)) {
      // Target is the source of the mark, special attack not triggered
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Target selected is the marker.`);
      }
      return;
    }

    if (!currentWorkflow.attackRoll) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Item does not have an attack.`);
      }
      return;
    }
    if (!currentWorkflow.damageList.some((d) => d.totalDamage > 0 && d.tokenUuid !== markerTokenUuid)) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No damage dealt to other than marker.`);
      }
      return;
    }

    const markerTokenActor = MidiQOL.MQfromActorUuid(markerTokenUuid);

    // Set flag for who was marked that did damage (triggered the special attack)
    const specialAttackTargetTokenUuids = foundry.utils.deepClone(
      DAE.getFlag(markerTokenActor, 'unwaveringMark.specialAttackTargetTokenUuids') ?? []
    );
    if (!specialAttackTargetTokenUuids.includes(currentWorkflow.tokenUuid)) {
      specialAttackTargetTokenUuids.push(currentWorkflow.tokenUuid);
      await DAE.setFlag(
        markerTokenActor,
        'unwaveringMark.specialAttackTargetTokenUuids',
        specialAttackTargetTokenUuids
      );
    }

    // Add chat message saying bonus attack can be made against this creature
    let player = MidiQOL.playerForActor(markerTokenActor);
    if (!player) {
      console.warn(`${DEFAULT_ITEM_NAME} | No active player or GM for actor.`, markerTokenActor);
      return;
    }
    const markerTokenDoc = fromUuidSync(markerTokenUuid);

    const message = elwinHelpers.getTargetDivs(
      currentWorkflow.token,
      `<p><strong>${sourceItem.name}</strong> - You can make a special bonus attack on your turn against \${tokenName}.</p>`
    );
    MidiQOL.addUndoChatMessage(
      await ChatMessage.create({
        user: player?.id,
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        content: message,
        speaker: ChatMessage.getSpeaker({ actor: markerTokenActor, token: markerTokenDoc }),
        whisper: ChatMessage.getWhisperRecipients('GM').map((u) => u.id),
      })
    );
  }

  /**
   * On a hit with a melee weapon attack, ask if the target needs to be marked and if that's the case,
   * an effect to mark it is added. Note: previous marks are removed.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol workflow.
   * @param {Token5e} sourceToken source token.
   * @param {Item5e} sourceItem  the Unwavering Mark item.
   */
  async function handlePostActiveEffectsByMarker(currentWorkflow, sourceToken, sourceItem) {
    if (currentWorkflow.hitTargets.size < 1) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target hit.`);
      }
      return;
    }

    const targetToken = currentWorkflow.hitTargets.first();
    if (!currentWorkflow.damageDetail?.some((dt) => dt.value > 0 && !['temphp', 'midi-none'].includes(dt.type))) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No damage dealt.`);
      }
      return;
    }

    if (!elwinHelpers.isMeleeWeaponAttack(currentWorkflow.activity, sourceToken, targetToken)) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a melee weapon attack.`);
      }
      return;
    }

    const targetActor = targetToken.actor;
    const targetUuid = targetToken.document.uuid;
    let currentTurnMarkedTargetTokenUuids = foundry.utils.deepClone(
      DAE.getFlag(sourceToken, 'unwaveringMark.currentTurnMarkedTargetTokenUuids') ?? []
    );
    // Prompt dialog to ask if attacker wants to mark the target, unless this target was already marked this turn
    const foundIdx = currentTurnMarkedTargetTokenUuids.indexOf((tu) => tu === targetUuid);
    if (foundIdx >= 0) {
      if (targetActor.getFlag(MODULE_ID, 'unwaveringMark.markerTokenUuid') === currentWorkflow.tokenUuid) {
        // Target already marked this turn.
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | Target already marked this turn.`);
        }
        return;
      }
      // Remove token from marked targets
      currentTurnMarkedTargetTokenUuids.splice(foundIdx, 1);
    }

    const markTarget = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${sourceItem.name} - Mark Target` },
      content: `<p>Mark the current target with ${sourceItem.name}?</p>`,
      defaultYes: true,
      modal: true,
      rejectClose: false,
    });
    if (!markTarget) {
      return;
    }

    // Keep marked target
    currentTurnMarkedTargetTokenUuids.push(targetUuid);
    await DAE.setFlag(
      sourceToken,
      'unwaveringMark.currentTurnMarkedTargetTokenUuids',
      currentTurnMarkedTargetTokenUuids
    );

    const targetEffectName = `Marked by ${sourceItem.name}`;

    // Remove previous effects
    const targetEffectToDelete = targetActor.effects.getName(targetEffectName);
    if (targetEffectToDelete) {
      await MidiQOL.removeEffects({
        actorUuid: targetActor.uuid,
        effects: [targetEffectToDelete.id],
        options: { 'expiry-reason': `new-unwavering-mark:${sourceItem.uuid}` },
      });
    }
    // create an active effect to set disadvantage on attack rolls not made on marker
    const targetEffectData = {
      changes: [
        // flag to indicate marker
        {
          key: `flags.${MODULE_ID}.unwaveringMark.markerTokenUuid`,
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: currentWorkflow.tokenUuid,
          priority: 20,
        },
        // macro to handle disadvantage on attacks other than marker
        {
          key: 'flags.midi-qol.onUseMacroName',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: `ItemMacro,preAttackRoll`,
          priority: 20,
        },
        // macro to handle damage dealt to other targets than marker
        {
          key: 'flags.midi-qol.onUseMacroName',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: `ItemMacro,postActiveEffects`,
          priority: 20,
        },
        // macro for on/off of effect
        {
          key: 'macro.itemMacro',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: `${currentWorkflow.tokenUuid}`,
          priority: 20,
        },
      ],
      duration: { rounds: 1, turns: 1 },
      origin: sourceItem.uuid, //flag the effect as associated to the source item
      transfer: false,
      disabled: false,
      img: sourceItem.img,
      name: targetEffectName,
      'flags.dae': { specialDuration: ['turnEndSource'], stackable: 'noneNameOnly' },
    };

    await MidiQOL.createEffects({ actorUuid: targetActor.uuid, effects: [targetEffectData] });
  }

  /**
   * Makes a special attack on a marked target that triggered it.
   * The attacker must choose a weapon with which to attack and is more than one target triggered
   * a special attack, choose a target.
   *
   * @param {object} macroData midi-qol macro data.
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol workflow.
   * @param {Actor5e} sourceActor The source actor.
   * @param {Item5e} sourceItem The Unwavering Mark item.
   */
  async function handlePostActiveEffectsBySpecialAttack(macroData, currentWorkflow, sourceActor, sourceItem) {
    const specialAttackTargetTokenUuids =
      DAE.getFlag(sourceActor, 'unwaveringMark.specialAttackTargetTokenUuids') ?? [];
    const specialAttackTargetTokens = getTargetTokens(specialAttackTargetTokenUuids);
    if (specialAttackTargetTokens.length === 0) {
      // Should not happen, this should be checked on the preTargeting phase
      return;
    }

    const filteredWeapons = elwinHelpers.getEquippedMeleeWeapons(sourceActor);
    if (filteredWeapons.length === 0) {
      // Should not happen, this should be checked on the preTargeting phase
      return;
    }

    const chosenWeaponId = sourceActor.getFlag(MODULE_ID, 'unwaveringMark.weaponChoiceId');
    let weaponItem = filteredWeapons[0];
    if (filteredWeapons.length > 1) {
      weaponItem = await getSelectedWeapon(sourceItem, filteredWeapons, chosenWeaponId);
    }
    if (!weaponItem) {
      // Special attack was cancelled
      console.warn(`${DEFAULT_ITEM_NAME} | Special attack was cancelled, reallocate spent resource if needed.`);
      return;
    }
    // Keep weapon choice for next time (used as pre-selected choice)
    await sourceActor.setFlag(MODULE_ID, 'unwaveringMark.weaponChoiceId', weaponItem.id);

    // Select from special attack target tokens
    const currentTarget = currentWorkflow.targets.first();
    let selectedTarget =
      (currentTarget
        ? specialAttackTargetTokens.find((t) => t.document.uuid === currentTarget.document.uuid)
        : undefined) ?? specialAttackTargetTokens[0];
    if (specialAttackTargetTokens.length > 1) {
      selectedTarget = await getSelectedTarget(sourceItem, specialAttackTargetTokens, selectedTarget);
    }
    if (!selectedTarget) {
      // Special attack was cancelled
      console.warn(`${DEFAULT_ITEM_NAME} | Special attack was cancelled, reallocate spent resource if needed.`);
      return;
    }

    // Change activation type to special so it is not considered as an Attack Action
    const updates = {};

    foundry.utils.setProperty(updates, 'name', `${weaponItem.name} [${sourceItem.name}]`);

    // Change activation type to special so it is not considered as an Attack Action
    for (let attackActivity of weaponItem.system.activities?.getByType('attack') ?? []) {
      const activation = foundry.utils.deepClone(attackActivity.activation ?? {});
      activation.type = 'special';
      activation.cost = null;
      foundry.utils.setProperty(updates, `system.activities.${attackActivity.id}.activation`, activation);
    }
    // Create a modified weapon
    const weaponCopy = weaponItem.clone(updates, { keepId: true });

    const config = {
      midiOptions: {
        targetUuids: [selectedTarget.document.uuid],
        advantage: true,
        workflowOptions: { autoRollAttack: true, advantage: true, targetConfirmation: 'none' },
        unwaveringMarkSpecialWeaponAttack: true,
      },
    };

    let result;
    if (game.release.generation > 12) {
      result = await MidiQOL.completeItemUse(weaponCopy, config);
    } else {
      result = await MidiQOL.completeItemUseV2(weaponCopy, config);
    }

    if (!result || result.aborted) {
      // Special attack was cancelled
      console.warn(`${DEFAULT_ITEM_NAME} | Special attack was cancelled, reallocate spent resource if needed.`);
      const consumed = MidiQOL.getCachedChatMessage(result?.itemCardUuid)?.getFlag('dnd5e', 'use.consumed');
      if (consumed) {
        await result?.activity?.refund(consumed);
      }
      return;
    }

    // Unset flag that allows special attack
    await DAE.unsetFlag(sourceActor, 'unwaveringMark.specialAttackTargetTokenUuids');
  }

  /**
   * Calls elwinHelpers.damageConfig.updateBasic to add a hook on dnd5e.preRollDamageV2 that adds damage bonus for the special attack.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol workflow.
   * @param {Item5e} sourceItem The Unwavering Mark item.
   */
  function handlePreDamageRollConfigForSpecialWeaponAttack(currentWorkflow, sourceItem) {
    const damageBonus = Math.floor((currentWorkflow.actor?.getRollData().classes?.fighter?.levels ?? 1) / 2);
    if (!currentWorkflow.activity) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Missing activity.`, currentWorkflow);
      }
      return;
    }
    elwinHelpers.damageConfig.updateBasic(scope, workflow, {
      damageBonus,
      flavor: `${sourceItem.name} - Special Attack Extra Damage`,
      debug,
    });
  }

  /**
   * Prompts a dialog to select a weapon and returns the id of the selected weapon.
   *
   * @param {Item5e} sourceItem item for which the dialog is prompted.
   * @param {Item5e[]} weaponChoices array of weapon items from which to choose.
   * @param {string} defaultChosenWeaponId id of weapon to be selected by default.
   *
   * @returns {Promise<Item5e|null>} selected weapon.
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
   * Prompts a dialog to select a target token and returns it.
   *
   * @param {Item5e} sourceItem item for which the dialog is prompted.
   * @param {Token5e[]} targetTokens list of tokens from which to select a target.
   * @param {Token5e} defaultToken token to be selected by default.
   *
   * @returns {Promise<Token5e|null>} the selected target token.
   */
  async function getSelectedTarget(sourceItem, targetTokens, defaultToken) {
    return await elwinHelpers.TokenSelectionDialog.createDialog(
      `${sourceItem.name}: Choose a Target`,
      targetTokens,
      defaultToken
    );
  }

  /**
   * Verifies if the passive active effect associated to this item is active.
   *
   * @param {Item5e} sourceItem item for which the dialog is prompted.
   * @returns {boolean} true if the passive active effect associated to this item is active, false otherwise.
   */
  function isPassiveEffectActiveForItem(sourceItem) {
    let aePredicate = (ae) => ae.transfer && ae.parent?.uuid === sourceItem.uuid;
    return sourceItem?.actor?.appliedEffects.find(aePredicate) !== undefined;
  }

  /**
   * Returns the reason for which an active effect was inactivated.
   *
   * @param {string|Token5e} tokenRef UUID of the token or token for which an active effect was inactivated.
   * @returns {string} the reason why the active effect was inactivated.
   */
  function getActiveEffectInactivityReason(tokenRef) {
    const incapacitatedCond = MidiQOL.checkIncapacitated(tokenRef, false);
    return CONFIG.statusEffects.find((a) => a.id === incapacitatedCond)?.name ?? '???';
  }
}
