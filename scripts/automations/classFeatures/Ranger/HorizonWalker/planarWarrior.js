// ##################################################################################################
// Read First!!!!
// Marks a target for Planar Warrior damage, and replaces the damage type of the weapon used by the first attack that
// hits before the end of the round by force damage.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" macro [postActiveEffects],[preDamageRollConfig]
//  - Elwin Helpers
//
// Horizon Walker Subclass:
//   Must add a scaling factor into the 'Horizon Walker' subclass advancements:
//    - Enable configuration in the advancement tab
//    - Add a new Scale Value advancement
//    - Change scale type to dice
//    - Add 1d8 at level 3 and 2d8 at level 11
//    - Add "planar-warrior" into the identifier field
//   The resulting data value should resolve to '@scale.horizon-walker.planar-warrior'.

//
// Usage:
// This feature needs to be used to activate. When activated the target is marked and the next time the
// target is hit with a weapon attack the effect will be applied.
//
// Description:
// In the postActiveEffects phase of the Planar Warrior Mark activity (in owner's workflow):
//   It updates the effect that was added to the actor activating the item, this effect contains
//   a flag to identify the target and an onUseMacroMacro that will callback this ItemMacro on preDamageRoll.
// In the preDamageRollConfig phase of any owner's item activity (in owner's workflow):
//   The first time that an attack hits and the damage is rolled, the macro validates if the activity used
//   for the attack is a weapon attack and if the target is valid for this activity.
//   If valid, calls elwinHelpers.damageConfig.updateBasic
//   to add a hook on dnd5e.preRollDamage that converts damage type and adds damage bonus.
// ###################################################################################################

const DEFAULT_ITEM_NAME = "Planar Warrior";
const NEW_DAMAGE_TYPE = "force";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.10")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function planarWarrior({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(workflow, actor);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preDamageRollConfig") {
    await handlePreDamageRollConfig(workflow, scope, actor, scope.macroItem, debug);
  }
}

/**
 * Handles the postActiveEffects phase of the Planar Warrior item.
 * Updates the active effect added by the item with the target information and a hook to delete
 * the marked effect on the target when the self effect is deleted.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor5e} actor - The actor using the item.
 */
async function handleOnUsePostActiveEffects(workflow, actor) {
  // Adds active effects on source of this item, those on the target are applied by MidiQOL

  if (!workflow.effectTargets?.size) {
    return; // target needed
  }

  const target = workflow.effectTargets.first();
  const selfEffect = actor.effects?.find((ae) => ae.origin === workflow.activity?.uuid);
  const markedEffect = target?.actor.effects?.find((ae) => ae.origin?.startsWith(workflow.item.uuid));
  if (!(selfEffect && markedEffect)) {
    // Missing AEs
    return;
  }

  // Update targetUuid on self effect with the current target uuid.
  let newChanges = foundry.utils.deepClone(selfEffect.changes);
  const change = newChanges.find((ch) => ch.key === `flags.${MODULE_ID}.planarWarrior.targetUuid`);
  if (change) {
    change.value = target.document.uuid;
  }
  // Delete marked effect when self effect is deleted
  newChanges.push({ key: "flags.dae.deleteUuid", value: markedEffect.uuid });
  // Update changesand make the self effect dependent on marked effect, so it's deleted when the marked effect is.
  await selfEffect.update({ "flags.dnd5e.dependentOn": markedEffect.uuid, changes: newChanges });
}

/**
 * Handles the preDamageRollConfig phase of the Planar Warrior item.
 * Validates if the current workflow is valid for the item effect to be applied, if so updates the damage roll config
 * to replace damage type with force and add the damage bonus.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Object} scope - The macro call scope.
 * @param {Actor5e} actor - The actor using the item.
 * @param {Item5e} sourceItem - The Planar Warrior item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handlePreDamageRollConfig(workflow, scope, actor, sourceItem, debug) {
  // Validates if target is valid for the attack and replaces damage type if thats the case
  if (!actor.getFlag(MODULE_ID, "planarWarrior.targetUuid")) {
    // There was a problem, the hook was set but the never called while the item was active
    return;
  }

  if (!isValidTarget(workflow)) {
    return;
  }

  // Set default damage type
  workflow.defaultDamageType = NEW_DAMAGE_TYPE;
  elwinHelpers.damageConfig.updateBasic(scope, workflow, {
    damageBonus: "+@scale.horizon-walker.planar-warrior",
    newDamageType: NEW_DAMAGE_TYPE,
    flavor: sourceItem.name,
    id: sourceItem.id,
    debug,
  });
}

/**
 * Returns true if the worflow item and target are valid for the item effect to be applied.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @returns {boolean} true if item and target are valid, false otherwise.
 */
function isValidTarget(workflow) {
  // only hits
  if (!workflow.hitTargets.size) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Can only be applied on a hit`);
    }
    return false;
  }

  // only weapon attacks (this includes natural weapons and unarmed)
  if (
    !workflow.activity?.hasAttack ||
    !["mwak", "rwak"].includes(workflow.activity?.getActionType(workflow.attackMode))
  ) {
    return false;
  }

  const targetUuid = workflow.hitTargets.first().document.uuid;
  // only on the marked target
  if (targetUuid !== workflow.actor.getFlag(MODULE_ID, "planarWarrior.targetUuid")) {
    return false;
  }
  return true;
}
