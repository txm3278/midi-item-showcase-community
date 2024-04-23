// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active efect aura when Rage is activated, that effect will trigger a reaction on the raging barbarian
// when a visible creature within range is damaged to allow him to use the feature to reduce the target's damage.
// If Vengeful Ancestors is present and the Barbarian has the appropriate level, it is triggered on the attacker.
// v2.0.0
// Dependencies:
//  - DAE [on][off]
//  - Times Up
//  - MidiQOL "on use" actor and item macro [preTargeting],[preTargetDamageApplication],[postActiveEffects]
//  - Active Auras
//  - Elwin Helpers world script
//  Note: A Rage item which adds a Rage effect when activated must be configured,
//        A scale dice value must be configured on the 'Path of the Ancestral Guardian' subclass,
//        its data value should resolve to '@scale.path-of-the-ancestral-guardian.spirit-shield'.
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
//   - Action Type: Other
//   - Damage formula:
//     @scale.path-of-the-ancestral-guardian.spirit-shield | No Damage
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before the item is rolled
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feature.
// Two effects must also be added:
//   - Spirit Shield:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,postActiveEffects
//          - flags.dae.macro.itemMacro | Custom |
//   - Spirit Shield - Aura:
//      - Effect Suspended (checked)
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preTargetDamageApplication
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 30
//        - Ignore self? (checked)
//        - Check Token Height: (checked)
//        - Walls Block this Aura?: No
//
// Usage:
// This item has a passive effect that unsuspends an active aura effect when the Rage item is activated.
// It is also a manual reaction item that gets triggered by the active aura effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// When the Spirit Shield effect is transferred on the actor:
//   If the Rage effect is activated, unsuspends the aura effect for the actor,
//   the rage effect is also updated to suspend the aura effect on deletion.
// In the postActiveEffects phase of the Rage item:
//   Unsuspends the aura effect for the actor. The rage effect is also updated to suspend
//   the aura effect on deletion.
// When the Spirit Shield effect is passivated:
//   Suspends the aura effect if present.
// In the preItemRoll phase of Spirit Shield item:
//   Validates that the actor has the Rage effect activated and that one and one target is selected,
//   that the target is within range and that there is line of sight to the target,
//   otherwise the item workflow execution is aborted.
// In the preTargetDamageApplication phase of a target having the Spirit Shield's Active Aura Effect:
//   Validates that the source actor of the Spirit Shield is not incapacitated, can see the target and
//   has not used its reaction. If the conditions are fulfilled, the Spirit Shield item is triggered
//   has a reaction on the source actor client's. If the reaction was used and completed successfully,
//   the target's damage is reduced by the amount specified in the flag set by the executed reaction.
//   If the Vengeful Ancestors feat is present on the source actor of the Spirit Shield and the Barbarian
//   has the appropriate level, the item is called on the source actor client's.
// In the postActiveEffects phase of Spirit Shield item:
//   A damage reduction flag is set on the actor to be used by the macro in the preTargetDamageApplication phase.
// ###################################################################################################

export async function spiritShield({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
  options,
}) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Spirit Shield';
  // Default name of the Rage feature
  const RAGE_ITEM_NAME = 'Rage';
  // Default name of the Rage effect, normally same as the feature
  const RAGE_EFFECT_NAME = RAGE_ITEM_NAME;
  // Default name of the Vengeful Ancestors feature
  const VENGEFUL_ANCESTORS_ITEM_NAME = 'Vengeful Ancestors';
  // Level at which Vengeful Ancestors is triggered
  const VENGEFUL_ANCESTORS_TRIGGER_LEVEL = 14;
  const debug = true;

  if (!isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '2.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol', 'ActiveAuras'];
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    // MidiQOL OnUse item macro for Spirit Shield
    return handleSpiritShieldOnUsePreTargeting(workflow, macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'preTargetDamageApplication'
  ) {
    // MidiQOL TargetOnUse item macro for Spirit Shield Aura
    return await handleSpiritShieldAuraOnUsePreTargetDamageApplication(
      workflow,
      token,
      macroItem
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    if (rolledItem?.name === RAGE_ITEM_NAME) {
      // MidiQOL OnUse item macro for Rage
      await handleRageOnUsePostActiveEffects(workflow, macroItem);
    } else if (rolledItem?.uuid === macroItem?.uuid) {
      // MidiQOL OnUse item macro for Spirit Shield
      await handleSpiritShieldOnUsePostActiveEffects(workflow, actor);
    }
  } else if (args[0] === 'on') {
    // DAE on item macro for spirit shield effect
    await handleSpiritShieldOnEffect(actor, token, item);
  } else if (args[0] === 'off') {
    // DAE off item macro for spirit shield effect
    await handleSpiritShieldOffEffect(actor, item);
  }

  /**
   * Handles the preItemRoll phase of the Spirit Shield item midi-qol workflow.
   * Validates that the actor has the Rage effect activated and that one and one target is selected,
   * that the target is within range and that there is line of sight to the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Spirit Shield item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleSpiritShieldOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'preTargetDamageApplication' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the raging barbarian is damaged.`;
      ui.notifications.warn(msg);
      return false;
    }

    setProperty(
      currentWorkflow,
      'options.workflowOptions.fastForwardDamage',
      true
    );
    return true;
  }

  /**
   * Handles the postActiveEffects of the Rage item midi-qol workflow.
   * If the Rage effect is activated, adds an aura effect to the actor,
   * the rage effect is also updated to delete the aura effect on deletion.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Spirit Shield item.
   */
  async function handleRageOnUsePostActiveEffects(currentWorkflow, sourceItem) {
    const sourceActor = currentWorkflow.actor;

    const rageEffect = sourceActor.appliedEffects.find(
      (ae) => ae.name === RAGE_EFFECT_NAME
    );
    if (rageEffect) {
      // The Barbarian is in Rage it can have the Spirit Shield aura effect on
      await activateAuraEffect(
        sourceActor,
        true,
        sourceItem,
        currentWorkflow.token,
        rageEffect
      );
    }
  }

  /**
 * Handles the preTargetDamageApplication of the Spirit Shield item midi-qol workflow.
 * If the requirements are fulfilled, triggers a remote reaction on the Fighter's client 
 * to reduce the damage applied to the target.

 *
 * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
 * @param {Token5e} targetToken The target token that is damaged.
 * @param {Item5e} sourceItem The Spirit Shield item.
 */
  async function handleSpiritShieldAuraOnUsePreTargetDamageApplication(
    currentWorkflow,
    targetToken,
    sourceItem
  ) {
    // Skip this phase if it was triggered by the sourceItem
    if (currentWorkflow.itemUuid === sourceItem?.uuid) {
      return;
    }
    // Skip this phase if the item did not applied damage or it was healing
    if (
      !currentWorkflow.damageItem?.appliedDamage ||
      currentWorkflow.damageItem?.appliedDamage < 0
    ) {
      return;
    }
    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`,
        sourceActor,
        targetToken
      );
      return;
    }
    const sourceItemTokenUuid = sourceActor.getFlag(
      'world',
      'spiritShield.tokenUuid'
    );
    const sourceItemTokenDoc = fromUuidSync(sourceItemTokenUuid);
    if (!sourceItemTokenDoc) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Source token not found for ${sourceItemTokenUuid}`
      );
      return;
    }

    if (!MidiQOL.canSee(sourceItemTokenDoc, targetToken)) {
      // There is no line of sight to the target or the target is not visible
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | There is no line of sight to the target.`
        );
      }
      return;
    }

    // Remove previous damage prevention value
    await DAE.unsetFlag(sourceActor, 'spiritShieldPreventedDmg');
    const result = await elwinHelpers.doThirdPartyReaction(
      currentWorkflow.item,
      targetToken,
      sourceItem,
      'preTargetDamageApplication',
      { debug, reactionTokenUuid: sourceItemTokenUuid }
    );

    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Reaction result`, {
        result,
        damageItem: currentWorkflow.damageItem,
        preventedDmg: DAE.getFlag(sourceActor, 'spiritShieldPreventedDmg'),
      });
    }

    if (
      !(
        result?.uuid === sourceItem.uuid &&
        DAE.getFlag(sourceActor, 'spiritShieldPreventedDmg') > 0
      )
    ) {
      return;
    }
    const damageItem = currentWorkflow.damageItem;
    const preventedDmg = DAE.getFlag(sourceActor, 'spiritShieldPreventedDmg');
    elwinHelpers.reduceAppliedDamage(damageItem, preventedDmg);

    if (
      (sourceActor.getRollData().classes?.barbarian?.levels ?? 0) >=
      VENGEFUL_ANCESTORS_TRIGGER_LEVEL
    ) {
      // Activate Vengeful Ancestors
      const vengefulAncestorsItem = sourceActor.items.getName(
        VENGEFUL_ANCESTORS_ITEM_NAME
      );
      if (!vengefulAncestorsItem) {
        if (debug) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | Barbarian is missing the ${VENGEFUL_ANCESTORS_ITEM_NAME} feature.`
          );
        }
        return;
      }

      const options = {
        targetUuids: [currentWorkflow.tokenUuid],
        configureDialog: false,
        spiritShieldVengefulAncestorsTrigger: true,
        workflowOptions: {
          fastForwardDamage: true,
          autoRollDamage: 'always',
          targetConfirmation: 'none',
        },
      };

      const data = {
        itemData: vengefulAncestorsItem.toObject(),
        actorUuid: sourceActor.uuid,
        targetUuids: options.targetUuids,
        options,
      };

      let player = MidiQOL.playerForActor(sourceActor);
      if (!player?.active) {
        // Find first active GM player
        player = game.users?.find((p) => p.isGM && p.active);
      }
      if (!player?.active) {
        console.warn(
          `${MACRO_NAME} | No active player or GM for actor.`,
          sourceActor
        );
        return;
      }

      // Register hook to call retribution damage after roll is complete
      Hooks.once(
        `midi-qol.RollComplete.${currentWorkflow.itemUuid}`,
        async (currentWorkflow2) => {
          if (
            !elwinHelpers.isMidiHookStillValid(
              DEFAULT_ITEM_NAME,
              'midi-qol.RollComplete',
              VENGEFUL_ANCESTORS_ITEM_NAME,
              currentWorkflow,
              currentWorkflow2,
              debug
            )
          ) {
            return;
          }
          await MidiQOL.socket().executeAsUser(
            'completeItemUse',
            player.id,
            data
          );
        }
      );
    }
  }

  /**
   * Handles the postActiveEffects of the Spirit Shield item midi-qol workflow.
   * A flag is added to the Barbarian with the damage reduction to be applied and the item card
   * is updated to inform of the damage reduction to be applied on the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow The midi-qol curent workflow.
   * @param {Actor5e} sourceActor Owner of the Spirit Shield item.
   */
  async function handleSpiritShieldOnUsePostActiveEffects(
    currentWorkflow,
    sourceActor
  ) {
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
    await DAE.setFlag(
      sourceActor,
      'spiritShieldPreventedDmg',
      currentWorkflow.damageTotal
    );

    const infoMsg = `<p>You prevent <strong>${currentWorkflow.damageTotal}</strong> points of damage to <strong>\${tokenName}</strong>.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard(
      'beforeButtons',
      workflow,
      elwinHelpers.getTargetDivs(targetToken, infoMsg)
    );
  }

  /**
   * Handles DAE 'on' macro call for the Spirit Shield effect.
   * If the Rage effect is activated, unsuspends the aura effect for the actor,
   * the rage effect is also updated to suspend the aura effect on deletion.
   *
   * @param {Actor5e} sourceActor owner of the source item.
   * @param {Token5e} sourceToken token of the source actor.
   * @param {Item5e} sourceItem the Spirit Shield item.
   */
  async function handleSpiritShieldOnEffect(
    sourceActor,
    sourceToken,
    sourceItem
  ) {
    // macro called on the "on" of the source item (Spirit Shield)
    // if rage already present when this item effect is activated,
    // we need to unsuspend the aura
    const rageEffect = sourceActor.appliedEffects.find(
      (ae) => ae.name === RAGE_EFFECT_NAME
    );
    if (!rageEffect) {
      // Rage does not seem to be active
      return;
    }

    // The Barbarian is in Rage it can have the Spirit Shield aura effect on
    await activateAuraEffect(
      sourceActor,
      true,
      sourceItem,
      sourceToken,
      rageEffect
    );
  }

  /**
   * Handles DAE 'off' macro call for the Spirit Shield effect.
   * Suspends the aura effect if present.
   *
   * @param {Actor5e} sourceActor owner of the item
   * @param {Item5e} sourceItem the Spirit Shield item.
   */
  async function handleSpiritShieldOffEffect(sourceActor, sourceItem) {
    // Suspend aura effect if present
    await activateAuraEffect(sourceActor, false, sourceItem);
  }

  /**
   * Unsuspends the Spirit Shield Active Aura effect for the specified actor to trigger reaction on damage,
   * it also updates the Rage effect to suspend the aura when the Rage effect is deleted.
   *
   * @param {Actor5e} sourceActor the owner of the source item.
   * @param {boolean} activate flag to indicate if the aura effect must be activate or deactivated.
   * @param {Item5e} sourceItem the Spirit Shield item.
   * @param {string} sourceToken the token of the source actor (only needed for activation).
   * @param {string} rageEffect the Rage effect (only needed for activation).
   */
  async function activateAuraEffect(
    sourceActor,
    activate,
    sourceItem,
    sourceToken,
    rageEffect
  ) {
    let aePredicate = undefined;
    if (CONFIG.ActiveEffect.legacyTransferral) {
      aePredicate = (ae) =>
        ae.flags?.dae?.transfer &&
        ae.origin === sourceItem.uuid &&
        ae.getFlag('ActiveAuras', 'isAura');
    } else {
      aePredicate = (ae) =>
        ae.transfer &&
        ae.parent?.uuid === sourceItem.uuid &&
        ae.getFlag('ActiveAuras', 'isAura');
    }

    if (activate) {
      // Find aura effect to enable it
      const auraEffect = [...sourceActor.allApplicableEffects()].find(
        aePredicate
      );
      if (!auraEffect) {
        console.error(`${DEFAULT_ITEM_NAME} | Aura effect not found.`);
        return;
      }
      await auraEffect.update({ disabled: false });

      // Add effect to auto suspend Spirit Shield Aura when Rage effect expires
      let rageChanges = deepClone(rageEffect.changes);
      rageChanges.push({
        key: 'flags.dae.suspendActiveEffect',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: auraEffect.uuid,
        priority: 20,
      });
      rageChanges.push({
        key: 'flags.world.spiritShield.tokenUuid',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: sourceToken.document.uuid,
        priority: 20,
      });
      await sourceActor.updateEmbeddedDocuments('ActiveEffect', [
        { _id: rageEffect.id, changes: rageChanges },
      ]);
    } else {
      // Find aura effect to suspend it
      const auraEffect = sourceActor.appliedEffects.find(aePredicate);
      if (!auraEffect) {
        console.warn(`${DEFAULT_ITEM_NAME} | Aura effect not active.`);
        return;
      }
      await auraEffect.update({ disabled: true });
    }
  }
}
