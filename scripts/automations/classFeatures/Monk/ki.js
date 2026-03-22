// ##################################################################################################
// Monk - Ki, handles making multiple Unarmed Strike when using Fluury of Blows, and adds the
// appropriate effects for Patient Defense and Step of the Winds.
// v1.2.0
// Author: Elwin#1410, based on CPR's Monk's Focus automation.
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "OnUseMacro" ItemMacro[postRollFinished]
//  - Elwin Helpers world script
//
// Usage:
// This item needs to be used to activate. When Fluury of Blows activity is used, allows to make multiples
// Unarmed Strike attacks, it also supports features that adds additional attacks.
// When Patient Defense or Step of the Wind are used, the appropriate effects are applied to the Monk.
//
// Description:
// In the postActiveEffects (item OnUse) phase of the Ki - Flurry of Blows activity (in owner's workflow):
//   It enchants the Unarmed Strike item and makes the allowed extra attacks, it also forces midi-qol
//   target confirmation to allow changing the target for the attack. It supports other features that add extra
//   Flurry of Blows attacks as well as those that add extra attacks but on certain conditions.
// ###################################################################################################

// Default name of the feature
const DEFAULT_ITEM_NAME = "Ki";
const MODULE_ID = "midi-item-showcase-community";
const UNARMED_STRIKE_IDENT = "unarmed-strike";
const FLURRY_OF_BLOWS_IDENT = "flurry-of-blows";

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
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function ki({ speaker, actor, token, character, item, args, scope, workflow, options }) {
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

  if (args[0].tag === "OnUse" && args[0].macroPass === "postRollFinished") {
    // Activates when Flurry of Blows is used
    if (
      !workflow.aborted &&
      (scope.rolledActivity?.identifier === FLURRY_OF_BLOWS_IDENT ||
        scope.rolledItem.identifier === FLURRY_OF_BLOWS_IDENT)
    ) {
      await handleOnUseFlurryOfBlowsPostActiveEffects(actor, workflow, scope.macroItem, debug);
    }
  }
}

/**
 * Handles the on use post active effects phase of the Flurry of Blows Item/activity.
 * It enchant the Unarmed Strike item and makes the allowed extra attacks, presenting a dialog
 * to choose the target if more than one is near. It supports other features that add extra
 * Flurry of Blows attacks as well as those that add extra attacks but on certain conditions.
 *
 * @param {Actor5e} actor - The owner of the Ki or Flurry of Blows item.
 * @param {MidiQOL.workflow} workflow - The current MidiQOL workflow.
 * @param {Item5e} sourceItem - The Ki or Flurry of Blows item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUseFlurryOfBlowsPostActiveEffects(actor, workflow, sourceItem, debug) {
  const unarmedStrike = actor.itemTypes.weapon.find((i) => i.identifier === UNARMED_STRIKE_IDENT);
  if (!unarmedStrike) {
    console.warn(`${DEFAULT_ITEM_NAME} | Missing item with identifier ${UNARMED_STRIKE_IDENT}.`);
    return;
  }
  const enchantmentSource = workflow.activity?.identifier === FLURRY_OF_BLOWS_IDENT ? workflow.activity : workflow.item;
  const changes = [
    { key: "name", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: `{} [1]` },
  ];
  const enchantmentEffect = await elwinHelpers.enchantItemTemporarily(unarmedStrike, enchantmentSource, {
    changes,
    activityRequirements: [{ type: "attack" }, { type: "save" }],
  });
  if (!enchantmentEffect) {
    console.warn(`${DEFAULT_ITEM_NAME} | Could not enchant item ${UNARMED_STRIKE_IDENT}.`);
    return;
  }
  try {
    let attackNb = 1;
    let attacks = 2;
    // get extra attacks from features
    const extraAttacks = actor.itemTypes.feat
      .map((i) => i.getFlag(MODULE_ID, "flurryOfBlowsExtraAttacks") ?? 0)
      .reduce((total, value) => total + value, 0);
    attacks += extraAttacks;
    const attackedTargets = [];
    do {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Making extra Flurry of Blows attack`, {
          workflow,
          attacksLeft: attacks,
          attackedTargets,
        });
      }

      const attackWorkflow = await itemUse(unarmedStrike);
      if (!attackWorkflow || attackWorkflow.aborted) {
        // Workflow aborted, cancel Flurry of Blows extra attacks
        return;
      }
      attackedTargets.push(...attackWorkflow.targets);
      if (attackWorkflow.targets?.first()) {
        canvas.tokens?.setTargets([attackWorkflow.targets?.first().id]);
      }
      attacks--;
      attackNb++;
      if (attacks) {
        changes[0].value = `{} [${attackNb}]`;
        await enchantmentEffect.update({ changes });
      }
    } while (attacks);

    // Get special macro for conditional Flurry of Blows attacks from other features
    const conditionalMacros = workflow.onUseMacros?.getMacros("flurryOfBlowsConditionalExtraAttacks");
    const conditionalMacroNames = !conditionalMacros?.length ? [] : conditionalMacros.split(",").map((s) => s.trim());
    if (conditionalMacroNames.length) {
      for (let conditionalMacroName of conditionalMacroNames) {
        const nbStartingAttacks = attackedTargets.length;
        const macroData = workflow.getMacroData(workflow.item);
        const options = { nbStartingAttacks, unarmedStrike };

        options.attackedTargets = [...attackedTargets];
        options.excludeTargets = [];
        while (await canMakeExtraAttack(workflow, conditionalMacroName, macroData, options, debug)) {
          changes[0].value = `{} [${attackNb}]`;
          await enchantmentEffect.update({ changes });
          const attackWorkflow = await itemUse(unarmedStrike, options.excludeTargets);
          attackNb++;
          if (!attackWorkflow || attackWorkflow.aborted) {
            // Workflow aborted, cancel current conditional Flurry of Blows extra attacks
            break;
          }
          attackedTargets.push(...attackWorkflow.targets);
          options.attackedTargets = [...attackedTargets];
          options.excludeTargets = [];
          if (attackWorkflow.targets?.first()) {
            canvas.tokens?.setTargets([attackWorkflow.targets?.first().id]);
          }
        }
      }
    }
  } finally {
    await enchantmentEffect.delete();
  }
}

/**
 * Uses the specifed item, setting the targets to the ones specified and forces autoRollAttacks.
 *
 * @param {Item5e} item - The item to use.
 * @param {Token[]} excludeTargets - Array of tokens to be excluded from the targets.
 * @returns {Promise<MidiQOL.Workflow>} The resulting midi workflow.
 */
async function itemUse(item, excludeTargets = []) {
  const config = {
    midiOptions: {
      workflowOptions: {
        targetConfirmation: "always",
        autoRollAttack: true,
        excludeTargets: (excludeTargets ?? []).map((t) => t.document.uuid),
      },
    },
  };

  return await MidiQOL.completeItemUse(item, config);
}

/**
 * Evaluates the macro set in the flurryOfBlowsConditionalExtraAttacks flag on the specified item.
 *
 * @param {MidiQOL.workflow} workflow - The current MidiQOL workflow.
 * @param {String} conditionalMacroName - Condition macro name to call.
 * @param {object} macroData - The macro data to pass to the macro execution.
 * @param {object} options - The options to pass to the macro execution.
 * @param {boolean} debug - Flag to indicate debug mode.
 *
 * @returns {Promise<boolean>} True if the macro execution returns true, false otherwise.
 */
async function canMakeExtraAttack(workflow, conditionalMacroName, macroData, options, debug) {
  macroData.tag = "OnUse";
  macroData.macroPass = "flurryOfBlowsConditionalExtraAttacks";
  const makeExtraAttack = await workflow.callMacro(workflow.item, conditionalMacroName, macroData, options);
  if (debug) {
    console.warn(`${DEFAULT_ITEM_NAME} | canMakeExtraAttack`, {
      conditionalMacroName,
      macroData,
      options,
      makeExtraAttack,
    });
  }
  return makeExtraAttack === true;
}
