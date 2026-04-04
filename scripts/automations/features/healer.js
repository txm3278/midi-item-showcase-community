// ##################################################################################################
// Read First!!!!
// Handles the extra healing effect when a creature is stabilized by the owner and allows to heal using a Healer's Kit.
// v1.0.0
// Author: Elwin#1410 based on MotoMoto version
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat that heals 1 HP when a creature is stabilized by the owner using a Healer's Kit.
// It can also be used to heal a creature with an Healer's Kit.
//
// Description:
// In the postRollFinished (OnUse) phase of Healer's Kit - Stabilize activity (in owner's workflow):
//   If the workflow was not aborted and there are hit targets, uses the "stabilize" activity on the Healer feat
//   to apply the extra healing effect.
// In the optional damage bonus of the damage roll for the Healer - Heal with Kit activity (in owner's workflow):
//   If there is a target token with an actor, adds a bonus to the healing equal to the target's max HD.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Healer";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.12")) {
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

export async function healer({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    if (scope.rolledItem?.identifier === "healers-kit") {
      await handleOnUseHealersKitPostRollFinished(workflow, scope.macroItem, debug);
    }
  } else if (args[0].tag === "optional") {
    return handleOptionalDamageRoll(workflow, debug);
  }
}

/**
 * Handles the OnUse postRollFinished macro for the Healer feat when using the Healer's Kit.
 * Uses the "stabilize" activity of the Healer feat to apply the extra healing effect.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Healer feat.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {Promise<void>}
 */
async function handleOnUseHealersKitPostRollFinished(workflow, sourceItem, debug) {
  if (workflow.aborted) {
    // If the workflow was aborted, the healer's extra effects are not applied.
    return;
  }
  if (workflow.hitTargets.size !== 1) {
    // No hit targets or more than one, the healer's extra effects are not applied.
    return;
  }
  const target = workflow.hitTargets.first();
  const activity = sourceItem.system.activities.find((a) => a.identifier === "stabilize");
  if (!activity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No activity with identifier "stabilize" found on item ${sourceItem.name}`);
    }
    return;
  }
  const config = {
    midiOptions: {
      targetUuids: [target.document.uuid],
      workflowOptions: { autoRollDamage: "always" },
    },
  };

  await MidiQOL.completeActivityUse(activity, config);
}

/**
 * Handles the optional damage roll for the Healer feat to add the bonus healing when healing a creature with the Healer's Kit.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {string} The bonus to apply the damage.
 */
function handleOptionalDamageRoll(workflow, debug) {
  const targetToken = workflow.hitTargets?.first();
  if (!targetToken) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No target token found for the optional damage roll`);
    }
    return "+0[No Token]";
  }
  const targetActor = targetToken.actor;
  if (!targetActor) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No target actor found for the optional damage roll`, { targetToken });
    }
    return "+0[No Actor]";
  }
  const bonusHeal = targetActor.system.attributes.hd.max;
  if (!bonusHeal) {
    if (debug) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | No max HD found for the target actor ${targetActor.name} for the optional damage roll`,
        { targetActor },
      );
    }
    return "+0[No Max HD]";
  }
  return `+${bonusHeal}`;
}
