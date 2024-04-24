// ##################################################################################################
// Read First!!!!
// Creates a Goodberry item that expires and is deleted after 24h.
// If the caster has the Disciple of Life feature, the healing power of the berries is increased.
// v2.0.0
// Author: Elwin#1410, based on Crymic's Goodberry macro
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [postActiveEffects][preTargeting][preItemRoll]
//  - Elwin Helpers world script
//  - About Time (optional)
//  - Simple Calendar (optional)
//  - Rest Recovery for 5E (optional)
//
// How to configure:
// The item details must be:
//   - Activation cost: 1 Action
//   - Target: Self
//   - Range: Touch
//   - Duration: Instantaneous
//   - Action type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | After Active Effects
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this spell.
//
// Localization:
//   To localize the texts used by this item, you can either changed the content found in the initLocalization() function
//   of this macro, or add a world script that populates game.i18n.translations with the appropriates keys.
//   Values from existing keys will be used instead of using the values from initLocalization().
//   Note: the created item uses the same name as the spell, so localize it to change the spell name.
//   Keys to define with their corresponding localized texts:
//      world.dnd5e.spells.goodberry.description: Description of the created goodberry consumable.
//      world.dnd5e.spells.goodberry.chatFlavor: Chat flavor of the created goodberry consumable.
//      world.dnd5e.spells.goodberry.expirationOnUseWarn: Warning displayed in a notification when using
//                                                        an expired goodberry consumable.
//      world.dnd5e.spells.goodberry.expirationEventWarn: Chat message text displayed when using
//                                                        an expired goodberry consumable.
//
// Usage:
// This item need to be used to activate. It creates a batch of berries that will expire in 24h.
// The expiration is embedded in the item, so it can be copied to another actor and it will still expire at the
// appropriate time. If Rest Recovery for 5E is active, the berries are configured for a full day's worth of food.
// The format of the batch ID depends on the value of a world setting, by the default is not set,
// the "date-time" format is useed.
// - The uuid format is a random unique id generated with foundry.utils.randomID().
// - The date-time format is the game.time.worldTime + 24h (in seconds) or if Simple Calendar is installed
//   and active, the timestamp formatted using SimpleCalendar.api.formatTimestamp().
//
// Description:
// In the postActiveEffects phase (of source item):
//   Creates a Goodberry item and adds it to the caster inventory. The expiration date and time is added to the name
//   to differenciate each created batch and a flag is set with the batch expiration time, if Simple Calendar is present
//   the date and time are formatted in text instead of worldtime seconds. If About Time is active,
//   an event is added to delete the item from the caster. Data about this event is kept in a flag on the created item.
//   If the actor has the Disciple of Life feature, the healing power of the berries are increaed appropriately.
// In the preTargeting phase (of created item):
//   Verifies if the batch has expired, and if it's the case, deletes the batch and cancels the item use.
//   If About Time is active, it verifies if the actorUuid from the event is the same as the one that used
//   the item, if not, a new event is added to delete the item from the current actor.
//   If there is no selected targets and MidiQOL settings is not set for late targeting, changes the target's item
//   to self and setup a hook on midi-qol.RollComplete to reset it to 1 creature after.
// In the preItemRoll phase (of created item):
//   Forces fast forwarding and auto rolling damage because its a fixed value, so no dice rolling.
//   If the target is not the owner of the berry, setup of hook on "dnd5e.itemUsageConsumption" and disable
//   the Rest Recovery consumable info, because it will be handled in the postActiveEffects phase instead of the
//   Rest Recovery module.
// In the "midi-qol.RollComplete" hook:
//   Clears selected targets if the hook is called during the same workflow execution.
// In the "dnd5e.itemUsageConsumption" hook:
//   If called during the same workflow execution, saves the new usage info and the current item's usage.
//   This info is used to process the effects of the berries on the target.
// In the postActiveEffects phase (of created item):
//   Re-enables the Rest Recovery consumable info.
//   If the target is not the owner of the berry and Rest Recovery is active and the food and water setting is enabled,
//   applies the same logic of food and water consumption as the Rest Recovery module but on the target other
//   then the owner.
//
// ###################################################################################################

export async function goodberry({
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
const DEFAULT_ITEM_NAME = "Goodberry";
const SPELL_DURATION = 60 * 60 * 24;
// Default rest-recovery sated type as RAW, change to "both" to sate food and water.
const SATED_TYPE = "food";
// Change this flag value to allow Disciple of Life to increase the healing value of the Goodberies.
const ALLOW_DISCIPLE_OF_LIFE_EXTRA_HEALING = true;
// Default name of Disciple of Life feat
const DISCIPLE_OF_LIFE_ITEM_NAME = "Disciple of Life";

// Set to false to remove debug logging
const debug = true;

if (!isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "2.0")) {
  const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled`;
  ui.notifications.error(errorMsg);
  return;
}
const dependencies = ["dae", "midi-qol"];
if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
  return;
}

if (debug) {
  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] }, arguments);
}

if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
  const macroData = args[0];
  const i18nGoodberry = initLocalization();
  const tokenActor = actor;
  const expirationTime = game.time.worldTime + SPELL_DURATION;
  let batchId = getBatchId(expirationTime);
  let healingValue = 1;
  if (ALLOW_DISCIPLE_OF_LIFE_EXTRA_HEALING && tokenActor.items.getName(DISCIPLE_OF_LIFE_ITEM_NAME)) {
    healingValue += 2 + workflow.itemLevel;
    const infoMsg = `<p>Your ${DISCIPLE_OF_LIFE_ITEM_NAME} feature enhances the berries effectiveness.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
  }
  const newItemData = {
    name: `${workflow.item.name} (${batchId})`,
    type: "consumable",
    img: "icons/consumables/food/berries-ration-round-red.webp",
    system: {
      description: {
        value: game.i18n.localize(i18nGoodberry.description),
      },
      quantity: 10,
      weight: 0.002,
      rarity: "common",
      activation: {
        type: "action",
        cost: 1,
      },
      target: { value: 1, type: "creature" },
      range: { units: "touch" },
      uses: {
        value: 1,
        max: "1",
        per: "charges",
        autoDestroy: true,
      },
      actionType: "heal",
      chatFlavor: game.i18n.localize(i18nGoodberry.chatFlavor),
      damage: { parts: [[healingValue, "healing"]] },
      consumableType: "food",
    },
    flags: {
      "midi-qol": {
        onUseMacroName: "[preTargeting]ItemMacro,[preItemRoll]ItemMacro,[postActiveEffects]ItemMacro",
      },
      'midi-item-showcase-community': { goodberry: { expirationTime: expirationTime } },
      dae: {
        macro: {
          data: {
            _id: null,
            name: workflow.item.name,
            type: "script",
            scope: "global",
            command: getConsumableMacro(),
          },
        },
      },
    },
  };
  if (game.modules.get("rest-recovery")?.active) {
    setProperty(newItemData.flags, "rest-recovery.data.consumable", {
      enabled: true,
      dayWorth: true,
      type: SATED_TYPE,
    });
  }

  const [newItem] = await tokenActor.createEmbeddedDocuments("Item", [newItemData]);
  // When about time is present, register a callback to delete the item when it expires
  if (game.modules.get("about-time")?.active) {
    const eventId = game.Gametime.doAt(
      expirationTime,
      deleteGoodberries,
      macroData.actorUuid,
      game.i18n.format(i18nGoodberry.expirationEventWarn, { actorName: tokenActor.name })
    );
    const goodberryEvent = {
      expirationTime: expirationTime,
      eventId: eventId,
      actorUuid: macroData.actorUuid,
    };
    await newItem.setFlag("midi-item-showcase-community", "goodberry", goodberryEvent);
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
    description: i18nPrefix + ".description",
    chatFlavor: i18nPrefix + ".chatFlavor",
    expirationOnUseWarn: i18nPrefix + ".expirationOnUseWarn",
    expirationEventWarn: i18nPrefix + ".expirationEventWarn",
  };
  // Note: use a flag to only setup i18n data once
  if (getProperty(globalThis, i18nPrefix + ".i18n")) {
    return i18nKeys;
  }
  // Text used for the created goodberry consumable and expiration warning messages.
  // Note: you can update these text to localize it or add a world script that will localize the texts,
  // by adding the i18nKeys and their corresponding texts into game.i18n.translations.
  const i18nData = {
    description:
      "<p>Eating a berry restores 1 hit point, and the berry provides enough nourishment to sustain a creature for one day.</p>",
    chatFlavor: "[healing] 10 Berries (1 can be eaten per action)",
    expirationOnUseWarn: "The berries lost their potency and vanish",
    expirationEventWarn: "Some berries lost their potency and vanish from {actorName}:",
  };

  const existingData = getProperty(game.i18n.translations, i18nPrefix) ?? {};
  setProperty(game.i18n.translations, i18nPrefix, mergeObject(existingData, i18nData, { overwrite: false }));
  setProperty(globalThis, i18nPrefix + ".i18n", true);

  return i18nKeys;
}

function getConsumableMacro() {
  return `
// Default name of the item
const DEFAULT_ITEM_NAME = "${DEFAULT_ITEM_NAME}";
const debug = ${debug};

if (debug) {
  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? \`\${args[0].tag}-\${args[0].macroPass}\` : args[0] }, arguments);
}

if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
  return await handleGoodBerryPreTargeting(workflow);
} else if (args[0].tag === "OnUse" && args[0].macroPass === "preItemRoll") {
  await handleGoodBerryPreItemRoll(workflow);
} else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
  await handleGoodBerryPostActiveEffects(workflow);
}

${initLocalization.toString()}

${handleGoodBerryPreTargeting.toString()}

${handleGoodBerryPreItemRoll.toString()}

${handleGoodBerryPostActiveEffects.toString()}

${deleteGoodberries.toString()}

${getActorConsumableValues.toString()}

${isRealNumber.toString()}
`;
}

/**
 * Handles the preTrageting phase of the workflow. Validates that the good berries are not expired, when expired the workflow
 * is cancelled and the berries are delete. If About Time is active, it registers a call back to delete the berries when they expire.
 * If there are no selected targets and the current midi setting does not allow late targeting, it selects the actor's token and
 * setup a hook on midi-qol.RollComplete to unselect it after.
 *
 * @param {MidiQOL.Workflow} gbWorkflow The current workflow.
 * @returns {boolean} true if the workflow should continue, false otherwise.
 */
async function handleGoodBerryPreTargeting(gbWorkflow) {
  // Reset target type each time this item is used
  // This is to revert to the initial state if workflow was cancelled.
  if (gbWorkflow.item.system.target.type !== "creature") {
    const newTarget = deepClone(gbWorkflow.item.system.target);
    newTarget.value = 1;
    newTarget.type = "creature";
    gbWorkflow.item.system.target = newTarget;
  }

  const i18nGoodberry = initLocalization();
  const expirationTime = getProperty(gbWorkflow.item, "flags.midi-item-showcase-community.goodberry.expirationTime") ?? 0;
  if (game.time.worldTime >= expirationTime) {
    ui.notifications.warn(game.i18n.localize(i18nGoodberry.expirationOnUseWarn));
    await gbWorkflow.item.delete();
    return false;
  }
  // When about time is present, register a callback to delete the item when it expires if not already registerd
  if (game.modules.get("about-time")?.active) {
    if (gbWorkflow.item.getFlag("midi-item-showcase-community", "goodberry")?.actorUuid !== gbWorkflow.actor.uuid) {
      const eventId = game.Gametime.doAt(
        expirationTime,
        deleteGoodberries,
        gbWorkflow.actor.uuid,
        game.i18n.format(i18nGoodberry.expirationEventWarn, { actorName: gbWorkflow.actor.name })
      );
      const goodberryEvent = { expirationTime: expirationTime, eventId: eventId, actorUuid: gbWorkflow.actor.uuid };
      await gbWorkflow.item.setFlag("midi-item-showcase-community", "goodberry", goodberryEvent);
    }
  }
  if (!game.user?.targets?.size) {
    const targetConfirmation = game.settings.get("midi-qol", "TargetConfirmation") ?? { enabled: false };
    if (!targetConfirmation.enabled || !targetConfirmation.noneTargeted) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Change to self:`, { targetConfirmation });
      }

      // Change target to self
      const newTarget = deepClone(gbWorkflow.item.system.target);
      newTarget.value = null;
      newTarget.type = "self";
      gbWorkflow.item.system.target = newTarget;
      
      // Register hook to reset target type after workflow completion
      Hooks.once(`midi-qol.postCleanup.${gbWorkflow.item.uuid}`, (currentWorkflow) => {
        if (currentWorkflow.item.system.target.type !== "self") {
          console.warn(`${DEFAULT_ITEM_NAME} | Target type already reset.`);
          return;
        }
        const newTarget = deepClone(currentWorkflow.item.system.target);
        newTarget.value = 1;
        newTarget.type = "creature";
        currentWorkflow.item.system.target = newTarget;
      });
    }
  } else {
    // Make sure the last set to self if was changed back
    if (gbWorkflow.item.system.target.type === "self") {
      const newTarget = deepClone(gbWorkflow.item.system.target);
      newTarget.value = 1;
      newTarget.type = "creature";
      gbWorkflow.item.system.target = newTarget;
    }
  }
  return true;
}

/**
 * Handles the preItemRoll phase of the workflow. If the target is not the one that used the item and
 * Rest Recovery is active, sets the proper hooks to handle the benefits of the consumption on the target.
 *
 * @param {MidiQOL.Workflow} gbWorkflow The current workflow.
 */
async function handleGoodBerryPreItemRoll(gbWorkflow) {
  // Note: we auto roll and fast forward because the healing is a fixed value.
  setProperty(gbWorkflow, "workflowOptions.fastForwardDamage", true);
  setProperty(gbWorkflow, "workflowOptions.autoRollDamage", "always");
  // Reset consumable state if was not reset due to item cancellation
  const consumable = getProperty(gbWorkflow.item, "flags.rest-recovery.data.consumable");
  if (consumable) {
    consumable.enabled = true;
  }

  if (gbWorkflow.targets.first()?.id !== gbWorkflow.token.id) {
    if (
      game.modules.get("rest-recovery")?.active &&
      consumable &&
      game.settings.get("rest-recovery", "enable-food-and-water")
    ) {
      // Create unique workflow id
      gbWorkflow.customUniqueId = randomID();
      // Prevent Rest Recovery to apply to owner of item
      consumable.enabled = false;
      // Register hook to keep handle usage consumption, we need to keep the usage info in the useItem hook
      Hooks.once("dnd5e.itemUsageConsumption", (item, _, __, usage) => {
        const itemWorkflow = MidiQOL.Workflow.getWorkflow(item?.uuid);
        if (gbWorkflow.customUniqueId !== itemWorkflow?.customUniqueId) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | dnd5e.itemUsageConsumption hook called for a different workflow, expected ${gbWorkflow.id} but was ${itemWorkflow?.id}`
          );
          return;
        }
        // Keep usage info in current workflow with current item uses, because the item will possibly
        // be updated before the postActiveEffects phase is called.
        gbWorkflow.goodberryItem = { usage: usage, origUsage: deepClone(item.system?.uses ?? {}) };
      });
    }
  }
}

/**
 * Handles postActiveEffects phase of the workflow. If Rest Recovery is active and food and water setting is enabled,
 * also handles food or food and water consumption for an actor other than the owner of the good berry.
 * This duplicates some code from Rest Recovery because it doesn't currently support it.
 *
 * @param {MidiQOL.Workflow} gbWorkflow The current workflow.
 */
async function handleGoodBerryPostActiveEffects(gbWorkflow) {
  // Reset consumable state if was not reset due to item cancellation or target not owner
  const consumable = getProperty(gbWorkflow.item, "flags.rest-recovery.data.consumable");
  if (consumable) {
    consumable.enabled = true;
  }
  const targetToken = gbWorkflow.targets?.first();
  if (!targetToken) {
    return;
  }
  if (
    !(
      targetToken.id !== gbWorkflow.token.id &&
      game.modules.get("rest-recovery")?.active &&
      consumable &&
      game.settings.get("rest-recovery", "enable-food-and-water")
    )
  ) {
    return;
  }

  // Handle consumption by target different than owner of item
  const actorUpdates = {};
  let { actorRequiredFood, actorRequiredWater, actorFoodSatedValue, actorWaterSatedValue } = getActorConsumableValues(
    targetToken.actor
  );

  const currCharges = gbWorkflow.goodberryItem?.origUsage?.value;
  const newCharges =
    getProperty(gbWorkflow.goodberryItem?.usage?.itemUpdates, "system.uses.value") ?? currCharges - 1.0;
  const chargesUsed = currCharges < newCharges ? currCharges : currCharges - newCharges;

  let message;

  if (consumable.type === "both") {
    actorUpdates["flags.rest-recovery.data.sated.food"] = consumable.dayWorth
      ? 100000000000
      : actorFoodSatedValue + chargesUsed;
    actorUpdates["flags.rest-recovery.data.sated.water"] = consumable.dayWorth
      ? 100000000000
      : actorWaterSatedValue + chargesUsed;

    const localize = "REST-RECOVERY.Chat.ConsumedBoth" + (consumable.dayWorth ? "DayWorth" : "");
    message =
      "<p>" +
      game.i18n.format(localize, {
        actorName: targetToken.name,
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
  } else if (consumable.type === "food") {
    actorUpdates["flags.rest-recovery.data.sated.food"] = consumable.dayWorth
      ? 100000000000
      : actorFoodSatedValue + chargesUsed;

    const localize = "REST-RECOVERY.Chat.ConsumedFood" + (consumable.dayWorth ? "DayWorth" : "");
    message =
      "<p>" +
      game.i18n.format(localize, {
        actorName: targetToken.name,
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

  if (!foundry.utils.isEmpty(actorUpdates)) {
    const daeGmAction = await import("/modules/dae/module/GMAction.js");
    await daeGmAction?.socketlibSocket.executeAsGM("_updateActor", {
      actorUuid: targetToken.actor.uuid,
      update: actorUpdates,
    });
  }

  if (message) {
    await ChatMessage.create({
      flavor: "Rest Recovery",
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: gbWorkflow.actor }),
      content: message,
    });
  }
}

/**
 * Deletes expired good berries from an actor.
 *
 * @param {string} actorUuid UUID of actor for which to process expired good berries.
 * @param {string} goodberryExpirationEventWarn Warning message to be displayed in chat if some berries were deleted.
 */
async function deleteGoodberries(actorUuid, goodberryExpirationEventWarn) {
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
      getProperty(it, "flags.midi-item-showcase-community.goodberry.expirationTime") &&
      now >= getProperty(it, "flags.midi-item-showcase-community.goodberry.expirationTime")
  );
  if (itemsToDelete.length > 0) {
    const deletedItems = await actor.deleteEmbeddedDocuments(
      "Item",
      itemsToDelete.map((it) => it.id)
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
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    });
  }
}

//
// The following functions were copied from Rest Recovery because they are not exported in its API
//

function getActorConsumableValues(actor) {
  const actorFoodSatedValue = getProperty(actor, "flags.rest-recovery.data.sated.food") ?? 0;
  const actorWaterSatedValue = getProperty(actor, "flags.rest-recovery.data.sated.water") ?? 0;
  const actorNeedsNoFoodWater = getProperty(actor, "flags.dnd5e.noFoodWater");
  const actorNeedsNoFood = getProperty(actor, "flags.dae.rest-recovery.force.noFood");
  const actorNeedsNoWater = getProperty(actor, "flags.dae.rest-recovery.force.noWater");
  const foodUnitsSetting = game.settings.get("rest-recovery", "food-units-per-day");
  const actorRequiredFoodUnits =
    getProperty(actor, "flags.dae.rest-recovery.require.food") ?? getProperty(actor, "flags.dnd5e.foodUnits");
  let actorRequiredFood =
    isRealNumber(actorRequiredFoodUnits) && foodUnitsSetting !== 0 ? actorRequiredFoodUnits : foodUnitsSetting;
  const waterUnitsSetting = game.settings.get("rest-recovery", "water-units-per-day");
  const actorRequiredWaterUnits =
    getProperty(actor, "flags.dae.rest-recovery.require.water") ?? getProperty(actor, "flags.dnd5e.waterUnits");
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

function getBatchId(expirationTime) {
  // World setting for goodberry
  if (!game.settings?.settings?.has("world.dnd5e.goodberry.batchIdFormat")) {
    game.settings?.register("world", "dnd5e.goodberry.batchIdFormat", {
      name: "Goodberry batch id format",
      hint: "The format can be uuid or date-time",
      scope: "world",
      default: "date-time",
      type: String,
      config: true,
    });
  }
  const batchIdFormat = game.settings?.get("world", "dnd5e.goodberry.batchIdFormat") ?? "date-time";
  let batchId;
  if (batchIdFormat === "uuid") {
    batchId = randomID();
  } else {
    batchId = expirationTime;
    if (game.modules.get("foundryvtt-simple-calendar")?.active) {
      const result = SimpleCalendar.api.formatTimestamp(expirationTime);
      batchId = `${result.date} - ${result.time}`;
    }
  }
  return batchId;
}
}