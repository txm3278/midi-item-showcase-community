// ##################################################################################################
// Read First!!!!
// Marks a target for Ancestral Protectors, and handles the behavior on the marked target.
// v3.3.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up (if Foundry version < v14)
//  - MidiQOL "on use" actor macro [postAttackRoll][postDamageRoll]
//  - Elwin Helpers world script
//
// Usage:
// The feature is a passive one that is always active and but it apply its effects only when it's appropriate.
// One prerequisite is that the Barbarian must be in Rage, combat must be started and it must be its turn for
// the effects to be applied.
//
// Description:
// In the postAttackRoll phase (of any activity used by the Barbarian):
//   The macro validates that the actor initiating the activity is in Rage, that no target was already marked and
//   if in combat that it's the combatant turn. If that's the case, then an effect is added to the target
//   to mark it and handle any attack from this marked target to any other target than the one that marked it.
// In the postDamageRoll phase (of any activity used by the target marked by the Barbarian):
//   If there is at least one hit target and there is an attack roll, adds an effect with damage resistance to all
//   to any target that is not the marker.
// ###################################################################################################

const DEFAULT_ITEM_NAME = "Ancestral Protectors";
const MODULE_ID = "midi-item-showcase-community";
const RAGE_ITEM_IDENT = "rage";

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
  const dependencies = ["dae", "midi-qol"];
  if (game.release.generation < 14) {
    dependencies.push("times-up");
  }
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function ancestralProtectors({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postAttackRoll") {
    // Attack was done by the Barbarian
    await handlePostAttackByBarbarian(workflow, actor, scope.macroItem, debug);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postDamageRoll") {
    if (actor.getFlag(MODULE_ID, "ancestralProtectors.sourceTokenUuid")) {
      // Damage was done by the marked target
      await handlePostDamageByMarkedTarget(workflow, token, scope.macroItem, debug);
    }
  }
}

/**
 * When the barbarian hits a target. Adds effect on target and on itself if the conditions are met.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {Actor} actor - The current actor.
 * @param {Item} sourceItem - The Ancestral Protectors item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handlePostAttackByBarbarian(workflow, actor, sourceItem, debug) {
  if (!workflow.hitTargets.size) {
    // The Barbarian must hit
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No hit targets.`);
    }
    return;
  }
  const rage = actor.itemTypes.feat.find((i) => i.identifier === RAGE_ITEM_IDENT);
  const rageEffect = rage
    ? actor.appliedEffects?.find((ae) => !ae.transfer && ae.origin?.startsWith(rage.uuid))
    : undefined;
  if (!rageEffect) {
    // The Barbarian must be in Rage
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Not in Rage.`);
    }
    return;
  }

  if (actor.getFlag(MODULE_ID, "ancestralProtectors.targetUuid")) {
    // There is already a marked target
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | A target as already been marked.`);
    }
    return;
  }

  if (workflow.isCombat && !workflow.isTurn) {
    // Can only be activated on combatant turn's
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | When in combat it must be the combatant turn's`);
    }
    return;
  }

  if (debug) {
    console.warn(`${DEFAULT_ITEM_NAME} | Applied on target`, workflow);
  }

  const targetToken = workflow.hitTargets.first();
  const targetUuid = targetToken.document.uuid;
  const targetActor = targetToken.actor;

  // create an active effect to set the target of the item
  const effectData = {
    changes: [
      // who is marked
      {
        key: `flags.${MODULE_ID}.ancestralProtectors.targetUuid`,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: targetUuid,
        priority: 20,
      },
    ],
    transfer: false,
    origin: sourceItem.uuid, //flag the effect as associated to the source item used
    disabled: false,
    img: sourceItem.img,
    name: `${sourceItem.name} - Target`,
    "flags.dae.stackable": "noneName",
    // Make source effect dependent on rage effect
    "flags.dnd5e.dependentOn": rageEffect.uuid,
    duration: game.release.generation >= 14 ? { expiry: "sourceStart" } : { rounds: 1, turns: 0 },
  };

  // create an active effect on target
  const targetEffectData = {
    changes: [
      // flag to set disadvantage on attack made by marked target if not on marker
      {
        key: "flags.midi-qol.disadvantage.attack.all",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: `targetUuid !== "@tokenUuid"`,
        priority: 20,
      },
      // macro to set damage resistance or not
      {
        key: "flags.midi-qol.onUseMacroName",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: `ItemMacro,postDamageRoll`,
        priority: 20,
      },
      // flag to indicate who marked this actor
      {
        key: `flags.${MODULE_ID}.ancestralProtectors.sourceTokenUuid`,
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: workflow.tokenUuid,
        priority: 20,
      },
    ],
    transfer: false,
    origin: sourceItem.uuid, // flag the effect as associated to the source item used
    duration: foundry.utils.deepClone(effectData.duration),
    img: sourceItem.img,
    name: `Marked by ${sourceItem.name}`,
    "flags.dae.stackable": "noneName",
    // Make target effect dependent on rage effect
    "flags.dnd5e.dependentOn": rageEffect.uuid,
  };
  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  await MidiQOL.createEffects({ actorUuid: targetActor.uuid, effects: [targetEffectData] });
}

/**
 * When a marked target deals damage. Adds damage resistance to the target if the damage was caused by an attack
 * and the target is not the marker.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {Token} token - The token associated with the current actor.
 * @param {Item} sourceItem - The Ancestral Protectors item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handlePostDamageByMarkedTarget(workflow, token, sourceItem, debug) {
  if (!workflow.hitTargets.size) {
    // There must be at least one hit target
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No hit targets.`);
    }
    return;
  }
  if (!workflow.attackRoll) {
    // The damage must be from an attack
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No attack roll for this damage.`);
    }
    return;
  }

  const sourceTokenUuid = token.actor.getFlag(MODULE_ID, "ancestralProtectors.sourceTokenUuid");
  const notSourceTargets = workflow.hitTargets.filter((target) => target.uuid !== sourceTokenUuid);
  if (notSourceTargets.length === 0) {
    // Target is the source of the mark, no penalties
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Target is the source of the mark.`);
    }
    return;
  }

  if (debug) {
    console.warn(
      `${DEFAULT_ITEM_NAME} | Damage resistance applied to targets for not beeing the marker of the attacker`,
      workflow,
      notSourceTargets,
    );
  }
  // create an active effect on targets
  const targetEffectData = {
    changes: [
      // flag for damage resistance
      {
        key: "system.traits.dr.all",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: "1",
        priority: 20,
      },
    ],
    origin: sourceItem.uuid, //flag the effect as associated to the source item used
    img: sourceItem.img,
    name: `${sourceItem.name} - ${game.i18n.localize("DND5E.TraitDRPlural.one")}`,
    transfer: false,
    duration: game.release.generation >= 14 ? { expiry: "turnEnd" } : { turns: 1 },
    flags: { dae: { stackable: "noneName", specialDuration: ["isDamaged"] } },
  };

  for (let target of notSourceTargets) {
    const targetActor = target.actor;
    await MidiQOL.createEffects({ actorUuid: targetActor.uuid, effects: [targetEffectData] });
  }
}
