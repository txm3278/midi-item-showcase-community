// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an AC bonus when the owner is attacked by a ranged attack and triggers a reaction to change the
// target to the owner of the shield when an other target is attacked.
// v2.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [isAttacked][preTargeting]
//  - Active Auras
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Equipement Type: Shield
//   - Attunement: Attunement Required
//   - Proficiency: Automatic
//   - Activation cost: 1 Reaction Manual
//   - Target: 1 Creature
//   - Range: 5 Feet
//   - Action Type: Other
//   - Damage formula: (empty)
//   - Chat Message Flavor: You become the target of the ranged attack instead.
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of the item.
// One effect must also be added:
//   - Arrow-Catching Shield - Aura:
//      - Transfer to actor on item equip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,isAttacked
//      - Auras:
//        - Effect is Aura: checked
//        - Aura Targets: Allies (RAW it's All, but use Allies to trigger reaction only on allies)
//        - Aura radius: 5
//        - Ignore self? (unchecked)
//        - Check Token Height: (checked)
//        - Walls Block this Aura?: Yes
//
// Usage:
// This item has a passive effect (when equipped and attuned) to handle bonus AC on ranged attacks
// on owner of shield and to handle the reaction when it's not the owner of the shield that is attacked.
//
// Description:
// In the isAttacked (TargetOnUse) phase (in attacker's workflow) (on owner or other target):
//   Verifies if the attack is a ranged attack (melee weapons with the thrown property are supported).
//   If its a ranged attack and the target is the owner of the shield, an AE that adds an AC bonus is
//   added on the owner for a duration of "isAttacked".
//   If its a ranged attack and the target is not the owner of the shield, a manual reaction is triggered on
//   the owner of the shield. If the owner activated the reaction, the current workflow target is switched to
//   to the owner of the shield, midi will then call the isAttacked event again on the new target.
// In the preTargeting (item OnUse) phase of the shield (in owner's workflow):
//   Validates that reaction was triggered by the isAttacked on other target, if not,
//   it cancels the reaction.
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
    return handleArrowCatchingShieldOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'isAttacked'
  ) {
    if (!token) {
      // No target
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No target token.`);
      }
      return;
    }
    if (
      !elwinHelpers.isRangedAttack(scope.rolledItem, workflow.token, options.token)
    ) {
      // Not a ranged attack
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a ranged attack.`);
      }
      return;
    }
    if (options.actor?.uuid === scope.macroItem?.actor.uuid) {
      // Owner of shield
      // create an active effect on target to give bonus AC
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

        origin: scope.macroItem.uuid, //flag the effect as associated to the source item used
        icon: scope.macroItem.img,
        name: `${scope.macroItem.name} - Bonus AC`,
      };
      targetEffectData.duration = workflow.inCombat ? { turns: 1 } : {};
      setProperty(targetEffectData, 'flags.dae.specialDuration', [
        'isAttacked',
      ]);

      await MidiQOL.socket().executeAsGM('createEffects', {
        actorUuid: options.actor.uuid,
        effects: [targetEffectData],
      });
    } else {
      // Other target, handle reaction
      await handleArrowCatchingShieldOnTargetUseIsAttacked(
        workflow,
        token,
        scope.macroItem
      );
    }
  }

  /**
   * Handles the preTargeting phase of the Arrow-Catching Shield item midi-qol workflow.
   * Validates that the reaction was triggered by the isAttacked phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Item5e} sourceItem The Arrow-Catching Shield item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleArrowCatchingShieldOnUsePreTargeting(
    currentWorkflow,
    sourceItem
  ) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !== 'isAttacked' ||
      currentWorkflow.options?.thirdPartyReaction?.itemUuid !== sourceItem.uuid
    ) {
      // Reaction should only be triggered by aura
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the owner is targeted by a ranged attack.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the isAttacked of the Arrow-Catching Shield item midi-qol workflow.
   * The target is changed to the owner of the shield if the shield's reaction is used.
   *
   * @param {MidiQOL.Workflow} currentWorkflow midi-qol current workflow.
   * @param {Token5e} targetToken The target token that is attacked.
   * @param {Item5e} sourceItem The Arrow-Catching Shield item.
   */
  async function handleArrowCatchingShieldOnTargetUseIsAttacked(
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

    const result = await elwinHelpers.doThirdPartyReaction(
      currentWorkflow.item,
      targetToken,
      sourceItem,
      'isAttacked',
      {
        debug,
        showReactionAttackRoll: false,
      }
    );

    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', { result });
    }
    if (result?.uuid === sourceItem.uuid) {
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
  }
}
