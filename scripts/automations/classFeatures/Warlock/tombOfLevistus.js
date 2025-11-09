// ##################################################################################################
// Read First!!!!
// Verifies that the token has not moved yet and modifies its ability to move if drag-ruler and/or
// monks-tokenbar are active.
// v1.1.0
// Author: Elwin#1410 based on pospa4
// Dependencies:
//  - DAE: [on],[off] item macro
//  - Times Up
//  - MidiQOL "on use" macro [postTargetEffectApplication]
//  - Monk's TokenBar (optional)
//
// Usage:
// This item needs to be used to activate. When activated the effects are applied.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the postTargetEffectApplication (TargetOnUse) (in attacker's workflow) (on owner):
//   Removes the AE added by the reaction activity and registers a hook on midi-qol.RollComplete.
// In the midi-qol.RollComplete hook (in attacker's workflow):
//   Adds an AE to the owner to reduce speed to 0 and to add fire vulnerability.
// In the "on" DAE macro call:
//   If "Monk's TokenBar" is active, preserves current token movement status in a flag and change
//   token movement to none.
// In the "off" DAE macro call:
//   Removes any remaining temporary hit points. If "Monk's TokenBar" is active,
//   changes token movement to the mode preserved in the flag.
// ###################################################################################################

const DEFAULT_ITEM_NAME = "Tomb of Levistus";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
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

export async function tombOfLevistus({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "TargetOnUse" && args[0].macroPass === "postTargetEffectApplication") {
    await handleTargetOnUsePostTargetEffectApplication(scope.macroItem, workflow);
  } else if (args[0] === "on") {
    // DAE Item Macro GM call
    if (game.modules.get("monks-tokenbar")?.active) {
      const defaultMovement = game.settings.get("monks-tokenbar", "movement");
      const currentMovement = token.document.getFlag("monks-tokenbar", "movement") || defaultMovement;
      await DAE.setFlag(scope.lastArgValue.actorUuid, "tomb-of-levistus", {
        previousDefaultMovement: defaultMovement,
        previousMovement: currentMovement,
      });
      game.MonksTokenBar.changeMovement("none", [scope.lastArgValue.tokenId]);
    }
  } else if (args[0] === "off") {
    // DAE Item Macro GM call
    await actor.update({ "system.attributes.hp.temp": null });
    if (game.modules.get("monks-tokenbar")?.active) {
      const defaultMovement = game.settings.get("monks-tokenbar", "movement");
      const tombOfLEvistusData = DAE.getFlag(scope.lastArgValue.actorUuid, "tomb-of-levistus");
      if (!tombOfLEvistusData) {
        return;
      }
      if (tombOfLEvistusData.previousDefaultMovement !== defaultMovement) {
        tombOfLEvistusData.previousMovement = defaultMovement;
      }
      game.MonksTokenBar.changeMovement(tombOfLEvistusData.previousMovement, [scope.lastArgValue.tokenId]);
      await DAE.unsetFlag(scope.lastArgValue.actorUuid, "tomb-of-levistus");
    }
  }
}

/**
 * Handles the targetOnUse postTargetEffectApplication of the Tomb of Levistus item in the triggering midi-qol workflow.
 * Removes the AE that was added by the reaction and registers a hook on midi-qol.RollComplete,
 * which adds an AE to the owner to reduce speed to 0 and to add fire vulnerability.
 *
 * @param {Item5e} sourceItem - The Tomb of Levistus item.
 */
async function handleTargetOnUsePostTargetEffectApplication(sourceItem, workflow) {
  // Find temporary AE to remove it
  const sourceActor = sourceItem.actor;
  const tempEffect = sourceActor.effects.find(
    (ae) => ae.name === sourceItem.name && ae.origin?.startsWith(sourceItem.uuid)
  );
  if (tempEffect) {
    await MidiQOL.removeEffects({ actorUuid: sourceActor.uuid, effects: [tempEffect.id] });
  }

  const entombmentEffect = sourceItem.effects.find(
    (ae) => ae.name !== sourceItem.name && ae.statuses.has("incapacitated")
  );
  if (!entombmentEffect) {
    console.warn(`${DEFAULT_ITEM_NAME} | Missing entombment AE`, sourceItem);
    return;
  }
  const entombmentEffectData = entombmentEffect.toObject();
  entombmentEffectData.origin =
    sourceItem.system.activities.find((a) => a.identifier === "reaction")?.uuid ?? sourceItem.uuid;

  // Register hook to add entombment effect after roll is complete
  Hooks.once(`midi-qol.RollComplete.${workflow.itemUuid}`, async (workflow2) => {
    if (workflow !== workflow2) {
      if (debug) {
        // Not same workflow do nothing
        console.warn(`${sourceItem.name} | midi-qol.RollComplete hook called from a different workflow.`);
        return;
      }
    }
    MidiQOL.createEffects({ actorUuid: sourceActor.uuid, effects: [entombmentEffectData] });
  });
}
