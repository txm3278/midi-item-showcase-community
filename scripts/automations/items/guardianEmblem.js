// ##################################################################################################
// Read First!!!!
// When equipped and attuned, adds an action that allows to attach the emblem to a shield or armor.
// Once the emblem is attached, it adds a third party reaction active effect, that effect will trigger a reaction
// on the owner when a creature within range is hit by a critical to allow him to convert it to a normal hit.
// v3.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE, item macro [on],[off]
//  - MidiQOL "on use" item macro, [preTargeting][postActiveEffects][tpr.isHit]
//  - Warpgate
//  - Elwin Helpers world script
//
// How to configure:
// The item details must be:
//   - Equipement Type: Trinket
//   - Attunement: Attunement Required
//   - Proficiency: Automatic
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction on allies only)
//   - Range: 30 feet
//   - Limited Uses: 3 of 3 per Dawn
//   - Uses Prompt: (checked)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - No Full cover: (checked)
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isHit" && workflow.isCritical
//   - This item macro code must be added to the DIME code of this item.
// Two effects must also be added:
//   - Guardian Emblem:
//      - Transfer Effect to Actor on item equip (checked)
//      - Effects:
//          - macro.itemMacro | Custom |
//   - Guardian Emblem - TPR:
//      - Effect Suspended (checked)
//      - Transfer Effect to Actor on item equip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isHit|canSee=true;pre=true;post=true
//
// Usage:
// When equipped and attuned, a feat is added that allows to attach/detach to/from a shield or armor.
// When this feat is used, it allows to attach the emblem, once attached, it activates a
// third party reaction effect. It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// In the "on" DAE macro call:
//   Creates and adds a feat to the owner of the emblem, using warpgate, to attach/detach it to/from
//   a shield or armor. The feat is added using a wargate mutation.
// In the "off" DAE macro call:
//   Reverts the warpgate mutation that created the attach/detach feat.
//   Reverts the warpgate mutation done by the attach/detach feat.
//   Disables the item's third party reaction effect.
// In the preTargeting (item OnUse) phase of the Guardian Emblem item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isHit target on use,
//   otherwise the item workflow execution is aborted.
// In the postActiveEffects (item OnUse) phase (of the attach/detach feat):
//   If the emblem is not attached:
//     Prompts a dialog to choose from a list of shield or armors and attach the emblem on the selected
///    item. This is done through a warpgate mutation. Then enables the item's third party reaction effect.
//   If the emblem is attached:
//     Reverts the "attach" warpgate mutation, then disables the item's third party reaction effect.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner's or other target):
//   If the reaction was used and completed successfully, the current workflow critical hit is converted to
//   a normal hit.
// ###################################################################################################

// Default name of the item

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
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.2'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol', 'warpgate'];
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
              [MODULE_ID]: {
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
    // Find third party reaction effect to disable it
    await activateThirdPartyReaction(item, false);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isHit.pre'
  ) {
    return handleTargetOnUseIsHitPre(scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isHit.post'
  ) {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    // Handle reaction
    await handleTargetOnUseIsHitPost(
      workflow,
      token,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    const origin = scope.rolledItem.getFlag(
      MODULE_ID,
      'guardian-emblem-origin'
    );
    if (origin !== scope.macroItem.uuid) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | Wrong sourceItemUuid is different from the origin of attach feat item.`,
        sourceItem.uuid,
        origin
      );
      return;
    }
    await handleAttachPostActiveEffects(token, scope.macroItem);
  }

  /**
   * Handles the preTargeting phase of the Guardian Emblem item.
   * Validates that the reaction was triggered by the tpr.isHit remove reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reaction
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isHit pre macro of the Guardian Emblem item in the triggering midi-qol workflow.
   * Validates that the emblem is attached to an item and that this item is equipped.
   *
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   * @returns {object} undefined when all conditions are met, an object with skip attribute to true if the reaction must be skipped.
   */
  function handleTargetOnUseIsHitPre(sourceItem) {
    const attachItemUuid = sourceItem.getFlag(
      MODULE_ID,
      'guardian-emblem-attach-uuid'
    );
    const attachItem = fromUuidSync(attachItemUuid);
    if (!attachItem) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Missing attach item: ${attachItemUuid}.`
        );
      }
      return { skip: true };
    }
    if (!attachItem?.system.equipped) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Attach item not equipped.`,
          attachItem
        );
      }
      return { skip: true };
    }
  }

  /**
   * Handles the tpr.isHit post macro of the Guardian Emblem item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, converts a critical hit on the target into a normal hit.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is hit.
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(
    currentWorkflow,
    targetToken,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', {
        thirdPartyReactionResult,
      });
    }
    if (thirdPartyReactionResult?.uuid === sourceItem.uuid) {
      // Convert critical hits into normal hit
      await elwinHelpers.convertCriticalToNormalHit(currentWorkflow);
    }
  }

  /**
   * Handles the postActiveEffects of the Guardian Emblem - Attach/Detach feat.
   * If the emblem is not attached:
   *   Prompts a dialog to choose from a list of shield or armors and attach the emblem
   *   on the selected item. This is done through a warpgate mutation, then enables the item's third party reaction effect.
   * If the emblem is attached:
   *   It reverts the "attach" warpgate mutation, then disables the item's third party reaction effect.
   *
   * @param {Token5e} sourceToken - The token owner of the Guardian Emblem item.
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   */
  async function handleAttachPostActiveEffects(sourceToken, sourceItem) {
    const attachedItemUuid = sourceItem.getFlag(
      MODULE_ID,
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
      // Find third party reaction effect to disable it
      await activateThirdPartyReaction(sourceItem, false);
    } else {
      const armorChoices = sourceToken.actor.itemTypes.equipment.filter(
        (i) => i.isArmor && !i.getFlag(MODULE_ID, 'guardian-emblem-uuid')
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
      foundry.utils.setProperty(
        updates.embedded.Item[sourceItem.id],
        `flags.${MODULE_ID}.guardian-emblem-attach-uuid`,
        selectedArmor.uuid
      );
      foundry.utils.setProperty(
        updates.embedded.Item[selectedArmor.id],
        `flags.${MODULE_ID}.guardian-emblem-uuid`,
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
      // Find third party reaction effect to enable it
      await activateThirdPartyReaction(sourceItem, true);
    }
  }

  /**
   * Enables or disables the third party reaction effect.
   *
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   * @param {boolean} activate - Flag to indicate if the third party reaction effect must be activate or deactivated.
   */
  async function activateThirdPartyReaction(sourceItem, activate) {
    // Find third party reaction effect to enable it
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
    let tprEffect = undefined;
    const aePredicate = (ae) =>
      ae.transfer &&
      ae.parent?.uuid === sourceItem.uuid &&
      ae.changes.some(
        (c) =>
          c.key === 'flags.midi-qol.onUseMacroName' &&
          c.value.includes('tpr.isHit')
      );

    if (activate) {
      tprEffect = [...sourceActor.allApplicableEffects()].find(aePredicate);
      if (!tprEffect) {
        console.error(
          `${DEFAULT_ITEM_NAME} | Third party reaction effect not found.`
        );
        return;
      }
    } else {
      tprEffect = sourceActor.appliedEffects?.find(aePredicate);
      if (!tprEffect) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Third party reaction effect not active.`
        );
        return;
      }
    }
    await tprEffect.update({ disabled: !activate });
  }
}
