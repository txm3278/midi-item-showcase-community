export async function oathbow({
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
  async function addToRoll(roll, addonFormula) {
    let addonFormulaRoll = await new Roll('0 + ' + addonFormula).evaluate({
      async: true,
    });
    game.dice3d?.showForRoll(addonFormulaRoll);
    for (let i = 1; i < addonFormulaRoll.terms.length; i++) {
      roll.terms.push(addonFormulaRoll.terms[i]);
    }
    roll._total += addonFormulaRoll.total;
    roll._formula = roll._formula + ' + ' + addonFormula;
    return roll;
  }
  const swornEnemy = {
    name: 'Sworn Enemy',
    type: 'feat',
    flags: {
      'midi-qol': {
        onUseMacroName: '[postActiveEffects]ItemMacro',
      },
      dae: {
        macro: {
          name: 'Sworn Enemy',
          img: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp',
          type: 'script',
          scope: 'global',
          command:
            'const target = workflow.targets.first()\nconsole.log(target)\nconst uuid = target.document.uuid;\nconst swornEnemyEffect = {\n  name: "Sworn Enemy",\n  icon: workflow.item.img,\n  origin: workflow.item.uuid,\n  duration: {\n    seconds: 604800,\n  },\n  flags: {\n    dae: {\n      specialDuration: ["zeroHP"],\n    },\n    effectmacro: {\n      onDelete: {\n        script:\n          \'let sourceActor = origin.parent\\nlet sourceActorUuid = sourceActor.uuid\\nlet sourceEffect = sourceActor.effects.getName("Sworn Enemy")\\n\\nif (!sourceEffect) {\\n    return;\\n} else {\\n    await MidiQOL.socket().executeAsGM("deleteEffects", {\\n    actorUuid: sourceActorUuid,\\n    effectsToDelete: [sourceEffect.id],\\n  });\\n}\',\n      },\n    },\n  },\n}\nawait target.actor.setFlag(\'dnd5e\', \'sworn-enemy\', true)\nawait MidiQOL.socket().executeAsGM(\'createEffects\', {actorUuid: uuid, effects: [swornEnemyEffect]});',
          author: 'jM4h8qpyxwTpfNli',
          ownership: {
            default: 3,
          },
          _id: null,
          folder: null,
          sort: 0,
          flags: {},
          _stats: {
            systemId: null,
            systemVersion: null,
            coreVersion: null,
            createdTime: null,
            modifiedTime: null,
            lastModifiedBy: null,
          },
        },
        DAECreated: true,
      },
      'scene-packer': {
        hash: 'd7fcd471df2beae629c774e0338abbc5bccc07cc',
        sourceId: 'Item.OA9JL0beu7KuHS0X',
      },
      walledtemplates: {
        wallsBlock: 'globalDefault',
        wallRestriction: 'globalDefault',
      },
      core: {},
      exportSource: {
        world: 'Rime-of-the-Frost-Maiden',
        system: 'dnd5e',
        coreVersion: '11.315',
        systemVersion: '3.2.1',
      },
    },
    img: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp',
    system: {
      description: {
        value:
          '<p>When you denote an enemy as a "Sworn Enemy," the target of your Oathbow attack becomes your sworn enemy until it dies or until dawn seven days later. You can have only one such sworn enemy at a time. When your sworn enemy dies, you can choose a new one after the next dawn.</p><p>When you make a ranged attack roll with this weapon against your sworn enemy, you have advantage on the roll. In addition, your target gains no benefit from cover, other than total cover, and you suffer no disadvantage due to long range. If the attack hits, your sworn enemy takes an extra 3d6 piercing damage.</p><p>While your sworn enemy lives, you have disadvantage on attack rolls with all other weapons.</p>',
        chat: '',
      },
      duration: {
        value: '7',
        units: 'day',
      },
      target: {
        value: '1',
        width: null,
        units: '',
        type: 'enemy',
        prompt: true,
      },
      source: {},
      activation: {
        type: 'none',
        cost: null,
        condition: '',
      },
      cover: null,
      crewed: false,
      range: {
        value: null,
        long: null,
        units: '',
      },
      uses: {
        value: null,
        max: '',
        per: null,
        recovery: '',
        prompt: true,
      },
      consume: {
        type: '',
        target: null,
        amount: null,
        scale: false,
      },
      ability: null,
      actionType: null,
      attack: {
        bonus: '',
        flat: false,
      },
      chatFlavor: '',
      critical: {
        threshold: null,
        damage: '',
      },
      damage: {
        parts: [],
        versatile: '',
      },
      enchantment: null,
      formula: '',
      save: {
        ability: '',
        dc: null,
        scaling: 'spell',
      },
      summons: null,
      type: {
        value: '',
        subtype: '',
      },
      prerequisites: {
        level: null,
      },
      properties: [],
      requirements: '',
      recharge: {
        value: null,
        charged: false,
      },
    },
    effects: [
      {
        name: 'Sworn Enemy',
        changes: [
          {
            key: 'flags.midi-qol.disadvantage.attack.all',
            mode: 0,
            value: 'workflow.item.name !== "Oathbow"',
            priority: 20,
          },
        ],
        transfer: false,
        icon: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp',
        _id: 'q71qwG76PUYJIVVg',
        disabled: false,
        duration: {
          startTime: null,
          seconds: 604800,
          combat: null,
          rounds: null,
          turns: null,
          startRound: null,
          startTurn: null,
        },
        flags: {
          dae: {
            disableIncapacitated: false,
            selfTarget: true,
            selfTargetAlways: false,
            dontApply: false,
            stackable: 'noneName',
            showIcon: true,
            durationExpression: '',
            macroRepeat: 'none',
            specialDuration: [],
          },
          ActiveAuras: {
            isAura: false,
            aura: 'None',
            nameOverride: '',
            radius: '',
            alignment: '',
            type: '',
            customCheck: '',
            ignoreSelf: false,
            height: false,
            hidden: false,
            displayTemp: false,
            hostile: false,
            onlyOnce: false,
            wallsBlock: 'system',
          },
          effectmacro: {
            onDelete: {
              script:
                'let tokens = canvas.tokens.placeables;\nlet tactor;\nlet tactorUuid;\nlet tactorEffect;\n\nfor (let t of tokens) {\n  tactor = t.actor;\n  tactorUuid = tactor.uuid;\n  tactorEffect = tactor.effects.find((e) => e.name === "Sworn Enemy");\n\n  if (tactor.flags.dnd5e?.["sworn-enemy"]) {\n    await tactor.unsetFlag("dnd5e", "sworn-enemy");\n    await MidiQOL.socket().executeAsGM("deleteEffects", {\n      actorUuid: tactorUuid,\n      effectsToDelete: [tactorEffect.id],\n    });\n  } else {\n    continue;\n  }\n}\n',
            },
          },
        },
        description: '',
        origin: null,
        statuses: [],
        tint: null,
      },
    ],
    folder: null,
    _stats: {
      systemId: 'dnd5e',
      systemVersion: '3.2.1',
      coreVersion: '11.315',
      createdTime: 1720847879236,
      modifiedTime: 1720851477858,
      lastModifiedBy: 'jM4h8qpyxwTpfNli',
    },
  };
  if (args[0] === 'on') {
    await actor.createEmbeddedDocuments('Item', [swornEnemy]);
    return;
  } else if (args[0] === 'off') {
    await actor.itemTypes.feat.find((i) => i.name === 'Sworn Enemy')?.delete();
    return;
  }

  // COMPUTE COVER CALCS << needs work
  if (workflow.macroPass === 'preCheckHits') {
    if (!workflow.targets.size) return;
    const effectExists = workflow.targets
      .first()
      ?.actor?.appliedEffects?.find((ef) => ef.name === 'Sworn Enemy');
    if (!effectExists) return;

    let validTypes = ['rwak'];
    if (!validTypes.includes(workflow.item.system.actionType)) return;
    if (
      game.settings.get('midi-qol', 'ConfigSettings').optionalRules
        .coverCalculation === 'none'
    )
      return;

    //   let queueSetup = await chrisPremades.queue.setup( // not sure this is even needed
    //   workflow.item.uuid,
    //   "oathbow",
    //   150
    // );
    // console.log("queueSetup", queueSetup);

    // if (!queueSetup) return;
    let coverBonus = MidiQOL.computeCoverBonus(
      workflow.token,
      workflow.targets.first(),
      workflow.item
    );
    console.log('coverBonus', coverBonus);
    if (coverBonus > 5) {
      // chrisPremades.queue.remove(workflow.item.uuid); // figure out how to cancel workflow here
      ui.notifications.warn('Target is under total cover');
      return;
    }
    let updatedRoll = await addToRoll(workflow.attackRoll, coverBonus);
    workflow.setAttackRoll(updatedRoll);
    // chrisPremades.queue.remove(workflow.item.uuid); // is this even necessary?
  }
}
