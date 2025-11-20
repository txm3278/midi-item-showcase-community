// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect with third party reaction when Rage is activated, that effect will trigger a reaction
// on the raging barbarian when a visible creature within range is damaged to allow him to use the feature
// to reduce the target's damage.
// If Vengeful Ancestors is present and the Barbarian has the appropriate level, it is triggered on the attacker.
// v4.2.0
// Dependencies:
//  - DAE [on][off]
//  - Times Up
//  - MidiQOL "on use" actor and item macro [preTargeting],[postActiveEffects],[tpr.isDamaged]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect that unsuspends a third party reaction effect when the Rage item is activated.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: A Rage item (having an identifier of 'rage'), which adds a Rage effect when activated must be configured,
//        A scale dice value must be configured on the 'Path of the Ancestral Guardian' subclass,
//        its data value should resolve to '@scale.ancestral-guardian.spirit-shield'.
//       If level 14, a Vengeful Ancestors item (having an identifier of 'vengeful-ancestors') must be configured.
//       RAW target should be Creature, but use Ally to trigger reaction on allies only
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// When the Spirit Shield effect is transferred on the actor:
//   If the Rage effect is activated, unsuspends the third party reaction effect for the actor,
//   the rage effect is also updated to suspend the third party reaction effect on deletion.
// When the Spirit Shield effect is passivated:
//   Suspends the third party reaction effect if present.
// In the preTargeting (item OnUse) phase of the Spirit Shield reaction activity (in owner's workflow):
//   Validates that the activity was triggered by the remote tpr.isDamaged target on use,
//   otherwise the activity workflow execution is aborted.
// In the postActiveEffects (item onUse) phase of the Rage item (in owner's workflow):
//   Unsuspends the third party reaction effect for the actor. The rage effect is also updated to suspend
//   the third party reaction effect on deletion.
// In the postActiveEffects (item onUse) phase of Spirit Shield reaction activity (in owner's workflow):
//   A damage reduction flag is set on the item's owner to be used by the post macro of the tpr.isDamaged reaction.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, the target's damage is reduced
//   by the amount specified in the damage reduction flag set by the executed reaction on the item's owner.
//   If the Vengeful Ancestors feat is present on the Spirit Shield item's owner and the Barbarian
//   has the appropriate level, registers a hook to apply the retribution damage to the attacker
//   after the current workflow has completed.
// In the midi-qol.RollComplete hook (in attacker's workflow):
//   The Vengeful Ancestors retribution damage activity is used to apply the retribution damage to the attacker
//   on the Vengeful Ancestors item owner's client.
// ###################################################################################################

export async function spiritShield({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = "Spirit Shield";
  const MODULE_ID = "midi-item-showcase-community";
  // Default identifier of the Rage feature (support DDBI legacy suffix)
  const RAGE_ITEM_IDENT = "rage";
  const RAGE_LEGACY_ITEM_IDENT = RAGE_ITEM_IDENT + "-legacy";
  // Default identifier of the Vengeful Ancestors feature  (support DDBI legacy suffix)
  const VENGEFUL_ANCESTORS_ITEM_IDENT = "vengeful-ancestors";
  const VENGEFUL_ANCESTORS_LEGACY_ITEM_IDENT = VENGEFUL_ANCESTORS_ITEM_IDENT + "-legacy";
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize(
      "midi-item-showcase-community.ElwinHelpersRequired"
    )}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
    // MidiQOL OnUse item macro for Spirit Shield
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isDamaged.post") {
    // MidiQOL TargetOnUse post macro for Spirit Shield post reaction
    return await handleTargetOnUseIsDamagedPost(workflow, actor, scope.macroItem, options?.thirdPartyReactionResult);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (scope.rolledItem?.identifier === RAGE_ITEM_IDENT || scope.rolledItem?.identifier === RAGE_LEGACY_ITEM_IDENT) {
      // MidiQOL OnUse item macro for Rage
      await handleRageOnUsePostActiveEffects(workflow, scope.macroItem, scope.rolledItem);
    } else if (scope.rolledItem?.uuid === scope.macroItem?.uuid) {
      // MidiQOL OnUse item macro for Spirit Shield
      await handleOnUsePostActiveEffects(workflow, actor);
    }
  } else if (args[0] === "on") {
    // DAE on item macro for spirit shield effect
    await handleOnEffect(actor, token, item);
  } else if (args[0] === "off") {
    // DAE off item macro for spirit shield effect
    await handleOffEffect(actor, item);
  }

  /**
   * Handles the preItemRoll phase of the Spirit Shield reaction activity midi-qol workflow.
   * Validates that the actor has the Rage effect activated and that one and one target is selected,
   * that the target is within range and that there is line of sight to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Spirit Shield item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !== "tpr.isDamaged" ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.includes(currentWorkflow.activity?.uuid)
    ) {
      // Reaction should only be triggered by third party reaction AE
      const msg = `${sourceItem.name} | This reaction can only be triggered when a nearby creature of the raging barbarian is damaged.`;
      ui.notifications.warn(msg);
      return false;
    }

    foundry.utils.setProperty(currentWorkflow.workflowOptions, "fastForwardDamage", true);
    return true;
  }

  /**
   * Handles the postActiveEffects of the Rage item midi-qol workflow.
   * If the Rage effect is activated, unsuspends the third party reaction effect on the actor,
   * the rage effect is also updated to suspend the third party reaction effect on deletion.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Spirit Shield item.
   * @param {Item5e} usedItem - The Rage item.
   */
  async function handleRageOnUsePostActiveEffects(currentWorkflow, sourceItem, usedItem) {
    const sourceActor = currentWorkflow.actor;

    const rageEffect = sourceActor.appliedEffects.find((ae) => !ae.transfer && ae.origin?.startsWith(usedItem.uuid));
    if (rageEffect) {
      // The Barbarian is in Rage it can have the Spirit Shield third party reaction effect on
      await activateThirdPartyReactionEffect(sourceActor, true, sourceItem, currentWorkflow.token, rageEffect);
    }
  }

  /**
   * Handles the tpr.isDamaged post reaction of the Spirit Shield item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, reduces the damage aplied to the target by the rolled amount
   * of the reaction. Also, if of appropriate level, activates the Vengeful Ancestors on the attacker.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Actor5e} targetActor - The target actor.
   * @param {Item5e} sourceItem - The Spirit Shield item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsDamagedPost(currentWorkflow, targetActor, sourceItem, thirdPartyReactionResult) {
    const sourceActor = sourceItem.actor;
    const damageItem = currentWorkflow.damageItem;
    const preventedDmg = foundry.utils.getProperty(targetActor, "flags.dae.spiritShieldPreventedDmg");
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
        thirdPartyReactionResult,
        damageItem,
        preventedDmg,
      });
    }

    if (!(sourceItem.system.activities?.some((a) => a.uuid === thirdPartyReactionResult?.uuid) && preventedDmg > 0)) {
      return;
    }
    elwinHelpers.reduceAppliedDamage(damageItem, preventedDmg, sourceItem);
    // TODO Validate if prevented damage is total rolled or up to total damaged the target received
    //const effectivePreventedDamage = Math.max(0, currentAppliedDamage - damageItem.appliedDamage);
    //DAE.setFlag(sourceActor, "spiritShieldPreventedDmg", effectivePreventedDamage);

    // Activate Vengeful Ancestors if present and of appropriate level
    const vengefulAncestorsItem = sourceActor.itemTypes.feat.find(
      (i) => i.identifier === VENGEFUL_ANCESTORS_ITEM_IDENT || i.identifier === VENGEFUL_ANCESTORS_LEGACY_ITEM_IDENT
    );
    if (!vengefulAncestorsItem) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Barbarian does not have the ${VENGEFUL_ANCESTORS_ITEM_IDENT} feature.`);
      }
      return;
    }
    if (
      (sourceActor.getRollData().classes?.barbarian?.levels ?? 0) >=
      (vengefulAncestorsItem.system.prerequisites?.level ?? 99)
    ) {
      const vengefulAncestorsActivity = vengefulAncestorsItem.system.activities?.getByType("damage")?.[0];
      if (!vengefulAncestorsActivity) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Could not find valid the damage activity for ${vengefulAncestorsItem.name}.`
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

      const usage = {
        midiOptions: {
          spiritShieldVengefulAncestorsTrigger: true,
          targetUuids: [currentWorkflow.tokenUuid],
          configureDialog: false,
          workflowOptions: { autoRollDamage: "always", fastForwardDamage: true, targetConfirmation: "none" },
        },
      };

      const data = {
        activityUuid: vengefulAncestorsActivity.uuid,
        actorUuid: sourceActor.uuid,
        usage,
      };

      // Register hook to call retribution damage after roll is complete
      Hooks.once(`midi-qol.RollComplete.${currentWorkflow.itemUuid}`, async (currentWorkflow2) => {
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            "midi-qol.RollComplete",
            vengefulAncestorsItem.name,
            currentWorkflow,
            currentWorkflow2,
            debug
          )
        ) {
          return;
        }
        await MidiQOL.socket().executeAsUser("completeActivityUse", player.id, data);
      });
    }
  }

  /**
   * Handles the postActiveEffects of the Spirit Shield reaction activity midi-qol workflow.
   * A flag is added to the Barbarian with the damage reduction to be applied and the item card
   * is updated to inform of the damage reduction to be applied on the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Actor5e} sourceActor - The owner of the Spirit Shield item.
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

    const total = currentWorkflow.utilityRoll?.total ?? 0;

    const infoMsg = `<p>You prevent <strong>${total}</strong> points of damage to <strong>\${tokenName}</strong>.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard(
      "beforeButtons",
      workflow,
      elwinHelpers.getTargetDivs(targetToken, infoMsg)
    );
  }

  /**
   * Handles DAE 'on' macro call for the Spirit Shield effect.
   * If the Rage effect is activated, unsuspends the third party reaction effect for the actor,
   * the rage effect is also updated to suspend the third party reaction effect on deletion.
   *
   * @param {Actor5e} sourceActor - The owner of the source item.
   * @param {Token5e} sourceToken - The token of the source actor.
   * @param {Item5e} sourceItem - The Spirit Shield item.
   */
  async function handleOnEffect(sourceActor, sourceToken, sourceItem) {
    // macro called on the "on" of the source item (Spirit Shield)
    // if rage already present when this item effect is activated,
    // we need to unsuspend the third party reaction effect
    const rage = sourceActor.itemTypes.feat.find(
      (i) => i.identifier === RAGE_ITEM_IDENT || i.identifier === RAGE_LEGACY_ITEM_IDENT
    );
    const rageEffect = rage
      ? sourceActor.appliedEffects.find((ae) => !ae.transfer && ae.origin?.startsWith(rage.uuid))
      : undefined;
    if (!rageEffect) {
      // Rage does not seem to be active
      return;
    }

    // The Barbarian is in Rage it can have the Spirit Shield third party reaction effect on
    await activateThirdPartyReactionEffect(sourceActor, true, sourceItem, sourceToken, rageEffect);
  }

  /**
   * Handles DAE 'off' macro call for the Spirit Shield effect.
   * Suspends the third party reaction effect if present.
   *
   * @param {Actor5e} sourceActor - The owner of the item
   * @param {Item5e} sourceItem - The Spirit Shield item.
   */
  async function handleOffEffect(sourceActor, sourceItem) {
    // Suspend third party reaction effect if present
    await activateThirdPartyReactionEffect(sourceActor, false, sourceItem);
  }

  /**
   * Unsuspends the Spirit Shield third party reaction effect for the specified actor to trigger reaction on damage,
   * it also updates the Rage effect to suspend the third party reaction effect when the Rage effect is deleted.
   *
   * @param {Actor5e} sourceActor - The owner of the source item.
   * @param {boolean} activate - Flag to indicate if the third party reaction effect must be activate or deactivated.
   * @param {Item5e} sourceItem - The Spirit Shield item.
   * @param {string} sourceToken - The token of the source actor (only needed for activation).
   * @param {string} rageEffect - The Rage effect (only needed for activation).
   */
  async function activateThirdPartyReactionEffect(sourceActor, activate, sourceItem, sourceToken, rageEffect) {
    const aePredicate = (ae) =>
      ae.transfer &&
      ae.parent?.uuid === sourceItem.uuid &&
      ae.changes.some((c) => c.key === "flags.midi-qol.onUseMacroName" && c.value.includes("tpr.isDamaged"));

    if (activate) {
      // Find third party reaction effect to enable it
      const tprEffect = [...sourceActor.allApplicableEffects()].find(aePredicate);
      if (!tprEffect) {
        console.error(`${DEFAULT_ITEM_NAME} | Third Party Reaction effect not found.`);
        return;
      }
      await tprEffect.update({ disabled: false });

      // Add effect to auto suspend Spirit Shield third party reaction effect when Rage effect expires
      let rageChanges = foundry.utils.deepClone(rageEffect.changes);
      rageChanges.push({
        key: "flags.dae.suspendActiveEffect",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: tprEffect.uuid,
        priority: 20,
      });
      rageChanges.push({
        key: `flags.${MODULE_ID}.spiritShield.tokenUuid`,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: sourceToken.document.uuid,
        priority: 20,
      });
      await sourceActor.updateEmbeddedDocuments("ActiveEffect", [{ _id: rageEffect.id, changes: rageChanges }]);
    } else {
      // Find third party reaction effect to suspend it
      const tprEffect = sourceActor.appliedEffects.find(aePredicate);
      if (!tprEffect) {
        console.warn(`${DEFAULT_ITEM_NAME} | Third Party Reaction effect not active.`);
        return;
      }
      await tprEffect.update({ disabled: true });
    }
  }
}
