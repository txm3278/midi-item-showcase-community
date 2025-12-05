// ##################################################################################################
// Monk - Way of the Drunken Master - Drunken Technique
// Handles the ability to increment walking speed and prevent provoking AoO when Flurry of Blows is used.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feature. When Flurry of Blows is used, it adds an AE that increments the owner's walking speed and
// adds a flag to prevent provoking AoO.
//
// Description:
// In the postActiveEffects (item OnUse) phase of the any item of the Drunken Technique item's owner (in owner's workflow):
//   If the activity used is Flurry of Blows, it applies an AE to increase speed and not provoke AoO.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Drunken Technique";
const KI_IDENT = "ki";
const FLURRY_OF_BLOWS_IDENT = "flurry-of-blows";
const MONKS_FOCUS_IDENT = "monks-focus";

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

export async function drunkenTechnique({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    // Activates when Flurry of Blows is used
    if (isFlurryOfBlows(workflow)) {
      await handleOnUsePostActiveEffects(actor, scope.macroItem);
    }
  }
}

/**
 * Handles the on use post active effects phase of the Flurry of Blows Item/activity.
 * It applies an AE to increase speed and not provoke AoO.
 *
 * @param {Actor5e} actor - The owner of the Drunken Technique item.
 * @param {Item5e} sourceItem - The Drunken Technique item.
 */
async function handleOnUsePostActiveEffects(actor, sourceItem) {
  const drunkenEffect = sourceItem.effects.find((ae) => !ae.transfer);
  if (!drunkenEffect) {
    console.warn(`${DEFAULT_ITEM_NAME} | Missing ${sourceItem.name} effect`);
    return;
  }

  const drunkenEffectData = drunkenEffect.toObject();
  drunkenEffectData.origin = drunkenEffect.uuid; //flag the effect as associated to the item AE used
  await actor.createEmbeddedDocuments("ActiveEffect", [drunkenEffectData]);
}

/**
 * Returns true if the activity used is Flurry of Blows. It supports legacy and modern rules.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @returns {boolean} Indicates if the activity used is Flurry of Blows.
 */
function isFlurryOfBlows(workflow) {
  const rules = elwinHelpers.getRules(workflow.item);
  if (rules === "legacy") {
    return (
      (workflow.item?.identifier === KI_IDENT && workflow.activity?.identifier === FLURRY_OF_BLOWS_IDENT) ||
      workflow.item?.identifier === FLURRY_OF_BLOWS_IDENT
    );
  } else {
    return workflow.item?.identifier === MONKS_FOCUS_IDENT && workflow.activity?.identifier === FLURRY_OF_BLOWS_IDENT;
  }
}
