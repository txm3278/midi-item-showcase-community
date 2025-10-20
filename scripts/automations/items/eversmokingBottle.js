// ##################################################################################################
// Read First!!!!
// When the bottle is opened, creates a fog cloud that follows the owner and increases in size until it has reached its maximum size or until
// the bottle is closed which also makes it stay in place.
// v1.0.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [off]
//  - Times Up
//  - MidiQOL "on use" actor macro [preTargeting],[preActiveEffects],[postActiveEffects]
//  - Elwin Helpers world script
//  - Sequencer (optional)
//  - JB2A free or patreon (optional)
//  - Walled Templates (optional)
//
// Usage:
//   This item needs to be used to activate. When first used, it opens the bottle and generates a smog cloud that follows its owner,
//   and its size increases as long as the bottle is opened, until it reaches its maximum size.
//   When used a second time it closes the bottle and the smog cloud position and size becomes fixed.
//
// Description:
// In the preTargeting (item OnUse) phase of the Open Bottle activity (in owner's workflow):
//   Registers a hook preCreateMeasuredTemplate to configure Walled Templates properties if the module is active.
// In the preCreateMeasuredTemplate hook (in owner's workflow):
//   If the workflow associated to the template document is the same as the one received in the preTargeting,
//   set Walled Templates properties for wall blocking.
// In the preActiveEffects (item OnUse) phase of the Open Bottle activity (in owner's workflow):
//   Removes the midi-qol templateUuid from the workflow and keeps it workflowOptions instead,
//   to prevent midi-qol from creating an AE to delete the template.
// In the postActiveEffects (item OnUse) phase of the Open Bottle activity (in owner's workflow):
//   Attaches the template to the token, it also creates a darkness source that is attached to the template.
//   Finally, it toggles the automationOnly of the open and close bottle activities.
//   If Sequencer is active, a fog animation is also created and attached to the template.
// In the postActiveEffects (item OnUse) phase of the Close Bottle activity (in owner's workflow):
//   Toggles the automationOnly of the open and close bottle activities, deletes the initial AE, detaches the template from the token,
//   creates a new one that expires after 10 min to delete the template.
// In the "off" DAE macro call:
//   If the expiry reason is not effect-deleted, increases the size of the fog cloud unless
//   it has reached its maximum size. It also creates a new effect with the same data has
//   the one that expired to repeat the process until the maximum size has been reached.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Eversmoking Bottle";
const MODULE_ID = "midi-item-showcase-community";
const JB2A_FOG = "jb2a.fog_cloud.01.white";

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? "1.1", "3.5.6")) {
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

export async function eversmokingBottle({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!checkDependencies()) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "preTargeting") {
    if (scope.rolledActivity?.identifier === "open-bottle") {
      handleOnUsePreTargeting(workflow, debug);
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
    if (scope.rolledActivity?.identifier === "open-bottle") {
      // Keep template reference in a different value to prevent midi-qol adding an AE to delete the template
      workflow.workflowOptions.elwinTemplateUuid = workflow.templateUuid;
      workflow.templateUuid = null;
    }
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    if (scope.rolledActivity?.identifier === "open-bottle") {
      await handleOnUsePostActiveEffectsOpenBottle(workflow, actor, token, scope.rolledItem, scope.rolledActivity);
    } else if (scope.rolledActivity?.identifier === "close-bottle") {
      await handleOnUsePostActiveEffectsCloseBottle(actor, token, scope.rolledItem, scope.rolledActivity);
    }
  } else if (args[0] === "off") {
    handleOffEffect(actor, item, scope.lastArgValue);
  }
}

/**
 * Handles the preTargeting phase of the Eversmoking Bottle item.
 * Registers a hook preCreateMeasuredTemplate to configure Walled Templates properties if the module is active.
 *
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 */
function handleOnUsePreTargeting(workflow, debug) {
  if (game.modules.get("walledtemplates")?.active) {
    Hooks.once("preCreateMeasuredTemplate", (templateDocument, data, options, userId) => {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | preCreateMeasuredTemplate`, {
          templateDocument,
          data,
          options,
          userId,
        });
      }
      if (workflow.id !== templateDocument.flags["midi-qol"]?.workflowId) {
        if (debug) {
          // Not same workflow do nothing
          console.warn(`${DEFAULT_ITEM_NAME} | preCreateMeasuredTemplate hook called from a different workflow.`);
        }
        return;
      }

      templateDocument.updateSource({
        flags: { walledtemplates: { wallsBlock: "walled", wallRestriction: "move" } },
      });
    });
  }
}

/**
 * Handles the postActiveEffects phase of the Eversmoking Bottle - Open Bottle activity.
 * Attaches the template to the token and adds the AE as a dependent of the template,
 * it also creates a darkness source that is attached to the template.
 * Finally, it toggles the automationOnly of the open and close bottle activities.
 * If Sequencer is active, a fog animation is also created and attached to the template.
 *
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {Actor5e} actor - The current actor.
 * @param {Token5e} token - The current token.
 * @param {Item5e} usedItem - The Eversmoking Bottle item.
 * @param {Activity} usedActivity - The Open Bottle activity.
 */
async function handleOnUsePostActiveEffectsOpenBottle(workflow, actor, token, usedItem, usedActivity) {
  // Attach template to token
  const template = fromUuidSync(workflow.workflowOptions.elwinTemplateUuid);
  if (!template) {
    console.error(`${usedItem.name} | Missing template UUID reference.`);
    return;
  }
  await elwinHelpers.attachToToken(token, [template.uuid]);

  // Add AE as dependent of template
  const openEffect = actor.effects.find((ae) => ae.name === usedItem.name && ae.flags?.dae?.selfTargetAlways);
  if (openEffect) {
    await openEffect.setFlag(MODULE_ID, "esbTemplateUuid", template.uuid);
    await template.addDependent(openEffect);
  }

  const animationAvailable =
    game.modules.get("sequencer")?.active && foundry.utils.hasProperty(Sequencer.Database.entries, "jb2a");

  await elwinHelpers.attachAmbientLightToTemplate(template, {
    config: {
      negative: true,
      dim: 0,
      bright: template.distance,
      priority: 100,
      animation: { type: !animationAvailable ? "denseSmoke" : null },
    },
    x: template.x,
    y: template.y,
    elevation: template.elevation,
    rotation: template.rotation,
  });

  // Change toggle automationOnly values
  await toggleActivities(usedItem, usedActivity);

  if (animationAvailable) {
    // Sequencer and JB2A are active
    const xray = true;
    if (game.modules.get("walledtemplates")?.active) {
      new Sequence()
        .effect()
        .file(JB2A_FOG)
        .scaleToObject()
        .aboveLighting()
        .opacity(0.5)
        .mask(template)
        .xray(xray)
        .persist(true)
        .attachTo(template)
        .play();
    } else {
      new Sequence()
        .effect()
        .file(JB2A_FOG)
        .scaleToObject()
        .aboveLighting()
        .opacity(0.5)
        .xray(xray)
        .persist(true)
        .attachTo(template)
        .play();
    }
  }
}

/**
 * Handles the postActiveEffects phase of the Eversmoking Bottle - Close Bottle activity.
 * Deletes the initial AE, detaches the template from the token, creates a new one that expires after 10 min
 * and adds the template as a dependent an vice versa.
 * Finally, it toggles the automationOnly of the open and close bottle activities.
 *
 * @param {Actor5e} actor - The current actor.
 * @param {Token5e} token - The current token.
 * @param {Item5e} usedItem - The Eversmoking Bottle item.
 * @param {Activity} usedActivity - The Close Bottle activity.
 */
async function handleOnUsePostActiveEffectsCloseBottle(actor, token, usedItem, usedActivity) {
  // Change toggle automationOnly values
  await toggleActivities(usedItem, usedActivity);

  // Delete AE
  const openEffect = actor.effects.find((ae) => ae.name === usedItem.name && ae.flags?.dae?.selfTargetAlways);
  if (!openEffect) {
    return;
  }
  await openEffect.delete();

  // Find template created by this item
  const template = canvas.templates.placeables.find(
    (template) => template.document?.uuid === openEffect.flags[MODULE_ID]?.esbTemplateUuid
  );
  if (!template) {
    return;
  }
  // Detach template from token
  await elwinHelpers.detachFromToken(token, [template.document.uuid]);

  // TODO use about-time instead and if active when it's v13 compatible
  // Add AE to delete template when it expires.
  const closeEffectData = {
    changes: [],
    transfer: false,
    origin: usedItem.uuid, //flag the effect as associated to the source item used
    disabled: false,
    duration: { seconds: 10 * 60 },
    img: usedItem.img,
    name: `${usedItem.name} - ${template.id}`,
    "flags.dae.stackable": "noneName",
  };

  const [closeEffect] = await MidiQOL.createEffects({ actorUuid: actor.uuid, effects: [closeEffectData] });
  if (closeEffect) {
    await closeEffect.addDependent(template.document);
    await template.document.addDependent(closeEffect);
  }
}

/**
 * Toggles the automationOnly values of the item activities dependending on which activity was used.
 *
 * @param {Item5e} usedItem - The Eversmoking Bottle item.
 * @param {Activity} usedActivity - The activity used.
 */
async function toggleActivities(usedItem, usedActivity) {
  const activities = {};
  usedItem.system.activities.forEach((a) => {
    activities[a.id] = { "midiProperties.automationOnly": a.id === usedActivity.id };
  });
  await usedItem.update({ "system.activities": activities });
}

/**
 * Handles DAE 'off' macro call for the Eversmoking Bottle effect.
 * If the expiry reason is not effect-deleted, increases the size of the fog cloud unless
 * it has reached its maximum size. It also creates a new effect with the same data has
 * the one that expired to repeat the process until the maximum size has been reached.
 *
 * @param {Actor5e} actor - The source actor.
 * @param {Item5e} item - The Eversmoking Bottle item.
 * @param {object} lastArg - The last argument value.
 */
async function handleOffEffect(actor, item, lastArg) {
  if (lastArg["expiry-reason"] === "effect-deleted") {
    // Do not recreate effect when deleted and not expired
    return;
  }
  // Find template created by this item
  const template = canvas.templates.placeables.find(
    (template) => template.document?.uuid === lastArg.efData.flags[MODULE_ID]?.esbTemplateUuid
  );
  if (!template) {
    return;
  }
  const newSize = template.document.distance + 10;
  let count = lastArg.efData.flags[MODULE_ID]?.esbCount ?? 0;
  if (count >= 6) {
    // No more cloud increase
    return;
  }
  await template.document.update({ distance: newSize });

  // Find AE from item
  const newEffectData = item.effects.find((ae) => !ae.transfer && ae.flags?.dae?.selfTargetAlways)?.toObject();
  if (!newEffectData) {
    return;
  }
  newEffectData.origin = lastArg.efData.origin;
  foundry.utils.setProperty(newEffectData, `flags.${MODULE_ID}.esbTemplateUuid`, template.uuid);
  foundry.utils.setProperty(newEffectData, `flags.${MODULE_ID}.esbCount`, count + 1);

  const [effect] = await MidiQOL.createEffects({ actorUuid: actor.uuid, effects: [newEffectData] });
  if (effect) {
    await template.document.addDependent(effect);
  }
}
