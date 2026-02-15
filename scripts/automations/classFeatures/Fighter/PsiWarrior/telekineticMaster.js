// ##################################################################################################
// Fighter - Psi Warrior - Telekinetic Master
// Adds Telekinesis spell as a free use or one that consumes a Psionic Energy die,
// it also handles special Bonus Weapon Attack.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [on],[off],[each]
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[preItemRoll][postActiveEffects],[postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This item allows to cast Telekinesis as a free use or by spending a Psionic Energy die, it also allows
// to make a special Bonus Weapon Attack when Telekinesis is cast or when the actor concentrate on it
// at the start of its turn.
// Note: The Telekinesis spell is not automated.
//
// Description:
// In the preItemRoll phase of the Telekinetic Master - Bonus Weapon Attack (in owner's workflow):
//   Validates that the user has at least one equipped weapon with which to make the Bonus Weapon Attack
//   otherwise the activity use is aborted..
// In the postActiveEffects phase of the Telekinetic Master - Bonus Weapon Attack (in owner's workflow):
//   Prompts the user to select an equipped weapon with which to make the Bonus Weapon Attack.
//   Enchants the selected weapon to convert its activation type to special then calls MidiQOL.completeItemUse
//   with the selected weapon to make the bonus attack.
// In the postRollFinished phase of the Telekinesis spell item (in owner's workflow):
//   If the workflow is not aborted and the actor is concentrating on Telekinesis,
//   changes the Bonus Weapon Attack state to available and adds a card with info
//   about the availability of the Bonus Weapon Attack.
// When the Guarded Mind transfer effect is applied ["on"]:
//   Resets the Bonus Weapon Attack state to not available.
// When the Guarded Mind transfer effect is removed ["off"]:
//   Removes the flags added to handle the Bonus Weapon Attack state.
// When the owner of the Guarded Mind turn starts ["each"]:
//   Resets the Bonus Weapon Attack state to not available. If the actor is concentrating on the Telekinesis spell,
//   changes the Bonus Weapon Attack to state to available and adds a card with info
//   about the availability of the Bonus Weapon Attack.
// When the owner of the Guarded Mind turn ends ["each"]:
//   Resets the Bonus Weapon Attack state to not available.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Telekinetic Master";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.10")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function telekineticMaster({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "preItemRoll") {
    if (scope.rolledActivity.identifier === "bonus-weapon-attack") {
      await handleOnUsePreItemRoll(actor, scope.macroItem);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (scope.rolledActivity.identifier === "bonus-weapon-attack") {
      await handleOnUsePostActiveEffects(workflow, actor, scope.macroItem);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postRollFinished") {
    if (scope.rolledItem.type === "spell" && scope.rolledItem.identifier === "telekinesis") {
      await handleOnUsePostRollFinished(workflow, actor, token, scope.macroItem, debug);
    }
  } else if (args[0] === "on") {
    // Clear item state when first applied
    await getBonusAttackActivity(scope.macroItem)?.update({ "uses.spent": 1 });
    await actor.setFlag(MODULE_ID, "telekineticMaster.bonus", false);
  } else if (args[0] === "off") {
    // Remove flags when deleted
    await actor.unsetFlag(MODULE_ID, "telekineticMaster");
    await DAE.unsetFlag("telekineticMasterBonusInProgress");
  } else if (args[0] === "each") {
    if (scope.lastArgValue?.turn === "startTurn") {
      await handleEachStartOfTurn(actor, token, scope.macroItem, debug);
    } else if (scope.lastArgValue?.turn === "endTurn") {
      // Clear item state on end of turn
      await getBonusAttackActivity(scope.macroItem)?.update({ "uses.spent": 1 });
      await actor.setFlag(MODULE_ID, "telekineticMaster.bonus", false);
    }
  }
}

/**
 * Prompts the user to select an equipped weapon with which to make the Bonus Weapon Attack.
 *
 * @param {Item} sourceItem - The Telekinetic Master item.
 * @param {Actor} actor - The owner of the Telekinetic Master item.
 *
 * @returns {Promise<boolean>} true if the activity workflow can continue, false otherwise.
 */
async function handleOnUsePreItemRoll(actor, sourceItem) {
  const filteredWeapons = elwinHelpers.getEquippedWeapons(actor);
  if (filteredWeapons.length === 0) {
    ui.notifications.warn(`${sourceItem.name} | No weapon equipped.`);
    return false;
  }
  return true;
}

/**
 * Handles the on use post active effects phase of the Telekinetic Master - Bonus Weapon Attack activity.
 * Enchants the selected weapon to convert its activation type to special then calls MidiQOL.completeItemUse
 * with the selected weapon to make the bonus attack.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor} actor - The owner of the Telekinetic Master item.
 * @param {Item5e} sourceItem - The Telekinetic Master item.
 */
async function handleOnUsePostActiveEffects(workflow, actor, sourceItem) {
  const refundResource = async function () {
    const consumed = MidiQOL.getCachedChatMessage(workflow.itemCardUuid)?.getFlag("dnd5e", "use.consumed");
    if (consumed) {
      await workflow.activity?.refund(consumed);
    }
  };

  const filteredWeapons = elwinHelpers.getEquippedWeapons(actor);
  if (filteredWeapons.length === 0) {
    ui.notifications.warn(`${sourceItem.name} | No weapon equipped, reallocate spent resource if needed.`);
    await refundResource();
    return;
  }
  const chosenWeaponId = actor.getFlag(MODULE_ID, "telekineticMaster.weaponChoiceId");
  let weaponItem = filteredWeapons[0];
  if (filteredWeapons.length > 1) {
    weaponItem = await getSelectedWeapon(sourceItem, filteredWeapons, chosenWeaponId);
  }

  if (!weaponItem) {
    // Bonus attack was cancelled
    ui.notifications.warn(
      `${sourceItem.name} | No selected weapon for bonus attack, reallocate spent resource if needed.`,
    );
    await refundResource();
    return;
  }

  // Keep weapon choice for next time (used as pre-selected choice) and for postActiveEffects
  await actor.setFlag(MODULE_ID, "telekineticMaster.weaponChoiceId", weaponItem.id);

  const bonusAttackWorkflow = await doBonusAttack(workflow, sourceItem, weaponItem);
  if (!bonusAttackWorkflow || bonusAttackWorkflow?.aborted) {
    ui.notifications.warn(`${sourceItem.name} | The bonus attack was aborted, reallocate spent resource if needed.`);
    await refundResource();
  }
}

/**
 * Handles the on use post roll finished phase of the Telekinesis spell.
 * If the workflow is not aborted and the actor is concentrating on Telekinesis,
 * changes the Bonus Weapon Attack to state to available and adds a card with info
 * about the availability of the Bonus Weapon Attack.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor} actor - The owner of the Telekinetic Master item.
 * @param {Token} token - Token associated to the owner of the Telekinetic Master item.
 * @param {Item} sourceItem - The Telekinetic Master item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostRollFinished(workflow, actor, token, sourceItem, debug) {
  if (workflow.aborted) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Telekinesis workflow was aborted.`, {
        workflow,
      });
    }
    return;
  }
  if (!isActorConcentratingOnTelekinesis(actor)) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Actor is not concentrating on Telekinesis.`, {
        workflow,
      });
    }
    return;
  }
  await displayBonusActionInfo(actor, token, sourceItem, debug);
}

/**
 * Handles the start of turn of the owner of the Telekinesis Master.
 * Resets the Bonus Weapon Attack state to not available.
 * If the actor is concentrating on the Telekinesis spell, changes the Bonus Weapon Attack to state to available and
 * adds a card with info about the availability of the Bonus Weapon Attack.
 *
 * @param {Actor} actor - The owner of the Telekinetic Master item.
 * @param {Token} token - Token associated to the owner of the Telekinetic Master item.
 * @param {Item} sourceItem - The Telekinetic Master item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleEachStartOfTurn(actor, token, sourceItem, debug) {
  // Reset flags and uses
  await getBonusAttackActivity(sourceItem)?.update({ "uses.spent": 1 });
  await actor.setFlag(MODULE_ID, "telekineticMaster.bonus", false);

  if (!isActorConcentratingOnTelekinesis(actor)) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Actor is not concentrating on Telekinesis.`, {
        actor,
      });
    }
    return;
  }
  await displayBonusActionInfo(actor, token, sourceItem, debug);
}

/**
 * Returns tru if the actor is concentrating on the Telekinesis spell.
 *
 * @param {Actor} actor - The owner of the Telekinetic Master item.
 * @returns {boolean} true if the actor is concentrating on the Telekinesis spell, false otherwise.
 */
function isActorConcentratingOnTelekinesis(actor) {
  if (!actor.statuses.has("concentrating")) {
    return false;
  }
  return actor.effects.some(
    (ae) =>
      ae.statuses.has("concentrating") &&
      ae.flags?.dnd5e?.item?.type === "spell" &&
      ae.flags?.dnd5e?.item?.id &&
      actor.items.get(ae.flags.dnd5e.item.id)?.identifier === "telekinesis",
  );
}

/**
 * If the Bonus Weapon Attack is not already enabled, changes its state to available and
 * adds a card with info about the availability of the Bonus Weapon Attack.
 *
 * @param {Actor} actor - The owner of the Telekinetic Master item.
 * @param {Token} token - Token associated to the owner of the Telekinetic Master item.
 * @param {Item} sourceItem - The Telekinetic Master item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function displayBonusActionInfo(actor, token, sourceItem, debug) {
  if (actor.getFlag(MODULE_ID, "telekineticMaster.bonus")) {
    // A bonus action was already granted
    return;
  }

  // Set one charge to the Telekinetic Master Weapon Attack Bonus action for this turn
  const bonusWeaponAttackActivity = getBonusAttackActivity(sourceItem);
  if (!bonusWeaponAttackActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Missing Bonus Weapon Attack`, { sourceItem });
    }
    return;
  }

  await bonusWeaponAttackActivity.update({ "uses.spent": 0 });
  await actor.setFlag(MODULE_ID, "telekineticMaster.bonus", true);

  // Add chat message saying a bonus attack can be made
  const message = await TextEditor.enrichHTML(
    `<p><strong>${sourceItem.name}</strong> - You can make a special bonus weapon attack [[/item ${sourceItem.id} activity=${
      bonusWeaponAttackActivity.id
    }]].</p>`,
    {
      relativeTo: actor,
      rollData: sourceItem.getRollData(),
    },
  );
  MidiQOL.addUndoChatMessage(
    await ChatMessage.create({
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: message,
      speaker: ChatMessage.getSpeaker({ actor, token }),
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    }),
  );
}

/**
 * Returns the Bonus Weapon Attack activity of the Telekinetic Master item.
 *
 * @param {Item5e} sourceItem - The Telekinetic Master item.
 *
 * @returns {Activity} The Bonus Weapon Attack activity, undefined if not found.
 */
function getBonusAttackActivity(sourceItem) {
  return sourceItem.system.activities?.find((a) => a.identifier === "bonus-weapon-attack");
}

/**
 * Prompts a dialog to select a weapon and returns the id of the selected weapon.
 *
 * @param {Item} sourceItem - The Telekinetic Master item.
 * @param {Item[]} weaponChoices - Array of weapon items from which to choose.
 * @param {string} defaultChosenWeaponId - Id of weapon to be selected by default.
 *
 * @returns {Promise<Item|null>} the selected weapon.
 */
async function getSelectedWeapon(sourceItem, weaponChoices, defaultChosenWeaponId) {
  const defaultWeapon = weaponChoices.find((i) => i.id === defaultChosenWeaponId);
  return elwinHelpers.ItemSelectionDialog.createDialog(
    `⚔️ ${sourceItem.name}: Choose a Weapon`,
    weaponChoices,
    defaultWeapon,
  );
}

/**
 * Do a complete item use with the specified weapon but changing its attack activities activation
 * to special or bonus depending on the rules version.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item} sourceItem - The Telekinetic Master item.
 * @param {Item} weaponItem - The weapon with which to attack.
 * @returns {Promise<MidiQOL.Workflow>} the resulting Bonus Weapon Attack workflow execution.
 */
async function doBonusAttack(workflow, sourceItem, weaponItem) {
  // Change activation type to special so it is not considered as Action
  const changes = [
    { key: "name", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: `{} (${getBonusAttackActivity(sourceItem).name})` },
  ];
  const enchantmentEffect = await elwinHelpers.enchantItemTemporarily(weaponItem, sourceItem, {
    changes,
    activityRequirements: [{ type: "attack", conditions: [{ key: "attack.type.classification", value: "weapon" }] }],
  });
  if (!enchantmentEffect) {
    console.warn(`${DEFAULT_ITEM_NAME} | Could not enchant item ${weaponItem.name}.`);
    return;
  }
  try {
    const config = {
      midiOptions: {
        targetUuids: workflow.targets.size ? [workflow.targets.first().document.uuid] : undefined,
        workflowOptions: { autoRollAttack: true, targetConfirmation: !workflow.targets.size ? "always" : undefined },
      },
    };

    return await MidiQOL.completeItemUse(weaponItem, config, {});
  } finally {
    await enchantmentEffect.delete();
  }
}
