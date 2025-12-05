// ##################################################################################################
// Monk - Way of the Drunken Master - Tipsy Sway
// Adds an active effect with third party reaction, that effect will trigger a reaction
// on the monk when a melee attack misses him to allow him to redirect the attack on another target.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[preTargeting],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This feature has a passive effect that adds a third party reaction effect. It is also a reaction item that gets triggered
// by the third party reaction effect when appropriate. When activated, it prompts a dialog to choose a new target on which the attack
// will be redirected.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting (item OnUse) phase of the Tipsy Sway Redirect Attack activity (in owner's workflow):
//   Clears an existing saved target UUID flag from the item's owner.
// In the postActiveEffects phase of the Tipsy Sway Redirect Attack activity (in owner's workflow):
//   It prompts a dialog to select the creature on which the attack will be redirected.
//   The new target UUID is saved in a flag on the item's owner.
// In the tpr.isMissed (TargetOnUse) post macro (in attacker's workflow) (on owner):
//   If the reaction was used and completed successfully and the redirect target from the saved target UUID exist,
//   removes the owner from the workflow's targets and adds the redirect target.
//   Adjusts the workflow data and chat message to reflect that the attack is a hit on the new target.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Tipsy Sway";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.8")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize(
      "midi-item-showcase-community.ElwinHelpersRequired"
    )}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function tipsySway({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
    // Clear pevious target flag
    await DAE.unsetFlag(sourceItem.actor, "tipsySwayRedirectTarget");
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(actor, token, workflow, scope.macroItem);
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isMissed.post") {
    await handleTargetOnUseIsMissedPost(token, workflow, scope.macroItem, scope.options?.thirdPartyReactionResult);
  }
}

/**
 * Handles the postActiveEffects of the reaction activity.
 * Prompts a dialog to select a new target on which the attack will be redirected and saves the target UUID in a flag on the item's owner.
 *
 * @param {Actor5e} actor - The owner of the Tipsy Sway item.
 * @param {Token5e} token - The token of the owner of the Tipsy Sway item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Tipsy Sway item.
 */
async function handleOnUsePostActiveEffects(actor, token, workflow, sourceItem) {
  let targetTokens = MidiQOL.findNearby(-1, token, 5, { isSeen: true, includeIncapacitated: true }).filter(
    (t) => t.document?.uuid !== workflow.workflowOptions?.thirdPartyReaction?.attackerUuid
  );
  const targetToken = await getSelectedTarget(sourceItem, targetTokens);
  if (!targetToken) {
    console.warn(`${DEFAULT_ITEM_NAME} | Redirect target selection cancelled.`);
    return;
  }
  await DAE.setFlag(actor, "tipsySwayRedirectTarget", targetToken.document.uuid);
}

/**
 * Handles the tpr.isMissed post reaction execution of the activity in the triggering midi-qol workflow.
 * If the reaction was used and completed successfully and the redirect target from the saved target UUID exist,
 * removes the owner from the workflow's targets and adds the redirect target.
 * Also adjusts the workflow data and chat message to reflect that the attack is a hit on the new target.
 *
 * @param {Token5e} token - The token of the owner of the Tipsy Sway item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Tipsy Sway item.
 * @param {object} thirdPartyReactionResult - The third party reaction result.
 */
async function handleTargetOnUseIsMissedPost(token, workflow, sourceItem, thirdPartyReactionResult) {
  const redirectTargetUuid = DAE.getFlag(sourceItem.actor, "tipsySwayRedirectTarget");
  if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid) || !redirectTargetUuid) {
    return;
  }
  await DAE.unsetFlag(sourceItem.actor, "tipsySwayRedirectTarget");
  const targetToken = fromUuidSync(redirectTargetUuid)?.object;
  if (!targetToken) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing redirect target token.`, { redirectTargetUuid });
    return;
  }

  // Set new target
  canvas.tokens?.setTargets([targetToken.id]);
  workflow.targets.delete(token);
  workflow.targets.add(targetToken);
  workflow.hitTargets.add(targetToken);
  workflow.hitTargetsEC.add(targetToken);

  const targetTokenImg = elwinHelpers.getTokenImage(targetToken);
  // Update target descriptors
  workflow.targetDescriptors = [
    {
      name: targetToken.name,
      img: targetTokenImg,
      uuid: targetToken.actor?.uuid,
      ac: Number.parseInt(targetToken.actor?.system.attributes?.ac?.value ?? 10),
    },
  ];

  // Keep previous data because displayTargets clear the current data
  const previousHitData = workflow.hitDisplayData[token.document.uuid] ?? {};

  // Display new target
  await workflow.displayHitTargets(workflow.whisperAttackCard);

  const configSettings = MidiQOL.configSettings();

  // Set hitDisplay that was cleared by displayTargets
  if (workflow.hitDisplayData[targetToken.document.uuid]) {
    const hitDisplay = workflow.hitDisplayData[targetToken.document.uuid];
    hitDisplay.targetClass = !!targetToken.actor?.hasPlayerOwner ? "midi-qol-player-target" : "midi-qol-npc-target";
    hitDisplay.target = targetToken;
    hitDisplay.actorUuid = targetToken.actor?.uuid;
    hitDisplay.uuid = targetToken.document.uuid;
    hitDisplay.hitStyle = "";
    hitDisplay.attackBonus = 0;
    hitDisplay.ac = Number.parseInt(targetToken.actor?.system.attributes?.ac?.value ?? 10);
    hitDisplay.acDisplay = `${hitDisplay.ac}`;
    hitDisplay.baseAc = hitDisplay.ac;
    hitDisplay.hitClass = "success";
    hitDisplay.acClass = targetToken.actor?.hasPlayerOwner ? "" : "midi-qol-npc-ac";
    hitDisplay.hitSymbol =
      game.user?.isGM && ["hitDamage", "all"].includes(configSettings.hideRollDetails) ? "fa-tick" : "fa-check";
    hitDisplay.attackType = previousHitData.attackType;
    hitDisplay.showAC = true;
    hitDisplay.img = targetTokenImg;
    hitDisplay.gmName = elwinHelpers.getTokenName(targetToken);
    (hitDisplay.playerName = MidiQOL.getTokenPlayerName(targetToken.document) ?? ""), (hitDisplay.bonusAC = 0);
    hitDisplay.hitResultNumeric = `${workflow.attackTotal}/${Math.abs(workflow.attackTotal - hitDisplay.ac)}`;
    hitDisplay.attackTotal = workflow.attackTotal;
    hitDisplay.isHit = true;
  }

  // Redisplay attack roll with the new data
  workflow.isFumble = false;
  if (workflow.attackRoll.options) {
    workflow.attackRoll.options.criticalFailure = -999;
    workflow.attackRoll.options.target = -999;
  }
  if (workflow.attackRoll.dice[0]?.options) {
    workflow.attackRoll.dice[0].options.criticalFailure = -999;
    workflow.attackRoll.dice[0].options.target = -999;
  }
  await workflow.displayAttackRoll();

  // Redisplay hits with the new data
  await workflow.displayHits(workflow.whisperAttackCard, configSettings.mergeCard);

  // Add info about attack redirection
  const targetDivs = elwinHelpers.getTargetDivs(token, "Missed attack on target <strong>${tokenName}</strong>");
  const newTargetDivs = elwinHelpers.getTargetDivs(
    targetToken,
    `was redirected to <strong>\${tokenName}</strong> by <strong>${sourceItem.name}</strong>.`
  );
  const infoMsg = `${targetDivs}${newTargetDivs}`;
  await elwinHelpers.insertTextIntoMidiItemCard("beforeHitsDisplay", workflow, infoMsg);
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
