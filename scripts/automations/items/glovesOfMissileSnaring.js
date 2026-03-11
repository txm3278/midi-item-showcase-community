// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Reaction that reduces the damage received from an attack from a ranged weapon or thrown weapon and
// allows to catch it when the appropiate conditions are met.
// v1.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This feature is a reaction activity that gets triggered when appropriate. When the damage received is
// reduced to 0, it allows to catch the missile.
//
// Description:
// In the postActiveEffects (item onUse) phase of the reaction activity (in owner's workflow):
//   If the damage received is reduced to 0, prompts a dialog to choose if the weapon can be caught.
//   If caught, the item is added to the actor's inventory when possible.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Gloves of Missile Snaring";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.10")) {
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

export async function glovesOfMissileSnaring({
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
    if (scope.rolledActivity?.identifier !== "snare-missile") {
      return;
    }
    const deflectTotal = workflow.utilityRoll?.total ?? 0;

    if (deflectTotal < workflow.workflowOptions.damageTotal) {
      return;
    }

    const damageSourceInfo = getDamageSourceInfo(workflow);

    const result = await showDialog(scope.rolledItem, canCatchDefault(actor, damageSourceInfo, debug));
    if (!result?.canCatch) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Actor cannot catch the missile.`, { result });
      }
      return;
    }
    if (damageSourceInfo.isAmmo && !damageSourceInfo.ammo) {
      damageSourceInfo.ammo = await getAmmoFromCompendium(damageSourceInfo);
      if (damageSourceInfo.ammo) {
        damageSourceInfo.effectiveItem = damageSourceInfo.ammo;
      }
    }
    if ((damageSourceInfo.isAmmo && damageSourceInfo.ammo) || (!damageSourceInfo.isAmmo && damageSourceInfo.item)) {
      await actor.createEmbeddedDocuments("Item", [damageSourceInfo.effectiveItem.clone({ "system.quantity": 1 })]);
      const infoMsg = `<p></strong>${damageSourceInfo.effectiveItem.name}</strong> was added to your inventory.</p>`;
      await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
    } else {
      const infoMsg = `<p></strong>${damageSourceInfo.effectiveItem.name}</strong>${
        damageSourceInfo.isAmmo ? " ammunition" : ""
      } could not be added to your inventory.</p>`;
      await elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Could not add item to inventory.`, { damageSourceInfo });
      }
    }
  }
}

/**
 * Returns the damage source info.
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @returns {object} the damage source info.
 */
function getDamageSourceInfo(workflow) {
  const damageSourceInfo = {};
  damageSourceInfo.ammo = fromUuidSync(workflow.workflowOptions.sourceAmmoUuid);
  damageSourceInfo.item = fromUuidSync(workflow.workflowOptions.sourceItemUuid);
  damageSourceInfo.effectiveItem = damageSourceInfo.ammo ?? damageSourceInfo.item;
  damageSourceInfo.actor = fromUuidSync(workflow.workflowOptions.sourceActorUuid);
  damageSourceInfo.actorSize = elwinHelpers.getActorSizeValue(damageSourceInfo.actor);
  damageSourceInfo.isAmmo =
    (damageSourceInfo.ammo?.type === "consumable" && damageSourceInfo.ammo.system.type?.value === "ammo") ||
    (damageSourceInfo.item?.type === "weapon" && damageSourceInfo.item.system.properties?.has("amm"));
  damageSourceInfo.isTwoHanded =
    damageSourceInfo.item?.type === "weapon" && damageSourceInfo.item.system.properties?.has("two");
  damageSourceInfo.isHeavy =
    damageSourceInfo.item?.type === "weapon" && damageSourceInfo.item.system.properties?.has("hvy");
  return damageSourceInfo;
}

/**
 * Returns true when the missile can probably be caught.
 *
 * @param {Actor5e} sourceActor - The attacking actor.
 * @param {object} damageSourceInfo - The damage source info.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {{value: boolean, reason?: string}} true if the missile can probably be caught,
 *          false if not with the reason specified.
 */
function canCatchDefault(sourceActor, damageSourceInfo, debug) {
  const sourceSize = elwinHelpers.getActorSizeValue(sourceActor);
  // TODO check if actor has one free hand...
  if (damageSourceInfo.isAmmo) {
    if (damageSourceInfo.actorSize >= sourceSize + 2) {
      // Cannot catch ammo from creatures two size larger or more
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch ammo from creatures two size larger or more.`, {
          sourceActor,
          damageSourceInfo,
        });
      }
      return {
        value: false,
        reason: "Note: Should probably not be able to catch ammunition from creatures two size larger or more.",
      };
    }
    if (damageSourceInfo.item.system.type?.value === "siege") {
      // Cannot catch ammo from siege weapons
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch ammo from siege weapons.`, {
          sourceActor,
          damageSourceInfo,
        });
      }
      return { value: false, reason: "Note: Should probably not be able to catch ammunition from siege weapons." };
    }
    // TODO check weigth?
    return { value: true };
  }
  if (damageSourceInfo.actorSize >= sourceSize + 1) {
    // Cannot catch thrown weapon from creatures one size larger and more
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch thrown weapon from creatures one size larger or more.`, {
        sourceActor,
        damageSourceInfo,
      });
    }
    return {
      value: false,
      reason: "Note: Should probably not be able to catch a thrown weapon from creatures one size larger or more.",
    };
  }
  if (damageSourceInfo.isTwoHanded) {
    // Cannot catch weapon requiring two hands
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch weapon requiring two hands.`, {
        sourceActor,
        damageSourceInfo,
      });
    }
    return { value: false, reason: "Note: Should probably not be able to catch a weapon requiring two hands." };
  }
  if (damageSourceInfo.isHeavy) {
    // Cannot catch heavy weapon
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch heavy weapon.`, {
        sourceActor,
        damageSourceInfo,
      });
    }
    return { value: false, reason: "Note: Should probably not be able to catch an heavy weapon." };
  }
  // TODO check weigth?
  return { value: true };
}

/**
 * Returns an ammunition item from the DND5E compendium corresponding to the type
 * of ammunition needed by the firing item.
 * @param {object} dataSourceInfo - The damage source info.
 * @returns {Item5e|undefined} the ammunition item corresponding to the firing item if found or standard.
 */
async function getAmmoFromCompendium(dataSourceInfo) {
  if (dataSourceInfo.isAmmo && !dataSourceInfo.ammo && dataSourceInfo.actorSize <= elwinHelpers.getSizeValue("med")) {
    const ammoType = dataSourceInfo.item?.system.ammunition?.type;
    const ammoId = CONFIG.DND5E.ammoIds[ammoType];
    return await fromUuid(`Compendium.dnd5e.items.Item.${ammoId}`);
  }
  return undefined;
}

/**
 * Presents a dialog to choose if a missile can be caught and thrown back.
 * @param {Item5e} sourceItem - The Gloves of Missile Snaring item.
 * @param {{value: boolean, reason?: string}} canCatchDefault - Default value of the can catch checkbox.
 * @returns {Promise<{canCatch: boolean}|undefined>} the result of the choices or undefined if the dialog is cancelled.
 */
async function showDialog(sourceItem, canCatchDefault) {
  let choices = [];
  if (!canCatchDefault.value) {
    choices.push(`<p><i>${canCatchDefault.reason}</i></p>`);
  }
  choices.push(
    new foundry.data.fields.BooleanField({
      initial: true,
      label: "Can Catch Missile",
      hint: "Missile is small enough for you to hold in one hand and you have at least one hand free.",
    }).toFormGroup({}, { name: "canCatch", value: canCatchDefault.value }).outerHTML,
  );

  return foundry.applications.api.DialogV2.wait({
    window: { title: `${sourceItem.name}` },
    content: `<fieldset>${choices.join("")}</fieldset>`,
    defaultYes: true,
    modal: true,
    rejectClose: false,
    buttons: [
      {
        action: "ok",
        label: "Ok",
        callback: (_, button, __) => new foundry.applications.ux.FormDataExtended(button.form).object,
      },
      {
        action: "cancel",
        label: "Cancel",
      },
    ],
  });
}
