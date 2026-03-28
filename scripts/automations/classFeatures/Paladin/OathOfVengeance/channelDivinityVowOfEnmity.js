// ##################################################################################################
// Read First!!!!
// Marks a target for "Channel Divinity: Vow of Enmity", and gives advantage on attacks against it.
// v3.5.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [off]
//  - Times Up
//  - MidiQOL "on use" item/actor macro,[preAttackRollConfig][postActiveEffects]
//
// Usage:
// This item need to be used to activate. It marks the target and gives advantage to any attack made to this target.
//
// Note: It may not auto remove the effect if the marked target becomes Unconscious with more than 0 HP immediately.
//       It will do so on the next actor update, this is due to when DAE evaluates the expression. This could probably
//       fixed in a future DAE version.
//       The Utter Vow activity consumption must be set to the Channel Divinity item when added to an actor.
//
// Description:
// In the preAttackRollConfig phase of any item activity of the marker (in owner's workflow):
//   Gives advantage to the marker if the target is marked by him.
// In the postActiveEffects phase of this feature's activity (in owner's workflow):
//   Updates the self active effect to delete the target active effect when deleted and vice versa.
// When the Channel Divinity: Vow of Enmity expires [off] (on owner):
//   Makes the Transfer Vow activity not visible.
// Wen the Marked by Vow of Enmity expires [off] (on target):
//   If expired due to 0 HP, makes the Transfer Vow activity visble and displays a chat message
//   telling about its availability.
// ###################################################################################################

const DEFAULT_ITEM_NAME = "Channel Divinity: Vow of Enmity";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  // @ts-ignore
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.11")) {
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

export async function channelDivinityVowOfEnmity({
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
  // @ts-ignore
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }
  if (args[0].tag === "OnUse" && args[0].macroPass === "preAttackRollConfig") {
    await handleOnUsePreAttackRollConfig(workflow, scope.macroItem, debug);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(workflow, actor, debug);
  } else if (args[0] === "off") {
    const sourceItem = scope.macroItem ?? scope.macroActivity?.item;
    const transferVow = sourceItem?.system.activities?.find((a) => a.identifier === "transfer-vow");
    if (!transferVow) {
      console.warn(`${sourceItem.name} | Missing transfer vow activity`, sourceItem);
      return;
    }
    if (sourceItem?.actor?.uuid === actor?.uuid) {
      // Expiry on owner
      // Make sure the Transfer Vow activity is not visible
      if (!foundry.utils.getProperty(transferVow, "midiProperties.automationOnly")) {
        await transferVow.update({ "midiProperties.automationOnly": true });
      }
      return;
    }
    // Expiry on Target
    if (foundry.utils.getProperty(scope.lastArgValue, "expiry-reason") !== "midi-qol:zeroHP") {
      // Not expired due to zero HP
      return;
    }

    // Allow using transfer vow
    await transferVow.update({ "midiProperties.automationOnly": false });

    // Add chat message saying it is possible to transfer vow
    const sourceActor = sourceItem.actor;
    const message = await TextEditor.enrichHTML(
      `<p><strong>${sourceItem.name}</strong> - You can use [[/item ${sourceItem.id} activity=${transferVow.id}]].</p>`,
      {
        relativeTo: sourceActor,
        rollData: sourceItem.getRollData(),
      },
    );
    await ChatMessage.create({
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: message,
      speaker: ChatMessage.getSpeaker({ actor: sourceActor, token: MidiQOL.getTokenForActor(sourceActor)?.document }),
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    });
  }
}

/**
 * Handles the pre-attack roll configuration for the Vow of Enmity item.
 * Gives advantage to the attack roll if the target is marked by the source actor.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Item5e} sourceItem - The Vow of Enmity item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePreAttackRollConfig(workflow, sourceItem, debug) {
  if (!workflow.targets?.size) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No targets.`);
    }
    return;
  }
  const allTargetsMarked = workflow.targets.every((t) =>
    t.actor?.appliedEffects.some((ae) => !ae.transfer && ae.origin?.startsWith(sourceItem.uuid)),
  );
  if (!allTargetsMarked) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Not all targets are marked.`, { targets: workflow.targets });
    }
    return;
  }

  // Add advantage
  workflow.attackRollModifierTracker.advantage.add(sourceItem.identifier, sourceItem.name);
}

/**
 * Handles the post active effects for the Vow of Enmity item.
 * Updates the self active effect to delete the target active effect when deleted and vice versa.
 *
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {Actor5e} actor - The actor using the item.
 * @param {boolean} debug - Flag to indicate debug mode.
 */
async function handleOnUsePostActiveEffects(workflow, actor, debug) {
  // Handles Utter Vow or Transfer Vow activities
  if (!workflow.effectTargets?.size) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No effect applied to target.`);
    }
    return;
  }

  const tokenTarget = workflow.effectTargets.first();
  const appliedEffect = tokenTarget.actor.appliedEffects.find(
    (ae) => !ae.transfer && ae.origin?.startsWith(workflow.item.uuid),
  );
  if (!appliedEffect) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No applied effect found on target actor.`);
    }
    return;
  }
  const rules = elwinHelpers.getRules(workflow.item);
  if (rules === "modern") {
    // Make sure transfer vow is not visible
    let transferVow;
    if (workflow.activity?.identifier === "transfer-vow") {
      transferVow = workflow.activity;
    } else {
      transferVow = workflow.item.system.activities?.find((a) => a.identifier === "transfer-vow");
    }
    await transferVow?.update({ "midiProperties.automationOnly": true });
  }

  // Find AE on self to add dependency
  const selfEffect = actor.appliedEffects.find((ae) => !ae.transfer && ae.origin?.startsWith(workflow.item.uuid));
  if (!selfEffect) {
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | No self effect found on actor.`);
    }
    return;
  }
  // Make applied effect dependent on self effect
  await MidiQOL.addDependent(selfEffect, appliedEffect);
  if (rules !== "modern") {
    // Note: in modern, effect does not end if target reaches 0 HP, only after 1 min or re used
    await MidiQOL.addDependent(appliedEffect, selfEffect);
  }
}
