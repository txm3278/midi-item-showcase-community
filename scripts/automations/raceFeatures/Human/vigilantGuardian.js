// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect aura, that effect will trigger a reaction by the Mark of Sentinel Human
// when a creature within range is hit to allow him to switch places with the target.
// v2.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [isHit][preTargeting]
//  - Active Auras
//  - Helwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Race Feature
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
//   - Range: 5 Feet
//   - Limited Uses: 1 of 1 per Long Rest
//   - Uses Prompt: (checked)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Vigilant Guardian - Aura:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,isHit
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 5
//        - Ignore self? (checked)
//        - Check Token Height: (checked)
//        - Walls Block this Aure?: Yes
//
// Usage:
// This item has a passive effect that adds an active aura effect.
// It is also a manual reaction item that gets triggered by the active aura effect when appropriate.
//
// Description:
// In the isHit phase of a target having the Vigilant Guardian's Active Aura Effect:
//   Validates that the item was triggered by source actor of the Vigilant Guardian is not incapacitated,
//   can see the target and has not used its reaction. If the conditions are fulfilled then the Vigilant Guardian item
//   is triggered as a reaction on the source actor client's.
//   If the reaction was used and completed successfully, the current workflow target is switched to the owner
//   of the Vigilant Guardian item.
// In the preTargeting phase of Vigilant Guardian item:
//   Validates that item was triggered by the remote isHit phase, otherwise the item workflow execution is aborted.
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
  const debug = true;

  if (!isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '2.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol', 'ActiveAuras'];
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
    return handleVigilantGuardianOnUsePreTargeting(workflow, scope.macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'isHit') {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    // Other target, handle reaction
    await handleVigilantGuardianAuraOnTargetUseIsHit(
      workflow,
      token,
      scope.macroItem
    );
  }

  /**
   * Handles the preTargeting phase of the Vigilant Guardian item midi-qol workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Vigilant Guardian item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleVigilantGuardianOnUsePreTargeting(
    currentWorkflow,
    sourceItem
  ) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'isHit' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the isHit of the Vigilant Guardian item midi-qol workflow.
   * The target is changed to the owner of the Vigilant Guardian if the reaction is used.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Token5e} targetToken The target token that is hit.
   * @param {Item5e} sourceItem The Vigilant Guardian item.
   */
  async function handleVigilantGuardianAuraOnTargetUseIsHit(
    currentWorkflow,
    targetToken,
    sourceItem
  ) {
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

    if (!MidiQOL.canSee(sourceToken, targetToken)) {
      // There is no line of sight to the target or the target is not visible
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | There is no line of sight to the target.`
        );
      }
      return;
    }

    const result = await elwinHelpers.doThirdPartyReaction(
      currentWorkflow.item,
      targetToken,
      sourceItem,
      'isHit',
      {
        debug,
        attackRoll: currentWorkflow.attackRoll,
      }
    );

    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { result });
    }
    if (result?.uuid === sourceItem.uuid) {
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
          sourceToken.actor?.system.attributes.ac.value ?? 10
        );
        hitDisplay.bonusAC = 0;
        hitDisplay.showAC = configSettings.displayHitResultNumeric;

        // We just display hits or criticals because the previous numeric values are not relevant anymore
        if (currentWorkflow.isCritical) {
          hitDisplay.hitString = game.i18n.localize('midi-qol.criticals');
          hitDisplay.hitResultNumeric = '++';
        } else {
          hitDisplay.hitString = game.i18n.localize('midi-qol.hits');
          hitDisplay.hitResultNumeric = `${currentWorkflow.attackTotal}/${
            currentWorkflow.attackTotal - hitDisplay.ac
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
      const targetPos = {
        x: targetToken.document.x,
        y: targetToken.document.y,
      };
      const sourcePos = {
        x: sourceToken.document.x,
        y: sourceToken.document.y,
      };
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
        workflow,
        infoMsg
      );
    }
  }
}
