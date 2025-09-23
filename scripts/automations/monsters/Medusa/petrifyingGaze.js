// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Applies the proper AE depending on the save result.
// v1.1.0
// Dependencies:
//  - DAE [off]
//  - Times up
//  - MidiQOL "on use" actor macro [postActiveEffects]
//  - Effect Macro
//
// Usage:
//   2014: This is a passive feature that will triggered at the start of each creature's turn unless they avert their eyes.
//   2024: This feature needs to be used to activate. When activated the proper effects are applied.
//
// Description:
// In the postActiveEffects (OnUse) phase of 'Petrifying Gaze: Resist Effect' activity (in owner's workflow):
//   If the target failed its save by 5 or more and is not already petrified, applies the 'Petrifying Gaze - Petrification' AE
//   and remove any effect named 'Petrifying Gaze - Effect'.
//   Else if the target is not already petrified, applies the 'Petrifying Gaze - Effect' AE, but only if the target has no other effect
//   ending at the same time having an higher or equal potency. Then deletes any other effect ending at the same time having a lower potency.
// When the 'Petrifying Gaze - Effect' AE expires [off]:
//   If AE ended due to expiring or end of turn and current actor is not petrified, calls the 'Petrifiying Gaze: Resist Petrification'
//   activity with the current actor as the target.
// ###################################################################################################

export async function petrifyingGaze({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Petrifying Gaze';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (scope.rolledActivity?.identifier === 'resist-effect') {
      const gazeEffect = scope.rolledActivity?.effects[0]?.effect;
      for (let targetToken of workflow.effectTargets ?? []) {
        if (targetToken.actor?.statuses?.has('petrified')) {
          // Already petrified no need to add 'Petrifying Gaze - Effect' or petrified status
          continue;
        }
        if (elwinHelpers.getRules(scope.rolledItem) === 'legacy' && failedSavedBy5(workflow, targetToken)) {
          const effectData = (await ActiveEffect.implementation.fromStatusEffect('petrified')).toObject();
          effectData.origin = scope.macroItem.uuid;
          await MidiQOL.createEffects({
            actorUuid: targetToken.actor.uuid,
            effects: [effectData],
            options: { keepId: true },
          });
          // Remove all effect having the same name (does not need to have same origin)
          for (let effect of targetToken.actor.effects?.filter((ae) => ae.name === gazeEffect?.name) ?? []) {
            await effect.delete();
          }
        } else {
          if (!alreadyHasEffectWithHigherPotency(workflow, targetToken)) {
            const effectData = gazeEffect.toObject();
            effectData.origin = gazeEffect.uuid;
            foundry.utils.setProperty(effectData, 'flags.dae.dontApply', false);
            if (!targetToken.inCombat && effectData.duration) {
              effectData.duration.seconds =
                CONFIG.time.roundTime * effectData.duration.rounds + CONFIG.time.turnTime * effectData.duration.turns;
            }
            await MidiQOL.createEffects({
              actorUuid: targetToken.actor.uuid,
              effects: [effectData],
            });
          }
          // Remove all effect having the lower potency
          for (let effect of getEffectsWithLowerPotency(workflow, targetToken)) {
            await effect.delete();
          }
        }
      }
    } else if (scope.rolledActivity?.identifier === 'resist-petrification') {
      for (let targetToken of workflow.effectTargets ?? []) {
        const gazeEffectActivity = scope.macroItem.system.activities?.find((a) => a.identifier === 'resist-effect');
        if (!gazeEffectActivity) {
          return;
        }
        // Remove all effect having the same name (does not need to have same origin)
        const origin = gazeEffectActivity.effects[0]?.effect;
        for (let effect of targetToken.actor?.effects?.filter((ae) => ae.name === origin?.name) ?? []) {
          await effect.delete();
        }
      }
    }
  } else if (args[0] === 'off') {
    if (
      !['times-up:expired', 'times-up:turnEnd'].includes(foundry.utils.getProperty(scope.lastArgValue, 'expiry-reason'))
    ) {
      // Only activate saving throw when effect expires normally
      return;
    }
    if (token.actor?.statuses?.has('petrified')) {
      // Actor already petrified, no need to save
      return;
    }

    const gazeEffectActivity = scope.macroItem.system.activities?.find((a) => a.identifier === 'resist-petrification');
    if (!gazeEffectActivity) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Missing Resist Petrification activity.`, { item: scope.macroItem });
      }
      return;
    }
    const sourceActor = gazeEffectActivity.item.actor;
    let player = MidiQOL.playerForActor(sourceActor);
    if (!player?.active) {
      // Find first active GM player
      player = game.users?.activeGM;
    }
    if (!player) {
      console.error(`${DEFAULT_ITEM_NAME} | Could not find player for actor ${sourceActor}`);
      return;
    }

    const usage = {
      midiOptions: {
        targetUuids: [token.document?.uuid],
        workflowOptions: { targetConfirmation: 'none' },
      },
    };

    const data = {
      activityUuid: gazeEffectActivity.uuid,
      actorUuid: sourceActor.uuid,
      usage,
    };

    await MidiQOL.socket().executeAsUser('completeActivityUse', player.id, data);
  }

  /**
   * Returns true if the at least one target failed its save by 5 or more.
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target for which to validate save.
   * @returns {boolean} true if save failed by 5 or more.
   */
  function failedSavedBy5(currentWorkflow, targetToken) {
    const total = currentWorkflow.tokenSaves[targetToken.document?.uuid]?.total ?? -1;
    return total < (currentWorkflow.saveDC ?? 14) - 5;
  }

  /**
   * Returns true if an existing effect has an higher potency.
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target for which to validate effects.
   * @returns {boolean} true if a gaze effect having an higher or equal potency than the one to be applied exists.
   */
  function alreadyHasEffectWithHigherPotency(currentWorkflow, targetToken) {
    // Find existing effects ending at same time or starting at same time having higher or equal potency than the current one.
    const gazePotency = currentWorkflow.saveDC;
    return getExistingEffectsWithPotency(currentWorkflow, targetToken).some((data) => data.gazePotency >= gazePotency);
  }

  /**
   * Returns existing effects having a lower potency.
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target for which to fetch effects.
   * @returns {ActiveEffect[]} existing active effects having a lower potency than the one to be applied.
   */
  function getEffectsWithLowerPotency(currentWorkflow, targetToken) {
    // Find existing effects ending at same time or starting at same time having a lower potency than the current one.
    const gazePotency = currentWorkflow.saveDC;
    return getExistingEffectsWithPotency(currentWorkflow, targetToken)
      .filter((data) => data.gazePotency < gazePotency)
      .map((data) => data.effect);
  }

  /**
   * Returns the effects and their potency having the same name and ending at the same on the specified target.
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target for which to fetch effects.
   * @returns {{effect: ActiveEffect, potency: number}[]} List of effect and potency of similar effects ending at the same time.
   */
  function getExistingEffectsWithPotency(currentWorkflow, targetToken) {
    const effectName = currentWorkflow.activity?.effects[0]?.effect?.name;
    if (!effectName) {
      // Could not determine effect name, cannot validate existing effects
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Could not determine current activity associated effect name.`, {
          currentWorkflow,
        });
      }
      return [];
    }
    const currentTurn = game.combat?.current;
    let anyExisting = false;
    if (!currentTurn) {
      // No current combat, allow any existing effects
      anyExisting = true;
    }
    const targetTurn = currentTurn && game.combat?.turns?.findIndex((t) => t.tokenId === targetToken.id);
    if (!targetTurn) {
      // Target not in combat, allow any existing effects
      anyExisting = true;
    }

    // Find existing effects ending at same time or starting at same time with their potency.
    return targetToken.actor?.effects
      ?.filter(
        (ae) =>
          ae.name === effectName &&
          (anyExisting ||
            targetTurn !== currentTurn?.turn ||
            (ae.duration?.startRound === currentTurn?.round && ae.duration?.startTurn === currentTurn?.turn))
      )
      .map((ae) => {
        return { effect: ae, gazePotency: getGazePotency(ae) };
      });
  }

  /**
   * Finds the potency of the specified gaze effect.
   * @param {ActiveEffect} effect - The active effect for which to find its potency.
   * @returns {number} the effect's potency or -1 if not found.
   */
  function getGazePotency(effect) {
    const origin = fromUuidSync(effect.origin);
    if (!(origin instanceof ActiveEffect)) {
      console.warn(`${DEFAULT_ITEM_NAME} | Missing or wrong effect origin.`, { effect });
      return -1;
    }
    return (
      origin.parent?.system?.activities?.find((a) => a.effects.some((e) => e.effect.uuid === effect.origin)).save?.dc
        ?.value ?? -1
    );
  }
}
