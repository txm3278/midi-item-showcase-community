// ##################################################################################################
// Read First!!!!
// When the used, prompts to place a template where the grenade will explode and generate smoke.
// v1.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE [off]
//  - Times Up
//  - MidiQOL "on use" actor macro [preActiveEffects],[postActiveEffects]
//  - Elwin Helpers world script
//  - Sequencer (optional)
//  - JB2A free or patreon (optional)
//  - Walled Templates (optional)
//
// Usage:
//   This item needs to be used to activate.
//
// Description:
// In the preActiveEffects (item OnUse) phase of the Open Bottle activity (in owner's workflow):
//   Removes the midi-qol templateUuid from the workflow and keeps it workflowOptions instead,
//   to prevent midi-qol from creating an AE to delete the template.
// In the postActiveEffects (item OnUse) phase of the Open Bottle activity (in owner's workflow):
//   Attaches the template to the token, it also creates a darkness source that is attached to the template.
//   Finally, it toggles the automationOnly of the open and close bottle activities.
//   If Sequencer is active, a fog animation is also created and attached to the template.
// In the "off" DAE macro call:
//   If the expiry reason is not effect-deleted, increases the size of the fog cloud unless
//   it has reached its maximum size. It also creates a new effect with the same data has
//   the one that expired to repeat the process until the maximum size has been reached.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Smoke Grenade";
const MODULE_ID = "midi-item-showcase-community";
const JB2A_FOG = "jb2a.fog_cloud.01.white";

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
  const dependencies = ["dae", "times-up", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function smokeGrenade({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!checkDependencies()) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "preActiveEffects") {
    // Keep template reference in a different value to prevent midi-qol adding an AE to delete the template
    workflow.workflowOptions.elwinTemplateUuid = workflow.templateUuid;
    workflow.templateUuid = null;
  } else if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(workflow, actor, scope.rolledItem);
  } else if (args[0] === "off") {
    handleOffEffect(scope.lastArgValue);
  }
}

/**
 * Handles the postActiveEffects phase of the Smoke Grenade - Throw activity.
 * Attaches the template to the token and adds the AE as a dependent of the template,
 * it also creates a darkness source that is attached to the template.
 * Finally, it toggles the automationOnly of the open and close bottle activities.
 * If Sequencer is active, a fog animation is also created and attached to the template.
 *
 * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
 * @param {Actor5e} actor - The current actor.
 * @param {Item5e} usedItem - The Smoke Grenade item.
 */
async function handleOnUsePostActiveEffects(workflow, actor, usedItem) {
  const template = fromUuidSync(workflow.workflowOptions.elwinTemplateUuid);
  if (!template) {
    console.error(`${usedItem.name} | Missing template UUID reference.`);
    return;
  }

  // Add reference to template on AE
  const smokeEffect = actor.effects.find(
    (ae) =>
      ae.name === usedItem.name &&
      ae.flags?.dae?.selfTargetAlways &&
      foundry.utils.getProperty(ae, "flags.dnd5e.dependentOn") !== template.uuid,
  );
  // Make smoke effect dependent on template
  if (smokeEffect) {
    await smokeEffect.setFlag("dnd5e", "dependentOn", template.uuid);
  }

  if (elwinHelpers.getRules(usedItem) === "legacy") {
    // Effects will be applied when AE expires
    return;
  }
  // Make template dependent on AE to delete it on expiry
  MidiQOL.addDependent(smokeEffect, template);
  await createSmoke(template);
}

/**
 * Creates a negative light attached to the specified template and creates a smoke animation
 * if sequencer and the animation is available.
 *
 * @param {MeasuredTemplate} template - The template on which to attach the negative light and animation.
 */
async function createSmoke(template) {
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

  if (animationAvailable) {
    // Sequencer and JB2A are active
    const xray = true;
    if (game.modules.get("walledtemplates")?.active) {
      new Sequence()
        .effect()
        .file(JB2A_FOG)
        .scaleToObject()
        .scaleIn(0, 800)
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
        .scaleIn(0, 800)
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
 * Handles DAE 'off' macro call for the Smoke Grenade effect.
 * If the expiry reason is not effect-deleted, creates the smoke effect and updates
 * the walled templates hideBorder setting to default.
 *
 * @param {object} lastArg - The last argument value.
 */
async function handleOffEffect(lastArg) {
  if (lastArg["expiry-reason"] === "effect-deleted") {
    // Do nothing if effect is deleted
    return;
  }
  // Find template created by this item
  const template = canvas.templates.placeables.find(
    (template) => template.document?.uuid === foundry.utils.getProperty(lastArg.efData, "flags.dnd5e.dependentOn"),
  );
  if (!template) {
    return;
  }
  await template.document.update({ "flags.walledtemplates.hideBorder": "globalDefault" });
  await createSmoke(template.document);
}
