// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Allows to take Telekinetic Movement as a free action or one that consumes a Psionic Energy die,
// it also handles applying Pisonic Strike when the requiements are met. Finally handles a third party reaction effect, 
// that effect will trigger a reaction by the Fighter when the fighter or a creature he can see within range 
// is damaged to allow him to use the feature to reduce the target's damage instead.
// v1.0.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor and item macro [postActiveEffects],[tpr.isDamaged],[postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This item supports Telekinetic Movement (free use or spending an Psionic Energy die) as well as applying the
// Pisonic Strike activity when the requirements are met. It is also a reaction activity that gets triggered 
// by the third party reaction effect when appropriate.
// Note: A scale dice value must be configured on the 'Psi Warrior' subclass,
//       its data value should resolve to '@scale.psi-warrior.energy-die'.
//       RAW the target of the reaction should be Creature, but use Ally to trigger reaction on allies only.
//       Telekinetic Movement is not automated.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the postActiveEffects (item onUse) phase of the Protective Field reaction activity (in owner's workflow):
//   A damage reduction flag is set on the item's owner to be used by the post macro of the tpr.isDamaged reaction.
// In the tpr.isDamaged (TargetOnUse) Protective Field post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, the target's damage is reduced by the amount
//   specified in the flag set by the executed reaction on the item's owner.
// In the postRollFinished phase of any activity (in owner's workflow):
//   If the activity is a weapon attack and damage is dealt, prompts to use Psionic Strike if it as not already been used this turn
//   and Psionic Energy dice are available. If yes, calls MidiQOL.completeActivityUse and flag the activity as used.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Psionic Power";

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

export async function psionicPower({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    // MidiQOL OnUse item macro for Protective Field
    if (scope.rolledActivity.identifier === "protective-field") {
      await handleOnUseProtectiveFieldPostActiveEffects(workflow);
    }
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isDamaged.post") {
    // MidiQOL TargetOnUse post macro for Protective Field post reaction
    handleProtectiveFieldIsDamagedPost(
      workflow,
      actor,
      scope.macroItem,
      scope.options?.thirdPartyReactionResult,
      debug,
    );
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postRollFinished") {
    // MidiQOL OnUse item macro on any item used to determine if Psionic Strike can be used
    await handleOnUsePsionicStrikePostRollFinished(workflow, actor, scope.rolledActivity, scope.macroItem, debug);
  } else if (args[0] === "on") {
    // Clear psionic strike state when first applied
    await DAE.setFlag(actor, "psionicPowerPsionicStrikeUsed", false);
  } else if (args[0] === "off") {
    // Remove psionic strike state when removed
    await DAE.unsetFlag(actor, "psionicPowerPsionicStrikeUsed");
  } else if (args[0] === "each") {
    if (scope.lastArgValue?.turn === "startTurn") {
      // Clear psionic strike state on start of turn
      await DAE.setFlag(actor, "psionicPowerPsionicStrikeUsed", false);
    }
  }
}

/**
 * Handles the tpr.isDamaged post reaction execution of the activity in the triggering midi-qol workflow.
 * If the reaction was used and completed successfully, reduces the damage aplied to the target by the rolled amount of the reaction.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor} targetActor - Target actor.
 * @param {Item} scope.macroItem - The Psionic Power item.
 * @param {object} thirdPartyReactionResult - The third party reaction result.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
function handleProtectiveFieldIsDamagedPost(workflow, targetActor, scope.macroItem, thirdPartyReactionResult, debug) {
  const preventedDmg = foundry.utils.getProperty(targetActor, "flags.dae.protectiveFieldPreventedDmg");
  if (
    scope.macroItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid) &&
    workflow.damageItem &&
    preventedDmg > 0
  ) {
    elwinHelpers.reduceAppliedDamage(workflow.damageItem, preventedDmg, scope.macroItem);
  }
  if (debug) {
    console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
      result: thirdPartyReactionResult,
      damageItem: workflow.damageItem,
      preventedDmg,
    });
  }
}

/**
 * Handles the postActiveEffects of the reaction activity.
 * The owner of the feature HP's are reduced by the damage to be applied to the target.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUseProtectiveFieldPostActiveEffects(workflow) {
  const targetToken = workflow.targets.first();
  if (!targetToken) {
    // No target found
    return;
  }
  const targetActor = targetToken.actor;
  if (!targetActor) {
    // No actor found
    return;
  }
  const total = workflow.utilityRoll?.total ?? 0;

  const infoMsg = `<p>You prevent <strong>${total}</strong> points of damage to <strong>\${tokenName}</strong>.</p>`;
  await elwinHelpers.insertTextIntoMidiItemCard(
    "beforeButtons",
    workflow,
    elwinHelpers.getTargetDivs(targetToken, infoMsg),
  );
}

/**
 * Handles the postRollFinished of the any activity.
 * If the activity is a weapon attack and damage is dealt, prompts to use Psionic Strike if it as not already been used this turn
 * and Psionic Energy dice are available. If yes, calls MidiQOL.completeActivityUse and flag the activity as used.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor} actor - The owner of the Psionic Power item.
 * @param {Activity} scope.rolledActivity - The activity that was used.
 * @param {Item} scope.macroItem - The Psionic Power item.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns
 */
async function handleOnUsePsionicStrikePostRollFinished(workflow, actor, scope.rolledActivity, scope.macroItem, debug) {
  if (
    !workflow.hitTargets.size ||
    !elwinHelpers.isWeapon(scope.rolledActivity.item) ||
    !scope.rolledActivity.hasAttack ||
    scope.rolledActivity.attack.type?.classification !== "weapon" ||
    !(workflow.damageRoll?.total > 0)
  ) {
    return;
  }
  const psionicStrikeActivity = scope.macroItem.system.activities.find((a) => a.identifier === "psionic-strike");
  if (!psionicStrikeActivity) {
    console.warn(`${DEFAULT_ITEM_NAME} | Could not find valid the Psionic Strike activity for ${scope.macroItem.name}.`);
    return;
  }
  const { value: psionicUses, max: maxPsionicUses } = scope.macroItem.system.uses ?? { value: 0, max: 0 };

  if (psionicUses <= 0 || DAE.getFlag(actor, "psionicPowerPsionicStrikeUsed")) {
    // No uses available cannot use Psionic Strike
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No uses available, cannot use Psionic Strike.`, {
        psionicPower: scope.macroItem,
        psionicStrikeActivity,
      });
    }
    return;
  }

  const usePsionicStrike = await showDialog(psionicStrikeActivity, psionicUses, maxPsionicUses);
  if (!usePsionicStrike) {
    return;
  }
  const config = {
    midiOptions: {
      targetUuids: [workflow.hitTargets.first().document.uuid],
    },
  };
  const result = MidiQOL.completeActivityUse(psionicStrikeActivity, config);
  if (!result?.aborted) {
    DAE.setFlag(actor, "psionicPowerPsionicStrikeUsed", true);
  }
}

/**
 * Presents a dialog to choose if Psionic Strike is to be used.
 * @param {Activity} activity - The Psionic Strike activity.
 * @param {number} nbUses - number of remaining uses.
 * @param {number} maxUses - maximum number of uses.
 * @returns {Promise<boolean>} true if the Psionic Strike should be used.
 */
async function showDialog(activity, nbUses, maxUses) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `${activity.item.name}` },
    content: `Use ${activity.item.name}: ${activity.name} (${nbUses}/${maxUses})?`,
    modal: true,
    rejectClose: false,
  });
}
