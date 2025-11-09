// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Reaction that reduces the damage received from melle or ranged weapon attack and allows to
// redirect the attack to another target using a Monk's Focus point when the appropiate conditions are met.
// v1.4.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This feature is a reaction activity that gets triggered when appropriate. When the damage received is
// reduced to 0, it allows to redirect the attack (by spending a use of Monk's Focus) to another target.
// Note: A scale dice value must be configured on the 'Monk' class,
//       its data value should resolve to '@scale.monk.martial-arts.faces'.
//
// Description:
// In the postActiveEffects (item onUse) phase of the reaction activity (in owner's workflow):
//   If the damage received is reduced to 0, prompts a dialog to choose if the attack should be
//   redirected or not (by spending a use of Monk's Focus).
//   If the attack is redirected the appropriate redirect attack activity (ranged or melee)
//   is used to process the redirected attack.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Deflect Attacks";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.6")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize(
      "midi-item-showcase-community.ElwinHelpersRequired"
    )}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function deflectAttacks({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (scope.rolledActivity?.identifier !== "reaction") {
      return;
    }

    const deflectTotal = workflow.utilityRoll?.total ?? 0;

    if (deflectTotal < workflow.workflowOptions.damageTotal) {
      return;
    }

    // Get the original attack activity to determine the type of attack (ranged or melee)
    const attackActivity =
      workflow.workflowOptions.item?.system.activities?.find((a) => a.id === workflow.workflowOptions?.activity?.id) ??
      workflow.workflowOptions.item?.system.activities?.getByType("attack")?.[0];
    // Get last attack mode from item flags
    const attackMode = foundry.utils.getProperty(
      workflow.workflowOptions,
      `item.flags.dnd5e.last.${attackActivity.id}.attackMode`
    );
    let actionType = attackActivity?.getActionType(attackMode);
    if (!actionType) {
      console.warn(
        `${scope.rolledItem.name} | Could not determine attack activity's action type, defaulting to 'mwak'.`
      );
      actionType = "mwak";
    }
    let rangedAttack = false;
    let redirectAttackActivity;
    if (actionType.startsWith("m")) {
      // Check if its ranged due to thrown weapons and distance
      const tartgetActor = fromUuidSync(workflow.workflowOptions.sourceActorUuid);
      const target = MidiQOL.tokenForActor(tartgetActor);
      if (elwinHelpers.isRangedAttack(attackActivity, token, target)) {
        rangedAttack = true;
      }
    } else if (actionType.startsWith("r")) {
      rangedAttack = true;
    }

    if (rangedAttack) {
      redirectAttackActivity = scope.rolledItem.system.activities?.find(
        (a) => a.identifier === "redirect-ranged-attack"
      );
      if (!redirectAttackActivity) {
        console.error(`${DEFAULT_ITEM_NAME} | Missing redirect ranged attack activity.`, { item: scope.rolledItem });
        return;
      }
    } else {
      redirectAttackActivity = scope.rolledItem.system.activities?.find(
        (a) => a.identifier === "redirect-melee-attack"
      );
      if (!redirectAttackActivity) {
        console.error(`${DEFAULT_ITEM_NAME} | Missing redirect melee attack activity.`, { item: scope.rolledItem });
        return;
      }
    }

    const { value: nbUses, max: maxUses } = actor.items.get(redirectAttackActivity.consumption?.targets[0]?.target)
      ?.system.uses ?? { value: 0, max: 0 };

    if (nbUses <= 0) {
      // No uses available cannot redirect attack
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No uses available, cannot redirect attack.`, {
          item: scope.rolledItem,
          redirectAttackActivity,
        });
      }
      return;
    }
    const redirect = await showDialog(scope.rolledItem, nbUses, maxUses);
    if (!redirect) {
      return;
    }
    const config = {
      midiOptions: {
        workflowOptions: { notReaction: true, autoConsumeResource: "both" },
        ignoreUserTargets: true,
      },
    };

    await MidiQOL.completeActivityUse(redirectAttackActivity, config);
  }
}

/**
 * Presents a dialog to choose if the attack should be redirected.
 * @param {Item5e} sourceItem - The Deflect Attacks feature.
 * @param {number} nbUses - number of remaining uses.
 * @param {number} maxUses - maximum number of uses.
 * @returns {boolean} true if the attack should be redirected.
 */
async function showDialog(sourceItem, nbUses, maxUses) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `${sourceItem.name}` },
    content: `Redirect attack (${nbUses}/${maxUses})?`,
    modal: true,
    rejectClose: false,
  });
}
