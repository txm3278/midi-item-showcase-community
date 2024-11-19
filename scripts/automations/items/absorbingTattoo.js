// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds resistance to the tattoo damage type, and a reaction is triggered when the owner is damaged by the tattoo damage type,
// which adds immunity to that damage and heals the owner by 1/2 of the damage he would have taken.
// v1.0.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor macro [preItemRoll][preTargetDamageApplication]
//  - Elwin Helpers world script
//
// How to configure:
// The Equipement details must be:
//   - Equipment Type: Trinket
//   - Attunement: Attunement Required
//   - Activation cost: 1 Reaction
//   - Target: Self
//   - Action Type: (empty)
// The Equipment Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before the item is rolled
//   - Activation Conditions
//     - Reaction:
//       reaction === "isDamaged" && workflow.damageDetail.some(d => d.type === "<tattoo damage type>" && (d.value ?? d.damage) > 0)
//   - This item macro code must be added to the DIME code of this feat.
// Two effects must also be added:
//   - Absorbing Tattoo, <tattoo damage type>:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - system.traits.dr.value | Add | <tattoo damage type>
//   - Absorbing Tattoo, <tattoo damage type>:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Duration: 1 Turn
//      - Special Duration: 1 Reaction: Expires after the attack that triggered the reaction is complete
//      - Effects:
//          - system.traits.di.value | Add | <tattoo damage type>
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preTargetDamageApplication
//
// Usage:
// This item has a passive effect (when equipped and attuned) that adds a resistance to the tattoo damage type.
// It is also a reaction that gets triggered when appropriate.
//
// Description:
// In the preItemRoll (OnUse) (in Absorbing Tattoo's workflow) (on owner):
//   Validates that the item is equipped and attuned, otherwise aborts the item use.
// In the preTargetDamageApplication (TargetOnUse) (in attacker's workflow) (on owner):
//   Healing is added to an amount equivalent to 1/4 of the total damage inflicted of the tattoo damage type.
// ###################################################################################################

export async function absorbingTattoo({
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
  const DEFAULT_ITEM_NAME = 'Absorbing Tattoo';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.6'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers world script must be installed, active and have a version greater or equal than 2.6.0`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (
    !foundry.utils.isNewerVersion(
      game.modules.get('midi-qol')?.version,
      '11.6'
    ) &&
    !MidiQOL.configSettings().v3DamageApplication
  ) {
    ui.notifications.error(
      `${DEFAULT_ITEM_NAME} | dnd5e v3 damage application is required.`
    );
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    let attuned = foundry.utils.isNewerVersion(game.system.version, '3.2')
      ? item.system.attuned
      : item.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED;
    if (!scope.rolledItem.system.equipped || !attuned) {
      // The Item must be equipped and attuned
      ui.notifications.warn(
        `${DEFAULT_ITEM_NAME} | The tattoo must be equipped and attuned.`
      );
      return false;
    }
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'preTargetDamageApplication'
  ) {
    const tattooType = getTattooType(scope.macroItem);
    const total = workflow.damageDetail.reduce(
      (acc, d) => acc + (d.type === tattooType ? d.value ?? d.damage : 0),
      0
    );
    // Note: its a quarter of the damage, because the description says half of what it would have taken without the reaction,
    // which would already be half due to resistance granted by the tattoo.
    workflow.damageItem.damageDetail.push({
      value: -1 * Math.floor(total / 4),
      type: tattooType,
      active: { absorption: true },
    });
    elwinHelpers.calculateAppliedDamage(workflow.damageItem);
  }

  /**
   * Returns the tattoo item's damage type.
   *
   * @param {Item5e} tattooItem - Absorbing Tattoo item
   * @returns {string} the tattoo damage type.
   */
  function getTattooType(tattooItem) {
    return (
      tattooItem?.effects
        .find((ae) => ae.transfer === true && ae.name === tattooItem.name)
        ?.changes.find((c) => c.key === 'system.traits.dr.value')?.value ??
      'acid'
    );
  }
}
