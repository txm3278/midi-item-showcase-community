// ##################################################################################################
// Author: Elwin#1410
// Read First!!!!
// Reaction that reduces the damage received from ranged weapon attack and allows to throw it back
// to the attacker using a Ki point when the appropiate conditions are met.
// v2.3.1
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor and item macro [preItemRoll],[preActiveEffects],[postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// This feature is a reaction activity that gets triggered when appropriate. When the damage received is
// reduced to 0, it allows to catch or throw back (by spending a use of Ki) the missile to the attacker.
// Note: A scale dice value must be configured on the 'Monk' class,
//       its data value should resolve to '@scale.monk.martial-arts.die'.
//
// Description:
// There are multiple calls of this item macro, dependending on the trigger.
// In the preItemRoll (item OnUse) phase of the reaction activity (in owner's workflow):
//   Clears the previously saved damage reduction flag.
// In the preActiveEffects (item onUse) phase of the reaction activity (in owner's workflow):
//   Sets a flag to save the damage reduction rolled.
// In the postActiveEffects (item onUse) phase of the reaction activity (in owner's workflow):
//   If the damage received is reduced to 0, prompts a dialog to choose if the weapon can be caught
//   and thrown back to the attacker (by spending a use of Ki).
//   If caught but not thrown back, the item is added to the actor's inventory when possible.
//   if thrown back, a synthetic item is used to process the ranged attack on the attacker.
// ###################################################################################################

export async function deflectMissiles({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  // Default name of the feature
  const DEFAULT_ITEM_NAME = 'Deflect Missiles';
  const MODULE_ID = 'midi-item-showcase-community';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5')) {
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

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preItemRoll') {
    if (scope.rolledActivity?.identifier === 'reaction') {
      await scope.rolledItem.setFlag(MODULE_ID, 'deflectMissilesDmgReduction', 0);
      // Note: when in full auto mode the value of the setFlag is not seen by the initial attack workflow, so we also need to set it.
      foundry.utils.setProperty(scope.rolledItem, `flags.${MODULE_ID}.deflectMissilesDmgReduction`, 0);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'preActiveEffects') {
    if (scope.rolledActivity?.identifier === 'reaction') {
      const deflectTotal = workflow.utilityRolls?.reduce((acc, r) => acc + r.total, 0);
      await scope.rolledItem.setFlag(MODULE_ID, 'deflectMissilesDmgReduction', deflectTotal);
      // Note: when in full auto mode the value of the setFlag is not seen by the initial attack workflow, so we also need to set it.
      foundry.utils.setProperty(scope.rolledItem, `flags.${MODULE_ID}.deflectMissilesDmgReduction`, deflectTotal);
    }
  } else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (scope.rolledActivity?.identifier !== 'reaction') {
      return;
    }
    const deflectTotal = workflow.utilityRolls?.reduce((acc, r) => acc + r.total, 0);

    if (deflectTotal < workflow.workflowOptions.damageTotal) {
      return;
    }

    const damageSourceInfo = getDamageSourceInfo(workflow);
    const throwBackAttackActivity = scope.rolledItem.system.activities?.find(
      (a) => a.identifier === 'throw-back-attack'
    );
    if (!throwBackAttackActivity) {
      console.error(`${DEFAULT_ITEM_NAME} | Missing throw back attack activity.`, { item: scope.rolledItem });
      return;
    }
    const throwBackUses = actor.items.get(throwBackAttackActivity.consumption?.targets[0]?.target)?.system.uses;
    const nbUses = throwBackUses?.value ?? 0;
    const maxUses = throwBackUses?.max ?? 0;

    const result = await showDialog(scope.rolledItem, nbUses, maxUses, canCatchDefault(actor, damageSourceInfo));
    if (!result?.canCatch) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Actor cannot catch the missile.`, { result });
      }
      return;
    }
    if (!result?.throwBack) {
      if (damageSourceInfo.isAmmo && !damageSourceInfo.ammo) {
        damageSourceInfo.ammo = await getAmmoFromCompendium(damageSourceInfo);
        if (damageSourceInfo.ammo) {
          damageSourceInfo.effectiveItem = damageSourceInfo.ammo;
        }
      }
      if ((damageSourceInfo.isAmmo && damageSourceInfo.ammo) || (!damageSourceInfo.isAmmo && damageSourceInfo.item)) {
        await actor.createEmbeddedDocuments('Item', [damageSourceInfo.effectiveItem.clone({ 'system.quantity': 1 })]);
        const infoMsg = `<p></strong>${damageSourceInfo.effectiveItem.name}</strong> was added to your inventory.</p>`;
        await elwinHelpers.insertTextIntoMidiItemCard('beforeButtons', workflow, infoMsg);
      } else {
        const infoMsg = `<p></strong>${damageSourceInfo.effectiveItem.name}</strong>${
          damageSourceInfo.isAmmo ? ' ammunition' : ''
        } could not be added to your inventory.</p>`;
        await elwinHelpers.insertTextIntoMidiItemCard('beforeButtons', workflow, infoMsg);
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | Could not add item to inventory.`, { damageSourceInfo });
        }
      }
    } else {
      const throwBackItemData = createThrownItem(throwBackAttackActivity, workflow.workflowOptions?.damageDetail);
      const throwBackItem = new CONFIG.Item.documentClass(throwBackItemData, {
        parent: workflow.actor,
      });
      throwBackItem.prepareData();
      throwBackItem.prepareFinalAttributes();
      const target = MidiQOL.tokenForActor(damageSourceInfo.actor);

      const config = {
        midiOptions: {
          targetUuids: [target.document?.uuid],
          workflowOptions: { notReaction: true, autoConsumeResource: 'both' },
          ignoreUserTargets: true,
        },
      };

      if (game.release.generation > 12) {
        await MidiQOL.completeItemUse(throwBackItem, config);
      } else {
        await MidiQOL.completeItemUseV2(throwBackItem, config);
      }
    }
  }

  /**
   * Returns the damage source info.
   * @param {MidiQOL.workflow} currentWorkflow - The current MidiQOL workflow.
   * @returns {object} the damage source info.
   */
  function getDamageSourceInfo(currentWorkflow) {
    const damageSourceInfo = {};
    damageSourceInfo.ammo = fromUuidSync(currentWorkflow.workflowOptions.sourceAmmoUuid);
    damageSourceInfo.item = fromUuidSync(currentWorkflow.workflowOptions.sourceItemUuid);
    damageSourceInfo.effectiveItem = damageSourceInfo.ammo ?? damageSourceInfo.item;
    damageSourceInfo.actor = fromUuidSync(currentWorkflow.workflowOptions.sourceActorUuid);
    damageSourceInfo.actorSize = elwinHelpers.getActorSizeValue(damageSourceInfo.actor);
    damageSourceInfo.isAmmo =
      (damageSourceInfo.ammo?.type === 'consumable' && damageSourceInfo.ammo.system.type?.value === 'ammo') ||
      (damageSourceInfo.item?.type === 'weapon' && damageSourceInfo.item.system.properties?.has('amm'));
    damageSourceInfo.isTwoHanded =
      damageSourceInfo.item?.type === 'weapon' && damageSourceInfo.item.system.properties?.has('two');
    damageSourceInfo.isHeavy =
      damageSourceInfo.item?.type === 'weapon' && damageSourceInfo.item.system.properties?.has('hvy');
    return damageSourceInfo;
  }

  /**
   * Returns true when the missile can probably be caugth.
   *
   * @param {Actor6e} sourceActor - The attacking actor.
   * @param {object} damageSourceInfo - The damage source info.
   * @returns {{value: boolean, reason: string}} true if the missile can probably be caugth,
   *          false if not with the reason specified.
   */
  function canCatchDefault(sourceActor, damageSourceInfo) {
    const sourceSize = elwinHelpers.getActorSizeValue(sourceActor);
    // TODO check if actor has one free hand...
    if (damageSourceInfo.isAmmo) {
      if (damageSourceInfo.actorSize >= sourceSize + 2) {
        // Cannot catch ammo from creatures two size larger or more
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch ammo from creatures two size larger or more.`, {
            sourceActor,
            damageSourceInfo,
          });
        }
        return {
          value: false,
          reason: 'Note: Should probably not be able to catch ammunition from creatures two size larger or more.',
        };
      }
      if (damageSourceInfo.item.system.type?.value === 'siege') {
        // Cannot catch ammo from siege weapons
        if (debug) {
          console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch ammo from siege weapons.`, {
            sourceActor,
            damageSourceInfo,
          });
        }
        return { value: false, reason: 'Note: Should probably not be able to catch ammunition from siege weapons.' };
      }
      // TODO check weigth?
      return { value: true };
    }
    if (damageSourceInfo.actorSize >= sourceSize + 1) {
      // Cannot catch thrown weapon from creatures one size larger and more
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch thrown weapon from creatures one size larger or more.`, {
          sourceActor,
          damageSourceInfo,
        });
      }
      return {
        value: false,
        reason: 'Note: Should probably not be able to catch a thrown weapon from creatures one size larger or more.',
      };
    }
    if (damageSourceInfo.isTwoHanded) {
      // Cannot catch weapon requiring two hands
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch weapon requiring two hands.`, {
          sourceActor,
          damageSourceInfo,
        });
      }
      return { value: false, reason: 'Note: Should probably not be able to catch a weapon requiring two hands.' };
    }
    if (damageSourceInfo.isHeavy) {
      // Cannot catch heavy weapon
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Cannot catch heavy weapon.`, {
          sourceActor,
          damageSourceInfo,
        });
      }
      return { value: false, reason: 'Note: Should probably not be able to catch an heavy weapon.' };
    }
    // TODO check weigth?
    return { value: true };
  }

  /**
   * Returns an ammunition item from the DND5E compendium corresponding to the type
   * of ammunition needed by the firing item.
   * @param {object} dataSourceInfo - The damage source info.
   * @returns {Item5e|undefined} the ammunition item corresponding to the firing item if found or standard.
   */
  async function getAmmoFromCompendium(dataSourceInfo) {
    if (dataSourceInfo.isAmmo && !dataSourceInfo.ammo && dataSourceInfo.actorSize <= elwinHelpers.getSizeValue('med')) {
      const ammoType = dataSourceInfo.item?.system.ammunition?.type;
      const ammoId = CONFIG.DND5E.ammoIds[ammoType];
      return await fromUuid(`Compendium.dnd5e.items.Item.${ammoId}`);
    }
    return undefined;
  }

  /**
   * Returns an item to be used to throw back the catched missile.
   * @param {Activity} throwBackAttackActivity - The throw back attack activity.
   * @param {object} damageDetail - The damage detail of the missile attack.
   * @returns {Item5e} the item to be used to throw back the catched missile.
   */
  function createThrownItem(throwBackAttackActivity, damageDetail) {
    const thrownItemData = {
      name: throwBackAttackActivity.item.name,
      type: 'weapon',
      img: throwBackAttackActivity.item.img,
      system: {
        activities: {},
        identifier: 'deflect-missiles-thrown-item',
        type: {
          value: 'simpleR',
        },
        proficient: 1,
        range: {
          value: 20,
          long: 60,
          reach: null,
          units: 'ft',
        },
      },
    };
    const activityData = throwBackAttackActivity.toObject();
    foundry.utils.setProperty(activityData, 'midiProperties.automationOnly', false);
    let damageType = damageDetail?.[0]?.type ?? 'bludgeoning';
    if (activityData.damage?.parts[0]) {
      activityData.damage.parts[0].types = [damageType];
    }
    thrownItemData.system.activities[throwBackAttackActivity.id] = activityData;

    return thrownItemData;
  }

  /**
   * Presents a dialog to choose if a missile can be caught and thrown back.
   * @param {Item5e} sourceItem - The Deflect Missiles feature.
   * @param {number} nbUses - number of remaining uses.
   * @param {number} maxUses - maximum number of uses.
   * @param {{value: boolean, reason: string}} canCatchDefault - Default value of the can catch checkbox.
   * @returns {{canCatch: boolean, throwBack: boolean}|undefined} the result of the choices or undefined if the dialog is cancelled.
   */
  async function showDialog(sourceItem, nbUses, maxUses, canCatchDefault) {
    let choices = [];
    if (!canCatchDefault.value) {
      choices.push(`<p><i>${canCatchDefault.reason}</i></p>`);
    }
    choices.push(
      new foundry.data.fields.BooleanField({
        initial: true,
        label: 'Can Catch Missile',
        hint: 'Missile is small enough for you to hold in one hand and you have at least one hand free.',
      }).toFormGroup({}, { name: 'canCatch', value: canCatchDefault.value }).outerHTML
    );

    if (nbUses > 0) {
      choices.push(
        new foundry.data.fields.BooleanField({
          initial: true,
          label: `Throw Back Missile (${nbUses}/${maxUses})`,
          hint: 'Throw the missile back at the attacker',
        }).toFormGroup({}, { name: 'throwBack', value: false }).outerHTML
      );
    }
    return foundry.applications.api.DialogV2.wait({
      window: { title: `${sourceItem.name}` },
      content: `<fieldset>${choices.join('')}</fieldset>`,
      defaultYes: true,
      modal: true,
      rejectClose: false,
      buttons: [
        {
          action: 'ok',
          label: 'Ok',
          callback: (_, button, __) =>
            new (foundry.applications.ux?.FormDataExtended ?? FormDataExtended)(button.form).object,
        },
        {
          action: 'cancel',
          label: 'Cancel',
        },
      ],
      render: (_, dialog) => {
        const canCatchEl = (dialog.element ?? dialog).querySelector('[name=canCatch]');
        const throwBackEl = (dialog.element ?? dialog).querySelector('[name=throwBack]');
        if (throwBackEl) {
          throwBackEl.disabled = !canCatchEl.checked;
        }
        canCatchEl?.addEventListener('change', () => {
          if (throwBackEl) {
            throwBackEl.disabled = !canCatchEl.checked;
          }
        });
      },
    });
  }
}
