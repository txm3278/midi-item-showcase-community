// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Adds a third party reaction active effect, that effect will trigger a reaction by the Cleric
// when a creature within is damaged by elemental damage type to allow him to add resistance to this type
// of damage before the damage is applied.
// v1.1.0
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [preTargeting][postActiveEffects][tpr.isDamaged]
//  - Elwin Helpers world script
//
// How to configure:
// The Feature details must be:
//   - Activation cost: 1 Reaction
//   - Target: 1 Ally (RAW it's Creature, but use Enemy to trigger reaction only on allies)
//   - Action Type: (empty)
//   - Range: 30 feet
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | Called before targeting is resolved
//       ItemMacro | After Active Effects
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - Activation Conditions
//     - Reaction:
//       reaction === "tpr.isDamaged" && workflow.damageItem?.damageDetail.some(d => ["acid", "cold", "fire", "lightning", "thunder"].includes(d.type) && (d.value ?? d.damage) > 0 && d.active?.resistance !== true)
//   - This item macro code must be added to the DIME code of the item.
// One effect must also be added:
//   - Dampen Elements:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,tpr.isDamaged|pre=true;post=true
//
// Usage:
// This item has a passive effect that adds a third party reaction effect.
// It is also a reaction item that gets triggered by the third party reaction effect when appropriate.
//
// Description:
// In the preTargeting (item OnUse) phase of the Dampen Elements item (in owner's workflow):
//   Validates that item was triggered by the remote tpr.isDamaged target on use,
//   otherwise the item workflow execution is aborted.
// In the postActiveEffects (item onUse) phase of the item (in owner's workflow):
//   If there is more than one element damage type, prompts a dialog to choose to which type to apply the resistance.
//   A selected damage type flag is set on the item's owner to be used by the post macro of the tpr.isDamaged reaction.
// In the tpr.isDamaged (TargetOnUse) pre macro (in attacker's workflow) (on owner or other target):
//   Sets a flag on the item's owner with the elemental damage types to be applied to the target.
// In the tpr.isDamaged (TargetOnUse) post macro (in attacker's workflow) (on owner or other target):
//   If the reaction was used and completed successfully, applies resistance to the selected element damage type flag,
//   and recomputes the applied damage.
// ###################################################################################################

export async function dampenElements({
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
  const DEFAULT_ITEM_NAME = 'Dampen Elements';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.6'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers world script must be installed, active and have a version greater or equal than 2.6.0`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }
  if (
    !foundry.utils.isNewerVersion(
      game.modules.get('midi-qol')?.version,
      '11.6'
    ) &&
    !MidiQOL.configSettings().v3DamageApplication
  ) {
    ui.notifications.error(
      `${DEFAULT_ITEM_NAME} | dnd5e v3 damage application is required.`
    );
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    return handleOnUsePreTargeting(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isDamaged.pre'
  ) {
    // MidiQOL TargetOnUse pre macro for Dampen Elements pre reaction in the triggering midi-qol workflow
    return await handleTargetOnUseIsDamagedPre(workflow, scope.macroItem);
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'tpr.isDamaged.post'
  ) {
    await handleTargetOnUseIsDamagedPost(
      workflow,
      scope.macroItem,
      options?.thirdPartyReactionResult
    );
  } else if (
    args[0].tag === 'OnUse' &&
    args[0].macroPass === 'postActiveEffects'
  ) {
    // MidiQOL OnUse item macro for Dampen Elements
    await handleOnUsePostActiveEffects(workflow, scope.macroItem, actor);
  }

  /**
   * Handles the preTargeting phase of the Dampen Elements item midi-qol workflow.
   * Validates that the reaction was triggered by the isHit phase.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - midi-qol current workflow.
   * @param {Item5E} sourceItem - The Dampen Elements item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  function handleOnUsePreTargeting(currentWorkflow, sourceItem) {
    if (
      currentWorkflow.options?.thirdPartyReaction?.trigger !==
        'tpr.isDamaged' ||
      !currentWorkflow.options?.thirdPartyReaction?.itemUuids?.includes(
        sourceItem.uuid
      )
    ) {
      // Reaction should only be triggered by third party reactions
      const msg = `${DEFAULT_ITEM_NAME} | This reaction can only be triggered when a nearby creature is damaged by element damage type.`;
      ui.notifications.warn(msg);
      return false;
    }
    return true;
  }

  /**
   * Handles the tpr.isDamaged pre macro of the Dampen Elements item in the triggering midi-qol workflow.
   * Sets a flag on the owner with the elemental damage types from which to choose to apply resistance.
   * It will be used by the reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Dampen Elements item.
   *
   * @returns {object} undefined when all conditions are met, an object with skip attribute to true if the reaction must be skipped.
   */
  async function handleTargetOnUseIsDamagedPre(currentWorkflow, sourceItem) {
    // Sets the elemental damage types of the damage to be applied.
    const sourceActor = sourceItem.actor;

    if (!sourceActor) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing sourceActor`, sourceItem);
      return { skip: true };
    }
    const damages = currentWorkflow.damageItem?.damageDetail.filter(
      (d) =>
        ['acid', 'cold', 'fire', 'lightning', 'thunder'].includes(d.type) &&
        (d.value ?? d.damage) > 0 &&
        d.active?.resistance !== true
    );
    if (!damages.length) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | No elemental damage types found.`,
          {
            damageDetail: currentWorkflow.damageItem?.damageDetail,
          }
        );
      }
      await DAE.unsetFlag(sourceActor, 'dampenElements');
      return { skip: true };
    }
    await DAE.setFlag(sourceActor, 'dampenElements', { damages });
  }

  /**
   * Handles the tpr.isDamaged post reaction of the Dampen Elements item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, adds resistance to the selected elemental damage type.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Dampen Elements item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsDamagedPost(
    currentWorkflow,
    sourceItem,
    thirdPartyReactionResult
  ) {
    const dampenElementsFlag = DAE.getFlag(sourceItem.actor, 'dampenElements');
    if (
      thirdPartyReactionResult?.uuid !== sourceItem.uuid ||
      !dampenElementsFlag?.damages.length
    ) {
      return;
    }
    await DAE.unsetFlag(sourceItem.actor, 'dampenElements');

    const selectedType =
      dampenElementsFlag.selected ?? dampenElementsFlag.damages[0].type;
    const damageItem = currentWorkflow.damageItem;
    const targetToken = fromUuidSync(damageItem.tokenUuid);
    if (!targetToken) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Target token found.`, {
          damageItem: workflow.damageItem,
        });
      }
      return;
    }

    // Compute resistance to damage
    damageItem.damageDetail = targetToken.actor?.calculateDamage(
      damageItem.rawDamageDetail,
      damageItem.calcDamageOptions ?? {}
    );
    // Recompute totals.
    elwinHelpers.calculateAppliedDamage(damageItem);
    if (damageItem.details) {
      damageItem.details.push(
        `${sourceItem.name} [${
          CONFIG.DND5E.damageTypes[selectedType].label ??
          CONFIG.DND5E.damageTypes[selectedType]
        }]`
      );
    }
  }

  /**
   * Handles the postActiveEffects of the Dampen Elements item midi-qol workflow.
   * A flag is added to the Barbarian with the damage reduction to be applied and the item card
   * is updated to inform of the damage reduction to be applied on the target.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Dampen Elements item.
   * @param {Actor5e} sourceActor - The owner of the Dampen Elements item.
   */
  async function handleOnUsePostActiveEffects(
    currentWorkflow,
    sourceItem,
    sourceActor
  ) {
    const targetToken = currentWorkflow.targets.first();
    if (!targetToken) {
      // No target found
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Target found.`);
      }
      return;
    }
    const targetActor = targetToken.actor;
    if (!targetActor) {
      // No actor found
      console.warn(`${DEFAULT_ITEM_NAME} | Target actor found.`, targetActor);
      return;
    }
    const dampenElementsFlag = DAE.getFlag(sourceActor, 'dampenElements');
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Dampen elements flag.`, {
        dampenElementsFlag,
      });
    }
    if (!dampenElementsFlag || !(dampenElementsFlag.damages?.length > 1)) {
      return;
    }

    // Prompts a dialog to choose to which type to apply resistance
    const selectedType = await chooseDamageType(
      sourceItem,
      dampenElementsFlag.damages
    );
    if (selectedType) {
      dampenElementsFlag.selected = selectedType;
      await DAE.setFlag(sourceActor, 'dampenElements', dampenElementsFlag);
    }

    // Create an active effect to add resistance to selected type
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const targetEffectData = {
      changes: [
        // resistance to damage
        {
          key: 'system.traits.dr.value',
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: selectedType,
          priority: 20,
        },
      ],
      origin: sourceItem.uuid, //flag the effect as associated to the source item used
      transfer: false,
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - Damage Resistance`,
      duration: currentWorkflow.inCombat ? { turns: 1 } : { seconds: 1 },
      'flags.dae.specialDuration': ['isAttacked', 'isSave', 'isDamaged'],
    };
    await MidiQOL.socket().executeAsGM('createEffects', {
      actorUuid: targetActor.uuid,
      effects: [targetEffectData],
    });
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
        label: `${
          CONFIG.DND5E.damageTypes[d.type].label ??
          CONFIG.DND5E.damageTypes[d.type]
        } [${d.value ?? d.damage}]`,
        value: d.type,
      })),
      title: `${sourceItem.name} - Choose a Damage Type`,
    };
    return await elwinHelpers.buttonDialog(data, 'column');
  }
}