// ##################################################################################################
// Read First!!!!
// Creates a Goodberry item that expires and is deleted after 24h.
// If the caster has the Disciple of Life feature (2014), the healing power of the berries is increased.
// v3.5.0
// Author: Elwin#1410, based on Crymic's Goodberry macro
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [postActiveEffects]
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
//      world.dnd5e.spells.goodberry.magicalBerries: Name of the created magical berries.
//      world.dnd5e.spells.goodberry.expirationEventWarn: Chat message text displayed when using
//                                                        an expired goodberry consumable.
//
// Usage:
// This item need to be used to activate. It creates a batch of berries that will expire in 24h.
// The expiration is embedded in the item, so it can be copied to another actor and it will still expire at the
// appropriate time. If Rest Recovery for 5E is active, the berries are configured for a full day's worth of food.
// The format of the batch ID depends on the value of a MISC setting, by default if is not set,
// the "default" format is used (timestamp).
// - The uid format is a random unique id generated with foundry.utils.randomID().
// - The default format is the game.time.worldTime + 24h (in seconds) formatted using game.time.calendar.format
//   if available or else the expiration time in seconds.
//
// Description:
// In the postActiveEffects (OnUse) phase of the Goodberry - Create Berries activity (in owner's workflow):
//   Creates a Goodberry item and adds it to the caster inventory. The expiration date and time is added to the name
//   to differenciate each created batch and a flag is set with the batch expiration time, if Simple Calendar is present
//   the date and time are formatted in text instead of worldtime seconds. If About Time is active,
//   an event is added to delete the item from the caster. Data about this event is kept in a flag on the created item.
//   If the actor has the Disciple of Life feature, the healing power of the berries are increaed appropriately.
//
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Goodberry";
const MODULE_ID = "midi-item-showcase-community";
const MODULE_FUNCTIONS = "MISC";
const MISC_MODULE_ID = "midi-item-showcase-community";
const SPELL_DURATION = 60 * 60 * 24;
// Default rest-recovery sated type as RAW, change to "both" to sate food and water.
const SATED_TYPE = "food";
// Change this flag value to allow Disciple of Life to increase the healing value of the Goodberies.
const ALLOW_DISCIPLE_OF_LIFE_EXTRA_HEALING = true;
// Default identifier of Disciple of Life feat
const DISCIPLE_OF_LIFE_ITEM_IDENT = "disciple-of-life";

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

export async function goodberry({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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
    const i18nGoodberry = initLocalization();
    const tokenActor = actor;
    const expirationTime = game.time.worldTime + SPELL_DURATION;
    const rules = elwinHelpers.getRules(scope.rolledItem);
    let batchId = getBatchId(expirationTime);

    let healingBonus = "";
    const discipleOfLife = tokenActor.identifiedItems.get(DISCIPLE_OF_LIFE_ITEM_IDENT, "feat");

    if (ALLOW_DISCIPLE_OF_LIFE_EXTRA_HEALING && discipleOfLife && rules === "legacy") {
      const healingBonusValue = 2 + (workflow.castData?.castLevel ?? 1);
      healingBonus = ` + ${healingBonusValue}`;
      const infoMsg = `<p>Your ${discipleOfLife.name} feature enhances the berries effectiveness.</p>`;
      await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
    }

    let newItemData = await elwinHelpers.getItemData(rules, "consumable", "magical-berries", {
      type: "food",
      basePackageName: "misc-spells",
      uuid: `Compendium.${MISC_MODULE_ID}.misc-spells${rules === "modern" ? "-2024.Item.n6y96VJav9HscW5f" : ".Item.7NR2qeUMoOGA8low"}`,
    });
    if (!newItemData) {
      newItemData = getItemData(rules, i18nGoodberry);
    }

    newItemData.name += batchId;
    foundry.utils.setProperty(newItemData, `flags.${MODULE_ID}.goodberry.expirationTime`, expirationTime);

    if (healingBonus) {
      for (const activity of Object.values(newItemData.system.activities)) {
        if (activity.type === "heal") {
          activity.healing.custom.formula += healingBonus;
        }
      }
    }

    const [newItem] = await tokenActor.createEmbeddedDocuments("Item", [newItemData]);
    // When about time is present, register a callback to delete the item when it expires
    if (game.modules.get("about-time")?.active) {
      const eventId = abouttime.doAt(
        expirationTime,
        globalThis[MODULE_FUNCTIONS]?.macros.spells.deleteMagicalBerries,
        tokenActor.uuid,
        game.i18n.format(i18nGoodberry.expirationEventWarn, { actorName: tokenActor.name }),
      );
      const goodberryEvent = {
        expirationTime: expirationTime,
        eventId: eventId,
        actorUuid: tokenActor.uuid,
      };
      await newItem.setFlag(MODULE_ID, "goodberry", goodberryEvent);
    }
    const message = `<p>10 <strong>Magical Berries</strong> were added to your inventory.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, message);
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
    magicalBerries: i18nPrefix + ".magicalBerries",
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
    magicalBerries: "Magical Berries",
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
 * Generates the item data for the magical berries created by Goodberry.
 *
 * @param {string} rules - Rules version (legacy, modern).
 * @param {object} i18nGoodberry - The i18n keys to use with `game.i18n.localize` and `game.i18n.format`.
 * @returns {object} The item data for the magical berries created by Goodberry.
 */
function getItemData(rules, i18nGoodberry) {
  const newItemData = {
    name: `${game.i18n.localize(i18nGoodberry.magicalBerries)}`,
    type: "consumable",
    img: "icons/consumables/fruit/lingonberry-cluster-red.webp",
    system: {
      activities: {
        "9DkQO4yYAeqHjC1W": {
          type: "heal",
          activation: {
            type: rules === "modern" ? "bonus" : "action",
          },
          consumption: {
            targets: [
              {
                type: "itemUses",
                value: "1",
                target: "",
              },
            ],
          },
          duration: {
            units: "inst",
          },
          range: {
            units: "self",
          },
          healing: {
            custom: { enabled: true, formula: "1" },
            types: ["healing"],
          },
          midiProperties: {
            identifier: "eat",
            otherActivityCompatible: false,
          },
          name: "Eat",
        },
        IDDwr6ZDjFidAr5c: {
          type: "heal",
          activation: {
            type: rules === "modern" ? "bonus" : "action",
          },
          consumption: {
            targets: [
              {
                type: "itemUses",
                value: "1",
                target: "",
              },
            ],
          },
          duration: {
            units: "inst",
          },
          range: {
            value: 5,
            units: "ft",
          },
          target: {
            affects: {
              count: "1",
              type: "creature",
            },
          },
          healing: {
            custom: { enabled: true, formula: "1" },
            types: ["healing"],
          },
          midiProperties: {
            identifier: "feed-to-other",
            otherActivityCompatible: false,
          },
          name: "Feed to Other",
        },
      },
      description: {
        value: `@Embed[Compendium.dnd5e.spells${rules === "modern" ? "24.Item.phbsplGoodberry0" : ".Item.Qf6CAZkc7ms4ZY3e"} caption=false]`,
      },
      properties: ["mgc"],
      uses: {
        spent: 0,
        recovery: [],
        autoDestroy: true,
        max: "1",
      },
      identifier: "magical-berries",
      quantity: 10,
      weight: {
        value: 0.002,
        units: "lb",
      },
      type: {
        value: "food",
        subtype: SATED_TYPE,
      },
    },
    flags: {
      "midi-qol": {
        onUseMacroName: `[preTargeting]function.${MODULE_FUNCTIONS}.macros.spells.magicalBerries,[preItemRoll]function.${MODULE_FUNCTIONS}.macros.spells.magicalBerries,[postActiveEffects]function.${MODULE_FUNCTIONS}.macros.spells.magicalBerries`,
      },
    },
  };
  if (game.modules.get("rest-recovery")?.active) {
    foundry.utils.setProperty(newItemData, "flags.rest-recovery.data.consumable.dayWorth", true);
  }
  return newItemData;
}

function getBatchId(expirationTime) {
  // MISC setting for goodberry
  let batchIdFormat = "default";
  if (game.settings?.settings.has(`${MISC_MODULE_ID}.goodberryBatchIdFormat`)) {
    batchIdFormat = game.settings?.get(MISC_MODULE_ID, "goodberryBatchIdFormat") ?? "default";
  }
  if (batchIdFormat === "none") {
    return "";
  }
  let batchId = expirationTime;
  if (batchIdFormat === "uid") {
    batchId = foundry.utils.randomID();
  } else if (batchIdFormat === "default") {
    batchId = game.time.calendar?.format(expirationTime) ?? expirationTime;
  }
  return ` (${batchId})`;
}
