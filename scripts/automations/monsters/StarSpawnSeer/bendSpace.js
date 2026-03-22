// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a reaction active effect, that effect will trigger a reaction when owner is hit to allow him
// to switch places with a selected Star Spawn target.
// v1.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting],[tpr.isHit]
//  - Helwin Helpers world script
//  - Sequencer (optional, for teleportation effect)
//
// Usage:
// This feature has a passive effect that adds a reaction active effect.
// It is also a reaction item that gets triggered by the reaction effect when appropriate.
//
// Description:
// In the preTargeting phase of the Bend Space reaction activity (in owner's workflow):
//   The user is prompted to select an eligible Star Spawn target within 60 feet to switch places with.
//   The selected Star Spawn target's uuid is stored in a flag on the owner actor to be used later.
// In the tpr.isHit (TargetOnUse) pre macro (in attacker's workflow) (on owner):
//   The selected Star Spawn uuid is unset to ensure that a new selection is made for each reaction use.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on owner):
//   If the reaction was used and completed successfully, the current workflow hit target switches
//   position with the token specified by the flag "starSpawnSeerBendSpaceSelectedStarSpawn", which is hit instead.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Bend Space";

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
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function bendSpace({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
    return await handleOnUsePreTargeting(workflow, token, scope.macroItem);
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isHit.pre") {
    DAE.unsetFlag(scope.macroItem.actor, "starSpawnSeerBendSpaceSelectedStarSpawn");
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isHit.post") {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    await handleTargetOnUseIsHitPost(workflow, scope.macroItem, scope.options?.thirdPartyReactionResult, debug);
  }
}

/**
 * Handles the preTargeting phase of the Bend Space reaction activity.
 * The user is prompted to select an eligible Star Spawn target within 60 feet to switch places with.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Token5e} token - The token associated with the actor owner of the Bend Space item.
 * @param {Item5e} sourceItem The Bend Space item.
 *
 * @returns {Promise<boolean>} true if all requirements are fulfilled, false otherwise.
 */
async function handleOnUsePreTargeting(workflow, token, sourceItem) {
  const range = workflow.activity.range;
  const target = workflow.activity.target;

  // Filter for other Star Spawn creatures within 60 feet
  const distance = dnd5e.utils.convertLength(range.value, range.units, dnd5e.utils.defaultUnits("length"));
  let disposition = null;
  switch (target.affects?.type) {
    case "ally":
      disposition = 1;
      break;
    case "enemy":
      disposition = -1;
      break;
  }
  let eligibleTargets = MidiQOL.findNearby(disposition, token, distance, {
    includeIncapacitated: false,
    includeToken: false,
    isSeen: true,
  }).filter((i) => !i.document.hidden);
  if (target.affects?.special) {
    eligibleTargets = eligibleTargets.filter((t) =>
      t.actor.name.toLowerCase().includes(target.affects.special.toLowerCase()),
    );
  }
  if (eligibleTargets.length === 0) {
    ui.notifications.warn(`${sourceItem.name} | No eligible Star Spawn within ${range.value} ${range.units}.`);
    return false;
  }

  // Prompt user to select an Star Spawn to swap with
  const selectedTarget = await elwinHelpers.TokenSelectionDialog.createDialog(
    `${sourceItem.name}: Choose a Target to Swap Places With`,
    eligibleTargets,
  );
  if (!selectedTarget) {
    ui.notifications.warn(`${sourceItem.name} | Target selection cancelled.`);
    return false;
  }

  await DAE.setFlag(sourceItem.actor, "starSpawnSeerBendSpaceSelectedStarSpawn", selectedTarget.document.uuid);

  return true;
}

/**
 * Handles the tpr.isHit post macro of the Bend Space item in the triggering midi-qol workflow.
 * If the reaction was used and completed successfully, the owner switches position with the selected Star Spawn creature,
 * which is hit instead.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Bend Space item.
 * @param {Promise<object>} thirdPartyReactionResult - The third party reaction result.
 * @param {boolean} debug - Flag to indicate if debug mode is active.
 */
async function handleTargetOnUseIsHitPost(workflow, sourceItem, thirdPartyReactionResult, debug) {
  if (debug) {
    console.warn(DEFAULT_ITEM_NAME + " | reaction result", { thirdPartyReactionResult });
  }
  if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
    return;
  }

  const sourceActor = sourceItem.actor;
  const targetToken = workflow.hitTargets.first();

  if (!sourceActor || !targetToken) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`, { sourceActor, targetToken });
    return;
  }

  const selectedStarSpawnUuid = DAE.getFlag(sourceActor, "starSpawnSeerBendSpaceSelectedStarSpawn");
  if (!selectedStarSpawnUuid) {
    console.error(`${DEFAULT_ITEM_NAME} | No selected Star Spawn UUID to switch with.`);
    return;
  }

  const selectedStarSpawnToken = fromUuidSync(selectedStarSpawnUuid)?.object;
  if (!selectedStarSpawnToken) {
    console.error(`${DEFAULT_ITEM_NAME} | No selected Star Spawn token could be found.`, { selectedStarSpawnUuid });
    return;
  }

  // Change target
  workflow.targets.delete(targetToken);
  workflow.targets.add(selectedStarSpawnToken);
  if (workflow.hitTargets.delete(targetToken)) {
    workflow.hitTargets.add(selectedStarSpawnToken);
  }
  if (workflow.hitTargetsEC.delete(targetToken)) {
    workflow.hitTargetsEC.add(selectedStarSpawnToken);
  }

  const previousIsCritical = workflow.isCritical;

  const configSettings = MidiQOL.configSettings();
  const rollMode = game.settings.get("core", "rollMode");
  const whisperAttackCard =
    configSettings.autoCheckHit === "whisper" ||
    rollMode === CONST.DICE_ROLL_MODES.BLIND ||
    rollMode === CONST.DICE_ROLL_MODES.PRIVATE;
  // Reprocess critical flags for new target
  workflow.processCriticalFlags();

  // Keep previous data because displayTargets clear the current data
  const previousHitData = workflow.hitDisplayData[targetToken.document.uuid] ?? {};

  // Display new target
  await workflow.displayHitTargets(whisperAttackCard);

  // Set hitDisplay that was cleared by displayTargets
  if (workflow.hitDisplayData[selectedStarSpawnToken.document.uuid]) {
    const hitDisplay = workflow.hitDisplayData[selectedStarSpawnToken.document.uuid];
    // Keep hit display info that is not related to the new target except its AC.
    hitDisplay.hitStyle = previousHitData.hitStyle;
    hitDisplay.hitSymbol = previousHitData.hitSymbol;
    hitDisplay.hitClass = previousHitData.hitClass;
    hitDisplay.attackType = previousHitData.attackType;
    hitDisplay.isHit = previousHitData.isHit;
    hitDisplay.attackType = previousHitData.attackType;

    hitDisplay.actorUuid = selectedStarSpawnToken.actor?.uuid;
    hitDisplay.attackBonus = 0;
    hitDisplay.baseAc = Number.parseInt(selectedStarSpawnToken.actor?.system.attributes?.ac?.value) ?? 10;
    hitDisplay.ac = hitDisplay.baseAc;
    hitDisplay.bonusAC = 0;
    hitDisplay.acDisplay = !isFinite(hitDisplay.ac) ? "∞" : `${hitDisplay.ac}`;
    hitDisplay.acTooltip = undefined;
    hitDisplay.acIcons = [];
    hitDisplay.attackTotal = workflow.attackTotal;

    // Only update attributes affected by critical flag of the new target.
    if (game.user?.isGM && ["hitDamage", "all"].includes(configSettings.hideRollDetails)) {
      hitDisplay.hitSymbol = "fa-tick";
    } else if (workflow.isCritical) {
      hitDisplay.hitSymbol = "fa-check-double";
    } else {
      hitDisplay.hitSymbol = "fa-check";
    }
    if (workflow.isCritical) {
      hitDisplay.hitString = game.i18n.localize("midi-qol.criticals");
      hitDisplay.hitResultNumeric = "++";
    } else {
      hitDisplay.hitString = game.i18n.localize("midi-qol.hits");
      const targetAC = hitDisplay.baseAc + hitDisplay.bonusAC;
      hitDisplay.hitResultNumeric = !Number.isFinite(targetAC)
        ? `${hitDisplay.attackTotal}/∞`
        : `${hitDisplay.attackTotal}/${Math.abs(hitDisplay.attackTotal - targetAC)}`;
    }
  }
  // If the critical flag changed, redisplay attack roll
  if (previousIsCritical !== workflow.isCritical) {
    await workflow.displayAttackRoll();
  }
  // Redisplay hits with the new data
  await workflow.displayHits(whisperAttackCard);

  // Swap places
  await swapPlaces(targetToken, selectedStarSpawnToken);

  // Update current target selection
  const targetIds = workflow.targets.map((t) => t.id);
  canvas.tokens?.setTargets(targetIds);

  // Add info about target switch
  const targetDivs = elwinHelpers.getTargetDivs(targetToken, "The hit target <strong>${tokenName}</strong>");
  const newTargetDivs = elwinHelpers.getTargetDivs(
    selectedStarSpawnToken,
    `was switched to <strong>\${tokenName}</strong> by <strong>${sourceItem.name}</strong>.`,
  );
  const infoMsg = `${targetDivs}${newTargetDivs}`;
  await elwinHelpers.insertTextIntoMidiItemCard("beforeHitsDisplay", workflow, infoMsg);
}

/**
 * Swaps the position of two tokens by teleportation and uses Sequencer for effects if it is available.
 * @param {Token5e} sourceToken - Source token to swap.
 * @param {Token5e} destinationToken - Destination token to swap.
 */
async function swapPlaces(sourceToken, destinationToken) {
  const sourcePos = { x: sourceToken.x, y: sourceToken.y, elevation: sourceToken.elevation };
  const destinationPos = { x: destinationToken.x, y: destinationToken.y, elevation: destinationToken.elevation };

  if (game.modules.get("sequencer")?.active && foundry.utils.hasProperty(Sequencer.Database.entries, "jb2a")) {
    // prettier-ignore
    await new Sequence()
      .effect()
        .copySprite(sourceToken)
        .fadeIn(50)
        .duration(550)
        .fadeOut(250)
        .filter("Blur")
        .elevation(0)
      .effect()
        .copySprite(destinationToken)
        .fadeIn(50)
        .duration(550)
        .fadeOut(250)
        .filter("Blur")
        .elevation(0)
      .effect()
        .file("jb2a.teleport.01.blue")
        .atLocation(sourceToken)
        .elevation(0)
      .effect()
        .file("jb2a.teleport.01.blue")
        .atLocation(destinationToken)
        .elevation(0)
        .wait(100)
        .play();

    await MidiQOL.moveToken(sourceToken, destinationPos, { teleport: true, ignoreTokens: true });
    await MidiQOL.moveToken(destinationToken, sourcePos, { teleport: true, ignoreTokens: true });

    // prettier-ignore
    await new Sequence()
      .effect()
        .file("jb2a.teleport.01.blue")
        .atLocation(sourceToken)
        .scaleToObject()
      .effect()
        .file("jb2a.teleport.01.blue")
        .atLocation(destinationToken)
        .scaleToObject()
      .play();
  } else {
    await MidiQOL.moveToken(sourceToken, destinationPos, { teleport: true, ignoreTokens: true });
    await MidiQOL.moveToken(destinationToken, sourcePos, { teleport: true, ignoreTokens: true });
  }
}
