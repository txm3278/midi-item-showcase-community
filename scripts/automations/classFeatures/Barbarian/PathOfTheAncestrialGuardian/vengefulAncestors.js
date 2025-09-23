// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Damages the attacker that triggered Spirit Shield by the amount of damage that was prevented.
// v3.1.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preItemRoll]
//  - Elwin Helpers world script
//
// Usage:
// This is a special feature that can only be triggered by the Spirit Shield feature.
// When used, it will damage the attacker that triggered the Spirit Shield by the amount of
// damage that was prevented from the target.
//
// Note: A Rage item which adds a Rage effect when activated must be configured, and the Spirit Shield item
//       made by Elwin is needed to trigger this feature.
//
// Description:
// In the preItemRoll phase of the Retribution Damage activity:
//   Blocks the activity use if the barbarian is not raging or if it was not triggered by Spirit Shield.
// ###################################################################################################

export async function vengefulAncestors({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Vengeful Ancestors';
  // Default identifier of the Rage feature (support DDBI legacy suffix)
  const RAGE_ITEM_IDENT = 'rage';
  const RAGE_LEGACY_ITEM_IDENT = RAGE_ITEM_IDENT + '-legacy';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
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

    const rage = actor.itemTypes.feat.find(
      (i) => i.identifier === RAGE_ITEM_IDENT || i.identifier === RAGE_LEGACY_ITEM_IDENT
    );
    const rageEffect = rage
      ? actor.appliedEffects?.find((ae) => !ae.transfer && ae.origin?.startsWith(rage.uuid))
      : undefined;
    if (!rageEffect) {
      // The Barbarian must be in Rage
      ui.notifications.warn(`${scope.macroItem.name} | Barbarian is not in ${rage?.name ?? 'Rage'}.`);
      return false;
    }
    if (
      !workflow.workflowOptions?.spiritShieldVengefulAncestorsTrigger ||
      !(DAE.getFlag(actor, 'spiritShieldPreventedDmg') > 0)
    ) {
      // This feature can only be triggered by Spirit Shield
      ui.notifications.warn(`${scope.macroItem.name} | This feature can only be triggered by Spirit Shield.`);
      return false;
    }
    if (workflow.targets.size !== 1) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | There must be one and only one target.`);
      }
      return false;
    }
  }
}
