/** ##################################################################################################
// Read First!!!!
// World Scripter Macro.
// Mix of helper functions for macros.
// v3.5.7
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
// - elwinHelpers.isWeapon
// - elwinHelpers.isMeleeWeapon
// - elwinHelpers.isRangedWeapon
// - elwinHelpers.isRangedAttack
// - elwinHelpers.isRangedWeaponAttack
// - elwinHelpers.isMeleeAttack
// - elwinHelpers.isMeleeWeaponAttack
// - elwinHelpers.isMidiHookStillValid
// - elwinHelpers.getTokenName
// - elwinHelpers.getTokenImage
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
// - elwinHelpers.getAppliedEnchantments
// - elwinHelpers.deleteAppliedEnchantments
// - elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll
// - elwinHelpers.toggleSelfEnchantmentOnUsePostActiveEffects
// - elwinHelpers.getAutomatedEnchantmentSelectedProfile
// - elwinHelpers.applyEnchantmentToItem
// - elwinHelpers.applyEnchantmentToItemFromOtherActivity
// - elwinHelpers.getEquippedMeleeWeapons
// - elwinHelpers.getRules
// - elwinHelpers.registerWorkflowHook
// - elwinHelpers.damageConfig.updateBasic
// - elwinHelpers.damageConfig.updateCustom
// - elwinHelpers.attachToToken
// - elwinHelpers.detachFromToken
// - elwinHelpers.attachToTemplate
// - elwinHelpers.detachFromTemplate
// - elwinHelpers.attachAmbientLightToTemplate
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
//            e.g.: `tpr.isHit.pre`. This macro is called in the triggering workflow (not supported when reactionNone is true). [default false]
//     - post: true or false, indicates if a post reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.post` suffix,
//            e.g.: `tpr.isHit.post`. This macro is called in the triggering workflow (not supported when reactionNone is true). [default false]
//     - reactionNone: true or false, indicates that no reaction activity is associated and that only a macro should be called,
//            its targetOnUse value will be the reaction trigger phase,
//            e.g.: `tpr.isHit`. This macro is called in the triggering workflow. [default false]
//     - range: The maximum range between the owner and the triggering source allowed to trigger the reaction, only used if reactionNone is true.
//     - wallsBlock: true of false, indicates if wallsBlock, only used if reactionNone is true.
//     - disposition: relative disposition of the triggering source compared to the owner, only used if reactionNone is true.
//     - condition: condition to evaluate to trigger the reaction, only used if reactionNone is true.
//
// Example: `ItemMacro,tpr.isDamaged|ignoreSelf=true;canSee=true;pre=true;post=true`
//
// When reactionNone is not true:
// TPR pre macro: It is always called before prompting, it is used to set things or cleanup things, it can also be used to add complex activation condition,
//                if it returnes the object {skip: true}, this reaction will not be prompted. This is called before the prompt in the workflow of the attacker.
// TPR post macro: It is always called after the prompt and execution of the selected reaction even it it was cancelled or a reaction was aborted.
//                 It should be used to cleanup and apply affects on the attacker's workflow if the proper reaction was chosen and was successful.
// When reactionNone is true:
// TPR macro: It should be used to apply affects on the attacker's workflow.
// The pre, post, and reactionNone macros are called in the item use workflow, it means that any changes to the MidiQOL workflow are live. 
// The macro parameters are the same as any macro call with an args[0].tag value of ‘TargetOnUse’.
//
// The TPR pre, reaction and TPR post or TPR reactionNone are all executed in the same phase of the attacker's workflow. For example if tpr.isAttacked,
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
**/

export function runElwinsHelpers() {
  const VERSION = "3.5.7";
  const MACRO_NAME = "elwin-helpers";
  const WORLD_MODULE_ID = "world";
  const MISC_MODULE_ID = "midi-item-showcase-community";
  const active = true;
  const WORKFLOWS = new Map();
  // Note: Needs to be var otherwise its value is not available in the isDebugEnabled function.
  var debug = false;
  let depReqFulfilled = false;

  const TPR_OPTIONS = [
    "triggerSource",
    "ignoreSelf",
    "canSee",
    "pre",
    "post",
    "reactionNone",
    "range",
    "wallsBlock",
    "disposition",
    "condition",
  ];

  /**
   * Third party reaction options.
   * @typedef {object} TprOptions
   * @property {string} triggerSource - The trigger source, allowed values are attacker or target.
   * @property {boolean} ignoreSelf - Flag to indicate if the owner beeing a target, can trigger the reaction or not.
   * @property {boolean} canSee - Flag to indidate if the owner must see the trigger source or not.
   * @property {boolean} pre - Flag to indicate if a pre macro most be called before prompting for reactions, only used if reactionNone is false.
   * @property {boolean} post - Flag to indicate if a post macro most be called after prompting for reactions, only used if reactionNone is false.
   * @property {boolean} reactionNone - Indicates that no reaction activity is associated.
   * @property {number} range - The maximum range between the owner and the triggering source allowed to trigger the reaction, only used if reactionNone is true.
   * @property {boolean} wallsBlock - Flag to indicate if wallsBlock, only used if reactionNone is true.
   * @property {number} disposition - Relative disposition of the triggering source compared to the owner, only used if reactionNone is true.
   * @property {string} condition - Condition to evaluate to trigger the reaction, only used if reactionNone is true.
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
   * @property {boolean} preMacro - Flag to indicate if a pre macro most be called before prompting for reactions, only used if reactionNone is false.
   * @property {boolean} postMacro - Flag to indicate if a post macro most be called after prompting for reactions, only used if reactionNone is false.
   * @property {boolean} reactionNone - Indicates that no reaction activity is associated and only a macro most be called.
   * @property {number} range - The maximum range between the owner and the triggering source allowed to trigger the reaction, only used if reactionNone is true.
   * @property {boolean} wallsBlock - Flag to indicate if wallsBlock, only used if reactionNone is true.
   * @property {number} disposition - Relative disposition of the triggering source compared to the owner, only used if reactionNone is true.
   * @property {string} condition - Condition to evaluate to trigger the reaction, only used if reactionNone is true.
   */

  const dependencies = ["midi-qol"];
  if (
    requirementsSatisfied(MACRO_NAME, dependencies) &&
    foundry.utils.isNewerVersion(game.modules.get("midi-qol")?.version, "12.4.30")
  ) {
    if (!active && game.modules.get(MISC_MODULE_ID)?.active && game.settings.get(MISC_MODULE_ID, "Elwin Helpers")) {
      return;
    }

    depReqFulfilled = true;

    // Set a version to facilitate dependency check
    exportIdentifier("elwinHelpers.version", VERSION);

    setHook("midi-qol.postStart", "handlePostStart", handlePostStart);
    setHook("midi-qol.preValidateRoll", "handlePreValidateRollId", handlePreValidateRoll);
    setHook("midi-qol.preAttackRoll", "handlePreAttackRollId", handlePreAttackRoll);
    setHook("midi-qol.preCheckHits", "handlePreCheckHitsId", handlePreCheckHits);
    setHook("midi-qol.hitsChecked", "handleHitsCheckedId", handleHitsChecked);
    setHook("midi-qol.preDamageRoll", "handlePreDamageRollId", handlePreDamageRoll);
    setHook("midi-qol.preTargetDamageApplication", "handlePreTargetDamageApplId", handlePreTargetDamageApplication);
    setHook("midi-qol.preCheckSaves", "handlePreCheckSavesId", handlePreCheckSaves);
    setHook("midi-qol.postCheckSaves", "handlePostCheckSavesId", handlePostCheckSaves);
    setHook(
      "midi-qol.dnd5ePreCalculateDamage",
      "handleMidiDnd5ePreCalculateDamageId",
      handleMidiDnd5ePreCalculateDamage
    );
    setHook("midi-qol.dnd5eCalculateDamage", "handleMidiDnd5eCalculateDamageId", handleMidiDnd5eCalculateDamage);
    setHook("dnd5e.canEnchant", "handleDnd5eCanEnchant", handleDnd5eCanEnchant);
    setHook(
      "deleteChatMessage",
      "handleDeleteChatMessageForRegisteredWorkflowHooks",
      handleDeleteChatMessageForRegisteredWorkflowHooks
    );
    setHook("midi-qol.postCleanup", "cleanupRegisteredWorkflowHooks", cleanupRegisteredWorkflowHooks);
    setHook("moveToken", "handleMoveToken", handleMoveToken);
    setHook("updateMeasuredTemplate", "handleUpdateMeasuredTemplate", handleUpdateMeasuredTemplate);
    exportIdentifier("elwinHelpers.isDebugEnabled", isDebugEnabled);
    exportIdentifier("elwinHelpers.setDebugEnabled", setDebugEnabled);

    // Note: keep this name to be backward compatible
    exportIdentifier("elwinHelpers.getTargetDivs", getTargetDivs);
    exportIdentifier("elwinHelpers.hasItemProperty", hasItemProperty);
    exportIdentifier("elwinHelpers.reduceAppliedDamage", reduceAppliedDamage);
    exportIdentifier("elwinHelpers.calculateAppliedDamage", calculateAppliedDamage);
    exportIdentifier("elwinHelpers.insertTextIntoMidiItemCard", insertTextIntoMidiItemCard);
    exportIdentifier("elwinHelpers.requirementsSatisfied", requirementsSatisfied);
    exportIdentifier("elwinHelpers.selectTargetsWithinX", selectTargetsWithinX);
    exportIdentifier("elwinHelpers.isWeapon", isWeapon);
    exportIdentifier("elwinHelpers.isMeleeWeapon", isMeleeWeapon);
    exportIdentifier("elwinHelpers.isRangedWeapon", isRangedWeapon);
    exportIdentifier("elwinHelpers.isRangedAttack", isRangedAttack);
    exportIdentifier("elwinHelpers.isRangedWeaponAttack", isRangedWeaponAttack);
    exportIdentifier("elwinHelpers.isMeleeAttack", isMeleeAttack);
    exportIdentifier("elwinHelpers.isMeleeWeaponAttack", isMeleeWeaponAttack);
    exportIdentifier("elwinHelpers.isMidiHookStillValid", isMidiHookStillValid);
    exportIdentifier("elwinHelpers.getTokenName", getTokenName);
    exportIdentifier("elwinHelpers.getTokenImage", getTokenImage);
    exportIdentifier("elwinHelpers.getActorSizeValue", getActorSizeValue);
    exportIdentifier("elwinHelpers.getSizeValue", getSizeValue);
    exportIdentifier("elwinHelpers.buttonDialog", buttonDialog);
    exportIdentifier("elwinHelpers.remoteButtonDialog", remoteButtonDialog);
    exportIdentifier("elwinHelpers.getAttackSegment", getAttackSegment);
    exportIdentifier("elwinHelpers.getMoveTowardsPosition", getMoveTowardsPosition);
    exportIdentifier("elwinHelpers.findMovableSpaceNearDest", findMovableSpaceNearDest);
    exportIdentifier("elwinHelpers.convertCriticalToNormalHit", convertCriticalToNormalHit);
    exportIdentifier("elwinHelpers.adjustAttackRollTargetAC", adjustAttackRollTargetAC);
    exportIdentifier("elwinHelpers.getDamageRollOptions", getDamageRollOptions);
    exportIdentifier("elwinHelpers.getAppliedEnchantments", getAppliedEnchantments);
    exportIdentifier("elwinHelpers.deleteAppliedEnchantments", deleteAppliedEnchantments);
    exportIdentifier(
      "elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll",
      disableManualEnchantmentPlacingOnUsePreItemRoll
    );
    exportIdentifier(
      "elwinHelpers.toggleSelfEnchantmentOnUsePostActiveEffects",
      toggleSelfEnchantmentOnUsePostActiveEffects
    );
    exportIdentifier("elwinHelpers.getAutomatedEnchantmentSelectedProfile", getAutomatedEnchantmentSelectedProfile);
    exportIdentifier("elwinHelpers.applyEnchantmentToItem", applyEnchantmentToItem);
    exportIdentifier("elwinHelpers.applyEnchantmentToItemFromOtherActivity", applyEnchantmentToItemFromOtherActivity);
    exportIdentifier("elwinHelpers.getEquippedMeleeWeapons", getEquippedMeleeWeapons);
    exportIdentifier("elwinHelpers.getRules", getRules);
    exportIdentifier("elwinHelpers.registerWorkflowHook", registerWorkflowHook);
    exportIdentifier("elwinHelpers.damageConfig.updateBasic", updateDamageConfigBasic);
    exportIdentifier("elwinHelpers.damageConfig.updateCustom", updateDamageConfigCustom);
    exportIdentifier("elwinHelpers.attachToToken", attachToToken);
    exportIdentifier("elwinHelpers.detachFromToken", detachFromToken);
    exportIdentifier("elwinHelpers.attachToTemplate", attachToTemplate);
    exportIdentifier("elwinHelpers.detachFromTemplate", detachFromTemplate);
    exportIdentifier("elwinHelpers.attachAmbientLightToTemplate", attachAmbientLightToTemplate);

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
    const hookId = foundry.utils.getProperty(globalThis, `${MACRO_NAME}.${hookNameId}`);
    if (hookId) {
      Hooks.off(hookName, hookId);
    }
    if (active) {
      foundry.utils.setProperty(globalThis, `${MACRO_NAME}.${hookNameId}`, Hooks.on(hookName, hookFunction));
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
      const lastIndex = exportedIdentifierName.lastIndexOf(".");
      if (lastIndex < 0) {
        delete globalThis[exportedIdentifierName];
      } else {
        delete foundry.utils.getProperty(globalThis, exportedIdentifierName.substring(0, lastIndex))[
          exportedIdentifierName.substring(lastIndex + 1)
        ];
      }
    }
    if (active) {
      foundry.utils.setProperty(globalThis, exportedIdentifierName, exportedValue);
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
      const actorOnUseMacros = foundry.utils.getProperty(token.actor ?? {}, "flags.midi-qol.onUseMacroParts");
      if (!actorOnUseMacros) {
        // Skip this actor does not have any on use macros
        continue;
      }
      await registerThirdPartyReactions(
        workflow,
        token,
        actorOnUseMacros.items.filter((m) => m.option.startsWith("tpr."))
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

    await handleThirdPartyReactions(workflow, ["isTargeted"]);
  }

  /**
   * Triggers isPreAttacked third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreAttackRoll(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreAttackRoll.`, workflow);
    }

    await handleThirdPartyReactions(workflow, ["isPreAttacked"]);
  }

  /**
   * Triggers isAttacked third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreCheckHits(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreCheckHits.`, { workflow });
    }

    await handleThirdPartyReactions(workflow, ["isAttacked"]);
  }

  /**
   * Triggers isHit and isMissed third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handleHitsChecked(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handleHitsChecked.`, { workflow });
    }

    await handleThirdPartyReactions(workflow, ["isHit", "isMissed"]);
  }

  /**
   * Triggers isPreDamaged third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePreDamageRoll(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreDamageRoll.`, workflow);
    }

    await handleThirdPartyReactions(workflow, ["isPreDamaged"]);
  }

  /**
   * Triggers isDamaged or isHealed third party reactions.
   *
   * @param {Token5e} target - The target that is damaged/healed.
   * @param {object} options - Options passed by midi qol.
   */
  async function handlePreTargetDamageApplication(target, options) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePreTargetDamageApplication.`, { target, options });
    }
    let healingAdjustedTotalDamage = options?.damageItem?.healingAdjustedTotalDamage ?? 0;

    if (
      options?.damageItem &&
      healingAdjustedTotalDamage !== 0 &&
      (options.workflow.hitTargets.has(target) || options.workflow.hitTargetsEC.has(target) || options.workflow.hasSave)
    ) {
      // Set our own total damage for backward compatibility
      options.damageItem.elwinHelpersEffectiveDamage = healingAdjustedTotalDamage;
      const conditionAttr = "workflow.damageItem?.healingAdjustedTotalDamage";
      if (healingAdjustedTotalDamage > 0) {
        await handleThirdPartyReactions(options.workflow, ["isDamaged"], {
          item: options?.item,
          target,
          extraActivationCond: `${conditionAttr} > 0`,
        });
      } else {
        await handleThirdPartyReactions(options.workflow, ["isHealed"], {
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

    await handleThirdPartyReactions(workflow, ["isPreCheckSave"]);
  }

  /**
   * Triggers isPostCheckSave third party reactions.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handlePostCheckSaves(workflow) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handlePostCheckSaves.`, { workflow });
    }

    await handleThirdPartyReactions(workflow, ["isPostCheckSave"]);
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
    // TODO remove check and property when bug fixed in midi
    if (options.elwinHelpers?.preDamagePreventionCalled) {
      return true;
    }
    while (
      damages.find((di, idx) => {
        if (di.type === "none" && di.active?.DP) {
          damages.splice(idx, 1);
          return true;
        }
        return false;
      })
    );
    foundry.utils.setProperty(options, "elwinHelpers.preDamagePreventionCalled", true);
    return true;
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
    // Note: remove when bug in midi is fixed
    if (!options.elwinHelpers?.preDamagePreventionCalled) {
      handleMidiDnd5ePreCalculateDamage(actor, damages, options);
    }
    // compute total damage applied to target
    let { healingAdjustedTotalDamage } = getEffectiveDamage(damages);

    if (healingAdjustedTotalDamage <= 0) {
      // No damage to prevent, do nothing
      return true;
    }
    const damagePrevention = Math.min(options.elwinHelpers.damagePrevention, healingAdjustedTotalDamage);
    if (damagePrevention) {
      damages.push({
        type: "none",
        value: -damagePrevention,
        active: { DP: true, multiplier: 1 },
        properties: new Set(),
      });
    }
    return true;
  }

  /**
   * Handles the dnd5e can enchant hook. It allows to check extra conditions not supported by dnd5e enchantment restrictions.
   *
   * @param {Activity} activity - The enchantment activity.
   * @param {Item5e} item - The item being enchanted.
   * @param {object[]} errors - The errors.
   */
  function handleDnd5eCanEnchant(activity, item, errors) {
    if (debug) {
      console.warn(`${MACRO_NAME} | handleDnd5eCanEnchant`, { activity, item, errors });
    }
    const enchantmentEffect = activity.effects?.[0]?.effect;
    if (!enchantmentEffect) {
      return;
    }
    const extraRestictions = getEchantmentEffectExtraRestrictions(enchantmentEffect);
    if (!extraRestictions?.length) {
      return;
    }
    const conditionData = MidiQOL.createConditionData({ item });
    for (let extraRestiction of extraRestictions) {
      const returnValue = MidiQOL.evalCondition(extraRestiction.condition, conditionData, {
        errorReturn: false,
        async: false,
      });
      if (!returnValue) {
        errors.push(
          new game.system.dataModels.item.EnchantmentError(extraRestiction.conditionMsg ?? extraRestiction.condition)
        );
        if (debug) {
          console.warn(`${MACRO_NAME} | Extra enchantment restriction condition was not fulfilled.`, {
            condition: extraRestiction.condition,
            conditionData,
            returnValue,
          });
        }
      }
    }
  }

  /**
   * Handles the updateToken hook. Updates position of attached entities when the token is moved.
   *
   * @param {TokenDocument} tokenDocument - The existing Token Document which was moved.
   * @param {object} movement - The movement data.
   * @param {Partial<DatabaseUpdateOperation>} options - Additional options which modified the move token.
   * @param {User} user -The User who triggered the move.
   */
  async function handleMoveToken(tokenDocument, movement, options, user) {
    if (!game.user.isActiveGM) {
      return;
    }
    if (!tokenDocument.actor) {
      return;
    }
    if (tokenDocument.actor.type === "group") {
      return;
    }
    if (tokenDocument.parent.id != canvas.scene.id) {
      return;
    }
    const previousCoords = foundry.utils.duplicate(movement.origin);
    const coords = foundry.utils.duplicate(movement.destination);
    if (!previousCoords) {
      return;
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | updateToken`, { tokenDocument, movement, options, user });
    }

    const delta = {
      x: coords.x - previousCoords.x,
      y: coords.y - previousCoords.y,
      elevation: coords.elevation - previousCoords.elevation,
    };

    let moduleId = WORLD_MODULE_ID;
    let attachedEntityUuids = tokenDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    if (!attachedEntityUuids.length) {
      moduleId = MISC_MODULE_ID;
      attachedEntityUuids = tokenDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    }
    if (!attachedEntityUuids.length) {
      return;
    }
    let removedEntityUuids = [];
    await Promise.all(
      attachedEntityUuids.map(async (entityUuid) => {
        let entity = await fromUuid(entityUuid);
        if (!entity) {
          removedEntityUuids.push(entityUuid);
        } else {
          await entity.update({
            x: entity.x + delta.x,
            y: entity.y + delta.y,
            elevation: entity.elevation + delta.elevation,
          });
        }
      })
    );
    if (removedEntityUuids.length) {
      await tokenDocument.setFlag(
        moduleId,
        "attached.attachedEntityUuids",
        attachedEntityUuids.filter((i) => !removedEntityUuids.includes(i))
      );
    }
  }

  /**
   * Handles the updateMeasuredTemplate hook. Updates position of attached entities when the template is moved.
   *
   * @param {MeasuredTemplateDocument} templateDocument - The existing Template Document which was updated.
   * @param {object} changed - The changes applied.
   * @param {Partial<DatabaseUpdateOperation>} options - Additional options which modified the template.
   * @param {string} userId -The User ID who triggered the update.
   */
  async function handleUpdateMeasuredTemplate(templateDocument, changed, options, userId) {
    if (!game.user.isActiveGM) {
      return;
    }
    if (
      !(
        Object.hasOwn(changed, "x") ||
        Object.hasOwn(changed, "y") ||
        Object.hasOwn(changed, "elevation") ||
        Object.hasOwn(changed, "rotation") ||
        Object.hasOwn(changed, "distance")
      )
    ) {
      return;
    }
    if (templateDocument.t !== "circle") {
      // For now we only support attachment to circle templates
      return;
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | updateMeasuredTemplate`, { templateDocument, changed, options, userId });
    }

    let moduleId = WORLD_MODULE_ID;
    let attachedEntityUuids = templateDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    let synchedEntityUuids = templateDocument.flags[moduleId]?.attached?.synchedEntityUuids ?? [];
    if (!attachedEntityUuids.length) {
      moduleId = MISC_MODULE_ID;
      attachedEntityUuids = templateDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
      synchedEntityUuids = templateDocument.flags[moduleId]?.attached?.synchedEntityUuids ?? [];
    }
    if (!attachedEntityUuids.length) {
      return;
    }
    let removedEntityUuids = [];
    await Promise.all(
      attachedEntityUuids.map(async (entityUuid) => {
        let entity = await fromUuid(entityUuid);
        if (!entity) {
          removedEntityUuids.push(entityUuid);
        } else {
          const updates = {
            x: templateDocument.x,
            y: templateDocument.y,
            elevation: templateDocument.elevation,
            rotation: templateDocument.rotation,
          };
          if (synchedEntityUuids.includes(entityUuid)) {
            if (entity instanceof AmbientLightDocument) {
              if (entity.config.dim > 0) {
                foundry.utils.setProperty(updates, "config.dim", templateDocument.distance);
                if (entity.config.bright > 0) {
                  foundry.utils.setProperty(
                    updates,
                    "config.bright",
                    (entity.config.bright / entity.config.dim) * templateDocument.distance
                  );
                }
              } else if (entity.config.bright > 0) {
                foundry.utils.setProperty(updates, "config.bright", templateDocument.distance);
              }
            }
          }
          await entity.update(updates);
        }
      })
    );
    if (removedEntityUuids.length) {
      await templateDocument.setFlag(moduleId, "attached", {
        attachedEntityUuids: attachedEntityUuids.filter((i) => !removedEntityUuids.includes(i)),
        synchedEntityUuids: synchedEntityUuids.filter((i) => !removedEntityUuids.includes(i)),
      });
    }
  }

  /**
   * Replaces an activity consumption target, if it's an identifier, by the id of the corresponding item on the owner if found.
   * @param {string} handlerName - Name of the calling function.
   * @param {Item5e} item - The item to be updated or created.
   * @param {object|Activity} activityOrData - The activity or activity data to update.
   * @param {boolean} isData - Flag to indicate if the object received was an Activity data or an Activity class.
   * @returns {object} The activity data if it was updated, null otherwise.
   */
  function replaceActivityConsumptionTargetIdentifierById(handlerName, item, activityOrData, isData) {
    let index = 0;
    let activityData = undefined;
    let activityUuid = undefined;
    for (let target of activityOrData.consumption.targets ?? []) {
      if (
        !target.target ||
        !["itemUses", "material"].includes(target.type) ||
        target.target.includes(".") ||
        item.actor.items?.get(target.target)
      ) {
        // Consumption not refering an item, contains a UUID or contains a valid item ID.
        index++;
        continue;
      }
      // Support DDBI legacy suffix
      const itemIdent = target.target;
      const itemIdentLegacy = itemIdent + "-legacy";
      const useItem = item.actor.items?.find(
        (i) => (i.identifier === itemIdent || i.identifier === itemIdentLegacy) && i.system.uses?.max
      );
      if (!useItem) {
        // Could not find an item with the referred identifier having uses.
        index++;
        console.warn(
          `${MACRO_NAME} | Adjust consumption target: Could not find an item with configured uses having identifier '${target.target}' from item ${item.id} on actor ${item.actor.uuid}`
        );
        continue;
      }
      if (isData) {
        activityData = activityOrData;
        activityUuid ??= item.system?.activities?.get(activityOrData._id)?.uuid;
      } else if (!activityData) {
        activityData = activityOrData.toObject();
        activityUuid ??= activityOrData.uuid;
      }
      activityData.consumption.targets[index].target = useItem.id;
      if (debug) {
        console.warn(
          `${MACRO_NAME} | ${handlerName}: updated item activity consumption target from '${target.target}' to ${useItem.id} for path: ${activityUuid}.consumption.targets[${index}].target.`
        );
      }
      index++;
    }
    return activityData;
  }

  /**
   * Returns the extra restrictions condition and message.
   * @param {ActiveEffect} enchantmentEffect
   * @returns {{condition: string, conditionMSg: string}} the condition and associated condition message.
   */
  function getEchantmentEffectExtraRestrictions(enchantmentEffect) {
    const partialFlag = "elwinHelpers.extraEnchantRestrictions";
    const conditionKeyRex = new RegExp(
      `^flags.(${WORLD_MODULE_ID}|${MISC_MODULE_ID}).${partialFlag}.(?<position>\\d{1,2}).condition$`
    );
    const conditionMsgKeyRex = new RegExp(
      `^flags.(${WORLD_MODULE_ID}|${MISC_MODULE_ID}).${partialFlag}.(?<position>\\d{1,2}).conditionMsg$`
    );
    const extraRestrictions = new Map();

    for (let change of enchantmentEffect?.changes ?? []) {
      let match = conditionKeyRex.exec(change.key);
      if (match?.groups?.position) {
        const index = Number(match?.groups?.position);
        const condition = change.value;
        if (!extraRestrictions.get(index)) {
          extraRestrictions.set(index, { condition });
        } else {
          extraRestrictions.get(index).condition = condition;
        }
      } else {
        match = conditionMsgKeyRex.exec(change.key);
        if (match?.groups?.position) {
          const index = Number(match?.groups?.position);
          const conditionMsg = change.value;
          if (!extraRestrictions.get(index)) {
            extraRestrictions.set(index, { conditionMsg });
          } else {
            extraRestrictions.get(index).conditionMsg = conditionMsg;
          }
        }
      }
    }
    const sortKeys = (a, b) => a[0] - b[0];
    return [...extraRestrictions.entries()]
      .filter((entry) => entry[1]?.condition !== undefined)
      .sort(sortKeys)
      .map((entry) => entry[1]);
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
    const { user, reactionTriggerName, triggerToken, triggerItem, reactionToken, roll, showReactionAttackRoll } = data;

    let reactionFlavor = "Unknow reaction trigger!";
    switch (reactionTriggerName) {
      case "isPreAttacked":
      case "preAttack":
        reactionFlavor = "{actorName} is about to be attacked by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isAttacked":
        reactionFlavor = "{actorName} is attacked by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isPreDamaged":
        reactionFlavor = "{actorName} is about to be damaged by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isDamaged":
      case "preTargetDamageApplication":
        reactionFlavor = "{actorName} is damaged by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isHealed":
        reactionFlavor = "{actorName} is healed by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isTargeted":
      case "prePreambleComplete":
        reactionFlavor = "{actorName} is targeted by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isMissed":
        reactionFlavor = "{actorName} is missed by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isCriticalHit":
        reactionFlavor = "{actorName} is critically hit by {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isFumble":
        reactionFlavor =
          "{actorName} is attacked by {itemName} which fumbled and {reactionActorName} can use a reaction";
        break;
      case "preTargetSave":
      case "isAboutToSave":
      case "isPreCheckSave":
      case "isPostCheckSave":
        reactionFlavor = "{actorName} must save because of {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isSaveSuccess":
        reactionFlavor =
          "{actorName} succeeded on a save because of {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isSaveFailure":
        reactionFlavor =
          "{actorName} failed on a save because of {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isMoved":
        reactionFlavor = "{actorName} is moved and {reactionActorName} can use a reaction";
        break;
      case "postTargetEffectApplication":
        reactionFlavor =
          "{actorName} has been applied effects because of {itemName} and {reactionActorName} can use a reaction";
        break;
      case "isHit":
      default:
        reactionFlavor = "{actorName} is hit by {itemName} and {reactionActorName} can use a reaction";
        break;
    }
    reactionFlavor = game.i18n.format(reactionFlavor, {
      itemName: triggerItem?.name ?? "unknown",
      actorName: getTokenPlayerName(user, triggerToken, user?.isGM),
      reactionActorName: reactionToken?.name ?? "unknown",
    });

    //{none: 'Attack Hits', d20: 'd20 roll only', all: 'Attack Roll Total', allCrit: 'Attack Roll Total + Critical'}
    if (["isHit", "isMissed", "isCrit", "isFumble", "isAttacked"].includes(reactionTriggerName)) {
      const showAttackRoll = showReactionAttackRoll ?? MidiQOL.configSettings().showReactionAttackRoll;
      const rollOptions = getI18nOptions("ShowReactionAttackRollOptions");
      switch (showAttackRoll) {
        case "all":
          reactionFlavor = `${reactionFlavor} - ${rollOptions.all} ${roll?.total ?? ""}`;
          break;
        case "allCrit": {
          const criticalString = roll?.isCritical
            ? `<span style="color: green">(${getI18n("DND5E.Critical")})</span>`
            : "";
          reactionFlavor = `${reactionFlavor} - ${rollOptions.all} ${roll?.total ?? ""} ${criticalString}`;
          break;
        }
        case "d20": {
          const theRoll = roll?.terms[0]?.results
            ? roll.terms[0].results.find((r) => r.active)?.result ?? roll.terms[0]?.total ?? ""
            : roll?.terms[0]?.total ?? "";
          reactionFlavor = `${reactionFlavor} ${rollOptions.d20} ${theRoll}`;
          break;
        }
        default:
      }
    }
    if (["isPostCheckSave"].includes(reactionTriggerName)) {
      // Note: we use the same config as the attack to determine is the TPR owner can see of the Roll.
      const showAttackRoll = showReactionAttackRoll ?? MidiQOL.configSettings().showReactionAttackRoll;
      const rollOptions = getI18nOptions("ShowReactionAttackRollOptions");
      switch (showAttackRoll) {
        case "all":
        case "allCrit":
          reactionFlavor = `${reactionFlavor} - ${rollOptions.all} ${roll?.total ?? ""}`;
          break;
        case "d20": {
          const theRoll = roll?.terms[0]?.results
            ? roll.terms[0].results.find((r) => r.active)?.result ?? roll.terms[0]?.total ?? ""
            : roll?.terms[0]?.total ?? "";
          reactionFlavor = `${reactionFlavor} ${rollOptions.d20} ${theRoll}`;
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
    options ??= {};
    if (!workflow || !(MidiQOL.configSettings().allowUseMacro && !workflow.workflowOptions?.noTargetOnuseMacro)) {
      return;
    }

    for (let trigger of triggerList) {
      // Add Third Party Reactions trigger prefix
      trigger = "tpr." + trigger;
      for (let tokenUuid of Object.keys(workflow.thirdPartyReactions ?? {})) {
        const tokenReactionsInfo = workflow.thirdPartyReactions[tokenUuid];
        await handleThirdPartyReactionsForToken(workflow, trigger, tokenUuid, tokenReactionsInfo, options);
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
      (reactionData) => trigger === reactionData.targetOnUse && reactionData.item.uuid !== workflow.itemUuid
    );
    if (!filteredReactions.length) {
      return;
    }

    const reactionToken = fromUuidSync(reactionTokenUuid)?.object;
    if (!reactionToken) {
      console.warn(`${MACRO_NAME} | Missing reaction token.`, reactionTokenUuid);
      return;
    }

    const reactionActor = reactionToken.actor;
    if (!reactionActor?.flags) {
      console.warn(`${MACRO_NAME} | Missing reaction actor or actor flags.`, reactionToken);
      return;
    }

    const atLeastOneReactionNone = filteredReactions.some((reactionData) => reactionData.reactionNone);

    // Check and terminate early for this actor, but only if there aren't any reactionNone
    if (!atLeastOneReactionNone && MidiQOL.checkRule("incapacitated") && MidiQOL.checkIncapacitated(reactionActor)) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Actor is incapacitated.`, reactionActor);
      }
      return;
    }

    // Copied from midi-qol because this utility function is not exposed
    function getReactionSetting(user) {
      if (!user) {
        return "none";
      }
      return user.isGM ? MidiQOL.configSettings().gmDoReactions : MidiQOL.configSettings().doReactions;
    }

    // Check and terminate early for this actor, but only if there aren't any reactionNone
    // If the target is associated to a GM user roll item in this client, otherwise send the item roll to user's client
    let player = MidiQOL.playerForActor(reactionActor);
    if (!atLeastOneReactionNone && getReactionSetting(player) === "none") {
      if (debug) {
        console.warn(`${MACRO_NAME} | Reaction settings set to none for player.`, player);
      }
      return;
    }

    if (!player?.active) {
      // Find first active GM player
      player = game.users?.activeGM;
    }
    if (!player?.active) {
      console.warn(`${MACRO_NAME} | No active player or GM for actor.`, reactionActor);
      return;
    }

    const regTrigger = trigger.replace("tpr.", "");
    const maxCastLevel = maxReactionCastLevel(reactionActor);

    let targets;
    let triggerItem = workflow.item;
    let roll = workflow.attackRoll;

    switch (regTrigger) {
      case "isHealed":
      case "isDamaged":
        targets = options.target ? [options.target] : [];
        break;
      case "isHit":
      case "isPreDamaged":
      case "isPreCheckSave":
      case "isPostCheckSave":
        targets = [...workflow.hitTargets, ...workflow.hitTargetsEC];
        break;
      case "isMissed":
        targets = [...workflow.targets.difference(workflow.hitTargets).difference(workflow.hitTargetsEC)];
        break;
      case "isTargeted":
      case "isPreAttacked":
      case "isAttacked":
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
      // Check and terminate early for this actor, but only if there aren't any reactionNone
      // Check each call after first in case the status changed or the reaction was used
      let reactionUsed = MidiQOL.hasUsedReaction(reactionActor);
      if (!first && !atLeastOneReactionNone) {
        if (MidiQOL.checkRule("incapacitated") && MidiQOL.checkIncapacitated(reactionActor)) {
          if (debug) {
            console.warn(`${MACRO_NAME} | Actor is incapacitated.`, reactionActor);
          }
          return;
        }
      }
      if (["isPostCheckSave"].includes(regTrigger)) {
        roll = workflow.saveRolls?.find((r) => r.data.tokenUuid === target.document.uuid);
      }
      const tmpFilteredReactions = [];
      for (let reactionData of filteredReactions) {
        const allowedActivities = [];
        let skipReactionActivities = false;
        // Check conditions that were skipped due to having at least one reactionNone
        // This will allow to only skip activities
        if (atLeastOneReactionNone) {
          if (MidiQOL.checkRule("incapacitated") && MidiQOL.checkIncapacitated(reactionActor)) {
            if (debug) {
              console.warn(`${MACRO_NAME} | Actor is incapacitated.`, reactionActor);
            }
            skipReactionActivities = true;
          }
          if (getReactionSetting(player) === "none") {
            if (debug) {
              console.warn(`${MACRO_NAME} | Reaction settings set to none for player.`, player);
            }
            skipReactionActivities = true;
          }
        }
        for (let activity of skipReactionActivities ? [] : reactionData.activities) {
          if (
            await canTriggerReactionActivity(
              workflow,
              triggerItem,
              reactionToken,
              tokenReactionsInfo,
              target,
              reactionData,
              activity,
              reactionUsed,
              maxCastLevel,
              options
            )
          ) {
            allowedActivities.push(activity);
          }
        }
        reactionData.allowedActivities = allowedActivities;
        let reactionDataAllowed = !!reactionData.allowedActivities.length;
        if (reactionData.reactionNone) {
          reactionDataAllowed = await canTriggerReactionActivity(
            workflow,
            triggerItem,
            reactionToken,
            tokenReactionsInfo,
            target,
            reactionData,
            null,
            reactionUsed,
            maxCastLevel,
            options
          );
        }
        if (reactionDataAllowed) {
          tmpFilteredReactions.push(reactionData);
        }
      }
      filteredReactions = tmpFilteredReactions;
      await callReactionsForToken(workflow, reactionToken, player, trigger, target, filteredReactions, roll, options);
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
   * @param {Activity} activity - The activity from the reaction data to test, null if reactionData.reactionNone is true.
   * @param {boolean} reactionUsed - If the actor has already used a reaction.
   * @param {number} maxCastLevel - Maximum cast level allowed for reaction spells.
   * @param {object} options - Options that can be used in the different validations.
   * @param {string} options.extraActivationCond - Extra activation condition to be evaluated.
   *
   * @returns {boolean} true if the reaction can be triggered, false otherwise.
   */
  async function canTriggerReactionActivity(
    workflow,
    triggerItem,
    reactionToken,
    tokenReactionsInfo,
    target,
    reactionData,
    activity,
    reactionUsed,
    maxCastLevel,
    options = {}
  ) {
    const self = reactionToken.document?.uuid === target.document?.uuid;

    // Check self condition
    if (reactionData.ignoreSelf && self) {
      if (debug) {
        console.warn(`${MACRO_NAME} | canTriggerReaction- ${reactionData.item.name}: self not allowed.`);
      }
      return false;
    }

    const triggerToken = reactionData.triggerSource === "attacker" ? workflow.token : target;

    // Check allowed disposition condition
    let allowedDisposition;
    const disposition = getReactionDisposition(reactionData, activity);
    if (disposition) {
      allowedDisposition = reactionToken.document.disposition * disposition;
    }
    if (disposition && allowedDisposition !== triggerToken.document.disposition) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | canTriggerReactionActivity - ${reactionData.item.name}-${
            activity?.name ?? ""
          }: disposition not allowed.`,
          {
            allowedDisposition,
            triggerTokenDisp: triggerToken.document.disposition,
          }
        );
      }
      return false;
    }

    // Check range condition
    const range = getReactionRange(reactionData, activity);
    if (range) {
      const tmpDist = MidiQOL.computeDistance(reactionToken, triggerToken, { wallsBlock: range.wallsBlock });
      if (tmpDist < 0 || tmpDist > range.value) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${activity?.name ?? ""}: invalid distance.`,
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
    if (reactionData.triggerSource === "attacker") {
      canSeeTriggerSource = tokenReactionsInfo.canSeeAttacker ??= MidiQOL.canSee(reactionToken, workflow.token);
    } else {
      if (!tokenReactionsInfo.canSeeTargets?.has(target)) {
        (tokenReactionsInfo.canSeeTargets ??= new Map()).set(target, MidiQOL.canSee(reactionToken, target));
      }
      canSeeTriggerSource = tokenReactionsInfo.canSeeTargets.get(target);
    }

    if (!self && reactionData.canSee && !canSeeTriggerSource) {
      if (debug) {
        console.warn(
          `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${
            activity?.name ?? ""
          }: can't see trigger token.`
        );
      }
      return false;
    }

    if (!reactionData.reactionNone && !(await checkActivityUsage(activity, maxCastLevel, reactionUsed))) {
      return false;
    }

    const reactionCondition = reactionData.reactionNone ? reactionData.condition : activity?.reactionCondition;
    if (!reactionCondition && !options?.extraActivationCond) {
      return true;
    }

    const extraData = {
      reaction: reactionData.targetOnUse,
      tpr: {
        item: reactionData.item?.getRollData()?.item ?? {},
        activity: activity,
        actor: reactionToken?.actor.getRollData() ?? {},
        actorId: reactionToken?.actor?.id,
        actorUuid: reactionToken?.actor?.uuid,
        tokenId: reactionToken?.id,
        tokenUuid: reactionToken?.document.uuid,
        canSeeTriggerSource,
        get isMeleeAttack() {
          return isMeleeAttack(workflow.activity, workflow.token, target, workflow.attackMode);
        },
        get isMeleeWeaponAttack() {
          return isMeleeWeaponAttack(workflow.activity, workflow.token, target, workflow.attackMode);
        },
        get isRangedAttack() {
          return isRangedAttack(workflow.activity, workflow.token, target, workflow.attackMode);
        },
        get isRangedWeaponAttack() {
          return isRangedWeaponAttack(workflow.activity, workflow.token, target, workflow.attackMode);
        },
      },
    };

    // Check extra activation condition for this trigger
    if (options?.extraActivationCond) {
      const returnValue = evalReactionActivationCondition(workflow, options.extraActivationCond, target, {
        item: triggerItem,
        extraData,
      });
      if (!returnValue) {
        if (debug) {
          console.warn(
            `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${
              activity?.name ?? ""
            }: extra activation condition not met.`,
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
          `${MACRO_NAME} | Filter reaction for ${reactionToken.name} ${reactionData.item.name}-${
            activity?.name ?? ""
          } using condition ${reactionCondition}`,
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
            `${MACRO_NAME} | canTriggerReaction - ${reactionData.item.name}-${
              activity?.name ?? ""
            }: reaction condition not met.`,
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
   * @param {ReactionData} reactionData - The reaction data for which to retrieve the disposition.
   * @param {Activity} activity - The activity for which to retrieve the disposition.
   *
   * @returns {number} the relative disposition compared to the trigger source.
   */
  function getReactionDisposition(reactionData, activity) {
    if (reactionData.reactionNone) {
      return reactionData.disposition;
    }
    const targetType = foundry.utils.getProperty(activity, "target.affects.type");
    if (targetType === "ally") {
      return CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    } else if (targetType === "enemy") {
      return CONST.TOKEN_DISPOSITIONS.HOSTILE;
    }
    return undefined;
  }

  /**
   * Returns the range data if any found for the specified activity.
   *
   * @param {ReactionData} reactionData - The reaction data for which to retrieve the range.
   * @param {Activity} activity - The activity for which to retrieve the range.
   *
   * @returns {{value: number, wallsBlock: {boolean}}} range data for the specified activity,
   * the data is composed of a value which is the range and wallsBlock, a boolean to indicate
   * if walls should block or not the distance computation.
   */
  function getReactionRange(reactionData, activity) {
    const range = {};
    if (reactionData.reactionNone) {
      range.value = reactionData.range;
      range.wallsBlock = reactionData.wallsBlock;
    } else {
      range.value = getRangeFromActivity(activity);
      range.wallsBlock = !foundry.utils.getProperty(activity, "midiProperties.ignoreFullCover");
    }
    return range?.value !== undefined || range?.value == null ? range : undefined;
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
    if (activity?.range?.value === null || activity?.range?.value === undefined) {
      return undefined;
    }
    let range = activity.range.value;
    if (activity.range.units) {
      switch (activity.range.units) {
        case "mi": // miles - assume grid units are feet or miles - ignore furlongs/chains whatever
          if (["feet", "ft"].includes(canvas?.scene?.grid.units?.toLocaleLowerCase())) {
            range *= 5280;
          } else if (["yards", "yd", "yds"].includes(canvas?.scene?.grid.units?.toLocaleLowerCase())) {
            range *= 1760;
          }
          break;
        case "km": // kilometeres - assume grid units are meters or kilometers
          if (["meter", "m", "meters", "metre", "metres"].includes(canvas?.scene?.grid.units?.toLocaleLowerCase())) {
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
  function evalReactionActivationCondition(workflow, condition, target, options = {}) {
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
    if (condition === undefined || condition === "") {
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
    const returnValue = MidiQOL.evalCondition(condition, workflow.conditionData, options);
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
      case "SECRET".toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.SECRET;
      case "HOSTILE".toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.HOSTILE;
      case "NEUTRAL".toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.NEUTRAL;
      case "FRIENDLY".toLocaleLowerCase():
        return CONST.TOKEN_DISPOSITIONS.FRIENDLY;
      case "all":
        return null;
    }
    const validStrings = ["-2", "-1", "0", "1", "FRIENDLY", "HOSTILE", "NEUTRAL", "SECRET", "all"];
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
    const reactionsByAttacker = reactions.filter((reactionData) => reactionData.triggerSource === "attacker");
    if (reactionsByAttacker.length) {
      reactionsByTriggerSources.push(reactionsByAttacker);
    }
    const reactionsByTarget = reactions.filter((reactionData) => reactionData.triggerSource === "target");
    if (reactionsByTarget.length) {
      reactionsByTriggerSources.push(reactionsByTarget);
    }

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
              console.warn(`${MACRO_NAME} | calling Third Party Reaction pre macro.`, {
                workflow,
                reactionData,
                reactionTrigger,
                preReactionOptions,
              });
            }
            preReactionOptions.thirdPartyReactionActivities = reactionData.allowedActivities.map((a) => a.uuid);

            let [result] = await workflow.callMacros(
              workflow.item,
              reactionData.macroName,
              "TargetOnUse",
              reactionTrigger + ".pre",
              preReactionOptions
            );
            if (result?.skip) {
              if (result.activities?.length) {
                const toRemove = new Set(result.activities);
                validReactionActivities.push(...reactionData.allowedActivities.filter((a) => !toRemove.has(a)));
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

      let result = { name: "None", uuid: undefined };
      try {
        if (!validReactionActivities.length) {
          continue;
        }
        // Note: there is a bug in utils.js that put targetConfirmation but not at the workflowOptions level, remove when fixed (see reactionDialog)
        const reactionActivityUuids = validReactionActivities.map((a) => a.uuid);
        const reactionOptions = foundry.utils.mergeObject(
          {
            itemUuid: options?.item?.uuid ?? workflow.itemUuid,
            thirdPartyReaction: {
              trigger: reactionTrigger,
              activityUuids: reactionActivityUuids,
            },
            workflowOptions: { targetConfirmation: "none" },
          },
          options?.reactionOptions ?? {}
        );
        let reactionTargetUuid;
        foundry.utils.setProperty(reactionOptions.thirdPartyReaction, "triggerSource", triggerSource);
        if (triggerSource === "attacker") {
          foundry.utils.setProperty(reactionOptions.thirdPartyReaction, "targetUuid", target.document.uuid);
          reactionTargetUuid = workflow.tokenUuid;
        } else {
          foundry.utils.setProperty(reactionOptions.thirdPartyReaction, "attackerUuid", workflow.tokenUuid);
          reactionTargetUuid = target.document.uuid;
        }

        const data = {
          tokenUuid: reactionToken.document.uuid,
          reactionActivityList: reactionActivityUuids,
          triggerTokenUuid: reactionTargetUuid,
          reactionFlavor: getReactionFlavor({
            user,
            reactionTriggerName: reactionTrigger.replace("tpr.", ""),
            triggerToken: target,
            triggerItem: workflow.item,
            reactionToken,
            roll,
          }),
          triggerType: "reaction",
          options: reactionOptions,
        };

        result = await MidiQOL.socket().executeAsUser("chooseReactions", user.id, data);
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
            // TODO only call if reaction chosen or has preMacro or reactionNone
            if (reactionData.macroName && (reactionData.postMacro || reactionData.reactionNone)) {
              if (debug) {
                console.warn(`${MACRO_NAME} | calling Third Party Reaction post or reactionNone macro.`, {
                  workflow,
                  reactionData,
                  reactionTrigger,
                  postReactionOptions,
                });
              }
              await workflow.callMacros(
                workflow.item,
                reactionData.macroName,
                "TargetOnUse",
                reactionTrigger + (!reactionData.reactionNone ? ".post" : ""),
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
    if (game.modules.get("anonymous")?.active) {
      const api = game.modules.get("anonymous")?.api;
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
    const gmText = textTemplate.replace("${tokenName}", getTokenName(targetToken));
    const targetName = MidiQOL.getTokenPlayerName(targetToken);
    const playerText = textTemplate.replace("${tokenName}", targetName);
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
    return item?.system?.properties?.has(propName);
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
      console.warn(`${MACRO_NAME} | Only greater than 0 damage prevention is supported.`, {
        damageItem,
        preventedDmg,
        sourceItem,
      });
      return;
    }
    const currentDamagePrevention =
      foundry.utils.getProperty(damageItem.calcDamageOptions, "elwinHelpers.damagePrevention") ?? 0;
    foundry.utils.setProperty(
      damageItem.calcDamageOptions,
      "elwinHelpers.damagePrevention",
      currentDamagePrevention + preventedDmg
    );
    const actor = fromUuidSync(damageItem.actorUuid);
    damageItem.damageDetail = actor?.calculateDamage(damageItem.rawDamageDetail, damageItem.calcDamageOptions);
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
    if (!damageItem?.damageDetail) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Missing damaged item.`, { damageItem });
      }
      return;
    }
    let { damage: totalDamage, temp, healingAdjustedTotalDamage } = getEffectiveDamage(damageItem?.damageDetail);

    const actor = fromUuidSync(damageItem.actorUuid);
    const as = actor?.system;
    if (!as || !as.attributes.hp) {
      if (debug) {
        console.warn(`${MACRO_NAME} | Missing damaged actor or hp attribute.`, { damageItem });
      }
      return;
    }
    let effectiveTemp = as.attributes.hp.temp ?? 0;
    const deltaTemp = healingAdjustedTotalDamage > 0 ? Math.min(effectiveTemp, healingAdjustedTotalDamage) : 0;
    const deltaHP = Math.clamp(
      healingAdjustedTotalDamage - deltaTemp,
      -as.attributes.hp.damage,
      as.attributes.hp.value
    );
    const oldTempHP = as.attributes.hp.temp ?? 0;
    const newTempHP = Math.floor(Math.max(0, effectiveTemp - deltaTemp, temp));

    damageItem.oldHP = as.attributes.hp.value;
    damageItem.newHP = as.attributes.hp.value - deltaHP;
    damageItem.oldTempHP = oldTempHP;
    damageItem.newTempHP = newTempHP;
    damageItem.hpDamage = deltaHP;
    damageItem.tempDamage = oldTempHP - newTempHP;
    damageItem.totalDamage = totalDamage;
    damageItem.healingAdjustedTotalDamage = healingAdjustedTotalDamage;
    damageItem.elwinHelpersEffectiveDamage = healingAdjustedTotalDamage;
  }

  function getEffectiveDamage(damages) {
    if (!damages) {
      return { damage: undefined, temp: undefined, healing: undefined, healingAdjustedTotalDamage: undefined };
    }
    let { damage, temp, healing } = damages.reduce(
      (acc, d) => {
        if (d.type === "temphp") acc.temp += d.value;
        else if (d.type === "healing") acc.healing += d.value;
        else if (d.type !== "midi-none") acc.damage += d.value;
        return acc;
      },
      { damage: 0, temp: 0, healing: 0 }
    );

    // Adjust damage
    if (damage < 0) damage = 0;
    let healingAdjustedTotalDamage = damage + healing;
    healingAdjustedTotalDamage =
      healingAdjustedTotalDamage < 0 ? Math.ceil(healingAdjustedTotalDamage) : Math.floor(healingAdjustedTotalDamage);
    return { damage, temp, healing, healingAdjustedTotalDamage };
  }

  /**
   * Returns true if the item is a ramged weapon.
   *
   * @param {Item5e} item - The item used.
   *
   * @returns {boolean} true if the item is a ranged weapon, false otherwise.
   */
  function isWeapon(item) {
    return item?.type === "weapon" && ["simpleM", "martialM", "simpleR", "martialR"].includes(item?.system.type?.value);
  }

  /**
   * Returns true if the item is a melee weapon.
   *
   * @param {Item5e} item - The item used.
   *
   * @returns {boolean} true if the item is a melee weapon, false otherwise.
   */
  function isMeleeWeapon(item) {
    return item?.type === "weapon" && ["simpleM", "martialM"].includes(item?.system.type?.value);
  }

  /**
   * Returns true if the item is a ramged weapon.
   *
   * @param {Item5e} item - The item used.
   *
   * @returns {boolean} true if the item is a ranged weapon, false otherwise.
   */
  function isRangedWeapon(item) {
    return item?.type === "weapon" && ["simpleR", "martialR"].includes(item?.system.type?.value);
  }

  /**
   * Returns true if the attack is a melee attack. It also handle the case of weapons with the thrown property.
   *
   * @param {Activity|Item5e} activityOrItem - The activity or item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {string} attackMode - The attack mode selected for the attack activity, if empty uses activity's default.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a melee weapon attack, false otherwise.
   */
  function isMeleeAttack(activityOrItem, sourceToken, targetToken, attackMode = "", checkThrownWeapons = true) {
    return isMeleeAttackByClassification(
      null,
      null,
      activityOrItem,
      sourceToken,
      targetToken,
      attackMode,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is a melee weapon attack. It also handle the case of weapons with the thrown property.
   *
   * @param {Activity|Item5e} activityOrItem - The activity or item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {string} attackMode - The attack mode selected for the attack activity, if empty uses activity's default.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a melee weapon attack, false otherwise.
   */
  function isMeleeWeaponAttack(activityOrItem, sourceToken, targetToken, attackMode = "", checkThrownWeapons = true) {
    return isMeleeAttackByClassification(
      null,
      "wak",
      activityOrItem,
      sourceToken,
      targetToken,
      attackMode,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is melee attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string[]|null} classifications - Array of supported attack classifications.
   * @param {string} subActionType - The allowed sub action type of the activity.
   * @param {Activity|Item5e} activityOrItem - The activity or item the used for the attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {string} attackMode - The attack mode selected for the attack activity, if empty uses activity's default.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isMeleeAttackByClassification(
    classifications,
    subActionType,
    activityOrItem,
    sourceToken,
    targetToken,
    attackMode = "",
    checkThrownWeapons = true
  ) {
    let activity = activityOrItem;
    if (activityOrItem instanceof Item) {
      activity = activityOrItem?.system?.activities?.getByType("attack")?.[0];
    }
    if (!activity || !activity.item) {
      return false;
    }
    if (activity?.type !== "attack" || activity?.attack?.type?.value !== "melee") {
      return false;
    }

    if (classifications !== null && !classifications.includes(activity.attack.type.classification)) {
      return false;
    }

    let actionType = activity.getActionType(attackMode);
    if (!actionType?.startsWith("m")) {
      return false;
    }
    if (subActionType !== null && !actionType?.endsWith(subActionType)) {
      return false;
    }
    if (!checkThrownWeapons) {
      return true;
    }

    // TODO what to do with attackMode === "ranged", will need to wait for Monster Manual
    if (!hasItemProperty(activity?.item, "thr")) {
      return true;
    }

    const distance = MidiQOL.computeDistance(sourceToken, targetToken, { wallsBlock: true });
    // Note: reach on activities is set from melee weapon item range if not overriden.
    // TODO use grid default instead of 5
    const meleeDistance = activity.range?.reach ?? activity.item?.system.range?.reach ?? 5;
    return distance >= 0 && distance <= meleeDistance;
  }

  /**
   * Returns true if the attack is a ranged attack. It also handle the case of weapons with the thrown property.
   *
   * @param {Activity|Item5e} activityOrItem - The activity or item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {string} attackMode - The attack mode selected for the attack activity, if empty uses activity's default.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isRangedAttack(activityOrItem, sourceToken, targetToken, attackMode = "", checkThrownWeapons = true) {
    return isRangedAttackByClassification(
      null,
      null,
      activityOrItem,
      sourceToken,
      targetToken,
      attackMode,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is a ranged weapon attack. It also handle the case of weapons with the thrown property.
   *
   * @param {Activity|Item5e} activity - The activity or item used to attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {string} attackMode - The attack mode selected for the attack activity, if empty uses activity's default.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   *
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isRangedWeaponAttack(activityOrItem, sourceToken, targetToken, attackMode = "", checkThrownWeapons = true) {
    return isRangedAttackByClassification(
      null,
      "wak",
      activityOrItem,
      sourceToken,
      targetToken,
      attackMode,
      checkThrownWeapons
    );
  }

  /**
   * Returns true if the attack is ranged attack. It also handle the case of weapons with the thrown property.
   *
   * @param {string[]|null} classifications - Array of supported attack classifications.
   * @param {string} subActionType - The allowed sub action type of the activity.
   * @param {Activity|Item5e} activityOrItem - The activity or item the used for the attack.
   * @param {Token5e} sourceToken - The attacker's token.
   * @param {Token5e} targetToken - The target's token.
   * @param {string} attackMode - The attack mode selected for the attack activity, if empty uses activity's default.
   * @param {boolean} checkThrownWeapons - Flag to indicate if the distance must be validated for thrown weapons.
   * @returns {boolean} true if the attack is a ranged weapon attack, false otherwise.
   */
  function isRangedAttackByClassification(
    classifications,
    subActionType,
    activityOrItem,
    sourceToken,
    targetToken,
    attackMode = "",
    checkThrownWeapons = true
  ) {
    let activity = activityOrItem;
    if (activityOrItem instanceof Item) {
      activity = activityOrItem?.system?.activities?.getByType("attack")?.[0];
    }
    if (!activity || !activity.item) {
      return false;
    }

    if (activity?.type !== "attack" || !activity.attack?.type) {
      return false;
    }

    if (classifications !== null && !classifications.includes(activity.attack.type.classification)) {
      return false;
    }

    let actionType = activity.getActionType(attackMode);
    if (subActionType != null && !actionType?.endsWith(subActionType)) {
      return false;
    }
    if (actionType?.startsWith("r")) {
      return true;
    }

    if (!checkThrownWeapons) {
      return false;
    }

    // TODO what to do with attackMode === "ranged", will need to wait for Monster Manual
    const attackType = activity.attack.type.value;
    if (attackType !== "melee" || !hasItemProperty(activity.item, "thr")) {
      return false;
    }

    const distance = MidiQOL.computeDistance(sourceToken, targetToken, { wallsBlock: true });
    // Note: reach on activities is set from melee weapon item range if not overriden.
    // TODO use grid default instead of 5
    const meleeDistance = activity.range?.reach ?? activity.item?.system.range?.reach ?? 5;
    return distance > meleeDistance;
  }

  /**
   * Selects all the tokens that are within X distance of the source token for the current game user.
   *
   * @param {Token5e} sourceToken - The reference token from which to compute the distance.
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
    options = { disposition: null, includeSource: false, updateSelected: true, isSeen: false }
  ) {
    options.disposition ??= null;
    options.includeSource ??= false;
    options.updateSelected ??= true;
    options.isSeen ??= false;

    let aoeTargets = MidiQOL.findNearby(options.disposition, sourceToken, distance, {
      isSeen: options.isSeen,
      includeToken: options.includeSource,
    });

    const aoeTargetIds = aoeTargets.map((t) => t.document.id);
    if (options.updateSelected) {
      if (game.release.generation > 12) {
        canvas.tokens?.setTargets(aoeTargetIds);
      } else {
        game.user?.updateTokenTargets(aoeTargetIds);
        game.user?.broadcastActivity({ targets: aoeTargetIds });
      }
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
  async function insertTextBeforeButtonsIntoMidiItemChatMessage(position, chatMessage, text) {
    let content = foundry.utils.deepClone(chatMessage.content);
    let searchRegex = undefined;
    let replaceString = `$1\n${text}\n$2`;
    switch (position) {
      case "beforeHitsDisplay":
        searchRegex = /(<\/div>)(\s*<div class="midi-qol-hits-display">)/m;
        break;
      case "beforeButtons":
      default:
        searchRegex =
          /(<\/section>)(\s*<div class="card-buttons midi-buttons">|\s*<ul class="card-footer pills unlist">|\s*<div class="card-buttons">)/m;
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
      console.error(`${MACRO_NAME} | Could not find workflow item card`, { workflow });
      return;
    }
    await insertTextBeforeButtonsIntoMidiItemChatMessage(position, chatMessage, text);
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
  function isMidiHookStillValid(itemName, hookName, actionName, originWorkflow, currentWorkflow, debug = false) {
    if (originWorkflow !== currentWorkflow) {
      if (debug) {
        // Not same workflow do nothing
        console.warn(`${itemName} | ${hookName} hook called from a different workflow.`);
      }
      return false;
    }
    if (currentWorkflow.aborted) {
      if (debug) {
        // Workflow was aborted do not trigger action
        console.warn(`${itemName} | workflow was aborted, ${actionName} is also cancelled.`);
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
    workflow.workflowOptions.noCritical = true;

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
        ? ""
        : `${workflow.attackTotal}/${hitDisplay.ac ? Math.abs(workflow.attackTotal - hitDisplay.ac) : "-"}`;

      if (game.user?.isGM && ["hitDamage", "all"].includes(configSettings.hideRollDetails)) {
        hitDisplay.hitSymbol = "fa-tick";
      } else {
        hitDisplay.hitSymbol = "fa-check";
      }
    }
    // Redisplay roll and hits with the new data
    if (debug) {
      console.warn(`${MACRO_NAME} | Hit display data after updates.`, { hitDisplayData: workflow.hitDisplayData });
    }

    await workflow.displayAttackRoll(configSettings.mergeCard);
    await workflow.displayHits(workflow.whisperAttackCard, configSettings.mergeCard);
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
      const targetAC = targets.size === 1 ? workflow.hitDisplayData[targets.first().document.uuid].ac : null;
      workflow.attackRoll.options.target = targetAC;
      workflow.attackRoll.dice[0].options.target = targetAC;
    }
    const chatMessage = workflow.chatCard;
    let content = chatMessage && foundry.utils.duplicate(chatMessage.content);
    if (chatMessage) {
      // Remove sucesss/failure from attack otherwise dnd5e will add them without removing the previous result
      content = content.replace(/class="dice-total[^"]*"/, 'class="dice-total"');
      chatMessage.content = content;
    }
  }

  /**
   * Returns the damage roll options based on the options set on the first damage roll of the worflow.
   *
   * @param {MidiQOL.Workflow} worflow - The MidiQOL workflow from which to get the first damage roll options.
   *
   * @returns {object} The damage roll options based on the ones set on the first damage roll of the worflow.
   */
  function getDamageRollOptions(workflow) {
    const dmgRollOptions = workflow.damageRolls?.[0]?.options ?? {};
    const options = {
      isCritical: dmgRollOptions.isCritical ?? workflow.isCritical,
      critical: dmgRollOptions.critical ? foundry.utils.deepClone(dmgRollOptions.critical) : {},
    };
    // Remove allow flag to let default for another roll to be used
    if (options.critical.allow) {
      delete options.critical.allow;
    }
    return options;
  }

  /**
   * Gets the applied enchantments for the specified item or activity uuid if any exist.
   *
   * @param {string} entityUuid - The UUID of the item or activity for which to find associated enchantments.
   * @returns {ActiveEffect5e[]} list of applied enchantments.
   */
  function getAppliedEnchantments(entityUuid) {
    return dnd5e.registry.enchantments.applied(entityUuid);
  }

  /**
   * Deletes the applied enchantments for the specified item or activity uuid.
   *
   * @param {string} entityUuid - The UUID of the item or activity for which to delete the associated enchantments.
   * @returns {ActiveEffect5e[]} the list of applied enchantments that was deleted.
   */
  async function deleteAppliedEnchantments(entityUuid) {
    if (debug) {
      console.warn(`${MACRO_NAME} | deleteAppliedEnchantments`, arguments);
    }
    const appliedEnchantments = getAppliedEnchantments(entityUuid);
    for (let activeEffect of appliedEnchantments) {
      if (!activeEffect.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
        await globalThis.elwinHelpers.socket.executeAsGM("elwinHelpers.remoteDeleteEnchantment", activeEffect.uuid);
      } else {
        await activeEffect.delete();
      }
    }
    return appliedEnchantments;
  }

  /**
   * Disables manual enchantment placing and configuration dialog if enchantment already exists.
   * This prevents the drop area that allows to select or remove the item to which an enchantment is applied.
   *
   * **Note:** By default dialog configuration is disabled if an enchantment is already applied, unless *workflow.elwinOptions.disableConfigDialogIfEnchantExists* is false.
   *
   * @param {object} parameters - The MidiQOL function macro parameters.
   */
  function disableManualEnchantmentPlacingOnUsePreItemRoll({ workflow, args }) {
    if (debug) {
      console.warn(
        `${MACRO_NAME} | disableManualEnchantmentPlacingOnUsePreItemRoll`,
        { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
        arguments
      );
    }
    if (workflow.activity?.type !== "enchant") {
      // Skip activities that are not enchantments.
      return;
    }

    // Disables dialog configuration
    if (
      (workflow.elwinOptions?.disableConfigDialogIfEnchantExists ?? true) &&
      elwinHelpers.getAppliedEnchantments(workflow.activity?.uuid)?.length
    ) {
      Hooks.once("dnd5e.preUseActivity", (activity, usageConfig, dialogConfig, __) => {
        const activityWorkflow = usageConfig.worflow;
        if (
          !elwinHelpers.isMidiHookStillValid(
            activity.item?.name,
            "dnd5e.preUseActivity",
            activity.name,
            workflow,
            activityWorkflow,
            debug
          )
        ) {
          return;
        }

        // Disable dialog configuration
        dialogConfig.configure = false;
      });
    }

    // Disables enchantment drop area, but keep selected profile
    Hooks.once("dnd5e.preCreateUsageMessage", (activity, messageConfig) => {
      const activityWorkflow = messageConfig.workflow;
      if (
        !elwinHelpers.isMidiHookStillValid(
          activity.item?.name,
          "dnd5e.preCreateUsageMessage",
          activity.name,
          workflow,
          activityWorkflow,
          debug
        )
      ) {
        return;
      }
      // Keep selected profile in workflow
      if (activityWorkflow) {
        foundry.utils.setProperty(
          activityWorkflow,
          "elwinOptions.enchantmentProfile",
          foundry.utils.getProperty(messageConfig, `data.flags.${game.system.id}.use.enchantmentProfile`)
        );
      }
      // Clear profile from message to prevent drop area.
      foundry.utils.setProperty(messageConfig, `data.flags.${game.system.id}.use.enchantmentProfile`, null);
    });
  }

  /**
   * Applies or removes an enchantment to/from the item of the used enchantment activity.
   * If no enchantments are active, apply the selected enchantment profile to itself, otherwise delete the applied enchantments.
   *
   * @param {object} parameters - The MidiQOL function macro parameters.
   */
  async function toggleSelfEnchantmentOnUsePostActiveEffects({ workflow, args }) {
    if (debug) {
      console.warn(
        `${MACRO_NAME} | toggleSelfEnchantmentOnUsePostActiveEffects`,
        { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
        arguments
      );
    }
    if (workflow.activity?.type !== "enchant") {
      // Skip activities that are not enchantments.
      return;
    }
    // Get applied enchantements for this item
    const enchantments = getAppliedEnchantments(workflow.activity.uuid);
    if (enchantments?.length) {
      // Remove enchantment
      await deleteAppliedEnchantments(workflow.activity.uuid);

      // Add message about deactivation
      const infoMsg = getSelfEnchantmentActivationMessage(enchantments[0], false);
      if (infoMsg) {
        await insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
      }
    } else {
      const enchantmentEffectData = getAutomatedEnchantmentSelectedProfile(workflow)?.effect.toObject();
      if (!enchantmentEffectData) {
        console.error(`${MACRO_NAME} | Missing enchantment effect`, { workflow });
        return;
      }
      // Validate against the enchantment's restraints on the origin item
      const errors = workflow.activity.canEnchant(workflow.item);
      if (errors?.length) {
        errors.forEach((err) => ui.notifications.error(err.message, { console: false }));
        return;
      }

      // Add enchantment to self
      const enchantmentEffect = await applyEnchantmentToItem(workflow, enchantmentEffectData, workflow.item);
      if (!enchantmentEffect) {
        console.error(`${MACRO_NAME} | Enchantment effect could not be created.`, enchantmentEffectData);
        return;
      }
      // If this activity is a dependency of an applied enchantment, also add this enchantment as a dependency.
      const metaEchantmentEffect = workflow.activity.item?.effects?.find(
        (ae) => ae.isAppliedEnchantment && ae.getDependents()?.some((d) => d.uuid === workflow.activity.uuid)
      );
      if (metaEchantmentEffect) {
        await metaEchantmentEffect.addDependent(enchantmentEffect);
      }

      // Get effects to apply on actor
      const effectIds = getSelfEnchantmentActorEffects(enchantmentEffect);
      const effectsToApply = effectIds?.length
        ? workflow.item?.effects
            .filter(
              (ae) =>
                !ae.transfer && ae.type !== "enchantment" && (effectIds.includes(ae._id) || effectIds.includes(ae.name))
            )
            .map((ae) => {
              const data = ae.toObject();
              data.origin = ae.uuid;
              return data;
            }) ?? []
        : [];
      if (effectsToApply?.length) {
        const effectsCreated = await workflow.actor.createEmbeddedDocuments("ActiveEffect", effectsToApply);
        await enchantmentEffect.addDependent(...effectsCreated);
        // Add enchantment to each effect as a dependency (this allows to auto delete the enchantment if the actor effect is deleted)
        for (let ae of effectsCreated) {
          await ae.addDependent(enchantmentEffect);
        }
      }

      // Add message about activation
      const infoMsg = getSelfEnchantmentActivationMessage(enchantmentEffect, true);
      if (infoMsg) {
        await insertTextIntoMidiItemCard("beforeButtons", workflow, infoMsg);
      }
    }
  }

  /**
   * Returns the self enchantment effects to apply on actor at the same time.
   *
   * @param {ActiveEffect} enchantmentEffect - The self enchantment AE.
   * @returns {string[]} The list of active effects to apply on the actor.
   */
  function getSelfEnchantmentActorEffects(enchantmentEffect) {
    const partialFlag = "elwinHelpers.selfEnchant.effects";
    const keys = [`flags.${WORLD_MODULE_ID}.${partialFlag}`, `flags.${MISC_MODULE_ID}.${partialFlag}`];
    return (enchantmentEffect?.changes?.find((c) => keys.includes(c.key))?.value?.split(/\s*,\s*/) ?? []).map((u) =>
      u?.trim()
    );
  }

  /**
   * Returns the self enchantment activation message from the enchantment AE.
   *
   * @param {ActiveEffect} enchantmentEffect - The self enchantment AE.
   * @param {boolean} activation - Flag to indicate which version fo the message to get.
   * @returns {string|undefined} The activation or deactivation message for this enchantment if any is specified.
   */
  function getSelfEnchantmentActivationMessage(enchantmentEffect, activation) {
    const partialFlag = `elwinHelpers.selfEnchant.msg.${activation ? "activation" : "deactivation"}`;
    const keys = [`flags.${WORLD_MODULE_ID}.${partialFlag}`, `flags.${MISC_MODULE_ID}.${partialFlag}`];
    return enchantmentEffect?.changes?.find((c) => keys.includes(c.key))?.value;
  }

  /**
   * Returns the selected enchantment profile for automated enchantment application.
   * To be used when disableManualEnchantmentPlacingOnUsePreItemRoll is set on the item.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  function getAutomatedEnchantmentSelectedProfile(workflow) {
    if (workflow.activity?.type !== "enchant") {
      return undefined;
    }
    const enchantmentProfile = workflow.elwinOptions?.enchantmentProfile;
    return enchantmentProfile
      ? workflow.activity?.effects.find((e) => e._id === enchantmentProfile)
      : workflow.activity?.effects?.[0];
  }

  /**
   * Applies programmatically an enchantment to the specified item.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {object} enchantmentEffectData - The enchantment effect data to apply.
   * @param {Item5e} itemToEnchant- The item to enchant.
   * @param {boolean} deleteExisting=true - Deletes any existing enchantment having workflow.activity.uuid as origin.
   * @returns {ActiveEffect5e} The applied enchantment effect.
   */
  async function applyEnchantmentToItem(workflow, enchantmentEffectData, itemToEnchant, deleteExisting = true) {
    if (debug) {
      console.warn(`${MACRO_NAME} | applyEnchantmentToItem`, arguments);
    }
    // Removes previous enchantment if it exists
    if (deleteExisting) {
      await elwinHelpers.deleteAppliedEnchantments(workflow.activity.uuid);
    }

    // Set current activity has the origin
    enchantmentEffectData.origin = workflow.activity.uuid;

    // Add enchantment to item
    const itemCard = game.messages.get(workflow.itemCardId);
    if (!itemCard) {
      console.error(`${MACRO_NAME} | Item chat message could not be found.`, { workflow });
      return;
    }
    const effectOptions = { parent: itemToEnchant, keepOrigin: true, chatMessageOrigin: workflow.itemCardId };

    if (!itemToEnchant.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
      effectOptions.parentUuid = effectOptions.parent.uuid;
      delete effectOptions.parent;
      const effectUuid = await globalThis.elwinHelpers.socket.executeAsGM(
        "elwinHelpers.remoteCreateEnchantment",
        enchantmentEffectData,
        effectOptions
      );
      return fromUuidSync(effectUuid);
    } else {
      return await createEnchantment(enchantmentEffectData, effectOptions);
    }
  }

  /**
   * Creates an enchantment effect on the specified item.
   *
   * @param {object} enchantmentEffectData
   * @param {object} [options] - Dnd5e enchantment options.
   * @returns
   */
  async function createEnchantment(enchantmentEffectData, options) {
    if (debug) {
      console.warn(`${MACRO_NAME} | createEnchantment`, arguments);
    }
    const itemCard = game.messages.get(options.chatMessageOrigin);
    // We need set temporarely the profile just to allow the enchantment to be properly created with riders,
    // it's the only way to make it work with items that are destroyed, we cannot leave it, otherwise the drop
    // area will be displayed.
    if (itemCard) {
      foundry.utils.setProperty(itemCard, "flags.dnd5e.use.enchantmentProfile", enchantmentEffectData._id);
    }
    try {
      return await ActiveEffect.implementation.create(enchantmentEffectData, options);
    } finally {
      if (itemCard) {
        foundry.utils.setProperty(itemCard, "flags.dnd5e.use.enchantmentProfile", null);
        // Force message ui update, because it can happen that an update of the the item card occurs during the time
        // the enchantmentProfile is set, which renders the enchantmentEnricher (drop area), this forces it to be removed.
        await ui.chat.updateMessage(itemCard);
      }
    }
  }

  /**
   * Applies programmatically an enchantment to the specified item from an enchant activity different
   * than the one from the workflow.<br>
   * <b>Note:</b> This does not work with activities that belongs an item that destroys itself on empty.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {Activity} activity - The enchant activity to which the enchantment belongs.
   * @param {object} enchantmentEffectData - The enchantment effect data to apply.
   * @param {Item5e} itemToEnchant- The item to enchant.
   * @param {boolean} deleteExisting=true - Deletes any existing enchantment having workflow.activity.uuid as origin.
   * @returns {ActiveEffect5e} The applied enchantment effect.
   */
  async function applyEnchantmentToItemFromOtherActivity(
    workflow,
    activity,
    enchantmentEffectData,
    itemToEnchant,
    deleteExisting = true
  ) {
    if (debug) {
      console.warn(`${MACRO_NAME} | applyEnchantmentToItemFromOtherActivity`, arguments);
    }
    // Removes previous enchantment if it exists
    if (deleteExisting) {
      await elwinHelpers.deleteAppliedEnchantments(activity.uuid);
    }

    // Set current activity has the origin
    enchantmentEffectData.origin = activity.uuid;

    const effectOptions = {
      parent: itemToEnchant,
      keepOrigin: true,
      dnd5e: { enchantmentProfile: enchantmentEffectData._id, activityId: activity.id },
    };

    if (!itemToEnchant.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
      effectOptions.parentUuid = effectOptions.parent.uuid;
      delete effectOptions.parent;
      const effectUuid = await globalThis.elwinHelpers.socket.executeAsGM(
        "elwinHelpers.remoteCreateEnchantment",
        enchantmentEffectData,
        effectOptions
      );
      return fromUuidSync(effectUuid);
    } else {
      return await createEnchantment(enchantmentEffectData, effectOptions);
    }
  }

  /**
   * Returns a list of equipped melee weapons for a specified actor.
   *
   * @param {Actor5e} sourceActor - Actor for which to list equipped melee weapons.
   * @returns {Item5e[]} A list of equipped melee weapons.
   */
  function getEquippedMeleeWeapons(sourceActor) {
    return (
      sourceActor?.itemTypes.weapon.filter(
        (w) =>
          w.system.equipped &&
          ["simpleM", "martialM"].includes(w.system.type?.value) &&
          w.system.activities
            ?.getByType("attack")
            .some((a) => a.attack.type.value === "melee" && a.attack.type.classification === "weapon")
      ) ?? []
    );
  }

  /**
   * Returns `modern` or `legacy` depending on the specified item rules version.
   *
   * @param {Item5e} item - The item for which to determine the rules version.
   * @returns {string} 'legacy' or 'modern' depending on the item's source rules.
   */
  function getRules(item) {
    return ["2014", ""].includes(item.system?.source?.rules ?? "") ? "legacy" : "modern";
  }

  /**
   * Cleanup hook callbacks that were registered on a workflow when its associated chat message is deleted.
   *
   * @param {object} message - The delete message.
   * @param {object} options - The delete options.
   * @param {User} user - The user deleting the message.
   */
  function handleDeleteChatMessageForRegisteredWorkflowHooks(message, options, user) {
    const workflow = WORKFLOWS.get(message.uuid);
    if (workflow) {
      cleanupRegisteredWorkflowHooks(workflow);
    }
  }

  /**
   * Cleanup hook callbacks that were registered on a workflow.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  function cleanupRegisteredWorkflowHooks(workflow) {
    const elwinHelpersHooks = foundry.utils.getProperty(workflow.workflowOptions, "elwinHelpers.hooks") ?? {};
    for (let tmpEvent of Object.keys(elwinHelpersHooks)) {
      for (let tmpMacroId of Object.keys(elwinHelpersHooks[tmpEvent])) {
        Hooks.off(tmpEvent, elwinHelpersHooks[tmpEvent][tmpMacroId]);
      }
    }
    delete foundry.utils.getProperty(workflow.workflowOptions, "elwinHelpers")?.hooks;
  }

  /**
   * Registers a callback on an event for the duration of the specified workflow.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   * @param {string} event - Name of the event on which to hook the callback.
   * @param {function} callback - The function to be executed when the event is triggered.
   * @param {string} macroId - Identifier of the macro that registers a callback.
   */
  function registerWorkflowHook(workflow, event, callback, macroId) {
    if (!macroId) {
      // Use default, which may not always be the desired value,
      // but it's the safest value to not break existing items using this function.
      macroId = "default";
    }
    const elwinHelpersHooks = foundry.utils.getProperty(workflow.workflowOptions, "elwinHelpers.hooks") ?? {};
    if (elwinHelpersHooks[event]?.[macroId]) {
      // A hook for this event has already been registered for this workflow, remove previous
      Hooks.off(event, elwinHelpersHooks[event][macroId]);
    }
    elwinHelpersHooks[event] ??= {};
    elwinHelpersHooks[event][macroId] = Hooks.on(event, callback);
    foundry.utils.setProperty(workflow.workflowOptions, "elwinHelpers.hooks", elwinHelpersHooks);

    // Keep a reference to cleanup in case the chat message is deleted before the workflow is completed (used by delete message hook)
    WORKFLOWS.set(workflow.id, workflow);
  }

  /**
   * Updates the damage roll configuration by adding a damage bonus and or replacing the damage type of the rolls.
   *
   * @param {object} scope - The midi-qol macro calling scope.
   * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
   * @param {object} [options] - The options to use for the updates.
   * @param {string} [options.damageBonus] - Damage bonus to be added (none added if undefined).
   * @param {DamageRollConfiguration} [options.damageBonusRoll] - Damage bonus roll to be added.
   *           If data is not provided, if will be set to the same one as the first roll config.
   *           If isCritical is not provided, if will be set to the same one as the first roll config is set.
   * @param {string} [options.newDamageType] - The new damage type to set (does nothing if undefined).
   * @param {string} [options.baseOnly] - Flag to indicate if only base damage rolls should be updated (all if undefined or false).
   * @param {string} [options.id] - Identifier of this change, this can be used to limit multiple calls, only the first will apply the changes.
   * @param {string} [options.flavor] - Text to be added under the modified roll to inform of the changes that were made.
   * @param {boolean} [options.debug] - Flag to indicate if debug information should be logged (if undefined uses the current debug value).
   */
  function updateDamageConfigBasic(scope, workflow, options = {}) {
    updateDamageConfigCustom(scope, workflow, options, (rollConfig, _, __) => {
      const updatedRollsIndexes = new Set();
      if (options.damageBonus && rollConfig.rolls[0]?.parts) {
        rollConfig.rolls[0].parts.push(options.damageBonus);
        updatedRollsIndexes.add(0);
      }
      if (options.damageBonusRoll) {
        if (options.damageBonusRoll.data === undefined && rollConfig.rolls[0]?.data) {
          options.damageBonusRoll.data = rollConfig.rolls[0].data;
        }
        if (options.damageBonusRoll.isCritical === undefined && rollConfig.rolls[0]?.isCritical != undefined) {
          options.damageBonusRoll.isCritical = rollConfig.rolls[0].isCritical;
        }
        rollConfig.rolls.push(options.damageBonusRoll);
        updatedRollsIndexes.add(rollConfig.rolls.length - 1);
      }
      if (options.newDamageType) {
        // When replacing damage types, only add flavor label on first damage roll
        replaceRollConfigDamage(rollConfig, options.newDamageType, options.baseOnly);
        updatedRollsIndexes.add(0);
      }
      return updatedRollsIndexes;
    });
  }

  /**
   * Updates the damage roll configuration by executing the specified callback function.
   *
   * @param {object} scope - The midi-qol macro calling scope.
   * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
   * @param {object} [options] - The options to use for the updates.
   * @param {string} [options.flavor] - Text to be added under the modified roll to inform of the changes that were made.
   * @param {string} [options.id] - Identifier of this change, this can be used to limit multiple calls, only the first will apply the changes.
   * @param {boolean} [options.debug] - Flag to indicate if debug information should be logged (if undefined uses the current debug value).
   * @param {function(object, object, object):Set<number>} changeFunction - A callback to run in the 'dnd5e.preRollDamageV2' hook
   *            to apply changes to the damage roll config. It should returns a set of damage roll indexes for which to add the flavor label.
   */
  function updateDamageConfigCustom(scope, workflow, options = {}, changeFunction) {
    let { flavor, debug: effectiveDebug } = options;
    const itemName = scope.macroItem?.name ?? scope.macroActivity?.item.name;
    flavor ??= itemName;
    effectiveDebug ??= debug;

    Hooks.once("dnd5e.preRollDamageV2", (rollConfig, dialogConfig, messageConfig) => {
      if (effectiveDebug) {
        console.warn(`${itemName ?? MACRO_NAME} | dnd5e.preRollDamageV2`, {
          rollConfig,
          dialogConfig,
          messageConfig,
        });
      }
      if (
        options?.id &&
        foundry.utils.getProperty(workflow.workflowOptions, `elwinHelpers.damageConfig.${options.id}`)
      ) {
        // Do nothing, change was already applied
        return;
      }
      // Make sure it's the same workflow
      if (
        !elwinHelpers.isMidiHookStillValid(
          MACRO_NAME,
          "dnd5e.preRollDamageV2",
          `${itemName ?? MACRO_NAME} - Damage Config`,
          workflow,
          rollConfig.workflow,
          effectiveDebug
        )
      ) {
        return;
      }
      if (rollConfig.subject?.uuid !== workflow.activity?.uuid) {
        if (effectiveDebug) {
          console.warn(`${itemName ?? MACRO_NAME} | dnd5e.preRollDamageV2 damage is not from rolledActivity`, {
            rollConfig,
            dialogConfig,
            messageConfig,
          });
        }
        return;
      }
      // Call change function
      if (!changeFunction) {
        return;
      }
      const updatedIndexes = changeFunction(rollConfig, dialogConfig, messageConfig);
      if (dialogConfig.configure === false) {
        // Nothing else to do, no dialog shown
        return;
      }
      if (options?.id) {
        // Add indicator that the change was applied.
        foundry.utils.setProperty(workflow.workflowOptions, `elwinHelpers.damageConfig.${options.id}`, true);
      }

      // Register hook to add flavor text for the change.
      Hooks.once("renderDamageRollConfigurationDialog", (dialog, element) => {
        if (effectiveDebug) {
          console.warn(`${itemName ?? MACRO_NAME} | renderDamageRollConfigurationDialog`, { dialog, element });
        }
        if (options?.id) {
          // Remove indicator that the change was applied.
          foundry.utils.setProperty(workflow.workflowOptions, `elwinHelpers.damageConfig.${options.id}`, null);
        }

        // Make sure it's the same workflow
        if (
          !elwinHelpers.isMidiHookStillValid(
            MACRO_NAME,
            "renderDamageRollConfigurationDialog",
            `${itemName ?? MACRO_NAME} - Damage Bonus Flavor`,
            workflow,
            dialog.config?.workflow,
            effectiveDebug
          )
        ) {
          return;
        }
        if (dialog.config?.subject?.uuid !== workflow.activity?.uuid) {
          if (effectiveDebug) {
            console.warn(
              `${itemName ?? MACRO_NAME} | renderDamageRollConfigurationDialog damage is not from rolledActivity`,
              { dialog, element }
            );
          }
          return;
        }
        for (let index of updatedIndexes ?? [0]) {
          const formulaLine = dialog.element.querySelector(
            `div.rolls > ul.formulas > li:nth-of-type(${index + 1}) > div.formula-line`
          );
          const newDiv = dialog.element.ownerDocument.createElement("div");
          newDiv.innerHTML = `<span class='label'>${flavor}</span>`;
          formulaLine.after(newDiv);
          if (rollConfig.rolls[index].situational === false) {
            const situationalField = dialog.element.querySelector(
              `div.rolls > ul.formulas > li:nth-of-type(${index + 1}) > div.formula-line ~ div.form-group`
            );
            situationalField?.classList?.add("hidden");
          }
        }
      });
    });
  }

  /**
   * Replaces the current damage roll config damage types with the value of newDamageType.
   *
   * @param {object} rollConfig - The current damage roll config.
   * @param {string} newDamageType - The new damage type to set.
   * @param {boolean} [baseOnly=false] - Flag to indicate if only base damage type should be converted.
   */
  function replaceRollConfigDamage(rollConfig, newDamageType, baseOnly = false) {
    // Change damage type of all rolls (or just base?)
    for (let roll of rollConfig.rolls ?? []) {
      if (baseOnly && !roll.base) {
        continue;
      }
      roll.options ??= {};
      roll.options.type = newDamageType;
      roll.options.types = [newDamageType];
      for (let i = 0; i < roll.parts.length; i++) {
        roll.parts[i] = getUpdatedPart(roll.parts[i]);
      }
    }
  }

  /**
   * Marks the specified UUIDs as attached to the specified token. When the token moves, the attached
   * entities, will be updated accordingly (x, y, elevation, rotation).
   *
   * @param {Token5e} token - Token on which to attach entities.
   * @param {string[]} entityUuids - Array of UUIDs of the entities to be attached to the token.
   */
  async function attachToToken(token, entityUuids) {
    if (debug) {
      console.warn(`${MACRO_NAME} | attachToToken`, { token, entityUuids });
    }
    let moduleId = WORLD_MODULE_ID;
    let attachedEntityUuids = token.document.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    if (!attachedEntityUuids.length) {
      moduleId = MISC_MODULE_ID;
      attachedEntityUuids = token.document.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    }
    await token.document.setFlag(moduleId, "attached.attachedEntityUuids", attachedEntityUuids.concat(...entityUuids));
  }

  /**
   * Removes the specified UUIDs from the entities attached to the specified token.
   *
   * @param {Token5e} token - Token from which to detach entities.
   * @param {string[]} entityUuids - Array of UUIDs of the entities to be detached from the token.
   */
  async function detachFromToken(token, entityUuids) {
    if (debug) {
      console.warn(`${MACRO_NAME} | detachFromToken`, { token, entityUuids });
    }
    let moduleId = WORLD_MODULE_ID;
    let attachedEntityUuids = token.document.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    if (!attachedEntityUuids.length) {
      moduleId = MISC_MODULE_ID;
      attachedEntityUuids = token.document.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    }
    await token.document.setFlag(
      moduleId,
      "attached.attachedEntityUuids",
      attachedEntityUuids.filter((u) => !entityUuids.includes(u))
    );
  }

  /**
   * Marks the specified UUIDs as attached to the specified template document.
   * When the template document is updated, the attached entities, will be updated accordingly (x, y, elevation, rotation).
   * <br>Note: Currently only attachments to circle templates are supported.
   *
   * @param {MeasuredTemplateDocument} templateDocument - Template document on which to attach entities.
   * @param {string[]} entityUuids - Array of UUIDs of the entities to be attached to the template document.
   * @param {object} options - Attach options
   * @param {boolean} [options.sync] - Flag to indicate that when the size of the template changes,
   *    it must also be reflected on the attached entities in addition of the position attributes.
   *    Note: currently only synching AmbientLight is supported.
   */
  async function attachToTemplate(templateDocument, entityUuids, options) {
    if (debug) {
      console.warn(`${MACRO_NAME} | attachToTemplate`, { templateDocument, entityUuids });
    }
    if (templateDocument?.t !== "circle") {
      // For now only support circle
      console.error(`${MACRO_NAME} | Only circle shape measured templates are supported.`);
      return;
    }
    let moduleId = WORLD_MODULE_ID;
    let attachedEntityUuids = templateDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    let synchedEntityUuids = templateDocument.flags[moduleId]?.attached?.synchedEntityUuids ?? [];
    if (!attachedEntityUuids.length) {
      moduleId = MISC_MODULE_ID;
      attachedEntityUuids = templateDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
      synchedEntityUuids = templateDocument.flags[moduleId]?.attached?.synchedEntityUuids ?? [];
    }
    await templateDocument.setFlag(moduleId, "attached", {
      attachedEntityUuids: attachedEntityUuids.concat(...entityUuids),
      synchedEntityUuids: options.sync ? synchedEntityUuids.concat(...entityUuids) : synchedEntityUuids,
    });
  }

  /**
   * Removes the specified UUIDs from the entities attached to the specified template document.
   *
   * @param {MeasuredTemplateDocument} templateDocument - Template document from which to detach entities.
   * @param {string[]} entityUuids - Array of UUIDs of the entities to be detached from the template document.
   * @param {*} templateDocument
   * @param {*} entityUuids
   */
  async function detachFromTemplate(templateDocument, entityUuids) {
    if (debug) {
      console.warn(`${MACRO_NAME} | detachFromTemplate`, { templateDocument, entityUuids });
    }
    let moduleId = WORLD_MODULE_ID;
    let attachedEntityUuids = templateDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
    let synchedEntityUuids = templateDocument.flags[moduleId]?.attached?.synchedEntityUuids ?? [];
    if (!attachedEntityUuids.length) {
      moduleId = MISC_MODULE_ID;
      attachedEntityUuids = templateDocument.flags[moduleId]?.attached?.attachedEntityUuids ?? [];
      synchedEntityUuids = templateDocument.flags[moduleId]?.attached?.synchedEntityUuids ?? [];
    }
    await templateDocument.setFlag(moduleId, "attached", {
      attachedEntityUuids: attachedEntityUuids.filter((u) => !entityUuids.includes(u)),
      synchedEntityUuids: synchedEntityUuids.filter((u) => !entityUuids.includes(u)),
    });
  }

  /**
   * Creates and attaches an ambient light source to the specified template document.
   * <br>Note: ambient light sources can only be attached to circle templates and they are attached with the sync option true.
   *
   * @param {MeasuredTemplateDocument} templateDocument - Template document on which to attach an ambient light source.
   * @param {object} ambientLightData - Ambient light source data.
   * @returns {AmbientLight} The created and attached ambient light source.
   */
  async function attachAmbientLightToTemplate(templateDocument, ambientLightData) {
    if (debug) {
      console.warn(`${MACRO_NAME} | attachAmbientLightToTemplate`, { templateDocument, ambientLightData });
    }
    if (templateDocument?.t !== "circle") {
      // For now only support circle
      console.error(`${MACRO_NAME} | Only circle shape measured templates are supported.`);
      return undefined;
    }
    if (game.user.isGM) {
      const [lightSource] = await canvas.scene.createEmbeddedDocuments("AmbientLight", [ambientLightData]);
      await attachToTemplate(templateDocument, [lightSource.uuid], { sync: true });
      await templateDocument.addDependent(lightSource);
      return lightSource;
    } else {
      const lightSourceUuid = await globalThis.elwinHelpers.socket.executeAsGM(
        "elwinHelpers.remoteAttachAmbientLightToTemplate",
        templateDocument.uuid,
        ambientLightData
      );
      return fromUuidSync(lightSourceUuid);
    }
  }

  /**
   * Replaces damage types contained in the specified part with newDamageType.
   *
   * @param {string} part - Damage part to be updated.
   * @param {string} newDamageType - The new damage type to set.
   * @returns {string} new damage part with damage types updated.
   */
  function getUpdatedPart(part, newDamageType) {
    if (!part) {
      return part;
    }
    let newPart = part;
    newPart = newPart.replace(/(\[)([^\]]+)(\])/g, `$1${newDamageType}$3`);
    return newPart;
  }

  /**
   * Utility dialog to select an item from a list of items.
   *
   * @example
   * const items = _token.actor.itemTypes.weapon;
   * const selectedItem = await ItemSelectionDialog.createDialog("Select a Weapon", items, items?.[0]);
   */
  class ItemSelectionDialog extends foundry.applications.api.DialogV2 {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
      classes: ["dialog", "dnd5e2", "elwin-dialog", "themed"],
    };

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
      let itemContent = "";
      for (let item of items) {
        if (!item?.id) {
          continue;
        }
        const ctx = {};
        ctx.selected = defaultItem && defaultItem.id === item.id ? " checked" : "";
        if (item.system.attunement) {
          ctx.attunement = item.system.attuned
            ? {
                cls: "active",
                tooltip: game.i18n.localize("DND5E.AttunementAttuned"),
              }
            : {
                cls: "",
                tooltip: game.i18n.localize(CONFIG.DND5E.attunementTypes[item.system.attunement]),
              };
        }
        if ("equipped" in item.system) {
          ctx.equip = {
            cls: item.system.equipped ? "active" : "",
            tooltip: game.i18n.localize(item.system.equipped ? "DND5E.Equipped" : "DND5E.Unequipped"),
          };
        }
        ctx.quantity = item.type === "consumable" ? `[${item.system.quantity}]` : "";
        ctx.subtitle = [item.system.type?.label, item.isActive ? item.labels.activation : null].filterJoin(" &bull; ");
        ctx.tags =
          item.labels.properties
            ?.filter((prop) => prop.icon)
            .map((prop) => `<span aria-label="${prop.label}"><dnd5e-icon src="${prop.icon}"></dnd5e-icon></span>`)
            .join(" ") ?? "";

        itemContent += `
      <li class="item">
      <div class="item-row">
        <input id="radio-${item.id}" type="radio" name="itemChoice" value="${item.id}"${ctx.selected}/>
        <label for="radio-${item.id}">
          <div class="item-name">
            <img class="item-image gold-icon" src="${item.img}" alt="${item.name}">
            <div class="name name-stacked">
              <span class="title">${item.name}${ctx.quantity}</span>
              <span class="subtitle">${ctx.subtitle}</span>
            </div>
            <div class="tags">
              ${ctx.tags}
            </div>
          </div>
          <div class="item-detail item-controls" style="padding-right: 0px;">
      `;
        if (ctx.attunement) {
          itemContent += `
            <a class="item-control ${ctx.attunement.cls}" data-tooltip="${ctx.attunement.tooltip}" aria-label="${ctx.attunement.tooltip}" aria-disabled="false">
              <i class="fa-solid fa-sun"></i>
            </a>
        `;
        }
        if (ctx.equip) {
          itemContent += `
            <a class="item-control ${ctx.equip.cls}" data-tooltip="${ctx.equip.tooltip}" aria-label="${ctx.equip.tooltip}" aria-disabled="false">
              <i class="fa-solid fa-shield-halved"></i>
            </a>
        `;
        }
        itemContent += `
          </div>
        </label>
      </div>
      </li>
      `;
      }
      const content = `
    <style>
      .scrollable-list-container {
        max-height: 300px; /* Set a maximum height */
        overflow-y: auto;  /* Add vertical scrollbar when content overflows */
        ${foundry.utils.isNewerVersion(game.release.version, "13") ? "position: relative;" : ""}
      }

      .scrollable-list-container ol {
        list-style: none; /* Remove default bullet points */
      }

      /* Override dnd5e dialog css */
      .dnd5e2.elwin-dialog .window-header .window-title {
        visibility: visible; 
      }

      /* Override dnd5e dialog css */
      .dnd5e2.elwin-dialog .window-content {
        overflow-y: inherit;
      }

      .dnd5e2 .items-section .item-row input {
        opacity: 0;
        position: absolute;
        z-index: -1;
      }

      .dnd5e2 .items-section .item-row label {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        align-items: stretch;
      }

      .dnd5e2 .items-section [type=radio]:checked + label {
        outline: 3px solid #f00;
      }
    </style>

    <div class="scrollable-list-container">
      <ol class="items-section unlist" style="margin: 4px;">
        ${itemContent}
      </ol>
    </div>
      `;
      if (foundry.utils.isNewerVersion(game.release.version, "13")) {
        const divContent = document.createElement("div");
        divContent.innerHTML = content;
        return divContent;
      }
      return content;
    }

    /**
     * A helper constructor function which displays the item selection dialog.
     *
     * @param {string} title - The title to display.
     * @param {Item5e[]} items - List of items from which to select an item.
     * @param {Item5e} defaultItem - If specified, item to be selected by default,
     *                                if null or not part of items, the first one is used.
     *
     * @returns {Promise<Item5e|null>}  Resolves with the selected item, if any.
     */
    static createDialog(title, items, defaultItem) {
      if (!(items?.length > 0)) {
        return null;
      }
      return ItemSelectionDialog.wait({
        window: { title },
        classes: [`theme-${game.settings.get("core", "uiConfig")?.colorScheme?.aplications ?? "dark"}`],
        content: this.getContent(items, defaultItem),
        modal: foundry.utils.isNewerVersion(game.release.version, "13"),
        rejectClose: false,
        buttons: [
          {
            action: "select",
            label: "Select",
            icon: "fas fa-check",
            default: true,
            callback: (_, button, __) => {
              const selectedItemId = button.form.elements.itemChoice.value;
              return items.find((i) => i.id === selectedItemId);
            },
          },
        ],
      });
    }
  }

  // Export class
  if (depReqFulfilled) {
    exportIdentifier("elwinHelpers.ItemSelectionDialog", ItemSelectionDialog);
  }

  /**
   * Utility dialog to select a token from a list of tokens.
   *
   * @example
   * const targets = game.canvas.tokens.placeables;
   * const selectedTarget = await TokenSelectionDialog.createDialog("Select Target", targets, targets?.[0]);
   */
  class TokenSelectionDialog extends foundry.applications.api.DialogV2 {
    /**
     * Returns the html content for the dialog generated using the specified values.
     *
     * @param {Token5e[]} tokens - List of tokens
     * @param {Token5e} defaultToken - Default token, if null or not part of tokens, the first one is used.
     *
     * @returns {string} the html content to display in the dialog.
     */
    static async getContent(tokens, defaultToken) {
      let tokenContent = "";
      if (!defaultToken || !tokens.find((t) => t.id === defaultToken?.id)) {
        defaultToken = tokens[0];
      }
      for (let token of tokens) {
        if (!token?.id) {
          continue;
        }
        const selected = defaultToken && defaultToken.id === token.id ? " checked" : "";
        const tokenImg = await getTokenImage(token);
        const tokenName = MidiQOL.getTokenPlayerName(token, true);
        tokenContent += `<li><div class="token-row">
        <input id="radio-${token.id}" type="radio" name="token" value="${token.id}"${selected} />
        <label class="radio-label" for="radio-${token.id}">
          <img id="${token.document.uuid}" src="${tokenImg}" style="border:0px; width: 50px; height:50px;">
        ${tokenName}
      </label></div></li>`;
      }

      let content = `
    <style>
      .scrollable-list-container {
        max-height: 300px; /* Set a maximum height */
        overflow-y: auto;  /* Add vertical scrollbar when content overflows */
        ${foundry.utils.isNewerVersion(game.release.version, "13") ? "position: relative;" : ""}
      }

      .selectToken .form-group {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        align-items: flex-start;
      }

      .selectToken .unlist {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .selectToken .token-row {
        flex-grow: 1; 
      }

      .selectToken .token-row .radio-label {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: 4px;
        text-align: center;
        justify-items: center;
        flex: 1 0 25%;
        line-height: normal;
      }

      .selectToken .token-row input {
        opacity: 0;
        position: absolute;
        z-index: -1;
      }

      .selectToken .token-row img {
        border: 0px;
        width: 50px;
        height: 50px;
        flex: 0 0 50px;
        margin-right: 3px;
        cursor: pointer;
      }

      .selectToken .token-row [type=radio]:checked + label img {
        outline: 3px solid #f00;
      }
    </style>
    
    <div class="selectToken">
      <div class="form-group scrollable-list-container" id="tokens">
      <ol class="unlist">
          ${tokenContent}
      </ol>
      </div>
    </div>
`;
      if (foundry.utils.isNewerVersion(game.release.version, "13")) {
        const divContent = document.createElement("div");
        divContent.innerHTML = content;
        return divContent;
      }
      return content;
    }

    /** @inheritdoc */
    _onRender(_, __) {
      if (canvas) {
        let imgs = this.element.getElementsByTagName("img");
        for (let i of imgs) {
          i.style.border = "none";
          i.closest(".radio-label").addEventListener("click", async function () {
            const token = getToken(i.id);
            //@ts-expect-error .ping
            if (token) await canvas?.ping(token.center);
          });
          i.closest(".radio-label").addEventListener("mouseover", function () {
            const token = getToken(i.id);
            if (token) {
              //@ts-expect-error .ping
              token.hover = true;
              token.refresh();
            }
          });
          i.closest(".radio-label").addEventListener("mouseout", function () {
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
      return TokenSelectionDialog.wait({
        window: { title },
        content,
        rejectClose: false,
        buttons: [
          {
            action: "ok",
            label: "Select",
            icon: "fas fa-check",
            default: true,
            callback: (_, button, __) => {
              const selectedTokenId = button.form.elements.token.value;
              return tokens.find((t) => t.id === selectedTokenId);
            },
          },
        ],
      });
    }
  }

  // Export class
  if (depReqFulfilled) {
    exportIdentifier("elwinHelpers.TokenSelectionDialog", TokenSelectionDialog);
  }

  /**
   * Returns the numeric value of the specified actor's size value.
   *
   * @param {Actor5e} actor actor for which to get the size value.
   *
   * @returns {number} the numeric value of the specified actor's size value.
   */
  function getActorSizeValue(actor) {
    return getSizeValue(actor?.system?.traits?.size ?? "med");
  }

  /**
   * Returns the numeric value of the specified size.
   *
   * @param {string} size  the size name for which to get the size value.
   *
   * @returns {number} the numeric value of the specified size.
   */
  function getSizeValue(size) {
    return Object.keys(CONFIG.DND5E.actorSizes).indexOf(size ?? "med");
  }

  /**
   * Helper function to create a simple dialog with labeled buttons and associated data.
   *
   * @param {object} data - The dialog's data.
   * @param {{action: string, label: string, value: object}[]} [data.buttons] - Buttons to be displayed in the dialog.
   * @param {string} [data.title] - Dialog's title.
   * @param {string} [data.content] - Dialog's html content.
   * @param {object} [data.options] - Dialog's options.
   * @param {string} [direction = 'row'] - Controls layout direction of the dialog's buttons. 'column' or 'row' accepted.
   *
   * @returns {object} the value associated to the selected button.
   */
  async function buttonDialog(data, direction) {
    const buttons = [];

    data.buttons.forEach((button) => {
      buttons.push({
        action: button.action ?? button.label,
        label: button.label,
        callback: () => button.value,
      });
    });

    return await foundry.applications.api.DialogV2.wait({
      window: { title: data.title ?? "", position: { height: "100%" } },
      content: data.content ?? "",
      rejectClose: false,
      buttons,
      render: (_, dialog) => {
        const footer = dialog.element.querySelector("footer");
        footer.style["flex-direction"] = direction;
      },
      options: data.options ?? {},
    });
  }

  /**
   * Helper function to create a simple remote dialog with labeled buttons and associated data displayed to the specified user.
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
    return globalThis.elwinHelpers.socket.executeAsUser("elwinHelpers.remoteButtonDialog", userId, data, direction);
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
    const segmentDistances = simpleMeasureDistances(segments, { gridSpaces: true });
    if (MidiQOL.configSettings()?.optionalRules.distanceIncludesHeight) {
      const heightDifference = calculateTokeHeightDifference(sourceToken, targetToken);
      segmentDistances.forEach(
        (distance, index, arr) => (arr[index] = getDistanceAdjustedByVerticalDist(distance, heightDifference))
      );
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | getAttackSegment (simpleMeasureDistances)`, {
        segments,
        segmentDistances,
      });
    }
    const idxShortestSegment = segmentDistances.indexOf(Math.min(...segmentDistances));
    if (idxShortestSegment < 0) {
      return undefined;
    }
    const targetRect = new PIXI.Rectangle(targetToken.x, targetToken.y, targetToken.w, targetToken.h).getBounds();
    const targetSegment = segments[idxShortestSegment];
    const intersectSegments = targetRect.segmentIntersections(targetSegment[0], targetSegment[1]);
    if (debug) {
      console.warn(`${MACRO_NAME} | getAttackSegment (insersectSegments)`, {
        targetRect,
        targetSegment,
        intersectSegments,
      });
    }
    if (!intersectSegments?.length) {
      return undefined;
    }
    return { point: intersectSegments[0], segment: targetSegment };
  }

  /**
   * Get the distance segments between two objects. Based on midi-qol code used in getDistance.
   *
   * @param {Token5e} t1 - The first token.
   * @param {Token5e} t2 - The second token.
   * @param {boolean} wallBlocking - Whether to consider walls as blocking.
   *
   * @return {{x: number, y: number}[][]} an array of segments representing the distance between the two tokens.
   */
  function getDistanceSegments(t1, t2, wallBlocking = false) {
    const actor = t1.actor;
    const ignoreWallsFlag = foundry.utils.getProperty(actor, "flags.midi-qol.ignoreWalls");
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
            const segment = [origin, dest];
            if (wallBlocking) {
              const collisionCheck = CONFIG.Canvas.polygonBackends.move.testCollision(origin, dest, {
                mode: "any",
                type: "move",
              });
              if (debug) {
                console.warn(`${MACRO_NAME} | getDistanceSegments`, { segment, collisionCheck });
              }
              if (collisionCheck) {
                continue;
              }
            }
            segments.push(segment);
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
   * @param {{x: number, y: number}[][]} segments - Array of segments to measure distances for.
   * @param {object} options - Optional object with grid spaces configuration.
   *
   * @return {number[]} Array of distances for each segment.
   */
  function simpleMeasureDistances(segments, options = {}) {
    return segments.map((s) => {
      const result = canvas?.grid?.measurePath(s);
      return !options.gridSpaces ? result.euclidean : result.distance;
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
      t1Elevation + Math.max(t1.document.height, t1.document.width) * (canvas?.dimensions?.distance ?? 5);
    const t2TopElevation =
      t2Elevation + Math.min(t2.document.height, t2.document.width) * (canvas?.dimensions?.distance ?? 5); // assume t2 is trying to make itself small

    let heightDifference = 0;
    if (
      (t2Elevation > t1Elevation && t2Elevation < t1TopElevation) ||
      (t1Elevation > t2Elevation && t1Elevation < t2TopElevation)
    ) {
      //check if bottom elevation of each token is within the other token's elevation space, if so make the height difference 0
      heightDifference = 0;
    } else if (t1Elevation < t2Elevation) {
      // t2 above t1
      heightDifference = Math.max(0, t2Elevation - t1TopElevation) + (canvas?.dimensions?.distance ?? 5);
    } else if (t1Elevation > t2Elevation) {
      // t1 above t2
      heightDifference = Math.max(0, t1Elevation - t2TopElevation) + (canvas?.dimensions?.distance ?? 5);
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
    if (["555", "5105"].includes(rule)) {
      let nd = Math.min(horizDistance, vertDistance);
      let ns = Math.abs(horizDistance - vertDistance);
      distance = nd + ns;
      let dimension = canvas?.dimensions?.distance ?? 5;
      if (rule === "5105") {
        distance = distance + Math.floor(nd / 2 / dimension) * dimension;
      }
    } else {
      distance = Math.sqrt(vertDistance * vertDistance + horizDistance * horizDistance);
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
  function getMoveTowardsPosition(token, point, options = { snapToGrid: true }) {
    const moveTowardsRay = new (foundry.canvas.geometry?.Ray ?? Ray)(token.center, point);
    const tokenIntersects = token.bounds.segmentIntersections(moveTowardsRay.A, moveTowardsRay.B);
    if (!tokenIntersects?.length) {
      if (debug) {
        console.warn(`${MACRO_NAME} | getMoveTowardsPosition no segmentIntersections found`, {
          tokenBounds: token.bounds,
          moveTowardsRay,
        });
      }
      return undefined;
    }
    const centerToBounds = new (foundry.canvas.geometry?.Ray ?? Ray)(moveTowardsRay.A, tokenIntersects[0]);

    const rayToCenter = (foundry.canvas.geometry?.Ray ?? Ray).towardsPoint(
      moveTowardsRay.A,
      moveTowardsRay.B,
      moveTowardsRay.distance - centerToBounds.distance
    );
    const tokenPos = { x: rayToCenter.B.x - token.w / 2, y: rayToCenter.B.y - token.h / 2 };
    let tokenPosSnapped = undefined;
    if (options?.snapToGrid && canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      const isTiny = token.document.width < 1 && token.document.height < 1;
      const mode = canvas.grid.isHexagonal
        ? CONST.GRID_SNAPPING_MODES.CORNER
        : isTiny
        ? CONST.GRID_SNAPPING_MODES.EDGE_MIDPOINT
        : CONST.GRID_SNAPPING_MODES.CORNER;
      tokenPosSnapped = canvas.grid.getSnappedPoint(tokenPos, { mode }, { token });
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | getMoveTowardsPosition`, { tokenPos, tokenPosSnapped });
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
    const tokenInitialDestBounds = new PIXI.Rectangle(destPos.x, destPos.y, token.w, token.h).getBounds();
    if (token.checkCollision(tokenInitialDestBounds.center, { type: "move", mode: "any" })) {
      if (debug) {
        console.warn(`${MACRO_NAME} | findMovableSpaceNearDest (wall collision initial destination)`, {
          tokenCenterPos: token.center,
          tokenDestCenterPos: tokenInitialDestBounds.center,
          wallCollision: true,
        });
      }
      return undefined;
    }

    const size = Math.max(token.document.width, token.document.height);
    const isTiny = size < 1;
    let mode = 0;
    let gridIncrement = 1;
    let gridDistance = size;
    if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
      mode = canvas.grid.isHexagonal
        ? CONST.GRID_SNAPPING_MODES.CORNER
        : isTiny
        ? CONST.GRID_SNAPPING_MODES.EDGE_MIDPOINT
        : CONST.GRID_SNAPPING_MODES.CORNER;
      gridIncrement = canvas.grid.isHexagonal || !isTiny ? 1 : size;
      gridDistance = isTiny ? 1 : size;
    }

    const posGen = nearbyPositionsGenerator(destPos, gridIncrement, gridDistance);

    let nearTokenShape = undefined;
    if (nearToken) {
      if (canvas.grid.isHexagonal) {
        // Use padded poly otherwise overlaps does not work for certain adjacent grid spaces.
        const points = canvas.grid.getBorderPolygon(
          nearToken.document.width,
          nearToken.document.height,
          CONFIG.Canvas.objectBorderThickness
        );
        nearTokenShape = new PIXI.Polygon(points).translate(nearToken.x, nearToken.y);
      } else {
        nearTokenShape = nearToken.bounds;
      }
    }

    const quadtree = canvas.tokens.quadtree;
    let collisionTest = (o, r) => o.t.id !== token.id && o.r.intersects(r);
    if (canvas.grid.isHexagonal) {
      collisionTest = (o, _) => {
        if (o.t.id === token.id) {
          return false;
        }
        const points = canvas.grid.getBorderPolygon(
          o.t.document.width,
          o.t.document.height,
          -CONFIG.Canvas.objectBorderThickness
        );
        const currentTokenShape = new PIXI.Polygon(points).translate(o.t.x, o.t.y);
        return currentTokenShape.overlaps(token.testCollisitionShape);
      };
    }
    let testIter = null;
    const unoccupiedDestinations = [];
    const occupiedDestinations = [];

    while (!(testIter = posGen.next()).done) {
      const testPos = testIter.value;
      const testPosSnapped = canvas.grid.getSnappedPoint(testPos, { mode }, { token });
      let adjTargetShape;
      let adjTargetForNeighborTestShape;

      if (canvas.grid.isHexagonal) {
        if (isTiny) {
          // For Tiny in hex grid we use a complete grid space to test touches near token
          const tmpPos = canvas.grid.getSnappedPoint({ testPos }, { mode });
          const tmpPoints = canvas.grid.getBorderPolygon(1, 1, 0);
          adjTargetForNeighborTestShape = new PIXI.Polygon(tmpPoints).translate(tmpPos.x, tmpPos.y);
        }
        const points = canvas.grid.getBorderPolygon(token.document.width, token.document.height, 0);
        adjTargetShape = new PIXI.Polygon(points).translate(testPosSnapped.x, testPosSnapped.y);
      } else {
        adjTargetShape = new PIXI.Rectangle(testPosSnapped.x, testPosSnapped.y, token.w, token.h).getBounds();
      }

      const paddedAdjTargetShape = adjTargetShape.clone().pad(-CONFIG.Canvas.objectBorderThickness);
      const paddedAdjTargetBounds =
        paddedAdjTargetShape instanceof PIXI.Rectangle ? paddedAdjTargetShape : paddedAdjTargetShape.getBounds();

      let touchesNearToken = true;
      let insideNearToken = false;
      if (nearToken) {
        adjTargetForNeighborTestShape ??= adjTargetShape;
        touchesNearToken = nearTokenShape.overlaps(adjTargetForNeighborTestShape);
        insideNearToken = nearTokenShape.overlaps(paddedAdjTargetShape);
      }
      if (debug) {
        console.warn(`${MACRO_NAME} | findMovableSpaceNearDest iter`, {
          testPos,
          testPosSnapped,
          testGrid: canvas.grid.getOffset(testPosSnapped),
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
        type: "move",
        mode: "any",
      });
      if (wallCollision) {
        if (debug) {
          console.warn(`${MACRO_NAME} | findMovableSpaceNearDest (wall collision)`, {
            testPos,
            testPosCenter,
            origin: token.center,
            wallCollision,
          });
        }
        continue;
      }
      // Set shape on current token to be used by grid collision test
      token.testCollisitionShape = paddedAdjTargetShape;
      const overlappingTokens = quadtree.getObjects(paddedAdjTargetBounds, { collisionTest });
      if (debug) {
        console.warn(`${MACRO_NAME} | findMovableSpaceNearDest (token collision)`, {
          testPos,
          testPosSnapped,
          testPosCenter,
          origin: token.center,
          tokenCollision: !!overlappingTokens.size,
          overlappingTokens,
        });
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
  function* nearbyPositionsGenerator(startingPoint, gridIncrement, gridDistance) {
    const gridLoc = canvas.grid.getOffset(startingPoint);
    // Adjust starting location for partial grid distance increment on square grids only
    if (gridIncrement < 1 && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      const dim = canvas.dimensions.size;
      gridLoc.i += (startingPoint.y % dim) / dim;
      gridLoc.j += (startingPoint.x % dim) / dim;
    }
    // partial grid distance is not supported for types of Grid other than Square
    if (gridIncrement < 1 && canvas.grid.type !== CONST.GRID_TYPES.SQUARE) {
      gridIncrement = 1;
    }
    const positions = new Set();

    const seen = (position) => {
      const key = position.i + "." + position.j;
      if (positions.has(key)) {
        return true;
      }
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
        const pos = canvas.grid.getTopLeftPoint(loc);
        pos.ring = ring;
        yield pos;
      }

      ring += gridIncrement;
    }

    return { x: null, y: null, ring: null };
  }

  /**
   * Returns an array of grid locations corresponding to the specified location neighbors.
   *
   * @param {{i: number, j: number}} loc - Grid location's a row and column.
   * @param {number} gridIncrement - The grid increment, should be 1 for small or larger creatures and 0.5 for tiny ones.
   *
   * @returns {{i: number, j: number}[]} array containing the grid locations' row and column of the specified loc neighbors.
   */
  function getNeighbors(loc, gridIncrement) {
    if (gridIncrement < 1 && canvas.grid.type === CONST.GRID_TYPES.SQUARE) {
      let offsets = [
        { i: -gridIncrement, j: -gridIncrement },
        { i: -gridIncrement, j: 0 },
        { i: -gridIncrement, j: gridIncrement },
        { i: 0, j: -gridIncrement },
        { i: 0, j: gridIncrement },
        { i: gridIncrement, j: -gridIncrement },
        { i: gridIncrement, j: 0 },
        { i: gridIncrement, j: gridIncrement },
      ];
      return offsets.map((o) => ({ i: loc.i + o.i, j: loc.j + o.j }));
    } else {
      return canvas.grid.getAdjacentOffsets(loc);
    }
  }

  /**
   * Registers third party reactions for the specified token.
   *
   * @param {MidiQOL.Workflow} workflow - The current MidiQL workflow.
   * @param {Token5e} reactionToken - The token for which to register third party reactions.
   * @param {OnUseMacros} onUseMacros - On use macros of the token matching the current trigger from which to extract the reaction data.
   */
  async function registerThirdPartyReactions(workflow, reactionToken, onUseMacros) {
    if (!onUseMacros?.length) {
      return;
    }
    if (debug) {
      console.warn(`${MACRO_NAME} | registerThirdPartyReactions.`, { workflow, reactionToken, onUseMacros });
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
              case "canSee":
              case "ignoreSelf":
              case "pre":
              case "post":
              case "reactionNone":
              case "wallsBlock":
                options[name] = /true/.test(value.trim());
                break;
              case "range":
              case "disposition":
                options[name] = Number(value.trim());
                break;
              default:
                options[name] = value.trim();
                break;
            }
          }
        }
      }
      await registerThirdPartyReaction(workflow, reactionToken, onUseMacro.macroName, targetOnUse, options);
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
  async function registerThirdPartyReaction(workflow, reactionToken, macroName, targetOnUse, options = {}) {
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
      console.warn(`${MACRO_NAME} | No actor for reaction token.`, reactionToken);
      return;
    }
    let { item: reactionItem, activity: reactionActivity } = await getItemOrActivityFromMacroName(
      macroName,
      reactionToken.actor
    );
    if (options.activityUuid) {
      reactionActivity = await fromUuid(options.activityUuid);
      reactionItem = reactionActivity?.item;
    } else if (options.itemUuid) {
      reactionItem = await fromUuid(options.itemUuid);
      reactionActivity = undefined;
    }

    // Note: cast activities and linked spell items are not supported for TPRs
    if (reactionItem?.system.linkedActivity) {
      console.warn(`${MACRO_NAME} | Spells linked to cast activities are not supported, skipping registration.`, {
        workflow,
        reactionToken,
        macroName,
        targetOnUse,
        options,
        reactionItem,
        reactionActivity,
      });
      return false;
    }

    if (reactionActivity) {
      if (!reactionActivity?.item || reactionActivity?.activation?.type !== "reaction") {
        console.warn(
          `${MACRO_NAME} | Macro activity is not a reaction or does not have an item, skipping registration.`,
          {
            workflow,
            reactionToken,
            macroName,
            targetOnUse,
            options,
            reactionActivity,
          }
        );
        return;
      }
      if (reactionActivity.type === "cast") {
        console.warn(
          `${MACRO_NAME} | Macro activity is a cast activity which are not supported, skipping registration.`,
          {
            workflow,
            reactionToken,
            macroName,
            targetOnUse,
            options,
            reactionActivity,
          }
        );
        return false;
      }
    }
    if (
      !options.reactionNone &&
      !reactionActivity &&
      !reactionItem?.system?.activities?.some(
        (activity) => activity.activation?.type === "reaction" && activity.type !== "cast"
      )
    ) {
      console.warn(`${MACRO_NAME} | No supported reaction items found, skipping registration.`, {
        workflow,
        reactionToken,
        macroName,
        targetOnUse,
        options,
        reactionItem,
      });
      return;
    }

    workflow.thirdPartyReactions ??= {};
    const tokenReactionsInfo = (workflow.thirdPartyReactions[reactionToken.document.uuid] ??= { reactions: [] });
    const reactionInfo = {
      token: reactionToken,
      item: reactionItem,
      activities: options.reactionNone
        ? []
        : reactionActivity
        ? [reactionActivity]
        : reactionItem.system.activities.filter(
            (activity) => activity.activation?.type === "reaction" && activity.type !== "cast"
          ),
      macroName,
      targetOnUse,
      triggerSource: options.triggerSource ?? "target",
      canSee: options.canSee ?? false,
      ignoreSelf: options.ignoreSelf ?? false,
      preMacro: (options.pre && !options.reactionNone) ?? false,
      postMacro: (options.post && !options.reactionNone) ?? false,
      reactionNone: options.reactionNone ?? false,
    };
    if (reactionInfo.reactionNone) {
      reactionInfo.range = options.range;
      reactionInfo.disposition = options.disposition;
      reactionInfo.wallsBlock = options.wallsBlock;
      reactionInfo.condition = options.condition;
    }
    tokenReactionsInfo.reactions.push(reactionInfo);
  }

  /**
   * Returns the item associated to the specifed macro name.
   *
   * Note: this uses the same logic has MidiQOL in Workflow.callMacro.
   *
   * @param {string} macroName - Name of the macro which should be associated to an item.
   * @param {Actor5e} actor - The current workflow actor.
   *
   * @returns {{{Item5e} item, {Activity} activity} the item or activity associated to the specifed macroName.
   */
  async function getItemOrActivityFromMacroName(macroName, actor) {
    let MQItemMacroLabel = getI18n("midi-qol.ItemMacroText");
    if (MQItemMacroLabel === "midi-qol.ItemMacroText") {
      MQItemMacroLabel = "ItemMacro";
    }
    let MQActivityMacroLabel = getI18n("midi-qol.ActivityMacroText");
    if (MQActivityMacroLabel === "midi-qol.ActivityMacroText") {
      MQActivityMacroLabel = "ActivityMacro";
    }

    let [name, uuid] = macroName?.trim().split("|") ?? [undefined, undefined];
    let macroItem = undefined;
    let macroActivity = undefined;

    if (uuid?.length > 0) {
      let macroEntity = fromUuidSync(uuid);
      if (macroEntity) {
        if (macroEntity instanceof ActiveEffect && macroEntity.parent instanceof Item) {
          macroItem = macroEntity.parent;
        } else if (macroEntity instanceof Item) {
          macroItem = macroEntity;
        } else if (macroEntity.item) {
          // it points to an activity
          macroItem = macroEntity.item;
          macroActivity = macroEntity;
        }
      }
    }
    if (!name) {
      return undefined;
    }
    if (name.startsWith("function.")) {
      // Do nothing, use the macroItem UUID contained in the macroName
    } else if (name.startsWith(MQItemMacroLabel) || name.startsWith("ItemMacro")) {
      if (name === "ItemMacro" || name === MQItemMacroLabel) {
        // Do nothing, use the macroItem UUID contained in the macroName
      } else {
        const parts = name.split(".");
        const itemNameOrUuid = parts.slice(1).join(".");
        macroItem = await fromUuid(itemNameOrUuid); // item or activity
        if (macroItem?.item) {
          macroActivity = macroItem;
          macroItem = macroItem.item;
        }
        // ItemMacro.name
        if (!macroItem) {
          macroItem = actor.items.find(
            (i) =>
              i.name === itemNameOrUuid &&
              (foundry.utils.getProperty(i.flags, "dae.macro") ?? foundry.utils.getProperty(i.flags, "itemacro.macro"))
          );
        }
        if (!macroItem && uuid) {
          let itemId;
          if (uuid.includes("Activity.")) {
            itemId = uuid.split(".").slice(-3)[0];
          } else {
            itemId = uuid.split(".").slice(-1)[0];
          }
          const itemData = actor.effects.find((effect) => effect.flags.dae?.itemData?._id === itemId)?.flags.dae
            .itemData;
          if (itemData) {
            macroItem = itemData;
          }
        }
      }
    } else if (name.startsWith(MQActivityMacroLabel) || name.startsWith("ActivityMacro")) {
      // ActivityMacro
      // ActivityMacro.uuid
      // ActivityMacro.identifier
      // ActivityMacro.ActivityName
      if (name === MQActivityMacroLabel || name === "ActivityMacro") {
        // Do nothing
      } else {
        const parts = name.split(".");
        const activitySpec = parts.slice(1).join(".");
        let itemToUse = macroItem;
        const activityOrItem = activitySpec ? await fromUuid(activitySpec) : macroActivity;
        if (activityOrItem instanceof Item) {
          itemToUse = activityOrItem;
        } else {
          itemToUse = activityOrItem?.item ?? macroItem;
        }
        // ActivityMacro.name or ActivityMacro.uuid where not found by fromUuid
        if (activityOrItem) {
          macroActivity = activityOrItem;
        }
        const itemId = parts.at(-1);
        if (!macroActivity) {
          macroActivity = itemToUse?.system.activities?.find(
            (activity) => activity.identifier === itemId && activity.macro?.command
          );
        }
        if (!macroActivity) {
          macroActivity = itemToUse?.system.activities?.find(
            (activity) => activity._id === itemId && activity.macro?.command
          );
        }
        if (!macroActivity) {
          macroActivity = itemToUse?.system.activities?.find(
            (activity) => activity.name === itemId && activity.macro?.command
          );
        }
        if (!macroActivity && activityOrItem instanceof Item) {
          const activity = itemToUse?.system.activities?.contents[0];
          macroActivity ??= activity?.macro.command ? activity : undefined;
        } else if (!macroActivity) {
          macroActivity ??= activityOrItem?.macro.command ? activityOrItem : undefined;
        }
      }
    } else {
      // get a world/compendium macro.
      if (name.startsWith("Macro.")) {
        name = name.replace("Macro.", "");
      }
      const macro = game.macros?.getName(name);
      if (!macro) {
        const itemOrMacro = await fromUuid(name);
        if (itemOrMacro instanceof Item) {
          macroItem = itemOrMacro;
        } else if (itemOrMacro instanceof Macro) {
          // Do nothing, use
        }
      }
    }
    return { item: macroActivity ? macroActivity.item : macroItem, activity: macroActivity };
  }

  async function checkActivityUsage(activity, maxCastLevel, usedReaction) {
    if (!activity) {
      return false;
    }
    const item = activity.item;

    if ((activity.activation?.value ?? 1) > 0 && usedReaction) {
      if (debug) {
        console.warn(`${MACRO_NAME} | checkUsage - ${item.name}-${activity.name}: reaction used and cost not zero.`);
      }
      return false; // TODO can't specify 0 cost reactions in dnd5e 4.x - have to find another way
    }

    if (!item.system.attuned && item.system.attunement === "required") {
      if (debug) {
        console.warn(`${MACRO_NAME} | checkUsage - ${item.name}-${activity.name}: item not attuned.`);
      }
      return false;
    }

    // Note: third party reactions on cast activities are not supported, they are filtered on registration
    let isValid = false;
    if (item.type === "spell") {
      if (MidiQOL.configSettings().ignoreSpellReactionRestriction) {
        isValid = true;
      } else if (["atwill", "innate"].includes(item.system.preparation.mode)) {
        isValid = true;
      } else if (item.system.level === 0) {
        isValid = true;
      } else if (item.system.preparation?.prepared !== true && item.system.preparation?.mode === "prepared") {
        if (debug) {
          console.warn(`${MACRO_NAME} | checkUsage - ${item.name}-${activity.name}: spell not prepared.`);
        }
        return false;
      } else if (item.system.level <= maxCastLevel) {
        isValid = true;
      }
    } else {
      const config = activity._prepareUsageConfig({ create: false });
      const canUse = await activity._prepareUsageUpdates(config, { returnErrors: true });
      if (canUse instanceof Array) {
        // insufficent uses available
        if (debug) {
          console.warn(`${MACRO_NAME} | checkUsage - ${item.name}-${activity.name}: insufficent uses available.`);
        }
        return false;
      }
      isValid = true;
    }
    return isValid;
  }

  //----------------------------------
  // Copied from midi-qol because its not exposed in the API
  function getI18n(key) {
    return game.i18n.localize(key);
  }

  function getI18nOptions(key) {
    const translations = game.i18n.translations["midi-qol"] ?? {};
    const fallback = game.i18n._fallback["midi-qol"] ?? {};
    return translations[key] ?? fallback[key] ?? {};
  }

  /**
   * Returns the token name to be displayed in messages.
   * @param {Token5e} entity
   * @returns {string} the token name to be displayed.
   */
  function getTokenName(entity) {
    if (!entity) {
      return "<unknown>";
    }
    if (!(entity instanceof (foundry.canvas.placeables?.Token ?? Token))) {
      return "<unknown>";
    }
    if (MidiQOL.configSettings().useTokenNames) {
      return entity.name ?? entity.actor?.name ?? "<unknown>";
    } else {
      return entity.actor?.name ?? entity.name ?? "<unknown>";
    }
  }

  function getToken(tokenRef) {
    if (!tokenRef) {
      return undefined;
    }
    if (tokenRef instanceof (foundry.canvas.placeables?.Token ?? Token)) {
      return tokenRef;
    }
    if (tokenRef instanceof TokenDocument) {
      return tokenRef.object;
    }
    if (typeof tokenRef === "string") {
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
    if (MidiQOL.configSettings().usePlayerPortrait && token.actor?.type === "character") {
      img = token.actor?.img ?? token.document?.texture.src;
    }
    if (VideoHelper.hasVideoExtension(img ?? "")) {
      img = await game.video.createThumbnail(img ?? "", { width: 100, height: 100 });
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

  ////////////////// Remote functions ///////////////////////////////

  function registerRemoteFunctions() {
    const socket = socketlib.registerSystem(game.system.id);
    socket.functions?.clear();
    socket.register("elwinHelpers.remoteButtonDialog", _remoteButtonDialog);
    socket.register("elwinHelpers.remoteCreateEnchantment", _remoteCreateEnchantment);
    socket.register("elwinHelpers.remoteDeleteEnchantment", _remoteDeleteEnchantment);
    socket.register("elwinHelpers.remoteAttachAmbientLightToTemplate", _remoteAttachAmbientLightToTemplate);

    exportIdentifier("elwinHelpers.socket", socket);
  }

  async function _remoteButtonDialog(data, direction) {
    return await buttonDialog(data, direction);
  }

  async function _remoteCreateEnchantment(enchantmentEffectData, options) {
    const itemToEnchant = fromUuidSync(options?.parentUuid);
    if (!itemToEnchant) {
      return undefined;
    }
    options.parent = itemToEnchant;
    delete options.parentUuid;
    return (await createEnchantment(enchantmentEffectData, options))?.uuid;
  }

  async function _remoteDeleteEnchantment(enchantmentEffectUuid, options) {
    const effect = fromUuidSync(enchantmentEffectUuid);
    if (!effect || !(effect instanceof ActiveEffect) || effect.type !== "enchantment") {
      if (debug) {
        console.warn(`${MACRO_NAME} | Invalid enchantment effect UUID or not an enchantment effect.`, {
          enchantmentEffectUuid,
        });
      }
      return undefined;
    }
    await effect.delete(options);
  }

  async function _remoteAttachAmbientLightToTemplate(templateUuid, ambientLightData) {
    const templateDocument = fromUuidSync(templateUuid);
    return (await attachAmbientLightToTemplate(templateDocument, ambientLightData))?.uuid;
  }
}
