// ##################################################################################################
// Read First!!!!
// When equipped and attuned, adds an action that allows to attach the emblem to a shield or armor.
// Once the emblem is attached, it adds an active effect aura, that effect will trigger a reaction
// on the owner when a creature within range is hit by a critical to allow him to convert it to a normal hit.
// v2.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE, item macro [on],[off]
//  - MidiQOL "on use" item macro, [isHit][preTargeting][postActiveEffects]
//  - Warpgate
//  - Active Auras
//  - Elwin Helpers world script
//
// How to configure:
// The item details must be:
//   - Equipement Type: Trinket
//   - Attunement: Attunement Required
//   - Proficiency: Automatic
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
//   - Limited Uses: 3 of 3 per Dawn
//   - Uses Prompt: (checked)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this item.
// Two effects must also be added:
//   - Guardian Emblem:
//      - Transfer Effect to Actor on item equip (checked)
//      - Effects:
//          - macro.itemMacro | Custom |
//   - Guardian Emblem - Aura:
//      - Effect Suspended (checked)
//      - Transfer Effect to Actor on item equip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,isHit
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 30
//        - Check Token Height: (checked)
//        - Walls Block this Aura?: No
//
// Usage:
// When equipped and attuned, a feat is added that allows to attach/detach to/from a shield or armor.
// When this feat is used, it allows to attach the emblem, once attached, it activates an aura effect.
// It is also a manual reaction item that gets triggered by the active aura effect when appropriate.
//
// Description:
// In the "on" DAE macro call:
//   Creates and adds a feat to the owner of the emblem, using warpgate, to attach/detach it to/from
//   a shield or armor. The feat is added using a wargate mutation.
// In the "off" DAE macro call:
//   Reverts the warpgate mutation that created the attach/detach feat.
//   Reverts the warpgate mutation done by the attach/detach feat.
//   Disables the item's aura effect.
// In the isHit phase of a target having the Guardian Emblem's Active Aura Effect:
//   Validates that the item was triggered by source actor of the Guardian Emblem is not incapacitated,
//   can see the target, that the hit was a critical and has not used its reaction. If the conditions
//   are fulfilled then the Guardian Emblem item is triggered as a reaction on the source actor client's.
//   If the reaction was used and completed successfully, the current workflow critical hit is converted to
//   a normal hit
// In the preTargeting phase of Guardian Emblem item:
//   Validates that item was triggered by the remote isHit phase, otherwise the item workflow execution is aborted.
// In the postActiveEffects phase (of the attach/detach feat):
//   If the emblem is not attached:
//     Prompts a dialog to choose from a list of shield or armors and attach the emblem on the selected
///    item. This is done through a warpgate mutation. Then enables the item's aura effect.
//   If the emblem is attached:
//     Reverts the "attach" warpgate mutation, then disables the item's aura effect.
// ###################################################################################################

export async function guardianEmblem({
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
  const DEFAULT_ITEM_NAME = 'Guardian Emblem';
  // Set to false to remove debug logging
  const debug = true;

  if (!isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '2.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol', 'warpgate', 'ActiveAuras'];
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

  if (args[0] === 'on') {
    const itemName = `${item.name}: Attach/Detach`;
    const updates = {
      embedded: {
        Item: {
          [itemName]: {
            type: 'feat',
            img: item.img,
            system: {
              description: {
                value: 'Attach or detach the emblem to/from a shield or armor',
              },
              activation: {
                type: 'action',
                cost: 1,
              },
            },
            flags: {
              'midi-qol': {
                onUseMacroName: `[postActiveEffects]ItemMacro.${item.uuid}`,
              },
              'midi-item-showcase-community': {
                'guardian-emblem-origin': item.uuid,
              },
            },
          },
        },
      },
    };

    // Add item that allows attaching emblem to shield or armor
    const attachMutationName = `${item.id}-attach-action`;
    if (!!warpgate.mutationStack(token.document).getName(attachMutationName)) {
      await warpgate.revert(token.document, attachMutationName);
    }
    await warpgate.mutate(
      token.document,
      updates,
      {},
      { name: attachMutationName }
    );
  } else if (args[0] === 'off') {
    // Remove item that allows attaching emblem to shield or armor
    await warpgate.revert(token.document, `${item.id}-attach-action`);
    await warpgate.revert(token.document, `${item.id}-attach-item`);
    // Find aura effect to disable it
    await activateAura(item, false);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    return handleGuardianEmblemOnUsePreTargeting(workflow, macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'isHit') {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    // Handle reaction
    await handleGuardianEmblemAuraOnTargetUseIsHit(workflow, token, macroItem);
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    const origin = item.getFlag('midi-item-showcase-community', 'guardian-emblem-origin');
    if (origin !== macroItem.uuid) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | Wrong sourceItemUuid is different from the origin of attach feat item.`,
        sourceItem.uuid,
        origin
      );
      return;
    }
    await handleGuardianEmblemAttachPostActiveEffects(token, macroItem);
  }

  /**
   * Handles the preTargeting phase of the Guardian Emblem item midi-qol workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Guardian Emblem item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleGuardianEmblemOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'isHit' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the isHit of the Guardian Emblem item midi-qol workflow.
   * Triggers a remote reaction on the item owner's client to convert a critical hit on the target
   * into a normal hit.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Token5e} targetToken The target token that is hit.
   * @param {Item5e} sourceItem The Guardian Emblem item.
   */
  async function handleGuardianEmblemAuraOnTargetUseIsHit(
    currentWorkflow,
    targetToken,
    sourceItem
  ) {
    if (!currentWorkflow.isCritical) {
      // Not a critical
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Attack was not a critical hit.`);
      }
      return;
    }

    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`,
        { sourceActor, targetToken }
      );
      return;
    }

    const attachItemUuid = sourceItem.getFlag(
      'midi-item-showcase-community',
      'guardian-emblem-attach-uuid'
    );
    const attachItem = fromUuidSync(attachItemUuid);
    if (!attachItem) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Missing attach item: ${attachItemUuid}.`
        );
      }
      return;
    }
    if (!attachItem?.system.equipped) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Attach item not equipped.`,
          attachItem
        );
      }
      return;
    }

    const sourceToken = MidiQOL.tokenForActor(sourceActor);
    if (!sourceToken) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No source token could be found.`);
      }
      return;
    }

    const self = sourceToken.document.uuid === targetToken.document.uuid;
    if (!self && !MidiQOL.canSee(sourceToken, targetToken)) {
      // There is no line of sight to the target or the target is not visible
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | There is no line of sight to the target.`
        );
      }
      return;
    }

    const result = await elwinHelpers.doThirdPartyReaction(
      currentWorkflow.item,
      targetToken,
      sourceItem,
      'isHit',
      {
        debug,
        attackRoll: currentWorkflow.attackRoll,
      }
    );

    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { result });
    }
    if (result?.uuid === sourceItem.uuid) {
      // Convert critical hits into normal hits
      if (currentWorkflow.isCritical) {
        currentWorkflow.isCritical = false;
        // Set flag for other feature to not put back a critical or least consider it...
        currentWorkflow.options.noCritical = true;

        const configSettings = MidiQOL.configSettings();
        const hitDisplay =
          currentWorkflow.hitDisplayData[targetToken.document.uuid];

        hitDisplay.hitString = game.i18n.localize('midi-qol.hits');
        hitDisplay.hitResultNumeric = `${currentWorkflow.attackTotal}/${
          hitDisplay.ac
            ? Math.abs(currentWorkflow.attackTotal - hitDisplay.ac)
            : '-'
        }`;
        if (
          game.user?.isGM &&
          ['hitDamage', 'all'].includes(configSettings.hideRollDetails)
        ) {
          hitDisplay.hitSymbol = 'fa-tick';
        } else {
          hitDisplay.hitSymbol = 'fa-check';
        }

        // Redisplay roll and hits with the new data
        if (debug) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | Hit display data after updates.`,
            { hitDisplay }
          );
        }
        await currentWorkflow.displayAttackRoll(configSettings.mergeCard);
        await currentWorkflow.displayHits(
          currentWorkflow.whisperAttackCard,
          configSettings.mergeCard
        );
      }
    }
  }

  /**
   * Handles the postActiveEffects of the Guardian Emblem - Attach/Detach feat.
   * If the emblem is not attached:
   *   Prompts a dialog to choose from a list of shield or armors and attach the emblem
   *   on the selected item. This is done through a warpgate mutation, then enables the item's aura effect.
   * If the emblem is attached:
   *   It reverts the "attach" warpgate mutation, then disables the item's aura effect.
   *
   * @param {Token5e} sourceToken The token owner of the Guardian Emblem item.
   * @param {Item5e} sourceItem The Guardian Emblem item.
   */
  async function handleGuardianEmblemAttachPostActiveEffects(
    sourceToken,
    sourceItem
  ) {
    const attachedItemUuid = sourceItem.getFlag(
      'midi-item-showcase-community',
      'guardian-emblem-attach-uuid'
    );
    if (attachedItemUuid) {
      const attachedItem = fromUuidSync(attachedItemUuid);
      if (!attachedItem) {
        if (debug) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | Missing attached item: ${attachItemUuid}.`
          );
        }
      }
      await warpgate.revert(
        sourceToken.document,
        `${sourceItem.id}-attach-item`
      );
      // Find aura effect to disable it
      await activateAura(sourceItem, false);
    } else {
      const armorChoices = sourceToken.actor.itemTypes.equipment.filter(
        (i) => i.isArmor && !i.getFlag('midi-item-showcase-community', 'guardian-emblem-uuid')
      );

      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME}: armorChoices`, armorChoices);
      }

      const selectedArmor = await elwinHelpers.ItemSelectionDialog.createDialog(
        `⚔️ ${sourceItem.name}: Choose an Armor or Shield`,
        armorChoices,
        null
      );
      if (!selectedArmor) {
        console.error(
          `${DEFAULT_ITEM_NAME}: Armor or shield selection was cancelled.`
        );
        return;
      }

      const newItemName = `${selectedArmor.name} (${sourceItem.name})`;
      const updates = {
        embedded: {
          Item: {
            [sourceItem.id]: {},
            [selectedArmor.id]: {
              name: newItemName,
            },
          },
        },
      };
      setProperty(
        updates.embedded.Item[sourceItem.id],
        'flags.midi-item-showcase-community.guardian-emblem-attach-uuid',
        selectedArmor.uuid
      );
      setProperty(
        updates.embedded.Item[selectedArmor.id],
        'flags.midi-item-showcase-community.guardian-emblem-uuid',
        sourceItem.uuid
      );

      const attachItemMutationName = `${sourceItem.id}-attach-item`;
      if (
        !!warpgate
          .mutationStack(sourceToken.document)
          .getName(attachItemMutationName)
      ) {
        await warpgate.revert(sourceToken.document, attachItemMutationName);
      }
      await warpgate.mutate(
        sourceToken.document,
        updates,
        {},
        { name: attachItemMutationName, comparisonKeys: { Item: 'id' } }
      );
      // Find aura effect to enable it
      await activateAura(sourceItem, true);
    }
  }

  /**
   * Enables or disables the aura effect.
   * Note: if CONFIG.ActiveEffect.legacyTransferral is true, its the effect transferred on
   * the actor that is updated, otherwise its the one on the item. This done otherwise DAE
   * deletes and recreates the AE on the actor which triggers a call to off/on macro.
   *
   * @param {Item5e} sourceItem The Guardian Emblem item.
   * @param {boolean} activate flag to indicate if the aura effect must be activate or deactivated.
   */
  async function activateAura(sourceItem, activate) {
    // Find aura effect to enable it
    const sourceActor = sourceItem.actor;
    if (!sourceActor) {
      if (debug) {
        console.error(
          `${DEFAULT_ITEM_NAME} | Missing source item actor.`,
          sourceItem
        );
      }
      return;
    }
    let auraEffect = undefined;
    let aePredicate = undefined;
    if (CONFIG.ActiveEffect.legacyTransferral) {
      aePredicate = (ae) =>
        ae.flags?.dae?.transfer &&
        ae.origin === sourceItem.uuid &&
        ae.getFlag('ActiveAuras', 'isAura');
    } else {
      aePredicate = (ae) =>
        ae.transfer &&
        ae.parent?.uuid === sourceItem.uuid &&
        ae.getFlag('ActiveAuras', 'isAura');
    }

    if (activate) {
      auraEffect = [...sourceActor.allApplicableEffects()].find(aePredicate);
      if (!auraEffect) {
        console.error(`${DEFAULT_ITEM_NAME} | Aura effect not found.`);
        return;
      }
    } else {
      auraEffect = sourceActor.appliedEffects?.find(aePredicate);
      if (!auraEffect) {
        console.warn(`${DEFAULT_ITEM_NAME} | Aura effect not active.`);
        return;
      }
    }
    await auraEffect.update({ disabled: !activate });
  }
}
