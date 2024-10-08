// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Damages the attacker that triggered Spirit Shield by the amount of damage that was prevented.
// v2.1.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preItemRoll][preDamageRoll]
//  - Elwin Helpers world script
//  Note: A Rage item which adds a Rage effect when activated must be configured, and the Spirit Shield item
//        made by Elwin is needed to trigger this feature.
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Activation cost: Special
//   - Target: 1 Creature
//   - Action Type: Other
//   - Damage formula:
//     @flags.dae.spiritShieldPreventedDmg | Force
//   - Chat Message Flavor: Your Ancestors retaliates!
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before the item is rolled
//       ItemMacro | Before Damage Roll
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feature.
//
// Usage:
// This is a special feature that can only be triggered by the Spirit Shield feature.
// When used, it will damage the attacker that triggered the Spirit Shield by the amount of
// damage that was prevented from the target.
//
//
// Description:
// In the preItemRoll phase of Vengeful Ancestors item:
//   Blocks the item use if the barbarian is not raging or if it was not triggered by Spirit Shield.
// In the preDamageRoll phase of Vengeful Ancestors item:
//   Forces the display of targets because it's not displayed by default when there is no attack roll.
// ###################################################################################################

export async function vengefulAncestors({
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
  const DEFAULT_ITEM_NAME = 'Vengeful Ancestors';
  // Default name of the Rage effect, normally same as the feature
  const RAGE_EFFECT_NAME = 'Rage';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

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
    const macroData = args[0];
    if (!actor.appliedEffects?.find((ae) => ae.name === RAGE_EFFECT_NAME)) {
      // The Barbarian must be in Rage
      ui.notifications.warn(`${DEFAULT_ITEM_NAME} | Barbarian is not in Rage.`);
      return false;
    }
    if (
      !workflow.options?.spiritShieldVengefulAncestorsTrigger ||
      !(DAE.getFlag(actor, 'spiritShieldPreventedDmg') > 0)
    ) {
      // This feature can only be triggered by Spirit Shield
      ui.notifications.warn(
        `${DEFAULT_ITEM_NAME} | This feature can only be triggered by Spirit Shield.`
      );
      return false;
    }
    if (workflow.targets.size !== 1) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | There must be one and only one target.`
        );
      }
      return false;
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRoll') {
    // Force display of targets because it's not displayed by default when there is no attack roll.
    await workflow.displayTargets(workflow.whisperAttackCard);
  }
}
