// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// When added, updates the Warding Flare recovery to support Short Rest.
// Adds temporary hit points to the target of an attack for which Warding Flare was used.
// v1.1.0
// Dependencies:
//  - DAE [on],[off]
//  - Elwin Helpers world script
//
// Usage:
// This is a special feature that can only be triggered by the Warding Flare feature.
// When used, it will add temporary hit points to the target of the attack that triggered the Warding Flare.
//
// Description:
// In the "on" DAE macro call:
//   Updates the Warding Flare recovery to support Short Rest if the requirements are met.
// In the "off" DAE macro call:
//   Updates the Warding Flare recovery to remove Short Rest if the requirements are met..
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Improved Warding Flare";
const WARDING_FLARE_ITEM_IDENT = "warding-flare";

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

export async function improvedWardingFlare({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0] === "on") {
    // DAE on item macro for improved warding flare effect
    await handleOnEffect(actor, item, debug);
  } else if (args[0] === "off") {
    // DAE off item macro for improved warding flare effect
    await handleOffEffect(actor, item, debug);
  }
}

/**
 * Handles the on effect of the Improved Warding Flare (2024).
 * Updates the Warding Flare recovery to support Short Rest if the requirements are met.
 *
 * @param {Actor5e} sourceActor - The owner of the Improved Warding Flare item.
 * @param {Item5e} sourceItem - The Improved Warding Flare item.
 * @param {boolean} debug - Flag to indicate if debug mode is enabled.
 */
async function handleOnEffect(sourceActor, sourceItem, debug) {
  if (elwinHelpers.getRules(sourceItem) !== "modern") {
    // Do nothing for legacy
    return;
  }
  const wardingFlare = sourceActor.itemTypes.feat.find((i) => i.identifier === WARDING_FLARE_ITEM_IDENT);
  if (!wardingFlare) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Cleric does not have the ${WARDING_FLARE_ITEM_IDENT} feature.`);
    }
    return;
  }
  if ((sourceActor.getRollData().classes?.cleric?.levels ?? 0) >= (sourceItem.system.prerequisites?.level ?? 99)) {
    if (wardingFlare.system.uses?.recovery && !wardingFlare.system.uses?.recovery?.some((r) => r.period === "sr")) {
      const recovery = foundry.utils.deepClone(wardingFlare.system.uses.recovery);
      recovery.push({ period: "sr", type: "recoverAll" });
      await wardingFlare.update({ "system.uses.recovery": recovery });
    }
  }
}

/**
 * Handles the off effect of the Improved Warding Flare (2024).
 * Updates the Warding Flare recovery to remove Short Rest if the requirements are met.
 *
 * @param {Actor5e} sourceActor - The owner of the Improved Warding Flare item.
 * @param {Item5e} sourceItem - The Improved Warding Flare item.
 * @param {boolean} debug - Flag to indicate if debug mode is enabled.
 */
async function handleOffEffect(sourceActor, sourceItem, debug) {
  if (elwinHelpers.getRules(sourceItem) !== "modern") {
    // Do nothing for legacy
    return;
  }
  const wardingFlare = sourceActor.itemTypes.feat.find((i) => i.identifier === WARDING_FLARE_ITEM_IDENT);
  if (!wardingFlare) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Cleric does not have the ${WARDING_FLARE_ITEM_IDENT} feature.`);
    }
    return;
  }
  if (wardingFlare.system.uses?.recovery && wardingFlare.system.uses?.recovery?.some((r) => r.period === "sr")) {
    const recovery = wardingFlare.system.uses.recovery.filter((r) => r.period !== "sr");
    await wardingFlare.update({ "system.uses.recovery": recovery });
  }
}
