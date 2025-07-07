// ##################################################################################################
// Read First!!!!
// Adds damage resistance when the owner is attacked by a ranged weapon attack and triggers a reaction to change the
// target to the owner of the shield when an other target is attacked.
// v2.0.0
// Author: Elwin#1410 based on Ris version
// Dependencies:
//  - DAE [on]
//  - MidiQOL "on use" actor macro [tpr.isTargeted]
//  - Elwin Helpers world script
//
// Usage:
// This item has a passive effect (when equipped and attuned) to handle damage resistance againt ranged weapon attacks on owner
// of shield and to handle the reaction when it's not the owner of the shield that is targeted.
//
// Description:
// In the tpr.isTargeted (TargetOnUse) macro (in attacker's workflow) (on other target):
//   The current workflow target is switched to the owner of the shield, midi will then call the isAttacked later
//   on the new target.
// In the "on" DAE macro call:
//   If the curse's active effect is not present, adds it to the actor.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = 'Shield of Missile Attraction';
const MODULE_ID = 'midi-item-showcase-community';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.3')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function shieldOfMissileAttraction({
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
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isTargeted') {
    // Check if ranged weapon attack
    if (elwinHelpers.isRangedWeaponAttack(workflow.activity, workflow.token, token)) {
      // Get token wielding the shield
      let sourceToken = scope.macroItem?.actor?.token ?? scope.macroItem?.actor?.getActiveTokens()?.[0];
      sourceToken = sourceToken?.object ? sourceToken.object : sourceToken;
      if (!sourceToken) {
        console.error(`${DEFAULT_ITEM_NAME} | No token found for item's actor.`, { sourceItem: scope.macroItem });
        return;
      }

      // Swap original target for wielding token
      workflow.targets.delete(token);
      workflow.targets.add(sourceToken);
      const targetIds = workflow.targets.map((t) => t.id);
      game.user?.updateTokenTargets(targetIds);
      game.user?.broadcastActivity({ targets: targetIds });

      // Add info about target switch
      const targetDivs = elwinHelpers.getTargetDivs(token, 'The target <strong>${tokenName}</strong>');
      const newTargetDivs = elwinHelpers.getTargetDivs(
        sourceToken,
        `was switched to <strong>\${tokenName}</strong> by <strong>${scope.macroItem.name}</strong>.`
      );
      const infoMsg = `${targetDivs}${newTargetDivs}`;
      await elwinHelpers.insertTextIntoMidiItemCard('beforeHitsDisplay', workflow, infoMsg);
    }
  } else if (args[0] === 'on') {
    if (!actor.getFlag(MODULE_ID, 'shieldOfMissileAttractionCurse')) {
      const effectData = item.effects
        .find(
          (ae) => !ae.transfer && ae.changes.some((c) => c.key === `flags.${MODULE_ID}.shieldOfMissileAttractionCurse`)
        )
        ?.toObject();
      if (!effectData) {
        console.error(`${DEFAULT_ITEM_NAME} | Missing curse effect.`, { item });
      }
      effectData.origin = item.uuid; // flag the effect as associated to the source item used
      // TODO check if options to not show scolling status...
      await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    }
  }
}
