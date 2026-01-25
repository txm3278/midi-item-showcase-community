// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect, that effect will trigger a reaction by the Paladin
// when a creature within range is damaged to allow him to use the feature to take the target's damage instead.
// v4.1.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction activity that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the postActiveEffects (item onUse) phase of the activity (in owner's workflow):
//   The total damage to be taken for the target specified in a flag is applied to the owner's hp
//   and the flag is unset.
// ###################################################################################################

export async function divineAllegiance({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = "Divine Allegiance";
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.9")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
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
      arguments,
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    // MidiQOL OnUse item macro for Divine Allegiance
    await handleOnUsePostActiveEffects(workflow, actor);
  }

  /**
   * Handles the postActiveEffects phase of the Divine Allegiance activity.
   * The owner of the feature HP's are reduced by the damage to be applied to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Actor5e} sourceActor - The owner of the Divine Allegiance item.
   */
  async function handleOnUsePostActiveEffects(currentWorkflow, sourceActor) {
    const targetToken = currentWorkflow.targets.first();
    if (!targetToken) {
      // No target found
      return;
    }
    const targetActor = targetToken.actor;
    if (!targetActor) {
      // No actor found
      return;
    }
    const appliedDmg = currentWorkflow.workflowOptions?.damageItem?.healingAdjustedTotalDamage ?? 0;
    await sourceActor.applyDamage(appliedDmg);

    const infoMsg = `<p>You take <strong>${appliedDmg}</strong> points of damage instead to <strong>\${tokenName}</strong>.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard(
      "beforeButtons",
      workflow,
      elwinHelpers.getTargetDivs(targetToken, infoMsg),
    );
  }
}
