// ##################################################################################################
// Author: Elwin#1410
// Applies the Medusa effect to the attacker or target depending on the attack roll.
// v1.0.0
// Dependencies:
//  - DAE [on]
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "on use" actor macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// When an attack is made with this item, applies the Medusa effect to the attacker or
// target depending on the attack roll.
//
//
// Description:
// In the postActiveEffects (item OnUse) phase of the use activity (in owner's workflow):
//   Depending of the attack roll use the Medusa Effect activity on the target (if it can be affected) or
//   the attacker to apply the item's special effect.
// In the "on" DAE macro call:
//   If the cursed status effect is not present, adds it to the actor.
// In the "replacement" of Overtime macro call:
//   Adds the petrified status effect to actor affected by the item's Overtime effect.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Blade of Medusa";
const MODULE_ID = "midi-item-showcase-community";
const TARGET_TRIGGER_VALUE = 20;
const ATTACKER_TRIGGER_VALUE = 1;

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (foundry.utils.isNewerVersion("3.6.0", globalThis?.elwinHelpers?.version ?? "1.1")) {
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

export async function bladeOfMedusa({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!checkDependencies()) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(workflow, token, scope, debug);
  } else if (args[0] === "on") {
    // Note: ideally should be when attuned, but DAE does not have a specific event for this
    if (!actor.getFlag(MODULE_ID, "bladeOfMedusaCurse")) {
      const statusEffect = await ActiveEffect.implementation.fromStatusEffect("cursed");
      if (!statusEffect) {
        console.error(`${DEFAULT_ITEM_NAME} | Missing cursed status effect.`);
        return;
      }
      const effectData = statusEffect.toObject();
      effectData.origin = item?.uuid; // flag the effect as associated to the source item used
      effectData.changes.push({
        key: `flags.${MODULE_ID}.bladeOfMedusaCurse`,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: true,
      });
      if (game.release.generation >= 14) {
        effectData.showIcon = CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER;
      }
      foundry.utils.setProperty(effectData, "flags.dnd5e.dependentOn", item?.uuid);
      await MidiQOL.createEffects({ actorUuid: actor.uuid, effects: [effectData], options: { keepId: true } });

      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    }
  } else if (args[0].reason === "replacementEffect") {
    // When the overtime failCount is reached
    const statusEffect = await ActiveEffect.implementation.fromStatusEffect("petrified");
    if (!statusEffect) {
      return;
    }
    const effectData = statusEffect.toObject();
    effectData.origin = item?.uuid;
    // End the effect after 1 hour
    effectData.duration = { seconds: 1 * 60 * 60 };
    await MidiQOL.createEffects({ actorUuid: actor.uuid, effects: [effectData], options: { keepId: true } });
  }
}

/**
 * Handles the on use post active effects phase of Blade of Medusa's Attack activity.
 * Depending of the attack roll use the Medusa Effect activity on the target (if it can be affected) or
 * the attacker to apply the item's special effect.
 * 
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {Token} token - The token associated with the current actor.
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {Promise<void>}
 */
async function handleOnUsePostActiveEffects(workflow, token, scope, debug) {
  const effectTriggeredOnTarget =
    scope.rolledActivity?.hasAttack &&
    workflow.hitTargets.size &&
    workflow.attackRoll?.d20?.total >= TARGET_TRIGGER_VALUE;
  const effectTriggeredOnAttacker =
    scope.rolledActivity?.hasAttack && workflow.attackRoll?.d20?.total <= ATTACKER_TRIGGER_VALUE;
  if (!effectTriggeredOnTarget && !effectTriggeredOnAttacker) {
    // Not a valid trigger for target or attacker
    return;
  }
  if (effectTriggeredOnTarget) {
    const target = workflow.hitTargets.first();
    // Note: there is no easy way to determine if target made of flesh, best we can do is check for petrified immunity,
    // the GM will have to remove it if it does not apply.
    const targetTraits = target.actor?.system.traits;
    const hasLegendaryActions = !!target.actor?.system.resources?.legact?.max;
    if (
      hasLegendaryActions ||
      targetTraits?.ci.value.has("petrified") ||
      workflow.damageRolls?.every((d) => targetTraits?.di.value.has(d.options?.type ?? workflow.defaultDamageType))
    ) {
      // Not affected
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Target not affected by effect.`, {
          target,
          damageRolls: workflow.damageRolls,
        });
      }
      return;
    }
  }
  const activity = scope.rolledItem.system.activities.find((a) => a.identifier === "medusa-effect");
  if (!activity) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing activity "medusa-effect".`, { sourceItem: scope.rolledItem });
    return;
  }
  const config = {
    midiOptions: {
      targetUuids: [effectTriggeredOnTarget ? workflow.hitTargets.first().document.uuid : token.document.uuid],
    },
  };
  // Register hook to apply medusa effect after roll is complete
  Hooks.once(`midi-qol.RollComplete.${workflow.itemUuid}`, async (workflow2) => {
    if (
      !elwinHelpers.isMidiHookStillValid(
        DEFAULT_ITEM_NAME,
        "midi-qol.RollComplete",
        scope.macroItem.name,
        workflow,
        workflow2,
        debug,
      )
    ) {
      return;
    }
    await MidiQOL.completeActivityUse(activity, config);
  });
}
