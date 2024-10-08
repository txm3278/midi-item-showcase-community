// ##################################################################################################
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Bard
// when an ally or himself forces a creature to roll a saving throw. When doing so, the saving
// throw ability is changed to Charisma and if the target fails its save it takes extra damage.
// v1.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE, macro [off]
//  - Times Up
//  - MidiQOL "on use" item macro,[preTargeting][preActiveEffects]
//  - Elwin Helpers world script
//
// How to configure:
// The item details must be:
//   - Feature Type: Class Feature
//   - Activation cost: 0 Reaction
//   - Target: 1 Ally
//   - Limited Uses: 1 of 1 per Short Rest
//   - Resource Consumption: 1 | Bardic Inspiration | Item Uses (to be set when added to an actor)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved (*)
//   - No Full cover: (checked)
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isPreCheckSave" && tpr?.item.uses?.value && workflow.saveItem?.system.actionType === "save"
//       && !workflow.saveItem?.getFlag("midi-qol", "overTimeSkillRoll")
//   - This item macro code must be added to the DIME code of the feature.
// Two effects must also be added:
//   - Sorrowful Fate
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isPreCheckSave|triggerSource=attacker;canSee=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Note: A scale dice value must be configured on the 'Bard' class,
//       its data value should resolve to '@scale.bard.bardic-inspiration'.
//
// Description:
// In the preTargeting (item OnUse) phase of the Sorrowful Fate item (in owner's workflow):
//   Validates that item was triggered manually or by the remote tpr.isPreCheckSave target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isPreCheckSave (TargetOnUse) post macro (in attacker's workflow) (on target):
//   If the reaction was used and completed successfully, changes the save item ability to Charisma
//   and registers a hook to damage the target if the target failed its save after the current workflow has completed.
// In the midi-qol.RollComplete hook (in attacker's workflow):
//   If the target failed its save, inflict it extra damage using a synthetic item executed on the
//   feat onwer's client.
// If the Sorrowful Fate AE on the target expires [off]:
//   If the expiry reason is because the target reached 0 HP, a chat message is created to remind the
//   target to die in a dramatic way.
// ###################################################################################################

export async function sorrowfulFate({
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
  const DEFAULT_ITEM_NAME = 'Sorrowful Fate';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.2.4'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
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
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'preActiveEffects'
  ) {
    // Validates that the item is the synthetic feat
    if (scope.rolledItem.getFlag(MODULE_ID, 'sorrowfulFateDamage')) {
      return await handleOnUsePreActiveEffects(workflow, scope.macroItem);
    }
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isPreCheckSave.post'
  ) {
    handleTargetOnUseIsPreCheckSavePost(
      workflow,
      scope.macroItem,
      token,
      options?.thirdPartyReactionResult
    );
  } else if (args[0] === 'off') {
    if (
      foundry.utils.getProperty(scope.lastArgValue, 'expiry-reason') !==
      'midi-qol:zeroHP'
    ) {
      // Not expired due to zero HP
      return;
    }
    // Output a chat message to remind actor of making a scene while dying
    const player = MidiQOL.playerForActor(actor);
    const tokenName =
      (MidiQOL.configSettings().useTokenNames ? token.name : actor.name) ??
      '<unknown>';
    await ChatMessage.create({
      type:
        game.release.generation >= 12
          ? CONST.CHAT_MESSAGE_STYLES.OTHER
          : CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: `${tokenName} is magically compelled to utter darkly poetic final words before succumbing from their injuries`,
      speaker: { user: game.users.activeGM },
      whisper: player ? [player.id] : [],
    });
  }

  /**
   * Handles the preTargeting phase of the Sorrowful Fate item midi-qol workflow.
   * Validates that the reaction was triggered by the isPreCheckSave phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - midi-qol current workflow.
   * @param {Item5E} sourceItem - The Sorrowful Fate item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'tpr.isPreCheckSave' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature forces another creature to make a saving throw.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the preActiveEffects phase of the 'Sorrowful Fate - Damage' item midi-qol workflow.
   * Disables the application of AE on target when it already has 0 HP.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The 'Sorrowful Fate' item.
   * @return {{haltEffectsApplication: true}|undefined} If target has 0 HP returns an object to stop midi from applying the AE,
   *                                                    otherwise undefined.
   */
  async function handleOnUsePreActiveEffects(currentWorkflow, sourceItem) {
    // Do not apply AE on target when it has 0 HP.
    const targetToken = currentWorkflow.targets.first();
    if (!targetToken?.actor?.system?.attributes?.hp?.value) {
      // Output a chat message to remind actor of making a scene while dying
      const player = MidiQOL.playerFor(targetToken);
      const tokenName =
        (MidiQOL.configSettings().useTokenNames
          ? targetToken.name
          : targetToken.actor?.name) ?? '<unknown>';
      await ChatMessage.create({
        type:
          game.release.generation >= 12
            ? CONST.CHAT_MESSAGE_STYLES.OTHER
            : CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: `${tokenName} is magically compelled to utter darkly poetic final words before succumbing from their injuries`,
        speaker: { user: game.users.activeGM },
        whisper: player ? [player.id] : [],
      });
      return { haltEffectsApplication: true };
    }
  }

  /**
   * Handles the tpr.isPreCheckSave post reaction of the Sorrowful Fate item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, changes the current save item ability to Charisma and
   * registers a hook to inflict extra damage on a failed save.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sorrowful Fate item.
   * @param {Token5e} target - The target.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  function handleTargetOnUseIsPreCheckSavePost(
    currentWorkflow,
    sourceItem,
    target,
    thirdPartyReactionResult
  ) {
    if (thirdPartyReactionResult?.uuid !== sourceItem.uuid) {
      return;
    }
    if (
      !currentWorkflow.item.hasSave ||
      !currentWorkflow.item.system?.save?.ability
    ) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Item does not have a save or a save ability.`,
          currentWorkflow.item
        );
      }
      return;
    }
    // Change save ability to Charisma
    currentWorkflow.item = currentWorkflow.item.clone(
      { 'system.save.ability': 'cha' },
      { keepId: true }
    );

    // Register hook to call extra damage after roll is complete if the save was failed
    Hooks.once(
      `midi-qol.RollComplete.${currentWorkflow.itemUuid}`,
      async (currentWorkflow2) => {
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            'midi-qol.RollComplete',
            `${sourceItem.name} - Damage`,
            currentWorkflow,
            currentWorkflow2,
            debug
          )
        ) {
          return;
        }
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | midi-qol.RollComplete.`, {
            currentWorkflow,
          });
        }
        if (!currentWorkflow.failedSaves?.has(target)) {
          if (debug) {
            console.warn(
              `${DEFAULT_ITEM_NAME} | The target succeeded on its saving throw, no extra damage.`,
              {
                currentWorkflow,
                target,
              }
            );
          }
          return;
        }

        const sourceActor = sourceItem.actor;
        const featData = getFeatData(currentWorkflow, sourceItem);

        const feat = new CONFIG.Item.documentClass(featData, {
          parent: sourceActor,
          temporary: true,
        });

        const options = {
          targetUuids: [target.document.uuid],
          configureDialog: false,
          workflowOptions: { targetConfirmation: 'none' },
        };

        const data = {
          itemData: feat.toObject(),
          actorUuid: sourceActor.uuid,
          targetUuids: options.targetUuids,
          options,
        };

        let player = MidiQOL.playerForActor(sourceActor);
        if (!player?.active) {
          // Find first active GM player
          player = game.users?.activeGM;
        }
        if (!player?.active) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | No active player or GM for actor.`,
            sourceActor
          );
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

  /**
   * Returns the feat data for for the extra damage on a failed save.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sorrowful Fate item.
   *
   * @returns {object} The feat data for the extra damage on a failed save.
   */
  function getFeatData(currentWorkflow, sourceItem) {
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const featData = {
      type: 'feat',
      name: `${sourceItem.name} - Damage`,
      img: sourceItem.img,
      system: {
        actionType: 'other',
        damage: { parts: [['@scale.bard.bardic-inspiration', 'psychic']] },
        target: { type: 'creature', value: 1 },
      },
      effects: [
        {
          changes: [
            // flag to handle the off callback
            {
              key: 'macro.itemMacro',
              mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
              value: sourceItem.uuid,
              priority: 20,
            },
          ],
          origin: sourceItem.uuid, //flag the effect as associated to the source item used
          [imgPropName]: sourceItem.img,
          name: `${sourceItem.name}`,
          transfer: false,
          duration: currentWorkflow.inCombat
            ? { rounds: 60 / (CONFIG.time.roundTime ?? 6) }
            : { seconds: 60 },
          flags: {
            dae: { specialDuration: ['zeroHP'] },
          },
        },
      ],
      flags: {
        'midi-qol': {
          onUseMacroName: `[preActiveEffects]ItemMacro.${sourceItem.uuid}`,
        },
        [MODULE_ID]: { sorrowfulFateDamage: true },
      },
    };
    return featData;
  }
}
