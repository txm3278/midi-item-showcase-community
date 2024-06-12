// ##################################################################################################
// Read First!!!!
// Handles the ability to toggle on/off the -5 penalty to hit and +10 bonus to the damage on a
// heavy weapon melee attack. Note: it supports checking for melee weapon attack with a thrown.
// v2.1.2
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item macro [preAttackRoll]
//  - Elwin Helpers world script
//
// How to configure:
// The item details must be:
//   - Feature Type: Feat
//   - Activation Cost: (empty)
//   - Action type: (empty)
// The Feature Midi-QOL must be:
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - Don't Apply Convenient Effect (checked)
//   - Midi-qol Item Properties:
//     - Toggle effect (checked)
//   - This item macro code must be added to the DIME code of this feat.
// One effect must also be added:
//   - Great Weapon Master:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Apply to self when item is rolled (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preAttackRoll
//
// Usage:
// This is a feat that can be toggled on or off, when on if the attack is a melee attack from a heavy weapon for which
// the attacker is proficient, an effect to give -5 penalty to hit and a +10 bonus to damage is granted for this attack.
//
// Description:
// In the preAttackRoll (OnUse) phase (on any item):
//   If the item has the heavy property, that the attack is a melee weapon attack and the actor is proficient with it,
//   it adds an AE to give -5 penaly to melee weapon attack and +10 bonus to damage from a melee weapon attack.
//   This AE only last for one attack.
//   Note: if the weapon has the thrown property, the distance to the target must be less than or equal to 5 ft to be
//   considered a melee weapon attack.
// ###################################################################################################

// Default name of the item

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
  // Set to false to remove debug logging
  const debug = false;

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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preAttackRoll') {
    const macroData = args[0];
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
      [imgPropName]: scope.macroItem.img,
      name: `${scope.macroItem.name} - Bonus`,
      origin: scope.macroItem.uuid,
      transfer: false,
      flags: {
        dae: {
          specialDuration: ['1Attack'],
        },
      },
    };
    await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  }
}
