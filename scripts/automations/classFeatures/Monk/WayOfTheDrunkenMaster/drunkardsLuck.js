// ##################################################################################################
// Monk - Way of the Drunken Master - Drunkard's Luck
// Adds an active effect to trigger on appropriate workflow phases to prompt a reaction allowing
// cancelling disadvantage on attack, save and check rolls.
// v1.2.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[preAttackRollConfig],[preActiveEffects],[preTargetSave]
//  - Elwin Helpers world script
//
// Usage:
// This feature has a passive effect to be called at appropriate phases. It is also a reaction activity that gets triggered when appropriate.
// When activated it adds an AE that cancels disadvantage on attack, save and check rolls.
//
// Description:
// In the preAttackRollConfig (item OnUse) phase of any item of the Drunkard's Luck's owner (in owner's workflow):
//   If the attack has disadvantage, prompts the player associated to the owner
//   to use the Drunkard's Luck Cancel Disadvantage reaction activity.
// In the preActiveEffects (item OnUse) phase of the Drunkard's Luck's owner (in owner's workflow):
//   If the activity is a reaction, do not apply AE, the disadvantage cancellation is handled by other phases.
// In the preTargetSave (TargetOnUse) phase (in attacker's workflow) (on owner):
//   If the save or check has disadvantage, prompts the player associated to the owner
//   to use the Drunkard's Luck Cancel Disadvantage reaction activity.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Drunkard's Luck";

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

export async function drunkardsLuck({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preAttackRollConfig") {
    await handleOnUsePreAttackRollConfig(actor, token, workflow, scope.macroItem, debug);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
    if (workflow.workflowOptions?.isReaction) {
      return { haltEffectsApplication: true };
    }
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "preTargetSave") {
    await handleTargetOnUsePreTargetSave(actor, token, workflow, scope.macroItem, debug);
  }
}

/**
 * Handles the on use preAttackRoll phase of any attack activity of the owner of Drunkard's Luck item.
 * If the attack has disadvantage, prompts the player associated to the item's owner to use the item's reaction.
 *
 * @param {Actor5e} actor - The owner of the Drunkard's Luck item.
 * @param {Token5e} token - The token of the owner of the Drunkard's Luck item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Drunkard's Luck item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePreAttackRollConfig(actor, token, workflow, sourceItem, debug) {
  if (workflow.attackRollModifierTracker.advantageMode !== CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE) {
    return;
  }

  const user = getPlayerForActor(actor, debug);
  if (!user) {
    return;
  }

  const reactionFlavor = game.i18n.format(
    "{actorName} is about to attack using {itemName} and they can use a reaction",
    {
      itemName: workflow.item?.name ?? "unknown",
      actorName: MidiQOL.getTokenPlayerNameForUser(user, token, user?.isGM),
    },
  );

  const result = await callReaction(token, workflow, sourceItem, user, reactionFlavor);

  if (!result) {
    // Canceled or not chosen
    return;
  }
  // Force noDisadvantage
  workflow.attackRollModifierTracker.disadvantage.suppress(sourceItem.identifier, sourceItem.name);
}

/**
 * Handles the target on use preTargetSave phase of any activities having a save used by an attacker.
 * If the save or check has disadvantage, prompts the player associated to the item's owner to use the item's reaction.
 *
 * @param {Actor5e} actor - The owner of the Drunkard's Luck item.
 * @param {Token5e} token - The token of the owner of the Drunkard's Luck item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Drunkard's Luck item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleTargetOnUsePreTargetSave(actor, token, workflow, sourceItem, debug) {
  if (workflow.saveDetails.modifierTracker.advantageMode !== CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE) {
    return;
  }
  const user = getPlayerForActor(actor, debug);
  if (!user) {
    return;
  }

  const reactionFlavor = elwinHelpers.getReactionFlavor({
    user,
    reactionTriggerName: "preTargetSave",
    triggerToken: token,
    triggerItem: workflow.item,
    reactionToken: token,
    roll: null,
  });

  const result = await callReaction(token, workflow, sourceItem, user, reactionFlavor);

  if (!result) {
    // Canceled or not chosen
    return;
  }
  workflow.saveDetails.modifierTracker.disadvantage.suppress(sourceItem.identifier, sourceItem.name);
  workflow.disadvantageSaves.delete(token);
}

/**
 * Returns the user associated to the specified actor or active GM is none found.
 * @param {Actor5e} actor - The actor for which to fetch the user.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {User} the user associated to the specified actor or active GM is none found.
 */
function getPlayerForActor(actor, debug) {
  let player = MidiQOL.playerForActor(actor);
  if (elwinHelpers.getReactionSetting(player) === "none") {
    if (debug) {
      console.warn(`${MACRO_NAME} | Reaction settings set to none for player.`, player);
    }
    return null;
  }

  if (!player?.active) {
    // Find first active GM player
    player = game.users?.activeGM;
  }
  if (!player?.active) {
    console.warn(`${MACRO_NAME} | No active player or GM for actor.`, reactionActor);
    return null;
  }
  return player;
}

/**
 * Promts the user in the appropriate client to use the Drunkard's Luck reaction and returns the result.
 *
 * @param {Token5e} token - The token of the owner of the Drunkard's Luck item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Drunkard's Luck item.
 * @param {User} user - The user associated to the token's actor.
 * @param {string} reactionFlavor - The reaction flavor to display in the reaction dialog.
 * @returns {object} The reaction execution result.
 */
async function callReaction(token, workflow, sourceItem, user, reactionFlavor) {
  const reactionActivity = sourceItem.system.activities.find((a) => a.identifier === "cancel-disadvantage");
  if (!reactionActivity) {
    console.warn(`${DEFAULT_ITEM_NAME} | Missing reaction activity.`, { sourceItem });
    return;
  }

  const reactionOptions = {
    itemUuid: workflow.itemUuid,
    workflowOptions: { targetConfirmation: "none" },
  };

  const data = {
    tokenUuid: token.document.uuid,
    reactionActivityList: [reactionActivity.uuid],
    reactionFlavor,
    triggerType: "reaction",
    options: reactionOptions,
  };

  const result = await MidiQOL.socket().executeAsUser("chooseReactions", user.id, data);
  return result?.uuid === reactionActivity.uuid;
}
