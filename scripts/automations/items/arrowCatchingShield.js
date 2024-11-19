// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an AC bonus when the owner is attacked by a ranged attack and triggers a reaction to change the
// target to the owner of the shield when an other target is attacked.
// v3.2.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting][isAttacked][tpr.isTargeted]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Equipement Type: Shield
//   - Attunement: Attunement Required
//   - Proficiency: Automatic
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction only on allies)
//   - Range: 5 Feet
//   - Action Type: Other
//   - Damage formula: (empty)
//   - Chat Message Flavor: You become the target of the ranged attack instead.
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isTargeted" && tpr?.isRangedAttack
//   - This item macro code must be added to the DIME code of the item.
// One effect must also be added:
//   - Arrow-Catching Shield:
//      - Transfer to actor on item equip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,isAttacked
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isTargeted|ignoreSelf=true;post=true
//
// Usage:
// This item has a passive effect (when equipped and attuned) to handle bonus AC on ranged attacks
// on owner of shield and to handle the reaction when it's not the owner of the shield that is targeted.
//
// Description:
// In the preTargeting (item OnUse) phase of the item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isPreAttacked target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isTargeted (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the owner activated the reaction, the current workflow target is switched to
//   to the owner of the shield, midi will then call the isAttacked later on the new target.
// In the isAttacked (TargetOnUse) trigger (in attacker's workflow) (on owner):
//   Verifies if the attack is a ranged attack (melee weapons with the thrown property are supported).
//   If its a ranged attack and the target is the owner of the shield, an AE that adds an AC bonus is
//   added on the owner for a duration of "isAttacked".
// ###################################################################################################

export async function arrowCatchingShield({
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
  const DEFAULT_ITEM_NAME = 'Arrow-Catching Shield';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.7'
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
    args[0].macroPass === 'tpr.isTargeted.post'
  ) {
    // Other target, handle reaction
    await handleTargetOnUseIsTargetedPost(
      workflow,
      token,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'isAttacked'
  ) {
    await handleTargetOnUseIsAttacked(workflow, token, scope.macroItem);
  }

  /**
   * Handles the preTargeting phase of the Arrow-Catching Shield item midi-qol workflow.
   * Validates that the reaction was triggered by the tpr.isTargeted target on use.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Arrow-Catching Shield item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'tpr.isTargeted' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the owner is targeted by a ranged attack.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isTargeted post macro of the Arrow-Catching Shield item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, the target is changed to the owner of the shield.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is attacked.
   * @param {Item5e} sourceItem - The Arrow-Catching Shield item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsTargetedPost(
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
    const targetIds = currentWorkflow.targets.map((t) => t.id);
    game.user?.updateTokenTargets(targetIds);
    game.user?.broadcastActivity({ targets: targetIds });

    // Add info about target switch
    const targetDivs = elwinHelpers.getTargetDivs(
      targetToken,
      'The target <strong>${tokenName}</strong>'
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

  /**
   * Handles the isAttacked target on use of the Arrow-Catching Shield item.
   * Validates that the attack is a ranged attack on the onwer and if its the case
   * adds an AE to give an AC bonus to the onwer.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is attacked.
   * @param {Item5e} sourceItem - The Arrow-Catching Shield item.
   */
  async function handleTargetOnUseIsAttacked(
    currentWorkflow,
    targetToken,
    sourceItem
  ) {
    if (!targetToken || !targetToken?.actor) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token or actor.`);
      }
      return;
    }
    if (
      !elwinHelpers.isRangedAttack(
        currentWorkflow.item,
        currentWorkflow.token,
        targetToken
      )
    ) {
      // Not a ranged attack
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a ranged attack.`);
      }
      return;
    }
    // Owner of shield
    // create an active effect on target to give bonus AC
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const targetEffectData = {
      changes: [
        // flag for AC bonus
        {
          key: 'system.attributes.ac.bonus',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '+2',
          priority: 20,
        },
      ],

      origin: sourceItem.uuid, //flag the effect as associated to the source item used
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - Bonus AC`,
    };
    targetEffectData.duration = currentWorkflow.inCombat ? { turns: 1 } : {};
    foundry.utils.setProperty(targetEffectData, 'flags.dae.specialDuration', [
      'isAttacked',
    ]);

    await MidiQOL.socket().executeAsGM('createEffects', {
      actorUuid: targetToken.actor.uuid,
      effects: [targetEffectData],
    });
  }
}
