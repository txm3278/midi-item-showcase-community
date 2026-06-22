// ##################################################################################################
// Ranger - Hunter - Hunter's Lore
// Reveals the strength and weaknesses of a creature marked by Hunter's Mark.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "OnUseMacro" ItemMacro[preActiveEffects],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item needs to be used to activate. When activated displays the strength and weaknesses
// of a creature marked by thw owner's Hunter's Mark.
//
// Description:
// In the preActiveEffects phase of the Hunter's Lore Reveal Strength and Weaknesses activity (in owner's workflow):
//   Validates that there is a creature marked by the owner's Hunter's Mark.
// In the postActiveEffects phase of the Hunter's Lore Reveal Strength and Weaknesses activity (in owner's workflow):
//   Displays the damage immunities, condition immunities, damage resistances and damage vulnerabilities of the
//   creature marked by the owner's Hunter's Mark.
// ###################################################################################################
// Default name of the feature
const DEFAULT_ITEM_NAME = "Hunter's Lore";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion("3.5.16", globalThis?.elwinHelpers?.version ?? "1.1")) {
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

export async function huntersLore({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    return handleOnUserPreItemRoll(actor, workflow);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(actor, token, workflow);
  }
}

/**
 * Handles the on use preActiveEffects phase of the Hunter's Lore Reveal Strength and Weaknesses activity.
 * Validates that there is a creature marked by the owner's Hunter's Mark.
 *
 * @param {Actor} actor - The owner of the Hunter's Lore feat.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @returns {false|undefined} false if there is no creature marked by the owner's Hunter's Mark and the activity must be aborted.
 */
function handleOnUserPreItemRoll(actor, workflow) {
  const huntersMarkActiveEffect = actor.effects.find(
    (ae) => elwinHelpers.getOriginItemSync(ae)?.identifier === "hunters-mark",
  );
  const huntersMark = huntersMarkActiveEffect ? elwinHelpers.getOriginItemSync(huntersMarkActiveEffect) : undefined;
  const markedTarget = huntersMark
    ? canvas.tokens.placeables.find((t) =>
        t.actor.effects.some((ae) => elwinHelpers.getOriginItemSync(ae)?.uuid === huntersMark.uuid),
      )
    : undefined;
  if (!markedTarget) {
    console.warn(`${DEFAULT_ITEM_NAME} | No marked target.`, { workflow });
    ui.notifications.error("You must have a creature marked by Hunter's Mark.");
    return false;
  }
  workflow.workflowOptions.huntersMarkedTarget = markedTarget.document.uuid;
}

/**
 * Handles on use postActiveEffects phase of Hunter's Lore Reveal Strength and Weaknesses activity.
 * Displays the damage immunities, condition immunities, damage resistances and damage vulnerabilities of the
 * creature marked by the owner's Hunter's Mark.
 *
 * @param {Actor} actor - The owner of Hunter's Lore feat.
 * @param {Token} token - The token associated to the owner's actor.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @return {Promise<Void>}
 */
async function handleOnUsePostActiveEffects(actor, token, workflow) {
  const markedTarget = fromUuidSync(workflow.workflowOptions?.huntersMarkedTarget);
  if (!markedTarget) {
    console.warn(`${DEFAULT_ITEM_NAME} | No marked target.`, { workflow });
    return;
  }

  const { di, ci, dr, dv } = markedTarget.actor?.system.traits;
  let diTxt = extractDamageTraitInfo(di);
  let ciTxt = extractConditionTraitInfo(ci);
  let drTxt = extractDamageTraitInfo(dr);
  let dvTxt = extractDamageTraitInfo(dv);

  let infoMsg = "<strong>Marked Target Information</strong><br/><hr>";
  infoMsg += `<strong>${CONFIG.DND5E.traits.di.labels.title}:</strong> ${diTxt}<br>`;
  infoMsg += `<strong>${CONFIG.DND5E.traits.ci.labels.title}:</strong> ${ciTxt}<br>`;
  infoMsg += `<strong>${CONFIG.DND5E.traits.dr.labels.title}:</strong> ${drTxt}<br>`;
  infoMsg += `<strong>${CONFIG.DND5E.traits.dv.labels.title}:</strong> ${dvTxt}<br>`;

  // Add chat message saying it is possible to transfer vow
  await ChatMessage.create({
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    content: infoMsg,
    speaker: ChatMessage.getSpeaker({ actor, token }),
    whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
  });
}

/**
 * Extracts the damage traits and returns a localized concatenated string.
 *
 * @param {object} damageTrait - Damage traits.
 * @returns {string} a localized concatenated string of damage types.
 */
function extractDamageTraitInfo(damageTrait) {
  if (damageTrait?.value?.size || damageTrait.custom) {
    const dtValues = damageTrait.value?.map((type) => CONFIG.DND5E.damageTypes[type]?.label ?? type) ?? new Set();
    if (damageTrait.custom) {
      dtValues.add(damageTrait.custom);
    }
    return [...dtValues].join(", ");
  }
  return game.i18n.localize("DND5E.None");
}

/**
 * Extracts the condition traits and returns a localized concatenated string.
 *
 * @param {object} conditionTrait - Condition traits.
 * @returns {string} a localized concatenated string of conditions.
 */
function extractConditionTraitInfo(conditionTrait) {
  if (conditionTrait?.value?.size || conditionTrait.custom) {
    const ctValues =
      conditionTrait.value?.map((condition) => CONFIG.DND5E.conditionTypes[condition]?.name ?? condition) ?? new Set();
    if (conditionTrait.custom) {
      ctValues.add(conditionTrait.custom);
    }
    return [...ctValues].join(", ");
  }
  return game.i18n.localize("DND5E.None");
}
