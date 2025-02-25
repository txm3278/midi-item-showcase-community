// ##################################################################################################
// Read First!!!!
// Handles the ability to toggle on/off or prompt the -5 penalty to hit and +10 bonus to the damage on a ranged weapon.
// v3.0.1
// Author: Elwin#1410 based on MotoMoto and Michael version
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [preItemRoll],[preAttackRoll],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is a feat that can be toggled on or off, when the midi property "Toggle effect" is checked, when unchecked, a dialog to activate the feature
// will be prompted on attacks that meet the requirements. If the attack is from a ranged weapon for which the attacker is proficient
// and toggled on or the prompt to activate was accepted, an effect to give -5 penalty to hit and a +10 bonus to damage is granted for this attack.
//
// Description:
// In the preItemRoll (OnUse) phase (on any owner's item):
//   If the midi toggle effect property is checked:
//     If the used item is this feat, toggle the effect, else set to prompt to not activate on attack.
//   Else:
//     Set to prompt to activate on attack.
// In the preAttackRoll (OnUse) phase (on any owner's item):
//   Validates that the item is a ranged weapon and the actor is proficient with it.
//   If the feat "Toggle effect" is unchecked a dialog is prompted to activate the feat on this attack.
//   If the feat is toggled on or the activation has been accepted, it adds an AE to give -5 penaly to ranged weapon attack and
//   +10 bonus to damage from a ranged weapon attack.
//   This AE only last for one attack.
// In the postActiveEffects (OnUse) phase (on Sharpshooter Toggle activity):
//   Sets the state to the next state on->off, off->on, and adds or deletes the toggled on AE if the new state is toggled on or toggled off.
// ###################################################################################################

export async function sharpshooter({
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
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Sharpshooter';
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;
  const OFF_STATE = 0;
  const ON_STATE = 1;
  const PROMPT_STATE = 2;
  const STATES = new Map([
    [ON_STATE, OFF_STATE],
    [OFF_STATE, ON_STATE],
    [PROMPT_STATE, ON_STATE],
  ]);

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '3.1'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    return await handleOnUsePreItemRoll(workflow, scope.macroItem, actor);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll') {
    await handleOnUsePreAttackRoll(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    if (isToggleActivity(workflow, scope.macroItem)) {
      await handleOnUsePostActiveEffectsToggle(scope.macroItem, actor);
    }
  }

  /**
   * Adjust the behavior of Sharpshooter feat depending on the value of the midi toggle effect property.
   * If the midi toggle effect property is checked:
   *   If the activity used is not this feat's Toggle activity and the state was set to prompt: set the state to toggle off.
   * Else:
   *   Set prompt to activate on attack.
   *   Delete the toggled on effect.
   *   If the activity used is this feat's Toggle activity: block this activity's workflow and prompts a warning.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sharpshooter item.
   * @param {Actor5e} sourceActor - The owner of the Sharpshooter item.
   *
   * @returns true if the activity workflow can continue, false otherwise.
   */
  async function handleOnUsePreItemRoll(
    currentWorkflow,
    sourceItem,
    sourceActor
  ) {
    const toggleEffect = foundry.utils.getProperty(
      sourceItem,
      'flags.midiProperties.toggleEffect'
    );
    if (toggleEffect) {
      const sharpshooterState =
        sourceItem.getFlag(MODULE_ID, 'sharpshooterState') ?? OFF_STATE;
      if (currentWorkflow.itemUuid !== sourceItem.uuid) {
        // Reset state to toggle off if prompt
        if (sharpshooterState === PROMPT_STATE) {
          await sourceItem.setFlag(MODULE_ID, 'sharpshooterState', OFF_STATE);
        }
      }
    } else {
      await sourceItem.setFlag(MODULE_ID, 'sharpshooterState', PROMPT_STATE);
      await sourceActor.effects
        .find((ae) => ae.getFlag(MODULE_ID, 'sharpshooterToggledOn'))
        ?.delete();
      if (isToggleActivity(currentWorkflow, sourceItem)) {
        const msg = `${sourceItem.name} | The ${
          currentWorkflow.activity.name ?? 'Toggle'
        } activity can only be triggered when the item Midi property 'Toggle effect' is checked.`;
        ui.notifications.warn(msg);
        return false;
      }
    }
    return true;
  }

  /**
   * When the attack is made with a ranged weapon and the actor is proficient with it,
   * if in prompt mode ask if the bonus/malus should be added before adding an AE, otherwise if toggled on adds an AE for the bonus/malus.
   * This AE only last for one attack.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sharpshooter item.
   */
  async function handleOnUsePreAttackRoll(currentWorkflow, sourceItem) {
    const usedItem = currentWorkflow.item;
    if (
      !elwinHelpers.isRangedWeapon(usedItem) ||
      !usedItem?.system?.prof?.hasProficiency
    ) {
      // Only works on proficient ranged weapons
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a ranged weapon.`);
      }
      return;
    }
    if (
      !elwinHelpers.isRangedWeaponAttack(
        currentWorkflow.activity,
        currentWorkflow.token,
        currentWorkflow.targets.first()
      )
    ) {
      // Only works on ranged weapon attacks
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a ranged weapon attack.`);
      }
      return;
    }

    const sharpshooterState = sourceItem.getFlag(
      MODULE_ID,
      'sharpshooterState'
    );
    if (sharpshooterState === OFF_STATE) {
      return;
    } else if (sharpshooterState === PROMPT_STATE) {
      const activate = await Dialog.confirm({
        title: `${sourceItem.name} - Activation`,
        content: `<p>Use ${sourceItem.name}? (-5 to attack, +10 to damage)</p>`,
        rejectClode: false,
        options: { classes: ['dialog', 'dnd5e'] },
      });
      if (!activate) {
        return;
      }
    }

    // Add an AE for -5 to hit +10 dmg
    await addMalusBonusActiveEffect(sourceItem);
  }

  /**
   * Sets the state to the next state on->off, off->on, and adds or deletes the toggled on AE if the new state is toggled on or toggled off.
   *
   * @param {Item5e} sourceItem - The Sharpshooter item.
   * @param {Actor5e} sourceActor - The owner of the Sharpshooter item.
   */
  async function handleOnUsePostActiveEffectsToggle(sourceItem, sourceActor) {
    const sharpshooterState =
      sourceItem.getFlag(MODULE_ID, 'sharpshooterState') ?? OFF_STATE;
    await sourceItem.setFlag(
      MODULE_ID,
      'sharpshooterState',
      STATES.get(sharpshooterState)
    );

    const bonusMalusEffect = sourceActor.effects.find((ae) =>
      ae.getFlag(MODULE_ID, 'sharpshooterToggledOn')
    );
    if (STATES.get(sharpshooterState) === ON_STATE) {
      // Add AE for toggle mode on
      if (!bonusMalusEffect) {
        await addToggledOnEffect(sourceItem);
      }
    } else {
      await bonusMalusEffect?.delete();
    }
  }

  /**
   * Returns true if the current workflow activity is the toggle activity of the Sharpshooter item.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Sharpshooter item.
   *
   * @returns {boolean} True if the current workflow activity is the toggle activity
   *                    of the Sharpshooter item, false otherwise.
   */
  function isToggleActivity(currentWorkflow, sourceItem) {
    return (
      sourceItem.uuid === currentWorkflow.itemUuid &&
      currentWorkflow.activity?.identifier === 'toggle'
    );
  }

  /**
   * Adds an active effect to show that the feat toggle on state is active.
   *
   * @param {Item5e} sourceItem - The Sharpshooter item.
   */
  async function addToggledOnEffect(sourceItem) {
    // Add AE for toggle mode on
    const effectData = {
      changes: [],
      img: sourceItem.img,
      name: `${sourceItem.name} - Toggled On`,
      origin: sourceItem.uuid,
      transfer: false,
      flags: {
        dae: { stackable: 'noneName', showIcon: true },
        [MODULE_ID]: {
          sharpshooterToggledOn: true,
        },
      },
    };
    await sourceItem.actor.createEmbeddedDocuments('ActiveEffect', [
      effectData,
    ]);
  }

  /**
   * Adds an active effect to add a malus to attack and bonus to damage.
   *
   * @param {Item5e} sourceItem - The Sharpshooter item.
   */
  async function addMalusBonusActiveEffect(sourceItem) {
    // Add an AE for -5 to hit +10 dmg
    const effectData = {
      changes: [
        {
          key: 'system.bonuses.rwak.attack',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '-5',
          priority: '20',
        },
        {
          key: 'system.bonuses.rwak.damage',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '+10',
          priority: '20',
        },
      ],
      duration: {
        turns: 1,
      },
      img: sourceItem.img,
      name: `${sourceItem.name} - Bonus`,
      origin: sourceItem.uuid,
      transfer: false,
      'flags.dae': { stackable: 'noneName', specialDuration: ['1Attack'] },
    };
    await sourceItem.actor.createEmbeddedDocuments('ActiveEffect', [
      effectData,
    ]);
  }
}
