// ##################################################################################################
// Monk - Way of the Astral Self - Arms of the Astral Self
// Summons spectral hands and adds a new attack to the Unarmed Strike weapon to use these arms instead.
// v2.3.0
// Author: Elwin#1410 based on Spoob
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[preAoETargetConfirmation],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item needs to be used to activate. When activated the selected targets around must succeed on a Dex save or
// take damage from the summoned spectral hands, a new activity is added to the Unarmed Strike to allow
// using the spectral arms to make an attack and an effect is added to use Wis modifier instead of Str modifier
// on Str ability checks and saves.
//
// Description:
// In the preAoETargetConfirmation phase of the Arms of the Astral Self Summon activity (in owner's workflow):
//   Filters the user's currently selected targets to only keep enemies that can be seen by the attacker.
// In the postActiveEffects phase of the Arms of the Astral Self Summon activity (in owner's workflow):
//   It applies an enchantement to the Unarmed Strike to add a new attack allowing to use the Spectral Hands
//  instead.
// In the preItemRoll phase of the Unarmed Strike Attack with Spectral Hands activity (in owner's workflow):
//   If it's the attacker's turn, increase the item and the activity reach.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Arms of the Astral Self";
const MODULE_ID = "midi-item-showcase-community";
const VISAGE_OF_ASTRAL_SELF_IDENT = "visage-of-the-astral-self";
const ATTACK_WITH_SPECTRAL_ARMS_IDENT = "attack-with-spectral-arms";
const UNARMED_STRIKE_IDENT = "unarmed-strike";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.2")) {
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

export async function armsOfTheAstralSelf({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    // Remove target that cannot be seen and only keep enemies by default
    if (scope.rolledActivity?.identifier === "summon") {
      if (args[0].macroPass === "preAoETargetConfirmation") {
        handleOnUsePreAoETargetConfirmation(token);
      } else if (args[0].macroPass === "postActiveEffects") {
        await handleOnUsePostActiveEffects(actor, workflow, scope, debug);
      }
    }
  } else if (args[0] === "each") {
    if (scope.lastArgValue?.turn === "startTurn") {
      // Extended reach is active on token turn
      await scope.effect.update({ disabled: false });
    } else if (scope.lastArgValue?.turn === "endTurn") {
      // Extended reach is only active on token turn
      await scope.effect.update({ disabled: true });
    }
  }
}

/**
 * Handles the on use pre AoE target confirmation phase of the Arms of the Astral Self of the Summon activity.
 * Filters the user's currently selected targets to only keep enemies that can be seen by the attacker.
 *
 * @param {Token5e} token - The token associated to the actor using the activity.
 */
function handleOnUsePreAoETargetConfirmation(token) {
  const targetIds = Array.from(game.user?.targets ?? [])
    .filter((t) => (token?.document?.disposition ?? 1) * t.document.disposition < 0 && MidiQOL.canSee(token, t))
    .map((t) => t.id);
  if (!game.user) {
    return;
  }
  canvas.tokens?.setTargets(targetIds);
}

/**
 * Handles the on use post active effects phase of the Arms of the Astral Self of the Summon activity.
 * It applies an enchantment to the Unarmed Strike to add a new attack allowing to use the Spectral Arms instead.
 *
 * @param {Actor5e} actor - The owner of the Arms of the Astral Self item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostActiveEffects(actor, workflow, scope, debug) {
  const selfEffect = actor.effects.find((a) => a.origin === scope.rolledActivity.uuid);
  if (!selfEffect) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Arms Of the Astral Self effect`, { workflow });
    return;
  }

  const unarmedStrike = actor.itemTypes.weapon.find((a) => a.identifier === UNARMED_STRIKE_IDENT);
  if (!unarmedStrike) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Unarmed Strike item`, { workflow });
    return;
  }

  const applyArmsActivity = scope.rolledItem.system.activities.find(
    (a) => a.identifier === "apply-arms-to-unarmed-strike",
  );
  if (!applyArmsActivity) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Apply Arms to Unarmed Strike activity.`, { workflow });
    return;
  }

  const enchantmentEffectData = applyArmsActivity.effects?.[0]?.effect.toObject();
  if (!enchantmentEffectData) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Apply Spectral Arms to Unarmed Strike enchantment effect.`, {
      workflow,
    });
    return;
  }
  // Make the enchantment dependent on self effect
  foundry.utils.setProperty(enchantmentEffectData, "flags.dnd5e.dependentOn", selfEffect.uuid);
  // Delete self effect when enchantment is deleted
  enchantmentEffectData.changes.push({ key: "flags.dae.deleteUuid", value: selfEffect.uuid });

  // Add enchantment to unarmed strike
  const enchantmentEffect = await elwinHelpers.applyEnchantmentToItemFromOtherActivity(
    workflow,
    applyArmsActivity,
    enchantmentEffectData,
    unarmedStrike,
  );
  if (!enchantmentEffect) {
    console.error(
      `${DEFAULT_ITEM_NAME} | Apply Spectral Arms enchantment effect could not be created.`,
      enchantmentEffectData,
    );
    return;
  }

  const extendReachEnchantmentEffectData = scope.rolledItem.effects
    .find(
      (ae) => ae.type === "enchantment" && ae.changes.some((c) => c.key === "system.activities.<id>.range.override"),
    )
    ?.toObject();
  if (!extendReachEnchantmentEffectData) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Spectral Arms - Extended Reach enchantment effect.`, { workflow });
    return;
  }
  extendReachEnchantmentEffectData.disabled = game.combat?.combatant.tokenId !== workflow.token?.id;
  extendReachEnchantmentEffectData.origin = applyArmsActivity.uuid;

  // Make the enchantment dependent on self effect
  foundry.utils.setProperty(extendReachEnchantmentEffectData, "flags.dnd5e.dependentOn", selfEffect.uuid);

  // Replace placeholder by Attack with Spectral Arms activity id
  let attackWithSpectralArmsActivity;
  let nbRetry = 5;
  while (!attackWithSpectralArmsActivity && nbRetry > 0) {
    attackWithSpectralArmsActivity = unarmedStrike.system.activities.find(
      (a) => a.identifier === ATTACK_WITH_SPECTRAL_ARMS_IDENT,
    );
    if (!attackWithSpectralArmsActivity) {
      nbRetry--;
      await wait(100);
    }
  }
  if (!attackWithSpectralArmsActivity) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing Attack with Spectral Arms activity.`, { workflow });
    return;
  }
  extendReachEnchantmentEffectData.changes.forEach((c) => {
    c.key = c.key.replace(/\.<id>\./, `.${attackWithSpectralArmsActivity.id}.`);
  });

  // Add enchantment to unarmed strike
  const [extendReachEnchantmentEffect] = await unarmedStrike.createEmbeddedDocuments("ActiveEffect", [
    extendReachEnchantmentEffectData,
  ]);
  if (!extendReachEnchantmentEffect) {
    console.error(
      `${DEFAULT_ITEM_NAME} | Extended Reach enchantment effect could not be created.`,
      enchantmentEffectData2,
    );
    return;
  }
  // Extended reach is only active on token turn
  if (game.combat?.combatant.tokenId !== workflow.token?.id) {
    extendReachEnchantmentEffect.update({ disabled: true });
  }

  let attAbility = "str";
  if (actor.system.abilities.dex.mod >= Math.max(actor.system.abilities.str.mod, actor.system.abilities.wis.mod)) {
    attAbility = "dex";
  } else if (
    actor.system.abilities.wis.mod >= Math.max(actor.system.abilities.str.mod, actor.system.abilities.dex.mod)
  ) {
    attAbility = "wis";
  } else if (
    actor.system.abilities.str.mod >= Math.max(actor.system.abilities.dex.mod, actor.system.abilities.wis.mod)
  ) {
    attAbility = "str";
  }
  await attackWithSpectralArmsActivity.update({
    "attack.ability": attAbility,
    "midiProperties.automationOnly": false,
    "damage.includeBase": false,
  });

  ui.notifications.notify("Attack with Spectral Arms added to Unarmed Strike.");

  // When summoned through Awakened Self, skip optional Summon of Visage of the Astral Self
  if (workflow.workflowOptions?.awakenedAstralSelf) {
    return;
  }

  await handleSummonVisage(actor, workflow, debug);
}

/**
 * Presents a dialog to choose if the Visage of the Astral Self should be summoned at the same time as the Arms.
 * @param {Activity} activity - The Summon Visage of Astral Self activity.
 * @param {number} nbUses - number of remaining uses.
 * @param {number} maxUses - maximum number of uses.
 * @returns {boolean} true if the Visage should also be summoned.
 */
async function showDialog(activity, nbUses, maxUses) {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: `${activity.item.name}` },
    content: `Use ${activity.item.name}: ${activity.name} (${nbUses}/${maxUses})?`,
    modal: true,
    rejectClose: false,
  });
}

/**
 * Handles summoning the Visage of Astral Self in the same bonus action as the Arms.
 *
 * @param {Actor5e} actor - The owner of the Arms of the Astral Self item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleSummonVisage(actor, workflow, debug) {
  // Ask to Summon Visage if present and of appropriate level
  const visageOfAstralSelfItem = actor.itemTypes.feat.find((i) => i.identifier === VISAGE_OF_ASTRAL_SELF_IDENT);
  if (!visageOfAstralSelfItem) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Monk does not have the ${VISAGE_OF_ASTRAL_SELF_IDENT} feature.`);
    }
    return;
  }
  if ((actor.getRollData().classes?.monk?.levels ?? 0) >= (visageOfAstralSelfItem.system.prerequisites?.level ?? 99)) {
    const visageOfAstralSelfActivity = visageOfAstralSelfItem.system.activities?.find((a) => a.identifier === "summon");
    if (!visageOfAstralSelfActivity) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | Could not find valid the summon activity for ${visageOfAstralSelfItem.name}.`,
      );
      return;
    }
    const { value: nbUses, max: maxUses } = actor.items.get(visageOfAstralSelfActivity.consumption?.targets[0]?.target)
      ?.system.uses ?? { value: 0, max: 0 };

    if (nbUses <= 0) {
      // No uses available cannot summon visage
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No uses available, cannot summon visage.`, {
          item: scope.rolledItem,
          visageOfAstralSelfActivity,
        });
      }
      return;
    }
    const summonVisage = await showDialog(visageOfAstralSelfActivity, nbUses, maxUses);
    if (!summonVisage) {
      return;
    }

    let player = MidiQOL.playerForActor(actor);
    if (!player?.active) {
      // Find first active GM player
      player = game.users?.activeGM;
    }
    if (!player?.active) {
      console.warn(`${DEFAULT_ITEM_NAME} | No active player or GM for actor.`, actor);
      return;
    }

    // Create and apply an enchantment to change the summon activity action type
    const enchantmentEffect = await enchantSpecialItem(visageOfAstralSelfItem, visageOfAstralSelfActivity);
    const config = {
      midiOptions: {
        targetUuids: [workflow.tokenUuid],
        workflowOptions: { targetConfirmation: "none", autoConsumeResource: "both" },
      },
    };

    const dialog = {
      configure: false,
    };

    // Register hook to summmon visage after roll is complete
    Hooks.once(`midi-qol.RollComplete.${workflow.itemUuid}`, async (workflow2) => {
      try {
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            "midi-qol.RollComplete",
            visageOfAstralSelfItem.name,
            workflow,
            workflow2,
            debug,
          )
        ) {
          return;
        }
        await MidiQOL.completeActivityUse(visageOfAstralSelfActivity, config, dialog);
      } finally {
        enchantmentEffect.delete();
      }
    });
  }
}

/**
 * Enchants the specified item to change the activation type of its activities to special
 * for the specified activity types.
 *
 * @param {Item5e} item - The item to enchant.
 * @param {Item5e} source - The source of the enchantment.
 * @param {string[]} activityTypes - The activity for which the activation type must be changed to special (default CONFIG.DND5E.activityTypes).
 *
 * @returns {ActiveEffect} the created enchantment effect.
 */
async function enchantSpecialItem(item, source, activityTypes = CONFIG.DND5E.activityTypes) {
  // Change activation type to special so it is not considered as an Attack Action
  const effectData = {
    name: source.name,
    img: "icons/magic/time/arrows-circling-green.webp",
    type: "enchantment",
    changes: Object.keys(activityTypes)
      .flatMap((activityType) => [
        {
          key: `activities[${activityType}].activation.type`,
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: "special",
          priority: 20,
        },
      ])
      .concat([
        {
          key: "system.activation.type",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: "special",
          priority: 20,
        },
      ]),
    transfer: false,
    duration: {
      seconds: 1,
      turns: 1,
    },
    origin: source.uuid,
    "flags.dae.stackable": "noneName",
  };
  foundry.utils.setProperty(effectData, `flags.${MODULE_ID}.identifier`, "arms-of-astral-self");
  const [effect] = await item.createEmbeddedDocuments("ActiveEffect", [effectData]);
  return effect;
}

/**
 * Wait for the specified number of milliseconds.
 *
 * @param {number} ms number of ms to wait.
 */
async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
