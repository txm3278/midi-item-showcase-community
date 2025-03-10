// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds resistance to the tattoo damage type, and a reaction is triggered when the owner is damaged by the tattoo damage type,
// which adds immunity to that damage and heals the owner by 1/2 of the damage he would have taken.
// v2.0.0
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" actor macro [preItemRoll],[preTargetDamageApplication]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect (when equipped and attuned) that adds a resistance to the tattoo damage type.
// It is also a reaction that gets triggered when appropriate.
//
// Description:
// In the preItemRoll (OnUse) (in Absorbing Tattoo's reaction workflow) (on owner):
//   Validates that the item is equipped and attuned, otherwise aborts the item use.
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

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] }, arguments);
  }
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    if (!scope.rolledItem.system.equipped || !scope.rolledItem.system.attuned) {
    // The Item must be equipped and attuned
      ui.notifications.warn(`${scope.rolledItem.name} | The tattoo must be equipped and attuned.`);
      return false;
    }
  }

}