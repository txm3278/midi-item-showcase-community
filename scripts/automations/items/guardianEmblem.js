// ##################################################################################################
// Read First!!!!
// When equipped and attuned, adds an action that allows to attach the emblem to a shield or armor.
// Once the emblem is attached, it adds a third party reaction active effect, that effect will trigger a reaction
// on the owner when a creature within range is hit by a critical to allow him to convert it to a normal hit.
// v4.1.1
// Author: Elwin#1410
// Dependencies:
//  - DAE, item macro [off]
//  - MidiQOL "on use" item macro, [preTargeting],[postActiveEffects],[tpr.isHit]
//  - Elwin Helpers world script
//
// Usage:
// When equipped and attuned, the Attach/Detach activity can be used to attach/detach to/from a shield or armor.
// When this activity is used, it allows to attach the emblem, once attached, it activates a
// third party reaction effect. It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: RAW target should be Creature, but use Ally to trigger reaction on allies only.
//
// Description:
// In the "off" DAE macro call:
//   Deletes the enchantment from the armor or shield if any present.
//   Disables the item's third party reaction effect.
// In the preTargeting (OnUse) phase of the Guardian Emblem reation or attach/detach activity (in owner's workflow):
//   If the activity is reaction:
//     Validates that activity was triggered by the remote tpr.isHit target on use,
//     otherwise the activity workflow execution is aborted.
//   If the activity is attach/detach:
//     Validates that the item is equipped and attuned,
//     otherwise the activity workflow execution is aborted.
// In the postActiveEffects (OnUse) phase (of the attach/detach feat):
//   If the emblem is not attached:
//     Prompts a dialog to choose from a list of shield or armors and attach the emblem on the selected
///    item.
//     An enchantment is created and added to the selected armor or shield.
//     Then enables the item's third party reaction effect.
//   If the emblem is attached:
//     Deletes the enchantement from the armor or shield.
//     Then disables the item's third party reaction effect.
// In the tpr.isHit (TargetOnUse) pre macro (in attacker's workflow) (on owner's or other target):
//   Validates that the attached item, if any, is equipped, otherwise the reaction is skipped.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner's or other target):
//   If the reaction was used and completed successfully, the current workflow critical hit is converted to
//   a normal hit.
// ###################################################################################################

export async function guardianEmblem({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Guardian Emblem';
  const MODULE_ID = 'midi-item-showcase-community';
  const ATTACH_ACTION_ORIGIN_FLAG = 'guardian-emblem-action-origin';
  const ATTACHMENT_ORIGIN_FLAG = 'guardian-emblem-uuid';
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.3.0')) {
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

  if (args[0] === 'off') {
    // When not attuned nor equipped, remove enchantment
    await elwinHelpers.deleteAppliedEnchantments(
      item?.system.activities?.find((a) => a.identifier === 'attach-detach')?.uuid
    );
    // Find third party reaction effect to disable it
    await activateThirdPartyReaction(item, false);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isHit.pre') {
    return handleTargetOnUseIsHitPre(scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isHit.post') {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    // Handle reaction
    await handleTargetOnUseIsHitPost(workflow, token, scope.macroItem, options?.thirdPartyReactionResult);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (workflow.activity?.identifier === 'attach-detach') {
      await handleAttachPostActiveEffects(workflow, token, scope.macroItem);
    }
  }

  /**
   * Handles the preTargeting phase of the Guardian Emblem reaction activity.
   * Validates that the reaction was triggered by the tpr.isHit remove reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.activity?.identifier === 'reaction' &&
      (currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
        !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.some((u) =>
          sourceItem.system.activities?.some((a) => a.uuid === u)
        ))
    ) {
      // Reaction should only be triggered by third party reaction
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    } else if (
      currentWorkflow.activity?.identifier === 'attach-detach' &&
      !(sourceItem.system?.equipped && sourceItem.system?.attuned)
    ) {
      // Attach/Detach can only be used when item is equipped and attuned
      const msg = `${sourceItem.name} | This activity can only be used when the item is equipped and attuned.`;
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
    const attachedItem = sourceItem.actor?.items.find(
      (i) => i.getFlag(MODULE_ID, ATTACHMENT_ORIGIN_FLAG) === sourceItem.uuid
    );
    if (!attachedItem) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Could not find attached item for: ${sourceItem.uuid}.`);
      }
      return { skip: true };
    }
    if (!attachedItem?.system.equipped) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Attached item is not equipped.`, attachedItem);
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
  async function handleTargetOnUseIsHitPost(currentWorkflow, targetToken, sourceItem, thirdPartyReactionResult) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { thirdPartyReactionResult });
    }
    if (sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      // Convert critical hits into normal hit
      await elwinHelpers.convertCriticalToNormalHit(currentWorkflow);
    }
  }

  /**
   * Handles the postActiveEffects of the Guardian Emblem - Attach/Detach feat.
   * If the emblem is not attached:
   *   Prompts a dialog to choose from a list of shield or armors and attach the emblem
   *   on the selected item. This is done through an enchantment (dnd5e v3.2+) or using a mutation (dnd5e < v3.2),
   *   then enables the item's third party reaction effect.
   * If the emblem is attached:
   *   Delete the "attached" enchantment (dnd5e v3.2+) or revert the mutation (dnd5e < v3.2),
   *   then disables the item's third party reaction effect.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} sourceToken - The token owner of the Guardian Emblem item.
   * @param {Item5e} sourceItem - The Guardian Emblem item.
   */
  async function handleAttachPostActiveEffects(currentWorkflow, sourceToken, sourceItem) {
    let attachedItems;
    // Get applied enchantements for this item
    attachedItems = elwinHelpers.getAppliedEnchantments(currentWorkflow.activity.uuid);

    if (attachedItems?.length) {
      // Detach emblem
      // Remove enchantment
      await elwinHelpers.deleteAppliedEnchantments(currentWorkflow.activity.uuid);
      // Find third party reaction effect to disable it
      await activateThirdPartyReaction(sourceItem, false);

      // Add message about detachment
      const infoMsg = `<p>The emblem was detached from ${attachedItems[0]?.parent.name ?? 'unknown'}.</p>`;
      await elwinHelpers.insertTextIntoMidiItemCard('beforeButtons', currentWorkflow, infoMsg);
    } else {
      // Choose armor and attach emblem
      const armorChoices = sourceToken.actor.itemTypes.equipment.filter(
        (i) => i.isArmor && !i.getFlag(MODULE_ID, ATTACHMENT_ORIGIN_FLAG)
      );

      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | armorChoices`, armorChoices);
      }

      const selectedArmor = await elwinHelpers.ItemSelectionDialog.createDialog(
        `⚔️ ${sourceItem.name}: Choose an Armor or Shield`,
        armorChoices,
        null
      );
      if (!selectedArmor) {
        console.error(`${DEFAULT_ITEM_NAME} | Armor or shield selection was cancelled.`);
        return;
      }
      const originalName = selectedArmor.name;
      const enchantmentEffectData = elwinHelpers
        .getAutomatedEnchantmentSelectedProfile(currentWorkflow)
        ?.effect.toObject();
      if (!enchantmentEffectData) {
        console.error(`${sourceItem.name} | Missing enchantment effect`, { sourceItem, currentWorkflow });
        return;
      }
      enchantmentEffectData.changes.push({
        key: `flags.${MODULE_ID}.${ATTACHMENT_ORIGIN_FLAG}`,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: sourceItem.uuid,
        priority: 20,
      });

      // Add enchantment to armor or shield
      const enchantmentEffect = await elwinHelpers.applyEnchantmentToItem(
        currentWorkflow,
        enchantmentEffectData,
        selectedArmor
      );
      if (!enchantmentEffect) {
        console.error(`${DEFAULT_ITEM_NAME} | Enchantment effect could not be created.`, enchantmentEffectData);
        return;
      }
      // Find third party reaction effect to enable it
      await activateThirdPartyReaction(sourceItem, true);

      // Add message about attachment
      const infoMsg = `<p>The emblem was attached to ${originalName}.</p>`;
      await elwinHelpers.insertTextIntoMidiItemCard('beforeButtons', currentWorkflow, infoMsg);
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
        console.error(`${DEFAULT_ITEM_NAME} | Missing source item actor.`, sourceItem);
      }
      return;
    }
    let tprEffect = undefined;
    const aePredicate = (ae) =>
      ae.transfer &&
      ae.parent?.uuid === sourceItem.uuid &&
      ae.changes.some((c) => c.key === 'flags.midi-qol.onUseMacroName' && c.value.includes('tpr.isHit'));

    if (activate) {
      tprEffect = [...sourceActor.allApplicableEffects()].find(aePredicate);
      if (!tprEffect) {
        console.error(`${DEFAULT_ITEM_NAME} | Third party reaction effect not found.`);
        return;
      }
    } else {
      tprEffect = sourceActor.appliedEffects?.find(aePredicate);
      if (!tprEffect) {
        console.warn(`${DEFAULT_ITEM_NAME} | Third party reaction effect not active.`);
        return;
      }
    }
    await tprEffect.update({ disabled: !activate });
  }
}
