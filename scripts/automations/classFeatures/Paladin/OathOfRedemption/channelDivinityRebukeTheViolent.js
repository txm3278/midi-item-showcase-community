// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds an active effect, that effect will trigger a reaction by the Paladin when a creature within range
// is damaged to allow him to use the feature to apply retribution damage to the attacker.
// v1.0.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preTargeting],[tpr.isDamaged]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Class Feature
//   - Class Feature Type: Channel Divinity
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Ally to trigger reaction on allies only)
//   - Range: 30 Feet
//   - Resource Consumption: 1 | Channel Divinity | Item Uses (to be set when added to an actor)
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isDamaged"
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Channel Divinity: Rebuke the Violent:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isDamaged|ignoreSelf=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preTargeting (item OnUse) phase of the item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isDamaged target on use,
//   otherwise the item workflow execution is aborted.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on other target):
//   If the reaction was used and completed successfully, a synthetic item is used to apply 
//   the retribution damage to the attacker on the Rebuke the Violent item owner's client.
// ###################################################################################################


export async function channelDivinityRebukeTheViolent({
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
// Default name of the feature
const DEFAULT_ITEM_NAME = "Channel Divinity: Rebuke the Violent";
const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "2.6")) {
  const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
  ui.notifications.error(errorMsg);
  return;
}
const dependencies = ["dae", "midi-qol"];
if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
  return;
}
if (
  !foundry.utils.isNewerVersion(game.modules.get("midi-qol")?.version, "11.6") &&
  !MidiQOL.configSettings().v3DamageApplication
) {
  ui.notifications.error(`${DEFAULT_ITEM_NAME} | dnd5e v3 damage application is required.`);
}

if (debug) {
  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] }, arguments);
}

if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
  // MidiQOL OnUse item macro for Rebuke the Violent
  return handleOnUsePreTargeting(workflow, scope.macroItem);
} else if (args[0].tag === "TargetOnUse" && args[0].macroPass === "tpr.isDamaged.post") {
  // MidiQOL TargetOnUse post item macro for Rebuke the Violent post reaction
  handleTargetOnUseIsDamagedPost(workflow, scope.macroItem, options?.thirdPartyReactionResult);
}

/**
 * Handles the preTargeting phase of the Rebuke the Violent item.
 * Validates that the reaction was triggered by the tpr.isDamaged target on use.
 *
 * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Rebuke the Violent item.
 *
 * @returns {boolean} true if all requirements are fulfilled, false otherwise.
 */
function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
  if (
    currentWorkflow.options?.thirdPartyReaction?.trigger !== "tpr.isDamaged" ||
    !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(sourceItem.uuid)
  ) {
    // Reaction should only be triggered by aura
    const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature of the Paladin is damaged.`;
    ui.notifications.warn(msg);
    return false;
  }
  return true;
}

/**
 * Handles the tpr.isDamaged post macro of the Rebuke the Violent item.
 * If the reaction was used and completed successfully, a synthetic item is used to apply the retribution damage to the attacker.
 *
 * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Rebuke the Violent item.
 * @param {object} thirdPartyReactionResult - The third party reaction result.
 */
function handleTargetOnUseIsDamagedPost(currentWorkflow, sourceItem, thirdPartyReactionResult) {
  if (thirdPartyReactionResult?.uuid !== sourceItem.uuid) {
    return;
  }
  const sourceActor = sourceItem.actor;

  if (!sourceActor) {
    console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
    return;
  }

  // Set damage to be applied, to be available for remote reaction
  const totalDamage =
    currentWorkflow.damageItem?.damageDetail?.reduce(
      (acc, d) => acc + (["temphp", "midi-none"].includes(d.type) ? 0 : d.value),
      0
    ) ?? 0;
  if (!(totalDamage > 0)) {
    // No damage dealt
    return;
  }
  // Build the retribution damage to apply to the attacker.
  const damageParts = [[`(${totalDamage}[radiant])`, "radiant"]];

  // Damage the attacker
  const featData = {
    type: "feat",
    name: `${sourceItem.name} - Retribution Damage`,
    img: sourceItem.img,
    system: {
      actionType: "save",
      damage: { parts: damageParts },
      target: { type: "creature", value: 1 },
      save: { ability: "wis", scaling: "spell" },
    },
    flags: {
      midiProperties: {
        saveDamage: "halfdam",
      },
    },
  };
  const feat = new CONFIG.Item.documentClass(featData, {
    parent: sourceActor,
    temporary: true,
  });

  const options = {
    targetUuids: [currentWorkflow.tokenUuid],
    configureDialog: false,
    workflowOptions: { fastForwardDamage: true, targetConfirmation: "none", autoRollDamage: "always" },
    workflowData: true,
  };

  // Send the item roll to user's client, after the completion of this workflow
  let player = MidiQOL.playerForActor(sourceActor);
  if (!player?.active) {
    // Find first active GM player
    player = game.users?.activeGM;
  }
  if (!player) {
    console.error(`${DEFAULT_ITEM_NAME} | Could not find player for actor ${sourceActor}`);
    return;
  }

  const data = {
    itemData: feat.toObject(),
    actorUuid: sourceActor.uuid,
    targetUuids: options.targetUuids,
    options,
  };

  // Register hook to call retribution damage after roll is complete
  Hooks.once(`midi-qol.RollComplete.${currentWorkflow.itemUuid}`, async (currentWorkflow2) => {
    if (
      !elwinHelpers.isMidiHookStillValid(
        DEFAULT_ITEM_NAME,
        "midi-qol.RollComplete",
        feat.name,
        currentWorkflow,
        currentWorkflow2,
        debug
      )
    ) {
      return;
    }
    await MidiQOL.socket().executeAsUser("completeItemUse", player.id, data);
  });
}

}