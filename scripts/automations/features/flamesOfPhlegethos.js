// ##################################################################################################
// Read First!!!!
// Rerolls ones on fire damage spells. It also adds a flame effect that sheds light on the caster when
// a spell with fire damage is cast and an aura effect that allows to damage any creature within 5' hitting him
// with a melee attack.
// v2.1.0
// Author: Elwin#1410
// Dependencies:
//  - DAE
//  - Times Up
//  - MidiQOL "on use" item macro [postDamageRoll][isDamaged]
//  - Active Token Effects
//  - Elwin Helpers world script
//  - Token Magic FX (optional)
//  - Dice So Nice (optional)
//
// How to configure:
// The item details must be:
//   - Feature Type: Feat
//   - Activation cost: (empty)
//   - Action type: (empty)
// The Feature Midi-QOL must be:
//   - Confirm Targets: Never
//   - Roll a separate attack per target: Never
//   - This item macro code must be added to the DIME code of this feat.
// One effect must also be added:
//   - Flames of Phlegethos:
//      - Transfer Effect to Actor on ItemEquip (checked)
//      - Effects:
//          - flags.midi-qol.onUseMacroName | Custom | ItemMacro,postDamageRoll
//
// Usage:
// This is a passive feat, it will trigger when the requirements for the different effects are met.
//
// Description:
// In the postDamageRoll (OnUse) phase:
//   If item used is a spell and inflicts fire damage, the user will be prompted if he wants to reroll
//   any ones and if he wants to activate the flames. The ones are rerolled if the user
//   said yes and an active effect is added, if the user said yes to active the flames, it adds an effect
//   to shed light and if Token Magic FX is active, it will also add a flame effect. An onuse macro is also
//   registered on the isDamaged event. This will cause this macro to be called when a creature damages the
//   caster.
// In the isDamaged (TargetOnUse) (in attacker's workflow):
//   If it was a melee attack and the attacker that damaged the caster is within 5' of him,
//   a midi-qol.RollComplete hook it registered to use a temporary item on the target's player.
// In the midi-qol.RollComplete hook (in attacker's workflow )
//   Excecutes the temporary item use on the target's player to apply the reactive damage to the attacker.
//   Note: This is done, to not interfere with other effects the attack could have.
// ###################################################################################################

export async function flamesOfPhlegethos({
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
  const DEFAULT_ITEM_NAME = 'Flames of Phlegethos';
  // Set to false to remove debug logging
  const debug = false;
  // Normally should be one, but for test purpose can be set to an higher value
  const rerollNumber = 1;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '2.0'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME}: The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'times-up', 'midi-qol', 'ATL'];
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postDamageRoll') {
    if (
      scope.rolledItem?.type !== 'spell' ||
      !(workflow.damageRolls?.length ?? workflow.damageRoll)
    ) {
      // Only works on spell with damage rolls
      return;
    }
    // TODO check also for other dmg?
    const fireDmg = scope.rolledItem?.system.damage?.parts.some(
      ([formula, type]) => type === 'fire' || formula?.includes('[fire]')
    );
    if (!fireDmg) {
      // Spell must do fire damage to trigger effect
      return;
    }

    // TODO simplify when support for dnd5e 2.4.1 is removed
    const fireLabel =
      CONFIG.DND5E.damageTypes['fire'].label ??
      CONFIG.DND5E.damageTypes['fire'];
    let damageRolls = workflow.damageRolls ?? [workflow.damageRoll];
    const diceToReroll = damageRolls
      .map((roll) =>
        roll.dice.map((die) => ({ type: roll.options?.type, die }))
      )
      .flat()
      .filter(
        (data) =>
          ['fire', fireLabel].includes(
            data.die.options?.flavor || data.type || workflow.defaultDamageType
          ) &&
          data.die.results.some((r) => r.active && r.result <= rerollNumber)
      )
      .map((d) => d.die);

    const { activateFlames, rerollDice } =
      await promptActivateFlamesAndOrRerollDice(
        scope.macroItem,
        diceToReroll,
        rerollNumber
      );
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Activation prompt responses`, {
        activateFlames,
        rerollDice,
        diceToReroll,
      });
    }

    if (rerollDice && diceToReroll.length > 0) {
      diceToReroll.forEach((die) => die.reroll(`r<=${rerollNumber}`));
      if (debug) {
        console.warn(
          `${DEFAULT_ITEM_NAME} | Rerolled damage dice`,
          diceToReroll
        );
      }
      // setDamageRoll only needed for dndv3 2.4.1.
      if (!workflow.setDamageRolls) {
        await workflow.setDamageRoll(workflow.damageRoll);
      }
      await rollNewDice(diceToReroll);
    }

    if (activateFlames) {
      // Add active effect for aura (for reactive damage) and flames effects
      const flamesEffectData = getFlamesEffectData(scope.macroItem);

      // Delete the effect if it already exists before reapplying it
      await actor.effects.getName(flamesEffectData.name)?.delete();

      // FIXME we need to wait after delete and create, there seem to be a race condition between ATL and Token Magic FX and/or DAE.
      // Otherwise, ATL receives the new create event before the delete event...
      await wait(5);

      await actor.createEmbeddedDocuments('ActiveEffect', [flamesEffectData]);
      const message = `<p><strong>${
        scope.macroItem.name
      }</strong> - ${elwinHelpers.getTokenName(
        token
      )} is wreathed in flames</p>`;
      MidiQOL.addUndoChatMessage(
        await ChatMessage.create({
          content: message,
          whisper: ChatMessage.getWhisperRecipients('GM').map((u) => u.id),
        })
      );
    }
  } else if (
    args[0].tag === 'TargetOnUse' &&
    args[0].macroPass === 'isDamaged'
  ) {
    if (!['mwak', 'msak'].includes(scope.rolledItem?.system?.actionType)) {
      // Not a melee attack...
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Not a melee attack`);
      }
      return;
    }

    const targetToken = workflow.token;

    if (
      !actor ||
      !token ||
      !targetToken ||
      workflow.actorUuid === scope.macroItem?.parent.uuid
    ) {
      // Missing info or attacker is the owner of the feat...
      console.warn(
        `${DEFAULT_ITEM_NAME} | Missing info or attacker hits himself`,
        actor,
        token,
        targetToken,
        scope.macroItem
      );
      return;
    }
    const dist = MidiQOL.computeDistance(token, targetToken, true);
    if (dist < 0 || dist > 5) {
      // Attacker farther than 5'
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | Attacker is farther than 5'`);
      }
      return;
    }

    const featData = {
      type: 'feat',
      name: `${scope.macroItem.name} - Reactive Damage`,
      img: scope.macroItem.img,
      system: {
        actionType: 'other',
        damage: { parts: [['1d4[fire]', 'fire']] },
        target: { type: 'creature', value: 1 },
      },
    };
    const feat = new CONFIG.Item.documentClass(featData, {
      parent: actor,
      temporary: true,
    });

    const options = {
      targetUuids: [workflow.tokenUuid],
      configureDialog: false,
      workflowOptions: { fastForwardDamage: true, targetConfirmation: 'none' },
    };

    // If the target is associated to a GM user roll item in this client, otherwise send the item roll to user's client
    let player = MidiQOL.playerForActor(actor);
    if (!player?.active) {
      // Find first active GM player
      player = game.users?.find((p) => p.isGM && p.active);
    }
    if (!player) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Could not find player for actor ${actor}`
      );
      return;
    }

    if (player?.isGM) {
      options.workflowOptions.autoRollDamage = 'always';
    }
    const data = {
      itemData: feat.toObject(),
      actorUuid: actor.uuid,
      targetUuids: options.targetUuids,
      options,
    };

    // Register hook to call retribution damage after roll is complete
    Hooks.once(
      `midi-qol.RollComplete.${workflow.itemUuid}`,
      async (currentWorkflow) => {
        if (
          !elwinHelpers.isMidiHookStillValid(
            DEFAULT_ITEM_NAME,
            'midi-qol.RollComplete',
            feat.name,
            workflow,
            currentWorkflow,
            debug
          )
        ) {
          return;
        }
        await MidiQOL.socket().executeAsUser(
          'completeItemUse',
          player.id,
          data
        );
      }
    );
  }

  /**
   * Prompts the user of the token if he wants to activate the flames and/or reroll dice.
   *
   * @param {Item5e} sourceItem the feat item.
   * @param {Dice[]} diceToReroll array of dice that needs to be rerolled.
   * @param {number} rerollNumber the number limit up to when the dice are rerolled.
   * @returns an array of two booleans, the first for the flame activation, the second for the dice reroll.
   */
  async function promptActivateFlamesAndOrRerollDice(
    sourceItem,
    diceToReroll,
    rerollNumber
  ) {
    let choices = `<div class="form-group"><label class="checkbox"><input type="checkbox" name="activate" checked/>Activate flames</label></div>`;
    if (diceToReroll.length > 0) {
      choices += `<div class="form-group"><label class="checkbox"><input type="checkbox" name="reroll" checked/>Reroll ${rerollNumber}s${
        rerollNumber !== 1 ? ' and lower' : ''
      }</label></div>`;
    }
    const content = `
  <form id="activate-flame-reroll-form">
    ${choices}
  </form>
  `;
    const choiceDialog = new Promise((resolve) => {
      new Dialog(
        {
          title: `${sourceItem.name}`,
          content,
          buttons: {
            ok: {
              label: 'Ok',
              callback: (html) =>
                resolve({
                  activateFlames: html.find('[name=activate]:checked')[0]
                    ?.value,
                  rerollDice: html.find('[name=reroll]:checked')[0]?.value,
                }),
            },
            cancel: {
              label: 'Cancel',
              callback: (html) => resolve({}),
            },
          },
        },
        { classes: ['dnd5e', 'dialog'] }
      ).render(true);
    });
    return await choiceDialog;
  }

  /**
   * Reroll dice for which result were lower or equal to the specified rerollNumber.
   * If DSN is enabled, also show the rerolled dice with DSN.
   *
   * @param {Dice} dice the dice to reroll.
   */
  async function rollNewDice(dice) {
    let terms = [];
    dice.forEach((die) => {
      dieJson = die.toJSON();
      // Only keep last nb results (the new results of the rerolled ones)
      const rerolledResults = die.results.filter((result) => result.rerolled);
      dieJson.results = dieJson.results.slice(
        dieJson.results.length - rerolledResults.length
      );
      foundry.utils.setProperty(dieJson, 'options.flavor', 'fire');
      // Add dummy + operator if we want to roll multiple dice
      if (terms.length > 0) {
        const operatorTerm = new OperatorTerm({ operator: '+' }).evaluate();
        terms.push(operatorTerm);
      }
      terms.push(new Die(dieJson));
    });

    const rerolledResult = Roll.fromTerms(terms);
    if (debug) {
      console.warn(`${DEFAULT_ITEM_NAME} | Rerolled dice`, rerolledResult);
    }
    MidiQOL.displayDSNForRoll(rerolledResult, 'damageRoll');
  }

  /**
   * Returns the effect data for the light and Token Magic FX flames.
   *
   * @param {Item5e} sourceItem the feat item.
   *
   * @returns {object} the active effect data for the light and Token Magic FX flames.
   */
  function getFlamesEffectData(sourceItem) {
    const imgPropName = game.release.generation >= 12 ? 'img' : 'icon';
    const flamesEffectData = {
      changes: [
        {
          key: 'flags.midi-qol.onUseMacroName',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: `ItemMacro.${sourceItem.uuid},isDamaged`,
          priority: '20',
        },
        {
          key: 'ATL.light.dim',
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: '60',
          priority: '20',
        },
        {
          key: 'ATL.light.bright',
          mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: '30',
          priority: '20',
        },
        {
          key: 'ATL.light.animation.type',
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: 'torch',
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
      duration: {
        rounds: 1,
        turns: 1,
      },
      [imgPropName]: sourceItem.img,
      name: `${sourceItem.name} - Flames`,
      origin: sourceItem.uuid,
      transfer: false,
      flags: {
        dae: {
          specialDuration: ['turnEndSource'],
        },
      },
    };

    if (game.modules.get('tokenmagic')?.active) {
      flamesEffectData.changes.push({
        key: 'macro.tokenMagic',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: 'fire',
        priority: '20',
      });
    }

    return flamesEffectData;
  }

  /**
   * Wait for the specified number of milliseconds.
   *
   * @param {number} ms number of ms to wait.
   */
  async function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
