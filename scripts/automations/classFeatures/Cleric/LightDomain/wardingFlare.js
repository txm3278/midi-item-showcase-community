// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within range attacks to allow him to add disadvantage on the attack to hit.
// v3.3.0
// Dependencies:
//  - DAE [on]
//  - MidiQOL "on use" actor macro [tpr.isPreAttacked]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: RAW target should be Creature, but use Enemy to trigger reaction only on enemies.
//
// Description:
// In the "on" DAE macro call:
//   Updates the Warding Flare (2024) recovery to support Short Rest if the requirements are met.
// In the tpr.isPreAttacked (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, an AE is applied to force the attack with
//   disadvantage. Also, if it's the 2024 feature and of appropriate level,
//   activates the Improved Warding Flare to add temporary hit points on the target.
// ###################################################################################################

export async function wardingFlare({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = "Warding Flare";
  const IMPROVED_WARDING_FLARE_ITEM_IDENT = "improved-warding-flare";
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.10")) {
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

  if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isPreAttacked.post") {
    await handleTargetOnUseIsPreAttackedPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
  } else if (args[0] === "on") {
    // DAE on item macro for warding flare effect
    await handleOnEffect(actor, item);
  }

  /**
   * Handles the tpr.isPreAttacked post reaction of the Warding Flare item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, adds disadvantage to the attack roll.
   * Also, if it's the 2024 feature and of appropriate level, activates the Improved Warding Flare temp healing on the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Warding Flare item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsPreAttackedPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
    if (!sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid)) {
      return;
    }
    const legacy = elwinHelpers.getRules(scope.rolledItem) === "legacy";

    if (legacy) {
      // Legacy behavior ends here.
      return;
    }

    // Activate Improved Warding Flare if present and of appropriate level
    const sourceActor = sourceItem.actor;
    const improvedWardingFlare = sourceActor.itemTypes.feat.find(
      (i) => i.identifier === IMPROVED_WARDING_FLARE_ITEM_IDENT,
    );
    if (!improvedWardingFlare) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cleric does not have the ${IMPROVED_WARDING_FLARE_ITEM_IDENT} feature.`);
      }
      return;
    }
    if (
      (sourceActor.getRollData().classes?.cleric?.levels ?? 0) >=
      (improvedWardingFlare.system.prerequisites?.level ?? 99)
    ) {
      const improvedWardingFlareActivity = improvedWardingFlare.system.activities?.getByType("heal")?.[0];
      if (!improvedWardingFlareActivity) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Could not find valid the healing activity for ${improvedWardingFlare.name}.`,
        );
        return;
      }

      let player = MidiQOL.playerForActor(sourceActor);
      if (!player?.active) {
        // Find first active GM player
        player = game.users?.activeGM;
      }
      if (!player?.active) {
        console.warn(`${DEFAULT_ITEM_NAME} | No active player or GM for actor.`, sourceActor);
        return;
      }
      const targetUuid = currentWorkflow.targets?.first()?.document?.uuid;
      if (!targetUuid) {
        console.warn(`${DEFAULT_ITEM_NAME} | No valid target found.`, { targets: currentWorkflow.targets });
        return;
      }

      const usage = {
        midiOptions: {
          wardingFlareTrigger: true,
          targetUuids: [targetUuid],
          configureDialog: false,
          workflowOptions: { fastForwardDamage: true, targetConfirmation: "none" },
        },
      };

      const data = {
        activityUuid: improvedWardingFlareActivity.uuid,
        actorUuid: sourceActor.uuid,
        usage,
      };

      await MidiQOL.socket().executeAsUser("completeActivityUse", player.id, data);
    }
  }

  /**
   * Handles the on effect of the Warding Flare (2024).
   * Updates the recovery to support Short Rest if the requirements are met.
   *
   * @param {Actor5e} sourceActor - The owner of the Warding Flare item.
   * @param {Item5e} sourceItem - The Warding Flare item.
   */
  async function handleOnEffect(sourceActor, sourceItem) {
    if (elwinHelpers.getRules(sourceItem) !== "modern") {
      // Do nothing for legacy
      return;
    }

    const improvedWardingFlare = sourceActor.itemTypes.feat.find(
      (i) => i.identifier === IMPROVED_WARDING_FLARE_ITEM_IDENT,
    );
    if (!improvedWardingFlare) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cleric does not have the ${IMPROVED_WARDING_FLARE_ITEM_IDENT} feature.`);
      }
      return;
    }
    if (
      (sourceActor.getRollData().classes?.cleric?.levels ?? 0) >=
      (improvedWardingFlare.system.prerequisites?.level ?? 99)
    ) {
      if (sourceItem.system.uses?.recovery && !sourceItem.system.uses?.recovery?.some((r) => r.period === "sr")) {
        const recovery = foundry.utils.deepClone(sourceItem.system.uses.recovery);
        recovery.push({ period: "sr", type: "recoverAll" });
        await sourceItem.update({ "system.uses.recovery": recovery });
      }
    }
  }
}
