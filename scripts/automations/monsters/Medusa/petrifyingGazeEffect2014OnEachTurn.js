// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Triggers at the start of each creature's turn to ask if they avert their eyes or they will need to resist the Petrifying Gaze.
// v1.0.0
// Dependencies:
//  - DAE
//  - Times up
//  - MidiQOL
//  - Effect Macro
//
// Usage:
// This effect triggers at the start of each creature's turn.
//
// Description:
//  Validates the required conditions enabling the Petrifying Gaze.
//  If the effect applies, validates if the targeted actor wants to avert its eyes for the round.
//  Avert eyes:
//    Applies an Avert Eyes AE o the actor.
//  Do not avert eyes:
//    Calls the 'Petrifiying Gaze: Resist Effect' activity with the current actor as the target.
// ###################################################################################################

export async function petrifyingGazeEffect2014OnEachTurn(
  token,
  character,
  actor,
  speaker,
  scene,
  origin,
  effect,
  item
) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Petrifying Gaze - EM';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  const dependencies = ['dae', 'times-up', 'midi-qol', 'effectmacro'];
  if (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  /**
   * If the requirements are met, returns true, false otherwise.
   *
   * @param {string} name - The name of the item for which to check the dependencies.
   * @param {string[]} dependencies - The array of module ids which are required.
   *
   * @returns {boolean} true if the requirements are met, false otherwise.
   */
  function requirementsSatisfied(name, dependencies) {
    let missingDep = false;
    dependencies.forEach((dep) => {
      if (!game.modules.get(dep)?.active) {
        const errorMsg = `${name} | ${dep} must be installed and active.`;
        ui.notifications.error(errorMsg);
        console.warn(errorMsg);
        missingDep = true;
      }
    });
    return !missingDep;
  }

  if (debug) {
    console.warn(DEFAULT_ITEM_NAME, arguments);
  }

  if (!actor || game.combat?.combatant?.actor?.uuid === actor?.uuid) {
    // Skip turn of owner of effect or no actor
    return;
  }
  if (actor.statuses?.has('incapacitated')) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Source of gaze is incapacitated.`, { sourceActor: actor });
    }
    return;
  }

  const targetToken = game.combat?.combatant?.token.object;
  if (!targetToken) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Missing target token (current combatant).`);
    }
    return;
  }
  if (targetToken.actor?.statuses?.intersects(new Set(['dead', 'unconscious']))) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Target cannot see the source of gaze.`, { targetToken, sourceToken: token });
    }
    return;
  }

  if (!MidiQOL.canSee(targetToken, token)) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Target cannot see the source of gaze.`, { targetToken, sourceToken: token });
    }
    return;
  }
  if (!MidiQOL.canSee(token, targetToken)) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Source of gaze cannot see the target.`, { sourceToken: token, targetToken });
    }
    return;
  }

  if (item?.identifier !== 'petrifying-gaze') {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Missing item.`, { effect });
    }
    return;
  }
  const gazeEffectActivity = item.system?.activities.find((a) => a.identifier === 'resist-effect');
  if (!gazeEffectActivity) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Missing Resist Effect activity.`, { item });
    }
    return;
  }

  if (!MidiQOL.checkDistance(token, targetToken, gazeEffectActivity.range?.value ?? 30)) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Target is too far.`, { targetToken, sourceToken: token });
    }
    return;
  }

  // Check if target wants to avert eyes.
  if (!targetToken.actor?.statuses?.has('surprised')) {
    const sourceName = MidiQOL.getTokenPlayerName(token, true);
    const avertEyes = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${item.name} - ${targetToken.actor.name} - Avert Eyes` },
      content: `<p>Avert your eyes from ${sourceName}?</p>`,
      defaultYes: true,
      modal: true,
      rejectClose: false,
    });
    if (avertEyes) {
      const targetEffectData = {
        changes: [
          {
            key: 'flags.midi-qol.disadvantage.attack.all',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
            value: `targetUuid === "${token.document.uuid}"`,
            priority: 20,
          },
          {
            key: 'flags.midi-qol.grants.advantage.attack.all',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
            value: `tokenUuid === "${token.document.uuid}"`,
            priority: 20,
          },
        ],
        transfer: false,
        img: item.img,
        name: `Avert Eyes from ${sourceName}`,
        duration: { rounds: 1 },
        'flags.dae.stackable': 'noneNameOnly',
      };
      await MidiQOL.createEffects({ actorUuid: targetToken.actor?.uuid, effects: [targetEffectData] });
      return;
    }
  }

  let player = MidiQOL.playerForActor(actor);
  if (!player?.active) {
    // Find first active GM player
    player = game.users?.activeGM;
  }
  if (!player) {
    console.error(`${DEFAULT_ITEM_NAME} | Could not find player for actor ${actor}`);
    return;
  }

  const usage = {
    midiOptions: {
      targetUuids: [targetToken.document?.uuid],
      workflowOptions: { targetConfirmation: 'none' },
    },
  };

  const data = {
    activityUuid: gazeEffectActivity.uuid,
    actorUuid: token.actor.uuid,
    usage,
  };

  await MidiQOL.socket().executeAsUser('completeActivityUse', player.id, data);
}
