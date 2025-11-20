// ##################################################################################################
// Read First!!!!
// Allows to cover the blade with poison and applies the poison effect on a hit.
// v2.3.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro, [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// On hit applies a poison effect when the blade is coated with poison.
//
// Description:
// In the postActiveEffects (OnUse) phase of the Dagger of Venom Coat Blade with Poison activity:
//   Adds message about the coating.
// In the postActiveEffects (OnUse) phase of the Dagger of Venom Attack activity:
//   On a hit, deletes the Poison Coat enchantment from the dagger.
// ###################################################################################################

export async function daggerOfVenom({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the item
  const DEFAULT_ITEM_NAME = "Dagger of Venom";
  const MODULE_ID = "midi-item-showcase-community";
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.7")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize(
      "midi-item-showcase-community.ElwinHelpersRequired"
    )}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    return handleOnUsePostActiveEffects(workflow, scope.macroItem);
  }

  /**
   * Handles the configuration of the poison effect on the item and the application of the poison effect when the dagger hits.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The MidiQOL current workflow.
   * @param {Item5e} sourceItem - The Dagger of Venom item.
   */
  async function handleOnUsePostActiveEffects(currentWorkflow, sourceItem) {
    if (currentWorkflow.activity?.identifier === "coat-blade-with-poison") {
      // Add message about coating
      const infoMsg = `Poison covers the blade.`;
      await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
    } else if (currentWorkflow.activity.identifier === "attack") {
      if (!currentWorkflow.hitTargets?.size || currentWorkflow.aborted) {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | No target hit or workflow was aborted.`, currentWorkflow);
        }
        return;
      }
      const activateBlackPoisonActivity = sourceItem.system.activities.find(
        (a) => a.identifier === "coat-blade-with-poison"
      );
      // Remove applied enchantment for this item
      await elwinHelpers.deleteAppliedEnchantments(activateBlackPoisonActivity?.uuid);
    }
  }
}
