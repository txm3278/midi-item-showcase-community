// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// When used, adds an effect on the target and on the owner. When the owner is damaged, a save is
// triggered on the tethered creature, if failed it takes half the owner's damage and the owners
// applied damage is reduced by half.
// v1.3.0
// Dependencies:
//  - DAE
//  - Times up
//  - MidiQOL "on use" actor macro [preTargetDamageApplication][postActiveEffects]
//  - Elwin Helpers world script
//  - Sequencer (optional)
//  - JB2A free or patreon (optional)
//
// Note: Midi must be configured to use DND5E damage calculation.
//
// How to configure:
// The Feature details must be:
//   - Feature Type: Monster Feature
//   - Activation cost: 1 Lair Action
//   - Action Type: (empty)
// The Feature Midi-QOL must be:
//   - On Use Macros:
//       ItemMacro | After Active Effects
//   - This item macro code must be added to the DIME code of this feature.
// One effect must also be added:
//   - Negative Energy Tether:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Apply to self when item applies target effects (checked)
//      - Duration: 1 Round
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,preTargetDamageApplication
//   - Negative Energy Tether:
//      - Transfer Effect to Actor on ItemEquip (unchecked)
//      - Duration: 1 Round
//
// Usage:
// This item needs to be used to activate. When activated the effects are applied.
//
// Description:
// In the postActiveEffects (item onUse) phase of Negative Energy Tether item (in owner's workflow):
//   Updates the self active effect to delete the target active effect when deleted and vice versa and
//   creates a sequencer effect between the owner and the target if the required modules are active.
// In the postActiveEffects (item onUse) phase of Negative Energy Tether: Share Damage item (in owner's workflow):
//   If the target failed its save, creates a chat message to explain why the damage applied to the owner from
//   the original attack was reduced.
// In the preTargetDamageApplication (TargetOnUse) phase (in attacker's workflow) (on owner):
//   Computes the damage to be shared with the tethered creature and executes a remote completeItemUse
//   to apply the damage on the tethered creature if it fails its save. If the remote workflow
//   completed sucessfully and the target failed its save, reduce the damage to be applied by the amount
//   shared with the tethered creature.
// ###################################################################################################

export async function negativeEnergyTether({
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
  const DEFAULT_ITEM_NAME = 'Negative Energy Tether';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;
  const JB2A_TETHER_BEAM = 'jb2a.energy_beam.normal.bluepink.03';

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.6'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol'];
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (
      scope.rolledItem?.getFlag(MODULE_ID, 'negativeEnergyTetherShareDamage')
    ) {
      // The share damage feat
      await handleShareDamageOnUsePostActiveEffects(workflow, scope.macroItem);
    } else {
      // The original item
      await handleOnUsePostActiveEffects(workflow, scope.macroItem);
    }
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'preTargetDamageApplication'
  ) {
    await handleTargetOnUsePreTargetDamageApplication(
      workflow,
      scope.macroItem,
      actor
    );
  }

  /**
   * Handles the postActiveEffects of the Negative Energy Tether item.
   * Makes the self AE and target AE dependent on each others and
   * creates a sequencer effect between the owner and the target if the required modules are active.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Negative Energy Tether item.
   */
  async function handleOnUsePostActiveEffects(currentWorkflow, sourceItem) {
    if (currentWorkflow.applicationTargets.size < 1) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No effect applied to target.`);
      }
      return;
    }
    const tokenTarget = currentWorkflow.applicationTargets.first();
    const appliedEffect = tokenTarget.actor?.appliedEffects.find(
      (ae) => ae.origin === sourceItem.uuid
    );
    if (!appliedEffect) {
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | No applied effect found on target actor.`
        );
      }
      return;
    }

    // Find AE on self to add delete flag
    const selfEffect = currentWorkflow.actor.effects.find(
      (ae) => ae.origin === sourceItem.uuid
    );
    if (!selfEffect) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No self effect found on actor.`);
      }
      return;
    }
    const changes = foundry.utils.deepClone(selfEffect.changes ?? []);
    changes.push({
      key: `flags.${MODULE_ID}.negativeEnergyTetherTarget`,
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: tokenTarget.document.uuid,
    });
    await selfEffect.update({ changes });
    await selfEffect.addDependent(appliedEffect);
    await MidiQOL.socket().executeAsGM('addDependent', {
      concentrationEffectUuid: appliedEffect.uuid,
      dependentUuid: selfEffect.uuid,
    });

    if (
      !game.modules.get('sequencer')?.active ||
      !foundry.utils.hasProperty(Sequencer.Database.entries, 'jb2a')
    ) {
      // Sequencer or JB2A not active
      return;
    }

    new Sequence()
      .effect()
      .origin(sourceItem.uuid)
      .file(JB2A_TETHER_BEAM)
      .attachTo(currentWorkflow.token)
      .stretchTo(tokenTarget, { attachTo: true })
      .persist()
      .play();
  }

  /**
   * Handles the postActiveEffects of the Negative Energy Tether: Share Damage item.
   * If the target failed its save, creates a chat message to explain why the owner of the feat did not take all the damage.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Negative Energy Tether item.
   */
  async function handleShareDamageOnUsePostActiveEffects(
    currentWorkflow,
    sourceItem
  ) {
    if (!currentWorkflow.aborted && !currentWorkflow.failedSaves?.size) {
      // Damage was not shared
      return;
    }

    // Add info to chat message to indicate why the target of the attack received less damage.
    const targetDivs = elwinHelpers.getTargetDivs(
      currentWorkflow.token,
      "Some of the <strong>${tokenName}</strong>'s damage"
    );
    const damageList = [];
    for (let damageEntry of currentWorkflow.damageDetail) {
      damageList.push(
        `${damageEntry.damage} ${
          CONFIG.DND5E.damageTypes[damageEntry.type]?.label ?? damageEntry.type
        }`
      );
    }
    const newTargetDivs = elwinHelpers.getTargetDivs(
      currentWorkflow.failedSaves.first(),
      `was shared with <strong>\${tokenName}</strong> by <strong>${
        sourceItem.name
      }</strong>: ${damageList.join(', ')}.`
    );
    const infoMsg = `${targetDivs}${newTargetDivs}`;
    MidiQOL.addUndoChatMessage(
      await ChatMessage.create({
        type:
          game.release.generation >= 12
            ? CONST.CHAT_MESSAGE_STYLES.OTHER
            : CONST.CHAT_MESSAGE_TYPES.OTHER,
        content: infoMsg,
        speaker: ChatMessage.getSpeaker({
          actor: currentWorkflow.actor,
          token: currentWorkflow.token,
        }),
        whisper: ChatMessage.getWhisperRecipients('GM').map((u) => u.id),
      })
    );
  }

  /**
   * Computes the damage to be shared with the tethered creature and executes a remote completeItemUse
   * to apply the damage on the tethered creature if it fails its save. If the remote workflow
   * completed sucessfully and the target failed its save, reduce the damage to be applied by the amount
   * shared with the tethered creature.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem - The Negative Energy Tether item.
   * @param {Actor5e} targetActor - The owner of the Negative Energy Tether item that was damaged.
   */
  async function handleTargetOnUsePreTargetDamageApplication(
    currentWorkflow,
    sourceItem,
    targetActor
  ) {
    let appliedDamage = currentWorkflow.damageItem?.appliedDamage;
    if (!appliedDamage) {
      // compute total damage applied to target
      appliedDamage = currentWorkflow.damageItem?.damageDetail.reduce(
        (amount, d) =>
          amount +
          (!(d.value > 0) || ['temphp', 'midi-none'].includes(d.type)
            ? 0
            : d.value),
        0
      );
    }

    if (!(appliedDamage > 0)) {
      // No damage, skip
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No damage, skip tethered effect.`);
      }
      return;
    }
    const damageItem = currentWorkflow.damageItem;
    let damageToApply = 0;
    const damageToTether = [];

    // Note: in case of multiple damage types, the damage applied to the lich may not be exactly: applied damage / 2 rounded down.
    // It could be a little bit lower due to rounding each damage type divided by half, that's why we have to do a second pass to make it right.
    for (let damageEntry of damageItem.damageDetail) {
      if (
        !(damageEntry.value > 0) ||
        ['temphp', 'midi-none'].includes(damageEntry.type)
      ) {
        continue;
      }
      const lichDamage = Math.floor(damageEntry.value / 2);
      damageToApply += lichDamage;
      const damageValue = damageEntry.value - lichDamage;
      damageToTether.push({ value: damageValue, type: damageEntry.type });
    }

    // When there is multiple damage types, rounding each type can reduce too much
    // the damage to the Lich. This adds back 1 damage on the type which has a greater value,
    // until the target damage to apply is reached.
    const targetDamageToApply = Math.floor(appliedDamage / 2);
    while (targetDamageToApply > damageToApply) {
      const maxIndex = indexOfMaxDamageEntryValue(damageToTether);
      damageToTether[maxIndex].value -= 1;
      damageToApply += 1;
    }

    // Build the shared damage to apply to the tethered creature.
    const damageParts = [];
    for (let damageEntry of damageToTether) {
      damageParts.push([
        `(${damageEntry.value}[${damageEntry.type}])`,
        damageEntry.type,
      ]);
    }

    const featData = {
      type: 'feat',
      name: `${sourceItem.name} - Share Damage`,
      img: sourceItem.img,
      system: {
        actionType: 'save',
        damage: { parts: damageParts },
        target: { type: 'creature', value: 1 },
        save: { ability: 'con', dc: 18, scaling: 'flat' },
      },
      flags: {
        midiProperties: {
          saveDamage: 'nodam',
        },
        'midi-qol': {
          onUseMacroName: `[postActiveEffects]ItemMacro.${sourceItem.uuid}`,
        },
        [MODULE_ID]: {
          negativeEnergyTetherShareDamage: true,
        },
      },
    };
    const feat = new CONFIG.Item.documentClass(featData, {
      parent: targetActor,
      temporary: true,
    });

    const tetheredTokenUuid = targetActor.getFlag(
      MODULE_ID,
      'negativeEnergyTetherTarget'
    );
    const options = {
      targetUuids: [tetheredTokenUuid],
      configureDialog: false,
      workflowOptions: {
        fastForwardDamage: true,
        targetConfirmation: 'none',
        autoRollDamage: 'always',
      },
      workflowData: true,
    };

    // If the target is associated to a GM user roll item in this client, otherwise send the item roll to user's client
    let player = MidiQOL.playerForActor(targetActor);
    if (!player?.active) {
      // Find first active GM player
      player = game.users?.activeGM;
    }
    if (!player) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Could not find player for actor ${targetActor}`
      );
      return;
    }

    const data = {
      itemData: feat.toObject(),
      actorUuid: targetActor.uuid,
      targetUuids: options.targetUuids,
      options,
    };

    const otherWorkflowData = await MidiQOL.socket().executeAsUser(
      'completeItemUse',
      player.id,
      data
    );
    if (debug) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | Share damage workflow data.`,
        otherWorkflowData
      );
    }

    // Reduce Lich damage if the save was failed.
    if (
      !otherWorkflowData.aborted &&
      otherWorkflowData.failedSaveUuids?.length
    ) {
      elwinHelpers.reduceAppliedDamage(
        damageItem,
        appliedDamage - damageToApply,
        sourceItem
      );
    }
  }

  /**
   * Returns the index of the damage entry with the highest damage value.
   *
   * @param {object[]} damageDetails - Array of damage entries.
   * @returns {number} the index of damage entry with the highest damage value.
   */
  function indexOfMaxDamageEntryValue(damageDetails) {
    if (damageDetails.length === 0) {
      return -1;
    }

    let max = damageDetails[0].value;
    let maxIndex = 0;

    for (let i = 1; i < damageDetails.length; i++) {
      if (damageDetails[i].value > max) {
        maxIndex = i;
        max = damageDetails[i].value;
      }
    }

    return maxIndex;
  }
}
