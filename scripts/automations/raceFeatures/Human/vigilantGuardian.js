// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Mark of Sentinel Human
// when a creature within range is hit to allow him to switch places with the target.
// v3.1.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting][tpr.isHit]
//  - Helwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Race Feature
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction only on allies)
//   - Range: 5 Feet
//   - Limited Uses: 1 of 1 per Long Rest
//   - Uses Prompt: (checked)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isHit"
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Vigilant Guardian:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isHit|ignoreSelf=true;canSee=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction active effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// In the preTargeting (item OnUse) phase of the Vigilant Guardian item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isHit target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isHit (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, the current workflow target is switched to the owner
//   of the Vigilant Guardian item.
// ###################################################################################################

export async function vigilantGuardian({
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
  const DEFAULT_ITEM_NAME = 'Vigilant Guardian';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.2'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol'];
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
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isHit.post'
  ) {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    await handleTargetOnUseIsHitPost(
      workflow,
      token,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  }

  /**
   * Handles the preTargeting phase of the Vigilant Guardian item midi-qol workflow.
   * Validates that the reaction was triggered by the tpr.isHit remote reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem The Vigilant Guardian item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'tpr.isHit' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reaction effect
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isHit post macro of the Vigilant Guardian item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, the target is changed to the owner of the Vigilant Guardian.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is hit.
   * @param {Item5e} sourceItem - The Vigilant Guardian item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsHitPost(
    currentWorkflow,
    targetToken,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', {
        thirdPartyReactionResult,
      });
    }
    if (thirdPartyReactionResult?.uuid !== sourceItem.uuid) {
      return;
    }

    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`,
        { sourceActor, targetToken }
      );
      return;
    }

    const sourceToken = MidiQOL.tokenForActor(sourceActor);
    if (!sourceToken) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No source token could be found.`);
      }
      return;
    }

    // Change target
    currentWorkflow.targets.delete(targetToken);
    currentWorkflow.targets.add(sourceToken);
    if (currentWorkflow.hitTargets.delete(targetToken)) {
      currentWorkflow.hitTargets.add(sourceToken);
    }
    if (currentWorkflow.hitTargetsEC.delete(targetToken)) {
      currentWorkflow.hitTargetsEC.add(sourceToken);
    }

    const previousIsCritical = currentWorkflow.isCritical;

    const configSettings = MidiQOL.configSettings();

    // Reprocess critical flags for new target
    currentWorkflow.processCriticalFlags();

    // Keep previous data because displayTargets clear the current data
    const previousHitData =
      currentWorkflow.hitDisplayData[targetToken.document.uuid] ?? {};

    // Display new target
    await currentWorkflow.displayTargets(currentWorkflow.whisperAttackCard);

    // Set hitDisplay that was cleared by displayTargets
    if (currentWorkflow.hitDisplayData[sourceToken.document.uuid]) {
      const hitDisplay =
        currentWorkflow.hitDisplayData[sourceToken.document.uuid];
      hitDisplay.hitStyle = previousHitData.hitStyle;
      hitDisplay.hitSymbol = previousHitData.hitSymbol;
      hitDisplay.hitClass = previousHitData.hitClass;
      hitDisplay.attackType = previousHitData.attackType;
      hitDisplay.ac = Number.parseInt(
        sourceActor.system.attributes?.ac?.value ?? 10
      );
      hitDisplay.bonusAC = 0;
      hitDisplay.attackTotal = currentWorkflow.attackTotal;

      // We just display hits or criticals because the previous numeric values are not relevant anymore
      if (
        game.user?.isGM &&
        ['hitDamage', 'all'].includes(configSettings.hideRollDetails)
      ) {
        hitDisplay.hitSymbol = 'fa-tick';
      } else if (currentWorkflow.isCritical) {
        hitDisplay.hitSymbol = 'fa-check-double';
      } else {
        hitDisplay.hitSymbol = 'fa-check';
      }
      if (currentWorkflow.isCritical) {
        hitDisplay.hitString = game.i18n.localize('midi-qol.criticals');
        hitDisplay.hitResultNumeric = '++';
      } else {
        hitDisplay.hitString = game.i18n.localize('midi-qol.hits');
        hitDisplay.hitResultNumeric = `${hitDisplay.attackTotal}/${
          hitDisplay.attackTotal - hitDisplay.ac
        }`;
      }
    }
    // If the critical flag changed, redisplay attack roll
    if (previousIsCritical !== currentWorkflow.isCritical) {
      await currentWorkflow.displayAttackRoll(configSettings.mergeCard);
    }
    // Redisplay hits with the new data
    await currentWorkflow.displayHits(
      currentWorkflow.whisperAttackCard,
      configSettings.mergeCard
    );

    // Swap places
    const targetPos = { x: targetToken.document.x, y: targetToken.document.y };
    const sourcePos = { x: sourceToken.document.x, y: sourceToken.document.y };
    await MidiQOL.moveToken(sourceToken, targetPos, false);
    await MidiQOL.moveToken(targetToken, sourcePos, false);

    // Update current target selection
    const targetIds = currentWorkflow.targets.map((t) => t.id);
    game.user?.updateTokenTargets(targetIds);
    game.user?.broadcastActivity({ targets: targetIds });

    // Add info about target switch
    const targetDivs = elwinHelpers.getTargetDivs(
      targetToken,
      'The hit target <strong>${tokenName}</strong>'
    );
    const newTargetDivs = elwinHelpers.getTargetDivs(
      sourceToken,
      `was switched to <strong>\${tokenName}</strong> by <strong>${sourceItem.name}</strong>.`
    );
    const infoMsg = `${targetDivs}${newTargetDivs}`;
    await elwinHelpers.insertTextIntoMidiItemCard(
      'beforeHitsDisplay',
      currentWorkflow,
      infoMsg
    );
  }
}
