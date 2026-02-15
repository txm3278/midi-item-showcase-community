// ##################################################################################################
// Read First!!!!
// Handles the ability to add a damage bonus when the conditions are met as well as the ability
// to make a bonus melee weapon attack when the actor scores a critical hit or brings a target to 0 HP with a melee weapon.
// v1.5.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This is a passive feat and an active feat. It adds an optional damage bonus when the conditions are met.
// After a weapon attack, it will also prompt to make a bonus attack if the conditions are met.
//
// Description:
// In the postRollFinished (OnUse) phase (on any owner's item other than Greater Weapon Master):
//   Validates that the workflow was not aborted, that item used is a melee weapon,
//   and it was a critical or at least one target was dropped to 0 HP,
//   then prompt the user to make a bonus attack with the same weapon.
//   If confirmed, enchants the current weapon to convert its activation type to bonus
//   then calls MidiQOL.completeActivityUse using the current used activity to make the bonus attack.
// ###################################################################################################

export async function greatWeaponMaster2024({
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
  // Default name of the item
  const DEFAULT_ITEM_NAME = "Great Weapon Master";
  const MODULE_ID = "midi-item-showcase-community";
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.10")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }
  if (args[0].tag === "OnUse" && args[0].macroPass === "postRollFinished") {
    if (scope.rolledItem?.uuid !== scope.macroItem.uuid && !workflow.aborted) {
      await handleOnUsePostRollFinishedOtherItems(workflow, scope.macroItem, scope.rolledItem);
    }
  }

  /**
   * If the item used is a melee weapon, and it was a critical or at least one target was dropped to 0 HP,
   * and the Bonus Action was not already used, grants an immediate special Bonus Attack.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Item5e} usedItem - The item used for the current workflow.
   */
  async function handleOnUsePostRollFinishedOtherItems(currentWorkflow, sourceItem, usedItem) {
    if (
      !elwinHelpers.isMeleeWeapon(usedItem) ||
      currentWorkflow.activity?.type !== "attack" ||
      currentWorkflow.activity?.attack?.type?.classification !== "weapon"
    ) {
      // Not an attack from a melee weapon...
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not an attack from a melee weapon.`);
      }
      return;
    }

    let allowBonusAction = currentWorkflow.isCritical;
    let reduceToZeroHp = false;
    if (!allowBonusAction && currentWorkflow.hitTargets.size > 0) {
      reduceToZeroHp = currentWorkflow.damageList?.some(
        (dmgItem) => dmgItem.wasHit && dmgItem.oldHP !== 0 && dmgItem.newHP === 0,
      );
      allowBonusAction = reduceToZeroHp;
    }
    const bonusActionAlreadyUsed = hasUsedBonusActionAndNeedsCheck(currentWorkflow);

    if (debug) {
      console.warn(DEFAULT_ITEM_NAME, {
        allowBonusAction,
        isCritical: currentWorkflow.isCritical,
        reduceToZeroHp,
        bonusActionAlreadyUsed,
      });
    }
    if (!allowBonusAction || bonusActionAlreadyUsed) {
      return;
    }
    const content = "<p>Make a special bonus attack?</p>";
    if (
      await foundry.applications.api.DialogV2.confirm({
        window: { title: `${sourceItem.name} - Hew` },
        content,
        defaultYes: true,
        modal: true,
        rejectClose: false,
      })
    ) {
      doBonusAttack(sourceItem, usedItem, currentWorkflow.activity.id);
    }
  }

  /**
   * Do a complete item use with the specified weapon but changing its attack activities activation
   * to special or bonus depending on the rules version.
   *
   * @param {Item5e} sourceItem - The Great Weapon Master item.
   * @param {Item5e} weaponItem - The weapon with which to attack.
   * @param {Activity} activityId - Id of the activity triggering bonus attack.
   */
  async function doBonusAttack(sourceItem, weaponItem, activityId) {
    let activity = weaponItem.system.activities.get(activityId);
    if (!activity) {
      // Invalid activity id.
      return;
    }

    // Change activation type to Bonus so it is not considered an Action
    const changes = [{ key: "name", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: `{} (Hew)` }];

    const enchantmentEffect = await elwinHelpers.enchantItemTemporarily(weaponItem, sourceItem, {
      activationType: "bonus",
      changes,
      activityRequirements: [
        {
          type: "attack",
          conditions: [{ key: "id", value: activityId }],
        },
      ],
    });
    if (!enchantmentEffect) {
      console.warn(`${DEFAULT_ITEM_NAME} | Could not enchant item ${weaponItem.name}.`);
      return false;
    }
    try {
      const config = {
        midiOptions: {
          ignoreUserTargets: true,
          workflowOptions: { autoRollAttack: true, targetConfirmation: "always" },
        },
      };
      // Get activity from enchantment parent to make sure the enchantment modifications have been applied.
      activity = enchantmentEffect.parent.system.activities.get(activityId);
      return await MidiQOL.completeActivityUse(activity, config);
    } finally {
      await enchantmentEffect.delete();
    }
  }

  /**
   * Verifies if the current actor has already used its Bonus Action and that it must be checked.
   *
   * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
   * @returns {boolean} true if actor is in combat and has used its bonus action and
   *     the midi-qol settings is set to enforce checks for Bonus Action.
   */
  function hasUsedBonusActionAndNeedsCheck(workflow) {
    return (
      !workflow.workflowOptions?.notBonusAction &&
      !!workflow.actor?.inCombat &&
      needsBonusActionCheck(workflow.actor) &&
      !!MidiQOL.hasUsedBonusAction(workflow.actor)
    );
  }

  /**
   * Returns true if midi-qol settings is set to enforce Bonus Action checks.
   *
   * @param {Actor5e} actor - The current actor.
   * @returns {boolean} true if the midi-qol settings are set to enforce Bonus Action check for this actor.
   */
  function needsBonusActionCheck(actor) {
    const configSettings = MidiQOL.configSettings();
    return configSettings?.enforceBonusActions === "all" || configSettings?.enforceBonusActions === actor.type;
  }
}
