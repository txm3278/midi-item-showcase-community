// ##################################################################################################
// Read First!!!!
// Allows to designate a sworn enemy and applies the bow's effect when attacking a sworn enemy.
// v2.1.0
// Author: Elwin#1410 based on Christopher version
// Dependencies:
//  - DAE [on][off]
//  - Times up
//  - MidiQOL "on use" item macro, [preDamageRoll],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
//  When equipped and attuned, an activity can be used to designate a sworn enemy. When this activity is used,
//  it allows to designate a sworn enemy, this applies one AE on the attacker and one on the target to be able to apply the effects.
//  When a sworn enemy is attacked with this bow, it applies its effects.
//
// Description:
// In the preDamageRollConfig (OnUse) phase of the Oathbow Attack activity (owner's workflow):
//   If the activity is a ranged weapon attack that targets the Sworn Enemy,
//   calls elwinHelpers.damageConfig.updateBasic to add a hook on dnd5e.preRollDamageV2 that adds damage bonus.
// In the postActiveEffects (OnUse) phase of the Oathbow Designate Sworn Enemy activity (owner's workflow):
//   Updates the attacker's AE to add a flag that designates the Sworn Enemy toknen's UUID and makes the
//   attacker and target AEs dependent.
// When the Oathbow AE is activated [on]:
//   Disables the automation only flag of the Designate Sworn Enemy activity.
// When the Oathbow AE is deactivated [off]:
//   Enables the automation only flag of the Designate Sworn Enemy activity
//   and deletes any Sworn Enemy - Attacker AE.
// When the Oathbow - Sworn Enemy - Attacker AE expires [off]:
//   If the target referenced in the effect has 0 HP, sets the spent uses of the
//   Designate Sworn Enemy activity to its max uses (this will force to wait until next dawn to use it again).
// ###################################################################################################

export async function oathbow({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the item
  const DEFAULT_ITEM_NAME = 'Oathbow';
  const MODULE_ID = 'midi-item-showcase-community';
  // Set to false to remove debug logging
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.2')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRollConfig') {
    await handleOnUsePreDamageRollConfig(scope, workflow);
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (workflow.activity?.identifier === 'designate-sworn-enemy') {
      return await handleOnUsePostActiveEffectsSwornEnemy(workflow, actor, scope.macroItem);
    }
  } else if (args[0] === 'on') {
    if (scope.lastArgValue?.efData.transfer) {
      await handleOnEffectTransfer(scope.macroItem);
    }
  } else if (args[0] === 'off') {
    if (scope.lastArgValue?.efData.transfer) {
      await handleOffEffectTransfer(scope.macroItem);
    } else {
      await handleOffEffectAttacker(scope.macroActivity, scope.lastArgValue?.efData);
    }
  }

  /**
   * Handles the preDamageRollConfig phase of the Attack activity.
   * If the current activity is an attack with an action type of 'rwak', there is only one hit target
   * and its the marked sworn enemy, calls elwinHelpers.damageConfig.updateBasic to add a
   * hook on dnd5e.preRollDamageV2 that adds damage bonus.
   *
   * @param {object} scope - The midi-qol macro call scope object.
   * @param {MidiQOL.Workflow} workflow - The current MidiQOL workflow.
   */
  async function handleOnUsePreDamageRollConfig(scope, workflow) {
    if (
      workflow.activity?.identifier === 'attack' &&
      workflow.hitTargets?.size === 1 &&
      actor.getFlag(MODULE_ID, 'oathbowSwornEnemy') === workflow.hitTargets?.first()?.document.uuid &&
      workflow.activity?.getActionType(workflow.attackMode) === 'rwak'
    ) {
      elwinHelpers.damageConfig.updateBasic(scope, workflow, {
        damageBonus: '3d6[piercing]',
        flavor: `${scope.macroItem.name} - Sworn Enemy Extra Damage`,
        debug,
      });
    }
  }

  /**
   * Handles the post active effects of Designate Sworn Enemy activity.
   * Updates the attacker AE to add the target's uuid and adds dependencies between attacker and target AEs.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current MidiQOL workflow.
   * @param {Actor5e} sourceActor - The actor using the activity.
   * @param {Item5e} sourceItem - The Oathbow item.
   */
  async function handleOnUsePostActiveEffectsSwornEnemy(currentWorkflow, sourceActor, sourceItem) {
    const target = currentWorkflow.targets.first();

    const effectSource = sourceActor.effects?.find((ae) => !ae.transfer && ae.origin?.startsWith(sourceItem.uuid));
    if (!effectSource) {
      console.error(`${sourceItem} | Missing Sworn Enemy - Attacker AE.`);
      return;
    }
    const changes = foundry.utils.deepClone(effectSource.changes);
    changes.push({
      key: `flags.${MODULE_ID}.oathbowSwornEnemy`,
      value: target.document.uuid,
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      priority: 20,
    });
    await effectSource.update({ changes });

    const effectTarget = target.actor?.effects?.find((ae) => !ae.transfer && ae.origin?.startsWith(sourceItem.uuid));
    if (!effectTarget) {
      console.error(`${sourceItem} | Missing Sworn Enemy - Target AE.`);
      return;
    }

    await MidiQOL.addDependent(effectSource, effectTarget);
    await MidiQOL.addDependent(effectTarget, effectSource);
  }

  /**
   * Disables automation only of the Designate Sworn Enemy activity.
   *
   * @param {Item5e} sourceItem - The Oathbow.
   */
  async function handleOnEffectTransfer(sourceItem) {
    await sourceItem?.system.activities
      ?.find((a) => a.identifier === 'designate-sworn-enemy')
      ?.update({ 'midiProperties.automationOnly': false });
  }

  /**
   * Enables automation only of the Designate Sworn Enemy activity.
   *
   * @param {Item5e} sourceItem - The Oathbow.
   */
  async function handleOffEffectTransfer(sourceItem) {
    await sourceItem?.system.activities
      ?.find((a) => a.identifier === 'designate-sworn-enemy')
      ?.update({ 'midiProperties.automationOnly': true });
    await sourceItem?.actor.effects?.find((ae) => !ae.transfer && ae.origin?.startsWith(sourceItem.uuid))?.delete();
  }

  /**
   * Verifies if the actor associated to the sworn enemy token UUID has 0 HP, if its the
   * case, the spent uses of the Designate Sworn Enemy is set to the max uses.
   * This prevents the activity to be used before the next Dawn.
   *
   * @param {Activity} sourceActivity - The AE origin's activity.
   * @param {object} effectData - The AE data.
   */
  async function handleOffEffectAttacker(sourceActivity, effectData) {
    const targetDoc = await fromUuid(
      effectData?.changes.find((ch) => ch.key === `flags.${MODULE_ID}.oathbowSwornEnemy`)?.value
    );
    if ((targetDoc?.actor?.system.attributes?.hp?.value ?? 0) <= 0) {
      await sourceActivity?.update({ 'uses.spent': sourceActivity?.uses.max });
    }
  }
}
