// ##################################################################################################
// Ranger - Hunter - Superior Hunter's Defense
// Handles the reaction that adds resistance to the damage received.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "OnUseMacro" ItemMacro[preActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a feat with a reaction activity that gets triggered when the owner receives damage.
// The reaction adds resistance to one of the type of damage taken.
//
// Description:
// In the preActiveEffects phase of the Superior Hunter's Defense Resistance activity (in owner's workflow):
//   If the owner took damage, updates the AE that adds resistance to the damage taken.
//   If more than one damage type was taken, prompts the owner for which one will be used to update the AE.
// ###################################################################################################
// Default name of the feature
const DEFAULT_ITEM_NAME = "Superior Hunter's Defense";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion("3.5.14", globalThis?.elwinHelpers?.version ?? "1.1")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "midi-qol"];
  if (game.release.generation < 14) {
    dependencies.push("times-up");
  }
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function superiorHuntersDefense({
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
    await handleOnUsePreActiveEffects(actor, token, workflow, debug);
  }
}

/**
 * Handles the on use preActiveEffects phase of the Superior Hunter's Defense Resistance activity.
 * If damage was taken by the owner, updates the AE that adds resistance to the damage taken.
 * If more than one damage type was taken, prompts the owner for which one will be used to update the AE.
 *
 * @param {Actor} actor - The owner of the the Superior Hunter's Defense feat.
 * @param {Token} token - The token associated to the actor.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePreActiveEffects(actor, token, workflow, debug) {
  const damages = workflow.workflowOptions?.damageDetail?.filter((d) => d.value > 0);
  if (!damages.length) {
    return { haltEffectsApplication: true };
  }

  let dmgType = damages[0]?.type;

  if (damages?.length > 1) {
    dmgType = (await chooseDamageType(workflow.item, damages)) ?? dmgType;
  }

  const resistanceEffect = workflow.item.effects.find((ae) => ae.isTemporary);
  if (!resistanceEffect) {
    return { haltEffectsApplication: true };
  }
  const changes = foundry.utils.deepClone(resistanceEffect.changes);
  const change = changes.find((c) => c.key === "system.traits.dr.value");
  if (!change) {
    return { haltEffectsApplication: true };
  }
  change.value = dmgType;
  await resistanceEffect.update({ changes });
}

/**
 * Prompts a dialog to choose a damage type from a list of types.
 *
 * @param {Item5e} sourceItem - The source item.
 * @param {Array<object>} damages - The type and value of damages from which to choose.
 *
 * @returns {Promise<string>} the selected damage type.
 */
async function chooseDamageType(sourceItem, damages) {
  const data = {
    buttons: damages.map((d) => ({
      label: `${CONFIG.DND5E.damageTypes[d.type].label} [${d.value}]`,
      value: d.type,
    })),
    title: `${sourceItem.name} - Choose a Damage Type`,
  };
  return await elwinHelpers.buttonDialog(data, "column");
}
