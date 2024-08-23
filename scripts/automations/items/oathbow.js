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
        rollAttackPerTarget: 'default',
        itemCondition: '',
        effectCondition: '',
      },
      dae: {
        macro: {
          name: 'Sworn Enemy',
          img: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp',
          type: 'script',
          scope: 'global',
          command:
            'const target = workflow.targets.first()\nconst uuid = target.actor.uuid;\nconst effectSource = actor.appliedEffects.find(e=>e.name == \'Sworn Enemy - Attacker\');\nconst effectTarget = target.actor.appliedEffects.find(e=>e.name == "Sworn Enemy - Target")\n\nconsole.log("effectSource:", effectSource);\nconsole.log("effectSource.uuid:", effectSource.uuid);\nconsole.log("effectTarget:", effectTarget);\nconsole.log("effectTarget.uuid", effectTarget.uuid)\n\nawait MidiQOL.socket().executeAsGM(\'addDependent\', {concentrationEffectUuid: effectSource.uuid, dependentUuid: effectTarget.uuid});\nawait MidiQOL.socket().executeAsGM(\'addDependent\', {concentrationEffectUuid: effectTarget.uuid, dependentUuid: effectSource.uuid});',
          author: 'jM4h8qpyxwTpfNli',
          ownership: {
            default: 3,
          },
          _id: null,
          folder: null,
          sort: 0,
          flags: {},
          _stats: {
            systemId: 'dnd5e',
            systemVersion: '3.3.1',
            coreVersion: '12.330',
            createdTime: null,
            modifiedTime: null,
            lastModifiedBy: null,
            compendiumSource: null,
            duplicateSource: null,
          },
        },
        DAECreated: true,
      },
      'scene-packer': {
        hash: '3eb63519c2833021a79b75f21ec2c725156e96a7',
        sourceId: 'Item.rk239YpC0iWlhxjA',
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
      magicitems: {
        enabled: false,
        default: '',
        equipped: false,
        attuned: false,
        charges: '0',
        chargeType: 'c1',
        destroy: false,
        destroyFlavorText:
          'reaches 0 charges: it crumbles into ashes and is destroyed.',
        rechargeable: false,
        recharge: '0',
        rechargeType: 't1',
        rechargeUnit: 'r1',
        sorting: 'l',
      },
      midiProperties: {
        confirmTargets: 'default',
        autoFailFriendly: false,
        autoSaveFriendly: false,
        critOther: false,
        offHandWeapon: false,
        magicdam: false,
        magiceffect: false,
        noConcentrationCheck: false,
        toggleEffect: false,
        ignoreTotalCover: false,
        idr: false,
        idi: false,
        idv: false,
        ida: false,
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
        name: 'Sworn Enemy - Attacker',
        changes: [
          {
            key: 'flags.midi-qol.disadvantage.attack.all',
            mode: 0,
            value: 'workflow.item.name !== "Oathbow"',
            priority: 20,
          },
        ],
        transfer: false,
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
            enableCondition: '',
            disableCondition: '',
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
          effectmacro: {},
        },
        description:
          '<p>When you denote an enemy as a "Sworn Enemy," the target of your Oathbow attack becomes your sworn enemy until it dies or until dawn seven days later. You can have only one such sworn enemy at a time. When your sworn enemy dies, you can choose a new one after the next dawn.</p><p>When you make a ranged attack roll with this weapon against your sworn enemy, you have advantage on the roll. In addition, your target gains no benefit from cover, other than total cover, and you suffer no disadvantage due to long range. If the attack hits, your sworn enemy takes an extra 3d6 piercing damage.</p><p>While your sworn enemy lives, you have disadvantage on attack rolls with all other weapons.</p>',
        origin: null,
        statuses: [],
        tint: '#ffffff',
        icon: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp',
      },
      {
        origin: 'Actor.XlGHj4yq4EcmlMMq.Item.f2rRBfwVMPmycAgD',
        duration: {
          rounds: 1,
          startTime: null,
          seconds: 604800,
          combat: null,
          turns: null,
          startRound: null,
          startTurn: null,
        },
        disabled: false,
        name: 'Sworn Enemy - Target',
        _id: 'Knbw6MDKs8vRF3Ig',
        changes: [],
        description:
          '<p>When you denote an enemy as a "Sworn Enemy," the target of your Oathbow attack becomes your sworn enemy until it dies or until dawn seven days later. You can have only one such sworn enemy at a time. When your sworn enemy dies, you can choose a new one after the next dawn.</p><p>When you make a ranged attack roll with this weapon against your sworn enemy, you have advantage on the roll. In addition, your target gains no benefit from cover, other than total cover, and you suffer no disadvantage due to long range. If the attack hits, your sworn enemy takes an extra 3d6 piercing damage.</p><p>While your sworn enemy lives, you have disadvantage on attack rolls with all other weapons.</p>',
        tint: '#ffffff',
        transfer: false,
        statuses: [],
        flags: {
          dae: {
            enableCondition: '',
            disableCondition: '',
            disableIncapacitated: false,
            selfTarget: false,
            selfTargetAlways: false,
            dontApply: false,
            stackable: 'noneName',
            showIcon: false,
            durationExpression: '',
            macroRepeat: 'none',
            specialDuration: ['zeroHP'],
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
        },
        icon: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp',
      },
    ],
    folder: null,
    _stats: {
      coreVersion: '11.315',
      systemId: 'dnd5e',
      systemVersion: '3.2.1',
      createdTime: 1723123040587,
      modifiedTime: 1723124919099,
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
      ?.actor?.appliedEffects?.find((ef) => ef.name === 'Sworn Enemy - Target');
    if (!effectExists) return;

    let validTypes = ['rwak'];
    if (!validTypes.includes(workflow.item.system.actionType)) return;
    if (
      game.settings.get('midi-qol', 'ConfigSettings').optionalRules
        .coverCalculation === 'none'
    )
      return;

    let coverBonus = MidiQOL.computeCoverBonus(
      workflow.token,
      workflow.targets.first(),
      workflow.item
    );
    if (coverBonus > 5) {
      ui.notifications.warn('Target is under total cover');
      return;
    }
    let updatedRoll = await addToRoll(workflow.attackRoll, coverBonus);
    workflow.setAttackRoll(updatedRoll);
  }
}
