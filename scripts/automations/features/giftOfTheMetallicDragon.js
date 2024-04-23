// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect aura, that effect will trigger a reaction by the owner of the feat
// when himself or a creature within range is hit to allow him to add an AC bonus that could
// turn th ehit into a miss.
// v2.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [isHit][preTargeting]
//  - Active Auras
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Feat
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
//   - Limited Uses: 1 of @prof per Long Rest
//   - Uses Prompt: checked
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feat.
// Two effects must also be added:
//   - Gift of the Metallic Dragon - Aura:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,isHit
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 5
//        - Check Token Height: (checked)
//        - Walls Block this Aura?: No
//   - Gift of the Metallic Dragon - AC Bonus:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Duration: 1 Turn
//      - Special Duration: Is Attacked
//      - Effects:
//          - system.attributes.ac.bonus | Add | +@prof
//
// Usage:
// This item has a passive effect that adds an active aura effect.
// It is also a manual reaction item that gets triggered by the active aura effect when appropriate.
//
// Description:
// In the isHit phase of a target having the Gift of the Metallic Dragon's Active Aura Effect:
//   Validates that the item was triggered by source actor of the Gift of the Metallic Dragon is not incapacitated,
//   can see the target, has not used its reaction. If the conditions are fulfilled then the
//   Gift of the Metallic Dragon item is triggered as a reaction on the source actor client's.
//   If the reaction was used and completed successfully, the current workflow check hits it re-executed to
//   taken into account the AC bonus and validate if the attack is still a hit.
// In the preTargeting phase of Gift of the Metallic Dragon item:
//   Validates that item was triggered by the remote isHit phase, otherwise the item workflow execution is aborted.
// ###################################################################################################

export async function giftOfTheMetallicDragon({
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
  const DEFAULT_ITEM_NAME = 'Gift of the Metallic Dragon';
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
    return handleGiftOfTheMetallicDragonOnUsePreTargeting(workflow, macroItem);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'isHit') {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    // Other target, handle reaction
    await handleGiftOfTheMetallicDragonAuraOnTargetUseIsHit(
      workflow,
      token,
      macroItem
    );
  }

  /**
   * Handles the preTargeting phase of the Gift of the Metallic Dragon item midi-qol workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Gift of the Metallic Dragon item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleGiftOfTheMetallicDragonOnUsePreTargeting(
    currentWorkflow,
    sourceItem
  ) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'isHit' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature or the owner is hit.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the isHit of the Gift of the Metallic Dragon item midi-qol workflow.
   * Triggers a remote reaction on the item owner's client to add an AC bonus which
   * could convert a hit on the target into a miss.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Token5e} targetToken The target token that is hit.
   * @param {Item5e} sourceItem The Gift of the Metallic Dragon item.
   */
  async function handleGiftOfTheMetallicDragonAuraOnTargetUseIsHit(
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

    const self = sourceToken.document.uuid === targetToken.document.uuid;
    if (!self && !MidiQOL.canSee(sourceToken, targetToken)) {
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
      // Recompute checkHits to take into account the AC bonus
      // TODO remove noOnuseMacro when dnd v2.4.1 support is removed
      currentWorkflow.checkHits({
        noProvokeReaction: true,
        noOnuseMacro: true,
        noOnUseMacro: true,
      });
    }
  }
}
