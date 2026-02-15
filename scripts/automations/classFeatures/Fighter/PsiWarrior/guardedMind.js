// ##################################################################################################
// Fighter - Psi Warrior - Guarded Mind
// Gives psychic damage resistance to the owner and if the onwer has the charmed or frightened conditions
// at the start of its turn, allows to remove the effects causing them.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [each]
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds Psychic damage resistance to the owner and if the onwer
// has the charmed or frightened conditions at the start of its turn, allows to remove the effects causing them.
//
// Description:
// In the postActiveEffects phase of the Guarded Mind Remove Statuses activity (in owner's workflow):
//   Find all effects applying one of the statuses to be removed, then removes all these effects.
// When the owner of the Guarded Mind turn starts ["each"]:
//   If the owner has the charmed or frightened conditions and there are uses still available for the
//   Guarded Mind - Remove Statuses activity, prompts the user to remove the effects causing those conditions,
//   then calls MidiQOL.completeActivityUse.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Guarded Mind";
const STATUSES = ["frightened", "charmed"];

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

export async function guardedMind({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    if (scope.rolledActivity.identifier === "remove-statuses") {
      await handleOnUsePostActiveEffects(actor);
    }
  } else if (args[0] === "each") {
    if (scope.lastArgValue?.turn === "startTurn") {
      await handleEachStartOfTurn(actor, scope.macroItem, debug);
    }
  }
}

/**
 * Handles the on use post active effects phase of the Guarded Mind - Remove Statuses activity.
 * Find all effects applying one of the statuses to be removed, then removes all these effects.
 *
 * @param {Actor5e} actor - The owner of the Guarded Mind item.
 */
async function handleOnUsePostActiveEffects(actor) {
  const effectsToRemove = actor.appliedEffects.filter(
    (e) =>
      e.parent instanceof Actor &&
      (e.statuses.intersects(new Set(STATUSES)) ||
        e.changes.some((c) => c.key === "macro.StatusEffect" && STATUSES.includes(c.value))) &&
      !CONFIG.statusEffects.some((se) => se._id === e.id),
  );
  if (effectsToRemove.length) {
    await actor.deleteEmbeddedDocuments(
      "ActiveEffect",
      effectsToRemove.map((e) => e.id),
    );
  }
}

/**
 * Handles the start of turn of the owner of the Guarded Mind item.
 * If the owner has the charmed or frightened conditions and there are uses still available for the
 * Guarded Mind - Remove Statuses activity, prompts the user to remove the effects causing those conditions,
 * then calls MidiQOL.completeActivityUse.
 *
 * @param {Actor} actor - The owner of the Guarded Mind item.
 * @param {Item} sourceItem - The Guarded Mind item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleEachStartOfTurn(actor, sourceItem, debug) {
  if (!actor.statuses.intersects(new Set(STATUSES))) {
    return;
  }
  // If uses are available, prompt dlg to use remove statuses.
  const removeStatusesActivity = sourceItem.system.activities.find((a) => a.identifier === "remove-statuses");
  if (!removeStatusesActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Could not find valid remove-statuses activity ${sourceItem.name} feature.`);
    }
    return;
  }
  const { value: nbUses, max: maxUses } = actor.items.get(removeStatusesActivity.consumption?.targets[0]?.target)
    ?.system.uses ?? { value: 0, max: 0 };

  if (nbUses <= 0) {
    // No uses available cannot remove statuses from effects
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No uses available, cannot remove statuses from effects.`, {
        item: sourceItem,
        removeStatusesActivity,
      });
    }
    return;
  }
  const removeEffects = await showDialog(removeStatusesActivity, nbUses, maxUses);
  if (!removeEffects) {
    return;
  }

  await MidiQOL.completeActivityUse(removeStatusesActivity);
}

/**
 * Presents a dialog to choose if the Guarded Mind should be used to remove charmed or frightened statuses.
 *
 * @param {Activity} activity - The Remove Statuses activity.
 * @param {number} nbUses - number of remaining uses.
 * @param {number} maxUses - maximum number of uses.
 * @returns {Promise<boolean>} true if the Guarded Mind should be used to remove statuses.
 */
async function showDialog(activity, nbUses, maxUses) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `${activity.item.name}` },
    content: `Use ${activity.item.name}: ${activity.name} (${nbUses}/${maxUses})?`,
    modal: true,
    rejectClose: false,
  });
}
