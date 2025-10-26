// ##################################################################################################
// Monk - Way of the Astral Self - Body of the Astral Self
// Summons a spectral body and adds its effects.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This item needs to be used to activate. When activated it enables a reaction to be prompted
// when the Monk takes damage of the appropiate type.
//
// Description:
// In the postActiveEffects (item onUse) phase of the reaction activity (in owner's workflow):
//   Adds a damage reduction AE to the item's owner. If there is more than one supported damage type,
//   it prompts a dialog to choose which one is to be reduced.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Body of the Astral Self";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.5")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function bodyOfTheAstralSelf({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    // MidiQOL OnUse item macro for Body of the Astral Self: Deflect Energy
    if (scope.rolledActivity?.identifier === "deflect-energy") {
      await handleOnUsePostActiveEffects(actor, workflow);
    }
  }
}

/**
 * Handles the postActiveEffects of the Body of the Astral Self Deflect Energy reaction activity.
 * An AE is added to the Monk to reduce the damage to be applied. If more than one damage type is supported
 * a dialog is prompted to choose to which damage type the reduction is to be applied.
 *
 * @param {Actor5e} sourceActor - The owner of the Body of the Astral Self item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 */
async function handleOnUsePostActiveEffects(sourceActor, workflow) {
  const total = workflow.utilityRolls?.reduce((acc, r) => acc + r.total, 0);

  // TODO get token damage instead..
  const damages = workflow.workflowOptions?.damageDetail?.filter(
    (d) => ["acid", "cold", "fire", "force", "lightning", "thunder"].includes(d.type) && d.value > 0
  );
  if (!damages?.length) {
    console.warn(`${DEFAULT_ITEM_NAME} | No supported damage types`, {
      damageDetail: workflow.workflowOptions?.damageDetail,
    });
    return;
  }
  let dmgType = damages[0]?.type;

  if (damages?.length > 1) {
    dmgType = (await chooseDamageType(workflow.item, damages)) ?? dmgType;
  }
  // create an active effect to reduce damage
  const effectData = {
    changes: [
      {
        key: `system.traits.dm.amount.${dmgType}`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: `-${total}`,
        priority: 20,
      },
    ],
    transfer: false,
    origin: workflow.activity, //flag the effect as associated to the source activity used
    disabled: false,
    img: workflow.activity.item.img,
    name: workflow.activity.name,
    duration: workflow.isCombat ? { turns: 1 } : { seconds: CONFIG.time.roundTime ?? 1 },
    flags: { dae: { stackable: "noneName", specialDuration: ["isDamaged"] } },
  };
  await sourceActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}

/**
 * Prompts a dialog to choose a damage type from a list of types.
 *
 * @param {Item5e} sourceItem the source item.
 * @param {Array<object>} damages the type and value of damages from which to choose.
 *
 * @returns {string} the selected damage type.
 */
async function chooseDamageType(sourceItem, damages) {
  const data = {
    buttons: damages.map((d) => ({
      label: `${CONFIG.DND5E.damageTypes[d.type].label} [${d.value}]`,
      value: d.type,
    })),
    title: `${sourceItem.name} - Choose a Damage Type`,
  };
  return await elwinHelpers.buttonDialog(data, "column");
}
