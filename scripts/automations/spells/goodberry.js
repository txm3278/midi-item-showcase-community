// ##################################################################################################
// Read First!!!!
// Creates a Goodberry item that expires and is deleted after 24h.
// If the caster has the Disciple of Life feature, the healing power of the berries is increased.
// v3.0.0
// Author: Elwin#1410, based on Crymic's Goodberry macro
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro [postActiveEffects],[preTargeting],[preItemRoll]
//  - Elwin Helpers world script
//  - About Time (optional)
//  - Simple Calendar (optional)
//  - Rest Recovery for 5E (optional)
//
// Localization:
//   To localize the texts used by this item, you can either changed the content found in the initLocalization() function
//   of this macro, or add a world script that populates game.i18n.translations with the appropriates keys.
//   Values from existing keys will be used instead of using the values from initLocalization().
//   Note: the created item uses the same name as the spell, so localize it to change the spell name.
//   Keys to define with their corresponding localized texts:
//      world.dnd5e.spells.goodberry.description: Description of the created goodberry consumable.
//      world.dnd5e.spells.goodberry.expirationOnUseWarn: Warning displayed in a notification when using
//                                                        an expired goodberry consumable.
//      world.dnd5e.spells.goodberry.expirationEventWarn: Chat message text displayed when using
//                                                        an expired goodberry consumable.
//
// Usage:
// This item need to be used to activate. It creates a batch of berries that will expire in 24h.
// The expiration is embedded in the item, so it can be copied to another actor and it will still expire at the
// appropriate time. If Rest Recovery for 5E is active, the berries are configured for a full day's worth of food.
// The format of the batch ID depends on the value of a world setting, by default if is not set,
// the "date-time" format is used.
// - The uuid format is a random unique id generated with foundry.utils.randomID().
// - The date-time format is the game.time.worldTime + 24h (in seconds) or if Simple Calendar is installed
//   and active, the timestamp formatted using SimpleCalendar.api.formatTimestamp().
//
// Description:
// In the postActiveEffects (OnUse) phase of the Goodberry Create activity (in owner's workflow):
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
//   If the target is not the owner of the berry, setup of hook on "dnd5e.preUseActivity" and "dnd5e.activityConsumption".
// In the "midi-qol.postCleanup" hook:
//   Reset the target in case it was set to self.
// In the "dnd5e.preUseActivity" hook:
//   If called during the same workflow execution, sets to null the item subtype to prevent the Rest Recovery
//   consumable info, because it will be handled in the postActiveEffects phase instead of the Rest Recovery module.
// In the "dnd5e.activityConsumption" hook:
//   If called during the same workflow execution, saves the updates and the current item.
//   This info is used to process the effects of the berries on the target.
// In the postActiveEffects phase (of created item):
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
  const DEFAULT_ITEM_NAME = 'Goodberry';
  const MODULE_ID = 'midi-item-showcase-community';
  const SPELL_DURATION = 60 * 60 * 24;
  // Default rest-recovery sated type as RAW, change to "both" to sate food and water.
  const SATED_TYPE = 'food';
  // Change this flag value to allow Disciple of Life to increase the healing value of the Goodberies.
  const ALLOW_DISCIPLE_OF_LIFE_EXTRA_HEALING = true;
  // Default identifier of Disciple of Life feat
  const DISCIPLE_OF_LIFE_ITEM_IDENT = 'disciple-of-life';

  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '3.0'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    const macroData = args[0];
    const i18nGoodberry = initLocalization();
    const tokenActor = actor;
    const expirationTime = game.time.worldTime + SPELL_DURATION;
    let batchId = getBatchId(expirationTime);
    let healingValue = 1;
    const discipleOfLife = tokenActor.items.find(
      (i) => i.identifier === DISCIPLE_OF_LIFE_ITEM_IDENT
    );
    if (ALLOW_DISCIPLE_OF_LIFE_EXTRA_HEALING && discipleOfLife) {
      healingValue += 2 + (workflow.castData?.castLevel ?? 1);
      const infoMsg = `<p>Your ${discipleOfLife.name} feature enhances the berries effectiveness.</p>`;
      await elwinHelpers.insertTextIntoMidiItemCard(
        'beforeButtons',
        workflow,
        infoMsg
      );
    }

    const newItemData = {
      name: `${workflow.item.name} (${batchId})`,
      type: 'consumable',
      img: 'icons/consumables/food/berries-ration-round-red.webp',
      system: {
        activities: {
          '9DkQO4yYAeqHjC1W': {
            type: 'heal',
            activation: {
              type: 'action',
            },
            consumption: {
              targets: [
                {
                  type: 'itemUses',
                  value: '1',
                  target: '',
                },
              ],
            },
            duration: {
              units: 'inst',
            },
            range: {
              units: 'touch',
            },
            target: {
              affects: {
                count: '1',
                type: 'creature',
              },
            },
            healing: {
              custom: { enabled: true, formula: `${healingValue}` },
              types: ['healing'],
            },
            midiProperties: {
              confirmTargets: 'never',
              identifier: 'heal',
            },
            name: 'Heal',
          },
        },
        description: {
          value: game.i18n.localize(i18nGoodberry.description),
        },
        uses: {
          spent: 0,
          recovery: [],
          autoDestroy: true,
          max: '1',
        },
        identifier: 'goodberry',
        quantity: 10,
        weight: {
          value: 0.002,
          units: 'lb',
        },
        type: {
          value: 'food',
          subtype: 'food',
        },
      },
      flags: {
        'midi-qol': {
          onUseMacroName:
            '[preTargeting]ItemMacro,[preItemRoll]ItemMacro,[postActiveEffects]ItemMacro',
        },
        [MODULE_ID]: { goodberry: { expirationTime: expirationTime } },
        dae: {
          macro: {
            data: {
              _id: null,
              name: workflow.item.name,
              type: 'script',
              scope: 'global',
              command: getConsumableMacro(),
            },
          },
        },
      },
    };
    if (game.modules.get('rest-recovery')?.active) {
      foundry.utils.setProperty(
        newItemData,
        'flags.rest-recovery.data.consumable.dayWorth',
        true
      );
    }

    const [newItem] = await tokenActor.createEmbeddedDocuments('Item', [
      newItemData,
    ]);
    // When about time is present, register a callback to delete the item when it expires
    if (game.modules.get('about-time')?.active) {
      const eventId = abouttime.doAt(
        expirationTime,
        deleteGoodberries,
        macroData.actorUuid,
        game.i18n.format(i18nGoodberry.expirationEventWarn, {
          actorName: tokenActor.name,
        })
      );
      const goodberryEvent = {
        expirationTime: expirationTime,
        eventId: eventId,
        actorUuid: macroData.actorUuid,
      };
      await newItem.setFlag(MODULE_ID, 'goodberry', goodberryEvent);
    }
  }

  /**
   * Initializes the i18n texts used by this item.
   *
   * @returns {object} The i18n keys to use with `game.i18n.localize` and `game.i18n.format`.
   */
  function initLocalization() {
    const i18nPrefix = 'world.dnd5e.spells.goodberry';
    const i18nKeys = {
      description: i18nPrefix + '.description',
      expirationOnUseWarn: i18nPrefix + '.expirationOnUseWarn',
      expirationEventWarn: i18nPrefix + '.expirationEventWarn',
    };
    // Note: use a flag to only setup i18n data once
    if (foundry.utils.getProperty(globalThis, i18nPrefix + '.i18n')) {
      return i18nKeys;
    }
    // Text used for the created goodberry consumable and expiration warning messages.
    // Note: you can update these text to localize it or add a world script that will localize the texts,
    // by adding the i18nKeys and their corresponding texts into game.i18n.translations.
    const i18nData = {
      description:
        '<p>Eating a berry restores 1 hit point, and the berry provides enough nourishment to sustain a creature for one day.</p>',
      expirationOnUseWarn: 'The berries lost their potency and vanish',
      expirationEventWarn:
        'Some berries lost their potency and vanish from {actorName}:',
    };

    const existingData =
      foundry.utils.getProperty(game.i18n.translations, i18nPrefix) ?? {};
    foundry.utils.setProperty(
      game.i18n.translations,
      i18nPrefix,
      foundry.utils.mergeObject(existingData, i18nData, { overwrite: false })
    );
    foundry.utils.setProperty(globalThis, i18nPrefix + '.i18n', true);

    return i18nKeys;
  }

  function getConsumableMacro() {
    return `
// Default name of the item
const DEFAULT_ITEM_NAME = "${DEFAULT_ITEM_NAME}";
const MODULE_ID = "${MODULE_ID}";
const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? true;

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

${getActorConsumableUpdates.toString()}

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
    if (gbWorkflow.activity.target.affects.type !== 'creature') {
      const newTargetAffects = foundry.utils.deepClone(
        gbWorkflow.activity.target.affects
      );
      newTargetAffects.count = '1';
      newTargetAffects.type = 'creature';
      gbWorkflow.activity.target.affects = newTargetAffects;
    }

    const i18nGoodberry = initLocalization();
    const expirationTime =
      foundry.utils.getProperty(
        gbWorkflow.item,
        `flags.${MODULE_ID}.goodberry.expirationTime`
      ) ?? 0;
    if (game.time.worldTime >= expirationTime) {
      ui.notifications.warn(
        game.i18n.localize(i18nGoodberry.expirationOnUseWarn)
      );
      await gbWorkflow.item.delete();
      return false;
    }
    // When about time is present, register a callback to delete the item when it expires if not already registerd
    if (game.modules.get('about-time')?.active) {
      if (
        gbWorkflow.item.getFlag(MODULE_ID, 'goodberry')?.actorUuid !==
        gbWorkflow.actor.uuid
      ) {
        const eventId = abouttime.doAt(
          expirationTime,
          deleteGoodberries,
          gbWorkflow.actor.uuid,
          game.i18n.format(i18nGoodberry.expirationEventWarn, {
            actorName: gbWorkflow.actor.name,
          })
        );
        const goodberryEvent = {
          expirationTime: expirationTime,
          eventId: eventId,
          actorUuid: gbWorkflow.actor.uuid,
        };
        await gbWorkflow.item.setFlag(MODULE_ID, 'goodberry', goodberryEvent);
      }
    }
    if (!game.user?.targets?.size) {
      const targetConfirmation = game.settings.get(
        'midi-qol',
        'TargetConfirmation'
      ) ?? { enabled: false };
      if (!targetConfirmation.enabled || !targetConfirmation.noneTargeted) {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | Change to self:`, {
            targetConfirmation,
          });
        }

        // Change target to self
        const newTargetAffects = foundry.utils.deepClone(
          gbWorkflow.activity.target.affects
        );
        newTargetAffects.type = 'self';
        gbWorkflow.activity.target.affects = newTargetAffects;

        // Register hook to reset target type after workflow completion
        Hooks.once(
          `midi-qol.postCleanup.${gbWorkflow.item.uuid}`,
          (currentWorkflow) => {
            if (currentWorkflow.activity.target.affects.type !== 'self') {
              console.warn(`${DEFAULT_ITEM_NAME} | Target type already reset.`);
              return;
            }
            const newTargetAffects = foundry.utils.deepClone(
              currentWorkflow.activity.target.affects
            );
            newTargetAffects.count = '1';
            newTargetAffects.type = 'creature';
            currentWorkflow.activity.target.affects = newTargetAffects;
          }
        );
      }
    } else {
      // Make sure the last set to self if was changed back
      if (gbWorkflow.activity.target.affects.type === 'self') {
        const newTargetAffects = foundry.utils.deepClone(
          gbWorkflow.activity.target.affects
        );
        newTargetAffects.count = '1';
        newTargetAffects.type = 'creature';
        gbWorkflow.activity.target.affects = newTargetAffects;
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
    foundry.utils.setProperty(
      gbWorkflow,
      'workflowOptions.autoRollDamage',
      'always'
    );
    foundry.utils.setProperty(
      gbWorkflow,
      'workflowOptions.autoFastDamage',
      true
    );

    if (gbWorkflow.targets.first()?.id !== gbWorkflow.token.id) {
      if (
        game.modules.get('rest-recovery')?.active &&
        foundry.utils.getProperty(
          gbWorkflow.item,
          'flags.rest-recovery.data.consumable'
        ) &&
        game.settings.get('rest-recovery', 'enable-food-and-water')
      ) {
        // Prevent Rest Recovery to apply to owner of item
        Hooks.once('dnd5e.preUseActivity', (activity, _, __, ___) => {
          const activityWorkflow = MidiQOL.Workflow.getWorkflow(activity.uuid);
          if (
            !elwinHelpers.isMidiHookStillValid(
              activity.item?.name,
              'dnd5e.preUseActivity',
              activity.name,
              gbWorkflow,
              activityWorkflow,
              debug
            )
          ) {
            return;
          }
          foundry.utils.setProperty(activity.item, 'system.type.subtype', null);
        });

        // Register hook to keep handle usage consumption, we need to keep the usage info in the useItem hook
        Hooks.once('dnd5e.activityConsumption', (activity, _, __, updates) => {
          const activityWorkflow = MidiQOL.Workflow.getWorkflow(activity.uuid);
          if (
            !elwinHelpers.isMidiHookStillValid(
              activity.item?.name,
              'dnd5e.activityConsumption',
              activity.name,
              gbWorkflow,
              activityWorkflow,
              debug
            )
          ) {
            return;
          }
          // Keep usage updates in current workflow with current item, because the item will possibly
          // be updated before the postActiveEffects phase is called.
          gbWorkflow.goodberryItem = {
            origItem: activity.item?.toObject(),
            updates,
          };
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
    const targetToken = gbWorkflow.targets?.first();
    if (!targetToken) {
      return;
    }
    if (
      !(
        targetToken.id !== gbWorkflow.token.id &&
        game.modules.get('rest-recovery')?.active &&
        foundry.utils.getProperty(
          gbWorkflow.item,
          'flags.rest-recovery.data.consumable'
        ) &&
        game.settings.get('rest-recovery', 'enable-food-and-water')
      )
    ) {
      return;
    }

    // Handle consumption by target different than owner of item
    const [actorUpdates, message] = getActorConsumableUpdates(
      gbWorkflow.goodberryItem?.origItem ?? {},
      gbWorkflow.goodberryItem?.updates?.item?.find(
        (data) => data._id === gbWorkflow.item.id
      ) ?? {},
      targetToken.actor
    );

    if (!foundry.utils.isEmpty(actorUpdates)) {
      await socketlib.modules.get('dae')?.executeAsGM('_updateActor', {
        actorUuid: targetToken.actor.uuid,
        update: actorUpdates,
      });
    }

    if (message) {
      await ChatMessage.implementation.create({
        flavor: 'Rest Recovery',
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
        foundry.utils.getProperty(
          it,
          `flags.${MODULE_ID}.goodberry.expirationTime`
        ) &&
        now >=
          foundry.utils.getProperty(
            it,
            `flags.${MODULE_ID}.goodberry.expirationTime`
          )
    );
    if (itemsToDelete.length > 0) {
      const deletedItems = await actor.deleteEmbeddedDocuments(
        'Item',
        itemsToDelete.map((it) => it.id)
      );
      let whisperTo = [];
      const player = MidiQOL.playerForActor(actor);
      if (player) {
        whisperTo.push(player);
      }
      await ChatMessage.create({
        user: game.user?.id,
        speaker: {
          scene: game.canvas.scene?.id,
          alias: game.user?.name,
          user: game.user?.id,
        },
        content:
          goodberryExpirationEventWarn +
          ' ' +
          deletedItems.map((it) => it.name).join(),
        whisper: whisperTo.map((u) => u.id),
        type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
    }
  }

  function getBatchId(expirationTime) {
    // World setting for goodberry
    if (!game.settings?.settings?.has('world.dnd5e.goodberry.batchIdFormat')) {
      game.settings?.register('world', 'dnd5e.goodberry.batchIdFormat', {
        name: 'Goodberry batch id format',
        hint: 'The format can be uuid or date-time',
        scope: 'world',
        default: 'date-time',
        type: String,
        config: true,
      });
    }
    const batchIdFormat =
      game.settings?.get('world', 'dnd5e.goodberry.batchIdFormat') ??
      'date-time';
    let batchId;
    if (batchIdFormat === 'uuid') {
      batchId = foundry.utils.randomID();
    } else {
      batchId = expirationTime;
      if (game.modules.get('foundryvtt-simple-calendar')?.active) {
        const result = SimpleCalendar.api.formatTimestamp(expirationTime);
        batchId = `${result.date} - ${result.time}`;
      }
    }
    return batchId;
  }

  //
  // The following functions were copied from Rest Recovery because they are not exported in its API
  //
  function getActorConsumableUpdates(item, data, consumingActor) {
    const consumable = foundry.utils.getProperty(
      item,
      'flags.rest-recovery.data.consumable'
    );

    const actorUpdates = {};

    let {
      actorRequiredFood,
      actorRequiredWater,
      actorFoodSatedValue,
      actorWaterSatedValue,
    } = getActorConsumableValues(consumingActor);

    const oldSpent = foundry.utils.getProperty(item, 'system.uses.spent');
    const newSpent =
      foundry.utils.getProperty(data, 'system.uses.spent') ?? oldSpent + 1;
    const oldQuantity = foundry.utils.getProperty(item, 'system.quantity');
    const newQuantity =
      foundry.utils.getProperty(data, 'system.quantity') ?? oldQuantity - 1;
    const chargesUsed =
      newSpent > oldSpent ? newSpent - oldSpent : oldQuantity - newQuantity;

    let message;

    if (item.system.type?.subtype === 'both') {
      actorUpdates['flags.rest-recovery.data.sated.food'] = consumable.dayWorth
        ? actorFoodSatedValue
        : actorFoodSatedValue + chargesUsed;
      actorUpdates['flags.rest-recovery.data.sated.water'] = consumable.dayWorth
        ? actorWaterSatedValue
        : actorWaterSatedValue + chargesUsed;

      const localize =
        'REST-RECOVERY.Chat.ConsumedBoth' +
        (consumable.dayWorth ? 'DayWorth' : '');
      message =
        '<p>' +
        game.i18n.format(localize, {
          actorName: consumingActor.name,
          itemName: item.name,
          charges: chargesUsed,
        }) +
        '</p>';

      if (!consumable.dayWorth) {
        message +=
          actorUpdates['flags.rest-recovery.data.sated.food'] >=
          actorRequiredFood
            ? '<p>' +
              game.i18n.localize('REST-RECOVERY.Chat.SatedFood') +
              '</p>'
            : '<p>' +
              game.i18n.format('REST-RECOVERY.Chat.RequiredSatedFood', {
                units:
                  actorRequiredFood -
                  actorUpdates['flags.rest-recovery.data.sated.food'],
              }) +
              '</p>';
        message +=
          actorUpdates['flags.rest-recovery.data.sated.water'] >=
          actorRequiredWater
            ? '<p>' +
              game.i18n.localize('REST-RECOVERY.Chat.SatedWater') +
              '</p>'
            : '<p>' +
              game.i18n.format('REST-RECOVERY.Chat.RequiredSatedWater', {
                units:
                  actorRequiredWater -
                  actorUpdates['flags.rest-recovery.data.sated.water'],
              }) +
              '</p>';
      }
    } else if (item.system.type?.subtype === 'food') {
      actorUpdates['flags.rest-recovery.data.sated.food'] = consumable.dayWorth
        ? 100000000000
        : actorFoodSatedValue + chargesUsed;

      const localize =
        'REST-RECOVERY.Chat.ConsumedFood' +
        (consumable.dayWorth ? 'DayWorth' : '');
      message =
        '<p>' +
        game.i18n.format(localize, {
          actorName: consumingActor.name,
          itemName: item.name,
          charges: chargesUsed,
        }) +
        '</p>';

      message +=
        actorUpdates['flags.rest-recovery.data.sated.food'] >= actorRequiredFood
          ? '<p>' + game.i18n.localize('REST-RECOVERY.Chat.SatedFood') + '</p>'
          : '<p>' +
            game.i18n.format('REST-RECOVERY.Chat.RequiredSatedFood', {
              units:
                actorRequiredFood -
                actorUpdates['flags.rest-recovery.data.sated.food'],
            }) +
            '</p>';
    }
    // Note: type water only not supported

    return [actorUpdates, message];
  }

  function getActorConsumableValues(actor) {
    const actorFoodSatedValue =
      foundry.utils.getProperty(actor, 'flags.rest-recovery.data.sated.food') ??
      0;
    const actorWaterSatedValue =
      foundry.utils.getProperty(
        actor,
        'flags.rest-recovery.data.sated.water'
      ) ?? 0;

    const actorNeedsNoFoodWater = foundry.utils.getProperty(
      actor,
      'flags.dnd5e.noFoodWater'
    );
    const actorNeedsNoFood = foundry.utils.getProperty(
      actor,
      'flags.dae.rest-recovery.force.noFood'
    );
    const actorNeedsNoWater = foundry.utils.getProperty(
      actor,
      'flags.dae.rest-recovery.force.noWater'
    );

    const foodUnitsSetting = game.settings.get(
      'rest-recovery',
      'food-units-per-day'
    );
    const actorRequiredFoodUnits =
      foundry.utils.getProperty(
        actor,
        'flags.dae.rest-recovery.require.food'
      ) ?? foundry.utils.getProperty(actor, 'flags.dnd5e.foodUnits');
    let actorRequiredFood =
      isRealNumber(actorRequiredFoodUnits) && foodUnitsSetting !== 0
        ? actorRequiredFoodUnits
        : foodUnitsSetting;

    const waterUnitsSetting = game.settings.get(
      'rest-recovery',
      'water-units-per-day'
    );
    const actorRequiredWaterUnits =
      foundry.utils.getProperty(
        actor,
        'flags.dae.rest-recovery.require.water'
      ) ?? foundry.utils.getProperty(actor, 'flags.dnd5e.waterUnits');
    let actorRequiredWater =
      isRealNumber(actorRequiredWaterUnits) && waterUnitsSetting !== 0
        ? actorRequiredWaterUnits
        : waterUnitsSetting;

    actorRequiredFood =
      actorNeedsNoFoodWater || actorNeedsNoFood ? 0 : actorRequiredFood;
    actorRequiredWater =
      actorNeedsNoFoodWater || actorNeedsNoWater ? 0 : actorRequiredWater;

    return {
      actorRequiredFood,
      actorRequiredWater,
      actorFoodSatedValue,
      actorWaterSatedValue,
    };
  }

  function isRealNumber(inNumber) {
    return (
      !isNaN(inNumber) && typeof inNumber === 'number' && isFinite(inNumber)
    );
  }
}
