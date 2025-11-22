// ##################################################################################################
// Read First!!!!
// Allows to designate a sworn enemy and applies the bow's effect when attacking a sworn enemy.
// v2.2.0
// Author: Elwin#1410 based on Christopher version
// Dependencies:
//  - DAE [on][off]
//  - Times up
//  - MidiQOL "on use" item macro, [preDamageRoll],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
//  When equipped and attuned, an activity can be used to designate a sworn enemy. When this activity is used,
//  it allows to designate a sworn enemy, this applies one AE on the attacker and one on the target to be able to apply the effects.
//  When a sworn enemy is attacked with this bow, it applies its effects.
//
// Description:
// In the preDamageRollConfig (OnUse) phase of the Oathbow Attack activity (owner's workflow):
//   If the activity is a ranged weapon attack that targets the Sworn Enemy,
//   calls elwinHelpers.damageConfig.updateBasic to add a hook on dnd5e.preRollDamageV2 that adds damage bonus.
// In the postActiveEffects (OnUse) phase of the Oathbow Swear Oath activity (owner's workflow):
//   Updates the attacker's AE to add a flag that designates the Sworn Enemy toknen's UUID and makes the
//   attacker and target AEs dependent.
// When the Oathbow AE is activated [on]:
//   Disables the automation only flag of the Swear Oath activity.
// When the Oathbow AE is deactivated [off]:
//   Enables the automation only flag of the Swear Oath activity
// When the Oathbow - Sworn Enemy - Attacker AE is activated [on]:
//   Removes the Swear Oath activity's recovery period.
// When the Oathbow - Sworn Enemy - Attacker AE expires [off]:
//   If the expiry reason is zeroHP and the target referenced in the effect has 0 HP, sets the recovery period to next dawn. Else
//   resets the spent uses to 0 and removes the recovery period. This prevents the Swear Oath activity to be used before the next Dawn
//   or being used more than once until the sworn enemy dies or hits 0 HP.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Oathbow";
const MODULE_ID = "midi-item-showcase-community";
/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.5")) {
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

export async function oathbow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preDamageRollConfig") {
    await handleOnUsePreDamageRollConfig(scope, workflow, debug);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (workflow.activity?.identifier === "swear-oath") {
      return await handleOnUsePostActiveEffectsSwearOath(workflow);
    }
  } else if (args[0] === "on") {
    if (scope.lastArgValue?.efData.transfer) {
      await handleOnEffectTransfer(scope.macroItem);
    } else {
      await handleOnEffectAttacker(scope.macroActivity);
    }
  } else if (args[0] === "off") {
    if (scope.lastArgValue?.efData.transfer) {
      await handleOffEffectTransfer(scope.macroItem);
    } else {
      await handleOffEffectAttacker(
        scope.macroActivity,
        scope.lastArgValue?.efData,
        scope.lastArgValue?.["expiry-reason"]
      );
    }
  }
}

/**
 * Handles the preDamageRollConfig phase of the Attack activity.
 * If the current activity is an attack with an action type of 'rwak', there is only one hit target
 * and its the marked sworn enemy, calls elwinHelpers.damageConfig.updateBasic to add a
 * hook on dnd5e.preRollDamageV2 that adds damage bonus.
 *
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {boolean} debug - Debug indicator.
 */
async function handleOnUsePreDamageRollConfig(scope, workflow, debug) {
  if (
    workflow.activity?.hasAttack &&
    workflow.hitTargets?.size === 1 &&
    workflow.actor.getFlag(MODULE_ID, "oathbowSwornEnemy") === workflow.hitTargets?.first()?.actor?.uuid &&
    workflow.activity?.getActionType(workflow.attackMode) === "rwak"
  ) {
    elwinHelpers.damageConfig.updateBasic(scope, workflow, {
      damageBonus: "3d6[piercing]",
      flavor: `${scope.macroItem.name} - Sworn Enemy Extra Damage`,
      debug,
    });
  }
}

/**
 * Handles the post active effects of Swear Oath activity.
 * Updates the attacker AE to add the target's actor uuid and adds dependencies between attacker and target AEs.
 *
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 */
async function handleOnUsePostActiveEffectsSwearOath(workflow) {
  const target = workflow.targets.first();

  const effectSource = workflow.actor.effects?.find(
    (ae) => !ae.transfer && fromUuidSync(ae.origin)?.identifier === "swear-oath"
  );
  if (!effectSource) {
    console.error(`${workflow.item} | Missing Sworn Enemy - Attacker AE.`);
    return;
  }
  const changes = foundry.utils.deepClone(effectSource.changes);
  changes.forEach((c) => (c.value = c.value.replace("{{targetActorUuid}}", target.actor?.uuid)));
  changes.push({
    key: `flags.${MODULE_ID}.oathbowSwornEnemy`,
    value: target.actor?.uuid,
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: 20,
  });
  await effectSource.update({ changes });

  const effectTarget = target.actor?.effects?.find((ae) => !ae.transfer && ae.origin?.startsWith(workflow.itemUuid));
  if (!effectTarget) {
    console.error(`${workflow.item} | Missing Sworn Enemy - Target AE.`);
    return;
  }

  await MidiQOL.addDependent(effectSource, effectTarget);
  await MidiQOL.addDependent(effectTarget, effectSource);
}

/**
 * Disables automation only of the Swear Oath activity.
 *
 * @param {Item5e} sourceItem - The Oathbow.
 */
async function handleOnEffectTransfer(sourceItem) {
  await sourceItem?.system.activities
    ?.find((a) => a.identifier === "swear-oath")
    ?.update({ "midiProperties.automationOnly": false });
}

/**
 * Enables automation only of the Swear Oath activity.
 *
 * @param {Item5e} sourceItem - The Oathbow.
 */
async function handleOffEffectTransfer(sourceItem) {
  await sourceItem?.system.activities
    ?.find((a) => a.identifier === "swear-oath")
    ?.update({ "midiProperties.automationOnly": true });
}

/**
 * Remove the recovery period when a new sworn enemy is designated.
 *
 * @param {Activity} sourceActivity - The AE origin's activity.
 */
async function handleOnEffectAttacker(sourceActivity) {
  await sourceActivity?.update({ "uses.recovery": [] });
}

/**
 * If the expiry reason is zeroHP and the actor associated to the sworn enemy token UUID has 0 HP then allow recovery of the spent uses on next dawn,
 * else reset the spent uses to 0 and removes the recovery period. This prevents the Swear Oath activity to be used before the next Dawn or
 * being used more than once until the sworn enemy dies or hits 0 HP.
 *
 * @param {Activity} sourceActivity - The AE origin's activity.
 * @param {object} effectData - The AE data.
 * @param {string} expiryReason - The reason why the AE was deleted.
 */
async function handleOffEffectAttacker(sourceActivity, effectData, expiryReason) {
  if (expiryReason === "midi-qol:zeroHP") {
    const targetDoc = await fromUuid(
      effectData?.changes.find((ch) => ch.key === `flags.${MODULE_ID}.oathbowSwornEnemy`)?.value
    );
    if ((targetDoc?.actor?.system.attributes?.hp?.value ?? 0) <= 0) {
      await sourceActivity?.update({
        "uses.recovery": [{ period: "dawn", type: "recoverAll" }],
      });
    }
  } else {
    // Or only allow in case of expiry... if (expiryReason === "times-up:expired") {
    await sourceActivity?.update({
      uses: { spent: 0, recovery: [] },
    });
  }
}
