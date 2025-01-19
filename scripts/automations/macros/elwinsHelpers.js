// ##################################################################################################
// Read First!!!!
// World Scripter Macro.
// Mix of helper functions for macros.
// v3.0.0
// Dependencies:
//  - MidiQOL
//
// Usage:
// Add this macro to the World Scripter compendium or macro folder, or in your own world script.
//
// Description:
// This macro exposes mutiple utility functions used by different item macros.
// Exported functions (see each function for documentation):
// - elwinHelpers.isDebugEnabled
// - elwinHelpers.setDebugEnabled
// - elwinHelpers.getTargetDivs
// - elwinHelpers.hasItemProperty
// - elwinHelpers.reduceAppliedDamage
// - elwinHelpers.calculateAppliedDamage
// - elwinHelpers.insertTextIntoMidiItemCard
// - elwinHelpers.requirementsSatisfied
// - elwinHelpers.selectTargetsWithinX
// - elwinHelpers.isRangedAttackActivity
// - elwinHelpers.isRangedWeaponAttackActivity
// - elwinHelpers.isRangedAttack
// - elwinHelpers.isRangedWeaponAttack
// - elwinHelpers.isMeleeAttackActivity
// - elwinHelpers.isMeleeWeaponAttackActivity
// - elwinHelpers.isMeleeAttack
// - elwinHelpers.isMeleeWeaponAttack
// - elwinHelpers.isMidiHookStillValid
// - elwinHelpers.getTokenName
// - elwinHelpers.getActorSizeValue
// - elwinHelpers.getSizeValue
// - elwinHelpers.buttonDialog
// - elwinHelpers.remoteButtonDialog
// - elwinHelpers.getAttackSegment
// - elwinHelpers.getMoveTowardsPosition
// - elwinHelpers.findMovableSpaceNearDest
// - elwinHelpers.convertCriticalToNormalHit
// - elwinHelpers.adjustAttackRollTargetAC
// - elwinHelpers.getDamageRollOptions
// - elwinHelpers.getMidiOnSavePropertyName
// - elwinHelpers.getAppliedEnchantments
// - elwinHelpers.deleteAppliedEnchantments
// - elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll
// - elwinHelpers.ItemSelectionDialog
// - elwinHelpers.TokenSelectionDialog
//
// Third party reaction framework:
// To use this new third party reaction framework you need to define an active effect (usually a transfer effect) using the following key and value:
//   Key: flags.midi-qol.onUseMacroName
//   Change Mode: Custom
//   Value: <macroRef>,<thirdPartyReactionTrigger>|<thirdPartyReactionOptions>
//
// The value is composed of three parts, the first two are similar to those used by normal MidiQOL onUseMacroName.
//   - macroRef: this can be an item macro, a macro, or a function, it uses the same syntax MidiQOL uses.
//   - thirdPartyReactionTrigger: currently supported values
//     - tpr.isTargeted: this is called in the "midi-qol.preValidateRoll" hook, which is just before it validates a target’s range from the attacker.
//     - tpr.isPreAttacked: this is called in the "midi-qol.preAttackRoll" hook, which is called before the attacker’s d20 roll.
//     - tpr.isAttacked: this is called in the "midi-qol.preCheckHits" hook, which is called after the attacker’s d20 roll but before validating if a target was hit or missed.
//     - tpr.isHit: this is called in the "midi-qol.hitsChecked" hook, which is called after MidiQOL validated that a target was hit.
//     - tpr.isMissed: this is called in the "midi-qol.hitsChecked" hook, which is called after MidiQOL validated that a target was missed.
//     - tpr.isPreDamaged: this is called in the "midi-qol.preDamageRoll" hook, which is called before the attacker's damage roll.
//     - tpr.isDamaged: this is called in the "midi-qol.preTargetDamageApplication", which is called after MidiQOL computed the damage to be dealt to a target but before it is applied.
//     - tpr.isHealed: this is called in the "midi-qol.preTargetDamageApplication", which is called after MidiQOL computed the healing to be done to a target but before it is applied.
//     - tpr.isPreCheckSave: this is called in the "midi-qol.preCheckSaves", which is called just before a saving throw check is asked from the target.
//     - tpr.isPostCheckSave: this is called in the "midi-qol.postCheckSaves", which is called after a saving throw check is asked from the target but before it is displayed.
//   - thirdPartyReactionOptions: The options consist of a list of parameter/value pairs separated by `;`. The parameter and its value is separated by a `=`.
//     - ignoreSelf: true or false to indicate if the owner being a target must not trigger the reaction. [default false]
//     - triggerSource: target or attacker, determines to whom the canSee option, the item’s range and target applies. [default target]
//     - canSee: true or false, if the trigger source must be seen or not by the owner. [default false]
//     - pre: true or false, indicates if a pre reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.pre` suffix,
//            e.g.: `tpr.isHit.pre`. This macro is called in the triggering workflow.  [default false]
//     - post: true or false, indicates if a post reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.post` suffix,
//             e.g.: `tpr.isHit.post`. This macro is called in the triggering workflow. [default false]
//
// Example: `ItemMacro,tpr.isDamaged|ignoreSelf=true;canSee=true;pre=true;post=true`
//
// TPR pre macro: It is always called before prompting, it is used to set things or cleanup things, it can also be used to add complex activation condition,
//                if it returnes the object {skip: true}, this reaction will not be prompted. This is called before the prompt in the workflow of the attacker.
// TPR post macro: It is always called after the prompt and execution of the selected reaction even it it was cancelled or a reaction was aborted.
//                 It should be used to cleanup and apply affects on the attacker's workflow if the proper reaction was chosen and was successful.
// The pre and post macros are called in the item use workflow, it means that any changes to the MidiQOL workflow are live. The macro parameters are the same as any macro call with an args[0].tag value of ‘TargetOnUse’.
//
// The TPR pre, reaction and TPR post are all executed in the same phase of the attacker's workflow. For example if tpr.isAttacked,
// they are executed after attack roll but before its evaluation for hit or miss.
//
// When the tpr reaction is called, the following attributes in options are available:
//   options.thirdPartyReaction.trigger: name of the tpr trigger, e.g.: tpr.isDamaged
//   options.thirdPartyReaction.itemUuids: array of reaction uuids that were prompted on a trigger for an actor owner of TPR reactions.
//   options.thirdPartyReaction.triggerSource: target or attacker, this depends on the value configured on the thirdPartyReactionOptions of the TPR active effect
//   options.thirdPartyReaction.targetUuid: UUID of the target of the item that triggered the TPR, only set if the triggerSource is attacker.
//   options.thirdPartyReaction.attackerUuid: UUID of the actor that used the item that triggered the TPR, only set if the triggerSource is target.
//
// The reaction condition data is augmented for third party reactions. The following extra attributes are available:
//   - tpr.item: reaction item roll data.
//   - tpr.actor: reaction item owner’s roll data.
//   - tpr.actorId: actor id of the reaction item owner’s.
//   - tpr.actorUuid: actor UUID of the reaction item owner’s.
//   - tpr.tokenId: token id associated with the reaction item owner’s.
//   - tpr.tokenUuid: token UUID associated with the reaction item owner’s.
//   - tpr.canSeeTriggerSource: boolean to indicate if the owner canSee the triggerSource, usually the target but in some cases the attacker.
//   - tpr.isMeleeAttack: boolean to indicate if the item that triggered the reaction is a melee attack.
//   - tpr.isMeleeWeaponAttack: boolean to indicate if the item that triggered the reaction is a melee weapon attack.
//   - tpr.isRangedAttack: boolean to indicate if the item that triggered the reaction is a ranged attack.
//   - tpr.isRangedWeaponAttack: boolean to indicate if the item that triggered the reaction is a ranged weapon attack.
//
// ###################################################################################################

export function runElwinsHelpers() {
  const VERSION = '3.0.0';
  const MACRO_NAME = 'elwin-helpers';
  const active = true;
  let debug = false;
  let depReqFulfilled = false;

  const TPR_OPTIONS = ['triggerSource', 'ignoreSelf', 'canSee', 'pre', 'post'];

  /*eslint no-undef: "error"*/

  /**
   * Third party reaction options.
   * @typedef {object} TprOptions
   * @property {string} triggerSource - The trigger source, allowed values are attacker or target.
   * @property {boolean} ignoreSelf - Flag to indicate if the owner beeing a target, can trigger the reaction or not.
   * @property {boolean} canSee - Flag to indidate if the owner must see the trigger source or not.
   * @property {boolean} pre - Flag to indicate if a pre macro most be called before prompting for reactions.
   * @property {boolean} post - Flag to indicate if a post macro most be called after prompting for reactions.
   *
   */
  /**
   * Token third party reactions info.
   * @typedef {object} TokenReactionsInfo
   * @property {ReactionData[]} reactions - List of reaction data associated to a token.
   * @property {boolean} canSeeAttacker - Flag to indicate of the owner of the reaction canSee the attacker.
   * @property {Map<Token5e, boolean>} canSeeTargets - Map of flags mapped by token to indicate if the owner of the reaction canSee a target.
   */

  /**
   * Token Third party reaction data.
   * @typedef {object} ReactionData
   * @property {Token5e} token - The token having the third party reaction.
   * @property {Item5e} item - The third party reaction item.
   * @property {Activity[]} activities - The third party reaction activities.
   * @property {Activity[]} allowedActivities - The third party reaction activities allowed for the current trigger,
   *                                            this is overwritten at each trigger execution.
   * @property {string} macroName - The name of the macro or function to be called for pre/post macros.
   * @property {string} targetOnUse - The target on use that triggers this reaction.
   * @property {string} triggerSource - The trigger source, allowed values are attacker or target.
   * @property {boolean} canSee - Flag to indidate if the owner must see the trigger source or not.
   * @property {boolean} ignoreSelf - Flag to indicate if the owner beeing a target, can trigger the reaction or not.
   * @property {boolean} preMacro - Flag to indicate if a pre macro most be called before prompting for reactions.
   * @property {boolean} postMacro - Flag to indicate if a post macro most be called after prompting for reactions.
   */

  const dependencies = ['midi-qol'];
  if (
    requirementsSatisfied(MACRO_NAME, dependencies) &&
    foundry.utils.isNewerVersion(
      game.modules.get('midi-qol')?.version,
      '12.4.9'
    )
  ) {
    depReqFulfilled = true;

    // Set a version to facilitate dependency check
    exportIdentifier('elwinHelpers.version', VERSION);

    setHook('midi-qol.postStart', 'handlePostStart', handlePostStart);
    setHook(
      'midi-qol.preValidateRoll',
      'handlePreValidateRollId',
      handlePreValidateRoll
    );
    setHook(
      'midi-qol.preAttackRoll',
      'handlePreAttackRollId',
      handlePreAttackRoll
    );
    setHook(
      'midi-qol.preCheckHits',
      'handlePreCheckHitsId',
      handlePreCheckHits
    );
    setHook('midi-qol.hitsChecked', 'handleHitsCheckedId', handleHitsChecked);
    setHook(
      'midi-qol.preDamageRoll',
      'handlePreDamageRollId',
      handlePreDamageRoll
    );
    setHook(
      'midi-qol.preTargetDamageApplication',
      'handlePreTargetDamageApplId',
      handlePreTargetDamageApplication
    );
    setHook(
      'midi-qol.preCheckSaves',
      'handlePreCheckSavesId',
      handlePreCheckSaves
    );
    setHook(
      'midi-qol.postCheckSaves',
      'handlePostCheckSavesId',
      handlePostCheckSaves
    );
    setHook(
      'midi-qol.dnd5ePreCalculateDamage',
      'handleMidiDnd5ePreCalculateDamageId',
      handleMidiDnd5ePreCalculateDamage
    );
    setHook(
      'midi-qol.dnd5eCalculateDamage',
      'handleMidiDnd5eCalculateDamageId',
      handleMidiDnd5eCalculateDamage
    );
    exportIdentifier('elwinHelpers.isDebugEnabled', isDebugEnabled);
    exportIdentifier('elwinHelpers.setDebugEnabled', setDebugEnabled);

    // Note: keep this name to be backward compatible
    exportIdentifier('elwinHelpers.getTargetDivs', getTargetDivs);
    exportIdentifier('elwinHelpers.hasItemProperty', hasItemProperty);
    exportIdentifier('elwinHelpers.reduceAppliedDamage', reduceAppliedDamage);
    exportIdentifier(
      'elwinHelpers.calculateAppliedDamage',
      calculateAppliedDamage
    );
    exportIdentifier(
      'elwinHelpers.insertTextIntoMidiItemCard',
      insertTextIntoMidiItemCard
    );
    exportIdentifier(
      'elwinHelpers.requirementsSatisfied',
      requirementsSatisfied
    );
    exportIdentifier('elwinHelpers.selectTargetsWithinX', selectTargetsWithinX);
    exportIdentifier(
      'elwinHelpers.isRangedAttackActivity',
      isRangedAttackActivity
    );
    exportIdentifier(
      'elwinHelpers.isRangedWeaponAttackActivity',
      isRangedWeaponAttackActivity
    );
    exportIdentifier('elwinHelpers.isRangedAttack', isRangedAttack);
    exportIdentifier('elwinHelpers.isRangedWeaponAttack', isRangedWeaponAttack);
    exportIdentifier(
      'elwinHelpers.isMeleeAttackActivity',
      isMeleeAttackActivity
    );
    exportIdentifier(
      'elwinHelpers.isMeleeWeaponAttackActivity',
      isMeleeWeaponAttackActivity
    );
    exportIdentifier('elwinHelpers.isMeleeAttack', isMeleeAttack);
    exportIdentifier('elwinHelpers.isMeleeWeaponAttack', isMeleeWeaponAttack);
    exportIdentifier('elwinHelpers.isMidiHookStillValid', isMidiHookStillValid);
    exportIdentifier('elwinHelpers.getTokenName', getTokenName);
    exportIdentifier('elwinHelpers.getActorSizeValue', getActorSizeValue);
    exportIdentifier('elwinHelpers.getSizeValue', getSizeValue);
    exportIdentifier('elwinHelpers.buttonDialog', buttonDialog);
    exportIdentifier('elwinHelpers.remoteButtonDialog', remoteButtonDialog);
    exportIdentifier('elwinHelpers.getAttackSegment', getAttackSegment);
    exportIdentifier(
      'elwinHelpers.getMoveTowardsPosition',
      getMoveTowardsPosition
    );
    exportIdentifier(
      'elwinHelpers.findMovableSpaceNearDest',
      findMovableSpaceNearDest
    );
    exportIdentifier(
      'elwinHelpers.convertCriticalToNormalHit',
      convertCriticalToNormalHit
    );
    exportIdentifier(
      'elwinHelpers.adjustAttackRollTargetAC',
      adjustAttackRollTargetAC
    );
    exportIdentifier('elwinHelpers.getDamageRollOptions', getDamageRollOptions);
    exportIdentifier(
      'elwinHelpers.getMidiOnSavePropertyName',
      getMidiOnSavePropertyName
    );
    exportIdentifier(
      'elwinHelpers.getAppliedEnchantments',
      getAppliedEnchantments
    );
    exportIdentifier(
      'elwinHelpers.deleteAppliedEnchantments',
      deleteAppliedEnchantments
    );
    exportIdentifier(
      'elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll',
      disableManualEnchantmentPlacingOnUsePreItemRoll
    );
    exportIdentifier(
      'elwinHelpers.getEquippedMeleeWeapons',
      getEquippedMeleeWeapons
    );

    // Note: classes need to be exported after they are declared...

    registerRemoteFunctions();
  }

  /**
   * Returns the debug flag value. When true, items made by Elwin will output debug info.
   * @returns {boolean} the current debug flag value.
   */
  function isDebugEnabled() {
    return debug;
  }

  /**
   * Sets the debug flag value.
   * @param {boolean} Enabled - The new debug flag value.
   */
  function setDebugEnabled(enabled) {
    debug = enabled;
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

  /**
   * Removes the previous hook is defined and register a new hook if the macro is active.
   *
   * @param {string} hookName the name of the hook event on which to register the function.
   * @param {string} hookNameId the name of the hook, used for saving a reference to the registered hook.
   * @param {function} hookFunction the function to register on the hook event.
   */
  function setHook(hookName, hookNameId, hookFunction) {
    const hookId = foundry.utils.getProperty(
      globalThis,
      `${MACRO_NAME}.${hookNameId}`
    );
    if (hookId) {
      Hooks.off(hookName, hookId);
    }
    if (active) {
      foundry.utils.setProperty(
        globalThis,
        `${MACRO_NAME}.${hookNameId}`,
        Hooks.on(hookName, hookFunction)
      );
    }
  }

  /**
   * Removes a previously exported function or variable and exports the specifed function or variable if the macro is active.
   *
   * @param {string} exportedIdentifierName the name of the exported function.
   * @param {function} exportedValue the function or variable to export.
   */
  function exportIdentifier(exportedIdentifierName, exportedValue) {
    if (foundry.utils.getProperty(globalThis, exportedIdentifierName)) {
      const lastIndex = exportedIdentifierName.lastIndexOf('.');
      if (lastIndex < 0) {
        delete globalThis[exportedIdentifierName];
      } else {
        delete foundry.utils.getProperty(
          globalThis,
          exportedIdentifierName.substring(0, lastIndex)
        )[exportedIdentifierName.substring(lastIndex + 1)];
      }
    }
    if (active) {
      foundry.utils.setProperty(
        globalThis,
        exportedIdentifierName,
        exportedValue
      );
    }
  }

  /**
   * Registers all the third party reactions from all the current tokens on the scene.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePostStart(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePostStart.`, workflow);
    }
    for (let token of game.canvas.tokens.placeables) {
      const actorOnUseMacros = foundry.utils.getProperty(
        token.actor ?? {},
        'flags.midi-qol.onUseMacroParts'
      );
      if (!actorOnUseMacros) {
        // Skip this actor does not have any on use macros
        continue;
      }
      await registerThirdPartyReactions(
        workflow,
        token,
        actorOnUseMacros.items.filter((m) => m.option.startsWith('tpr.'))
      );
    }
  }

  /**
   * Triggers isTargeted third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreValidateRoll(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreValidateRoll.`, workflow);
    }

    await handleThirdPartyReactions(workflow, ['isTargeted']);
  }

  /**
   * Triggers isPreAttacked third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreAttackRoll(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreAttackRoll.`, workflow);
    }

    await handleThirdPartyReactions(workflow, ['isPreAttacked']);
  }

  /**
   * Triggers isAttacked third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {object} options - Options passed by midi qol.
   */
  async function handlePreCheckHits(workflow, options) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreCheckHits.`, {
        workflow,
        options,
      });
    }

    await handleThirdPartyReactions(workflow, ['isAttacked'], options);
  }

  /**
   * Triggers isHit and isMissed third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {object} options - Options passed by midi qol.
   */
  async function handleHitsChecked(workflow, options) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handleHitsChecked.`, { workflow, options });
    }

    await handleThirdPartyReactions(workflow, ['isHit', 'isMissed'], options);
  }

  /**
   * Triggers isPreDamaged third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreDamageRoll(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreDamageRoll.`, workflow);
    }

    await handleThirdPartyReactions(workflow, ['isPreDamaged']);
  }

  /**
   * Triggers isDamaged or isHealed third party reactions.
   *
   * @param {Token5e} target - The target that is damaged/healed.
   * @param {object} options - Options passed by midi qol.
   */
  async function handlePreTargetDamageApplication(target, options) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreTargetDamageApplication.`, {
        target,
        options,
      });
    }
    let appliedDamage = options?.damageItem?.appliedDamage;
    if (!appliedDamage) {
      // compute total damage applied to target
      appliedDamage = options?.damageItem?.damageDetail.reduce(
        (total, d) =>
          (total += ['temphp', 'midi-none'].includes(d.type) ? 0 : d.value),
        0
      );
      appliedDamage =
        appliedDamage > 0
          ? Math.floor(appliedDamage)
          : Math.ceil(appliedDamage);
    }

    if (
      options?.damageItem &&
      appliedDamage !== 0 &&
      (options.workflow.hitTargets.has(target) ||
        options.workflow.hitTargetsEC.has(target) ||
        options.workflow.saveItem.hasSave)
    ) {
      // Set our own total damage to make sure it is available, currently midi does not provide a total of the non RAW damage
      options.damageItem.elwinHelpersEffectiveDamage = appliedDamage;
      const conditionAttr = 'workflow.damageItem?.elwinHelpersEffectiveDamage';
      if (appliedDamage > 0) {
        await handleThirdPartyReactions(options.workflow, ['isDamaged'], {
          item: options?.item,
          target,
          extraActivationCond: `${conditionAttr} > 0`,
        });
      } else {
        await handleThirdPartyReactions(options.workflow, ['isHealed'], {
          item: options?.item,
          target,
          extraActivationCond: `${conditionAttr} < 0`,
        });
      }
    }
  }

  /**
   * Triggers isPreCheckSave third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreCheckSaves(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreCheckSaves.`, { workflow });
    }

    await handleThirdPartyReactions(workflow, ['isPreCheckSave']);
  }

  /**
   * Handles the midi pre calculate damage hook event to cleanup any custom damage details before computing damage.
   *
   * @param {Actor5e} actor - The actor being damaged.
   * @param {DamageDescription[]} damages - Damage descriptions.
   * @param {DamageApplicationOptions} options - Additional damage application options.
   * @returns {boolean} Explicitly return `false` to prevent damage application.
   *
   */
  function handleMidiDnd5ePreCalculateDamage(actor, damages, options) {
    // Remove any custom damage prevention
    while (
      damages.find((di, idx) => {
        if (di.type === 'none' && di.active?.DP) {
          damages.splice(idx, 1);
          return true;
        }
        return false;
      })
    );
  }

  /**
   * Handles the midi calculate damage hook event to process damagePrevention option.
   *
   * @param {Actor5e} actor - The actor being damaged.
   * @param {DamageDescription[]} damages - Damage descriptions.
   * @param {DamageApplicationOptions} options - Additional damage application options.
   * @returns {boolean} Explicitly return `false` to prevent damage application.
   */
  function handleMidiDnd5eCalculateDamage(actor, damages, options) {
    if (!(options.elwinHelpers?.damagePrevention > 0)) {
      // No damage prevention or not valid
      return true;
    }
    const totalDamage = damages.reduce(
      (total, damage) =>
        (total += ['temphp', 'midi-none'].includes(damage.type)
          ? 0
          : damage.value),
      0
    );
    if (totalDamage <= 0) {
      // No damage to prevent, do nothing
      return true;
    }
    const damagePrevention = Math.min(
      options.elwinHelpers.damagePrevention,
      totalDamage
    );
    if (damagePrevention) {
      damages.push({
        type: 'none',
        value: -damagePrevention,
        active: { DP: true, multiplier: 1 },
        properties: new Set(),
      });
    }
    return true;
  }

  /**
   * Triggers isPostCheckSave third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePostCheckSaves(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePostCheckSaves.`, { workflow });
    }

    await handleThirdPartyReactions(workflow, ['isPostCheckSave']);
  }

  /**
   * Returns the reaction flavor for the reaction dialog.
   * @param {object} data - The parameters for the reaction flavor.
   * @param {User} data.user - The user to which the reaction dialog will be displayed.
   * @param {string} data.reactionTriggerName - Name of the TargetOnUse macroPass on which the reaction that was triggered.
   * @param {Token5e} data.triggerToken - The token which initiated the third party reaction, usually the target of an attack (options.token).
   * @param {Item5e} data.triggerItem - The item that triggered the reaction, usually the item used (workflow.item).
   * @param {Token5e} data.reactionToken - The token for which the reaction dialog will be displayed.
   * @param {Roll} data.roll - Current D20 roll (attack roll, saving throw or ability test).
   * @param {boolean|undefined} data.showReactionAttackRoll - Option of what detail of the roll should be shown for the reaction,
   *                                                          if undefined the midi setting is used.
   *
   * @returns {string} the flavor for the reaction trigger.
   */
  function getReactionFlavor(data) {
    const {
      user,
      reactionTriggerName,
      triggerToken,
      triggerItem,
      reactionToken,
      roll,
      showReactionAttackRoll,
    } = data;

    let reactionFlavor = 'Unknow reaction trigger!';
    switch (reactionTriggerName) {
      case 'isPreAttacked':
      case 'preAttack':
        reactionFlavor =
          '{actorName} is about to be attacked by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isAttacked':
        reactionFlavor =
          '{actorName} is attacked by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isPreDamaged':
        reactionFlavor =
          '{actorName} is about to be damaged by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isDamaged':
      case 'preTargetDamageApplication':
        reactionFlavor =
          '{actorName} is damaged by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isHealed':
        reactionFlavor =
          '{actorName} is healed by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isTargeted':
      case 'prePreambleComplete':
        reactionFlavor =
          '{actorName} is targeted by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isMissed':
        reactionFlavor =
          '{actorName} is missed by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isCriticalHit':
        reactionFlavor =
          '{actorName} is critically hit by {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isFumble':
        reactionFlavor =
          '{actorName} is attacked by {itemName} which fumbled and {reactionActorName} can use a reaction';
        break;
      case 'preTargetSave':
      case 'isAboutToSave':
      case 'isPreCheckSave':
      case 'isPostCheckSave':
        reactionFlavor =
          '{actorName} must save because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isSaveSuccess':
        reactionFlavor =
          '{actorName} succeeded on a save because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isSaveFailure':
        reactionFlavor =
          '{actorName} failed on a save because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isMoved':
        reactionFlavor =
          '{actorName} is moved and {reactionActorName} can use a reaction';
        break;
      case 'postTargetEffectApplication':
        reactionFlavor =
          '{actorName} has been applied effects because of {itemName} and {reactionActorName} can use a reaction';
        break;
      case 'isHit':
      default:
        reactionFlavor =
          '{actorName} is hit by {itemName} and {reactionActorName} can use a reaction';
        break;
    }
    reactionFlavor = game.i18n.format(reactionFlavor, {
      itemName: triggerItem?.name ?? 'unknown',
      actorName: getTokenPlayerName(user, triggerToken, user?.isGM),
      reactionActorName: reactionToken?.name ?? 'unknown',
    });

    //{none: 'Attack Hits', d20: 'd20 roll only', all: 'Attack Roll Total', allCrit: 'Attack Roll Total + Critical'}
    if (
      ['isHit', 'isMissed', 'isCrit', 'isFumble', 'isAttacked'].includes(
        reactionTriggerName
      )
    ) {
      const showAttackRoll =
        showReactionAttackRoll ??
        MidiQOL.configSettings().showReactionAttackRoll;
      const rollOptions = getI18nOptions('ShowReactionAttackRollOptions');
      switch (showAttackRoll) {
        case 'all':
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.all} ${
            roll?.total ?? ''
          }</h4>`;
          break;
        case 'allCrit': {
          const criticalString = roll?.isCritical
            ? `<span style="color: green">(${getI18n('DND5E.Critical')})</span>`
            : '';
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.all} ${
            roll?.total ?? ''
          } ${criticalString}</h4>`;
          break;
        }
        case 'd20': {
          const theRoll = roll?.terms[0]?.results
            ? roll.terms[0].results.find((r) => r.active)?.result ??
              roll.terms[0]?.total
            : roll?.terms[0]?.total ?? '';
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.d20} ${theRoll}</h4>`;
          break;
        }
        default:
      }
    }
    if (['isPostCheckSave'].includes(reactionTriggerName)) {
      // Note: we use the same config as the attack to determine is the TPR owner can see of the Roll.
      const showAttackRoll =
        showReactionAttackRoll ??
        MidiQOL.configSettings().showReactionAttackRoll;
      const rollOptions = getI18nOptions('ShowReactionAttackRollOptions');
      switch (showAttackRoll) {
        case 'all':
        case 'allCrit':
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.all} ${
            roll?.total ?? ''
          }</h4>`;
          break;
        case 'd20': {
          const theRoll = roll?.terms[0]?.results
            ? roll.terms[0].results.find((r) => r.active)?.result ??
              roll.terms[0]?.total
            : roll?.terms[0]?.total ?? '';
          reactionFlavor = `<h4>${reactionFlavor} - ${rollOptions.d20} ${theRoll}</h4>`;
          break;
        }
        default:
      }
    }

    return reactionFlavor;
  }

  /**
   * Handles third party reactions for the specied triggers.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {string[]} triggerList - List of reaction triggers needing to be handled.
   * @param {object} options - Options to override some defaults or change the execution behavior.
   */
  async function handleThirdPartyReactions(workflow, triggerList, options) {
    options ??= workflow?.options;
    if (
      !workflow ||
      !(MidiQOL.configSettings().allowUseMacro && !options.noTargetOnuseMacro)
    ) {
      return;
    }

    for (let trigger of triggerList) {
      // Add Third Party Reactions trigger prefix
      trigger = 'tpr.' + trigger;
      for (let tokenUuid of Object.keys(workflow.thirdPartyReactions ?? {})) {
        const tokenReactionsInfo = workflow.thirdPartyReactions[tokenUuid];
        await handleThirdPartyReactionsForToken(
          workflow,
          trigger,
          tokenUuid,
          tokenReactionsInfo,
          options
        );
      }
    }
  }

  /**
   * Handles the evaluation and execution of reactions, if the conditions are met, associated to the specified token uuid.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {string} trigger - The current trigger for which to evaluate possible reaction executions.
   * @param {string} reactionTokenUuid - The token uuid of the reaction's owner.
   * @param {TokenReactionsInfo} tokenReactionsInfo - Contains the reactions info associated to the reaction token uuid.
   * @param {object} options - Options used for the evaluation and execution of the third party reactions.
   */
  async function handleThirdPartyReactionsForToken(
    workflow,
    trigger,
    reactionTokenUuid,
    tokenReactionsInfo,
    options = {}
  ) {
    // TODO filter out all activities for the same item?
    let filteredReactions = tokenReactionsInfo.reactions.filter(
      (reactionData) =>
        trigger === reactionData.targetOnUse &&
        reactionData.item.uuid !== workflow.itemUuid
    );
    if (!filteredReactions.length) {
      return;
    }

    const reactionToken = fromUuidSync(reactionTokenUuid)?.object;
    if (!reactionToken) {
      console.warn(
        `${MACRO_NAME} | Missing reaction token.`,
        reactionTokenUuid
      );
      return;
    }

    const reactionActor = reactionToken.actor;
    if (!reactionActor?.flags) {
      console.warn(
        `${MACRO_NAME} | Missing reaction actor or actor flags.`,
        reactionToken
      );
      return;
    }

    if (MidiQOL.checkRule('incapacitated')) {
      if (MidiQOL.checkIncapacitated(reactionActor)) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | Actor is incapacitated.`,
            reactionActor
          );
        }
        return;
      }
    }

    // Copied from midi-qol because this utility function is not exposed
    function getReactionSetting(user) {
      if (!user) {
        return 'none';
      }
      return user.isGM
        ? MidiQOL.configSettings().gmDoReactions
        : MidiQOL.configSettings().doReactions;
    }

    // If the target is associated to a GM user roll item in this client, otherwise send the item roll to user's client
    let player = MidiQOL.playerForActor(reactionActor);
    if (getReactionSetting(player) === 'none') {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Reaction settings set to none for player.`,
          player
        );
      }
      return;
    }

    if (!player?.active) {
      // Find first active GM player
      player = game.users?.activeGM;
    }
    if (!player?.active) {
      console.warn(
        `${MACRO_NAME} | No active player or GM for actor.`,
        reactionActor
      );
      return;
    }

    const regTrigger = trigger.replace('tpr.', '');
    const maxLevel = maxReactionCastLevel(reactionActor);
    const reactionUsed = MidiQOL.hasUsedReaction(reactionActor);
    filteredReactions = filteredReactions.filter((reactionData) =>
      itemReaction(reactionData.item, regTrigger, maxLevel, reactionUsed)
    );
    if (!filteredReactions.length) {
      return;
    }

    let targets;
    let triggerItem = workflow.item;
    let roll = workflow.attackRoll;

    switch (regTrigger) {
      case 'isHealed':
      case 'isDamaged':
        targets = options.target ? [options.target] : [];
        break;
      case 'isHit':
      case 'isPreDamaged':
      case 'isPreCheckSave':
      case 'isPostCheckSave':
        targets = [...workflow.hitTargets, ...workflow.hitTargetsEC];
        break;
      case 'isMissed':
        targets = [
          ...workflow.targets
            .difference(workflow.hitTargets)
            .difference(workflow.hitTargetsEC),
        ];
        break;
      case 'isTargeted':
      case 'isPreAttacked':
      case 'isAttacked':
      default:
        targets = [...workflow.targets];
        break;
    }
    // TODO
    //if (["preTargetSave"???, "isAboutToSave", "isSaveSuccess", "isSaveFailure"].includes(regTrigger)) {
    //  triggerItem = workflow.saveItem;
    //}

    let first = true;
    for (let target of targets) {
      // Check each call after first in case the the status changed or the reaction was used
      if (!first) {
        if (
          MidiQOL.checkRule('incapacitated') &&
          MidiQOL.checkIncapacitated(reactionActor)
        ) {
          if (debug) {
            console.warn(
              `${MACRO_NAME} | Actor is incapacitated.`,
              reactionActor
            );
          }
          return;
        }

        const reactionUsed = MidiQOL.hasUsedReaction(reactionActor);
        filteredReactions = filteredReactions.filter((reactionData) =>
          itemReaction(reactionData.item, regTrigger, maxLevel, reactionUsed)
        );
        if (!filteredReactions.length) {
          return;
        }
      }
      if (['isPostCheckSave'].includes(regTrigger)) {
        roll = workflow.saveRolls?.find(
          (r) => r.data.tokenUuid === target.document.uuid
        );
      }
      filteredReactions = filteredReactions
        .map((reactionData) => {
          reactionData.allowedActivities = reactionData.activities.filter(
            (activity) =>
              canTriggerReactionActivity(
                workflow,
                triggerItem,
                reactionToken,
                tokenReactionsInfo,
                target,
                reactionData,
                activity,
                options
              )
          );
          return reactionData.allowedActivities.length
            ? reactionData
            : undefined;
        })
        .filter((d) => d);
      await callReactionsForToken(
        workflow,
        reactionToken,
        player,
        trigger,
        target,
        filteredReactions,
        roll,
        options
      );
      first = false;
    }
  }

  /**
   * Validates if a reaction should be triggered. Some of the validation are the range and disposition between the reaction owner's
   * and the trigger source, and the reaction activation condition.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {Item5e} triggerItem - The item that triggered a possible reaction.
   * @param {Token5e} reactionToken - The token of the reaction's owner.
   * @param {TokenReactionsInfo} tokenReactionsInfo - Contains the reactions info associated to the reaction token uuid.
   * @param {Token5e} target - The target of the trigger item.
   * @param {ReactionData} reactionData - The reaction data of the possible reaction.
   * @param {Activity} actibity - The activity from the reaction data to test.
   * @param {object} options - Options that can be used in the different validations.
   * @param {string} options.extraActivationCond - Extra activation condition to be evaluated.
   *
   * @returns {boolean} true if the reaction can be triggered, false otherwise.
   */
  function canTriggerReactionActivity(
    workflow,
    triggerItem,
    reactionToken,
    tokenReactionsInfo,
    target,
    reactionData,
    activity,
    options = {}
  ) {
    const self = reactionToken.document.uuid === target.document.uuid;

    // Check self condition
    if (reactionData.ignoreSelf && self) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | canTriggerReaction- ${reactionData.item.name}: self not allowed.`
        );
      }
      return false;
    }

    const triggerToken =
      reactionData.triggerSource === 'attacker' ? workflow.token : target;

    // Check allowed disposition condition
    let allowedDisposition;
    const disposition = getReactionDisposition(activity);
    if (disposition) {
      allowedDisposition = reactionToken.document.disposition * disposition;
    }
    if (
      disposition &&
      allowedDisposition !== triggerToken.document.disposition
    ) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | canTriggerReactionActivity - ${reactionData.item.name}-${activity.name}: disposition not allowed.`,
          {
            allowedDisposition,
            triggerTokenDisp: triggerToken.document.disposition,
          }
        );
      }
      return false;
    }

    // Check range condition
    const range = getReactionRange(activity);
    if (range) {
      const tmpDist = MidiQOL.computeDistance(reactionToken, triggerToken, {
        wallsBlock: range.wallsBlock,
      });
      if (tmpDist < 0 || tmpDist > range.value) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${activity.name}: invalid distance.`,
            {
              distance: tmpDist,
              allowedDistance: range,
            }
          );
        }
        return false;
      }
    }

    // Check visibility condition
    // Cache canSee results in reactionsInfo
    let canSeeTriggerSource;
    if (reactionData.triggerSource === 'attacker') {
      canSeeTriggerSource = tokenReactionsInfo.canSeeAttacker ??=
        MidiQOL.canSee(reactionToken, workflow.token);
    } else {
      if (!tokenReactionsInfo.canSeeTargets?.has(target)) {
        (tokenReactionsInfo.canSeeTargets ??= new Map()).set(
          target,
          MidiQOL.canSee(reactionToken, target)
        );
      }
      canSeeTriggerSource = tokenReactionsInfo.canSeeTargets.get(target);
    }

    if (!self && reactionData.canSee && !canSeeTriggerSource) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${activity.name}: can't see trigger token.`
        );
      }
      return false;
    }

    const reactionCondition = activity.reactionCondition;
    if (!reactionCondition && !options?.extraActivationCond) {
      return true;
    }

    const extraData = {
      reaction: reactionData.targetOnUse,
      tpr: {
        item: reactionData.item?.getRollData()?.item ?? {},
        activity,
        actor: reactionToken?.actor.getRollData() ?? {},
        actorId: reactionToken?.actor?.id,
        actorUuid: reactionToken?.actor?.uuid,
        tokenId: reactionToken?.id,
        tokenUuid: reactionToken?.document.uuid,
        canSeeTriggerSource,
        get isMeleeAttackActivity() {
          return isMeleeAttackActivity(workflow.attackMode, workflow.activity);
        },
        get isMeleeWeaponAttackActivity() {
          return isMeleeWeaponAttackActivity(
            workflow.attackMode,
            workflow.activity
          );
        },
        get isRangedAttackActivity() {
          return isRangedAttackActivity(workflow.attackMode, workflow.activity);
        },
        get isRangedWeaponAttackActivity() {
          return isRangedWeaponAttackActivity(
            workflow.attackMode,
            workflow.activity
          );
        },
        get isMeleeAttack() {
          return isMeleeAttack(workflow.item, workflow.token, target);
        },
        get isMeleeWeaponAttack() {
          return isMeleeWeaponAttack(workflow.item, workflow.token, target);
        },
        get isRangedAttack() {
          return isRangedAttack(workflow.item, workflow.token, target);
        },
        get isRangedWeaponAttack() {
          return isRangedWeaponAttack(workflow.item, workflow.token, target);
        },
      },
    };

    // Check extra activation condition for this trigger
    if (options?.extraActivationCond) {
      const returnValue = evalReactionActivationCondition(
        workflow,
        options.extraActivationCond,
        target,
        {
          item: triggerItem,
          extraData,
        }
      );
      if (!returnValue) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${activity.name}: extra activation condition not met.`,
            {
              extraActivationCond: options.extraActivationCond,
            }
          );
        }
        return false;
      }
    }

    // Check reaction activation condition
    if (reactionCondition) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | Filter reaction for ${reactionToken.name} ${reactionData.item.name}-${activity.name} using condition ${reactionCondition}`,
          { extraData }
        );
      }

      if (
        !evalReactionActivationCondition(workflow, reactionCondition, target, {
          item: triggerItem,
          extraData,
        })
      ) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${activity.name}: reaction condition not met.`,
            reactionCondition
          );
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the disposition if any found for the specified activity.
   *
   * @param {Activity} activity - The activity for which to retrieve the disposition.
   *
   * @returns {number} the relative disposition compared to the trigger source.
   */
  function getReactionDisposition(activity) {
    const targetType = foundry.utils.getProperty(
      activity,
      'target.affects.type'
    );
    if (targetType === 'ally') {
      return CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    } else if (targetType === 'enemy') {
      return CONST.TOKEN_DISPOSITIONS.HOSTILE;
    }
    return undefined;
  }

  /**
   * Returns the range data if any found for the specified activity.
   *
   * @param {Activity} activity - The activity for which to retrieve the range.
   *
   * @returns {{value: number, wallsBlock: {boolean}}} range data for the specified activity,
   * the data is composed of a value which is the range and wallsBlock, a boolean to indicate
   * if walls should block or not the distance computation.
   */
  function getReactionRange(activity) {
    const range = {};
    range.value = getRangeFromActivity(activity);
    range.wallsBlock = !foundry.utils.getProperty(
      activity.item,
      'flags.midiProperties.ignoreTotalCover'
    );

    return range?.value !== undefined || range?.value == null
      ? range
      : undefined;
  }

  /**
   * Returns the range data if any found for the specified activity.
   *
   * Note: the code was inspired from the checkRange function from midi-qol utils.ts.
   *
   * @param {Activity} activity - The activity for which to retrieve the range data.
   *
   * @returns {number} range for the specified activity converted in the canvas scene grid units if possible,
   */
  function getRangeFromActivity(activity) {
    if (
      activity?.range?.value === null ||
      activity?.range?.value === undefined
    ) {
      return undefined;
    }
    let range = activity.range.value;
    if (activity.range.units) {
      switch (activity.range.units) {
        case 'mi': // miles - assume grid units are feet or miles - ignore furlongs/chains whatever
          if (
            ['feet', 'ft'].includes(
              canvas?.scene?.grid.units?.toLocaleLowerCase()
            )
          ) {
            range *= 5280;
          } else if (
            ['yards', 'yd', 'yds'].includes(
              canvas?.scene?.grid.units?.toLocaleLowerCase()
            )
          ) {
            range *= 1760;
          }
          break;
        case 'km': // kilometeres - assume grid units are meters or kilometers
          if (
            ['meter', 'm', 'meters', 'metre', 'metres'].includes(
              canvas?.scene?.grid.units?.toLocaleLowerCase()
            )
          ) {
            range *= 1000;
          }
          break;
        // "none" "self" "ft" "m" "any" "spec":
        default:
          break;
      }
    }
    return range;
  }

  /**
   * Evaluates a reaction activation condition.
   *
   * @param {MidiQOL.Workflow} workflow - the current MidiQOL workflow.
   * @param {string} condition - the condition to evaluate.
   * @param {Token5e} target - the target
   * @param {object} options - options for the condition evaluation.
   *
   * @returns {boolean} true if the condition evaluates to true, false otherwise.
   */
  function evalReactionActivationCondition(
    workflow,
    condition,
    target,
    options = {}
  ) {
    if (options.errorReturn === undefined) {
      options.errorReturn = false;
    }
    return evalActivationCondition(workflow, condition, target, options);
  }

  /**
   * Evaluates an activation condition.
   *
   * @param {MidiQOL.Workflow} workflow - the current MidiQOL workflow.
   * @param {string} condition - the condition to evaluate.
   * @param {Token5e} target - the target
   * @param {object} options - options for the condition evaluation.
   *
   * @returns {boolean} true if the condition evaluates to true, false otherwise.
   */
  function evalActivationCondition(workflow, condition, target, options = {}) {
    if (condition === undefined || condition === '') {
      return true;
    }
    MidiQOL.createConditionData({
      workflow,
      target,
      actor: workflow.actor,
      extraData: options?.extraData,
      item: options.item,
    });
    options.errorReturn ??= true;
    const returnValue = MidiQOL.evalCondition(
      condition,
      workflow.conditionData,
      options
    );
    return returnValue;
  }

  /**
   * Returns the disposition value for the specified disposition string.
   *
   * @param {string} disposition - the disposition to convert to its value.
   *
   * @returns {number} the disposition value.
   */
  function getDispositionFor(disposition) {
    if (/^-?\d+$/.test(disposition)) {
      return Number(disposition);
    }
    switch (disposition.toLocaleLowerCase()) {
      case 'SECRET'.toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.SECRET;
      case 'HOSTILE'.toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.HOSTILE;
      case 'NEUTRAL'.toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.NEUTRAL;
      case 'FRIENDLY'.toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      case 'all':
        return null;
    }
    const validStrings = [
      '-2',
      '-1',
      '0',
      '1',
      'FRIENDLY',
      'HOSTILE',
      'NEUTRAL',
      'SECRET',
      'all',
    ];
    throw new Error(
      `${MACRO_NAME} | Disposition ${disposition} is invalid. Disposition must be one of "${validStrings}"`
    );
  }

  /**
   * Calls MidiQOL remote chooseReactions for a token having third party reactions for the trigger.
   * Calls the associated pre macro if defined for each triggered reaction, then calls the remote chooseReactions and
   * finally calls the associated post macro if defined.
   *
   * @param {MidiQOL.Workflow} workflow - the current MidiQOL workflow.
   * @param {Toke5e} reactionToken - the token having third party reactions.
   * @param {User} user - the user associated to the reaction token, or the GM is none active.
   * @param {string} reactionTrigger - the third party reaction trigger.
   * @param {Token5e} target - the target of the third party reaction trigger.
   * @param {ReactionData[]} reactions - list of reaction data with their allowed activities from which the reaction token can choose to activate.
   * @param {Roll} roll - The D20 roll of the attack, saving throw or ability test.
   * @param {object} options - options to pass to macros.
   */
  async function callReactionsForToken(
    workflow,
    reactionToken,
    user,
    reactionTrigger,
    target,
    reactions,
    roll,
    options = {}
  ) {
    if (!reactions?.length) {
      return;
    }
    const reactionsByTriggerSources = [];
    const reactionsByAttacker = reactions.filter(
      (reactionData) => reactionData.triggerSource === 'attacker'
    );
    if (reactionsByAttacker.length) {
      reactionsByTriggerSources.push(reactionsByAttacker);
    }
    const reactionsByTarget = reactions.filter(
      (reactionData) => reactionData.triggerSource === 'target'
    );
    if (reactionsByTarget.length) {
      reactionsByTriggerSources.push(reactionsByTarget);
    }
    // TODO HERE handle calling activities
    for (let reactionsByTriggerSource of reactionsByTriggerSources) {
      const triggerSource = reactionsByTriggerSource[0]?.triggerSource;
      const validReactionActivities = [];
      const preReactionOptions = foundry.utils.mergeObject(
        { actor: target.actor, token: target },
        options?.reactionOptions ?? {}
      );
      for (let reactionData of reactionsByTriggerSource) {
        try {
          // TODO allow return values to pass options to reaction?
          if (reactionData.macroName && reactionData.preMacro) {
            if (debug) {
              console.warn(
                `${MACRO_NAME} | calling Third Party Reaction pre macro.`,
                {
                  workflow,
                  reactionData,
                  reactionTrigger,
                  preReactionOptions,
                }
              );
            }
            preReactionOptions.thirdPartyReactionActivities =
              reactionData.allowedActivities.map((a) => a.uuid);

            let [result] = await workflow.callMacros(
              workflow.item,
              reactionData.macroName,
              'TargetOnUse',
              reactionTrigger + '.pre',
              preReactionOptions
            );
            if (result?.skip) {
              if (result.activities?.length) {
                const toRemove = new Set(result.activities);
                validReactionActivities.push(
                  ...reactionData.allowedActivities.filter(
                    (a) => !toRemove.has(a)
                  )
                );
              }
            } else {
              validReactionActivities.push(...reactionData.allowedActivities);
            }
          } else {
            validReactionActivities.push(...reactionData.allowedActivities);
          }
        } catch (error) {
          console.error(`${MACRO_NAME} | error in preReaction.`, error);
        }
      }

      let result = { name: 'None', uuid: undefined };
      try {
        if (!validReactionActivities.length) {
          continue;
        }
        // Note: there is a bug in utils.js that put targetConfirmation but not at the workflowOptions level, remove when fixed (see reactionDialog)
        const reactionActivityUuids = validReactionActivities.map(
          (a) => a.uuid
        );
        const reactionOptions = foundry.utils.mergeObject(
          {
            itemUuid: options?.item?.uuid ?? workflow.itemUuid,
            thirdPartyReaction: {
              trigger: reactionTrigger,
              activityUuids: reactionActivityUuids,
            },
            workflowOptions: { targetConfirmation: 'none' },
          },
          options?.reactionOptions ?? {}
        );
        let reactionTargetUuid;
        foundry.utils.setProperty(
          reactionOptions.thirdPartyReaction,
          'triggerSource',
          triggerSource
        );
        if (triggerSource === 'attacker') {
          foundry.utils.setProperty(
            reactionOptions.thirdPartyReaction,
            'targetUuid',
            target.document.uuid
          );
          reactionTargetUuid = workflow.tokenUuid;
        } else {
          foundry.utils.setProperty(
            reactionOptions.thirdPartyReaction,
            'attackerUuid',
            workflow.tokenUuid
          );
          reactionTargetUuid = target.document.uuid;
        }

        const data = {
          tokenUuid: reactionToken.document.uuid,
          reactionActivityList: reactionActivityUuids,
          triggerTokenUuid: reactionTargetUuid,
          reactionFlavor: getReactionFlavor({
            user,
            reactionTriggerName: reactionTrigger.replace('tpr.', ''),
            triggerToken: target,
            triggerItem: workflow.item,
            reactionToken,
            roll,
          }),
          triggerType: 'reaction',
          options: reactionOptions,
        };

        result = await MidiQOL.socket().executeAsUser(
          'chooseReactions',
          user.id,
          data
        );
      } finally {
        const postReactionOptions = foundry.utils.mergeObject(
          {
            actor: target.actor,
            token: target,
            thirdPartyReactionResult: result,
          },
          options?.reactionOptions ?? {}
        );
        for (let reactionData of reactionsByTriggerSource) {
          try {
            if (reactionData.macroName && reactionData.postMacro) {
              if (debug) {
                console.warn(
                  `${MACRO_NAME} | calling Third Party Reaction post macro.`,
                  {
                    workflow,
                    reactionData,
                    reactionTrigger,
                    postReactionOptions,
                  }
                );
              }
              await workflow.callMacros(
                workflow.item,
                reactionData.macroName,
                'TargetOnUse',
                reactionTrigger + '.post',
                postReactionOptions
              );
            }
          } catch (error) {
            console.error(`${MACRO_NAME} | error in postReaction.`, error);
          }
        }
      }
    }
  }

  /**
   * Returns the token name that can be displayed for the specified user.
   * Note: Extended from MidiQOL to allow passing a user instead of taking game.user.
   *
   * @param {User} user - The user to which the token name will be displayed.
   * @param {Token5e} token - The token for which to display the name.
   * @param {boolean} checkGM - If true, indicate that a GM user should be shown the token.name.
   *
   * @returns {string} The token name to be displayed to the specified user.
   */
  function getTokenPlayerName(user, token, checkGM = false) {
    if (!token) {
      return game.user?.name;
    }
    let name = getTokenName(token);
    if (checkGM && user?.isGM) {
      return name;
    }
    if (game.modules.get('anonymous')?.active) {
      const api = game.modules.get('anonymous')?.api;
      return api.playersSeeName(token.actor) ? name : api.getName(token.actor);
    }
    return name;
  }

  /**
   * Returns a string containing two midi target divs, one to be displayed to GM and another one to be displayed to players.
   *
   * @param {Token5e} targetToken - The token for which to display the name.
   * @param {string} textTemplate - The text template which should contain the target variable (${tokenName}) to replaced by the proper one.
   *
   * @returns {string} Div texts for GM and non GM player.
   */
  function getTargetDivs(targetToken, textTemplate) {
    const gmText = textTemplate.replace(
      '${tokenName}',
      getTokenName(targetToken)
    );
    const targetName = MidiQOL.getTokenPlayerName(targetToken);
    const playerText = textTemplate.replace('${tokenName}', targetName);
    return `<div class="midi-qol-gmTokenName">${gmText}</div><div class="midi-qol-playerTokenName">${playerText}</div>`;
  }

  /**
   * Returns true if the item has the property.
   *
   * @param {Item5e} item - Item to test for a property
   * @param {string} propName - Name of the property to test.
   *
   * @returns {boolean} true if the item has the property, false otherwise.
   */
  function hasItemProperty(item, propName) {
    return item.system?.properties?.has(propName);
  }

  /**
   * Reduces the applied damage from the damageItem by preventedDmg.
   *
   * @param {object} damageItem - The MidiQOL damageItem to be updated.
   * @param {number} preventedDmg - The amount of damage prevented.
   * @param {Item5e} sourceItem - Source item of the damage prevention. (optional)
   */
  function reduceAppliedDamage(damageItem, preventedDmg, sourceItem) {
    if (!(preventedDmg > 0)) {
      // Only values greater than 0 are applied.
      console.warn(
        `${MACRO_NAME} | Only greater than 0 damage prevention is supported.`,
        {
          damageItem,
          preventedDmg,
          sourceItem,
        }
      );
      return;
    }
    const currentDamagePrevention =
      foundry.utils.getProperty(
        damageItem.calcDamageOptions,
        'elwinHelpers.damagePrevention'
      ) ?? 0;
    foundry.utils.setProperty(
      damageItem.calcDamageOptions,
      'elwinHelpers.damagePrevention',
      currentDamagePrevention + preventedDmg
    );
    const actor = fromUuidSync(damageItem.actorUuid);
    damageItem.damageDetail = actor?.calculateDamage(
      damageItem.rawDamageDetail,
      damageItem.calcDamageOptions
    );
    calculateAppliedDamage(damageItem);
    if (sourceItem && damageItem.details) {
      damageItem.details.push(`${sourceItem.name} - DP`);
    }
  }

  /**
   * Calculates the applied damage from the damageItem.
   *
   * @param {object} damageItem - The MidiQOL damageItem to be updated.
   */
  function calculateAppliedDamage(damageItem) {
    if (!damageItem) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Missing damaged item.`, { damageItem });
      }
      return;
    }
    let { amount, temp } = damageItem.damageDetail.reduce(
      (acc, d) => {
        if (d.type === 'temphp') acc.temp += d.value;
        else if (d.type !== 'midi-none') acc.amount += d.value;
        return acc;
      },
      { amount: 0, temp: 0 }
    );
    const actor = fromUuidSync(damageItem.actorUuid);
    const as = actor?.system;
    if (!as || !as.attributes.hp) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Missing damaged actor or hp attribute.`, {
          damageItem,
        });
      }
      return;
    }

    // Recompute damage
    amount = amount > 0 ? Math.floor(amount) : Math.ceil(amount);
    const deltaTemp = amount > 0 ? Math.min(damageItem.oldTempHP, amount) : 0;
    const deltaHP = Math.clamp(
      amount - deltaTemp,
      -as.attributes.hp.damage,
      damageItem.oldHP
    );
    damageItem.newHP = damageItem.oldHP - deltaHP;
    damageItem.hpDamage = deltaHP;
    damageItem.newTempHP = Math.floor(
      Math.max(0, damageItem.oldTempHP - deltaTemp, temp)
    );
    damageItem.tempDamage = damageItem.oldTempHP - damageItem.newTempHP;
    damageItem.elwinHelpersEffectiveDamage = amount;
    // TODO should this reflect raw or not???
    //damageItem.totalDamage = amount;
    if (foundry.utils.hasProperty(damageItem, 'appliedDamage')) {
      damageItem.appliedDamage = deltaHP;
    }
  }

  /**
   * Returns true if the attack is a ranged attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string} attackMode - The attack mode selected for the attack activity.
   * @param {Activity} activity - The activity used to attack.
   *
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isRangedAttackActivity(attackMode, activity) {
    return isRangedAttackActivityByType(null, attackMode, activity);
  }

  /**
   * Returns true if the attack is a ranged attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string} attackMode - The attack mode selected for the attack activity.
   * @param {Activity} activity - The activity used to attack.
   *
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isRangedWeaponAttackActivity(attackMode, activity) {
    return isRangedAttackActivityByType(
      ['simpleM', 'martialM', 'simpleR', 'martialR'],
      attackMode,
      activity
    );
  }

  /**
   * Returns true if the attack is ranged attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string[]|null} weaponTypes - Array of supported weapon types.
   * @param {string} attackMode - The attack mode selected for the attack activity.
   * @param {Activity} activity - The activity the used for the attack.
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isRangedAttackActivityByType(weaponTypes, attackMode, activity) {
    if (
      weaponTypes !== null &&
      !weaponTypes.includes(activity?.item?.system.type?.value)
    ) {
      return false;
    }
    if (activity?.type !== 'attack') {
      return false;
    }
    const attackType = activity.attack?.type?.value;
    return (
      attackType === 'ranged' ||
      (attackType === 'melee' &&
        hasItemProperty(activity.item, 'thr') &&
        attackMode?.startsWith('thrown'))
    );
  }

  /**
   * Returns true if the attack is a ranged attack. It also supports melee weapons with the thrown property.
   *
   * @param {Item5e} item - The item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged attack.
   */
  function isRangedAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isRangedAttackByType(
      null,
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is a ranged weapon attack that hit. It also supports melee weapons
   * with the thrown property.
   *
   * @param {Item5e} item - The item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged weapon attack that hit
   */
  function isRangedWeaponAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isRangedAttackByType(
      ['simpleM', 'martialM', 'simpleR', 'martialR'],
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is a ranged attack. It also supports melee weapons with the thrown property.
   *
   * @param {string[]|null} weaponTypes - Array of supported weapon types.
   * @param {Item5e} item - The item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged attack.
   */
  function isRangedAttackByType(
    weaponTypes,
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    if (
      weaponTypes !== null &&
      !weaponTypes.includes(item?.system.type?.value)
    ) {
      return false;
    }
    const activity = item?.system?.activities?.getByType('attack')?.[0];
    if (!activity) {
      return false;
    }

    const attackType = activity.attack?.type?.value;
    if (attackType === 'ranged') {
      return true;
    }
    if (!checkThrownWeapons) {
      return false;
    }
    if (attackType !== 'melee' || !hasItemProperty(item, 'thr')) {
      return false;
    }

    const distance = MidiQOL.computeDistance(sourceToken, targetToken, {
      wallsBlock: true,
    });
    // TODO check if distance if in ft, how to support creature with reach, or creatures with reach and thrown weapon?
    const meleeDistance = hasItemProperty(item, 'rch')
      ? item.range?.reach ?? 10
      : 5;
    return distance > meleeDistance;
  }

  /**
   * Returns true if the attack is a melee attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string} attackMode - The attack mode selected for the attack activity.
   * @param {Activity} activity - The activity used to attack.
   *
   * @returns {boolean} true if the attack is a melee weapon attack, false otherwise.
   */
  function isMeleeAttackActivity(attackMode, activity) {
    return isMeleeAttackActivityByType(null, attackMode, activity);
  }

  /**
   * Returns true if the attack is a melee attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string} attackMode - The attack mode selected for the attack activity.
   * @param {Activity} activity - The activity used to attack.
   *
   * @returns {boolean} true if the attack is a melee weapon attack, false otherwise.
   */
  function isMeleeWeaponAttackActivity(attackMode, activity) {
    return isMeleeAttackActivityByType(
      ['simpleM', 'martialM'],
      attackMode,
      activity
    );
  }

  /**
   * Returns true if the attack is ranged attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string[]|null} weaponTypes - Array of supported weapon types.
   * @param {string} attackMode - The attack mode selected for the attack activity.
   * @param {Activity} activity - The activity the used for the attack.
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isMeleeAttackActivityByType(weaponTypes, attackMode, activity) {
    if (
      weaponTypes !== null &&
      !weaponTypes.includes(activity?.item?.system.type?.value)
    ) {
      return false;
    }
    if (
      activity?.type !== 'attack' ||
      activity?.attack?.type?.value !== 'melee'
    ) {
      return false;
    }

    return !attackMode?.startsWith('thrown');
  }

  /**
   * Returns true if the attack was a successful melee attack. It also handle the case of
   * weapons with the thrown property on a target that is farther than melee distance.
   *
   * @param {Item5e} item - The item the item used to attack.
   * @param {Token5e} sourceToken - The source token.
   * @param {Token5e} targetToken - The target token.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack was a successful melee weapon attack, false otherwise.
   */
  function isMeleeAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isMeleeAttackByType(
      null,
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack was a successful melee weapon attack. It also handle the case of
   * weapons with the thrown property on a target that is farther than melee distance.
   *
   * @param {Item5e} item - The item the item used to attack.
   * @param {Token5e} sourceToken - The source token.
   * @param {Token5e} targetToken - The target token.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack was a successful melee weapon attack, false otherwise.
   */
  function isMeleeWeaponAttack(
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    return isMeleeAttackByType(
      ['simpleM', 'martialM'],
      item,
      sourceToken,
      targetToken,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack was a successful melee attack. It also handle the case of
   * weapons with the thrown property on a target that is farther than melee distance.
   *
   * @param {string[]|null} weaponTypes - Array of supported weapon types.
   * @param {Item5e} item - The item the used for the attack.
   * @param {Token5e} sourceToken - The source token.
   * @param {Token5e} targetToken - The target token.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   * @returns {boolean} true if the attack was a successful melee weapon attack, false otherwise.
   */
  function isMeleeAttackByType(
    weaponTypes,
    item,
    sourceToken,
    targetToken,
    checkThrownWeapons = true
  ) {
    if (
      weaponTypes !== null &&
      !weaponTypes.includes(item?.system.type?.value)
    ) {
      return false;
    }
    const activity = item?.system?.activities?.getByType('attack')?.[0];
    if (!activity) {
      return false;
    }

    const attackType = activity.attack?.type?.value;
    if (attackType !== 'melee') {
      return false;
    }

    if (!checkThrownWeapons) {
      return true;
    }

    if (!hasItemProperty(item, 'thr')) {
      return true;
    }

    const distance = MidiQOL.computeDistance(sourceToken, targetToken, {
      wallsBlock: true,
    });
    // TODO check if distance if in ft, how to support creature with reach, or creatures with reach and thrown weapon?
    const meleeDistance = hasItemProperty(item, 'rch')
      ? item.range?.reach ?? 10
      : 5;
    return distance >= 0 && distance <= meleeDistance;
  }

  /**
   * Selects all the tokens that are within X distance of the source token for the current game user.
   *
   * @param {Token} sourceToken - The reference token from which to compute the distance.
   * @param {number} distance - The distance from the reference token.
   * @param {object} options - Optional parameters.
   * @param {number} [options.disposition=null] - The disposition of tokens: same(1), opposite(-1), neutral(0), ignore(null).
   * @param {boolean} [options.includeSource=false] - Flag to indicate if the reference token should be included or not in the selected targets.
   * @param {boolean} [options.updateSelected=true] - Flag to indicate if the user's target selection should be updated.
   * @param {boolean} [options.isSeen=false] - Flag to indicate if the targets must be sensed by the source token.
   *
   * @returns {Token5e[]} An array of Token instances that were selected.
   */
  function selectTargetsWithinX(
    sourceToken,
    distance,
    options = {
      disposition: null,
      includeSource: false,
      updateSelected: true,
      isSeen: false,
    }
  ) {
    options.disposition ??= null;
    options.includeSource ??= false;
    options.updateSelected ??= true;
    options.isSeen ??= false;

    let aoeTargets = MidiQOL.findNearby(
      options.disposition,
      sourceToken,
      distance,
      {
        isSeen: options.isSeen,
        includeToken: options.includeSource,
      }
    );

    const aoeTargetIds = aoeTargets.map((t) => t.document.id);
    if (options.updateSelected) {
      game.user?.updateTokenTargets(aoeTargetIds);
      game.user?.broadcastActivity({ targets: aoeTargetIds });
    }
    return aoeTargets;
  }

  /**
   * Inserts text into a Midi item chat message before the card buttons div and updates it.
   *
   * @param {string} position - The position where to insert the text, supported values: beforeButtons, beforeHitsDisplay.
   * @param {ChatMessage5e} chatMessage - The MidiQOL item chat message to update
   * @param {string} text - The text to insert in the chat message.
   */
  async function insertTextBeforeButtonsIntoMidiItemChatMessage(
    position,
    chatMessage,
    text
  ) {
    let content = foundry.utils.deepClone(chatMessage.content);
    let searchRegex = undefined;
    let replaceString = `$1\n${text}\n$2`;
    switch (position) {
      case 'beforeHitsDisplay':
        searchRegex = /(<\/div>)(\s*<div class="midi-qol-hits-display">)/m;
        break;
      case 'beforeButtons':
      default:
        searchRegex =
          /(<\/section>)(\s*<div class="card-buttons midi-buttons">)/m;
        break;
    }
    content = content.replace(searchRegex, replaceString);
    await chatMessage.update({ content: content });
  }

  /**
   * Inserts text into a Midi item chat message before the card buttons div and updates it.
   *
   * @param {string} position - The position where to insert the text, supported values: beforeButtons, beforeHitsDisplay.
   * @param {MidiQOL.workflow} workflow - The current MidiQOL workflow for which to update the item card.
   * @param {string} text - The text to insert in the MidiQOL item card.
   */
  async function insertTextIntoMidiItemCard(position, workflow, text) {
    const chatMessage = MidiQOL.getCachedChatMessage(workflow.itemCardUuid);
    if (!chatMessage) {
      console.error(`${MACRO_NAME} | Could not find workflow item card`, {
        workflow,
      });
      return;
    }
    await insertTextBeforeButtonsIntoMidiItemChatMessage(
      position,
      chatMessage,
      text
    );
  }

  /**
   * Validates the workflow on which a Midi hook was registered is the same as the one when it is called
   * and that the workflow was not aborted.
   *
   * @param {string} itemName - The name of the item which registered the hook.
   * @param {string} hookName - The name of the Midi hook.
   * @param {string} actionName - The name of the item to be called in the hook.
   * @param {MidiQOL.Workflow} originWorkflow - The workflow during which the hook was registered.
   * @param {MidiQOL.Workflow} currentWorkflow - The workflow when the hook is called.
   * @param {boolean} [debug=false] - Flag to indicate if debug info must be written to the console.
   *
   * @returns {boolean} true is the hook is still valid, false otherwise.
   */
  function isMidiHookStillValid(
    itemName,
    hookName,
    actionName,
    originWorkflow,
    currentWorkflow,
    debug = false
  ) {
    if (originWorkflow !== currentWorkflow) {
      if (debug) {
        // Not same workflow do nothing
        console.warn(
          `${itemName} | ${hookName} hook called from a different workflow.`
        );
      }
      return false;
    }
    if (currentWorkflow.aborted) {
      if (debug) {
        // Workflow was aborted do not trigger action
        console.warn(
          `${itemName} | workflow was aborted, ${actionName} is also cancelled.`
        );
      }
      return false;
    }
    return true;
  }

  /**
   * Converts a workflow's critical into a normal hit.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function convertCriticalToNormalHit(workflow) {
    if (!workflow.isCritical) {
      // Not a critical hit, do nothing
      return;
    }

    workflow.isCritical = false;
    // Set flag for other feature to not put back a critical or least consider it...
    workflow.options.noCritical = true;

    const configSettings = MidiQOL.configSettings();
    for (let tokenUuid of Object.keys(workflow.hitDisplayData)) {
      if (
        !workflow.hitTargets.some((t) => t.document.uuid === tokenUuid) &&
        !workflow.hitTargetsEC.some((t) => t.document.uuid === tokenUuid)
      ) {
        // Skip targets that are not hit.
        continue;
      }
      const hitDisplay = workflow.hitDisplayData[tokenUuid];
      // TODO remove? seems to not be used anymore...
      hitDisplay.hitResultNumeric = workflow.useActiveDefence
        ? ''
        : `${workflow.attackTotal}/${
            hitDisplay.ac ? Math.abs(workflow.attackTotal - hitDisplay.ac) : '-'
          }`;

      if (
        game.user?.isGM &&
        ['hitDamage', 'all'].includes(configSettings.hideRollDetails)
      ) {
        hitDisplay.hitSymbol = 'fa-tick';
      } else {
        hitDisplay.hitSymbol = 'fa-check';
      }
    }
    // Redisplay roll and hits with the new data
    if (debug) {
      console.warn(`${MACRO_NAME} | Hit display data after updates.`, {
        hitDisplayData: workflow.hitDisplayData,
      });
    }

    await workflow.displayAttackRoll(configSettings.mergeCard);
    await workflow.displayHits(
      workflow.whisperAttackCard,
      configSettings.mergeCard
    );
  }

  /**
   * Adjust the workflow attack roll target AC, it is used by dnd5e chat message to display the attack result.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  function adjustAttackRollTargetAC(workflow) {
    // TODO remove if midi-qol fixes this in checkHits or displayAttackRoll
    const targets = workflow.targets;
    if (workflow.attackRoll?.dice.length) {
      const targetAC =
        targets.size === 1
          ? workflow.hitDisplayData[targets.first().document.uuid].ac
          : null;
      workflow.attackRoll.options.target = targetAC;
      workflow.attackRoll.dice[0].options.target = targetAC;
    }
    const chatMessage = workflow.chatCard;
    let content = chatMessage && foundry.utils.duplicate(chatMessage.content);
    if (chatMessage) {
      // Remove sucesss/failure from attack otherwise dnd5e will add them without removing the previous result
      content = content.replace(
        /class="dice-total[^"]*"/,
        'class="dice-total"'
      );
      chatMessage.content = content;
    }
  }

  /**
   * Returns the damage roll options based on the ones set on the first damage roll of the worflow.
   *
   * @param {MidiQOL.Workflow} worflow - The MidiQOL workflow from which to get the first damage roll options.
   *
   * @returns {object} The damage roll options based on the ones set on the first damage roll of the worflow.
   */
  function getDamageRollOptions(workflow) {
    const rollOptions = workflow.damageRolls[0]?.options ?? {};
    const isCritical = !workflow.isCritical
      ? rollOptions.critical
      : workflow.isCritical;
    const options = {
      critical: isCritical,
      criticalBonusDamage: rollOptions.criticalBonusDamage,
      criticalBonusDice: rollOptions.criticalBonusDice,
      criticalMultiplier: rollOptions.criticalMultiplier,
      multiplyNumeric: rollOptions.multiplyNumeric,
      powerfulCritical: rollOptions.powerfulCritical,
    };
    return options;
  }

  /**
   * Returns the MidiQOL property name for damage on save multiplier.
   *
   * @param {string} [onSave="none"] - The name of the multiplier to apply to damage if a save is sucessfull,
   *                          one of: none, half, full.
   * @returns {string} This MidiQOL property name for damage on save multiplier.
   */
  function getMidiOnSavePropertyName(onSave) {
    let onSavePropName = 'nodam';
    if (onSave) {
      switch (onSave) {
        case 'half':
          onSavePropName = 'halfdam';
          break;
        case 'full':
          onSavePropName = 'fulldam';
          break;
        default:
          onSavePropName = 'nodam';
      }
    }
    return onSavePropName;
  }

  /**
   * Gets the applied enchantments for the specified item uuid if any exist.
   *
   * @param {string} itemUuid - The UUID of the item for which to find associated enchantments.
   * @returns {ActiveEffect5e[]} list of applied enchantments.
   */
  function getAppliedEnchantments(itemUuid) {
    return dnd5e.registry.enchantments.applied(itemUuid);
  }

  /**
   * Deletes the applied enchantments on the specified item uuid.
   *
   * @param {string} itemUuid - The UUID of the item for which to delete the associated enchantments.
   * @returns {ActiveEffect5e[]} the list of applied enchantments that was deleted.
   */
  async function deleteAppliedEnchantments(itemUuid) {
    const appliedEnchantements = getAppliedEnchantments(itemUuid);
    for (let activeEffect of appliedEnchantements) {
      await activeEffect.delete();
    }
    return appliedEnchantements;
  }

  /**
   * Disables manual enchantment placing (for dnd5e v3.2+).
   * This prevents the drop area that allows to select or remove the item to which an enchantment is applied.
   *
   * @param {object} parameters - The MidiQOL function macro parameters.
   */
  function disableManualEnchantmentPlacingOnUsePreItemRoll({ workflow, args }) {
    if (debug) {
      console.warn(
        MACRO_NAME,
        {
          phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0],
        },
        arguments
      );
    }

    // Disables enchantment drop area
    Hooks.once('dnd5e.preUseActivity', (activity, usageConfig, _, __) => {
      const activityWorkflow = MidiQOL.Workflow.getWorkflow(activity.uuid);
      if (
        !elwinHelpers.isMidiHookStillValid(
          activity.item?.name,
          'dnd5e.preUseActivity',
          activity.name,
          workflow,
          activityWorkflow,
          debug
        )
      ) {
        return;
      }
      foundry.utils.setProperty(usageConfig, 'enchantmentProfile', null);
    });
  }

  /**
   * Returns a list of equipped melee weapons for the specified actor.
   *
   * @param {Actor5e} sourceActor token actor
   * @returns {Item5e[]} A list of equipped melee weapons.
   */
  function getEquippedMeleeWeapons(sourceActor) {
    return (
      sourceActor?.itemTypes.weapon.filter(
        (w) =>
          w.system.equipped &&
          ['simpleM', 'martialM'].includes(w.system.type?.value) &&
          w.system.activities
            ?.getByType('attack')
            .some((a) => a.actionType === 'mwak')
      ) ?? []
    );
  }

  /**
   * Utility dialog to select an item from a list of items.
   *
   * @example
   * const items = _token.actor.itemTypes.weapon;
   * const selectedItem = await ItemSelectionDialog.createDialog("Select a Weapon", items, items?.[0]);
   */
  class ItemSelectionDialog extends Dialog {
    /**
     * Returns the html content for the dialog generated using the specified values.
     *
     * @param {Item5e[]} items - List of items
     * @param {Item5e} defaultItem - Default item, if null or not part of items, the first one is used.
     *
     * @returns {string} the html content to display in the dialog.
     */
    static getContent(items, defaultItem) {
      if (!defaultItem || !items.find((t) => t.id === defaultItem?.id)) {
        defaultItem = items[0];
      }
      let itemContent = '';
      for (let item of items) {
        if (!item?.id) {
          continue;
        }
        const ctx = {};
        ctx.selected =
          defaultItem && defaultItem.id === item.id ? ' checked' : '';
        if (item.system.attunement) {
          ctx.attunement = item.system.attuned
            ? {
                cls: 'attuned',
                title: game.i18n.localize('DND5E.AttunementAttuned'),
              }
            : {
                cls: 'not-attuned',
                title: game.i18n.localize(
                  CONFIG.DND5E.attunementTypes[item.system.attunement]
                ),
              };
        }
        if ('equipped' in item.system) {
          ctx.equip = {
            cls: item.system.equipped ? 'active' : '',
            tooltip: game.i18n.localize(
              item.system.equipped ? 'DND5E.Equipped' : 'DND5E.Unequipped'
            ),
          };
        }
        ctx.quantity =
          item.type === 'consumable' ? `[${item.system.quantity}]` : '';
        ctx.subtitle = [
          item.system.type?.label,
          item.isActive ? item.labels.activation : null,
        ].filterJoin(' &bull; ');
        ctx.tags =
          item.labels.properties
            ?.filter((prop) => prop.icon)
            .map(
              (prop) =>
                `<span aria-label="${prop.label}"><dnd5e-icon src="${prop.icon}"></dnd5e-icon></span>`
            )
            .join(' ') ?? '';

        itemContent += `
      <input id="radio-${item.id}" type="radio" name="item" value="${item.id}"${ctx.selected}>
        <label class="item" for="radio-${item.id}">
          <div class="item-name">
            <img class="item-image" src="${item.img}" alt="${item.name}">
            <div class="name name-stacked">
              <span class="title">${item.name}${ctx.quantity}</span>
              <span class="subtitle">${ctx.subtitle}</span>
            </div>
            <div class="tags">
              ${ctx.tags}
            </div>
          </div>
          <div class="item-controls">
      `;
        if (ctx.attunement) {
          itemContent += `
            <a class="item-control ${ctx.attunement.cls}" data-tooltip="${ctx.attunement.tooltip}">
              <i class="fas fa-sun"></i>
            </a>
        `;
        }
        if (ctx.equip) {
          itemContent += `
            <a class="item-control ${ctx.equip.cls}" data-tooltip="${ctx.equip.tooltip}">
              <i class="fas fa-shield-halved"></i>
            </a>
        `;
        }
        itemContent += `
          </div>
        </label>
      </input>
      `;
      }
      const content = `
          <style>
            .selectItem .item {
              display: flex;
              flex-direction: row;
              align-items: stretch;
              margin: 4px;
            }

            .selectItem input {
              opacity: 0;
              position: absolute;
              z-index: -1;
            }
      
            .selectItem .item .item-name {
              flex: 1;
              display: flex;
              gap: 0.5rem;
              align-items: center;
              line-height: 1;
              position: relative;
            }            
      
            .selectItem .item .item-image {
              border: 2px solid var(--dnd5e-color-gold, ##9f9275);
              box-shadow: 0 0 4px var(--dnd5e-shadow-45, rgb(0 0 0 / 45%));
              border-radius: 0;
              background-color: var(--dnd5e-color-light-gray, #3d3d3d);
              width: 32px;
              height: 32px;
              flex: 0 0 32px;
              cursor: pointer;
              object-fit: cover;
            }

            .selectItem .name-stacked {
              display: flex;
              flex-direction: column;
            }
                 
            .selectItem .item .item-name .title {
              transition: text-shadow 250ms ease;
              font-size: var(--font-size-13);
            }

            .selectItem .name-stacked .subtitle {
              font-family: var(--dnd5e-font-roboto, Roboto, sans-serif);
              font-size: var(--font-size-10, 0.625rem);
              color: var(--color-text-dark-5);
            }
            
            .selectItem .item .item-controls {
              display: flex;
              width: 40px;
              align-items: stretch;
              justify-content: center;
              gap: 0.375rem;
              color: var(--color-text-light-6);
              padding: 0 1.5rem 0 0.25rem;
              position: relative;
            }

            .selectItem .item .item-controls .item-control {
              display: flex;
              align-items: center;
            }

            .selectItem .item .item-controls .item-control.active {
              color: var(--dnd5e-color-black, #4b4a44);
            }

            /* CHECKED STYLES */
            .selectItem [type=radio]:checked + label {
              outline: 3px solid #f00;
            }
          </style>
          
          <form>
            <div class="selectItem">
              <dl>
                ${itemContent}
              </dl>
            </div>
          </form>
      `;
      return content;
    }

    /**
     * A helper constructor function which displays the item selection dialog.
     *
     * @param {string} title - The title to display.
     * @param {Token5e[]} items - List of items from which to select an item.
     * @param {Token5e} defaultItem - If specified, item to be selected by default,
     *                                if null or not part of items, the first one is used.
     *
     * @returns {Promise<Item5e|null>}  Resolves with the selected item, if any.
     */
    static createDialog(title, items, defaultItem) {
      if (!(items?.length > 0)) {
        return null;
      }
      return new Promise((resolve, reject) => {
        const dialog = new this(
          {
            title,
            content: this.getContent(items, defaultItem),
            buttons: {
              ok: {
                icon: '<i class="fas fa-check"></i>',
                label: 'Select',
                callback: (html) => {
                  const selectedItemId = html.find(
                    "input[type='radio'][name='item']:checked"
                  )[0]?.value;
                  resolve(items.find((t) => t.id === selectedItemId));
                },
              },
            },
            default: 'ok',
            close: () => resolve(null),
          },
          { classes: ['dnd5e', 'dialog'] }
        );
        dialog.render(true);
      });
    }
  }

  // Export class
  if (depReqFulfilled) {
    exportIdentifier('elwinHelpers.ItemSelectionDialog', ItemSelectionDialog);
  }

  /**
   * Utility dialog to select a token from a list of tokens.
   *
   * @example
   * const targets = game.canvas.tokens.placeables;
   * const selectedTarget = await TokenSelectionDialog.createDialog("Select Target", targets, targets?.[0]);
   */
  class TokenSelectionDialog extends Dialog {
    /**
     * Returns the html content for the dialog generated using the specified values.
     *
     * @param {Token5e[]} tokens - List of tokens
     * @param {Token5e} defaultToken - Default token, if null or not part of tokens, the first one is used.
     *
     * @returns {string} the html content to display in the dialog.
     */
    static async getContent(tokens, defaultToken) {
      let tokenContent = '';
      if (!defaultToken || !tokens.find((t) => t.id === defaultToken?.id)) {
        defaultToken = tokens[0];
      }
      for (let token of tokens) {
        if (!token?.id) {
          continue;
        }
        const selected =
          defaultToken && defaultToken.id === token.id ? ' checked' : '';
        const tokenImg = await getTokenImage(token);
        const tokenName = MidiQOL.getTokenPlayerName(token, true);
        tokenContent += `<div style="flex-grow: 1"><label class="radio-label">
        <input type="radio" name="token" value="${token.id}"${selected}>
        <img id="${token.document.uuid}" src="${tokenImg}" style="border:0px; width: 50px; height:50px;">
        ${tokenName}
      </label></div>`;
      }

      let content = `
          <style>
            .selectToken .form-group {
              display: flex;
              flex-wrap: wrap;
              width: 100%;
              align-items: flex-start;
            }
      
            .selectToken .radio-label {
              display: flex;
              flex-direction: row;
              align-items: center;
              margin: 4px;
              text-align: center;
              justify-items: center;
              flex: 1 0 25%;
              line-height: normal;
            }
      
            .selectToken .radio-label input {
              opacity: 0;
              position: absolute;
              z-index: -1;
            }
      
            .selectToken img {
              border: 0px;
              width: 50px;
              height: 50px;
              flex: 0 0 50px;
              margin-right: 3px;
              cursor: pointer;
            }
      
            /* CHECKED STYLES */
            .selectToken [type=radio]:checked + img {
              outline: 3px solid #f00;
            }
          </style>
          
          <form>
            <div class="selectToken">
              <div class="form-group" id="tokens">
              <dl>
                  ${tokenContent}
              </dl>
              </div>
            </div>
          </form>
      `;
      return content;
    }

    /** @inheritdoc */
    activateListeners(html) {
      super.activateListeners(html);

      if (canvas) {
        let imgs = html[0].getElementsByTagName('img');
        for (let i of imgs) {
          i.style.border = 'none';
          i.closest('.radio-label').addEventListener(
            'click',
            async function () {
              const token = getToken(i.id);
              //@ts-expect-error .ping
              if (token) await canvas?.ping(token.center);
            }
          );
          i.closest('.radio-label').addEventListener('mouseover', function () {
            const token = getToken(i.id);
            if (token) {
              //@ts-expect-error .ping
              token.hover = true;
              token.refresh();
            }
          });
          i.closest('.radio-label').addEventListener('mouseout', function () {
            const token = getToken(i.id);
            if (token) {
              //@ts-expect-error .ping
              token.hover = false;
              token.refresh();
            }
          });
        }
      }
    }

    /**
     * A helper constructor function which displays the token selection dialog.
     *
     * @param {string} title - The title to display.
     * @param {Token5e[]} tokens - List of tokens from which to select a token.
     * @param {Token5e} defaultToken - If specified, token to be selected by default,
     *                                 if null or not part of tokens, the first one is used.
     *
     * @returns {Promise<Token5e|null>}  Resolves with the selected token, if any.
     */
    static async createDialog(title, tokens, defaultToken) {
      if (!(tokens?.length > 0)) {
        return null;
      }
      const content = await this.getContent(tokens, defaultToken);
      return new Promise((resolve, reject) => {
        const dialog = new this(
          {
            title,
            content,
            buttons: {
              ok: {
                icon: '<i class="fas fa-check"></i>',
                label: 'Select', // TODO localize
                callback: (html) => {
                  const selectedTokenId = html.find(
                    "input[type='radio'][name='token']:checked"
                  )[0]?.value;
                  resolve(tokens.find((t) => t.id === selectedTokenId));
                },
              },
            },
            default: 'ok',
            close: () => resolve(null),
          },
          { classes: ['dnd5e', 'dialog'] }
        );
        dialog.render(true);
      });
    }
  }

  // Export class
  if (depReqFulfilled) {
    exportIdentifier('elwinHelpers.TokenSelectionDialog', TokenSelectionDialog);
  }

  /**
   * Returns the numeric value of the specified actor's size value.
   *
   * @param {Actor5e} actor actor for which to get the size value.
   *
   * @returns {number} the numeric value of the specified actor's size value.
   */
  function getActorSizeValue(actor) {
    return getSizeValue(actor?.system?.traits?.size ?? 'med');
  }

  /**
   * Returns the numeric value of the specified size.
   *
   * @param {string} size  the size name for which to get the size value.
   *
   * @returns {number} the numeric value of the specified size.
   */
  function getSizeValue(size) {
    return Object.keys(CONFIG.DND5E.actorSizes).indexOf(size ?? 'med');
  }

  /**
   * Helper function to create a simple dialog with labeled buttons and associated data.
   *
   * @param {object} data - The dialog's data.
   * @param {{label: string, value: object}[]} [data.buttons] - Buttons to be displayed in the dialog.
   * @param {string} [data.title] - Dialog's title.
   * @param {string} [data.content] - Dialog's html content.
   * @param {object} [data.options] - Dialog's options.
   * @param {string} [direction = 'row'] - Controls layout direction of the dialog's buttons. 'column' or 'row' accepted.
   *
   * @returns {object} the value associated to the selected button.
   */
  async function buttonDialog(data, direction) {
    const buttons = {};

    data.buttons.forEach((button) => {
      buttons[button.label] = {
        label: button.label,
        callback: () => button.value,
      };
    });

    const render = (html) => {
      const app = html.closest('.app');
      app.find('.dialog-buttons').css({ 'flex-direction': direction });
    };

    return await Dialog.wait(
      {
        title: data.title,
        content: data.content ?? '',
        buttons,
        render,
        close: () => null,
      },
      { classes: ['dnd5e', 'dialog'], height: '100%', ...data.options },
      {}
    );
  }

  /**
   * Helper function to create a simple dialog with labeled buttons and associated data.
   *
   * @param {object} data - The dialog's data.
   * @param {{label: string, value: object}[]} [data.buttons] - Buttons to be displayed in the dialog.
   * @param {string} [data.title] - Dialog's title.
   * @param {string} [data.content] - Dialog's html content.
   * @param {object} [data.options] - Dialog's options.
   * @param {string} [direction = 'row'] - Controls layout direction of the dialog's buttons. 'column' or 'row' accepted.
   *
   * @returns {object} the value associated to the selected button.
   */
  async function remoteButtonDialog(userId, data, direction) {
    return globalThis.elwinHelpers.socket.executeAsUser(
      'elwinHelpers.remoteButtonDialog',
      userId,
      data,
      direction
    );
  }

  /**
   * Returns the intersection point on the target token between the source token and target token and the ray used to compute the intersection.
   * The possible segments are computed using the same algo as MidiQOL uses to compute attack distances.
   *
   * @param {Token5e} sourceToken - The source token.
   * @param {Token5e} targetToken - The target token.
   *
   * @returns {{point: {x: number, y: number}, ray: Ray}} the intersection point between the source token and target token and the ray used to compute the intersection.
   */
  function getAttackSegment(sourceToken, targetToken) {
    if (!canvas || !canvas.scene || !canvas.grid || !canvas.dimensions) {
      return undefined;
    }
    if (!sourceToken || !targetToken) {
      return undefined;
    }

    const segments = getDistanceSegments(sourceToken, targetToken, true);
    if (debug) {
      console.warn(`${MACRO_NAME} | getAttackSegment (getDistanceSegments)`, {
        sourceToken,
        targetToken,
        segments,
      });
    }
    if (segments.length === 0) {
      return undefined;
    }
    const segmentDistances = simpleMeasureDistances(segments, {
      gridSpaces: true,
    });
    if (MidiQOL.configSettings()?.optionalRules.distanceIncludesHeight) {
      const heightDifference = calculateTokeHeightDifference(
        sourceToken,
        targetToken
      );
      segmentDistances.forEach(
        (distance, index, arr) =>
          (arr[index] = getDistanceAdjustedByVerticalDist(
            distance,
            heightDifference
          ))
      );
    }
    if (debug) {
      console.warn(
        `${MACRO_NAME} | getAttackSegment (simpleMeasureDistances)`,
        {
          segments,
          segmentDistances,
        }
      );
    }
    const idxShortestSegment = segmentDistances.indexOf(
      Math.min(...segmentDistances)
    );
    if (idxShortestSegment < 0) {
      return undefined;
    }
    const targetRect = new PIXI.Rectangle(
      targetToken.x,
      targetToken.y,
      targetToken.w,
      targetToken.h
    ).getBounds();
    const targetRay = segments[idxShortestSegment].ray;
    const intersectSegments = targetRect.segmentIntersections(
      targetRay.A,
      targetRay.B
    );
    if (debug) {
      console.warn(`${MACRO_NAME} | getAttackSegment (insersectSegments)`, {
        targetRect,
        targetRay,
        intersectSegments,
      });
    }
    if (!intersectSegments?.length) {
      return undefined;
    }
    return { point: intersectSegments[0], ray: targetRay };
  }

  /**
   * Get the distance segments between two objects. Based on midi-qol code used in getDistance.
   *
   * @param {Token5e} t1 - The first token.
   * @param {Token5e} t2 - The second token.
   * @param {boolean} wallBlocking - Whether to consider walls as blocking.
   *
   * @return {{ray: Ray}[]} an array of segments representing the distance between the two tokens.
   */
  function getDistanceSegments(t1, t2, wallBlocking = false) {
    const actor = t1.actor;
    const ignoreWallsFlag = foundry.utils.getProperty(
      actor,
      'flags.midi-qol.ignoreWalls'
    );
    if (ignoreWallsFlag) {
      wallBlocking = false;
    }

    const t1StartX = t1.document.width >= 1 ? 0.5 : t1.document.width / 2;
    const t1StartY = t1.document.height >= 1 ? 0.5 : t1.document.height / 2;
    const t2StartX = t2.document.width >= 1 ? 0.5 : t2.document.width / 2;
    const t2StartY = t2.document.height >= 1 ? 0.5 : t2.document.height / 2;

    let x, x1, y, y1;
    let segments = [];
    for (x = t1StartX; x < t1.document.width; x++) {
      for (y = t1StartY; y < t1.document.height; y++) {
        const origin = new PIXI.Point(
          //        ...canvas.grid.getCenter(
          Math.round(t1.document.x + canvas.dimensions.size * x),
          Math.round(t1.document.y + canvas.dimensions.size * y)
          //       )
        );
        for (x1 = t2StartX; x1 < t2.document.width; x1++) {
          for (y1 = t2StartY; y1 < t2.document.height; y1++) {
            const dest = new PIXI.Point(
              //            ...canvas.grid.getCenter(
              Math.round(t2.document.x + canvas.dimensions.size * x1),
              Math.round(t2.document.y + canvas.dimensions.size * y1)
              //          )
            );
            const r = new Ray(origin, dest);
            if (wallBlocking) {
              const collisionCheck =
                CONFIG.Canvas.polygonBackends.move.testCollision(origin, dest, {
                  mode: 'any',
                  type: 'move',
                });
              if (debug) {
                console.warn(`${MACRO_NAME} | getDistanceSegments`, {
                  segment: { ray: r },
                  collisionCheck,
                });
              }
              if (collisionCheck) {
                continue;
              }
            }
            segments.push({ ray: r });
          }
        }
      }
    }
    return segments;
  }

  /**
   * Based on midi-qol measureDistances function.
   * Measure distances for given segments with optional grid spaces.
   *
   * @param {{{ray: Ray}}[]} segments - Array of segments to measure distances for.
   * @param {object} options - Optional object with grid spaces configuration.
   *
   * @return {number[]} Array of distances for each segment.
   */
  function simpleMeasureDistances(segments, options = {}) {
    if (
      canvas?.grid?.grid.constructor.name !== 'BaseGrid' ||
      !options.gridSpaces
    ) {
      const distances = canvas?.grid?.measureDistances(segments, options);
      return distances;
    }

    const rule = canvas?.grid.diagonalRule;
    if (!options.gridSpaces || !['555', '5105', 'EUCL'].includes(rule)) {
      return canvas?.grid?.measureDistances(segments, options);
    }
    // Track the total number of diagonals
    let nDiagonal = 0;
    const d = canvas?.dimensions;

    const grid = canvas?.scene?.grid;
    if (!d || !d.size) return 0;

    // Iterate over measured segments
    return segments.map((s) => {
      const r = s.ray;
      // Determine the total distance traveled
      const nx = Math.ceil(Math.max(0, Math.abs(r.dx / d.size)));
      const ny = Math.ceil(Math.max(0, Math.abs(r.dy / d.size)));
      // Determine the number of straight and diagonal moves
      const nd = Math.min(nx, ny);
      const ns = Math.abs(ny - nx);
      nDiagonal += nd;

      if (rule === '5105') {
        // Alternative DMG Movement
        const nd10 =
          Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
        const spaces = nd10 * 2 + (nd - nd10) + ns;
        return spaces * d.distance;
      } else if (rule === 'EUCL') {
        // Euclidean Measurement
        const nx = Math.max(0, Math.abs(r.dx / d.size));
        const ny = Math.max(0, Math.abs(r.dy / d.size));
        return Math.ceil(Math.hypot(nx, ny) * grid?.distance);
      } else {
        // Standard PHB Movement
        return Math.max(nx, ny) * grid.distance;
      }
    });
  }

  /**
   * Calculate the height difference between two tokens based on their elevation and dimensions.
   *
   * @param {Token5e} t1 - The first token.
   * @param {Token5e} t2 - The second token.
   *
   * @return {number} the height difference between the two tokens
   */
  function calculateTokeHeightDifference(t1, t2) {
    const t1Elevation = t1.document.elevation ?? 0;
    const t2Elevation = t2.document.elevation ?? 0;
    const t1TopElevation =
      t1Elevation +
      Math.max(t1.document.height, t1.document.width) *
        (canvas?.dimensions?.distance ?? 5);
    const t2TopElevation =
      t2Elevation +
      Math.min(t2.document.height, t2.document.width) *
        (canvas?.dimensions?.distance ?? 5); // assume t2 is trying to make itself small

    let heightDifference = 0;
    if (
      (t2Elevation > t1Elevation && t2Elevation < t1TopElevation) ||
      (t1Elevation > t2Elevation && t1Elevation < t2TopElevation)
    ) {
      //check if bottom elevation of each token is within the other token's elevation space, if so make the height difference 0
      heightDifference = 0;
    } else if (t1Elevation < t2Elevation) {
      // t2 above t1
      heightDifference =
        Math.max(0, t2Elevation - t1TopElevation) +
        (canvas?.dimensions?.distance ?? 5);
    } else if (t1Elevation > t2Elevation) {
      // t1 above t2
      heightDifference =
        Math.max(0, t1Elevation - t2TopElevation) +
        (canvas?.dimensions?.distance ?? 5);
    }

    return heightDifference;
  }

  /**
   * Returns the total measured distance for the specified horizDistance and vertDistance.
   *
   * @param {number} horizDistance - Horizontal distance.
   * @param {number} vertDistance - Vertical distance.
   *
   * @returns {number} the total measured distance including the vertical distance.
   */
  function getDistanceAdjustedByVerticalDist(horizDistance, vertDistance) {
    const rule = canvas.grid.diagonalRule;
    let distance = horizDistance;
    if (['555', '5105'].includes(rule)) {
      let nd = Math.min(horizDistance, vertDistance);
      let ns = Math.abs(horizDistance - vertDistance);
      distance = nd + ns;
      let dimension = canvas?.dimensions?.distance ?? 5;
      if (rule === '5105') {
        distance = distance + Math.floor(nd / 2 / dimension) * dimension;
      }
    } else {
      distance = Math.sqrt(
        vertDistance * vertDistance + horizDistance * horizDistance
      );
    }
    return distance;
  }

  /**
   * Returns the position where to move the token so its border is next to the specified point.
   *
   * @param {Token5e} token - The token to be moved.
   * @param {{x: number, y: number}} point - The point next to which to move the token.
   * @param {object} options - Options
   * @param {boolean} [options.snapToGrid] - If the the returned position will be snapped to grid or not.
   *
   * @returns {{x: number, y: number}} the position where to move the token so its border is next to the specified point.
   */
  function getMoveTowardsPosition(
    token,
    point,
    options = { snapToGrid: true }
  ) {
    const moveTowardsRay = new Ray(token.center, point);
    const tokenIntersects = token.bounds.segmentIntersections(
      moveTowardsRay.A,
      moveTowardsRay.B
    );
    if (!tokenIntersects?.length) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | getMoveTowardsPosition no segmentIntersections found`,
          {
            tokenBounds: token.bounds,
            moveTowardsRay,
          }
        );
      }
      return undefined;
    }
    const centerToBounds = new Ray(moveTowardsRay.A, tokenIntersects[0]);

    const rayToCenter = Ray.towardsPoint(
      moveTowardsRay.A,
      moveTowardsRay.B,
      moveTowardsRay.distance - centerToBounds.distance
    );
    const tokenPos = {
      x: rayToCenter.B.x - token.w / 2,
      y: rayToCenter.B.y - token.h / 2,
    };
    let tokenPosSnapped = undefined;
    if (options?.snapToGrid && canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      const isTiny = token.document.width < 1 && token.document.height < 1;
      const interval = canvas.grid.isHex ? 1 : isTiny ? 2 : 1;
      tokenPosSnapped = canvas.grid.getSnappedPosition(
        tokenPos.x,
        tokenPos.y,
        interval,
        { token }
      );
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | getMoveTowardsPosition`, {
        tokenPos,
        tokenPosSnapped,
      });
    }
    return tokenPosSnapped ? tokenPosSnapped : tokenPos;
  }

  /**
   * Returns a position near the specified destPos where the specified token can be moved.
   * There must be no collision betwen the token current position and the token destination position,
   * if the destination position is occupied an altenative position can be returned but there must be no
   * collision between the initial destination position and the new proposed one.
   * An unoccupied space will be prioritized over an occupied one. If a nearToken is specified
   * the position returned must be adjacent to this token.
   *
   * @param {Token5e} token - The token for which to find a space where it could be moved.
   * @param {{x: number, y: number}} destPos - The token's tentative destination position.
   * @param {Token5e} nearToken - If defined, the final position of the token must be adjacent to this token.
   *
   * @returns {{pos: {x: number, y: number}, occupied: boolean}} the token's preferred final destination with a flag to indicate if its already occupied by another token.
   */
  function findMovableSpaceNearDest(token, destPos, nearToken) {
    const tokenInitialDestBounds = new PIXI.Rectangle(
      destPos.x,
      destPos.y,
      token.w,
      token.h
    ).getBounds();
    if (
      token.checkCollision(tokenInitialDestBounds.center, {
        type: 'move',
        mode: 'any',
      })
    ) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | findMovableSpaceNearDest (wall collision initial destination)`,
          {
            tokenCenterPos: token.center,
            tokenDestCenterPos: tokenInitialDestBounds.center,
            wallCollision: true,
          }
        );
      }
      return undefined;
    }

    const size = Math.max(token.document.width, token.document.height);
    const isTiny = size < 1;
    let interval = 0;
    let gridIncrement = 1;
    let gridDistance = size;
    if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      interval = canvas.grid.isHex ? 1 : isTiny ? 2 : 1;
      gridIncrement = canvas.grid.isHex || !isTiny ? 1 : size;
      gridDistance = isTiny ? 1 : size;
    }

    const posGen = nearbyPositionsGenerator(
      destPos,
      gridIncrement,
      gridDistance
    );

    let nearTokenShape = undefined;
    if (nearToken) {
      if (canvas.grid.isHex) {
        // Use padded poly otherwise overlaps does not work for certain adjacent grid spaces.
        const points = canvas.grid.grid.getBorderPolygon(
          nearToken.document.width,
          nearToken.document.height,
          CONFIG.Canvas.objectBorderThickness
        );
        nearTokenShape = new PIXI.Polygon(points).translate(
          nearToken.x,
          nearToken.y
        );
      } else {
        nearTokenShape = nearToken.bounds;
      }
    }

    const quadtree = canvas.tokens.quadtree;
    let collisionTest = (o, r) => o.t.id !== token.id && o.r.intersects(r);
    if (canvas.grid.isHex) {
      collisionTest = (o, _) => {
        if (o.t.id === token.id) {
          return false;
        }
        const points = canvas.grid.grid.getBorderPolygon(
          o.t.document.width,
          o.t.document.height,
          -CONFIG.Canvas.objectBorderThickness
        );
        const currentTokenShape = new PIXI.Polygon(points).translate(
          o.t.x,
          o.t.y
        );
        return currentTokenShape.overlaps(token.testCollisitionShape);
      };
    }
    let testIter = null;
    const unoccupiedDestinations = [];
    const occupiedDestinations = [];

    while (!(testIter = posGen.next()).done) {
      const testPos = testIter.value;
      const testPosSnapped = canvas.grid.getSnappedPosition(
        testPos.x,
        testPos.y,
        interval,
        { token }
      );
      let adjTargetShape;
      let adjTargetForNeighborTestShape;

      if (canvas.grid.isHex) {
        if (isTiny) {
          // For Tiny in hex grid we use a complete grid space to test touches near token
          const tmpPos = canvas.grid.getSnappedPosition(
            testPos.x,
            testPos.y,
            interval
          );
          const tmpPoints = canvas.grid.grid.getBorderPolygon(1, 1, 0);
          adjTargetForNeighborTestShape = new PIXI.Polygon(tmpPoints).translate(
            tmpPos.x,
            tmpPos.y
          );
        }
        const points = canvas.grid.grid.getBorderPolygon(
          token.document.width,
          token.document.height,
          0
        );
        adjTargetShape = new PIXI.Polygon(points).translate(
          testPosSnapped.x,
          testPosSnapped.y
        );
      } else {
        adjTargetShape = new PIXI.Rectangle(
          testPosSnapped.x,
          testPosSnapped.y,
          token.w,
          token.h
        ).getBounds();
      }

      const paddedAdjTargetShape = adjTargetShape
        .clone()
        .pad(-CONFIG.Canvas.objectBorderThickness);
      const paddedAdjTargetBounds =
        paddedAdjTargetShape instanceof PIXI.Rectangle
          ? paddedAdjTargetShape
          : paddedAdjTargetShape.getBounds();

      let touchesNearToken = true;
      let insideNearToken = false;
      if (nearToken) {
        adjTargetForNeighborTestShape ??= adjTargetShape;
        touchesNearToken = nearTokenShape.overlaps(
          adjTargetForNeighborTestShape
        );
        insideNearToken = nearTokenShape.overlaps(paddedAdjTargetShape);
      }
      if (debug) {
        console.warn(`${MACRO_NAME} | findMovableSpaceNearDest iter`, {
          testPos,
          testPosSnapped,
          testGrid: canvas.grid.grid.getGridPositionFromPixels(
            testPosSnapped.x,
            testPosSnapped.y
          ),
          touchesNearToken,
          insideNearToken,
          nearTokenShape,
          adjTargetShape,
          paddedAdjTargetShape,
        });
      }
      if (!touchesNearToken || insideNearToken) {
        continue;
      }
      const testPosCenter = paddedAdjTargetBounds.center;
      // Test if token can move from destPost to this new position
      const wallCollision = token.checkCollision(testPosCenter, {
        origin: tokenInitialDestBounds.center,
        type: 'move',
        mode: 'any',
      });
      if (wallCollision) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | findMovableSpaceNearDest (wall collision)`,
            {
              testPos,
              testPosCenter,
              origin: token.center,
              wallCollision,
            }
          );
        }
        continue;
      }
      // Set shape on current token to be used by grid collision test
      token.testCollisitionShape = paddedAdjTargetShape;
      const overlappingTokens = quadtree.getObjects(paddedAdjTargetBounds, {
        collisionTest,
      });
      if (debug) {
        console.warn(
          `${MACRO_NAME} | findMovableSpaceNearDest (token collision)`,
          {
            testPos,
            testPosSnapped,
            testPosCenter,
            origin: token.center,
            tokenCollision: !!overlappingTokens.size,
            overlappingTokens,
          }
        );
      }
      if (overlappingTokens.size) {
        // Location occupied by other token keep it in case no other not blocked by wall found
        occupiedDestinations.push(testPosSnapped);
      } else {
        unoccupiedDestinations.push(testPosSnapped);
      }
    }

    if (debug) {
      console.warn(`${MACRO_NAME} | findMovableSpaceNearDest (destinations)`, {
        unoccupiedDestinations,
        occupiedDestinations,
      });
    }
    return unoccupiedDestinations.length
      ? { pos: unoccupiedDestinations[0], occupied: false }
      : occupiedDestinations.length
      ? { pos: occupiedDestinations[0], occupied: true }
      : undefined;
  }

  /**
   * Generator of positions that are around the specified startingPoint up to the specified grid distance.
   * Note: this was inspired by warpgate's PlaceableFit.
   *
   * @param {{x: number, y: number}} startingPoint - The starting position from which to find positions around the starting point.
   * @param {number} gridIncrement - The grid increment to use around the starting point to include in the iteration,
   *                                 fractions of grid distance is allowed but only for square grids, e.g.: 0.5.
   * @param {number} gridDistance - The maximum grid distance around the starting point to include in the iteration.
   *
   * @returns the generator function of positions around the specific startingPoint.
   */
  function* nearbyPositionsGenerator(
    startingPoint,
    gridIncrement,
    gridDistance
  ) {
    const gridLoc = canvas.grid.grid.getGridPositionFromPixels(
      startingPoint.x,
      startingPoint.y
    );
    // Adjust starting location for partial grid distance increment on square grids only
    if (gridIncrement < 1 && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      const dim = canvas.dimensions.size;
      gridLoc[0] += (startingPoint.y % dim) / dim;
      gridLoc[1] += (startingPoint.x % dim) / dim;
    }
    // partial grid distance is not supported for types of Grid other than Square
    if (gridIncrement < 1 && canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
      gridIncrement = 1;
    }
    const positions = new Set();

    const seen = (position) => {
      const key = position.join('.');
      if (positions.has(key)) return true;

      positions.add(key);
      return false;
    };

    seen(gridLoc);
    let queue = [gridLoc];
    let ring = 0;

    /* include seed point in iterator */
    yield { x: startingPoint.x, y: startingPoint.y, ring: -1 };

    while (queue.length > 0 && ring < gridDistance) {
      const next = queue.flatMap((loc) => getNeighbors(loc, gridIncrement));
      queue = next.filter((loc) => !seen(loc));

      for (const loc of queue) {
        const [x, y] = canvas.grid.grid.getPixelsFromGridPosition(...loc);
        yield { x, y, ring };
      }

      ring += gridIncrement;
    }

    return { x: null, y: null, ring: null };
  }

  /**
   * Returns an array of grid locations corresponding to the specified location neighbors.
   *
   * @param {number[]} loc - Array containing a grid location's a row and column.
   * @param {number} gridIncrement - The grid increment, should be 1 for small or larger creatures and 0.5 for tiny ones.
   *
   * @returns {number[][]} array containing the grid locations' row and column of the specified loc neighbors.
   */
  function getNeighbors(loc, gridIncrement) {
    const [row, col] = loc;
    if (gridIncrement < 1 && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      let offsets = [
        [-gridIncrement, -gridIncrement],
        [-gridIncrement, 0],
        [-gridIncrement, gridIncrement],
        [0, -gridIncrement],
        [0, gridIncrement],
        [gridIncrement, -gridIncrement],
        [gridIncrement, 0],
        [gridIncrement, gridIncrement],
      ];
      return offsets.map((o) => [row + o[0], col + o[1]]);
    } else {
      return canvas.grid.grid.getNeighbors(row, col);
    }
  }

  /**
   * Registers third party reactions for the specified token.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQL workflow.
   * @param {Token5e} reactionToken - The token for which to register third party reactions.
   * @param {OnUseMacros} onUseMacros - On use macros of the token matching the current trigger from which to extract the reaction data.
   */
  async function registerThirdPartyReactions(
    workflow,
    reactionToken,
    onUseMacros
  ) {
    if (!onUseMacros?.length) {
      return;
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | registerThirdPartyReactions.`, {
        workflow,
        reactionToken,
        onUseMacros,
      });
    }
    for (let onUseMacro of onUseMacros) {
      const optionParts = onUseMacro.option.split(/\s*\|\s*/);
      let [targetOnUse, tprOptions] = optionParts;
      const options = {};
      if (tprOptions) {
        const tprOptionParts = tprOptions.split(/\s*;\s*/);
        for (let tprOptionPart of tprOptionParts) {
          const [name, value] = tprOptionPart.split(/\s*=\s*/);

          if (name && value) {
            if (!TPR_OPTIONS.includes(name)) {
              // Skip unknown options
              continue;
            }
            switch (name) {
              case 'canSee':
              case 'ignoreSelf':
              case 'pre':
              case 'post':
                options[name] = /true/.test(value.trim());
                break;
              default:
                options[name] = value.trim();
                break;
            }
          }
        }
      }
      await registerThirdPartyReaction(
        workflow,
        reactionToken,
        onUseMacro.macroName,
        targetOnUse,
        options
      );
    }
  }

  /**
   * Registers the reaction associated to macroName that can be triggered by the specified targetOnUse and token,
   * in the current workflow.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {Token5e} reactionToken - The token for which to register third party reactions.
   * @param {string} macroName - The macroName
   * @param {string} targetOnUse - The targetOnUse trigger
   * @param {TprOptions} options - Options for the reaction registration.
   */
  async function registerThirdPartyReaction(
    workflow,
    reactionToken,
    macroName,
    targetOnUse,
    options = {}
  ) {
    if (debug) {
      console.warn(`${MACRO_NAME} | registerThirdPartyReaction.`, {
        workflow,
        reactionToken,
        macroName,
        targetOnUse,
        options,
      });
    }
    if (!reactionToken?.actor) {
      console.warn(
        `${MACRO_NAME} | No actor for reaction token.`,
        reactionToken
      );
      return;
    }
    let reactionItem = await getItemFromMacroName(
      macroName,
      workflow.item,
      workflow.actor
    );
    if (options.itemUuid) {
      reactionItem = await fromUuid(options.itemUuid);
    }

    if (
      !reactionItem ||
      !reactionItem?.system?.activities?.some((activity) =>
        activity.activation?.type?.includes('reaction')
      )
    ) {
      console.warn(
        `${MACRO_NAME} | No reaction item found, skipping registration.`,
        {
          workflow,
          reactionToken,
          macroName,
          targetOnUse,
          options,
        }
      );
      return;
    }

    workflow.thirdPartyReactions ??= {};
    const tokenReactionsInfo = (workflow.thirdPartyReactions[
      reactionToken.document.uuid
    ] ??= { reactions: [] });
    tokenReactionsInfo.reactions.push({
      token: reactionToken,
      item: reactionItem,
      activities: reactionItem.system.activities.filter((activity) =>
        activity.activation?.type?.includes('reaction')
      ),
      macroName,
      targetOnUse,
      triggerSource: options.triggerSource ?? 'target',
      canSee: options.canSee ?? false,
      ignoreSelf: options.ignoreSelf ?? false,
      preMacro: options.pre ?? false,
      postMacro: options.post ?? false,
    });
  }

  /**
   * Returns the item associated to the specifed macro name.
   *
   * Note: this uses the same logic has MidiQOL in Workflow.callMacro.
   *
   * @param {string} macroName - Name of the macro which should be associated to an item.
   * @param {Item5e} item - The current used item.
   * @param {Actor5e} actor - The current workflow actor.
   *
   * @returns {Item5e} the item associated to the specifed macroName.
   */
  async function getItemFromMacroName(macroName, item, actor) {
    let MQItemMacroLabel = getI18n('midi-qol.ItemMacroText');
    if (MQItemMacroLabel === 'midi-qol.ItemMacroText') {
      MQItemMacroLabel = 'ItemMacro';
    }

    let [name, uuid] = macroName?.trim().split('|') ?? [undefined, undefined];
    let macroItem = undefined;
    if (uuid?.length > 0) {
      macroItem = fromUuidSync(uuid);
      if (
        macroItem instanceof ActiveEffect &&
        macroItem.parent instanceof Item
      ) {
        macroItem = macroItem.parent;
      }
    }
    if (!name) {
      return undefined;
    }
    if (name.startsWith('function.')) {
      // Do nothing, use the macroItem UUID contained in the macroName
    } else if (
      name.startsWith(MQItemMacroLabel) ||
      name.startsWith('ItemMacro')
    ) {
      if (name === MQItemMacroLabel || name === 'ItemMacro') {
        if (!item) {
          return undefined;
        }
        macroItem = item;
      } else {
        const parts = name.split('.');
        const itemNameOrUuid = parts.slice(1).join('.');
        macroItem = await fromUuid(itemNameOrUuid);
        // ItemMacro.name
        if (!macroItem) {
          macroItem = actor.items.find(
            (i) =>
              i.name === itemNameOrUuid &&
              (foundry.utils.getProperty(i.flags, 'dae.macro') ??
                foundry.utils.getProperty(i.flags, 'itemacro.macro'))
          );
        }
        if (!macroItem) {
          return undefined;
        }
      }
    } else {
      // get a world/compendium macro.
      if (name.startsWith('Macro.')) {
        name = name.replace('Macro.', '');
      }
      const macro = game.macros?.getName(name);
      if (!macro) {
        const itemOrMacro = await fromUuid(name);
        if (itemOrMacro instanceof Item) {
          macroItem = itemOrMacro;
        } else if (itemOrMacro instanceof Macro) {
          return undefined;
        }
      }
    }
    return macroItem;
  }

  //----------------------------------
  // Copied from midi-qol because its not exposed in the API
  function getI18n(key) {
    return game.i18n.localize(key);
  }

  function getI18nOptions(key) {
    const translations = game.i18n.translations['midi-qol'] ?? {};
    const fallback = game.i18n._fallback['midi-qol'] ?? {};
    return translations[key] ?? fallback[key] ?? {};
  }

  /**
   * Returns the token name to be displayed in messages.
   * @param {Token5e} entity
   * @returns {string} the token name to be displayed.
   */
  function getTokenName(entity) {
    if (!entity) {
      return '<unknown>';
    }
    if (!(entity instanceof Token)) {
      return '<unknown>';
    }
    if (MidiQOL.configSettings().useTokenNames) {
      return entity.name ?? entity.actor?.name ?? '<unknown>';
    } else {
      return entity.actor?.name ?? entity.name ?? '<unknown>';
    }
  }

  function getToken(tokenRef) {
    if (!tokenRef) {
      return undefined;
    }
    if (tokenRef instanceof Token) {
      return tokenRef;
    }
    if (tokenRef instanceof TokenDocument) {
      return tokenRef.object;
    }
    if (typeof tokenRef === 'string') {
      const entity = MidiQOL.MQfromUuid(tokenRef);
      //@ts-expect-error return cast
      if (entity instanceof TokenDocument) {
        return entity.object;
      }
      if (entity instanceof Actor) {
        return MidiQOL.tokenForActor(entity);
      }
      return undefined;
    }
    if (tokenRef instanceof Actor) {
      return MidiQOL.tokenForActor(tokenRef);
    }
    return undefined;
  }

  /**
   * Returns the token image to display.
   * @param {Token5e} token the token for which to determine the image.
   * @returns {Promise<String>} the token image to display.
   */
  async function getTokenImage(token) {
    let img = token.document?.texture.src ?? token.actor?.img;
    if (
      MidiQOL.configSettings().usePlayerPortrait &&
      token.actor?.type === 'character'
    ) {
      img = token.actor?.img ?? token.document?.texture.src;
    }
    if (VideoHelper.hasVideoExtension(img ?? '')) {
      img = await game.video.createThumbnail(img ?? '', {
        width: 100,
        height: 100,
      });
    }
    return img;
  }

  /**
   * Returns the actor's maximum cast level for reactions.
   *
   * @param {Actor5e} actor - Actor for which to get the maximum cast level allowed for reactions.
   * @returns {integer} the actor's maximum cast level for reactions.
   */
  function maxReactionCastLevel(actor) {
    if (MidiQOL.maxReactionCastLevel) {
      return MidiQOL.maxReactionCastLevel(actor);
    }

    if (MidiQOL.configSettings().ignoreSpellReactionRestriction) {
      return 9;
    }
    const spells = actor.system.spells;
    if (!spells) {
      return 0;
    }
    let pactLevel = spells.pact?.value ? spells.pact?.level : 0;
    for (let i = 9; i > pactLevel; i--) {
      if (spells[`spell${i}`]?.value > 0) {
        return i;
      }
    }
    return pactLevel;
  }

  async function itemReaction(item, triggerType, maxLevel, onlyZeroCost) {
    if (MidiQOL.itemReaction && MidiQOL.enableNotifications) {
      try {
        MidiQOL.enableNotifications(false);
        return MidiQOL.itemReaction(item, triggerType, maxLevel, onlyZeroCost);
      } finally {
        MidiQOL.enableNotifications(true);
      }
    }

    if (!item.system.activities) {
      return false;
    }
    for (let activity of item.system.activities) {
      if (!activity.activation?.type?.includes('reaction')) {
        continue;
      }
      if (activity.activation.type !== 'reaction') {
        console.warn(
          `midi-qol | itemReaction | item ${item.name} ${activity.name} has a reaction type of ${activity.activation.type} which is deprecated - please update to reaction and reaction conditions`
        );
      }

      if ((activity.activation?.value ?? 1) > 0 && onlyZeroCost) {
        continue; // TODO can't specify 0 cost reactions in dnd5e 4.x - have to find another way
      }
      if (item.type === 'spell') {
        if (MidiQOL.configSettings().ignoreSpellReactionRestriction) {
          return true;
        }
        if (['atwill', 'innate'].includes(item.system.preparation.mode)) {
          return true;
        }
        if (item.system.level === 0) {
          return true;
        }
        if (
          item.system.preparation?.prepared !== true &&
          item.system.preparation?.mode === 'prepared'
        ) {
          continue;
        }
        if (item.system.level <= maxLevel) {
          return true;
        }
      }

      if (!item.system.attuned && item.system.attunement === 'required') {
        continue;
      }
      const results = await activity._prepareUsageUpdates({
        consume: true,
        returnErrors: true,
      });
      if (foundry.utils.getType(results) === 'Object') {
        return true;
      }
      return !results?.length;
    }
    return false;
  }

  //----------------------------------
  // Adapted from dnd5e because Item5e._getUsageUpdates displays ui notifications.

  /**
   * Verify that the consumed resources used by an Item are available.
   * If required resources are not available return false.
   * *Note:* based on dnd5e Item5e._getUsageUpdates
   *
   * @param {Item5e} item - The item for which to validation usage.
   * @param {ItemUseConfiguration} config - Configuration data for an item usage.
   * @returns {boolean} Returns false if an item cannot be used.
   */
  function checkUsage(item, config) {
    // Consume own limited uses or recharge
    if (config.consumeUsage) {
      const canConsume = canConsumeUses(item);
      if (canConsume === false) {
        return false;
      }
    }

    // Consume Limited Resource
    if (config.consumeResource) {
      const canConsume = canConsumeResource(item, config);
      if (canConsume === false) {
        return false;
      }
    }

    // Consume Spell Slots
    if (config.consumeSpellSlot) {
      const spellData = item.actor?.system.spells ?? {};
      const level = spellData[config.slotLevel];
      const spells = Number(level?.value ?? 0);
      if (spells === 0) {
        const isLeveled = /spell\d+/.test(config.slotLevel || '');
        const labelKey = isLeveled
          ? `DND5E.SpellLevel${this.system.level}`
          : `DND5E.SpellProg${config.slotLevel?.capitalize()}`;
        const label = game.i18n.localize(labelKey);
        if (debug) {
          console.warn(
            `${MACRO_NAME} | ${game.i18n.format('DND5E.SpellCastNoSlots', {
              name: item.name,
              level: label,
            })}`
          );
        }
        return false;
      }
    }

    // Determine whether the item can be used by testing for available concentration.
    if (config.beginConcentrating) {
      const { effects } = item.actor.concentration;

      // Case 1: Replacing.
      if (config.endConcentration) {
        const replacedEffect = effects.find(
          (i) => i.id === config.endConcentration
        );
        if (!replacedEffect) {
          if (debug) {
            console.warn(
              `${MACRO_NAME} | ${game.i18n.localize(
                'DND5E.ConcentratingMissingItem'
              )}`
            );
          }
          return false;
        }
      }

      // Case 2: Starting concentration, but at limit.
      else if (
        effects.size >= item.actor.system.attributes.concentration.limit
      ) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | ${game.i18n.localize(
              'DND5E.ConcentratingLimited'
            )}`
          );
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Validates if consuming an item's uses or recharge is possible.
   * *Note:* based on Item5e._handleConsumeUses
   *
   * @param {Item5e} item The item for which to validate uses consumption.
   * @returns {boolean}   Return false to block further progress, or return true to continue.
   */
  function canConsumeUses(item) {
    const recharge = item.system.recharge || {};
    const uses = item.system.uses || {};
    const quantity = item.system.quantity ?? 1;
    let used = false;

    // Consume recharge.
    if (recharge.value) {
      if (recharge.charged) {
        used = true;
      }
    }

    // Consume uses (or quantity).
    else if (uses.max && uses.per && uses.value > 0) {
      const remaining = Math.max(uses.value - 1, 0);

      if (remaining > 0 || (!remaining && !uses.autoDestroy)) {
        used = true;
      } else if (quantity >= 2) {
        used = true;
      } else if (quantity === 1) {
        used = true;
      }
    }

    // If the item was not used, return a warning
    if (!used) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | ${game.i18n.format('DND5E.ItemNoUses', {
            name: item.name,
          })}`
        );
      }
    }
    return used;
  }

  /**
   * Verifies if consuming an external resource is possible.
   * *Note:* based on Item5e._handleConsumeResource
   *
   * @param {Item5e} item - Item for which to validate resource consumption.
   * @param {ItemUseConfiguration} usageConfig - Configuration data for an item usage being prepared.
   * @returns {boolean} Return false to block further progress, or return true to continue.
   */
  function canConsumeResource(item, usageConfig) {
    const consume = item.system.consume || {};
    if (!consume.type) {
      return true;
    }

    // No consumed target
    const typeLabel = CONFIG.DND5E.abilityConsumptionTypes[consume.type];
    if (!consume.target) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | ${game.i18n.format(
            'DND5E.ConsumeWarningNoResource',
            { name: item.name, type: typeLabel }
          )}`
        );
      }
      return false;
    }

    const as = item.actor.system;
    // Identify the consumed resource and its current quantity
    let resource = null;
    let amount = usageConfig.resourceAmount
      ? usageConfig.resourceAmount
      : consume.amount || 0;
    if (as.spells && amount in as.spells) {
      amount = consume.amount || 0;
    }
    let quantity = 0;
    switch (consume.type) {
      case 'attribute': {
        const amt = usageConfig.resourceAmount;
        const target =
          as.spells && amt in as.spells
            ? `spells.${amt}.value`
            : consume.target;
        resource = foundry.utils.getProperty(as, target);
        quantity = resource || 0;
        break;
      }
      case 'ammo':
      case 'material':
        resource = item.actor.items.get(consume.target);
        quantity = resource ? resource.system.quantity : 0;
        break;
      case 'hitDice': {
        const denom = !['smallest', 'largest'].includes(consume.target)
          ? consume.target
          : false;
        resource = Object.values(item.actor.classes).filter(
          (cls) => !denom || cls.system.hitDice === denom
        );
        quantity = resource.reduce(
          (count, cls) => (count += cls.system.levels - cls.system.hitDiceUsed),
          0
        );
        break;
      }
      case 'charges': {
        resource = item.actor.items.get(consume.target);
        if (!resource) {
          break;
        }
        const uses = resource.system.uses;
        if (uses.per && uses.max) {
          quantity = uses.value;
        } else if (resource.system.recharge?.value) {
          quantity = resource.system.recharge.charged ? 1 : 0;
          amount = 1;
        }
        break;
      }
    }

    // Verify that a consumed resource is available
    if (resource === undefined) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | ${game.i18n.format('DND5E.ConsumeWarningNoSource', {
            name: item.name,
            type: typeLabel,
          })}`
        );
      }
      return false;
    }

    // Verify that the required quantity is available
    let remaining = quantity - amount;
    if (remaining < 0) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | ${game.i18n.format(
            'DND5E.ConsumeWarningNoQuantity',
            { name: item.name, type: typeLabel }
          )}`
        );
      }
      return false;
    }
    return true;
  }

  ////////////////// Remote functions ///////////////////////////////

  function registerRemoteFunctions() {
    const socket = socketlib.registerSystem(game.system.id);
    socket.register('elwinHelpers.remoteButtonDialog', _remoteButtonDialog);

    exportIdentifier('elwinHelpers.socket', socket);
  }

  async function _remoteButtonDialog(data, direction) {
    return await buttonDialog(data, direction);
  }
}
