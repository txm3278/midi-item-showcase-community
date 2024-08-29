// ##################################################################################################
// Read First!!!!
// When equipped and attuned, adds an action that allows to activate/deactivate the blade.
// Once the blade is activated another item it added to adjust the radius of the light.
// v1.0.2
// Author: Elwin#1410
// Dependencies:
//  - DAE, item macro [on],[off]
//  - MidiQOL "on use" item macro, [preTargeting][postActiveEffects]
//  - Active Token Effects
//
// How to configure:
// The item details must be:
//   - Equipement Type: Weapon
//   - Weapon Type: Martial Melee
//   - Base Weapon: Longsword
//   - Attunement: Attunement Required
//   - Proficiency: Automatic
//   - Weapon Properties: Magical
//   - Magical Bonus: 2
//   - Activation cost: (empty))
//   - Target: None
//   - Range: 5 feet
//   - Action Type: Melee Weapon Attack
//   - Damage Formula:
//     - 1d8[radiant] + @mod | Radiant
//   - Versatile Damage:
//     - 1d10[radiant] + @mod
//   - Other Formula: 1d8[radiant]
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//   - Activation Conditions
//     - Other Damage:
//       ["undead"].includes("@raceOrType")
//   - This item macro code must be added to the DIME code of this item.
// Two effects must also be added:
//   - Sun Blade:
//      - Transfer Effect to Actor on item equip (checked)
//      - Effects:
//          - macro.itemMacro | Custom |
//
// Usage:
// When equipped and attuned, a feat is added that allows to activate/deactivate the blade.
// When this feat is used, it allows to activate the blade, when activated an AE with the light effect
// is added as also another feat to adjust the blade's light radius.
//
// Description:
// In the "on" DAE macro call (of the Sun Blade transfer effect):
//   Creates and adds a feat to the owner of the sword to activate/deactivate the blade.
// In the "off" DAE macro call (of the Sun Blade transfer effect):
//   Deletes the feat to activate/deactivate that was created.
//   Deletes the Blade activation effect if present.
// In the "on" DAE macro call (of the Sun Blade activation effect):
//   Changes the blade to make it usable for attack.
//   Creates and adds a feat to the owner of the sword to adjust the blade's light radius.
// In the "off" DAE macro call (of the Sun Blade activation effect):
//   Reverts the changes done to the Sun Blade to make it usable for attack.
// In the preTargeting (item OnUse) phase of the Sun Blade item (in owner's workflow):
//   Validates that item blade is activate, otherwise the item workflow execution is aborted and
//   a notification is displayed to the user.
// In the postActiveEffects (item OnUse) phase (of the activate/deactivate feat):
//   If the blade is not activated:
//     Creates an activation effect on the current actor that updates the light config of the token.
//     Updates the Sun Blade transfer effect to delete the created effect when disabled.
//   If the blade is activated:
//     Deletes the activate effect.
//     Updates the Sun Blade transfer effect to remove the delete flag that was added at creation.
// In the postActiveEffects (item OnUse) phase (of the adjust feat):
//   If the alt key was pressed:
//     Enlarge the light bright and dim radius by 5 feet each up to maximum.
//   If the ctrl key was pressed:
//     Reduce the light bright and dim radius by 5 feet each down to minimum.
//   Prompt the owner to choose between enlarge or reduce, depending on the choice,
//     Apply 5 feet increase or decrease to the light bright and dim radius up to min/max.
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
  const ACTIVATE_ACTION_ORIGIN_FLAG = 'sunblade-activate-action-origin';
  const ADJUST_LIGHT_RADIUS_ACTION_ORIGIN_FLAG =
    'sunblade-adjust-light-radius-action-origin';
  const ACTIVATED = 'sunblade-activated';
  const LIGHT_RADIUS = 'sunblade-light-radius';
  const SOURCE_NAME = 'sunblade-source-name';
  const INITIAL_LIGHT_RADIUS = 15;
  const MIN_LIGHT_RADIUS = 10;
  const MAX_LIGHT_RADIUS = 30;
  const ENLARGE_CHOICE = 'enlarge';
  const REDUCE_CHOICE = 'reduce';

  // Set to false to remove debug logging
  const debug = false;

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

  if (args[0] === 'on') {
    if (
      foundry.utils.getProperty(
        scope.lastArgValue.efData,
        `flags.${MODULE_ID}.${ACTIVATED}`
      )
    ) {
      await activateBlade(item);
      await adjustProficiency(item);
    } else {
      // Transfer AE
      await createActivationAction(item);
    }
  } else if (args[0] === 'off') {
    if (
      foundry.utils.getProperty(
        scope.lastArgValue.efData,
        `flags.${MODULE_ID}.${ACTIVATED}`
      )
    ) {
      await deactivateBlade(item);
    } else {
      // Transfer AE, delete activation item and activation AE if present
      await actor.itemTypes.feat
        .find(
          (i) => i.getFlag(MODULE_ID, ACTIVATE_ACTION_ORIGIN_FLAG) === item.uuid
        )
        ?.delete();
      await actor.effects
        .find(
          (ae) => ae.origin === item.uuid && ae.getFlag(MODULE_ID, ACTIVATED)
        )
        ?.delete();
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    if (!scope.scope.lastArgValue.getFlag(MODULE_ID, ACTIVATED)) {
      ui.notifications.warn(
        'The blade must be activated to be able to make an attack with it.'
      );
      return false;
    }
    // Adjust proficiency to account for allowed multiple base items proficiency
    await adjustProficiency(scope.scope.lastArgValue);
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    const activateOrigin = scope.scope.lastArgValue.getFlag(
      MODULE_ID,
      ACTIVATE_ACTION_ORIGIN_FLAG
    );
    if (activateOrigin) {
      if (activateOrigin !== scope.macroItem.uuid) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Wrong sourceItemUuid is different from the origin of activate feat item.`,
          scope.macroItem.uuid,
          activateOrigin
        );
        return;
      }
      await handleActivatePostActiveEffects(scope.macroItem);
      return;
    }
    const adjustLightOrigin = scope.scope.lastArgValue.getFlag(
      MODULE_ID,
      ADJUST_LIGHT_RADIUS_ACTION_ORIGIN_FLAG
    );
    if (adjustLightOrigin) {
      if (adjustLightOrigin !== scope.macroItem.uuid) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Wrong sourceItemUuid is different from the origin of adjust light radius feat item.`,
          scope.macroItem.uuid,
          adjustLightOrigin
        );
        return;
      }
      await handleAdjustLightRadiusPostActiveEffects(workflow, scope.macroItem);
      return;
    }
  }

  /**
   * Handles the postActiveEffects of the Sun Blade - Activate/Deactivate feat.
   * If the Sun Blade is not activated:
   *   Activates the blade by creating a Blade Activation effect that applies the blade's light radius effect.
   * If the blade is activated:
   *   Deletes the Blade Activation effect.
   *
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function handleActivatePostActiveEffects(sourceItem) {
    // Get item with activate item origin flag
    const activated = sourceItem.getFlag(MODULE_ID, ACTIVATED);

    if (activated) {
      // Delete the effect, which will deactivate blade and remove adjust action
      sourceItem.actor?.effects
        .find(
          (ae) =>
            ae.origin === sourceItem.uuid && ae.getFlag(MODULE_ID, ACTIVATED)
        )
        ?.delete();
    } else {
      // Add active effect for blade activation
      await createBladeActivationEffect(sourceItem);
    }
  }

  /**
   * Handles the postActiveEffects of the Sun Blade - Adjust light radius feat.
   * Prompts the owner to choose between enlarge or reduce. If the alt key is pressed,
   * enlarge is automatically chosen, and if ctrl key is pressed, reduce is automatically chosen.
   * Then applies the change to the light radius on the Blade Activation effect.
   * The radius can only be enlarged/reduced up to a maximum/minimum.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current MidiQOL workflow.
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function handleAdjustLightRadiusPostActiveEffects(
    currentWorkflow,
    sourceItem
  ) {
    const activationEffect = sourceItem.actor?.effects.find(
      (ae) => ae.origin === sourceItem.uuid && ae.getFlag(MODULE_ID, ACTIVATED)
    );
    if (!activationEffect) {
      return;
    }
    const currentLightRadius =
      activationEffect.getFlag(MODULE_ID, LIGHT_RADIUS) ?? INITIAL_LIGHT_RADIUS;
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
    if (currentWorkflow.event?.altKey) {
      choice = ENLARGE_CHOICE;
    } else if (currentWorkflow.event?.ctrlKey) {
      choice = REDUCE_CHOICE;
    }
    if (!choice) {
      // Ask which option to apply
      const sourceName =
        sourceItem.getFlag(MODULE_ID, SOURCE_NAME) ?? DEFAULT_ITEM_NAME;
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
    const newLightRadius =
      game.release.generation >= 12
        ? Math.clamp(
            currentLightRadius + adjustment,
            MIN_LIGHT_RADIUS,
            MAX_LIGHT_RADIUS
          )
        : Math.clamped(
            currentLightRadius + adjustment,
            MIN_LIGHT_RADIUS,
            MAX_LIGHT_RADIUS
          );

    const newChanges = foundry.utils.deepClone(activationEffect.changes ?? []);
    for (let change of newChanges) {
      if (['ATL.light.dim', 'ATL.light.bright'].includes(change.key)) {
        const newValue =
          change.key === 'ATL.light.dim' ? newLightRadius * 2 : newLightRadius;
        change.value = '' + newValue;
      }
    }
    const updates = { changes: newChanges };
    foundry.utils.setProperty(
      updates,
      `flags.${MODULE_ID}.${LIGHT_RADIUS}`,
      newLightRadius
    );
    await activationEffect.update(updates);

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
   * Creates the blade activation/deactivation feat item.
   *
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function createActivationAction(sourceItem) {
    const itemName = `${sourceItem.name}: Activate/Deactivate blade`;
    const activateActionItemData = {
      type: 'feat',
      name: itemName,
      img: sourceItem.img,
      system: {
        description: {
          value: 'Activate or deactivate the blade.',
        },
        activation: {
          type: 'bonus',
          cost: 1,
        },
        target: { type: 'self' },
      },
      flags: {
        'midi-qol': {
          onUseMacroName: `[postActiveEffects]ItemMacro.${sourceItem.uuid}`,
        },
        [MODULE_ID]: {
          [ACTIVATE_ACTION_ORIGIN_FLAG]: sourceItem.uuid,
        },
      },
    };

    // Add item that allows activating the blade
    await sourceItem.actor?.createEmbeddedDocuments('Item', [
      activateActionItemData,
    ]);
  }

  /**
   * Returns the effect data for the blade's activation.
   *
   * @param {Item5e} sourceItem the Sun Blade item.
   *
   * @returns {object} the active effect data for the blade's activation.
   */
  async function createBladeActivationEffect(sourceItem) {
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const bladeActivationEffectData = {
      changes: [
        {
          key: 'macro.itemMacro',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '',
          priority: '20',
        },
        {
          key: 'ATL.light.bright',
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: '' + INITIAL_LIGHT_RADIUS,
          priority: '20',
        },
        {
          key: 'ATL.light.dim',
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: '' + 2 * INITIAL_LIGHT_RADIUS,
          priority: '20',
        },
        {
          key: 'ATL.light.animation.type',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'sunburst',
          priority: '20',
        },
        {
          key: 'ATL.light.animation.speed',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 1,
          priority: '20',
        },
        {
          key: 'ATL.light.animation.intensity',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 1,
          priority: '20',
        },
        {
          key: 'ATL.light.color',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: '#a2642a',
          priority: '20',
        },
        {
          key: 'ATL.light.alpha',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 0.7,
          priority: '20',
        },
      ],
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - Activated`,
      origin: sourceItem.uuid,
      transfer: false,
      flags: {
        [MODULE_ID]: {
          [ACTIVATED]: true,
          [LIGHT_RADIUS]: INITIAL_LIGHT_RADIUS,
        },
        dae: { showIcon: true },
        // Add support for CPR VAE button
        'chris-premades': {
          effect: {
            noAnimation: false,
          },
          vae: {
            button: `${sourceItem.name}: Adjust light radius`,
          },
        },
      },
    };
    await sourceItem.actor?.createEmbeddedDocuments('ActiveEffect', [
      bladeActivationEffectData,
    ]);
  }

  /**
   * Activates the blade. It applies changes to the item to make it usable for attack.
   * It also create and add a feat to adjust the blade's light radius.
   *
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function activateBlade(sourceItem) {
    // Activate blade
    const sourceName = sourceItem.name;
    const updates = {
      name: `${sourceItem.name} (active)`,
      system: {
        activation: {
          type: 'action',
          cost: 1,
        },
        target: {
          value: 1,
          type: 'creature',
        },
        actionType: 'mwak',
        properties: ['fin', 'mgc', 'ver'],
      },
      flags: {
        [MODULE_ID]: { [ACTIVATED]: true, [SOURCE_NAME]: sourceName },
      },
    };
    await sourceItem.update(updates);
    await createAdjustLightRadiusAction(sourceItem);
  }

  /**
   * Creates the adjust the blade's light radius feat item.
   * This feat is made dependent on the Blade Activation effect to be auto
   * removed when the effect is deleted.
   *
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function createAdjustLightRadiusAction(sourceItem) {
    const sourceName =
      sourceItem.getFlag(MODULE_ID, SOURCE_NAME) ?? DEFAULT_ITEM_NAME;
    const itemName = `${sourceName}: Adjust light radius`;
    const adjustLightRadiusActionItemData = {
      type: 'feat',
      name: itemName,
      img: sourceItem.img,
      system: {
        description: {
          value: "Enlarge/Reduce the blade's light radius.",
        },
        activation: {
          type: 'action',
          cost: 1,
        },
        target: { type: 'self' },
      },
      flags: {
        'midi-qol': {
          onUseMacroName: `[postActiveEffects]ItemMacro.${sourceItem.uuid}`,
        },
        [MODULE_ID]: {
          [ADJUST_LIGHT_RADIUS_ACTION_ORIGIN_FLAG]: sourceItem.uuid,
        },
      },
    };

    // Add item that allows adjusting the blade's light radius
    const [adjustLightRadiusActionItem] =
      await sourceItem.actor.createEmbeddedDocuments('Item', [
        adjustLightRadiusActionItemData,
      ]);
    if (adjustLightRadiusActionItem) {
      // Add as a dependent to cleanup when AE is deleted
      await sourceItem.actor.effects
        .find(
          (ae) =>
            ae.origin === sourceItem.uuid && ae.getFlag(MODULE_ID, ACTIVATED)
        )
        ?.addDependent(adjustLightRadiusActionItem);
    }
  }

  /**
   * Deactivates the blade. It reverts the changes that were applied to make the item usable for attack.
   *
   * @param {Item5e} sourceItem - The Sun Blade item.
   */
  async function deactivateBlade(sourceItem) {
    if (!sourceItem) {
      // The item was deleted, no need to update it.
      return;
    }
    const updates = {
      name: sourceItem.getFlag(MODULE_ID, SOURCE_NAME) ?? DEFAULT_ITEM_NAME,
      system: {
        activation: {
          type: null,
          cost: null,
        },
        target: {
          value: null,
          type: null,
        },
        actionType: null,
        properties: ['mgc'],
      },
      flags: {
        [MODULE_ID]: { [ACTIVATED]: false },
      },
    };
    await sourceItem.update(updates);
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
   */
  async function adjustProficiency(sourceItem) {
    if (sourceItem.system.proficient === null) {
      if (!sourceItem.system.prof.multiplier && isProficient(sourceItem)) {
        // Force proficiency
        await sourceItem.update({ 'system.proficient': 1 });
      }
    } else if (
      sourceItem.system.proficient === 1 &&
      !isProficient(sourceItem)
    ) {
      // Force not proficiency
      await sourceItem.update({ 'system.proficient': 0 });
    } else if (sourceItem.system.proficient === 0 && isProficient(sourceItem)) {
      // Force proficiency
      await sourceItem.update({ 'system.proficient': 1 });
    }
  }

  /**
   * Validate that the item's parent is proficient with the Sun Blade.
   * An actor can be proficient if he has proficiency in long sword or short sword
   * .
   * @param {Item5e} sourceItem - The Sun Blade item.
   * @returns {boolean} Returns true if the item's parent is proficient with the Sun Blade, false otherwise.
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
