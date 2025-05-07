// ##################################################################################################
// Read First!!!!
// World Scripter Macro.
// Coating item helper functions for macros.
// v2.1.1
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
// - elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects
// - elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll
// - elwinHelpers.coating,handleCoatingEffectActivityConditionalStatuses
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
//   - [your consumable coating's name] - Config:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Don't apply the effect: (checked)
//      - Duration empty
//      - Effects:
//          - flags.[world|midi-item-showcase-community].appliedCoating | Override | <JSON format of applied coating, see below>
//
// JSON format of applied coating effect:
//  allowedWeaponTypes - Array of weapon types allowed to be coated
//                       (true means all types allowed, null or undefined means default ["simpleM", "martialM", "simpleR", "martialR"]).
//  allowedDamageTypes - Array of damage types allowed to be coated
//                       (true means all types allowed, null or undefined means default ["slashing", "piercing"]).
//  allowedAmmoTypes - Array of ammo types allowed to be coated
//                     (true means all types allowed, undefined means use default mapping of damage type to ammo type).
//  maxWeaponHits - The maximum number of hits allowed before the coating wears off. (default value of 1, 0 means no limit)
//  maxAmmo - The maximum number of ammos than can be coated with one dose (default value of 1, 0 means ammo not allowed).
//  conditionalStatuses - Array of conditional statuses to be applied when a coated weapon or ammo hits if the condition is met.
//    status - Status to apply when the weapon or ammo hits.
//    specialDurations - Special durations to set on the conditional status.
//    condition - MidiQOL condition expression to determine if the conditional status can be applied or not on hit.
//
// Note: the condition for the conditionalStatuses contains extra data that contains the target save total and DC,
//       this allows for example to add an extra status depending on the level of save failure.
//  targetData:
//    saveDC - The save DC of the coating item effect.
//    saveTotal - The save total of the hit target.
//
// Examples of appliedCoating flag value:
//  1. Poison with extra status in case of failure by 5 or more on a hit.
//  {
//    "conditionalStatuses": [
//      {
//        "status": "unconscious",
//        "specialDurations": ["isDamaged"],
//        "condition": "target.statuses?.has('poisoned') && (targetData?.saveTotal + 5) <= targetData?.saveDC"
//      }
//    ]
//  }
//
// 2. Oil that allows any damage types and has 3 uses.
//  {
//    "maxWeaponHits": 3,
//    "maxAmmo": 3,
//    "allowedDamageTypes": true,
//  }
// ###################################################################################################

export function runElwinsHelpersCoating() {
  const VERSION = '2.1.1';
  const MACRO_NAME = 'elwin-helpers-coating';
  const MODULE_ID = 'midi-item-showcase-community';
  const WORLD_MODULE_ID = 'world';
  const MISC_MODULE_ID = 'midi-item-showcase-community';
  const APPLY_COATING_IDENT = 'apply-coating';
  const COATING_EFFECT_IDENT = 'coating-effect';
  const active = true;
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? true;

  const AMMO_TRACKER_MOD = 'ammo-tracker-fvtt';

  // Default allowed weapon types
  const DEFAULT_ALLOWED_WEAPON_TYPES = ['simpleM', 'martialM', 'simpleR', 'martialR'];
  // Default allowed weapon damage types
  const DEAULT_ALLOWED_DMG_TYPES = ['slashing', 'piercing'];
  // Default mapping between damage type and ammo type
  const DEFAULT_ALLOWED_AMMO_TYPES_BY_DMG_TYPE = new Map([
    ['piercing', ['arrow', 'crossbowBolt', 'blowgunNeedle', 'firearmBullet']],
    ['bludgeoning', ['slingBullet']],
  ]);

  /**
   * Conditional statuses to be applied when a coated weapon or ammo hits if the condition is met.
   * @typedef ConditionalAppliedCoatingStatuses
   * @property {string} status - Status to apply when the weapon or ammo hits.
   * @property {string[]} specialDurations - Special durations to set on the conditional status.
   * @property {string} condition - MidiQOL condition expression to determine if the conditional status can be applied or not on a hit.
   */

  /**
 * Applied coating effect values.
 * @typedef {object} AppliedCoating
 * @property {string} origin - The UUID of the item that was used to apply the coating. [forced value]
 * @property {string} name - Name of the temporary coating effect item (defaults to item's name).
 * @property {string[]|undefined|null|true} [allowedWeaponTypes=undefined] - Array of weapon types allowed to be coated
 *                                                          (true means all types allowed, null or undefined means default DEFAULT_ALLOWED_WEAPON_TYPES).
 * @property {string[]|undefined|null|true} [allowedDamageTypes=undefined] - Array of damage types allowed to be coated
 *                                                          (true means all types allowed, null or undefined means default DEAULT_ALLOWED_DMG_TYPES).

 * @property {string[]|undefined|null|true} [allowedAmmoTypes=undefined] - Array of ammo types allowed to be coated
 *                  (true means all types allowed, undefined means use mapping of damage type to ammo type from DEFAULT_ALLOWED_AMMO_TYPES_BY_DMG_TYPE).
 * @property {number} [maxWeaponHits=1] - The maximum number of hits allowed before the coating wears off. (0 means no limit)
 * @property {number} [maxAmmo=1] - The maximum number of ammos than can be coated in one use (0 means ammo not allowed).
 * @property {ConditionalAppliedCoatingStatuses[]} conditionalStatuses - Array of conditional statuses to be added to the coating effect activity AE when a coated weapon or ammo hits.
 */

  const dependencies = ['midi-qol'];
  if (hasValidElwinHelpersVersion() && globalThis.elwinHelpers?.requirementsSatisfied(MACRO_NAME, dependencies)) {
    // Set a version to facilitate dependency check
    exportIdentifier('elwinHelpers.coating.version', VERSION);

    exportIdentifier('elwinHelpers.coating.getCoatingWeaponFilter', getCoatingWeaponFilter);
    exportIdentifier('elwinHelpers.coating.getCoatingAmmoFilter', getCoatingAmmoFilter);
    exportIdentifier(
      'elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects',
      handleCoatingItemOnUsePostActiveEffects
    );
    exportIdentifier(
      'elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects',
      handleCoatedItemOnUsePostActiveEffects
    );
    exportIdentifier('elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll', handleCoatedItemOnUsePostDamageRoll);
    exportIdentifier(
      'elwinHelpers.coating.handleCoatingEffectActivityConditionalStatuses',
      handleCoatingEffectActivityConditionalStatuses
    );
  }

  /**
   * Returns true if elwin helpers' version is valid for this world script.
   * @returns {boolean} true if elwin helpers' version is valid for this world script.
   */
  function hasValidElwinHelpersVersion() {
    if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.2')) {
      const errorMsg = `${MACRO_NAME}: The Elwin Helpers world script must be installed, active and have a version greater than or equal to 3.2.0`;
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
      delete foundry.utils.getProperty(globalThis, exportedIdentifierName.substring(0, lastIndex))[
        exportedIdentifierName.substring(lastIndex + 1)
      ];
    }
    if (active) {
      foundry.utils.setProperty(globalThis, exportedIdentifierName, exportedValue);
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
        (allowedWeaponTypes === true || allowedWeaponTypes.includes(item.system?.type?.value)) &&
        (allowedDamageTypes === true ||
          item.system?.damage?.base?.types?.some((type) => allowedDamageTypes.includes(type)))
      );
    };
  }

  /**
   * Returns an ammunition filter function for the specified options.
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
        (allowedAmmoTypes !== true && allowedAmmoTypes.includes(item.system.type?.subtype)) ||
        (allowedDamageTypes !== true &&
          item.system?.damage?.parts?.some((part) => allowedDamageTypes.includes(part[1])))
      );
    };
  }

  /**
   * Handles the coating of a weapon or ammunition.
   * Selects a weapon or ammunition on which to apply the coating defined on the item's AE (in the appliedCoating flag).
   * Once selected, creates a macro to handle the coated item and coating effect and apply an enchantment on the selected
   * item to be coated. If the Ammo Tracker module is active, updates its values if necessary.
   *
   * @param {object} parameters - The MidiQOL macro parameters and custom optional ones for coating application.
   * @param {Actor5e} parameters.actor - The actor that used the item.
   * @param {MidiQOL.Workflow} parameters.workflow - The MidiQOL current workflow.
   * @param {Item5e} parameters.rolledItem - The item used.
   * @param {function|undefined} parameters.weaponFilter - A custom weapon filter to be used to select allowed weapons.
   *                            (by default one is created using the values from the appliedCoating effect flag using getCoatingWeaponFilter)
   * @param {function|undefined} parameters.ammoFilter - A custom ammo filter to be used to select allowed ammos.
   *                            (by default one is created using the values from the appliedCoating effect flag using getCoatingAmmoFilter)
   */
  async function handleCoatingItemOnUsePostActiveEffects({ actor, workflow, rolledItem, weaponFilter, ammoFilter }) {
    if (debug) {
      console.warn(MACRO_NAME, { phase: `${workflow?.tag}-${workflow?.macroPass}` }, arguments);
    }
    if (workflow.activity?.type !== 'enchant' && workflow.activity?.identifier !== APPLY_COATING_IDENT) {
      // Not the apply coating enchant activity
      return;
    }
    const appliedCoating = getAppliedCoating(workflow, rolledItem);
    if (!appliedCoating) {
      return;
    }
    const enchantmentData = validateEnchantment(workflow, rolledItem);
    if (!enchantmentData) {
      return;
    }

    const { allowedWeaponTypes, allowedDamageTypes, allowedAmmoTypes, maxAmmo, maxWeaponHits } = appliedCoating;
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
    console.warn(`${MACRO_NAME} | filters`, { weaponFilter, ammoFilter, maxAmmo });
    const { selectedItem, coatedItem } = await selectCoatingWeaponOrAmmo(actor, rolledItem, {
      weaponFilter,
      ammoFilter,
      maxAmmo,
    });
    if (!selectedItem || !coatedItem) {
      // Not selected item or item to be coated
      return;
    }

    if (coatedItem.type === 'weapon' && maxWeaponHits) {
      appliedCoating.uses = maxWeaponHits;
    } else if (coatedItem.type === 'consumable') {
      appliedCoating.uses = Math.max(0, coatedItem.system?.quantity ?? 0);
    }

    const enchantmentEffectData = getCoatingApplicationEnchantment(
      enchantmentData.effect,
      appliedCoating,
      enchantmentData.riderActivity
    );

    const coatingItemOrigName = coatedItem.name;
    const enchantmentEffect = await elwinHelpers.applyEnchantmentToItem(workflow, enchantmentEffectData, coatedItem);
    if (!enchantmentEffect) {
      console.error(`${MACRO_NAME} | Enchantment effect could not be created.`, enchantmentEffectData);
      return;
    }

    // Add message about coating
    const infoMsg = `<p><strong>${rolledItem.name}</strong> was applied to <strong>${coatingItemOrigName}</strong>.</p>`;
    await elwinHelpers.insertTextIntoMidiItemCard('beforeButtons', workflow, infoMsg);

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
          updatedActorAmmo[selectedItem.id] = updatedActorAmmo[selectedItem.id] - appliedCoating.uses;
          updatedActorAmmo[coatedItem.id] = appliedCoating.uses;
          await combat.setFlag(AMMO_TRACKER_MOD, actorAmmoAttr, updatedActorAmmo);
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
      .find((ae) => ae.type !== 'enchantment' && !ae.transfer && ae.getFlag('dae', 'dontApply') === true)
      ?.changes.find((c) =>
        [`flags.${WORLD_MODULE_ID}.appliedCoating`, `flags.${MISC_MODULE_ID}.appliedCoating`].includes(c.key)
      )?.value;
    try {
      const appliedCoating = JSON.parse(appliedCoatingValue ?? '{}');

      appliedCoating.origin = currentWorkflow.activity.uuid;
      appliedCoating.maxWeaponHits ??= 1;
      appliedCoating.maxAmmo ??= 1;
      appliedCoating.allowedWeaponTypes ??= DEFAULT_ALLOWED_WEAPON_TYPES;
      appliedCoating.allowedDamageTypes ??= DEAULT_ALLOWED_DMG_TYPES;
      appliedCoating.allowedAmmoTypes ??=
        appliedCoating.allowedDamageTypes === true
          ? true
          : appliedCoating.allowedDamageTypes.reduce(
              (acc, dmgType) => (acc = acc.concat(DEFAULT_ALLOWED_AMMO_TYPES_BY_DMG_TYPE.get(dmgType) ?? [])),
              []
            );
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
  async function selectCoatingWeaponOrAmmo(actor, itemUsed, { weaponFilter, ammoFilter, maxAmmo }) {
    // Filter to remove items with 0 quantity and those already coated
    const basicFilter = (i) => i.system?.quantity > 0 && !i.getFlag(MODULE_ID, 'appliedCoating.origin');
    const defaultWeaponFilter = (i) => !i.system?.properties?.has('amm');

    let itemChoices = actor.itemTypes.weapon.filter((i) => basicFilter(i) && (weaponFilter ?? defaultWeaponFilter)(i));
    if (maxAmmo && ammoFilter) {
      itemChoices = itemChoices.concat(
        actor.itemTypes.consumable.filter((i) => i.system?.type?.value === 'ammo' && basicFilter(i) && ammoFilter(i))
      );
    }

    if (debug) {
      console.warn(`${MACRO_NAME} | selectWeaponOrAmmo`, { itemChoices });
    }

    const selectedItem = await elwinHelpers.ItemSelectionDialog.createDialog(
      `⚔️ ${itemUsed.name}: Choose your Weapon${maxAmmo && ammoFilter ? ' or Ammo' : ''}`,
      itemChoices,
      null
    );
    if (!selectedItem) {
      console.error(`${MACRO_NAME} | selectWeaponOrAmmo: Weapon or ammo selection was cancelled.`);
      return { selectedItem: undefined, coatedItem: undefined };
    }

    let coatedItem = selectedItem;
    const allowedQuantity =
      selectedItem.type === 'consumable' ? Math.min(maxAmmo ?? 1, selectedItem.system.quantity) : 1;

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
   * Validates if the apply coating enchant activity is configured properly with an effect and a coated effect rider activity.
   *
   * @param {MidiQOL.Workflow} - The MidiQOL current workflow.
   * @param {Item5e} coatingItem - The item used to apply a coating to another item.
   * @returns {object|undefined} The enchantment profile if valid, undefined otherwise.
   */
  function validateEnchantment(workflow, coatingItem) {
    const applyCoatingActivity = workflow.activity;
    const enchantmentProfiles = applyCoatingActivity.availableEnchantments;
    if (!enchantmentProfiles?.length || enchantmentProfiles?.length > 1) {
      console.error(
        `${MACRO_NAME} | The ${applyCoatingActivity.name} activity must have one and only one enchantement profile.`
      );
      return undefined;
    }
    const enchantmentProfile = elwinHelpers.getAutomatedEnchantmentSelectedProfile(workflow);
    if (!enchantmentProfile?.effect) {
      console.error(
        `${MACRO_NAME} | The ${applyCoatingActivity.name} activity enchantment profile must have one enchantment effect.`
      );
      return undefined;
    }
    const coatedEffectActivities = enchantmentProfile.riders?.activity
      .filter((activityId) => coatingItem.system.activities?.get(activityId)?.identifier === COATING_EFFECT_IDENT)
      ?.map((activityId) => coatingItem.system.activities?.get(activityId));
    if (!coatedEffectActivities?.size || coatedEffectActivities?.size > 1) {
      console.error(
        `${MACRO_NAME} | The ${applyCoatingActivity.name} activity enchantment profile must have one and only one rider activity with a "coating-effect" identifier.`
      );
      return undefined;
    }
    const coatedEffectActivity = coatedEffectActivities.first();
    if (coatedEffectActivity.hasAttack || (!coatedEffectActivity.save && !coatedEffectActivity.hasDamage)) {
      console.error(
        `${MACRO_NAME} | The ${applyCoatingActivity.name} activity enchantment profile rider activity must not be an attack and must have damage or a save.`
      );
      return undefined;
    }
    if (!coatedEffectActivity.save && coatedEffectActivity.hasDamage && coatedEffectActivity.effects?.length) {
      console.error(
        `${MACRO_NAME} | The ${applyCoatingActivity.name} activity enchantment profile damage rider activity must not have effects.`
      );
      return undefined;
    }
    return { effect: enchantmentProfile.effect, riderActivity: coatedEffectActivity };
  }

  /**
   * Returns the enchantment data for the application of the coating on the item to be coated.
   *
   * @param {ActiveEffect5e} enchantmentEffect - The enchantment effect to apply the coating.
   * @param {AppliedCoating} appliedCoating - Info about the coating to be applied.
   * @param {Activity} coatingEffectActivity - The rider coating effect activity of the enchantment.
   * @returns {object} the enchantment data for the application of the coating on the item to be coated.
   */
  function getCoatingApplicationEnchantment(enchantmentEffect, appliedCoating, coatingEffectActivity) {
    const enchantmentEffectData = enchantmentEffect.toObject();

    // Poison applied data
    enchantmentEffectData.changes.push({
      key: `flags.${MODULE_ID}.appliedCoating`,
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: JSON.stringify(appliedCoating),
      priority: 20,
    });
    // Add on use item for the coating effect
    enchantmentEffectData.changes.push({
      key: `flags.midi-qol.onUseMacroName`,
      mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
      value: 'function.elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects,postActiveEffects',
      priority: 20,
    });
    if (coatingEffectActivity.hasDamage && !coatingEffectActivity.save) {
      // Add bonus damage for the coating effect
      enchantmentEffectData.changes.push({
        key: `flags.midi-qol.onUseMacroName`,
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: 'function.elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll,postDamageRoll',
        priority: 20,
      });
    }
    return enchantmentEffectData;
  }

  /**
   * Handles the application of the coating effect activity when a coated weapon or ammunition hits.
   *
   * @param {object} parameters - The MidiQOL macro parameters
   * @param {MidiQOL.Workflow} parameters.workflow - The MidiQOL current workflow.
   * @param {Item5e} parameters.rolledItem - The item used.
   */
  async function handleCoatedItemOnUsePostActiveEffects({ workflow, rolledItem }) {
    if (debug) {
      console.warn(MACRO_NAME, { phase: `${workflow.tag}-${workflow.macroPass}` }, arguments);
    }
    if (!(workflow.activity?.identifier === COATING_EFFECT_IDENT || workflow.activity?.hasAttack)) {
      // Skip, only an attack or the coating effect activity are supported
      return;
    }
    if (!workflow.hitTargets?.size || workflow.aborted) {
      if (debug) {
        console.warn(`${MACRO_NAME} | No target hit or workflow was aborted.`, workflow);
      }
      return;
    }

    const coatedItem = rolledItem;
    const appliedCoating = coatedItem.getFlag(MODULE_ID, 'appliedCoating');
    if (!appliedCoating) {
      console.error(`${MACRO_NAME} | Missing appliedCoating flag on coated weapon or ammo.`);
      return;
    }
    if (workflow.item?.uuid !== coatedItem.uuid && workflow.ammo?.uuid !== coatedItem.uuid) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Skip, called from a workflow on another item attack activity than the coated one.`
        );
      }
      return;
    }

    const target = workflow.hitTargets.first();
    handleCoatingEffectActivityConditionalStatuses(workflow, coatedItem, target, appliedCoating);

    // Call complete activity use with coating effect activity on first hit target
    try {
      // Only trigger coating item effect activity if there is some damage or active effet that needs to be triggered by it.
      // And the current activity is not the coating effect or has not already handled the coating effect activity as an other activity.
      const coatingEffectActivity = coatedItem.system.activities.find((a) => a.identifier === COATING_EFFECT_IDENT);
      if (
        coatingEffectActivity &&
        workflow.activity?.uuid !== coatingEffectActivity.uuid &&
        workflow.otherActivity?.uuid !== coatingEffectActivity.uuid &&
        (coatingEffectActivity.save || coatingEffectActivity.effects?.length)
      ) {
        if (coatingEffectActivity.useCondition) {
          const conditionData = MidiQOL.createConditionData({
            workflow,
            target,
          });
          if (
            !(await MidiQOL.evalCondition(coatingEffectActivity.useCondition, conditionData, {
              async: true,
              errorReturn: false,
            }))
          ) {
            return;
          }
        }
        const config = {
          midiOptions: {
            targetUuids: [target.document?.uuid],
            workflowOptions: { targetConfirmation: 'none' },
            appliedCoating,
            proceedChecks: { checkUse: false },
          },
        };
        await MidiQOL.completeActivityUse(coatingEffectActivity, config);
      }
    } finally {
      // When the coated item has uses, update uses
      if (appliedCoating.uses) {
        const newUses = appliedCoating.uses - 1;
        if (newUses > 0) {
          appliedCoating.uses = newUses;
          await updateAppliedCoatingForEnchantment(appliedCoating, coatedItem);
        } else {
          // The maximum uses has been reached, the poisoned weapon effect expires...
          await elwinHelpers.deleteAppliedEnchantments(appliedCoating.origin);
        }
      }
    }
  }

  /**
   * Handles adding the conditional statuses if at least one of the coating effect associated AEs
   * was applied to the target.
   *
   * @param {MidiQOL.Workflow} workflow - The MidiQOL current workflow.
   * @param {Item5e} coatedItem - The coated item.
   * @param {Token5e} target - The target on which to apply conditional statuses.
   * @param {AppliedCoating} appliedCoating - The applied coating config.
   */
  async function handleCoatingEffectActivityConditionalStatuses(workflow, coatedItem, target, appliedCoating) {
    if (foundry.utils.isEmpty(appliedCoating?.conditionalStatuses)) {
      return;
    }

    // Should only be called by coating effect activity
    const mainActivity = workflow.activity?.identifier === COATING_EFFECT_IDENT ? workflow.activity : null;
    const otherActivity = workflow.otherActivity?.identifier === COATING_EFFECT_IDENT ? workflow.otherActivity : null;
    if (!mainActivity && !otherActivity) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Only a coating effect activity or otherActivity are supported.`, {
          activity: workflow.activity,
          otherActivity: workflow.otherActivity,
        });
      }
      return;
    }
    const activity = {
      applicableEffects: mainActivity ? mainActivity.applicableEffects : otherActivity.applicableEffects,
      effectTargets: mainActivity ? workflow.effectTargets : workflow.otherEffectTargets,
    };

    if (!activity.effectTargets?.has(target)) {
      // No applicable effects were applied to this target skip conditionals
      return;
    }
    const coatedEffectAe = target.actor?.effects?.find(
      (ae) => ae.origin?.startsWith(coatedItem.uuid) && activity.applicableEffects?.some((ae2) => ae2.name === ae.name)
    );
    if (!coatedEffectAe) {
      // No effects applied to this target skip conditionals
      return;
    }

    const conditionData = MidiQOL.createConditionData({
      workflow,
      target,
      item: coatedItem,
      extraData: {
        targetData: {
          saveDC: workflow.saveDC,
          saveTotal: workflow.saveDisplayData?.find((sdd) => sdd.target === target)?.rollTotal,
        },
      },
    });

    const statusEffectsData = [];
    for (let conditionalStatus of appliedCoating.conditionalStatuses) {
      if (!conditionalStatus?.condition || !conditionalStatus?.status) {
        continue;
      }
      const returnValue = await MidiQOL.evalCondition(conditionalStatus.condition, conditionData, {
        errorReturn: false,
        async: true,
      });
      if (returnValue) {
        statusEffectsData.push(conditionalStatus);
      } else {
        if (debug) {
          console.warn(`${MACRO_NAME} | Condition to add conditional status was not fulfilled.`, {
            condition: conditionalStatus.condition,
            conditionalStatus,
            returnValue,
          });
        }
      }
    }
    if (statusEffectsData.length) {
      const statusEffects = await addStatusEffects(coatedItem.uuid, target.actor?.uuid, statusEffectsData);
      // Make the added statuses dependent on the first coated effect applied AE
      for (let statusEffect of statusEffects) {
        // TODO change this when MidiQOL supports more than one effect like ActiveEffect.addDependent
        await MidiQOL.addDependent(coatedEffectAe, statusEffect);
      }
    }
  }

  /**
   * Handles the coating effect bonus damage that occurs during the coated item worflow.
   *
   * @param {object} parameters - The MidiQOL macro parameters
   * @param {MidiQOL.Workflow} parameters.workflow - The MidiQOL current workflow.
   * @param {Item5e} parameters.rolledItem - The item used.
   */
  async function handleCoatedItemOnUsePostDamageRoll({ workflow, rolledItem }) {
    if (debug) {
      console.warn(MACRO_NAME, { phase: `${workflow.tag}-${workflow.macroPass}` }, arguments);
    }
    if (!workflow.activity?.hasAttack) {
      // Skip, not an attack activity
      return;
    }
    if (!workflow.hitTargets?.size) {
      // No target hit, do nothing
      return;
    }
    if (workflow.otherActivity?.identifier === COATING_EFFECT_IDENT) {
      // Skip, extra damage already handled by otherActivity
      return;
    }
    if (workflow.hitTargets.size > 1) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Bonus damage can be applied to only one hit target, skip.`);
      }
      return;
    }
    const coatedItem = rolledItem;
    const target = workflow.hitTargets.first();
    // Get coating effect activity
    const coatingEffectActivity = coatedItem.system.activities.find((a) => a.identifier === COATING_EFFECT_IDENT);
    if (!coatingEffectActivity.hasDamage || coatingEffectActivity.save) {
      // Skip, coating effect activity has no extra damage or has a save
      return;
    }

    if (coatingEffectActivity.useCondition) {
      const conditionData = MidiQOL.createConditionData({
        workflow,
        target,
        item: coatedItem,
      });
      const returnValue = await MidiQOL.evalCondition(coatingEffectActivity.useCondition, conditionData, {
        errorReturn: false,
        async: true,
      });
      if (!returnValue) {
        if (debug) {
          console.warn(`${MACRO_NAME} | Condition to apply bonus damage was not fulfilled.`, {
            condition: coatingEffectActivity.useCondition,
            conditionData,
            returnValue,
          });
        }
        return;
      }
    }

    const config = elwinHelpers.getDamageRollOptions(workflow);
    config.workflow = workflow;
    config.midiOptions ??= {};
    config.midiOptions.fastForward = workflow.midiOptions?.fastForwardDamage;
    config.midiOptions.updateWorkflow = false; // rollFormula will try and restart the workflow

    const dialog = {};
    // Undo the roll toggle since rollFormula will look at it as well
    if (workflow?.rollOptions?.rollToggle) {
      dialog.configure = !dialog.configure;
    }

    const coatedBonusDamageRolls = await coatingEffectActivity.rollDamage(config, dialog, { create: false });
    if (coatedBonusDamageRolls?.length) {
      coatedBonusDamageRolls.forEach((r) => (r.options.flavor = `${coatingEffectActivity.name}`));
      let bonusDamageRolls = workflow.bonusDamageRolls ?? [];
      bonusDamageRolls.push(...coatedBonusDamageRolls);

      await workflow.setBonusDamageRolls(bonusDamageRolls);
    }
  }

  /**
   * Updates the appliedCoating flag of a coating enchantment on a coated item.
   *
   * @param {AppliedCoating} appliedCoating - The info about the applied coating.
   * @param {Item5e} coatedItem - The coated item for which to update its coating enchantment.
   */
  async function updateAppliedCoatingForEnchantment(appliedCoating, coatedItem) {
    // Get enchantment AE
    const coatingEnchantment = coatedItem.effects.find(
      (ae) => ae.isAppliedEnchantment && ae.origin === appliedCoating.origin
    );
    const appliedCoatingKey = `flags.${MODULE_ID}.appliedCoating`;
    if (!coatingEnchantment?.changes.find((c) => c.key === appliedCoatingKey)) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Missing appliedCoating flag from enchantment AE`, coatedItem);
      }
      return;
    }
    // Update value
    const newChanges = foundry.utils.deepClone(coatingEnchantment.changes);
    newChanges.find((c) => c.key === appliedCoatingKey).value = JSON.stringify(appliedCoating);
    await coatingEnchantment.update({ changes: newChanges });
  }

  /**
   * Creates status effects on the specified actor uuid.
   *
   * @param {string} origin - The origin of the status effect.
   * @param {string} actorUuid - The uuid of the actor on which to add the status effect.
   * @param {ConditionalAppliedCoatingStatuses[]} conditionalStatuses - List of conditional status to be added.
   * @returns {ActiveEffect5e[]} A list of status effects that were added to the specified actor.
   */
  async function addStatusEffects(origin, actorUuid, conditionalStatuses) {
    const effects = [];
    for (let conditionalStatus of conditionalStatuses) {
      let effectData = (await ActiveEffect.implementation.fromStatusEffect(conditionalStatus.status)).toObject();
      effectData.origin = origin;
      if (conditionalStatus.specialDurations?.length) {
        foundry.utils.setProperty(effectData, 'flags.dae.specialDuration', conditionalStatus.specialDurations);
      }
      effects.push(effectData);
    }
    return await MidiQOL.createEffects({ actorUuid, effects, options: { keepId: true } });
  }
}
