export async function soulCage({
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
  let tokenDoc = token.document;
  const featMacros =
    'const params = args[0];\nconst sourceToken = canvas.tokens.get(params.tokenId);\nconst sourceActor = params.actor;\nconst soulEffect = await sourceActor.effects.find(\n  (ef) => ef.label === "Soul Cage"\n);\nconst soulItem = await sourceActor.items.find((i) => i.name === "Trapped Soul");\nif (soulItem.system.uses.value === 0) {\n  await soulEffect.delete();\n}';

  if (args[0] === 'on') {
    const soulUpdates = {
      name: 'Trapped Soul',
      type: 'consumable',
      img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
      system: {
        identified: true,
        unidentified: {
          description: '',
        },
        quantity: 1,
        equipped: true,
        activation: {
          type: 'special',
          cost: null,
          condition: '',
        },
        duration: {
          value: '',
          units: '',
        },
        uses: {
          value: 6,
          max: '6',
          per: 'charges',
          recovery: '',
          prompt: true,
          autoDestroy: true,
        },
      },
    };
    await chrisPremades.utils.itemUtils.createItems(actor, [soulUpdates], {
      favorite: true,
      parentEntity: scope.effect,
    });
    let trappedSoul = actor.items.getName('Trapped Soul');
    console.log('trappedSoul', trappedSoul);
    let trappedSoulId = trappedSoul.id;
    const soulFeatUpdates = [
      {
        name: 'Trapped Soul - Borrow Experience',
        type: 'feat',
        img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp', //Example: "icons/magic/holy/projectiles-blades-salvo-yellow.webp"
        _id: randomID(),
        system: {
          activation: {
            type: 'bonus',
            cost: 1,
            condition: '',
          },
          target: {
            value: null,
            width: null,
            units: '',
            type: 'self',
            prompt: true,
          },
          range: {
            value: null,
            long: null,
            units: 'self',
          },
          consume: {
            type: 'charges',
            target: trappedSoulId,
            amount: 1,
            scale: false,
          },
          ability: null,
          actionType: 'other',
          attack: {
            bonus: '',
            flat: false,
          },
        },
        effects: [
          {
            name: 'Trapped Soul - Borrow Experience',
            changes: [
              {
                key: 'flags.midi-qol.advantage.all',
                mode: 0,
                value: '1',
                priority: 20,
              },
            ],
            transfer: false,
            icon: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
            disabled: false,
            duration: {
              startTime: null,
              seconds: 6,
              combat: null,
              rounds: null,
              turns: null,
              startRound: null,
              startTurn: null,
            },
            description: '',
            origin: null,
            statuses: [],
            flags: {
              dae: {
                disableIncapacitated: false,
                selfTarget: false,
                selfTargetAlways: false,
                dontApply: false,
                stackable: 'noneName',
                showIcon: false,
                durationExpression: '',
                macroRepeat: 'none',
                specialDuration: ['1Attack', 'isCheck', 'isSkill', 'isSave'],
              },
            },
          },
        ],
        flags: {
          dae: {
            macro: {
              name: 'Trapped Soul - Borrow Experience',
              img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
              type: 'script',
              scope: 'global',
              command: featMacros,
              author: 'jM4h8qpyxwTpfNli',
              ownership: {
                default: 3,
              },
              _id: null,
              folder: null,
              sort: 0,
              flags: {},
            },
          },
          'midi-qol': {
            rollAttackPerTarget: 'default',
            itemCondition: '',
            effectCondition: '',
            onUseMacroName: '[preActiveEffects]ItemMacro',
          },
        },
      },
      {
        name: 'Trapped Soul - Steal Life',
        type: 'feat',
        img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
        _id: randomID(),

        system: {
          source: {},
          activation: {
            type: 'bonus',
            cost: 1,
            condition: '',
          },
          target: {
            value: null,
            width: null,
            units: '',
            type: 'self',
            prompt: true,
          },
          range: {
            value: null,
            long: null,
            units: 'self',
          },
          consume: {
            type: 'charges',
            target: trappedSoulId,
            amount: 1,
            scale: false,
          },
          actionType: 'heal',
          damage: {
            parts: [['2d8', 'healing']],
          },
        },
        flags: {
          dae: {
            macro: {
              name: 'Trapped Soul - Steal Life',
              img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
              type: 'script',
              scope: 'global',
              command: featMacros,
              author: 'jM4h8qpyxwTpfNli',
              ownership: {
                default: 3,
              },
              _id: null,
              folder: null,
              sort: 0,
              flags: {},
            },
          },
          'midi-qol': {
            rollAttackPerTarget: 'default',
            itemCondition: '',
            effectCondition: '',
            onUseMacroName: '[preDamageApplication]ItemMacro',
          },
        },
      },
      {
        name: 'Trapped Soul - Eyes of the Dead',
        type: 'feat',
        img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
        _id: randomID(),
        system: {
          source: {},
          activation: {
            type: 'action',
            cost: 1,
            condition: '',
          },
          duration: {
            value: '10',
            units: 'minute',
          },
          consume: {
            type: 'charges',
            target: trappedSoulId,
            amount: 1,
            scale: false,
          },
          ability: null,
          actionType: 'other',
          attack: {
            bonus: '',
            flat: false,
          },
        },
        flags: {
          dae: {
            macro: {
              name: 'Trapped Soul - Eyes of the Dead',
              img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
              type: 'script',
              scope: 'global',
              command: featMacros,
              author: 'jM4h8qpyxwTpfNli',
              ownership: {
                default: 3,
              },
              _id: null,
              folder: null,
              sort: 0,
              flags: {},
            },
          },
          'midi-qol': {
            rollAttackPerTarget: 'default',
            itemCondition: '',
            effectCondition: '',
            onUseMacroName: '[postActiveEffects]ItemMacro',
          },
        },
      },
      {
        name: 'Trapped Soul - Query Soul',
        type: 'feat',
        img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
        _id: randomID(),

        system: {
          activation: {
            type: 'special',
            cost: 1,
            condition: '',
          },
          consume: {
            type: 'charges',
            target: trappedSoulId,
            amount: 1,
            scale: false,
          },
          ability: null,
          actionType: 'other',
          attack: {
            bonus: '',
            flat: false,
          },
        },
        flags: {
          dae: {
            macro: {
              name: 'Trapped Soul - Query Soul',
              img: 'icons/magic/unholy/strike-body-explode-disintegrate.webp',
              type: 'script',
              scope: 'global',
              command: featMacros,
              author: 'jM4h8qpyxwTpfNli',
              ownership: {
                default: 3,
              },
              _id: null,
              folder: null,
              sort: 0,
              flags: {},
            },
          },
          'midi-qol': {
            rollAttackPerTarget: 'default',
            itemCondition: '',
            effectCondition: '',
            onUseMacroName: '[postActiveEffects]ItemMacro',
          },
        },
      },
    ];
    await chrisPremades.utils.itemUtils.createItems(actor, soulFeatUpdates, {
      favorite: true,
      parentEntity: trappedSoul,
    });
  } else if (args[0] === 'off') {
    // await actor.items.getName("Trapped Soul").delete();
    // for (let feat of soulFeatUpdates) {
    //   await actor.items.getName(feat.name).delete();
    // }
    //   // await warpgate.revert(tokenDoc, soulFeatOptions.name);
    //   // await warpgate.revert(tokenDoc, soulOptions.name);
    // }
  }
}
