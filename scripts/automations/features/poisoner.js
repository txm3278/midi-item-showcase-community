// ##################################################################################################
// Read First!!!!
// Allows to create potent poison doses, to apply poisons to weapon or ammunitions a bonus action,
// to ignore poison resistance, and adds proficiency with poisoner's kit.
// v2.2.0
// Author: Elwin#1410 based on WurstKorn
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro, [preTargeting][preItemRoll][postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This is item must be used to activate its effect. It also adds active effects to give proficiency
// to Poisoner's Kit and ignore poison resistance.
//
// Description:
// In the preTargeting (actor OnUse) phase of any item (in owner's workflow) [legacy]:
//   If the item rolled is of system type poison and the current activity
//   has an identifier equal to "apply-coating", change it's activation to a bonus action
//   if it's not already the case.
// In the preItemRoll (item OnUse) phase of the Poisoners (in owner's workflow):
//   Validates that the owner has a Poisoner's Kit and at least 50gp in its inventory.
// In the postActiveEffects phase of the Poisoner (in owner's workflow):
//   If the owner already has a Potent Poison item in its inventory, update its quantity
///  else search for a Potent Poison item the world's items, if not found search
//   in MISC item compendium and if still not found use a default Potent Poison item data from this macro
//   and add it with the proper quantity to the owner's inventory.
//   The owner's gp amount is also reduced by the proper amount.
// ###################################################################################################

export async function poisoner({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const DEFAULT_ITEM_NAME = 'Poisoner';
  const MODULE_ID = 'midi-item-showcase-community';
  const MISC_MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;
  const DEFAULT_POISONERS_KIT_IDENT = 'poisoners-kit';
  const DEFAULT_POTENT_POISON_NAME = 'Potent Poison';
  const DEFAULT_POTENT_POISON_IDENT = 'potent-poison';
  const COATING_EFFECT_IDENT = 'coating-effect';

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.5')) {
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    // Only called for the 2014 rules.
    const isApplyPoison =
      workflow.item?.system.type?.value === 'poison' &&
      workflow.activity?.type === 'enchant' &&
      workflow.activity?.identifier === 'apply-coating';
    if (!isApplyPoison) {
      // Not an apply poison activity
      return;
    }
    const applyPoisonActivity = workflow.item.system.activities?.get(workflow.activity.id);
    if (applyPoisonActivity?.activation?.type === 'bonus') {
      // Already a bonus action
      return;
    }

    const updates = {};
    const activation = foundry.utils.deepClone(applyPoisonActivity.activation ?? {});
    activation.type = 'bonus';
    activation.cost = 1;
    foundry.utils.setProperty(updates, `system.activities.${workflow.activity.id}.activation`, activation);
    workflow.item.actor._embeddedPreparation = true;
    workflow.item.updateSource(updates);
    delete workflow.item.actor._embeddedPreparation;
    workflow.item.prepareFinalAttributes();
    workflow.activity = workflow.item.system.activities.get(workflow.activity.id);

    // TODO remove this when midi fixes the usage of this (activity) instead of workflow.activity
    elwinHelpers.registerWorkflowHook(
      workflow,
      `midi-qol.preItemRoll.${applyPoisonActivity.uuid}`,
      ({ activity, config }) => {
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | midi-qol.preItemRoll`, { activity, config });
        }
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            'midi-qol.preItemRoll',
            'Convert to Bonus Action',
            workflow,
            config.workflow,
            debug
          )
        ) {
          return;
        }
        // Note: this is the only way to affect the activity that is used to check reaction used and bonus action.
        activity.activation = activation;
      },
      'poisoner'
    );
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    if (workflow.activity?.identifier !== 'brew-poison') {
      return;
    }
    if (!actor.items.find((i) => i.identifier === DEFAULT_POISONERS_KIT_IDENT)) {
      ui.notifications.warn(
        `${scope.macroItem.name} | You need the Poisoner's Kit to create ${DEFAULT_POTENT_POISON_NAME}`
      );
      return false;
    }
    let gold = actor.system.currency?.gp ?? 0;
    if (gold < 50) {
      ui.notifications.warn(
        `${scope.macroItem.name} | You need at least 50gp to create ${DEFAULT_POTENT_POISON_NAME}. You have: ${gold}gp.`
      );
      return false;
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    const createDoses = actor.system.attributes?.prof ?? 0;
    let quantity = createDoses;
    let saveDC = undefined;
    const rules = elwinHelpers.getRules(scope.macroItem);
    if (rules === 'modern') {
      const incAbility = Object.keys(
        scope.macroItem.advancement.byType['AbilityScoreImprovement']?.[0]?.value.assignments
      )[0];
      saveDC = 8 + (actor.system.attributes?.prof ?? 0) + (incAbility ? actor.system.abilities[incAbility].mod : 0);
    }
    let potentPoisonVialItem = actor.items.find(
      (i) =>
        i.type === 'consumable' &&
        i.system.type?.value === 'poison' &&
        i.identifier === DEFAULT_POTENT_POISON_IDENT &&
        elwinHelpers.getRules(i) === rules &&
        (!saveDC ||
          i.system.activities?.some(
            (a) => a.type === 'save' && a.identifier === COATING_EFFECT_IDENT && a.save?.dc?.value === saveDC
          ))
    );
    let potentPoisonVialItemData;
    if (potentPoisonVialItem) {
      quantity += potentPoisonVialItem.system.quantity ?? 0;
    } else {
      potentPoisonVialItemData = await findOrGetPoisonItemData(scope.macroItem);
      foundry.utils.setProperty(potentPoisonVialItemData, 'system.quantity', quantity);
      if (saveDC) {
        // Set the save DC on the item data
        const activityIds = Object.keys(potentPoisonVialItemData.system.activities ?? {});
        const activity = activityIds
          .map((id) => potentPoisonVialItemData.system.activities[id])
          .find((a) => a.type === 'save' && a.midiProperties.identifier === COATING_EFFECT_IDENT);
        if (!activity) {
          console.error(
            `${scope.macroItem.name} | Invalid Potent Poison item, could not find ${COATING_EFFECT_IDENT} activity.`,
            { potentPoisonVialItemData }
          );
          return;
        }
        foundry.utils.setProperty(activity, 'save.dc.formula', saveDC.toString());
      }
    }

    if (potentPoisonVialItem) {
      await potentPoisonVialItem.update({ 'system.quantity': quantity });
    } else {
      const items = await actor.createEmbeddedDocuments('Item', [potentPoisonVialItemData]);
      potentPoisonVialItem = items[0];
    }
    const message = `<p>${createDoses} doses of <strong>${potentPoisonVialItem.name}</strong>${
      saveDC ? ` <em>(DC ${saveDC})</em>` : ''
    } were added to your inventory.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard('beforeButtons', workflow, message);
  }

  /**
   * Returns a potent posion item data, it looks first in the world's items, then in MISC item compendium,
   * if none found use a default item data from this macro.
   *
   * @param {Item5e} sourceItem - The Poisoner feat.
   * @returns {object} A potent poison item data.
   */
  async function findOrGetPoisonItemData(sourceItem) {
    // Lookup in world items
    const rules = elwinHelpers.getRules(sourceItem);
    let potentPoison = game.items.find(
      (i) =>
        i.type === 'consumable' &&
        i.system.type?.value === 'poison' &&
        i.identifier === DEFAULT_POTENT_POISON_IDENT &&
        elwinHelpers.getRules(i) === rules
    );
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | ${DEFAULT_POTENT_POISON_NAME} from world items: `, potentPoison);
    }
    // Lookup in MISC compendium
    if (!potentPoison) {
      const compendiumIndex = await game.packs
        .get(`${MISC_MODULE_ID}.misc-items`)
        .getIndex({ fields: ['type', 'name', 'identifier', 'system.type', 'system.source.rules'] });
      const potentPoisonUuid = compendiumIndex.find(
        (id) =>
          id.type === 'consumable' &&
          id.system.type?.value === 'poison' &&
          id.system.identifier === DEFAULT_POTENT_POISON_IDENT &&
          elwinHelpers.getRules(id) === rules
      )?.uuid;
      if (potentPoisonUuid) {
        potentPoison = await fromUuid(potentPoisonUuid);
      }
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | ${DEFAULT_POTENT_POISON_NAME} from MISC compendium: `, potentPoison);
      }
    }
    if (potentPoison) {
      return potentPoison.toObject();
    }
    return getPotentPoisonItemData(sourceItem);
  }

  /**
   * Return the default potent poison item data.
   *
   * @param {Item5e} sourceItem - The Poisoner feat.
   * @returns {object} The default potent poison item data.
   */
  function getPotentPoisonItemData(sourceItem) {
    const rules = elwinHelpers.getRules(sourceItem);
    return {
      name: 'Potent Poison',
      type: 'consumable',
      img: 'icons/consumables/potions/potion-tube-corked-orange.webp',
      system: {
        description: {
          value:
            '<em>Replace this with a proper description.</em>\n<details>\n<summary>Credits and Instructions</summary>\n<h2>Made by Elwin</h2>\n<h3>Requires:</h3>\n<ul>\n   <li>Times-up</li>\n   <li>Elwin Helpers (Enable in Settings)</li>\n</ul>\n<h3>Optionals:</h3>\n<ul>\n   <li>Ammo Tracker</li>\n</ul>\n<p><strong>Usage:</strong></p>\n<p>This item must be used to activate its effect. It applies an enchantment that applies a poison coating on the selected weapon or ammunition.</p></details>',
        },
        source:
          rules === 'legacy'
            ? { book: "Tasha's Cauldron of Everything", page: '80', revision: 1, rules: '2014' }
            : { book: "Player's Handbook (2024)", page: '206', revision: 1, rules: '2024' },
        quantity: 1,
        price: { value: 100, denomination: 'gp' },
        identified: true,
        uses: { max: '1', autoDestroy: true },
        unidentified: { description: 'Gear' },
        type: { value: 'poison', subtype: 'injury' },
        activities: {
          hY59afcW2HXvGfaZ: {
            type: 'save',
            _id: 'hY59afcW2HXvGfaZ',
            activation: { type: 'none' },
            description: { chatFlavor: 'Apply poison effect' },
            duration: { units: 'inst' },
            effects: [{ _id: 'flmuyOHEgBDkMwtI', onSave: false }],
            range: { units: 'any' },
            target: { affects: { count: '1', type: 'creature' } },
            damage: {
              parts: [{ number: 2, denomination: 8, types: ['poison'] }],
              onSave: 'none',
            },
            save: {
              ability: ['con'],
              dc: { calculation: '', formula: '14' },
            },
            useConditionText: 'workflow?.hitTargets?.size === 1',
            midiProperties: { confirmTargets: 'never', automationOnly: true, identifier: 'coating-effect' },
            name: 'Poison - Effect',
          },
          T6UQ9vqnheqpf3qU: {
            type: 'enchant',
            _id: 'T6UQ9vqnheqpf3qU',
            activation: { type: rules === 'legacy' ? 'action' : 'bonus' },
            consumption: {
              targets: [{ type: 'itemUses', value: '1', target: '' }],
            },
            description: { chatFlavor: 'Apply poison to weapon or ammo' },
            duration: { units: 'inst' },
            effects: [{ _id: 'MrESIQ1i7yNgiwvQ', riders: { activity: ['hY59afcW2HXvGfaZ'] } }],
            range: { units: 'self' },
            restrictions: { allowMagical: true },
            midiProperties: { identifier: 'apply-coating' },
            name: 'Apply Poison',
          },
        },
        identifier: 'potent-poison',
      },
      flags: {
        'midi-qol': {
          onUseMacroName:
            '[preItemRoll]function.elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll,[postActiveEffects]function.elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects',
        },
      },
      effects: [
        {
          name: 'Potent Poison',
          img: 'icons/consumables/potions/potion-tube-corked-orange.webp',
          _id: 'flmuyOHEgBDkMwtI',
          type: 'base',
          disabled: true,
          duration: { rounds: 1, turns: 1 },
          transfer: false,
          statuses: ['poisoned'],
          flags: {
            dae: { stackable: 'noneNameOnly', specialDuration: ['turnEndSource'] },
          },
        },
        {
          type: 'enchantment',
          name: 'Potent Poison - Application',
          img: 'icons/consumables/potions/potion-tube-corked-orange.webp',
          disabled: true,
          _id: 'MrESIQ1i7yNgiwvQ',
          changes: [
            {
              key: 'name',
              mode: 5,
              value: '{} [Poisoned]',
              priority: 20,
            },
            {
              key: 'system.description.value',
              mode: 5,
              value: '<p><em>Poisoned by Potent Poison</em></p>{}',
              priority: 20,
            },
          ],
          transfer: false,
          duration: { seconds: 60 },
          flags: {
            dae: { stackable: 'noneNameOnly' },
          },
        },
      ],
    };
  }
}
