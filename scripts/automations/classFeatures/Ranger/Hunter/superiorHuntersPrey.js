// ##################################################################################################
// Ranger - Hunter - Superior Hunter's Prey
// Implements the optional extra damage to a seen nearby creatures of a marked target which has been dealt damage.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "OnUseMacro" ItemMacro[postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat that gets triggered when the owner deals damage to a target marked by Hunter's Mark.
// If allows to deal damage to a seen creature nearby a marked target which has been dealt damage.
//
// Description:
// In the postRollFinished phase of the any item (in owner's workflow):
//   If the previous workflow was not aborted and at least one taget was hit and
//   that damage greater than was rolled, it looks for a target marked by Hunter's Mark.
//   If found, it validates that the marked target has also been dealt damage.
//   Then the Extra Damage activity is fetched to verify if there is available uses.
//   The next step if to find creature nearby the marked target that are seen by the owner.
//   If there is at least on target, it prompts th owner if it want to use the Extra damage activity.
//   If yes, then the Extra Damage activity is executed with MidiQOL.completeActivityUse.
//   Note that a list of excluded target UUIDs is configured to prevent selecting them in
//   the midi target confirmation dialog. This list is all the tokens on the canvas from which
//   the valid targets are removed.
// ###################################################################################################
// Default name of the feature
const DEFAULT_ITEM_NAME = "Superior Hunter's Prey";
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
  if (game.release.generation < 14) {
    dependencies.push("times-up");
  }
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function superiorHuntersPrey({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postRollFinished") {
    if (scope.rolledItem?.identifier !== "superior-hunters-prey") {
      // Handle any other item used then this feat
      await handleOnUsePostRollFinished(actor, token, workflow, scope.macroItem, debug);
    }
  }
}

/**
 * Handles the on use postRollFinished phase of any item other then this feat.
 * If the previous workflow was not aborted and at least one taget was hit and
 * that damage greater than was rolled, it looks for a target marked by Hunter's Mark.
 * If found, it validates that the marked target has also been dealt damage.
 * Then the Extra Damage activity is fetched to verify if there is available uses.
 * The next step if to find creature nearby the marked target that are seen by the owner.
 * If there is at least on target, it prompts th owner if it want to use the Extra damage activity.
 * If yes, then the Extra Damage activity is executed with MidiQOL.completeActivityUse.
 * Note that a list of excluded target UUIDs is configured to prevent selecting them in
 * the midi target confirmation dialog. This list is all the tokens on the canvas from which
 * the valid targets are removed.
 *
 * @param {Actor} actor - The owner of the Superior Hunter's Prey feat.
 * @param {Token} token - The token associated to the actor.
 * @param {Workflow} workflow - The current MidiQOL workflow.
 * @param {Item} sourceItem - The Superior Hunter's Prey feat.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @return {Promise<Void>}
 */
async function handleOnUsePostRollFinished(actor, token, workflow, sourceItem, debug) {
  if (workflow.aborted || !workflow.hitTargets?.size || !workflow.damageTotal || workflow.damageTotal < 0) {
    // No target, no damage dealt, do nothing
    return;
  }
  const markedTarget = workflow.hitTargets.find((t) =>
    t.actor?.effects.some(
      (ae) => ae.origin?.startsWith(actor.uuid) && elwinHelpers.getOriginItemSync(ae)?.identifier === "hunters-mark",
    ),
  );
  if (!markedTarget) {
    // No marked target, do nothing
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No marked target found.`, { workflow });
    }
    return;
  }
  // Validate that damage was dealt to the marked target.
  if (!workflow.damageList.some((d) => d.targetUuid === markedTarget.document.uuid && d.totalDamage > 0)) {
    // No damage dealt to mark target.
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No damage dealt to marked target.`, { workflow, markedTarget });
    }
    return;
  }

  const extraDamageActivity = sourceItem.system.activities.find((a) => a.identifier === "extra-damage");
  if (!extraDamageActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No activity found with identifier "extra-damage".`, { sourceItem });
    }
    return;
  }
  if (!sourceItem.system.uses.value) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No uses left for activity "extra-damage".`, {
        sourceItem,
        extraDamageActivity,
      });
    }
    return;
  }

  // Validate that there are valid targets for the extra damage
  const validTargets = MidiQOL.findNearby(
    null,
    markedTarget,
    dnd5e.utils.convertLength(30, "ft", dnd5e.utils.defaultUnits("length") ?? "ft"),
  ).filter((t) => MidiQOL.canSee(token, t) && token.document.uuid !== t.document.uuid);
  if (!validTargets.length) {
    // No valid target, skip extra damage
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No valid target found for the extra damage.`, { workflow });
    }
    return;
  }

  // Confirm use of the extra damage
  const useExtraDamage = await showDialog(extraDamageActivity);
  if (!useExtraDamage) {
    return;
  }

  const defaultTargets = validTargets.filter((t) => t.document.disposition * -1 === token.document.disposition);
  const config = {
    midiOptions: {
      targetUuids: defaultTargets.length ? [defaultTargets[0].document.uuid] : undefined,
      workflowOptions: {
        targetConfirmation: validTargets.length > 1 ? "always" : undefined,
        excludeTargets: canvas.tokens.placeables.filter((t) => !validTargets.includes(t)).map((t) => t.document.uuid),
      },
    },
  };
  const dialog = {
    configure: false,
  };
  const result = await MidiQOL.completeActivityUse(extraDamageActivity, config, dialog);
  if (!result || result?.aborted) {
    // Extra attack aborted, refund the activity use
    const chatMessage = MidiQOL.getCachedChatMessage(result?.itemCardUuid);
    const consumed =
      chatMessage?.system.deltas != null ? chatMessage.system.deltas : chatMessage?.getFlag("dnd5e", "use.consumed");
    if (consumed) {
      await extraDamageActivity.refund(consumed);
    }
  }
}

/**
 * Presents a dialog to choose if the Superior Hunter's Prey Extra Damage should be used.
 * @param {Activity} activity - The Superior Hunter's Prey Extra Damage activity.
 * @returns {boolean} true if the Superior Hunter's Prey Extra Damage should be used.
 */
async function showDialog(activity) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `${activity.item.name}` },
    content: `Use ${activity.item.name}: ${activity.name}?`,
    modal: true,
    rejectClose: false,
  });
}
