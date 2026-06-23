// ##################################################################################################
// Ranger - Hunter - Defensive Tactics
// Allows to choose between Escape the Horde or Multiattack Defense on short or long and applies an AE
// that provides the benefits of the choice.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "OnUseMacro" ItemMacro[preActiveEffects],[isHit]
//  - Elwin Helpers world script
//  - Gambit's Premade (optional, for granting disadvantage on others AoO)
//
// Usage:
// This item needs to be used to activate. A chat card to activate it appears on a short or long rest.
// When activated it offers to activate either Escape the Horde or Multiattack Defense Active Effect.
// The selected active effect provides the benefits of the chosen defensive tactic.
//
// Description:
// In the preActiveEffects phase of the Defensive Tactics Choice (in owner's workflow):
//   Deletes any applied defensive tactics from the owner.
// In the isHit (TargetOnUse) when Multiattack Defense is active (in attacker's workflow)
//   Applies an AE on the owner that grants disadvantage to any attacks from the same attacker for the turn.
//   Note: needs Gambit's Premade to support the specified flag.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Defensive Tactics";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (foundry.utils.isNewerVersion("3.5.14", globalThis?.elwinHelpers?.version ?? "1.1")) {
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

export async function defensiveTactics({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && scope.rolledItem?.identifier === "defensive-tactics") {
    if (scope.rolledActivity?.identifier === "choice" && args[0].macroPass === "preActiveEffects") {
      await handleOnUseChoicePreActiveEffects(actor, workflow);
    }
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "isHit") {
    await handleTargetOnUseMultiAttackDefenseIsHit(actor, scope.macroItem, scope.midiData.tokenUuid);
  }
}

/**
 * Handles the on use pre active effects phase of the Defensive Tactics of the Choice activity.
 * Deletes any AE from a previous selection.
 *
 * @param {Actor5e} actor - The owner of the Defensive Tactics feat.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUseChoicePreActiveEffects(actor, workflow) {
  await actor.deleteEmbeddedDocuments(
    "ActiveEffect",
    actor.effects.filter((e) => e.origin?.startsWith(workflow.item?.uuid)).map((e) => e.id),
  );
}

/**
 * Handles the target on use isHit phase of Defensive Tactics Multiattack Defense active effect.
 * Fetches the temporary multiattack defense AE, replaces the value placeholder with the
 * attacker's UUID and applies the AE on the owner of the feat.
 *
 * @param {Actor5e} actor - The owner of the Defensive Tactics feat.
 * @param {Item} sourceItem - The Defensive Tactics feat.
 * @param {string} attackerTokenUuid - UUID of the attacker's token.
 * @returns {Promise<Void>}
 */
async function handleTargetOnUseMultiAttackDefenseIsHit(actor, sourceItem, attackerTokenUuid) {
  const multiAttackDefenseActiveEffect = sourceItem?.effects.find(
    (ae) => !ae.transfer && ae.isTemporary && !ae.isAppliedEnchantment,
  );
  if (!multiAttackDefenseActiveEffect) {
    console.warn(`${DEFAULT_ITEM_NAME} | Missing active effect to apply disadvantage.`, {
      sourceItem: sourceItem,
    });
  }
  const multiAttackDefenseActiveEffectData = multiAttackDefenseActiveEffect.toObject();
  multiAttackDefenseActiveEffectData.origin = multiAttackDefenseActiveEffect.uuid;
  multiAttackDefenseActiveEffectData.changes.forEach((c) => {
    if (c.value && typeof c.value === "string") {
      c.value = c.value.replaceAll("@tokenUuid", attackerTokenUuid);
    }
  });
  await actor.createEmbeddedDocuments("ActiveEffect", [multiAttackDefenseActiveEffectData]);
}
