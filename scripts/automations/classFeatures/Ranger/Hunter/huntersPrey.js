// ##################################################################################################
// Ranger - Hunter - Hunter's Prey
// Allows to choose between the Colossus Slayer or Horde Breaker on short or long and applies an AE
// that provides the benefits of the choice.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [each]
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "OnUseMacro" ItemMacro[preActiveEffects],[postActiveEffects],[postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This item needs to be used to activate. A chat card to activate it appears on a short or long rest.
// When activated it offers to activate either the Colossus Slayer or Horde Breaker Active Effect.
// The selected active effect provides the benefits of the chosen hunter's prey tactic.
//
// Description:
// In the preActiveEffects phase of the Hunter's Prey Choice activity (in owner's workflow):
//   Deletes any applied hunter's prey option from the owner.
// In the postActiveEffects phase of the Hunter's Prey Horde Breaker activity (in owner's workflow):
//   Fetches the item, valid attack activities and valid targets passed in workflow options
//   by the postRollFinished macro, then enchants temporarely the item to make the activation special
//   and only allow the valid attack activities. Finally use the item with MidiQOL.completeItemUse.
//   Note that a list of excluded target UUIDs is configured to prevent selecting them in
//   the midi target confirmation dialog. This list is all the tokens on the canvas from which
//   the valid targets are removed.
// In the postRollFinished phase of the any item when Horde Breaker AE is active (in owner's workflow):
//   Validates that its the owner's turn that the activity used was an attack from a weapon and its
//   not from the Horde Breaker. Then fetches the Horde Breaker activity and validates that is has uses left,
//   that there are nearby creatures within 5' that were not yet attacked this turn by the owner
//   and that there is at least a valid attack activity to be used on the rolled item.
//   When all this is valid, prompts the owner to make an extra attack, then use the Horde Breaker
//   activity with MidiQOL.completeActivityUse.
// When the owner of the Hunter's Prey with Horde Breaker AE turn starts ["each"]:
//   Resets the Extra Weapon Attack flag.
// When the owner of the Hunter's Prey with Horde Breaker AE turn ends ["each"]:
//   Removes the Extra Weapon Attack flag.
// ###################################################################################################
// Default name of the feature
const DEFAULT_ITEM_NAME = "Hunter's Prey";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (foundry.utils.isNewerVersion("3.5.14", globalThis?.elwinHelpers?.version ?? "1.1")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "midi-qol"];
  if (game.release.generation < 14) {
    dependencies.push("times-up");
  }
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function huntersPrey({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }

  if (args[0].tag === "OnUse") {
    if (scope.rolledItem?.identifier === "hunters-prey") {
      if (scope.rolledActivity?.identifier === "choice" && args[0].macroPass === "preActiveEffects") {
        await handleOnUseChoicePreActiveEffects(actor, workflow, scope, debug);
      } else if (scope.rolledActivity?.identifier === "horde-breaker" && args[0].macroPass === "postActiveEffects") {
        await handleOnUseHordeBreakerPostActiveEffects(actor, token, workflow, scope, debug);
      }
    } else if (args[0].macroPass === "postRollFinished") {
      // Handle any other item used
      await handleOnUsePostRollFinished(actor, token, workflow, scope, debug);
    }
  } else if (args[0] === "each") {
    if (scope.lastArgValue?.turn === "startTurn") {
      // Reset turn data
      await actor.setFlag(MODULE_ID, "huntersPreyTurn", { targets: [] });
    } else if (scope.lastArgValue?.turn === "endTurn") {
      // Remove turn data
      await actor.unsetFlag(MODULE_ID, "huntersPreyTurn");
    }
  }
}

/**
 * Handles the on use pre active effects phase of the Hunter's Prey of the Choice activity.
 * Cleans any AE from a previous selection and activities associated with it.
 *
 * @param {Actor} actor - The owner of the Hunter's Prey feat.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUseChoicePreActiveEffects(actor, workflow, scope, debug) {
  await actor.deleteEmbeddedDocuments(
    "ActiveEffect",
    actor.effects.filter((e) => e.origin?.startsWith(scope.macroItem?.uuid)).map((e) => e.id),
  );
}

/**
 * Handles the on use postRollFinished phase of any item's activity other than this feat.
 * Validates that its the owner's turn that the activity used was an attack from a weapon and its
 * not from the Horde Breaker. Then fetches the Horde Breaker activity and validates that is has uses left,
 * that there are nearby creatures within 5' that were not yet attacked this turn by the owner
 * and that there is at least a valid attack activity to be used on the rolled item.
 * When all this is valid, prompts the owner to make an extra attack, then use the Horde Breaker
 * activity with MidiQOL.completeActivityUse.
 *
 *
 * @param {Actor} actor - The owner of the Hunter's Prey feat.
 * @param {Token} token - The token of the owner of the Hunter's Prey feat
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostRollFinished(actor, token, workflow, scope, debug) {
  if (workflow.aborted || !scope.rolledActivity?.hasAttack || !workflow.targets.size) {
    // Not an attack or no target, do nothing
    return;
  }

  if (workflow.inCombat && game.combat?.combatant?.token.uuid !== token.document?.uuid) {
    // Not the attacker's turn, do nothing
    return;
  }

  // Fetch current turn state
  const huntersPreyTurn = actor.getFlag(MODULE_ID, "huntersPreyTurn");
  if (!huntersPreyTurn) {
    console.warn(`${DEFAULT_ITEM_NAME} | No turn data found for actor.`, { actor, workflow });
    return;
  }

  // Add current attacked targets even for non weapon or Horde Breaker attack
  huntersPreyTurn.targets = [...new Set(huntersPreyTurn.targets).union(workflow.targets.map((t) => t.document.uuid))];
  await actor.setFlag(MODULE_ID, "huntersPreyTurn", huntersPreyTurn);

  if (scope.rolledItem?.type !== "weapon" || scope.rolledItem.getFlag(MODULE_ID, "hordeBreakerExtraAttack")) {
    // Not a weapon or Horde Breaker, do nothing
    return;
  }

  const hordeBreaker = scope.macroItem.system.activities.find((a) => a.identifier === "horde-breaker");
  if (!hordeBreaker) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No activity found with identifier "horde-breaker".`, {
        sourceItem: scope.macroItem,
      });
    }
    return;
  }
  if (!hordeBreaker.uses.value) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No uses left for activity "horde-breaker".`, {
        sourceItem: scope.macroItem,
      });
    }
    return;
  }

  // Validate that there are valid targets for the extra attack
  const validTargets = MidiQOL.findNearby(
    null,
    workflow.targets.first(),
    dnd5e.utils.convertLength(5, "ft", dnd5e.utils.defaultUnits("length") ?? "ft"),
  ).filter((t) => t !== token && !huntersPreyTurn.targets.includes(t.document.uuid));
  if (!validTargets.length) {
    // No valid target, skip extra attack
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No valid target found for the extra attack.`, { workflow, huntersPreyTurn });
    }
    return;
  }

  // Validate that there is a valid attack to use for the extra attack
  const weaponItem = scope.rolledItem;
  const validAttacks = weaponItem.system.activities.filter(
    (a) => a.hasAttack && validTargets.some((t) => MidiQOL.checkActivityRange(a, token, [t])?.result !== "fail"),
  );
  if (!validAttacks.length) {
    // No valid attack, skip extra attack
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No valid attack found for the extra attack.`, {
        workflow,
        huntersPreyTurn,
        validTargets,
      });
    }
    return;
  }

  // Confirm use of the extra attack
  const useExtraAttack = await showDialog(hordeBreaker);
  if (!useExtraAttack) {
    return;
  }
  const config = {
    midiOptions: {
      workflowOptions: {
        hordeBreaker: {
          validTargets: validTargets.map((t) => t.document.uuid),
          weaponItemId: weaponItem.id,
          validAttacks: validAttacks.map((a) => a.id),
        },
      },
    },
  };
  const dialog = {
    configure: false,
  };
  await MidiQOL.completeActivityUse(hordeBreaker, config, dialog);
}

/**
 * Handles on use postActiveEffects phase of Hunter's Prey - Horde Breaker activity.
 * Fetches the item, valid attack activities and valid targets passed in workflow options
 * by the postRollFinished macro, then enchants temporarely the item to make the activation special
 * and only allow the valid attack activities. Finally use the item with MidiQOL.completeItemUse.
 * Note that a list of excluded target UUIDs is configured to prevent selecting them in
 * the midi target confirmation dialog. This list is all the tokens on the canvas from which
 * the valid targets are removed.
 *
 * @param {Actor} actor - The owner of the Hunter's Prey feat.
 * @param {Token} token - The token of the owner of the Hunter's Prey feat
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {Promise<Void>}
 */
async function handleOnUseHordeBreakerPostActiveEffects(actor, token, workflow, scope, debug) {
  const refundResource = async function () {
    const chatMessage = MidiQOL.getCachedChatMessage(workflow.itemCardUuid);
    const consumed =
      chatMessage?.system.deltas != null ? chatMessage.system.deltas : chatMessage?.getFlag("dnd5e", "use.consumed");
    if (consumed) {
      await workflow.activity?.refund(consumed);
    }
  };

  const hordeBreakerOptions = workflow.workflowOptions.hordeBreaker;
  if (!hordeBreakerOptions) {
    console.warn(`${DEFAULT_ITEM_NAME} | No workflow options found for horde breaker.`, { workflow });
    await refundResource();
    return;
  }

  let weaponItem = actor.items.get(hordeBreakerOptions.weaponItemId);
  if (!weaponItem) {
    console.warn(`${DEFAULT_ITEM_NAME} | No weapon item found.`, { workflow, hordeBreakerOptions });
    await refundResource();
    return;
  }

  const validTargets = hordeBreakerOptions.validTargets.map((uuid) => fromUuidSync(uuid)?.object).filter((t) => t);
  const validAttacks = hordeBreakerOptions.validAttacks
    .map((id) => weaponItem.system.activities.get(id))
    .filter((a) => a);

  // Enchant item to add the extra attack and do not show non valid activities.
  const changes = [
    { key: "name", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: `{} [${scope.rolledActivity.name}]` },
    { key: `flags.${MODULE_ID}.hordeBreakerExtraAttack`, mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: true },
  ];
  const activityRequirements = [];
  validAttacks.forEach((a) => {
    activityRequirements.push({
      type: a.type,
      conditions: [{ key: "id", value: a.id }],
    });
  });
  const enchantmentEffect = await elwinHelpers.enchantItemTemporarily(weaponItem, scope.rolledActivity, {
    changes,
    activityRequirements,
  });
  if (!enchantmentEffect) {
    console.warn(`${DEFAULT_ITEM_NAME} | Could not enchant item ${weaponItem.name}.`);
    return;
  }
  // Use item with enchantment, the original item it not refreshed with the changes.
  weaponItem = enchantmentEffect.parent;

  try {
    const defaultTargets = validTargets.filter((t) => t.document.disposition * -1 === token.document.disposition);
    const config = {
      midiOptions: {
        targetUuids: defaultTargets.length ? [defaultTargets[0].document.uuid] : [validTargets[0].document.uuid],
        workflowOptions: {
          autoRollAttack: true,
          targetConfirmation: validTargets.length > 1 || !defaultTargets.length ? "always" : undefined,
          excludeTargets: canvas.tokens.placeables.filter((t) => !validTargets.includes(t)).map((t) => t.document.uuid),
        },
      },
    };
    const result = await MidiQOL.completeItemUse(weaponItem, config);
    if (!result || result?.aborted) {
      // Extra attack aborted, refund the activity use
      await refundResource();
    }
  } finally {
    await enchantmentEffect.delete();
  }
}

/**
 * Presents a dialog to choose if the Horde Breaker should be used.
 * @param {Activity} activity - The Horde Breaker activity.
 * @returns {boolean} true if the Horde Breaker should be used.
 */
async function showDialog(activity) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `${activity.item.name}` },
    content: `Use ${activity.item.name}: ${activity.name}?`,
    modal: true,
    rejectClose: false,
  });
}
