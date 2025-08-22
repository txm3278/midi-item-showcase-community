// ##################################################################################################
// Limited Magic Immunity
// Gives advantage to saves against magic and spells of 6th level and lower don't effect the owner.
// v1.1.0
// Author: thatlonelybugbear and Elwin
// Dependencies:
//  - DAE
//  - MidiQOL "OnUseMacro" ItemMacro[isTargeted]
//
// Usage:
// This feature has a passive effect that gives advantage to saves against magic and
// spells of 6th level and lower don't effect the owner.
//
// Description:
// In the isTargeted (TargetOnUse) of the activity (in attacker's workflow):
//   Validates that if the item is a spell and the cast level is lower than 7 and that
//   the activity is not an heal one and that it's not a self target spell, then
//   cancels the workflow if there is only the owner has the target, or remove the owner
//   from the targets. After it outputs a message with a random taunt.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = 'Limited Magic Immunity';

const randomTaunt = {
  general: 'Was that supposed to tickle? Maybe you should stick to card tricks!',
  arrogant: 'Did you really think that would work on me? You need stronger magic to faze someone like me.',
  mocking: 'Aww, did your little spell fizzle out? Maybe you need a bigger wand!',
  sarcastic: "Impressive! Did you learn that one from a children's book of spells?",
  playful: "Nice try, but you'll have to do better than that to get my attention!",
  dismissive: "Is that the best you've got? Maybe magic isn't your thing.",
  humorous: 'I think your spell just took a nap. You might want to wake it up next time!',
  encouraging: "Don't worry, practice makes perfect! You'll get the hang of it eventually.",
  stoic: 'Your magic is weak, just like your resolve.',
  bugbear: 'Is that the best you can do, or did thatlonelybugbear teach you?',
  confused: "Did something happen? I didn't feel a thing.",
};

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  const dependencies = ['dae', 'midi-qol'];
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

export async function limitedMagicImmunity({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (!(args[0].tag === 'TargetOnUse' && args[0].macroPass === 'isTargeted')) {
    return;
  }

  if (
    scope.rolledItem.type == 'spell' &&
    (workflow.castData?.castLevel ?? 0) < 7 &&
    scope.rolledActivity.target?.affects?.type !== 'self' &&
    scope.rolledActivity.actionType !== 'heal'
  ) {
    const targetedToken = token;
    if (workflow.targets.size === 1) {
      workflow.aborted = true;
    } else {
      const targetIds = game.user?.targets.filter((t) => t !== targetedToken).map((t) => t.id);
      if (game.release.generation > 12) {
        canvas.tokens?.setTargets(targetIds);
      } else {
        game.user?.updateTokenTargets(targetIds);
        game.user?.broadcastActivity({ targets: targetIds });
      }
    }
    ui.notifications.info(`${MidiQOL.getTokenPlayerName(targetedToken)} deflects your spell!`);
    await ChatMessage.implementation.create({
      content: getRandomTaunt(),
      speaker: ChatMessage.getSpeaker({ alias: MidiQOL.getTokenPlayerName(targetedToken), token: targetedToken }),
    });
  }
}

function getRandomTaunt() {
  const keys = Object.keys(randomTaunt);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return `As the spell fizzles with no effect, you hear: "${randomTaunt[randomKey]}"`;
}
