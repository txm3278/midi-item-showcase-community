// ##################################################################################################
// Read First!!!!
// Allows to create potent poison doses, to apply poisons to weapon or ammunitions a bonus action,
// to ignore poison resistance, and adds proficiency with poisoner's kit.
// v1.0.0
// Author: Elwin#1410 based on WurstKorn
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro, [preTargeting][preItemRoll][postActiveEffects]
//  - Elwin Helpers world script
//
// How to configure:
// The feature details must be:
//   - Feature Type: Feat
//   - Activation cost: 1 Hour
//   - Target: Self
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before the item is rolled
//       ItemMacro | After Active Effects
//   - This item macro code must be added to the DIME code of this item.
// One effect must also be added:
//   - Poisoner:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preTargeting
//          - system.tools.pois.prof | Custom | Proficient
//          - system.traits.idr.value | Add | Poison
//
// Usage:
// This is item must be used to activate its effect. It also adds active effects to give proficiency
// to Poisoner's Kit and ignore poison resistance.
//
// Description:
// In the preTargeting (actor OnUse) phase of any item (in owner's workflow):
//   If the item rolled is of system type poison and has an appliedCoating flag in an AE,
//   change it's activation to a bonus action if it's not already the case
// In the preItemRoll (item OnUse) phase of the Poisoners (in owner's workflow):
//   Validates that the owner has a Poisoner's Kit and at least 50gp in its inventory.
// In the postActiveEffects phase of the Poisoner (in owner's workflow):
//   If the owner already has a Potent Poison item in its inventory, update its quantity
///  else search for a Potent Poison item the world's items, if not found search
//   in MISC item compendium and if still not found use a default Potent Poison item data from this macro
//   and add it with the proper quantity to the owner's inventory.
//   The owner's gp amount is also reduced by the proper amount.
// ###################################################################################################

export async function poisoner({
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
  const DEFAULT_ITEM_NAME = 'Poisoner';
  const MODULE_ID = 'midi-item-showcase-community';
  const MISC_MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;
  const DEFAULT_POISONERS_KIT_NAME = "Poisoner's Kit";
  const DEFAULT_POTENT_POISON_NAME = 'Potent Poison';

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.7'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
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
    const hasAppliedCoatingValue =
      workflow.item?.system.type?.value === 'poison' &&
      workflow.item?.effects.some(
        (ae) =>
          ae.name === workflow.item?.name &&
          ae.transfer === false &&
          ae.getFlag('dae', 'dontApply') === true &&
          ae.changes.some(
            (c) => c.key === `flags.${MODULE_ID}.appliedCoating` && c.value
          )
      );
    if (!hasAppliedCoatingValue) {
      return;
    }
    if (workflow.item?.system.activation?.type === 'bonus') {
      return;
    }
    foundry.utils.setProperty(workflow.item, 'system.activation.type', 'bonus');
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    if (!actor.items.getName(DEFAULT_POISONERS_KIT_NAME)) {
      ui.notifications.warn(
        `${DEFAULT_ITEM_NAME} | You need the Poisoner's Kit to create Potent Poison`
      );
      return false;
    }
    let gold = actor.system.currency?.gp ?? 0;
    if (gold < 50) {
      ui.notifications.warn(
        `${DEFAULT_ITEM_NAME} | You need at least 50gp to create ${DEFAULT_POTENT_POISON_NAME}. You have: ${gold}gp.`
      );
      return false;
    }
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    const gold = actor.system.currency?.gp ?? 0;
    const newGold = gold - 50;
    let quantity = actor.system.attributes?.prof ?? 0;

    const potentPoisonVialItem = actor.items.find(
      (i) =>
        i.type === 'consumable' &&
        i.system.type?.value === 'poison' &&
        i.name === DEFAULT_POTENT_POISON_NAME
    );
    let potentPoisonVialItemData;
    if (potentPoisonVialItem) {
      quantity += potentPoisonVialItem.system.quantity ?? 0;
    } else {
      potentPoisonVialItemData = await findOrGetPoisonItemData();
      foundry.utils.setProperty(
        potentPoisonVialItemData,
        'system.quantity',
        quantity
      );
    }

    await actor.update({ 'system.currency.gp': newGold });
    if (potentPoisonVialItem) {
      await potentPoisonVialItem.update({ 'system.quantity': quantity });
    } else {
      await actor.createEmbeddedDocuments('Item', [potentPoisonVialItemData]);
    }
  }

  /**
   * Returns a potent posion item data, it looks first in the world's items, then in MISC item compendium,
   * if none found use a default item data from this macro.
   *
   * @returns {object} A potent poison item data.
   */
  async function findOrGetPoisonItemData() {
    // Lookup in world items
    let potentPoison = game.items.find(
      (i) =>
        i.type === 'consumable' &&
        i.system.type?.value === 'poison' &&
        i.name === DEFAULT_POTENT_POISON_NAME
    );
    if (debug) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | ${DEFAULT_POTENT_POISON_NAME} from world items: `,
        potentPoison
      );
    }
    // Lookup in MISC compendium
    if (!potentPoison) {
      const compendiumIndex = await game.packs
        .get(`${MISC_MODULE_ID}.misc-items`)
        .getIndex({ fields: ['type', 'name', 'system.type'] });
      const potentPoisonUuid = compendiumIndex.find(
        (id) =>
          id.type === 'consumable' &&
          id.system.type?.value === 'poison' &&
          id.name === DEFAULT_POTENT_POISON_NAME
      )?.uuid;
      if (potentPoisonUuid) {
        potentPoison = await fromUuid(potentPoisonUuid);
      }
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | ${DEFAULT_POTENT_POISON_NAME} from MISC compendium: `,
          potentPoison
        );
      }
    }
    if (potentPoison) {
      return potentPoison.toObject();
    }
    return getPotentPoisonItemData();
  }

  /**
   * Return the default potent poison item data.
   * @returns {object} The default potent poison item data.
   */
  function getPotentPoisonItemData() {
    return {
      name: 'Potent Poison',
      type: 'consumable',
      system: {
        description: {
          value:
            '<em>Replace this with a proper description.</em>\n<details>\n<summary>Credits and Instructions</summary>\n<h2>Made by Elwin</h2>\n<h3>Requires:</h3>\n<ul>\n   <li>Times-up</li>\n   <li>Warp Gate (dnd5e < v3.2)</li>\n   <li>Elwin Helpers (Enable in Settings)</li>\n</ul>\n<h3>Optionals:</h3>\n<ul>\n   <li>Ammo Tracker</li>\n</ul>\n<p><strong>Usage:</strong></p>\n<p>This item must be used to activate its effect. It applies an enchantment (or a mutation for dnd5e < v3.2) that applies a poison coating on the selected weapon or ammunition.</p></details>\n',
          chat: '',
        },
        source: {
          custom: '',
          book: "Tasha's Cauldron of Everything",
          page: 'pg. 80',
          license: '',
        },
        quantity: 1,
        weight: 0,
        price: { value: 100, denomination: 'gp' },
        identified: true,
        activation: { type: 'action', cost: 1 },
        duration: { value: '1', units: 'minute' },
        target: { type: 'self' },
        uses: {
          value: 1,
          max: '1',
          per: 'charges',
          recovery: '',
          autoDestroy: true,
          prompt: true,
        },
        unidentified: { description: 'Gear' },
        type: { value: 'poison', subtype: 'injury' },
      },
      flags: {
        'midi-qol': {
          onUseMacroName:
            '[preItemRoll]function.elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll,[postActiveEffects]function.elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects',
        },
      },
      effects: [
        {
          icon: 'icons/consumables/potions/potion-tube-corked-orange.webp',
          name: 'Potent Poison',
          changes: [
            {
              key: 'flags.midi-item-showcase-community.appliedCoating',
              mode: 5,
              value:
                '{\n  "damage": {\n    "formula": "2d8",\n    "type": "poison"\n  },\n  "save": {\n    "dc": 14\n  },\n  "effect": {\n    "statuses": ["poisoned"],\n    "duration": {"rounds": 1, "turns": 1},\n    "specialDurations": ["turnEndSource"]\n  }\n}',
              priority: 20,
            },
          ],
          transfer: false,
        },
      ],
      img: 'icons/consumables/potions/potion-tube-corked-orange.webp',
    };
  }
}
