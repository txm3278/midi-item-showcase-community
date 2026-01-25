// ##################################################################################################
// Flame Arrows, allows to enchant a quiver or bolt case which will add fire damage to ammunitions
// fired from the enchanted container.
// v2.1.0
// Author: Elwin#1410 based on Spoob
// Dependencies:
//  - DAE
//  - MidiQOL "OnUseMacro" [preItemRoll],[preAttackRoll],[postAttackRollComplete],[preDamageRollConfig],[postActiveEffects]
//
// Usage:
// This spell needs to be used to activate. It allows to choose a quiver or bolt case containing arrows of bolts from a target.
// The chosen container is enchanted, and any ammunitions fired from the container will add extra fire damage.
// This damage is added as long as the spell does not expires, the caster concentration is not broken or the maximum
// number of ammunitions that can be fired is not reached.
//
// Description:
// In the preItemRoll phase of the Fire Arrows Enchant Quiver activity (in owner's workflow):
//   Presents a selection dialog of the available quivers or bolt cases having arrows or bolts on the selected target.
//   The selected container is kept in the workflow options.
// In the postActiveEffects phase of the Fire Arrows Enchant Quiver activity (in owner's workflow):
//   Applies an enchantment to the selected quiver and an AE that will add extra fire damage
//   from ammunitions fired from the enchanted container.
// In the preAttackRoll phase of any item used by the owner of the enchanted container (in target's workflow):
//   Registers a hook on dnd5e.preRollAttack.
//   It also makes sure that if the count of ammunition allowed to fire from the enchanted container
//   has been reached, the spell and its enchantment are ended.
// In the dnd5e.preRollAttack hook (in target's workflow):
//   If the workflow associated to the current activity is the same as the one received in the preAttackRoll,
//   changes the label, of ammunitionOptions from the dialog configuration, of an ammunition inside the enchanted container.
// In the postAttackRollComplete phase of any item used by the owner of the enchanted container (in target's workflow):
//   If the current selected ammunition comes from the enchanted container, decreases the remaining ammunitions
//   allowed to be fired. If this makes it reach 0, the spell and the enchantment are ended.
//   It also sets a flag in the workflow options to indicate that a valid enchanted ammunition was used.
// In the preDamageRollConfig phase of any item used by the owner of the enchanted container (in target's workflow):
//   If the workflow options flag to indicate that a valid ammunition as used, calls elwinHelpers.damageConfig.updateBasic
//   to add a hook on dnd5e.preRollDamage that adds the extra fire damage.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Flame Arrows";
const MODULE_ID = "midi-item-showcase-community";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.9")) {
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

export async function flameArrows({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "preItemRoll") {
    return await handleOnUsePreItemRoll(workflow, scope);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    return await handleOnUsePostActiveEffects(actor, workflow, scope);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preAttackRoll") {
    return await handleOnUsePreAttackRollTarget(actor, workflow, scope);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postAttackRollComplete") {
    return handleOnUsePostAttackRollCompleteTarget(actor, workflow, scope);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preDamageRollConfig") {
    return handleOnUsePreDamageRollConfigTarget(workflow, scope, debug);
  }
}

/**
 * Handles the preItemRoll phase of the Fire Arrows spell.
 * Presents a selection dialog of the available quivers or bolt cases having arrows or bolts on the selected target.
 * The selected container is kept in the workflow options.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 * @returns {boolean} - True if the container selection was successful, false otherwise.
 */
async function handleOnUsePreItemRoll(workflow, scope) {
  const target = workflow.targets?.first();
  if (!target) {
    const msg = `${scope.rolledItem.name} | A target must be selected.`;
    ui.notifications.warn(msg);
    return false;
  }
  const isValidContainer = (container) =>
    container && /([^a-z]|\b)(crossbow-bolt-case|quiver)([^a-z]|\b)/i.test(container.identifier);
  const containerChoices = target.actor?.itemTypes.consumable
    .filter(
      (i) =>
        i.system.type?.value === "ammo" &&
        ["arrow", "crossbowBolt"].includes(i.system.type?.subtype) &&
        isValidContainer(i.container),
    )
    .map((i) => i.container);
  if (!containerChoices?.length) {
    const msg = `${scope.rolledItem.name} | Target has no quiver or crossbow bolt case containing arrows or bolts.`;
    ui.notifications.warn(msg);
    return false;
  }
  let selectedContainer = containerChoices[0];
  if (containerChoices.length > 1) {
    selectedContainer = await elwinHelpers.ItemSelectionDialog.createDialog(
      `⚔️ ${scope.rolledItem.name}: Choose a Quiver/Crossbow Bolt Case`,
      containerChoices,
      selectedContainer,
    );
  }
  if (!selectedContainer) {
    // Container selection was cancelled
    const msg = `${scope.rolledItem.name} | No quiver or crossbow bolt case selected.`;
    ui.notifications.warn(msg);
    return false;
  }
  foundry.utils.setProperty(workflow.workflowOptions, "flameArrowsSelectedContainerUuid", selectedContainer.uuid);
  return true;
}

/**
 * Handles the postActiveEffects phase of the Fire Arrows spell.
 * Applies an enchantment to the selected quiver and adds a transfer AE to the target that will add extra fire damage
 * from ammunitions fired from the enchanted container. The enchantment and the transfer AE are both added as dependents
 * of the spell caster concentration's effect. If an error occurs, the expended spell slot is refunded.
 *
 * @param {Actor5e} actor - The caster of the Fire Arrows spell.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 */
async function handleOnUsePostActiveEffects(actor, workflow, scope) {
  const target = workflow.targets?.first();
  let concentrationEffect = undefined;

  const refund = async () => {
    const consumed = MidiQOL.getCachedChatMessage(workflow.itemCardUuid)?.getFlag("dnd5e", "use.consumed");
    if (consumed) {
      await workflow.activity?.refund(consumed);
      await concentrationEffect?.delete();
    }
  };

  concentrationEffect = MidiQOL.getConcentrationEffect(actor, scope.rolledItem.uuid);
  if (!concentrationEffect) {
    console.error(`${scope.rolledItem.name} | Concentration effect for rolled item was not found on actor.`, {
      workflow,
    });
    await refund();
    return;
  }

  if (!target?.actor) {
    console.error(`${scope.rolledItem.name} | Missing target actor.`, { workflow });
    await refund();
    return;
  }

  const selectedContainer = fromUuidSync(
    foundry.utils.getProperty(workflow.workflowOptions, "flameArrowsSelectedContainerUuid"),
  );
  if (!selectedContainer) {
    console.error(`${scope.rolledItem.name} | No quiver or crossbow bolt case selected.`, { workflow });
    await refund();
    return;
  }

  const originalName = selectedContainer.name;
  const enchantmentEffectData = elwinHelpers.getAutomatedEnchantmentSelectedProfile(workflow)?.effect.toObject();
  if (!enchantmentEffectData) {
    console.error(`${scope.rolledItem.name} | Missing enchantment effect.`, { workflow });
    await refund();
    return;
  }
  // Make enchantment effect dependent on concentration effect
  foundry.utils.setProperty(enchantmentEffectData, "flags.dnd5e.dependentOn", concentrationEffect.uuid);

  const spellLevel = workflow.castData.castLevel;
  const ammo = 2 * spellLevel + 6; // 2 * (spellLevel - 3) + 12

  enchantmentEffectData.changes.push({
    key: `flags.${MODULE_ID}.flameArrows`,
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    value: scope.rolledItem.uuid,
  });
  enchantmentEffectData.changes.push({
    key: `flags.${MODULE_ID}.flameArrowsCount`,
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    value: ammo,
  });
  // Delete concentration when this effect is deleted
  enchantmentEffectData.changes.push({ key: "flags.dae.deleteUuid", value: concentrationEffect.uuid });

  // Add enchantment to container
  const enchantmentEffect = await elwinHelpers.applyEnchantmentToItem(
    workflow,
    enchantmentEffectData,
    selectedContainer,
  );
  if (!enchantmentEffect) {
    console.error(`${DEFAULT_ITEM_NAME} | Enchantment effect could not be created on quiver or crossbow bolt case.`, {
      enchantmentEffectData,
    });
    await refund();
    return;
  }

  const bonusDamageEffectData = scope.rolledItem.effects
    .find((ae) => !ae.transfer && ae.type !== "enchantment")
    ?.toObject();
  if (!bonusDamageEffectData) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing target effect.`, { workflow });
    await refund();
  }
  bonusDamageEffectData.name += `-${selectedContainer.id}`;
  bonusDamageEffectData.origin = scope.rolledActivity.uuid;
  // Delete concentration effect when bonus damage effect is deleted
  bonusDamageEffectData.changes.push({ key: "flags.dae.deleteUuid", value: concentrationEffect.uuid });
  // Make bonus damage effect dependent on concentration effect
  foundry.utils.setProperty(bonusDamageEffectData, "flags.dnd5e.dependentOn", concentrationEffect.uuid);

  const [bonusDamageEffect] = await MidiQOL.createEffects({
    actorUuid: target.actor.uuid,
    effects: [bonusDamageEffectData],
  });

  if (!bonusDamageEffect) {
    console.error(`${DEFAULT_ITEM_NAME} | Damage bonus effect could not be created on target.`, {
      bonusDamageEffectData,
    });
    await refund();
    return;
  }

  // Add message about enchanted container
  const infoMsg = `<p>${originalName} from \${tokenName} was enchanted with ${scope.rolledItem.name}.</p>`;
  await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, elwinHelpers.getTargetDivs(target, infoMsg));
}

/**
 * Handles the preAttackRoll phase of any item used by the owner of the enchanted container.
 * Registers a hook on dnd5e.preRollAttack to change the label, of ammunitionOptions from
 * the dialog configuration, of an ammunition inside the enchanted container.
 * It also makes sure that if the count of ammunition allowed to fire from the enchanted container
 * has been reached, the spell and its enchantment are ended.
 *
 * @param {Actor5e} actor - The owner of the enchanted container.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 */
async function handleOnUsePreAttackRollTarget(actor, workflow, scope) {
  // Check if associated enchantment ammo count has reached 0, then removed it
  // TODO uncomment when midi fixes bug with scope.macroActivity undefined with functions on use macros
  //const enchantmentEffect = elwinHelpers.getAppliedEnchantments(scope.macroActivity?.uuid);
  const enchantmentEffect = actor.itemTypes.container
    .find((i) => i.getFlag(MODULE_ID, "flameArrows") === scope.macroItem?.uuid)
    ?.effects.find((ae) => !ae.transfer && ae.type === "enchantment");
  const ammoCount = enchantmentEffect?.changes.find((c) => c.key === `flags.${MODULE_ID}.flameArrowsCount`)?.value ?? 0;
  if (ammoCount <= 0) {
    // Last ammo was already used, delete effect immediately
    await enchantmentEffect?.delete();
  }
  elwinHelpers.registerWorkflowHook(
    workflow,
    "dnd5e.preRollAttack",
    (rollConfig, dialogConfig, messageConfig) => {
      console.warn(`${DEFAULT_ITEM_NAME} | dnd5e.preRollAttack`, { rollConfig, dialogConfig, messageConfig });
      // TODO PGS remove when midi fixes its bug
      if (rollConfig.subject?.ammunitionItem) {
        rollConfig.subject.ammunitionItem = undefined;
      }
      for (let ammunitionOption of dialogConfig?.options?.ammunitionOptions ?? []) {
        if (
          ammunitionOption?.item?.container?.getFlag(MODULE_ID, "flameArrows") === scope.macroItem?.uuid &&
          ammunitionOption.label
        ) {
          const suffix = ` [${scope.macroItem.name}]`;
          if (!ammunitionOption.label.includes(suffix)) {
            ammunitionOption.label += suffix;
          }
        }
      }
    },
    `flameArrows-${scope.macroItem.uuid}`,
  );
}

/**
 * Handles the postAttackRollComplete phase of any item used by the owner of the enchanted container.
 * If the current selected ammunition comes from the enchanted container, decreases the remaining ammunitions
 * allowed to be fired. If this makes it reach 0, the spell and the enchantment are ended.
 * It also sets a flag in the workflow options to indicate that a valid enchanted ammunition was used.
 *
 * @param {Actor5e} actor - The owner of the enchanted container.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 */
async function handleOnUsePostAttackRollCompleteTarget(actor, workflow, scope) {
  if (foundry.utils.getProperty(workflow.workflowOptions, "flameArrowsAmmoUsed") === scope.macroItem?.uuid) {
    // Reset flag, in case a new attack roll is made on the same workflow.
    foundry.utils.setProperty(workflow.workflowOptions, "flameArrowsAmmoUsed", null);
  }

  if (workflow.ammunition?.container?.getFlag(MODULE_ID, "flameArrows") === scope.macroItem?.uuid) {
    // TODO uncomment when midi fixes bug with scope.macroActivity undefined with functions on use macros
    //const enchantmentEffect = elwinHelpers.getAppliedEnchantments(scope.macroActivity?.uuid);
    const enchantmentEffect = actor.itemTypes.container
      .find((i) => i.getFlag(MODULE_ID, "flameArrows") === scope.macroItem?.uuid)
      ?.effects.find((ae) => !ae.transfer && ae.type === "enchantment");
    if (!enchantmentEffect) {
      console.error(`${DEFAULT_ITEM_NAME} | Container enchantment effect could be found on target.`, workflow);
      return;
    }
    const newChanges = foundry.utils.deepClone(enchantmentEffect.changes);
    const countChange = newChanges.find((c) => c.key === `flags.${MODULE_ID}.flameArrowsCount`);
    if (countChange) {
      countChange.value -= 1;
    }
    if (countChange?.value >= 0) {
      // Ammo was used, add indicator preDamageRollConfig
      foundry.utils.setProperty(workflow.workflowOptions, "flameArrowsAmmoUsed", scope.macroItem.uuid);
    }
    if (!countChange || countChange?.value <= 0) {
      // Last ammo was used, delete effect
      await enchantmentEffect.delete();
    } else {
      await enchantmentEffect.update({ changes: newChanges });
    }
  }
}

/**
 * Handles the preDamageRollConfig phase of any item used by the owner of the enchanted container.
 * If the workflow options flag to indicate that a valid ammunition as used, calls elwinHelpers.damageConfig.updateBasic
 * to add a hook on dnd5e.preRollDamage that adds the extra fire damage.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {object} scope - The midi-qol macro call scope object.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
function handleOnUsePreDamageRollConfigTarget(workflow, scope, debug) {
  if (foundry.utils.getProperty(workflow.workflowOptions, "flameArrowsAmmoUsed") === scope.macroItem?.uuid) {
    elwinHelpers.damageConfig.updateBasic(scope, workflow, {
      damageBonusRoll: {
        parts: ["1d6"],
        options: { type: "fire", properties: ["mgc"] },
        base: true,
        situational: false,
      },
      flavor: scope.macroItem.name,
      id: workflow.ammunition?.container?.id,
      debug,
    });
  }
}
