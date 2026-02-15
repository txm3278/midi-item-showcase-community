// ##################################################################################################
// Fighter - Psi Warrior - Telekinetic Adept
// Allows to take Psi-Powered Leap as a free action or one that consumes a Psionic Energy die,
// it also handles applying Telekinetic Thrust (knock or push) when Pisonic Strike is used.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects],[postRollFinished]
//  - Elwin Helpers world script
//  - Sequencer
//
// Usage:
// This item supports Psi-Powered Leap (free use or spending an Psionic Energy die) as well as applying the
// Telekinetic Thrust (Knock or Push) activity when Psionic Strike is used.
//
// Description:
// In the postActiveEffects phase of the Telekinetic Adept - Telekinetic Thrust - Push activity (in owner's workflow):
//   If target failed its save, uses Sequencer to select a destination and moves the target to this position.
// In the postRollFinished phase of the Psionic Power - Psionic Strike activity (in owner's workflow):
//   If the workflow is not aborted, damage was rolled and there is an hit target, prompts a dialog to choose which
//   Telekinetic Thrust activity to use then calls MidiQOL.completeActivityUse.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Telekinetic Adept";

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
  const dependencies = ["dae", "times-up", "midi-qol", "sequencer"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function telekineticAdept({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    if (scope.rolledActivity.identifier === "telekinetic-thrust-push") {
      await handleOnUsePostActiveEffects(workflow, debug);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postRollFinished") {
    if (scope.rolledItem.identifier === "psionic-power" && scope.rolledActivity.identifier === "psionic-strike") {
      await handleOnUsePostRollFinished(workflow, scope.macroItem, debug);
    }
  }
}

/**
 * Handles the on use post active effects phase of the Telekinetic Adept - Telekinatic Thrust - Push activity.
 * If target failed its save, uses Sequencer to select a destination and moves the target to this position.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostActiveEffects(workflow, debug) {
  if (!workflow.effectTargets.size) {
    return;
  }
  const targetToken = workflow.effectTargets.first();
  const maxRange = dnd5e.utils.convertLength(10, "ft", canvas.grid.units);

  const location = await Sequencer.Crosshair.show(
    {
      location: {
        obj: targetToken,
        limitMaxRange: maxRange,
        wallBehavior: Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES,
      },
    },
    {
      [Sequencer.Crosshair.CALLBACKS.COLLIDE]: (crosshair) => {
        crosshair.updateCrosshair({
          "icon.texture": "icons/svg/bones.svg",
        });
      },
      [Sequencer.Crosshair.CALLBACKS.STOP_COLLIDING]: (crosshair) => {
        crosshair.updateCrosshair({
          "icon.texture": "",
        });
      },
    },
  );
  if (location) {
    await MidiQOL.moveToken(targetToken, location, true);
  } else {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Target choice location was cancelled.`);
    }
  }
}

/**
 * Handles the on use post roll finished phase of the Psionic Power - Psionic Strike activity.
 * If the workflow is not aborted, damage was rolled and there is an hit target, prompts a dialog to choose which
 * Telekinetic Thrust activity to use then calls MidiQOL.completeActivityUse.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item} sourceItem - The Telekinetic Adept item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostRollFinished(workflow, sourceItem, debug) {
  if (workflow.aborted || !(workflow.damageRoll?.total > 0) || !workflow.hitTargets.size) {
    if (debug) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | Psionic Strike workflow was aborted, its damage was not rolled or it no hit targets.`,
        {
          workflow,
        },
      );
    }
    return;
  }
  const activities = sourceItem.system.activities.filter((a) => a.identifier?.startsWith("telekinetic-thrust"));
  const selectedActivity = await selectActivity(sourceItem, activities);
  if (!selectedActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Activity selection was cancelled.`, { workflow, sourceItem });
    }
    return;
  }

  const config = {
    midiOptions: {
      targetUuids: [workflow.hitTargets.first().document.uuid],
    },
  };
  await MidiQOL.completeActivityUse(selectedActivity, config);
}

/**
 * Presents a dialog to choose which Telekinetic Thrust activity to use.
 *
 * @param {Item} item - The Telekinetic Adept item.
 * @param {Activity[]} selectedActivities - The Telekinetic activities from which to choose.
 * @returns {Promise<Activity|null>} The selected activity or undefined if cancelled.
 */
async function selectActivity(item, selectedActivities) {
  const ActivityChoiceDialog = dnd5e.applications?.activity?.ActivityChoiceDialog;
  class CustomChoiceDialog extends ActivityChoiceDialog {
    static get defaultOptions() {
      return super.getDefaultOptions();
    }
    // Only here to satisfy the linter
    static async create(...args) {
      return super.create(...args);
    }
    // Only here to satisfy the linter
    _prepareActivityContext(...args) {
      return super._prepareActivityContext(...args);
    }

    async _prepareContext(options) {
      // Filter usable activities: exclude riders, automationOnly, and activities that fail visibility checks (canUse)
      const activities = selectedActivities
        .map(this._prepareActivityContext.bind(this))
        .sort((a, b) => a.sort - b.sort);
      return {
        ...(await super._prepareContext(options)),
        activities,
      };
    }
  }
  return await CustomChoiceDialog.create(item);
}
