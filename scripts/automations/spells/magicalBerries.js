// ##################################################################################################
// Read First!!!!
// Magical Berries created by the Goodberry spell.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [preTargeting],[preItemRoll],[postActiveEffects]
//  - Elwin Helpers world script
//  - About Time (optional)
//  - Rest Recovery for 5E (optional)
//
// Localization:
//   To localize the texts used by this item, you can either changed the content found in the initLocalization() function
//   of this macro, or add a world script that populates game.i18n.translations with the appropriates keys.
//   Values from existing keys will be used instead of using the values from initLocalization().
//   Note: the created item uses the same name as the spell, so localize it to change the spell name.
//   Keys to define with their corresponding localized texts:
//      world.dnd5e.spells.goodberry.expirationOnUseWarn: Warning displayed in a notification when using
//                                                        an expired goodberry consumable.
//      world.dnd5e.spells.goodberry.expirationEventWarn: Chat message text displayed when using
//                                                        an expired goodberry consumable.
//
// Usage:
// This item needs to be used to activate. When activated, it heals the target.
//
// Description:
// In the preTargeting phase of Magical Berries item (owner's workflow):
//   Verifies if the batch has expired, and if it's the case, deletes the batch and cancels the item use.
//   If About Time is active, it verifies if the actorUuid from the event is the same as the one that used
//   the item, if not, a new event is added to delete the item from the current actor.
// In the preItemRoll phase of Magical Berries item (owner's workflow):
//   Forces auto rolling damage because it's a fixed value, so no dice rolling.
//   If the activity is Feed to Other, and the target is not the owner of the berry, setup of hook on "dnd5e.preUseActivity" and "dnd5e.activityConsumption".
// In the "dnd5e.preUseActivity" hook:
//   If called during the same workflow execution, sets to null the item subtype to prevent the Rest Recovery
//   consumable info, because it will be handled in the postActiveEffects phase instead of the Rest Recovery module.
// In the "dnd5e.activityConsumption" hook:
//   If called during the same workflow execution, saves the updates and the current item.
//   This info is used to process the effects of the berries on the target.
// In the postActiveEffects phase of Magical Berries - Feed to Other (owner's workflow):
//   If the target is not the owner of the berry and Rest Recovery is active and the food and water setting is enabled,
//   applies the same logic of food and water consumption as the Rest Recovery module but on the target other
//   then the owner.
//
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Magical Berries";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.12")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function magicalBerries({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
    return await handlePreTargeting(workflow);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preItemRoll") {
    return await handlePreItemRoll(workflow, debug);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (scope.rolledActivity?.identifier === "feed-to-other") {
      await handlePostActiveEffects(workflow);
    }
  }
}

/**
 * Deletes expired magical berries creatd by Goodberry from an actor.
 *
 * @param {string} actorUuid UUID of actor for which to process expired magical berries.
 * @param {string} goodberryExpirationEventWarn Warning message to be displayed in chat if some berries were deleted.
 * @return {Promise<void>}
 */
export async function deleteMagicalBerries(actorUuid, goodberryExpirationEventWarn) {
  const MODULE_ID = "world";
  const tokenOrActor = await fromUuid(actorUuid);
  let actor;
  if (tokenOrActor instanceof CONFIG.Token.documentClass) {
    actor = tokenOrActor.actor;
  }
  if (tokenOrActor instanceof CONFIG.Actor.documentClass) {
    actor = tokenOrActor;
  }
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;
  const itemsToDelete = actor.itemTypes.consumable.filter(
    (it) =>
      foundry.utils.getProperty(it, `flags.${MODULE_ID}.goodberry.expirationTime`) &&
      now >= foundry.utils.getProperty(it, `flags.${MODULE_ID}.goodberry.expirationTime`),
  );
  if (itemsToDelete.length > 0) {
    const deletedItems = await actor.deleteEmbeddedDocuments(
      "Item",
      itemsToDelete.map((it) => it.id),
    );
    let whisperTo = [];
    const player = MidiQOL.playerForActor(actor);
    if (player) {
      whisperTo.push(player);
    }
    await ChatMessage.create({
      user: game.user?.id,
      speaker: { scene: game.canvas.scene?.id, alias: game.user?.name, user: game.user?.id },
      content: goodberryExpirationEventWarn + " " + deletedItems.map((it) => it.name).join(),
      whisper: whisperTo.map((u) => u.id),
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }
}

/**
 * Initializes the i18n texts used by this item.
 *
 * @returns {object} The i18n keys to use with `game.i18n.localize` and `game.i18n.format`.
 */
function initLocalization() {
  const i18nPrefix = "world.dnd5e.spells.goodberry";
  const i18nKeys = {
    expirationOnUseWarn: i18nPrefix + ".expirationOnUseWarn",
    expirationEventWarn: i18nPrefix + ".expirationEventWarn",
  };
  // Note: use a flag to only setup i18n data once
  if (foundry.utils.getProperty(globalThis, i18nPrefix + ".i18n")) {
    return i18nKeys;
  }
  // Text used for the created goodberry consumable and expiration warning messages.
  // Note: you can update these text to localize it or add a world script that will localize the texts,
  // by adding the i18nKeys and their corresponding texts into game.i18n.translations.
  const i18nData = {
    expirationOnUseWarn: "The berries lost their potency and vanish",
    expirationEventWarn: "Some berries lost their potency and vanish from {actorName}:",
  };

  const existingData = foundry.utils.getProperty(game.i18n.translations, i18nPrefix) ?? {};
  foundry.utils.setProperty(
    game.i18n.translations,
    i18nPrefix,
    foundry.utils.mergeObject(existingData, i18nData, { overwrite: false }),
  );
  foundry.utils.setProperty(globalThis, i18nPrefix + ".i18n", true);

  return i18nKeys;
}

/**
 * Handles the preTargeting phase of the workflow. Validates that the good berries are not expired, when expired the workflow
 * is cancelled and the berries are delete. If About Time is active, it registers a call back to delete the berries when they expire.
 * If there are no selected targets and the current midi setting does not allow late targeting, it selects the actor's token and
 * setup a hook on midi-qol.RollComplete to unselect it after.
 *
 * @param {MidiQOL.Workflow} workflow The current workflow.
 * @returns {Promise<boolean>} true if the workflow should continue, false otherwise.
 */
async function handlePreTargeting(workflow) {
  const i18nGoodberry = initLocalization();
  const expirationTime = foundry.utils.getProperty(workflow.item, `flags.${MODULE_ID}.goodberry.expirationTime`) ?? 0;
  if (game.time.worldTime >= expirationTime) {
    ui.notifications.warn(game.i18n.localize(i18nGoodberry.expirationOnUseWarn));
    await workflow.item.delete();
    return false;
  }
  // When about time is present, register a callback to delete the item when it expires if not already registered
  if (game.modules.get("about-time")?.active) {
    if (workflow.item.getFlag(MODULE_ID, "goodberry")?.actorUuid !== workflow.actor.uuid) {
      const eventId = abouttime.doAt(
        expirationTime,
        deleteMagicalBerries,
        workflow.actor.uuid,
        game.i18n.format(i18nGoodberry.expirationEventWarn, { actorName: workflow.actor.name }),
      );
      const goodberryEvent = { expirationTime: expirationTime, eventId: eventId, actorUuid: workflow.actor.uuid };
      await workflow.item.setFlag(MODULE_ID, "goodberry", goodberryEvent);
    }
  }
  return true;
}

/**
 * Handles the preItemRoll phase of the workflow. If the target is not the one that used the item and
 * Rest Recovery is active, sets the proper hooks to handle the benefits of the consumption on the target.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {Promise<void>}
 */
async function handlePreItemRoll(workflow, debug) {
  // Note: we auto roll because the healing is a fixed value.
  foundry.utils.setProperty(workflow.workflowOptions, "autoRollDamage", "always");

  if (workflow.activity?.identifier === "feed-to-other" && workflow.targets.first()?.id !== workflow.token.id) {
    if (
      game.modules.get("rest-recovery")?.active &&
      foundry.utils.getProperty(workflow.item, "flags.rest-recovery.data.consumable") &&
      game.settings.get("rest-recovery", "enable-food-and-water")
    ) {
      // Prevent Rest Recovery to apply to owner of item
      Hooks.once("dnd5e.preUseActivity", (activity, usageConfig, _, __) => {
        const activityWorkflow = usageConfig.workflow;
        if (
          !elwinHelpers.isMidiHookStillValid(
            activity.item?.name,
            "dnd5e.preUseActivity",
            activity.name,
            workflow,
            activityWorkflow,
            debug,
          )
        ) {
          return;
        }
        foundry.utils.setProperty(activity.item, "system.type.subtype", null);
      });

      // Register hook to keep handle usage consumption, we need to keep the usage info in the useItem hook
      Hooks.once("dnd5e.activityConsumption", (activity, usageConfig, _, updates) => {
        const activityWorkflow = usageConfig.workflow;
        if (
          !elwinHelpers.isMidiHookStillValid(
            activity.item?.name,
            "dnd5e.activityConsumption",
            activity.name,
            workflow,
            activityWorkflow,
            debug,
          )
        ) {
          return;
        }
        // Keep usage updates in current workflow with current item, because the item will possibly
        // be updated before the postActiveEffects phase is called.
        workflow.workflowOptions.magicalBerriesItem = { origItem: activity.item?.toObject(), updates };
      });
    }
  }
}

/**
 * Handles postActiveEffects phase of the workflow. If Rest Recovery is active and food and water setting is enabled,
 * also handles food or food and water consumption for an actor other than the owner of the good berry.
 * This duplicates some code from Rest Recovery because it doesn't currently support it.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @returns {Promise<void>}
 */
async function handlePostActiveEffects(workflow) {
  const targetToken = workflow.targets?.first();
  if (!targetToken) {
    return;
  }
  if (
    !(
      targetToken.id !== workflow.token.id &&
      game.modules.get("rest-recovery")?.active &&
      foundry.utils.getProperty(workflow.item, "flags.rest-recovery.data.consumable") &&
      game.settings.get("rest-recovery", "enable-food-and-water")
    )
  ) {
    return;
  }

  // Handle consumption by target different than owner of item
  const [actorUpdates, message] = getActorConsumableUpdates(
    workflow.workflowOptions.magicalBerriesItem?.origItem ?? {},
    workflow.workflowOptions.magicalBerriesItem?.updates?.item?.find((data) => data._id === workflow.item.id) ?? {},
    targetToken.actor,
  );

  if (!foundry.utils.isEmpty(actorUpdates)) {
    await socketlib.modules.get("dae")?.executeAsGM("_updateActor", {
      actorUuid: targetToken.actor.uuid,
      update: actorUpdates,
    });
  }

  if (message) {
    await ChatMessage.implementation.create({
      flavor: "Rest Recovery",
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: workflow.actor }),
      content: message,
    });
  }
}

//
// The following functions were copied from Rest Recovery because they are not exported in its API
//
function getActorConsumableUpdates(item, data, consumingActor) {
  const consumable = foundry.utils.getProperty(item, "flags.rest-recovery.data.consumable");

  const actorUpdates = {};

  let { actorRequiredFood, actorRequiredWater, actorFoodSatedValue, actorWaterSatedValue } =
    getActorConsumableValues(consumingActor);

  const oldSpent = foundry.utils.getProperty(item, "system.uses.spent");
  const newSpent = foundry.utils.getProperty(data, "system.uses.spent") ?? oldSpent + 1;
  const oldQuantity = foundry.utils.getProperty(item, "system.quantity");
  const newQuantity = foundry.utils.getProperty(data, "system.quantity") ?? oldQuantity - 1;
  let chargesUsed = newSpent > oldSpent ? newSpent - oldSpent : oldQuantity - newQuantity;
  if (isNaN(chargesUsed)) {
    chargesUsed = 1;
  }

  let message;

  if (item.system.type?.subtype === "both") {
    actorUpdates["flags.rest-recovery.data.sated.food"] = consumable.dayWorth
      ? actorFoodSatedValue
      : actorFoodSatedValue + chargesUsed;
    actorUpdates["flags.rest-recovery.data.sated.water"] = consumable.dayWorth
      ? actorWaterSatedValue
      : actorWaterSatedValue + chargesUsed;

    const localize = "REST-RECOVERY.Chat.ConsumedBoth" + (consumable.dayWorth ? "DayWorth" : "");
    message =
      "<p>" +
      game.i18n.format(localize, {
        actorName: consumingActor.name,
        itemName: item.name,
        charges: chargesUsed,
      }) +
      "</p>";

    if (!consumable.dayWorth) {
      message +=
        actorUpdates["flags.rest-recovery.data.sated.food"] >= actorRequiredFood
          ? "<p>" + game.i18n.localize("REST-RECOVERY.Chat.SatedFood") + "</p>"
          : "<p>" +
            game.i18n.format("REST-RECOVERY.Chat.RequiredSatedFood", {
              units: actorRequiredFood - actorUpdates["flags.rest-recovery.data.sated.food"],
            }) +
            "</p>";
      message +=
        actorUpdates["flags.rest-recovery.data.sated.water"] >= actorRequiredWater
          ? "<p>" + game.i18n.localize("REST-RECOVERY.Chat.SatedWater") + "</p>"
          : "<p>" +
            game.i18n.format("REST-RECOVERY.Chat.RequiredSatedWater", {
              units: actorRequiredWater - actorUpdates["flags.rest-recovery.data.sated.water"],
            }) +
            "</p>";
    }
  } else if (item.system.type?.subtype === "food") {
    actorUpdates["flags.rest-recovery.data.sated.food"] = consumable.dayWorth
      ? 100000000000
      : actorFoodSatedValue + chargesUsed;

    const localize = "REST-RECOVERY.Chat.ConsumedFood" + (consumable.dayWorth ? "DayWorth" : "");
    message =
      "<p>" +
      game.i18n.format(localize, {
        actorName: consumingActor.name,
        itemName: item.name,
        charges: chargesUsed,
      }) +
      "</p>";

    message +=
      actorUpdates["flags.rest-recovery.data.sated.food"] >= actorRequiredFood
        ? "<p>" + game.i18n.localize("REST-RECOVERY.Chat.SatedFood") + "</p>"
        : "<p>" +
          game.i18n.format("REST-RECOVERY.Chat.RequiredSatedFood", {
            units: actorRequiredFood - actorUpdates["flags.rest-recovery.data.sated.food"],
          }) +
          "</p>";
  }
  // Note: type water only not supported

  return [actorUpdates, message];
}

function getActorConsumableValues(actor) {
  const actorFoodSatedValue = foundry.utils.getProperty(actor, "flags.rest-recovery.data.sated.food") ?? 0;
  const actorWaterSatedValue = foundry.utils.getProperty(actor, "flags.rest-recovery.data.sated.water") ?? 0;

  const actorNeedsNoFoodWater = foundry.utils.getProperty(actor, "flags.dnd5e.noFoodWater");
  const actorNeedsNoFood = foundry.utils.getProperty(actor, "flags.dae.rest-recovery.force.noFood");
  const actorNeedsNoWater = foundry.utils.getProperty(actor, "flags.dae.rest-recovery.force.noWater");

  const foodUnitsSetting = game.settings.get("rest-recovery", "food-units-per-day");
  const actorRequiredFoodUnits =
    foundry.utils.getProperty(actor, "flags.dae.rest-recovery.require.food") ??
    foundry.utils.getProperty(actor, "flags.dnd5e.foodUnits");
  let actorRequiredFood =
    isRealNumber(actorRequiredFoodUnits) && foodUnitsSetting !== 0 ? actorRequiredFoodUnits : foodUnitsSetting;

  const waterUnitsSetting = game.settings.get("rest-recovery", "water-units-per-day");
  const actorRequiredWaterUnits =
    foundry.utils.getProperty(actor, "flags.dae.rest-recovery.require.water") ??
    foundry.utils.getProperty(actor, "flags.dnd5e.waterUnits");
  let actorRequiredWater =
    isRealNumber(actorRequiredWaterUnits) && waterUnitsSetting !== 0 ? actorRequiredWaterUnits : waterUnitsSetting;

  actorRequiredFood = actorNeedsNoFoodWater || actorNeedsNoFood ? 0 : actorRequiredFood;
  actorRequiredWater = actorNeedsNoFoodWater || actorNeedsNoWater ? 0 : actorRequiredWater;

  return {
    actorRequiredFood,
    actorRequiredWater,
    actorFoodSatedValue,
    actorWaterSatedValue,
  };
}

function isRealNumber(inNumber) {
  return !isNaN(inNumber) && typeof inNumber === "number" && isFinite(inNumber);
}
