// ##################################################################################################
// Read First!!!!
// World Scripter Macro.
// Coating item helper functions for macros.
// v1.0.0
// Dependencies:
//  - ElwinHelpers
//  - MidiQOL
//
// Usage:
// Add this macro to the World Scripter compendium or macro folder, or in your own world script (it must be placed after elwin-helpers).
//
// Description:
// This macro exposes mutiple utility functions used by different item macros.
// Exported functions (see each function for documentation):
// - elwinHelpers.coating.getCoatingWeaponFilter
// - elwinHelpers.coating.getCoatingAmmoFilter
// - elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects
// - elwinHelpers.coating.getDefaultCoatingEffectItemData
// - elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects
// - elwinHelpers.coating.handleCoatingItemEffectOnUsePreActiveEffects
// - elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll
//
// To use this coating framwork you must a create a consumable with the following pattern:
//   - Consumable Type: Poison [or any other type]
//   - Poison Type: Injury [or any other subtype supported by the consumable type]
//   - Activation cost: 1 Action [or Bonus]
//   - Target: Self
//   - Range: None
//   - Duration: [your coating application specific duration, e.g.: 1 Minutes]
//   - Limited Uses: 1 of [your amount of doses] per Charges
//   - Uses Prompt: (checked)
//   - Destroy on Empty: (checked) [if desired]
//   - Action type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       function.elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll | Called before targeting is resolved
//       function.elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects | After Active Effects
// One effect must also be added:
//   - [your consumable coating's name]:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Don't apply the effect: (checked)
//      - Duration empty
//      - Effects:
//          - flags.[world|midi-item-showcase-community].appliedCoating | Override | <JSON format of applied coating, see below>
//
// JSON format of applied coating effect:
//  name - Name of the temporary coating effect item (defaults to item's name).
//  img - The image of the temporary coating effect item (defaults to item's image).
//  allowedWeaponTypes - Array of weapon types allowed to be coated
//                       (true means all types allowed, null or undefined means default ["simpleM", "martialM", "simpleR", "martialR"]).
//  allowedDamageTypes - Array of damage types allowed to be coated
//                       (true means all types allowed, null or undefined means default ["slashing", "piercing"]).
//  allowedAmmoTypes - Array of ammo types allowed to be coated
//                     (true means all types allowed, undefined means use default mapping of damage type to ammo type).
//  maxWeaponHits - The maximum number of hits allowed before the coating wears off. (default value of 1, 0 means no limit)
//  maxAmmo - The maximum number of ammos than can be coated with one dose (default value of 1, 0 means ammo not allowed).
//  type - Type of the consumable temporary coating effect item, ex: poison
//         (defaults to item's system type if defined, otherwise it's poison)
//  subtype - Subtype of the consumable temporary coating effect item, ex: injury
//            (defaults to item's system subtype if defined, otherwise it's injury)
//  coatingLabel - The label to use to describe what was applied to the weapon or ammo.
//                 (defaults to "Poisoned" if type or damageType is poison otherwise it's "Coated")
//  coatingDuration - The coating application duration.
//                     (defaults to item's duration if defined, otherwise it's 60 seconds)
//    seconds - The number of seconds.
//    rounds - The number of rounds.
//    turns - The number of turns.
//  damage - Damage to be applied when a coated weapon or ammo hits.
//    formula - Damage formula of the coating item effect to be applied when a coated weapon or ammo hits.
//    type - Damage type to be applied when a coated weapon or ammo hits.
//    onSave - Damage on save, one of: none, half, full (default none).
//  otherDamage - Other damage to be applied when a coated weapon or ammo hits.
//    formula - Other damage formula of the coating item effect to be applied when a coated weapon or ammo hits.
//    type - Other damage type to be applied when a coated weapon or ammo hits (undefined means same type has coated item).
//    onSave - Damage on save, one of: none, half, full (default full).
//    condition - MidiQOL otherCondition expression to determine if the other damage should be applied or not to a target.
//  bonusDamage - Bonus damage to be applied when a coated weapon or ammo hits.
//    formula - Bonus damage formula to be applied when a coated weapon or ammo hits.
//    type - Bonus damage type to be applied when a coated weapon or ammo hits (undefined means same type has coated item).
//    canCrit - Flag to indicate if the bonus damage can do extra damage on a critical hit (default false).
//    condition - MidiQOL condition expression to determine if the bonus damage should be applied or not.
//  save - The save information if needed to apply effect or damage when a coated weapon or ammo hits.
//    ability - The save ability to resist to the coating item effect (default con).
//    dc - The save DC to resist to the coating item effect (default 10).
//  effect - Information on the effect to be applied when a coated weapon or ammo hits.
//    statuses - Statuses of an active effect of the coating item effect.
//    duration - The duration of the active effect.
//    specialDurations - Array of DAE special durations for the active effect.
//    condition - MidiQOL effectCondition expression to determine if the active effect should be applied or not to a target.
//  conditionalStatuses - Array of conditional statuses to be added to the coating item effect AE when a coated weapon or ammo hits if the condition is met.
//    status - Status that can be added to the coating item effect AE.
//    condition - MidiQOL condition expression to determine if the conditional status can be added or not to the statuses of the coating item active effect.
//
// Note: the condition for the conditionalStatuses contains extra data that contains the target save total and DC,
//       this allows for example to add an extra status depending on the level of save failure.
//  targetData:
//    saveDC - The save DC of the coating item effect.
//    saveTotal - The save total of the hit target.
//
// Examples of appliedCoating flag value:
//  1. Basic Poison with damage applied on failed save (DC 10) on a hit.
//  {
//    "damage": {
//      "formula": "1d4",
//      "type": "poison",
//    },
//    "save": {
//    }
//  }
//
//  2. Poison with half damage applied on successful save on a hit.
//  {
//    "damage": {
//      "formula": "12d6",
//      "type": "poison",
//      "onSave": "half"
//    },
//    "save": {
//      "dc": 19
//    }
//  }
//
//  3. Poison with status applied on failed save and extra status in case of failure by 5 or more on a hit.
//  {
//    "save": {
//      "dc": 13
//    },
//    "effect": {
//      "statuses": ["poisoned"],
//      "duration": {"seconds": 3600}
//    },
//    "conditionalStatuses": [
//      {
//        "status": "unconscious",
//        "condition": "(targetData?.saveTotal + 5) <= targetData?.saveDC"
//      }
//    ]
//  }
//
// 4. Oil that adds conditional bonus damage on a hit.
//  {
//    "coatingLabel": "Oiled",
//    "type": "potion",
//    "maxWeaponHits": 3,
//    "maxAmmo": 3,
//    "allowedDamageTypes": true,
//    "bonusDamage": {
//      "formula": "6d6",
//      "canCrit": true,
//      "condition": "raceOrType === 'dragon'"
//    }
//  }
// ###################################################################################################

export function runElwinsHelpersCoating() {
  const VERSION = '1.0.0';
  const MACRO_NAME = 'elwin-helpers-coating';
  const MODULE_ID = 'midi-item-showcase-community';
  const WORLD_MODULE_ID = 'world';
  const MISC_MODULE_ID = 'midi-item-showcase-community';
  const active = true;
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? true;

  const COATING_EFFECT_NAME_PREFIX = 'CoatingAppliedTo';
  const AMMO_TRACKER_MOD = 'ammo-tracker-fvtt';

  // Default allowed weapon types
  const DEFAULT_ALLOWED_WEAPON_TYPES = [
    'simpleM',
    'martialM',
    'simpleR',
    'martialR',
  ];
  // Default allowed weapon damage types
  const DEAULT_ALLOWED_DMG_TYPES = ['slashing', 'piercing'];
  // Default mapping between damage type and ammo type
  const DEFAULT_ALLOWED_AMMO_TYPES_BY_DMG_TYPE = new Map([
    ['piercing', ['arrow', 'crossbowBolt', 'blowgunNeedle', 'firearmBullet']],
    ['bludgeoning', ['slingBullet']],
  ]);

  /**
   * Active effect duration
   * @typedef Duration
   * @property {number} seconds - The number of seconds.
   * @property {number} rounds - The number of rounds.
   * @property {number} turns - The number of turns.
   */

  /**
   * Applied coating damage data.
   * @typedef AppliedCoatingDamage
   * @property {string} formula - Damage formula of the coating item effect to be applied when a coated weapon or ammo hits.
   * @property {string} type - Damage type to be applied when a coated weapon or ammo hits.
   * @property {string} [onSave="none"] - Damage on save, one of: none, half, full.
   */

  /**
   * Applied coating damage data.
   * @typedef AppliedCoatingOtherDamage
   * @property {string} formula - Other damage formula of the coating item effect to be applied when a coated weapon or ammo hits.
   * @property {string|undefined} type - Other damage type to be applied when a coated weapon or ammo hits (undefined means same type has coated item).
   * @property {string} [onSave="full"] - Damage on save, one of: none, half, full.
   * @property {string|undefined} condition - MidiQOL otherCondition expression to determine if the other damage should be applied or not to a target.
   */

  /**
   * Applied coating bonus damage data.
   * @typedef AppliedCoatingBonusDamage
   * @property {string} formula - Bonus damage formula to be applied when a coated weapon or ammo hits.
   * @property {string|undefined} type - Bonus damage type to be applied when a coated weapon or ammo hits (undefined means same type has coated item).
   * @property {boolean} [canCrit=false] - Flag to indicate if the bonus damage can do extra damage on a critical hit.
   * @property {string} condition - MidiQOL condition expression to determine if the bonus damage should be applied or not.
   */

  /**
   * Applied coating save data.
   * @typedef AppliedCoatingSave
   * @property {string} [ability="con"] - The save ability to resist to the coating item effect.
   * @property {number} [dc=10] - The save DC to resist to the coating item effect.
   */

  /**
   * Applied coating item active effect data.
   * @typedef AppliedCoatingActiveEffect
   * @property {string[]} statuses - Statuses of an active effect of the coating item effect.
   * @property {Duration} duration - The duration of the active effect.
   * @property {string[]} [specialDurations=[]] - Array of DAE special durations for the active effect.
   * @property {string|undefined} condition - MidiQOL effectCondition expression to determine if the active effect should be applied or not to a target.
   */

  /**
   * Conditional statuses that can be added to the coating item effect AE.
   * @typedef ConditionalAppliedCoatingStatuses
   * @property {string} status - Status that can be added to the coating item effect AE.
   * @property {string} condition - MidiQOL condition expression to determine if the conditional status can be added or not to the statuses of the coating item active effect.
   */

  /**
 * Applied coating effect values.
 * @typedef {object} AppliedCoating
 * @property {string} origin - The UUID of the item that was used to apply the coating. [forced value]
 * @property {string} name - Name of the temporary coating effect item (defaults to item's name).
 * @property {string} img - The image of the temporary coating effect item (defaults to item's image).
 * @property {string[]|undefined|null|true} [allowedWeaponTypes=undefined] - Array of weapon types allowed to be coated
 *                                                          (true means all types allowed, null or undefined means default DEFAULT_ALLOWED_WEAPON_TYPES).
 * @property {string[]|undefined|null|true} [allowedDamageTypes=undefined] - Array of damage types allowed to be coated
 *                                                          (true means all types allowed, null or undefined means default DEAULT_ALLOWED_DMG_TYPES).

 * @property {string[]|undefined|null|true} [allowedAmmoTypes=undefined] - Array of ammo types allowed to be coated
 *                  (true means all types allowed, undefined means use mapping of damage type to ammo type from DEFAULT_ALLOWED_AMMO_TYPES_BY_DMG_TYPE).
 * @property {number} [maxWeaponHits=1] - The maximum number of hits allowed before the coating wears off. (0 means no limit)
 * @property {number} [maxAmmo=1] - The maximum number of ammos than can be coated in one use (0 means ammo not allowed).
 * @property {string} type - Type of the consumable temporary coating effect item, ex: poison
 *                           (defaults to item's system type if defined, otherwise it's poison)
 * @property {string} subtype - Subtype of the consumable temporary coating effect item, ex: injury
 *                              (defaults to item's system subtype if defined, otherwise it's injury)
 * @property {string} coatingLabel - The label to use to describe what was applied to the weapon or ammo.
 *                                   (defaults to "Poisoned" if type or damageType is poison otherwise it's "Coated")
 * @property {Duration} coatingDuration - The coating application duration.
 *                                        (defaults to item's duration if defined, otherwise it's 60 seconds)
 * @property {AppliedCoatingDamage} damage - Damage to be applied when a coated weapon or ammo hits.
 * @property {AppliedCoatingOtherDamage} otherDamage - Other damage to be applied when a coated weapon or ammo hits.
 * @property {AppliedCoatingBonusDamage} bonusDamage - Bonus damage to be applied when a coated weapon or ammo hits.
 * @property {AppliedCoatingSave} save - The save information if needed to apply effect or damage when a coated weapon or ammo hits.
 * @property {AppliedCoatingActiveEffect} effect - Information on the effect to be applied when a coated weapon or ammo hits.
 * @property {ConditionalAppliedCoatingStatuses[]} conditionalStatuses - Array of conditional statuses to be added to the coating item effect AE when a coated weapon or ammo hits.
 */

  const dependencies = ['midi-qol'];
  if (
    hasValidElwinHelpersVersion() &&
    globalThis.elwinHelpers?.requirementsSatisfied(MACRO_NAME, dependencies)
  ) {
    // Set a version to facilitate dependency check
    exportIdentifier('elwinHelpers.coating.version', VERSION);

    exportIdentifier(
      'elwinHelpers.coating.getCoatingWeaponFilter',
      getCoatingWeaponFilter
    );
    exportIdentifier(
      'elwinHelpers.coating.getCoatingAmmoFilter',
      getCoatingAmmoFilter
    );
    exportIdentifier(
      'elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects',
      handleCoatingItemOnUsePostActiveEffects
    );
    exportIdentifier(
      'elwinHelpers.coating.getDefaultCoatingEffectItemData',
      getDefaultCoatingEffectItemData
    );
    exportIdentifier(
      'elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects',
      handleCoatedItemOnUsePostActiveEffects
    );
    exportIdentifier(
      'elwinHelpers.coating.handleCoatingItemEffectOnUsePreActiveEffects',
      handleCoatingItemEffectOnUsePreActiveEffects
    );
    exportIdentifier(
      'elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll',
      handleCoatedItemOnUsePostDamageRoll
    );
  }

  /**
   * Returns true if elwin helpers' version is valid for this world script.
   * @returns {boolean} true if elwin helpers' version is valid for this world script.
   */
  function hasValidElwinHelpersVersion() {
    if (
      !foundry.utils.isNewerVersion(
        globalThis?.elwinHelpers?.version ?? '1.1',
        '2.7'
      )
    ) {
      const errorMsg = `${MACRO_NAME}: The Elwin Helpers world script must be installed, active and have a version greater than or equal 2.7.0`;
      ui.notifications.error(errorMsg);
      return false;
    }
    return true;
  }

  /**
   * Removes a previously exported function or variable and exports the specifed function or variable if the macro is active.
   *
   * @param {string} exportedIdentifierName the name of the exported function.
   * @param {function} exportedValue the function or variable to export.
   */
  function exportIdentifier(exportedIdentifierName, exportedValue) {
    if (foundry.utils.getProperty(globalThis, exportedIdentifierName)) {
      const lastIndex = exportedIdentifierName.lastIndexOf('.');
      delete foundry.utils.getProperty(
        globalThis,
        exportedIdentifierName.substring(0, lastIndex)
      )[exportedIdentifierName.substring(lastIndex + 1)];
    }
    if (active) {
      foundry.utils.setProperty(
        globalThis,
        exportedIdentifierName,
        exportedValue
      );
    }
  }

  /**
   * Returns a weapon filter function for the specified options.
   * The filter will receive as a param, a weapon item.
   * It returns true if the weapon does not have ammo and both of allowedWeaponTypes and allowedDamageTypes options are true (AND between options).
   *
   * @param {object} options - The options for the weapon filter.
   * @param {string[]|true} options.allowedWeaponTypes - The allowed weapon types (true means all types allowed).
   * @param {string[]|true} options.allowedDamageTypes - The allowed damage types (true means all types allowed).
   * @returns {function} a weapon filter for the specified options.
   */
  function getCoatingWeaponFilter({ allowedWeaponTypes, allowedDamageTypes }) {
    return function (item) {
      return (
        !item.system?.properties?.has('amm') &&
        (allowedWeaponTypes === true ||
          allowedWeaponTypes.includes(item.system?.type?.value)) &&
        (allowedDamageTypes === true ||
          item.system?.damage?.parts?.some((part) =>
            allowedDamageTypes.includes(part[1])
          ))
      );
    };
  }

  /**
   * Returns an ammo filter function for the specified options.
   * The filter will receive as a param, a consumable item of type ammo.
   * It returns true if either of allowedAmmoTypes or allowedDamageTypes options are true (OR between options).
   *
   * @param {object} options - The options for the ammo filter.
   * @param {string[]|true} options.allowedAmmoTypes - The allowed ammo types (true means all types allowed).
   * @param {string[]|true} options.allowedDamageTypes - The allowed damage types (true means all types allowed).
   * @returns {function} an ammo filter for the specified options.
   */
  function getCoatingAmmoFilter({ allowedAmmoTypes, allowedDamageTypes }) {
    return function (item) {
      return (
        (allowedAmmoTypes === true && allowedDamageTypes === true) ||
        (allowedAmmoTypes !== true &&
          allowedAmmoTypes.includes(item.system.type?.subtype)) ||
        (allowedDamageTypes !== true &&
          item.system?.damage?.parts?.some((part) =>
            allowedDamageTypes.includes(part[1])
          ))
      );
    };
  }

  /**
   * Handles the coating of a weapon or ammo.
   * Selects a weapon or ammunition on which to apply the coating defined on the item's AE (in the appliedCoating flag).
   * Once selected, creates a macro to handle the coated item and coating effect and mutate (dnd5e < v3.2) or apply an
   * enchantment on the selected item to be coated. If the Ammo Tracker module is active, updates its values if necessary.
   *
   * @param {object} parameters - The midi macro parameters and custom optional ones for coating application.
   * @param {Actor5e} parameters.actor - The actor that used the item.
   * @param {Token5e} parameters.token - The token associated to the actor.
   * @param {Item5e} parameters.rolledItem - The item used.
   * @param {MidiQOL.Workflow} parameters.workflow - The MidiQOL current workflow.
   * @param {function|undefined} parameters.weaponFilter - A custom weapon filter to be used to select allowed weapons.
   *                            (by default one is created using the values from the appliedCoating effect flag using getCoatingWeaponFilter)
   * @param {function|undefined} parameters.ammoFilter - A custom ammo filter to be used to select allowed ammos.
   *                            (by default one is created using the values from the appliedCoating effect flag using getCoatingAmmoFilter)
   * @param {function|undefined} parameters.getCoatingEffectItemData - A custom function to retrieve the temporary coating effect item.
   *                            (by default one is created using the values from the appliedCoating effect flag using getDefaultCoatingEffectItemData)
   */
  async function handleCoatingItemOnUsePostActiveEffects({
    actor,
    token,
    workflow,
    rolledItem,
    weaponFilter,
    ammoFilter,
    getCoatingEffectItemData,
  }) {
    const appliedCoating = getAppliedCoating(workflow, rolledItem);
    if (!appliedCoating) {
      return;
    }
    const {
      allowedWeaponTypes,
      allowedDamageTypes,
      allowedAmmoTypes,
      maxAmmo,
      maxWeaponHits,
    } = appliedCoating;
    weaponFilter ??= getCoatingWeaponFilter({
      allowedWeaponTypes,
      allowedDamageTypes,
    });
    if (!ammoFilter && maxAmmo) {
      ammoFilter = getCoatingAmmoFilter({
        allowedAmmoTypes,
        allowedDamageTypes,
      });
    }
    console.warn(`${MACRO_NAME} | filters`, {
      weaponFilter,
      ammoFilter,
      maxAmmo,
    });
    const { selectedItem, coatedItem } = await selectCoatingWeaponOrAmmo(
      actor,
      rolledItem,
      {
        weaponFilter,
        ammoFilter,
        maxAmmo,
      }
    );
    if (!selectedItem || !coatedItem) {
      return;
    }

    const effectName = `${COATING_EFFECT_NAME_PREFIX}-${coatedItem.id}`;
    const macroName = `${effectName}-by-${actor.uuid}`;

    if (coatedItem.type === 'weapon' && maxWeaponHits) {
      appliedCoating.uses = maxWeaponHits;
    } else if (coatedItem.type === 'consumable') {
      appliedCoating.uses = Math.max(0, coatedItem.system?.quantity ?? 0);
    }

    // Create macro to handle poison effect (this is done to allow existing item macro to be untouched),
    // but delete if it already exists.
    await game.macros.getName(macroName)?.delete();
    const [coatingMacro] = await Macro.createDocuments([
      {
        name: macroName,
        type: 'script',
        scope: 'global',
        command: getCoatingItemMacro(
          appliedCoating,
          getCoatingEffectItemData ?? getDefaultCoatingEffectItemData,
          macroName
        ),
      },
    ]);

    let mainEffect;
    if (foundry.utils.isNewerVersion(game.system.version, '3.2')) {
      const enchantmentEffectData = getCoatingApplicationEnchantment(
        rolledItem,
        appliedCoating,
        macroName
      );

      // Removes previous enchantment if it exists
      await elwinHelpers.deleteAppliedEnchantments(rolledItem.uuid);
      // Add enchantment to weapon or ammo
      mainEffect = await ActiveEffect.create(enchantmentEffectData, {
        parent: coatedItem,
        keepOrigin: true,
      });
    } else {
      mainEffect = await handleCoatingWarpgateMutation(
        rolledItem,
        actor,
        token,
        selectedItem,
        coatedItem,
        appliedCoating,
        effectName,
        macroName
      );
    }

    if (coatingMacro && mainEffect) {
      await mainEffect.addDependent(coatingMacro);
    }

    // Make the proper adjustments for Ammo Tracker
    if (
      game.modules.get(AMMO_TRACKER_MOD)?.active &&
      selectedItem.type === 'consumable' &&
      coatedItem.id !== selectedItem.id &&
      actor.type === 'character'
    ) {
      for (let combat of game.combats) {
        const actorAmmoAttr = `projectileData.${actor.id}`;
        const actorAmmo = combat.getFlag(AMMO_TRACKER_MOD, actorAmmoAttr);
        if (actorAmmo?.[selectedItem.id]) {
          const updatedActorAmmo = foundry.utils.deepClone(actorAmmo);
          updatedActorAmmo[selectedItem.id] =
            updatedActorAmmo[selectedItem.id] - appliedCoating.uses;
          updatedActorAmmo[coatedItem.id] = appliedCoating.uses;
          await combat.setFlag(
            AMMO_TRACKER_MOD,
            actorAmmoAttr,
            updatedActorAmmo
          );
        }
      }
    }
  }

  /**
   * Returns the applied coating for the specified item. The values are converted from a stringified JSON.
   * The values must be set in an active effect having the same name as the item,
   * for which 'Apply Effect to Actor' is not checked, that 'Don't apply the effect' is checked and
   * contains a change for which the key is flags.[world|"midi-item-showcase-community].apppliedCoating.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The MidiQOL current workflow.
   * @param {Item5e} itemUsed - The item used to apply the coating.
   * @returns {AppliedCoating} The applied coating value of the item.
   */
  function getAppliedCoating(currentWorkflow, itemUsed) {
    // Get applied coating default values if not defined
    const appliedCoatingValue = itemUsed.effects
      .find(
        (ae) =>
          ae.name === itemUsed.name &&
          ae.transfer === false &&
          ae.getFlag('dae', 'dontApply') === true
      )
      ?.changes.find((c) =>
        [
          `flags.${WORLD_MODULE_ID}.appliedCoating`,
          `flags.${MISC_MODULE_ID}.appliedCoating`,
        ].includes(c.key)
      )?.value;
    if (!appliedCoatingValue) {
      console.error(
        `${itemUsed.name} | Missing special AE with appliedCoating flag value.`,
        itemUsed
      );
      return undefined;
    }
    try {
      const appliedCoating = JSON.parse(appliedCoatingValue);

      appliedCoating.origin = itemUsed.uuid;
      appliedCoating.name ??= itemUsed.name;
      appliedCoating.img ??= itemUsed.img;
      appliedCoating.maxWeaponHits ??= 1;
      appliedCoating.maxAmmo ??= 1;
      appliedCoating.allowedWeaponTypes ??= DEFAULT_ALLOWED_WEAPON_TYPES;
      appliedCoating.allowedDamageTypes ??= DEAULT_ALLOWED_DMG_TYPES;
      appliedCoating.allowedAmmoTypes ??=
        appliedCoating.allowedDamageTypes === true
          ? true
          : appliedCoating.allowedDamageTypes.reduce(
              (acc, dmgType) =>
                (acc = acc.concat(
                  DEFAULT_ALLOWED_AMMO_TYPES_BY_DMG_TYPE.get(dmgType) ?? []
                )),
              []
            );
      appliedCoating.type ??= itemUsed.system.type?.value ?? 'poison';
      appliedCoating.subtype ??= itemUsed.system.type?.subtype ?? 'injury';
      if (!appliedCoating.coatingLabel) {
        if (
          appliedCoating.type === 'poison' ||
          appliedCoating.damageType === 'poison'
        ) {
          appliedCoating.coatingLabel =
            CONFIG.DND5E.conditionTypes['poisoned']?.label ?? 'Poisoned';
        } else {
          appliedCoating.coatingLabel = 'Coated';
        }
      }
      if (!appliedCoating.coatingDuration) {
        let duration =
          itemUsed.system?.duration?.value && itemUsed.system?.duration?.units
            ? itemUsed.system.duration
            : { value: 60, units: 'seconds' };
        appliedCoating.coatingDuration = DAE.convertDuration(
          duration,
          currentWorkflow.inCombat
        );
      }
      if (appliedCoating.damage) {
        appliedCoating.damage.onSave ??= 'none';
      }
      if (appliedCoating.otherDamage) {
        appliedCoating.otherDamage.onSave ??= 'full';
      }
      if (appliedCoating.bonusDamage) {
        appliedCoating.bonusDamage.canCrit ??= false;
      }
      if (appliedCoating.save) {
        appliedCoating.save.ability ??= 'con';
        appliedCoating.save.dc ??= 10;
      }
      if (appliedCoating.effect) {
        appliedCoating.effect.statuses ?? [];
        appliedCoating.effect.specialDurations ?? [];
      }
      return appliedCoating;
    } catch (error) {
      console.error(
        `${itemUsed.name} | Invalid json value in special AE with appliedCoating flag value.`,
        itemUsed,
        appliedCoatingValue,
        error
      );
      return undefined;
    }
  }

  /**
   * Returns the selected weapon or ammo to be coated and the effective item to be coated.
   * It can be different if the quantity of the selected weapon or ammo differs from what is allowed.
   * In that case a copy of the selected item is created and its quantity adjusted to the allowed one and
   * the quantity of original selected item is also adjusted.
   *
   * @param {Actor5e} actor - The actor using the item.
   * @param {Item5e} itemUsed - The item used to apply the coating.
   * @param {object} options - Options for filtering the choice of weapons and ammos.
   * @param {function} options.weaponFilter - Weapon filter.
   * @param {function} options.ammoFilter - Ammo filter.
   * @param {number} options.maxAmmo - Maximum number of ammo on which the coating can be applied in one use.
   * @returns {{selectedItem: Item5e, coatedItem: Item5e}} The selected weapon and the coated item, it may be different if the
   *          selectedItem had a greater quantity than the one allowed for coating.
   */
  async function selectCoatingWeaponOrAmmo(
    actor,
    itemUsed,
    { weaponFilter, ammoFilter, maxAmmo }
  ) {
    // Filter to remove items with 0 quantity and those already coated
    const basicFilter = (i) =>
      i.system?.quantity > 0 && !i.getFlag(MODULE_ID, 'appliedCoating.origin');
    const defaultWeaponFilter = (i) => !i.system?.properties?.has('amm');

    let itemChoices = actor.itemTypes.weapon.filter(
      (i) => basicFilter(i) && (weaponFilter ?? defaultWeaponFilter)(i)
    );
    if (maxAmmo && ammoFilter) {
      itemChoices = itemChoices.concat(
        actor.itemTypes.consumable.filter(
          (i) =>
            i.system?.type?.value === 'ammo' && basicFilter(i) && ammoFilter(i)
        )
      );
    }

    if (debug) {
      console.warn(`${MACRO_NAME} | selectWeaponOrAmmo`, { itemChoices });
    }

    const selectedItem = await elwinHelpers.ItemSelectionDialog.createDialog(
      `⚔️ ${itemUsed.name}: Choose your Weapon${
        maxAmmo && ammoFilter ? ' or Ammo' : ''
      }`,
      itemChoices,
      null
    );
    if (!selectedItem) {
      console.error(
        `${MACRO_NAME} | selectWeaponOrAmmo: Weapon or ammo selection was cancelled.`
      );
      return { selectedItem: undefined, coatedItem: undefined };
    }

    let coatedItem = selectedItem;
    const allowedQuantity =
      selectedItem.type === 'consumable'
        ? Math.min(maxAmmo ?? 1, selectedItem.system.quantity)
        : 1;

    if (allowedQuantity !== selectedItem.system.quantity) {
      // Split item with allowed quantity
      let itemData = selectedItem.toObject();
      delete itemData._id;
      itemData.system.quantity = allowedQuantity;
      await actor.updateEmbeddedDocuments('Item', [
        {
          _id: selectedItem.id,
          ['system.quantity']: selectedItem.system.quantity - allowedQuantity,
        },
      ]);
      const [newItem] = await actor.createEmbeddedDocuments('Item', [itemData]);
      coatedItem = newItem;
    }
    return { selectedItem, coatedItem };
  }

  /**
   * Returns the temporary item data for the coating effect.
   *
   * @param {AppliedCoating} appliedCoating - The basic information on the coating that was applied.
   * @param {string} macroName - The name of the macro that handles the coated item.
   *
   * @returns {object} a temporary item data for the coating effect.
   */
  function getDefaultCoatingEffectItemData(appliedCoating, macroName) {
    let coatingItemData = {
      type: 'consumable',
      // TODO use real name or generic one to not give idea of effects...
      name: `${appliedCoating.name} - Effect`,
      img: appliedCoating.img,
      system: {
        type: { value: appliedCoating.type, subtype: appliedCoating.subtype },
        actionType: 'other',
      },
    };
    if (appliedCoating.damage?.formula) {
      coatingItemData.system.damage = {
        parts: [
          [appliedCoating.damage.formula, appliedCoating.damage.type ?? ''],
        ],
      };
    }
    if (appliedCoating.otherDamage?.formula) {
      const otherDamageType = appliedCoating.otherDamage?.type
        ? `[${appliedCoating.otherDamage.type}]`
        : '';
      coatingItemData.system.formula = `${appliedCoating.otherDamage.formula}${otherDamageType}`;
      if (appliedCoating.otherDamage.condition) {
        foundry.utils.setProperty(
          coatingItemData,
          'flags.midi-qol.otherCondition',
          appliedCoating.otherDamage.condition
        );
      }
    }
    if (!foundry.utils.isEmpty(appliedCoating.save)) {
      foundry.utils.setProperty(coatingItemData, 'system.save', {
        ability: appliedCoating.save.ability,
        dc: appliedCoating.save.dc,
        scaling: 'flat',
      });
      foundry.utils.setProperty(
        coatingItemData,
        'flags.midiProperties.saveDamage',
        elwinHelpers.getMidiOnSavePropertyName(
          appliedCoating.damage?.onSave ?? 'none'
        )
      );
      foundry.utils.setProperty(
        coatingItemData,
        'flags.midiProperties.otherSaveDamage',
        elwinHelpers.getMidiOnSavePropertyName(
          appliedCoating.otherDamage?.onSave ?? 'full'
        )
      );
    }
    if (!foundry.utils.isEmpty(appliedCoating.effect)) {
      const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
      let coatingEffect = {
        statuses: appliedCoating.effect.statuses,
        transfer: false,
        [imgPropName]: appliedCoating.img,
        name: `${appliedCoating.name} - Effect`,
        duration: appliedCoating.effect.duration, // TODO set default duration?
        flags: {
          dae: { specialDuration: appliedCoating.effect.specialDurations },
          [MODULE_ID]: { coatingEffect: true },
        },
      };
      coatingItemData.effects = [coatingEffect];
    }
    if (appliedCoating.effect?.condition) {
      foundry.utils.setProperty(
        coatingItemData,
        'flags.midi-qol.effectCondition',
        appliedCoating.effect.condition
      );
    }
    if (!foundry.utils.isEmpty(appliedCoating.conditionalStatuses)) {
      foundry.utils.setProperty(
        coatingItemData,
        'flags.midi-qol.onUseMacroName',
        `[preActiveEffects]${macroName}`
      );
    }
    return coatingItemData;
  }

  /**
   * Returns the item macro to handle the coating item effect.
   *
   * @param {AppliedCoating} appliedCoating - The basic information on the applied coating.
   * @param {function} getCoatingEffectItemData - Function to retrieve the temporary item to apply the coating effect.
   * @param {string} macroName - The name of the macro that will handle the coated item.
   * @returns {string} the item macro to handle the coating item effect.
   */

  function getCoatingItemMacro(
    appliedCoating,
    getCoatingEffectItemData,
    macroName
  ) {
    let macroCmd = `
const MACRO_NAME = "${MACRO_NAME}";
const MODULE_ID = "${MODULE_ID}";
const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? true;
const COATING_EFFECT_NAME_PREFIX = "${COATING_EFFECT_NAME_PREFIX}";
if (debug) {
  console.warn(MACRO_NAME, { phase: args[0].tag ? \`\${args[0].tag}-\${args[0].macroPass}\` : args[0] }, arguments);
}

if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
  const macroData = args[0];
  if (workflow.hitTargets.size === 0 || workflow.aborted) {
    if (debug) {
      console.warn(\`\${MACRO_NAME} | No target hit or workflow was aborted.\`, workflow);
    }
    return;
  }
  await elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects(macroData, workflow, rolledItem, ${getCoatingEffectItemData.name}, "${macroName}");
}`;

    if (!foundry.utils.isEmpty(appliedCoating.conditionalStatuses)) {
      macroCmd += `
if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
  // Should only be called by temp coating item effect
  if (!workflow.options?.appliedCoating || !rolledItem?.effects.some(ae => ae.getFlag(MODULE_ID, "coatingEffect"))) {
    return;
  }
  return await elwinHelpers.coating.handleCoatingItemEffectOnUsePreActiveEffects(workflow, rolledItem, workflow.options.appliedCoating);
}
`;
    }

    if (appliedCoating.bonusDamage?.formula) {
      macroCmd += `
if (args[0].tag === "OnUse" && args[0].macroPass === "postDamageRoll") {
  return await elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll(workflow, rolledItem);
}
`;
    }

    if (!foundry.utils.isNewerVersion(game.system.version, '3.2')) {
      macroCmd += `
if (args[0] === "off") {
  // Only used for dnd5e < v3.2
  const sourceItem = fromUuidSync(lastArgValue.origin);
  const effectName = \`\${COATING_EFFECT_NAME_PREFIX}-\${sourceItem?.id}\`;
  await warpgate.revert(token.document, effectName);
  // Make sure that if other mutations were added after this one, 
  // we remove added label from the name
  if (sourceItem.name.includes(" ${appliedCoating.coatingLabel}")) {
    const newName = sourceItem.name.replace(" ${appliedCoating.coatingLabel}", "");
    await sourceItem.update({name: newName});
  }

  // Note: warpgate does not remove added flags, it nulls them, unset them is the item was not an added one
  if (sourceItem) {
    await sourceItem.unsetFlag(MODULE_ID, "appliedCoating");
  } 
}
`;
    }

    // Add functions to handle coating
    macroCmd += `

${getCoatingEffectItemData.toString()}
`;
    return macroCmd;
  }

  /**
   * Returns the enchantment data for the application of the coating on the item to be coated.
   *
   * @param {Item5e} itemUsed - The source coating item.
   * @param {AppliedCoating} appliedCoating - Info about the coating to be applied.
   * @param {string} macroName - The name of the macro created to handle the coating effect.
   * @returns {object} the enchantment data for the application of the coating on the item to be coated.
   */
  function getCoatingApplicationEnchantment(
    itemUsed,
    appliedCoating,
    macroName
  ) {
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const effectData = {
      name: `${itemUsed.name} - Application`,
      flags: {
        dnd5e: {
          type: 'enchantment',
        },
      },
      [imgPropName]: itemUsed.img,
      changes: [
        // Adjust item name
        {
          key: 'name',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: ` [${appliedCoating.coatingLabel}]`,
          priority: 20,
        },
        // Adjust item description
        {
          key: 'system.description.value',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: `<p><em>${appliedCoating.coatingLabel} by ${itemUsed.name}</em></p>\n{}`,
          priority: 20,
        },
        // Poison applied data
        {
          key: `flags.${MODULE_ID}.appliedCoating`,
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: JSON.stringify(appliedCoating),
          priority: 20,
        },
        // Add on use item for the coating effect
        {
          key: `flags.midi-qol.onUseMacroName`,
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: `${macroName},postActiveEffects`,
          priority: 20,
        },
      ],
      transfer: false,
      origin: itemUsed.uuid,
      duration: appliedCoating.coatingDuration,
    };
    if (appliedCoating.bonusDamage?.formula) {
      effectData.changes.push(
        // Add bonus damage for the coating effect
        {
          key: `flags.midi-qol.onUseMacroName`,
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: `${macroName},postDamageRoll`,
          priority: 20,
        }
      );
    }
    return effectData;
  }

  /**
   * Handles the warpgate mutation of the coated item and AE to keep track of the coating application's duration.
   *
   * @param {Item5e} itemUsed - The source coating item.
   * @param {Actor5e} sourceActor - The actor using the coated item.
   * @param {Token5e} sourceToken - The token associated to the source actor.
   * @param {Item5e} selectedItem - The weapon/ammo selected on which the coating is to be applied.
   * @param {Item5e} coatedItem - The weapon/ammo on which the coating is to be applied.
   *                                (it can be different than selecteWeapon if its quantity was more than the one allowed).
   * @param {AppliedCoating} appliedCoating - Info about the coating to be applied.
   * @param {string} effectName - The name of the active effect to create
   * @param {string} macroName - The name of the macro created to handle the coating effect.
   * @returns {ActiveEffect5e} the active effect created to track the coating application duration.
   */
  async function handleCoatingWarpgateMutation(
    itemUsed,
    sourceActor,
    sourceToken,
    selectedItem,
    coatedItem,
    appliedCoating,
    effectName,
    macroName
  ) {
    const newItemName = `${selectedItem.name} [${appliedCoating.coatingLabel}]`;
    let onUseMacroNameValue = selectedItem.getFlag(
      'midi-qol',
      'onUseMacroName'
    );
    if (onUseMacroNameValue) {
      onUseMacroNameValue += `,[postActiveEffects]${macroName}`;
    } else {
      onUseMacroNameValue = `[postActiveEffects]${macroName}`;
    }
    if (appliedCoating.bonusDamage?.formula) {
      onUseMacroNameValue += `,[postDamageRoll]${macroName}`;
    }
    console.warn(`${MACRO_NAME} | macro on use`, onUseMacroNameValue);
    const updates = {
      embedded: {
        Item: {
          [coatedItem.id]: {
            name: newItemName,
            system: {
              description: {
                value: `<p><em>${appliedCoating.coatingLabel} by ${
                  itemUsed.name
                }</em></p>\n${selectedItem.system?.description?.value ?? ''}`,
              },
            },
            flags: {
              [MODULE_ID]: { appliedCoating: appliedCoating },
              // Flag to handle the poison effect after an attack that hit
              'midi-qol': { onUseMacroName: onUseMacroNameValue },
            },
          },
        },
      },
    };

    const options = {
      name: effectName,
      comparisonKeys: { Item: 'id' },
    };

    // Remove previous applied AE if it exists (needs to be done before mutating otherwise the [off] callback reverts the mutation)
    await sourceActor.effects.getName(effectName)?.delete();

    if (warpgate.mutationStack(sourceToken.document).getName(effectName)) {
      await warpgate.revert(sourceToken.document, effectName);
    }

    await warpgate.mutate(sourceToken.document, updates, {}, options);

    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const effectData = {
      changes: [
        // Flag to handle end of effect
        {
          key: 'macro.execute',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: macroName,
          priority: 20,
        },
      ],
      origin: coatedItem.uuid, //flag the effect as associated to the poisoned item
      transfer: false,
      duration: appliedCoating.coatingDuration,
      [imgPropName]: itemUsed.img,
      name: effectName,
    };
    const effects = await sourceActor.createEmbeddedDocuments('ActiveEffect', [
      effectData,
    ]);
    return effects[0];
  }

  /**
   * Handles the application of the temporary coating item effect when a coated weapon or ammo hits.
   *
   * @param {object} macroData - The MidiQOL macro data param.
   * @param {MidiQOL.Workflow} currentWorkflow - The current MidiQOL workflow.
   * @param {Item5e} coatedItem - The coated item that was used.
   * @param {function} getCoatingEffectItemData - The function to retrieve the temporary item effect data.
   * @param {string} macroName - The name of the this macro.
   */
  async function handleCoatedItemOnUsePostActiveEffects(
    macroData,
    currentWorkflow,
    coatedItem,
    getCoatingEffectItemData,
    macroName
  ) {
    const appliedCoating = coatedItem.getFlag(MODULE_ID, 'appliedCoating');
    if (!appliedCoating) {
      console.error(
        `${MACRO_NAME} | Missing appliedCoating flag on coated weapon or ammo.`
      );
      return;
    }
    if (
      currentWorkflow.item?.uuid !== coatedItem.uuid &&
      currentWorkflow.ammo?.uuid !== coatedItem.uuid
    ) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Skip, called from a workflow on another item than the coated one.`
        );
      }
      return;
    }

    // Call complete item use with temp item on first hit target
    const coatingEffectItemData = getCoatingEffectItemData(
      appliedCoating,
      macroName
    );
    const coatingEffectItem = new CONFIG.Item.documentClass(
      coatingEffectItemData,
      {
        parent: currentWorkflow.actor,
        temporary: true,
      }
    );

    const options = {
      targetUuids: [macroData.hitTargetUuids[0]],
      workflowOptions: { targetConfirmation: 'none' },
      appliedCoating,
    };
    try {
      // Only trigger coating item effect if there is some damage or active effet that needs to be triggered by it.
      if (
        appliedCoating.damage ||
        appliedCoating.otherDamage ||
        appliedCoating.save ||
        appliedCoating.effect
      ) {
        await MidiQOL.completeItemUse(coatingEffectItem, {}, options);
      }
    } finally {
      // When the coated item has uses, update uses
      if (appliedCoating.uses) {
        const newUses = appliedCoating.uses - 1;
        if (newUses > 0) {
          if (foundry.utils.isNewerVersion(game.system.version, '3.2')) {
            appliedCoating.uses = newUses;
            await updateAppliedCoatingForEnchantment(
              appliedCoating,
              coatedItem
            );
          } else {
            await coatedItem.setFlag(MODULE_ID, 'appliedCoating.uses', newUses);
          }
        } else {
          // The maximum uses has been reached, the poisoned weapon effect expires...
          if (foundry.utils.isNewerVersion(game.system.version, '3.2')) {
            await elwinHelpers.deleteAppliedEnchantments(appliedCoating.origin);
          } else {
            const effectName = `${COATING_EFFECT_NAME_PREFIX}-${coatedItem.id}`;
            await currentWorkflow.actor.effects.getName(effectName)?.delete();
          }
        }
      }
    }
  }

  /**
   * Handles the preActiveEffects phase of a coating item effect to process conditional effects.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current MidiQOL workflow.
   * @param {Item5e} coatedItem - The coated item that was used.
   * @param {AppliedCoating} appliedCoating - Info about the coating to be applied.
   */
  async function handleCoatingItemEffectOnUsePreActiveEffects(
    currentWorkflow,
    coatedItem,
    appliedCoating
  ) {
    if (foundry.utils.isEmpty(appliedCoating?.conditionalStatuses)) {
      return;
    }
    const coatingEffect = coatedItem.effects.find(
      (ae) => !ae.transfer && ae.getFlag(MODULE_ID, 'coatingEffect')
    );
    if (!coatingEffect) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Could not find coatingEffect.`,
          coatedItem
        );
      }
      return;
    }
    const target = currentWorkflow.hitTargets.first();
    if (!currentWorkflow.applicationTargets.has(target)) {
      return;
    }
    const conditionData = MidiQOL.createConditionData({
      workflow: currentWorkflow,
      target,
      item: coatedItem,
      extraData: {
        targetData: {
          saveDC: currentWorkflow.saveDC,
          saveTotal: currentWorkflow.saveDisplayData?.find(
            (sdd) => sdd.target === target
          )?.rollTotal,
        },
      },
    });
    for (let conditionalStatus of appliedCoating.conditionalStatuses) {
      if (!conditionalStatus?.condition || !conditionalStatus?.status) {
        continue;
      }
      const returnValue = await MidiQOL.evalCondition(
        conditionalStatus.condition,
        conditionData,
        {
          errorReturn: false,
          async: true,
        }
      );
      if (returnValue) {
        coatingEffect.statuses.add(conditionalStatus.status);
      } else {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | Condition to add conditional status was not fulfilled.`,
            {
              condition: conditionalStatus.condition,
              conditionalStatus,
              returnValue,
            }
          );
        }
      }
    }
  }

  /**
   * Handles the coating effect bonus damage that occurs during the coated item worflow.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi workflow.
   * @param {Item5e} coatedItem - The coated item that was used.
   */
  async function handleCoatedItemOnUsePostDamageRoll(
    currentWorkflow,
    coatedItem
  ) {
    if (!currentWorkflow.hitTargets.size) {
      // Not target hit, do nothing
      return;
    }
    if (currentWorkflow.hitTargets.size > 1) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Bonus damage can be applied to only one hit target, skip.`
        );
      }
      return;
    }
    let appliedCoating = coatedItem.getFlag(MODULE_ID, 'appliedCoating');
    if (!appliedCoating) {
      console.error(
        `${MACRO_NAME} | Missing appliedCoating flag on coated weapon or ammo.`
      );
      return;
    }

    if (appliedCoating.bonusDamage.condition) {
      const target = currentWorkflow.hitTargets.first();
      const conditionData = MidiQOL.createConditionData({
        workflow: currentWorkflow,
        target,
        item: currentWorkflow.item,
      });
      const returnValue = await MidiQOL.evalCondition(
        appliedCoating.bonusDamage.condition,
        conditionData,
        {
          errorReturn: false,
          async: true,
        }
      );
      if (!returnValue) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | Condition to apply bonus was not fulfilled.`,
            {
              condition: appliedCoating.bonusDamage.condition,
              conditionData,
              returnValue,
            }
          );
        }
        return;
      }
    }
    let options = {};
    if (appliedCoating.bonusDamage.canCrit) {
      options = elwinHelpers.getDamageRollOptions(currentWorkflow);
    }
    let damageType = appliedCoating.bonusDamage.type;
    if (!damageType && currentWorkflow.damageRolls?.length) {
      damageType = currentWorkflow.damageRolls[0].options?.type;
    }
    if (!damageType) {
      damageType = currentWorkflow.defaultDamageType ?? 'bludgeoning';
    }
    options.type = damageType;
    options.flavor = `${appliedCoating.name} - Bonus Damage`;
    const bonusDamageRoll = await new CONFIG.Dice.DamageRoll(
      appliedCoating.bonusDamage.formula,
      coatedItem?.getRollData() ?? currentWorkflow.actor.getRollData(),
      options
    ).evaluate();

    if (currentWorkflow.workflowOptions?.damageRollDSN !== false) {
      await MidiQOL.displayDSNForRoll(bonusDamageRoll, 'damageRoll');
    }

    let bonusDamageRolls = currentWorkflow.bonusDamageRolls ?? [];
    bonusDamageRolls.push(bonusDamageRoll);

    currentWorkflow.setBonusDamageRolls(bonusDamageRolls);
  }

  /**
   * Updates the appliedCoating flag of a coating enchantment on a coated item.
   *
   * @param {AppliedCoating} appliedCoating - The info about the applied coating.
   * @param {Item5e} coatedItem - The coated item for which to update its coating enchantment.
   */
  async function updateAppliedCoatingForEnchantment(
    appliedCoating,
    coatedItem
  ) {
    // Get enchantment AE
    const coatingEnchantment = coatedItem.effects.find(
      (ae) =>
        ae.transfer === false &&
        ae.origin === appliedCoating.origin &&
        ae.getFlag(game.system.id, 'type') === 'enchantment'
    );
    const appliedCoatingKey = `flags.${MODULE_ID}.appliedCoating`;
    if (!coatingEnchantment?.changes.find((c) => c.key === appliedCoatingKey)) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Missing appliedCoating flag from enchantment AE`,
          coatedItem
        );
      }
      return;
    }
    // Update value
    const newChanges = foundry.utils.deepClone(coatingEnchantment.changes);
    newChanges.find((c) => c.key === appliedCoatingKey).value =
      JSON.stringify(appliedCoating);
    await coatingEnchantment.update({ changes: newChanges });
  }
}
