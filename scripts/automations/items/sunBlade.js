// ##################################################################################################
// Read First!!!!
// When equipped and attuned, adds an action that allows to activate/deactivate the blade.
// Once the blade is activated another item it added to adjust the radius of the light.
// v2.0.1
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - MidiQOL "on use" item macro, [preTargeting][postActiveEffects]
//  - Active Token Effects
//  - Cauldron of Plentiful Resources (optional, support for VAE buttons)
//  - Visual Active Effects (optional, for button on Sun Blade - Light AE)
//
// Usage:
// When equipped and attuned, the activate/deactivate blade activity can be used.
// When this activity is used, it allows to activate the blade, when activated an AE with the light effect
// is added, also an attack activity and another to adjust the blade's light radius are enabled.
// To deactivate the blade, the same activate/deactivate blade activity can be used.
//
// Description:
// In the preTargeting (OnUse) phase of the Sun Blade activities (in owner's workflow):
//   If the blade is not activated and the current activity is the attack or adjust light radius one:
//     The activity workflow execution is aborted and a notification is displayed to the user.
//   If blade is not activated and the current activity is the current activity is the activate/deactivate one:
//     Validates that item is equipped and attuned, otherwise the activity workflow execution is aborted and
//     a notification is displayed to the user.
// In the postActiveEffects (OnUse) phase of the activate/deactivate activity (in owner's workflow):
//   If the blade is not activated:
//     Creates and applies an enchantment activation effect on the item, also creates an active effect on
//     the current actor to update the light config of the token.
//     Updates the enchantment active effect and the light active effect to make them dependent on each other.
//   If the blade is activated:
//     Deletes the applied enchantment active effect from the item.
// In the postActiveEffects (OnUse) phase of the adjust light radius activity (in owner's workflow):
//   Prompt the owner to choose between enlarge or reduce, depending on the choice,
//     Apply 5 feet increase or decrease to the light bright and dim radius up to min/max on the light
//     active effect.
// ###################################################################################################

export async function sunBlade({
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
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Sun Blade';
  const MODULE_ID = 'midi-item-showcase-community';
  const ACTIVATED = 'sunblade-activated';
  const LIGHT_RADIUS = 'sunblade-light-radius';
  const ACTIVATE_BLADE_IDENT = 'activate-deactivate-blade';
  const ADJUST_LIGHT_RADIUS_IDENT = 'adjust-light-radius';
  const INITIAL_LIGHT_RADIUS = 15;
  const MIN_LIGHT_RADIUS = 10;
  const MAX_LIGHT_RADIUS = 30;
  const ENLARGE_CHOICE = 'enlarge';
  const REDUCE_CHOICE = 'reduce';

  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  const dependencies = ['dae', 'midi-qol', 'ATL'];
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
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    if (!scope.rolledItem.getFlag(MODULE_ID, ACTIVATED)) {
      let warnMsg;
      if (workflow.activity?.identifier === 'attack') {
        warnMsg = `${scope.macroItem.name} | The blade must be activated to be able to make an attack with it.`;
      } else if (workflow.activity?.identifier === ADJUST_LIGHT_RADIUS_IDENT) {
        warnMsg = `${scope.macroItem.name} | The blade must be activated to be able to adjust the light radius.`;
      } else if (
        workflow.activity?.identifier === ACTIVATE_BLADE_IDENT &&
        !(scope.rolledItem.system.equipped && scope.rolledItem.system.attuned)
      ) {
        warnMsg = `${scope.macroItem.name} | The item must be equipped and attuned to be able to activate the blade.`;
      }
      if (warnMsg) {
        ui.notifications.warn(warnMsg);
        return false;
      }
    }
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    if (workflow.activity?.identifier === ACTIVATE_BLADE_IDENT) {
      await handleActivatePostActiveEffects(workflow, scope.macroItem);
    } else if (workflow.activity?.identifier === ADJUST_LIGHT_RADIUS_IDENT) {
      await handleAdjustLightRadiusPostActiveEffects(workflow, scope.macroItem);
    }
  }

  /**
   * Handles the postActiveEffects of the Sun Blade - Activate/Deactivate Blade activity.
   * If the Sun Blade is not activated:
   *   Creates and applies an enchantment activation effect on the item, also creates an active effect on
   *   the current actor to update the light config of the token.
   *   Updates the enchantment active effect and the light active effect to make them dependent on each other.
   * If the blade is activated:
   *   Deletes the applied enchantment active effect.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current MidiQOL workflow.
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function handleActivatePostActiveEffects(currentWorkflow, sourceItem) {
    // Get item with activate item origin flag
    const activated = sourceItem.getFlag(MODULE_ID, ACTIVATED);
    if (activated) {
      // Remove enchantment
      await elwinHelpers.deleteAppliedEnchantments(
        currentWorkflow.activity.uuid
      );

      // Add message about blade deactivation
      await elwinHelpers.insertTextIntoMidiItemCard(
        'beforeButtons',
        currentWorkflow,
        'The blade was deactivated.'
      );
    } else {
      // Add enchantment active effect for blade activation
      const enchantmentEffectData = sourceItem.effects
        .find((ae) => ae.type === 'enchantment')
        ?.toObject();
      if (!enchantmentEffectData) {
        if (debug) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | Missing enchantment effect`,
            sourceItem
          );
        }
      }
      enchantmentEffectData.origin = currentWorkflow.activity.uuid;
      foundry.utils.setProperty(
        enchantmentEffectData,
        `flags.${MODULE_ID}.${ACTIVATED}`,
        1
      );
      adjustProficiency(sourceItem, enchantmentEffectData);

      // Add enchantment to self
      const enchantmentEffect = await ActiveEffect.create(
        enchantmentEffectData,
        {
          parent: sourceItem,
          keepOrigin: true,
          dnd5e: {
            activityId: currentWorkflow.activity.id,
            enchantmentProfile: enchantmentEffectData._id,
          },
        }
      );
      // Add light effect
      const lightEffectData = sourceItem.effects
        .find((ae) => !ae.transfer && ae.type !== 'enchantment')
        ?.toObject();
      if (!lightEffectData) {
        if (debug) {
          console.warn(
            `${DEFAULT_ITEM_NAME} | Missing light effect`,
            sourceItem
          );
        }
      }
      lightEffectData.duration = null;
      lightEffectData.origin = sourceItem.uuid;
      // Add support for CPR VAE button
      if (
        game.modules.get('chris-premades')?.active &&
        game.modules.get('visual-active-effects')?.active
      ) {
        if (
          !foundry.utils.getProperty(
            sourceItem,
            'flags.chris-premades.info.identifier'
          )
        ) {
          await sourceItem.setFlag(
            'chris-premades',
            'info.identifier',
            sourceItem.identifier
          );
        }
        const adjustLightActivity = sourceItem.system.activities?.find(
          (a) => a.identifier === ADJUST_LIGHT_RADIUS_IDENT
        );
        if (
          adjustLightActivity &&
          !chrisPremades.utils.activityUtils.getActivityByIdentifier(
            sourceItem,
            ADJUST_LIGHT_RADIUS_IDENT
          )
        ) {
          await chrisPremades.utils.activityUtils.setIdentifier(
            adjustLightActivity,
            ADJUST_LIGHT_RADIUS_IDENT
          );
        }
        foundry.utils.setProperty(lightEffectData, 'flags.chris-premades', {
          effect: {
            noAnimation: false,
          },
          vae: {
            buttons: [
              {
                type: 'use',
                name: `${sourceItem.name}: Adjust Light Radius`,
                identifier: sourceItem.identifier,
                activityIdentifier: ADJUST_LIGHT_RADIUS_IDENT,
              },
            ],
          },
        });
      }
      const [lightEffect] = await sourceItem.actor.createEmbeddedDocuments(
        'ActiveEffect',
        [lightEffectData]
      );
      // Make them dependent upon each other
      if (lightEffect && enchantmentEffect) {
        await enchantmentEffect.addDependent(lightEffect);
        await lightEffect.addDependent(enchantmentEffect);
      }

      // Add message about blade activation
      await elwinHelpers.insertTextIntoMidiItemCard(
        'beforeButtons',
        currentWorkflow,
        'The blade was activated.'
      );
    }
  }

  /**
   * Handles the postActiveEffects of the Sun Blade - Adjust Light Radius activity.
   * Prompts the owner to choose between enlarge or reduce.
   * Then applies the change to the light radius on the activation effect.
   * The radius can only be enlarged/reduced up to a maximum/minimum.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current MidiQOL workflow.
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function handleAdjustLightRadiusPostActiveEffects(
    currentWorkflow,
    sourceItem
  ) {
    const lightEffect = sourceItem.actor?.effects.find(
      (ae) =>
        ae.type !== 'enchantment' && ae.origin?.startsWith(sourceItem.uuid)
    );
    if (!lightEffect) {
      return;
    }
    const currentLightRadius = Number(
      lightEffect.changes.find((c) => c.key === 'ATL.light.bright')?.value ??
        INITIAL_LIGHT_RADIUS
    );
    const choices = [];
    const buttons = {};
    if (currentLightRadius < MAX_LIGHT_RADIUS) {
      choices.push(ENLARGE_CHOICE);
      buttons.enlarge = { label: 'Enlarge' };
    }
    if (currentLightRadius > MIN_LIGHT_RADIUS) {
      choices.push(REDUCE_CHOICE);
      buttons.reduce = { label: 'Reduce' };
    }
    let choice;
    // Shortcut to bypass dialog
    // TODO does not work for now with multiple activities and activity choice dialog
    // if (currentWorkflow.event?.shiftKey) {
    //   choice = ENLARGE_CHOICE;
    // } else if (currentWorkflow.event?.ctrlKey) {
    //   choice = REDUCE_CHOICE;
    // }
    if (!choice) {
      // Ask which option to apply
      const sourceName = sourceItem._source?.name ?? DEFAULT_ITEM_NAME;
      choice = await Dialog.wait(
        {
          title: `${sourceName} - Enlarge/Reduce Light Radius`,
          content: `<p>Choose to enlarge or reduce the blade's light radius.</p>`,
          default: ENLARGE_CHOICE,
          buttons,
          close: () => null,
        },
        { classes: ['dialog', 'dnd5e'] }
      );
    }
    if (!choice) {
      return;
    }
    let adjustment = 0;
    if (choice === ENLARGE_CHOICE) {
      adjustment = 5;
    } else {
      adjustment = -5;
    }
    const newLightRadius = Math.clamp(
      currentLightRadius + adjustment,
      MIN_LIGHT_RADIUS,
      MAX_LIGHT_RADIUS
    );

    const newChanges = foundry.utils.deepClone(lightEffect.changes ?? []);
    for (let change of newChanges) {
      if (['ATL.light.dim', 'ATL.light.bright'].includes(change.key)) {
        const newValue =
          change.key === 'ATL.light.dim' ? newLightRadius * 2 : newLightRadius;
        change.value = '' + newValue;
      }
    }
    await lightEffect.update({ changes: newChanges });

    let text;
    if (newLightRadius === MIN_LIGHT_RADIUS) {
      text = `The minimum bright and dim light radius was reached (${MIN_LIGHT_RADIUS}/${
        MIN_LIGHT_RADIUS * 2
      }).`;
    } else if (newLightRadius === MAX_LIGHT_RADIUS) {
      text = `The maximum bright and dim light radius was reached (${MAX_LIGHT_RADIUS}/${
        MAX_LIGHT_RADIUS * 2
      }).`;
    } else {
      text = `The bright and dim light radius was ${
        choice === ENLARGE_CHOICE ? 'increased' : 'decreased'
      } (${newLightRadius}/${newLightRadius * 2}).`;
    }
    await insertTextBeforeButtonsIntoMidiItemChatMessage(
      MidiQOL.getCachedChatMessage(currentWorkflow.itemCardUuid),
      text
    );
  }

  /**
   * Inserts text into a Midi item chat message before the card buttons div and updates it.
   *
   * @param {ChatMessage5e} chatMessage - The MidiQOL item chat message to update
   * @param {string} text - The text to insert in the chat message.
   */
  async function insertTextBeforeButtonsIntoMidiItemChatMessage(
    chatMessage,
    text
  ) {
    let content = foundry.utils.deepClone(chatMessage.content);
    const searchRegex =
      /(<\/section>)(\s*<div class="card-buttons midi-buttons">)/m;
    const replaceString = `$1\n${text}\n$2`;
    content = content.replace(searchRegex, replaceString);
    await chatMessage.update({ content });
  }

  /**
   * Adjust the proficiency with the Sun Blade item depending on the current state of the item
   * and the proficiencies of the parent actor. This is used to take into account that the Sun Blade
   * supports proficency with long sword and short sword.
   *
   * @param {Item5e} sourceItem - The Sun Blade item.
   * @param {object} enchantmentEffectData - The enchantment effect data to be applied.
   */
  async function adjustProficiency(sourceItem, enchantmentEffectData) {
    let proficencyValue;
    if (sourceItem.system.proficient === null) {
      if (!sourceItem.system.prof.multiplier && isProficient(sourceItem)) {
        // Force proficiency
        proficencyValue = 1;
      }
    } else if (
      sourceItem.system.proficient === 1 &&
      !isProficient(sourceItem)
    ) {
      // Force not proficiency
      proficencyValue = 0;
    } else if (sourceItem.system.proficient === 0 && isProficient(sourceItem)) {
      // Force proficiency
      proficencyValue = 1;
    }
    if (proficencyValue) {
      enchantmentEffectData.changes.push({
        key: 'system.proficient',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: proficencyValue,
        priority: 20,
      });
    }
  }

  /**
   * Validate that the item's parent is proficient with the Sun Blade.
   * An actor can be proficient if he has proficiency in long sword or short sword
   * .
   * @param {Item5e} sourceItem - The Sun Blade item.
   * @returns {boolean} True if the item's parent is proficient with the Sun Blade, false otherwise.
   */
  function isProficient(sourceItem) {
    const actor = sourceItem.actor;
    if (!actor) {
      return false;
    }
    if (actor.type === 'npc') {
      return true; // NPCs are always considered proficient with any weapon in their stat block.
    }
    const config = CONFIG.DND5E.weaponProficienciesMap;
    const weaponType = sourceItem.system.type;
    const itemProf = config[weaponType.value];
    const actorProfs = actor.system.traits?.weaponProf?.value ?? new Set();
    const isProficient =
      actorProfs.has(itemProf) ||
      actorProfs.has(weaponType.baseItem) ||
      actorProfs.has('shortsword');
    return isProficient;
  }
}
