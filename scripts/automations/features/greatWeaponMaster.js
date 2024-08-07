// ##################################################################################################
// Read First!!!!
// Handles the ability to toggle on/off or prompt the -5 penalty to hit and +10 bonus to the damage on a
// heavy weapon melee attack. Note: it supports checking for melee weapon attack with a thrown property.
// v1.3.1
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item macro [preItemRoll],[preAttackRoll]
//  - Elwin Helpers world script
//
// How to configure:
// The item details must be:
//   - Feature Type: Feat
//   - Activation Cost: None
//   - Target: Self
//   - Range: Self
//   - Action type: (empty)
// The Feature Midi-QOL must be:
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - Don't Apply Convenient Effect (checked)
//   - Midi-qol Item Properties:
//     - Toggle effect (checked to toggle the feature on/off when using it, unchecked to be prompted to use the feature when the condition are met)
//   - This item macro code must be added to the DIME code of this feat.
// One effect must also be added:
//   - Great Weapon Master:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preItemRoll
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preAttackRoll
//
// Usage:
// This is a feat that can be toggled on or off, when the midi property "Toggle effect" is checked, when unchecked, a dialog to activate the feature
// will be prompted on attacks that meet the requirements. If the attack is a melee attack from a heavy weapon for which
// the attacker is proficient and toggled on or the prompt to activate was accepted,
// an effect to give -5 penalty to hit and a +10 bonus to damage is granted for this attack.
//
// Description:
// In the preItemRoll (OnUse) phase (on any item):
//   If the midi toggle effect property is checked:
//     If the used item is this feat, toggle the effect, else set to prompt to not activate on attack.
//   Else:
//     Set to prompt to activate on attack.
// In the preAttackRoll (OnUse) phase (on any item):
//   Validates that the item used has the heavy property, that the attack is a melee weapon attack and the actor is proficient with it,
//   If the feat "Toggle effect" is unchecked a dialog is prompted to activate the feat on this attack.
//   If the feat is toggled on or the activation has been accepted, it adds an AE to give -5 penaly to melee weapon attack and
//   +10 bonus to damage from a melee weapon attack.
//   This AE only last for one attack.
//   Note: if the weapon has the thrown property, the distance to the target must be less than or equal to 5 ft
//   (10 ft if the weapon has reach property) to be considered a melee weapon attack.
// ###################################################################################################

export async function greatWeaponMaster({
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
  const DEFAULT_ITEM_NAME = 'Great Weapon Master';
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = false;
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
      '2.0'
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    const toggleEffect = foundry.utils.getProperty(
      scope.macroItem,
      'flags.midiProperties.toggleEffect'
    );
    let removeActiveEffect = false;
    if (toggleEffect) {
      const gwmState =
        scope.macroItem.getFlag(MODULE_ID, 'greatWeaponMasterState') ??
        OFF_STATE;
      if (scope.rolledItem.uuid !== scope.macroItem.uuid) {
        // Reset state to toggle off if prompt
        if (gwmState === PROMPT_STATE) {
          await scope.macroItem.setFlag(
            MODULE_ID,
            'greatWeaponMasterState',
            OFF_STATE
          );
        }
        return true;
      }
      await scope.macroItem.setFlag(
        MODULE_ID,
        'greatWeaponMasterState',
        STATES.get(gwmState)
      );
      if (STATES.get(gwmState) === ON_STATE) {
        // Add AE for toggle mode on
        await addToggledOnEffect(scope.macroItem);
      } else {
        removeActiveEffect = true;
      }
    } else {
      await scope.macroItem.setFlag(
        MODULE_ID,
        'greatWeaponMasterState',
        PROMPT_STATE
      );
      removeActiveEffect = true;
    }
    if (removeActiveEffect) {
      // Remove AE for toggle mode
      await actor.effects
        .find((ae) => ae.getFlag(MODULE_ID, 'greatWeaponMasterToggledOn'))
        ?.delete();
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll') {
    if (
      scope.rolledItem?.type !== 'weapon' ||
      !elwinHelpers.hasItemProperty(scope.rolledItem, 'hvy') ||
      !scope.rolledItem?.system?.prof?.hasProficiency ||
      !elwinHelpers.isMeleeWeaponAttack(
        scope.rolledItem,
        token,
        workflow.targets.first()
      )
    ) {
      // Only works on proficient heavy melee weapon attacks
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Not an heavy melee weapon attack.`
        );
      }
      return;
    }

    const gwmState = scope.macroItem.getFlag(
      MODULE_ID,
      'greatWeaponMasterState'
    );
    if (gwmState === OFF_STATE) {
      return;
    } else if (gwmState === PROMPT_STATE) {
      const activate = await Dialog.confirm({
        title: `${scope.macroItem.name} - Activation`,
        content: `<p>Use ${scope.macroItem.name}? (-5 to attack, +10 to damage)</p>`,
        rejectClode: false,
        options: { classes: ['dialog', 'dnd5e'] },
      });
      if (!activate) {
        return;
      }
    }

    // Add an AE for -5 to hit +10 dmg
    await addMalusBonusActiveEffect(scope.macroItem);
  }

  /**
   * Adds an active effect to show that the feat toggle on state is active.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   */
  async function addToggledOnEffect(sourceItem) {
    // Add AE for toggle mode on
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const effectData = {
      changes: [],
      duration: {
        seconds: -1,
      },
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - Toggled On`,
      origin: sourceItem.uuid,
      transfer: false,
      flags: {
        dae: { showIcon: true },
        [MODULE_ID]: {
          greatWeaponMasterToggledOn: true,
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
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   */
  async function addMalusBonusActiveEffect(sourceItem) {
    // Add an AE for -5 to hit +10 dmg
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const effectData = {
      changes: [
        {
          key: 'system.bonuses.mwak.attack',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '-5',
          priority: '20',
        },
        {
          key: 'system.bonuses.mwak.damage',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: '+10',
          priority: '20',
        },
      ],
      duration: {
        turns: 1,
      },
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - Bonus`,
      origin: sourceItem.uuid,
      transfer: false,
      flags: {
        dae: {
          specialDuration: ['1Attack'],
        },
      },
    };
    await sourceItem.actor.createEmbeddedDocuments('ActiveEffect', [
      effectData,
    ]);
  }
}
