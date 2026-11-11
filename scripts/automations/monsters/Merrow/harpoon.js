// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Pulls the target towards the owner if the target is of the appropriate size and the attack hits.
// v1.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [postActiveEffects]
//  - Helwin Helpers world script
//
// Usage:
// This item needs to be used to activate. If hit and of the appropriate size,
// it will pull the target to the owner.
//
// Description:
// In the postActiveEffects phase of the Harpoon Attack activity (in owner's workflow):
//   If the target was hit and of the appropriate size:
//     - legacy: ask for a contested roll and if the owner wins, pulls the target..
//     - modern: pulls the target.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Harpoon";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (foundry.utils.isNewerVersion("3.6.0", globalThis?.elwinHelpers?.version ?? "1.1")) {
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

export async function harpoon({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
  if (!(args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects")) {
    // Macro pass not supported
    return;
  }

  let target = workflow.hitTargets?.first();
  if (!target) {
    // No target hit, do nothing
    return;
  }
  const rules = elwinHelpers.getRules(scope.rolledItem);
  const targetSizeNum = CONFIG.DND5E.actorSizes[target.actor.system.traits?.size]?.numerical ?? 2;
  const maxSize = rules === "legacy" ? "huge" : "lg";
  if (targetSizeNum > CONFIG.DND5E.actorSizes[maxSize].numerical) {
    // Target size greater than allowed to pull
    if (debug) {
      console.warn(`${scope.rolledItem.name} | Target size greater than allowed to pull`, { target, targetSizeNum });
    }
    return;
  }
  const distAdj = dnd5e.utils.convertLength(5, "ft", canvas.grid.units, { strict: false });
  const maxDist = MidiQOL.computeDistance(token, target, { includeCover: false }) - distAdj;
  if (maxDist <= 0) {
    // No distance to pull
    if (debug) {
      console.warn(`${scope.rolledItem.name} | Target blocked by wall or already adjacent`, { target, maxDist });
    }
    return;
  }

  const flavor = `${item.name}: Pull Target`;
  const maxPulledDist = rules === "legacy" ? 20 : 15;
  if (rules === "legacy") {
    await MidiQOL.contestedRoll({
      source: { token, rollType: "abil", ability: "str" },
      target: { token: target, rollType: "abil", ability: "str" },
      flavor,
      success: pullSuccessful.bind(this, token, target, maxDist, maxPulledDist),
      displayResults: true,
      //TODO dndv6 remove null when utils.displayContestedResults fixed in midi
      itemCardUuid: foundry.utils.isNewerVersion(game.system.version, "6.0") ? null : workflow.itemCardUuid,
    });
  } else {
    await pullSuccessful(token, target, maxDist, maxPulledDist);
    const itemCard = MidiQOL.getCachedChatMessage(workflow.itemCardUuid);
    await elwinHelpers.insertTextIntoMidiItemCard("afterSavesDisplay", workflow, flavor);
  }
}

async function pullSuccessful(sourceToken, targetToken, maxDist, maxPulledDist, _) {
  const pulledDist = dnd5e.utils.convertLength(maxPulledDist, "ft", canvas.grid.units, { strict: false });
  await MidiQOL.moveTokenAwayFromPoint(targetToken, Math.max(-maxDist, -pulledDist), sourceToken.center, {
    ignoreWalls: false,
    ignoreTokens: true,
  });
}
