// ##################################################################################################
// Read First!!!!
// Verifies that the token has not moved yet and modifies its ability to move if drag-ruler and/or
// monks-tokenbar are active.
// v3.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE: [on], [off] item macro
//  - Times Up
//  - MidiQOL "on use" macro [preItemRoll]
//  - Drag Ruler (optional)
//  - Elevation Ruler (optional)
//  - Monk's TokenBar (optional)
//
// Usage:
// This item needs to be used to activate. When activated the effects are applied.
//
// Description:
// In the preItemRoll phase:
//   This macro checks if the token as already moved during its turn using "Drag Ruler" or
//   "Elevation Ruler" if active.
//   If the token has moved, it prevents the item to be used.
// In the "on" DAE macro call:
//   If "Monk's TokenBar" is active, preserve current token movement status in a flag and change
//   token movement to none.
// In the "off" DAE macro call:
//   If "Monk's TokenBar" is active, change token movement to the mode preserved in the flag.
// ###################################################################################################

const DEFAULT_ITEM_NAME = 'Steady Aim';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  const dependencies = ['dae', 'times-up', 'midi-qol'];
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

export async function steadyAim({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    // Midi-QOL OnUse Item Macro call
    if (game.modules.get('drag-ruler')?.active && dragRuler.getMovedDistanceFromToken(token) > 0) {
      // only allowed if user has not moved yet, can only be validated with drag-ruler and in combat
      ui.notifications.error(`Trying to activate ${scope.rolledItem.name} when token has already moved.`);
      return false;
    }
    if (game.modules.get('elevationruler')?.active && token.lastMoveDistance > 0) {
      // only allowed if user has not moved yet, can only be validated with drag-ruler and in combat
      ui.notifications.error(`Trying to activate ${scope.rolledItem.name} when token has already moved.`);
      return false;
    }
  } else if (args[0] === 'on') {
    // DAE Item Macro GM call
    if (game.modules.get('monks-tokenbar')?.active) {
      const defaultMovement = game.settings.get('monks-tokenbar', 'movement');
      const currentMovement = token.document.getFlag('monks-tokenbar', 'movement') || defaultMovement;
      await DAE.setFlag(scope.lastArgValue.actorUuid, 'steady-aim', {
        previousDefaultMovement: defaultMovement,
        previousMovement: currentMovement,
      });
      game.MonksTokenBar.changeMovement('none', [scope.lastArgValue.tokenId]);
    }
  } else if (args[0] === 'off') {
    // DAE Item Macro GM call
    if (game.modules.get('monks-tokenbar')?.active) {
      const defaultMovement = game.settings.get('monks-tokenbar', 'movement');
      const steadyAimData = DAE.getFlag(scope.lastArgValue.actorUuid, 'steady-aim');
      if (steadyAimData.previousDefaultMovement !== defaultMovement) {
        steadyAimData.previousMovement = defaultMovement;
      }
      game.MonksTokenBar.changeMovement(steadyAimData.previousMovement, [scope.lastArgValue.tokenId]);
      await DAE.unsetFlag(scope.lastArgValue.actorUuid, 'steady-aim');
    }
  }
}
