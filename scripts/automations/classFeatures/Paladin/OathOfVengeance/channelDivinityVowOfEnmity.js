// ##################################################################################################
// Read First!!!!
// Marks a target for "Channel Divinity: Vow of Enmity", and gives advantage on attacks against it.
// v3.3.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [off]
//  - Times Up
//  - MidiQOL "on use" item/actor macro,[preAttackRoll][postActiveEffects]
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
// In the preAttackRoll phase of any item activity of the marker (in owner's workflow):
//   Gives advantage to the marker if the target is marked by him.
// In the postActiveEffects phase of this feature's activity (in owner's workflow):
//   Updates the self active effect to delete the target active effect when deleted and vice versa.
// ###################################################################################################

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
  const DEFAULT_ITEM_NAME = "Channel Divinity: Vow of Enmity";
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  /**
   * If the requirements are met, returns true, false otherwise.
   *
   * @param {string} name - The name of the item for which to check the dependencies.
   * @param {string[]} dependencies - The array of module ids which are required.
   *
   * @returns {boolean} true if the requirements are met, false otherwise.
   */
  function requirementsSatisfied(name, dependencies) {
    let missingDep = false;
    dependencies.forEach((dep) => {
      if (!game.modules.get(dep)?.active) {
        const errorMsg = `${name} | ${dep} must be installed and active.`;
        ui.notifications.error(errorMsg);
        console.warn(errorMsg);
        missingDep = true;
      }
    });
    return !missingDep;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }
  if (args[0].tag === "OnUse" && args[0].macroPass === "preAttackRoll") {
    if (!workflow.targets?.size) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No targets.`);
      }
      return;
    }
    const allTargetsMarked = workflow.targets.every((t) =>
      t.actor?.appliedEffects.some((ae) => !ae.transfer && ae.origin?.startsWith(scope.macroItem.uuid)),
    );
    if (!allTargetsMarked) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not all targets are marked.`, { targets: workflow.targets });
      }
      return;
    }

    workflow.advantage = true;
    workflow.attackAdvAttribution.add(`ADV:${scope.macroItem.name}`);
    workflow.advReminderAttackAdvAttribution.add(`ADV:${scope.macroItem.name}`);
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    // Handles Utter Vow or Transfer Vow activities
    if (!workflow.effectTargets?.size) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No effect applied to target.`);
      }
      return;
    }

    const tokenTarget = workflow.effectTargets.first();
    const appliedEffect = tokenTarget.actor.appliedEffects.find(
      (ae) => !ae.transfer && ae.origin?.startsWith(scope.macroItem.uuid),
    );
    if (!appliedEffect) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No applied effect found on target actor.`);
      }
      return;
    }
    const rules = elwinHelpers.getRules(scope.macroItem);
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
    const selfEffect = actor.appliedEffects.find((ae) => !ae.transfer && ae.origin?.startsWith(scope.macroItem.uuid));
    if (!selfEffect) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No self effect found on actor.`);
      }
      return;
    }
    // Make applied effect dependent on self effect
    MidiQOL.addDependent(selfEffect, appliedEffect);
    if (rules !== "modern") {
      // Note: in modern, effect does not end if target reaches 0 HP, only after 1 min or re used
      MidiQOL.addDependent(appliedEffect, selfEffect);
    }
  } else if (args[0] === "off") {
    const transferVow = (scope.macroItem ?? scope.macroActivity?.item)?.system.activities?.find(
      (a) => a.identifier === "transfer-vow",
    );
    if (!transferVow) {
      console.warn(`${scope.macroItem.name} | Missing transfer vow activity`, scope.macroItem);
      return;
    }
    if ((scope.macroItem?.actor?.uuid ?? scope.macroActivity?.item?.actor?.uuid) === actor?.uuid) {
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
    const sourceActor = scope.macroItem.actor;
    const message = await TextEditor.enrichHTML(
      `<p><strong>${scope.macroItem.name}</strong> - You can use [[/item ${scope.macroItem.id} activity=${transferVow.id}]].</p>`,
      {
        relativeTo: sourceActor,
        rollData: scope.macroItem.getRollData(),
      },
    );
    await ChatMessage.create({
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: message,
      speaker: ChatMessage.getSpeaker({ actor: sourceActor, token: MidiQOL.getTokenForActor(sourceActor) }),
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    });
  }
}
