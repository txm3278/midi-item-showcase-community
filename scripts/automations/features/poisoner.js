export async function poisoner({
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
  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    if (!actor.items.getName("Poisoner's Kit")) {
      ui.notifications.warn(
        "You need the Poisoner's Kit to create Potent Poison"
      );
      return;
    }
    var gold = actor.system.currency.gp;
    if (gold < 50) {
      ui.notifications.warn(
        'You need at least 50gp to create Potent Poison. You have: ' +
          gold +
          'gp.'
      );
      return;
    }

    const potentPoisonItemData = await getPotentPoisonItemData();
    let potentPoisonItem = structuredClone(
      new CONFIG.Item.documentClass(potentPoisonItemData, {
        parent: actor,
        temporary: false,
      })
    );

    gold = gold - 50;
    let quantity = actor.system.attributes.prof;

    if (actor.items.getName(potentPoisonItem.name)) {
      quantity += actor.items.getName(potentPoisonItem.name).system.quantity;
    }
    potentPoisonItem.system.quantity = quantity;

    let updates = {
      actor: { system: { currency: { gp: gold } } },
      embedded: {
        Item: {
          [potentPoisonItem.name]: potentPoisonItem,
        },
      },
    };

    let options = {
      permanent: true,
      name: potentPoisonItem.name,
      description: potentPoisonItem.name,
    };
    await warpgate.mutate(workflow.token.document, updates, {}, options);

    return;
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preDamageRoll') {
    const macroData = args[0];
    const imgPropName = game.version < 12 ? 'icon' : 'img';
    let effectData = {
      label: 'Poisoner',
      [imgPropName]: 'icons/skills/melee/strike-scythe-fire-green.webp',
      origin: macroData.sourceItemUuid,
      duration: {
        turns: 1,
      },
      changes: [
        {
          key: 'system.traits.dv.value',
          mode: 0,
          value: 'poison',
          priority: 20,
        },
      ],
      transfer: true,
      flags: {
        dae: {
          specialDuration: ['isDamaged'],
        },
      },
    };

    for (let i = 0; i < macroData.hitTargetUuids.length; i++) {
      const target = fromUuidSync(macroData.hitTargetUuids[i]);
      removeDR(target.actor, effectData);
    }
  }

  async function removeDR(actor, effectData) {
    if (actor.system.traits['dr'].value.has('poison')) {
      await MidiQOL.socket().executeAsGM('createEffects', {
        actorUuid: actor.uuid,
        effects: [effectData],
      });
    }
  }

  async function getPotentPoisonItemData() {
    return {
      name: 'Potent Poison, (vial) (Poisoner)',
      type: 'consumable',
      img: 'icons/consumables/potions/potion-tube-corked-bubbling-green.webp',
      system: {
        description: {
          value:
            '<p>Once applied to a weapon or piece of ammunition, the poison retains its potency for 1 minute or until you hit with the weapon or ammunition. When a creature takes damage from the coated weapon or ammunition, that creature must succeed on a DC 14 Constitution saving throw or take 2d8 poison damage and become poisoned until the end of your next turn.</p>',
          chat: '',
          unidentified: 'Gear',
        },
        quantity: 1,
        weight: 0.05,
        price: {
          value: 0,
          denomination: 'gp',
        },
        attunement: 0,
        equipped: false,
        rarity: '',
        identified: true,
        activation: {
          type: 'bonus',
          cost: 1,
          condition: '',
        },
        duration: {
          value: '1',
          units: 'minute',
        },
        cover: null,
        crewed: false,
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
          units: '',
        },
        uses: {
          value: 1,
          max: '1',
          per: 'charges',
          recovery: '',
          autoDestroy: true,
          prompt: true,
        },
        ability: '',
        actionType: 'other',
        attackBonus: '',
        chatFlavor: '',
        critical: {
          threshold: null,
          damage: '',
        },
        damage: {
          parts: [],
          versatile: '',
        },
        formula: '',
        save: {
          ability: '',
          dc: 14,
          scaling: 'flat',
        },
        consumableType: 'poison',
        properties: {},
      },
      effects: [],
      folder: null,
      flags: {
        ddbimporter: {
          dndbeyond: {
            type: 'Poison',
            isConsumable: false,
            isContainer: false,
            isCustomItem: false,
            isHomebrew: false,
            isMonkWeapon: false,
            isPack: false,
            levelInfusionGranted: null,
            tags: ['Damage', 'Utility', 'Combat', 'Consumable'],
            sources: [
              {
                sourceId: 1,
                pageNumber: null,
                sourceType: 2,
              },
              {
                sourceId: 2,
                pageNumber: null,
                sourceType: 1,
              },
            ],
            stackable: true,
          },
          id: 0,
          entityTypeId: 0,
          definitionEntityTypeId: 2103445194,
          definitionId: 68,
          originalName: 'Poison, Basic (vial)',
          version: '3.4.38',
        },
        magicitems: {
          enabled: false,
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
        cf: {
          id: 'temp_4hpeel1ix1d',
        },
        'midi-qol': {
          onUseMacroName: '[postActiveEffects]ItemMacro',
          fumbleThreshold: null,
          effectActivation: false,
          onUseMacroParts: {
            items: {
              0: {
                macroName: 'ItemMacro',
                option: 'postActiveEffects',
              },
            },
          },
          removeAttackDamageButtons: 'default',
        },
        'rest-recovery': {
          data: {
            recovery: {
              enabled: false,
            },
            consumable: {
              enabled: false,
              dayWorth: false,
            },
          },
        },
        midiProperties: {
          nodam: false,
          fulldam: false,
          halfdam: false,
          autoFailFriendly: false,
          autoSaveFriendly: false,
          rollOther: false,
          critOther: false,
          offHandWeapon: false,
          magicdam: false,
          magiceffect: false,
          concentration: false,
          toggleEffect: false,
          ignoreTotalCover: false,
          noConcentrationCheck: false,
          confirmTargets: 'never',
        },
        core: {},
        itemacro: {
          macro: {
            name: 'Potent Poison, (vial) (Poisoner)',
            type: 'script',
            scope: 'global',
            command:
              '// ##################################################################################################\n// Read First!!!!\n// Allow to choose a weapon or ammo on which the poison is applied. The chosen weapon or ammo applies\n// the poison effect on a hit for the duration.\n// v1.0.0\n// Author: Elwin#1410\n// Dependencies:\n//  - DAE, item macro [off]\n//  - Times Up\n//  - MidiQOL "on use" item macro, [postActiveEffects]\n//  - Warpgate (dialog and mutation)\n//  - Ammo Tracker (optional)\n//\n// How to configure:\n// The item details must be:\n//   - Activation cost: 1 Action\n//   - Target: Self\n//   - Range: None\n//   - Duration: 1 minutes (or adjust depending on poison duration)\n//   - Limited Uses: 1 of 1 per Charges\n//   - Destroy on empty: (checked)\n//   - Action type: Utility\n//   - No damage should be configured\n//   - Save: only set the type of DC, flat and the fixed DC value, if not set, DC 10 will be used,\n//           this is a hack to allow customization of the poison DC.\n//   - On Use Macros:\n//       ItemMacro | After Active Effects\n//   - This item macro code must be added to the ItemMacro code of the "Poison, XXX (vial)" item.\n// Usage:\n// This item must be used to activate its effect. It applies a mutation that adds the poison effect on a hit\n// on the selected weapon or ammunition.\n//\n// Description:\n// In the "off" DAE macro call:\n//   Reverts the warpgate mutation that added the poisoned effect.\n// In the postActiveEffects phase (of the source item):\n//   Prompts a dialog to choose the weapon or ammunition on which the poison will be applied.\n//   The if the chosen weapon or ammunition item quantity does not match the allowed quantity (1 or 3),\n//   A new item is created from the selected item with the allowed quantity and this quantity is removed\n//   from the selected item. A mutation is applied to the selected item or the new item created\n//   (when quantity does not match allowed quantity). This mutation changes the name and description,\n//   sets an onUse [postActiveEffects] item macro and a special item macro to handle it and\n//   adds an active effect with a macro.itemMacro change, this is used to be notified when the poison expires.\n//   If Ammo Tracker is active and a new ammunition item was created, updates the Combat flag that\n//   contains the module\'s ammunition tracking info.\n// In the postActiveEffects phase (of the poisoned item):\n//   On a hit, a temporary item to apply the poison effects is created and used with a MidiQOL.completeItemUse call.\n//   If the poisoned item is a weapon, and it has uses, its uses are decremented, if there is no more\n//   uses the poison active effect is deleted to force its expiration.\n// ###################################################################################################\n\nconst DEFAULT_ITEM_NAME = "Potent Poison, (vial) (Poisoner)";\nconst debug = true;\nconst MUT_NAME_PREFIX = "PoisonAppliedTo";\nconst AMMO_TRACKER_MOD = "ammo-tracker-fvtt";\nconst DEFAULT_SAVE_ABILITY = "con";\nconst DEFAULT_DAMAGE_FORMULA = "2d8";\nconst DEFAULT_DAMAGE_TYPE = "poison";\n\n///////////////// BEGIN CUSTOMIZE THIS /////////////////////////////\n// Change dependending on the allowed weapon types\nconst ALLOWED_WEAPON_TYPES = ["simpleM", "martialM", "simpleR", "martialR"];\n// Change dependending on the allowed weapon damage types: slashing, piercing, bludgeoning\nconst ALLOWED_DMG_TYPES = ["slashing", "piercing", "bludgeoning"];\n// Change depending on the number of ammunitions that can be covered by one dose.\nconst MAX_AMMO = 3;\n// Null if no max uses with a weapon for this poison, otherwise set a number of hits allowed.\nconst MAX_WEAPON_HITS = 1;\n///////////////// END CUSTOMIZE THIS /////////////////////////////\n\nconst dependencies = ["dae", "times-up", "midi-qol", "warpgate"];\nif (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {\n  return;\n}\n\n/**\n * If the requirements are met, returns true, false otherwise.\n *\n * @param {string} name - The name of the item for which to check the dependencies.\n * @param {Array} dependencies - The array of module ids which are required.\n *\n * @returns {boolean} true if the requirements are met, false otherwise.\n */\nfunction requirementsSatisfied(name, dependencies) {\n  let missingDep = false;\n  dependencies.forEach((dep) => {\n    if (!game.modules.get(dep)?.active) {\n      const errorMsg = `${name}: ${dep} must be installed and active.`;\n      ui.notifications.error(errorMsg);\n      console.warn(errorMsg);\n      missingDep = true;\n    }\n  });\n  return !missingDep;\n}\n\nif (debug) {\n  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? args[0].macroPass : args[0] }, arguments);\n}\n\nif (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") \n{\n  // Called on poison vial item\n  const weaponChoices = actor.itemTypes.weapon\n    .filter((i) => ALLOWED_WEAPON_TYPES.includes(i.system?.weaponType) && !i.system?.properties?.amm)\n    .concat(actor.itemTypes.consumable.filter((i) => i.system?.consumableType === "ammo"))\n    .filter(\n      (i) =>\n        i.system?.damage?.parts?.some((part) => ALLOWED_DMG_TYPES.includes(part[1])) &&\n        i.system?.quantity > 0 &&\n        !i.getFlag("midi-item-showcase-community", "appliedPoison.origin")\n    );\n\n  if (debug) {\n    console.warn(`${DEFAULT_ITEM_NAME} | weaponChoices`, weaponChoices);\n  }\n\n  const data = {\n    buttons: weaponChoices.map((i) => ({\n      label: i.name + (i.type === "consumable" ? `[${i.system.quantity}]` : ""),\n      value: i.id,\n    })),\n    title: "⚔️ Choose your Poisoned Weapon or Ammo:",\n  };\n  const selectedWeaponId = await warpgate.buttonDialog(data, "column");\n  if (!selectedWeaponId) {\n    if (debug) {\n      console.warn(`${DEFAULT_ITEM_NAME} | Weapon or ammo selection was cancelled.`);\n    }\n    return;\n  }\n  const selectedWeapon = workflow.actor.items.get(selectedWeaponId);\n  let poisonedItem = selectedWeapon;\n  const allowedQuantity = selectedWeapon.type === "consumable" ? Math.min(MAX_AMMO, selectedWeapon.system.quantity) : 1;\n\n  const poisonedName = CONFIG.DND5E.conditionTypes["poisoned"];\n  if (allowedQuantity !== selectedWeapon.system.quantity) {\n    // Split item with allowed quantity\n    weaponData = selectedWeapon.toObject();\n    delete weaponData._id;\n    weaponData.system.quantity = allowedQuantity;\n    await actor.updateEmbeddedDocuments("Item", [\n      {\n        _id: selectedWeapon.id,\n        ["system.quantity"]: selectedWeapon.system.quantity - allowedQuantity,\n      },\n    ]);\n    const [newItem] = await actor.createEmbeddedDocuments("Item", [weaponData]);\n    poisonedItem = newItem;\n  }\n\n  // Get Poison Effect Item UUID if defined From a special effect\n  const poisonEffectItemUuid = rolledItem.effects\n    ?.getName("PoisonEffect")\n    ?.changes.find((c) => c.key === "flags.midi-item-showcase-community.poisonEffectItemUuid")?.value;\n  const poisonEffectItem = await fromUuid(poisonEffectItemUuid);\n  let poisonEffectItemData = undefined;\n  if (poisonEffectItem) {\n    if (poisonEffectItem instanceof CONFIG.Item.documentClass) {\n      poisonEffectItemData = poisonEffectItem.toObject();\n    } else {\n      console.warn(`${DEFAULT_ITEM_NAME} | The specified UUID is not an item`, { poisonedItem });\n    }\n  }\n  const mutName = `${MUT_NAME_PREFIX}-${poisonedItem.id}`;\n  const macroName = `${mutName}-by-${actor.uuid}`;\n  const newItemName = `${selectedWeapon.name} [${poisonedName}]`;\n  const appliedPoisonValue = {\n    origin: rolledItem.uuid,\n    name: rolledItem.name,\n    img: rolledItem.img,\n    saveDC: rolledItem.system?.save?.dc ?? 14,\n    poisonEffectItemData,\n  };\n  let onUseMacroNameValue = selectedWeapon.getFlag("midi-qol", "onUseMacroName");\n  if (onUseMacroNameValue) {\n    onUseMacroNameValue += `,[postActiveEffects]${macroName}`;\n  } else {\n    onUseMacroNameValue = `[postActiveEffects]${macroName}`;\n  }\n  const updates = {\n    embedded: {\n      Item: {\n        [poisonedItem.id]: {\n          name: newItemName,\n          system: {\n            description: {\n              value: `<p><em>${poisonedName} by ${rolledItem.name}</em></p>\\n${\n                selectedWeapon.system?.description?.value ?? ""\n              }`,\n            },\n          },\n          flags: {\n            midi-item-showcase-community: { appliedPoison: appliedPoisonValue },\n            // Flag to handle the poison effect after an attack that hit\n            "midi-qol": { onUseMacroName: onUseMacroNameValue },\n          },\n        },\n      },\n    },\n  };\n  if (poisonedItem.type === "weapon" && MAX_WEAPON_HITS) {\n    appliedPoisonValue.uses = MAX_WEAPON_HITS;\n  }\n\n  const options = {\n    name: mutName,\n    comparisonKeys: { Item: "id" },\n  };\n\n  // Remove previous applied AE if it exists (needs to be done before mutating otherwise the [off] callback reverts the mutation)\n  await workflow.actor.effects?.getName(mutName)?.delete();\n\n  if (!!warpgate.mutationStack(workflow.token.document).getName(mutName)) {\n    await warpgate.revert(workflow.token.document, mutName);\n  }\n\n  await warpgate.mutate(workflow.token.document, updates, {}, options);\n  // Create macro to handle poison effect (this is done to allow existing item macro to be untouched),\n  // but delete if it already exists.\n  await game.macros.getName(macroName)?.delete();\n  await Macro.createDocuments([\n    {\n      name: macroName,\n      type: "script",\n      scope: "global",\n      command: getPoisonedItemMacro(),\n    },\n  ]);\n\n  let effectDuration = { type: "seconds", seconds: 60 };\n  if (rolledItem.system?.duration?.value && rolledItem.system?.duration?.units) {\n    effectDuration = DAE.convertDuration(rolledItem.system.duration);\n  }\n  const effectData = {\n    changes: [\n      // Flag to handle end of effect\n      {\n        key: "macro.execute",\n        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,\n        value: macroName,\n        priority: 20,\n      },\n    ],\n    origin: poisonedItem.uuid, //flag the effect as associated to the poisoned item\n    disabled: false,\n    duration: effectDuration,\n    icon: rolledItem.img,\n    name: mutName,\n  };\n  await workflow.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);\n\n  // Make the proper adjustements for Ammo Tracker\n  if (\n    game.modules.get(AMMO_TRACKER_MOD)?.active &&\n    selectedWeapon.type === "consumable" &&\n    poisonedItem.id !== selectedWeaponId &&\n    workflow.actor.type === "character"\n  ) {\n    for (let combat of game.combats) {\n      const actorAmmoAttr = `projectileData.${workflow.actor.id}`;\n      const actorAmmo = combat.getFlag(AMMO_TRACKER_MOD, actorAmmoAttr);\n      if (actorAmmo?.[selectedWeaponId]) {\n        const updatedActorAmmo = deepClone(actorAmmo);\n        updatedActorAmmo[selectedWeaponId] = updatedActorAmmo[selectedWeaponId] - allowedQuantity;\n        updatedActorAmmo[poisonedItem.id] = allowedQuantity;\n        await combat.setFlag(AMMO_TRACKER_MOD, actorAmmoAttr, updatedActorAmmo);\n      }\n    }\n  }\n} \n\n/**\n * Returns the item macro to handle the poisoned item effect.\n *\n * @returns {String} the item macro to handle the poisoned item effect.\n */\nfunction getPoisonedItemMacro() {\n  return `\nconst DEFAULT_ITEM_NAME = "${DEFAULT_ITEM_NAME}";\nconst debug = ${debug};\n\nconst MUT_NAME_PREFIX = "${MUT_NAME_PREFIX}";\n\nconst DEFAULT_SAVE_ABILITY = "${DEFAULT_SAVE_ABILITY}";\nconst DEFAULT_DAMAGE_FORMULA = "${DEFAULT_DAMAGE_FORMULA}";\nconst DEFAULT_DAMAGE_TYPE = "${DEFAULT_DAMAGE_TYPE}";\n\nif (debug) {\n  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? args[0].macroPass : args[0] }, arguments);\n}\n\nif (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {\n  const macroData = args[0];\n  if (workflow.hitTargets.size === 0) {\n    return;\n  }\n  await handlePoisonPostActiveEffects(macroData, workflow, rolledItem);\n} else if (args[0] === "off") {\n  const sourceToken = canvas.tokens.get(lastArgValue.tokenId);\n  const sourceItem = fromUuidSync(lastArgValue.origin);\n  const mutName = \\`\\${MUT_NAME_PREFIX}-\\${sourceItem?.id}\\`;\n  await warpgate.revert(sourceToken.document, mutName);\n  // Make sure that if other mutations were added after this one, \n  // we remove poisoned from the name\n  const poisonedName = \\` [\\${CONFIG.DND5E.conditionTypes["poisoned"]}]\\`;\n  if (sourceItem.name.includes(poisonedName)) {\n    const newName = sourceItem.name.replace(poisonedName, "");\n    await sourceItem.update({name: newName});\n  }\n\n  // Note: warpgate does not remove added flags, it nulls them, unset them is the item was not an added one\n  if (sourceItem) {\n    await sourceItem.unsetFlag("midi-item-showcase-community", "appliedPoison");\n  }\n  \n  // Delete created macro.\n  const macroName = \\`\\${mutName}-by-\\${sourceToken.actor.uuid}\\`;\n  await game.macros.getName(macroName)?.delete();\n}\n\n${handlePoisonPostActiveEffects.toString()}\n\n${getPoisonEffectItemData.toString()}\n\n`;\n}\n\n/**\n * Handles the poison effect when an attack hit with the poisoned weapon or the weapon that used a poisoned ammunition.\n * A temporary item is created to apply the damage on a failed saved and passed to MidiQOL.completeItemUse.\n *\n * @param {object} macroData the midi macro data.\n * @param {MidiQOL.Workflow} poisonAttackWorkflow the current midi workflow.\n * @param {Item5E} item the used item\n * @returns {void}\n */\nasync function handlePoisonPostActiveEffects(macroData, poisonAttackWorkflow, item) {\n  const appliedPoison = item.getFlag("midi-item-showcase-community", "appliedPoison");\n  if (!appliedPoison) {\n    console.error(`${DEFAULT_ITEM_NAME} | Missing appliedPoison flag on poisoned weapon or ammo.`);\n    return;\n  }\n  if (poisonAttackWorkflow.item?.uuid !== item.uuid && poisonAttackWorkflow.ammo?.uuid !== item.uuid) {\n    if (debug) {\n      console.warn(`${DEFAULT_ITEM_NAME} | Skip, called from a workflow on another item than the poisoned one.`);\n    }\n    return;\n  }\n\n  // Call complete item use with temp item on first hit target\n  const poisonItemData = await getPoisonEffectItemData(appliedPoison);\n  const poisonItem = new CONFIG.Item.documentClass(poisonItemData, { parent: workflow.actor, temporary: true });\n\n  const options = {\n    targetUuids: [macroData.hitTargetUuids[0]],\n  };\n  try {\n    await MidiQOL.completeItemUse(poisonItem, {}, options);\n  } finally {\n    // When the poisoned item is a weapon and has uses, update uses\n    if (item.type === "weapon" && appliedPoison.uses) {\n      const newUses = appliedPoison.uses - 1;\n      if (newUses > 0) {\n        await item.setFlag("midi-item-showcase-community", "appliedPoison.uses", newUses);\n      } else {\n        // The maximum uses has been reached, the poisoned weapon effect expires...\n        const mutName = `${MUT_NAME_PREFIX}-${item.id}`;\n        await poisonAttackWorkflow.actor.effects.getName(mutName)?.delete();\n      }\n    }\n  }\n}\n\n/**\n * Returns the temporary item data for the poison effect.\n * @param {object} appliedPoison the basic information on the poison that was applied.\n * @returns {object} a temporary item data for the poison effect.\n */\nasync function getPoisonEffectItemData(appliedPoison) {\n \n  // Use default basic poison\n  return {\n    type: "consumable",\n    name: `Poison - Effect`,\n    img: appliedPoison.img,\n    system: {\n      consumableType: "poison",\n      actionType: "other",\n      damage: { parts: [[DEFAULT_DAMAGE_FORMULA, DEFAULT_DAMAGE_TYPE]] },\n      save: { ability: DEFAULT_SAVE_ABILITY, dc: appliedPoison.saveDC, scaling: "flat" },\n    },\n"effects": [\n    {\n      "changes": [\n        {\n          "key": "flags.midi-qol.disadvantage.attack.all",\n          "mode": 0,\n          "value": "1",\n          "priority": 0\n        },\n        {\n          "key": "flags.midi-qol.disadvantage.ability.check.all",\n          "mode": 0,\n          "value": "1",\n          "priority": 0\n        }\n      ],\n      "description": "<p>- A poisoned creature has disadvantage on attack rolls and ability checks.</p>",\n      "disabled": false,\n      "duration": {\n        "rounds": 2,\n        "seconds": null,\n        "turns": null,\n        "startTime": null,\n        "combat": null,\n        "startRound": null,\n        "startTurn": null\n      },\n      "flags": {\n        "dfreds-convenient-effects": {\n          "isConvenient": true,\n          "isDynamic": false,\n          "isViewable": true,\n          "nestedEffects": [],\n          "subEffects": []\n        },\n        "dae": {\n          "stackable": "noneName",\n          "specialDuration": [\n            "turnEndSource"\n          ],\n          "transfer": false,\n          "disableIncapacitated": false,\n          "selfTarget": false,\n          "selfTargetAlways": false,\n          "dontApply": false,\n          "showIcon": false,\n          "durationExpression": "",\n          "macroRepeat": "none"\n        },\n        "times-up": {\n          "isPassive": false\n        },\n        "ActiveAuras": {\n          "isAura": false,\n          "aura": "None",\n          "nameOverride": "",\n          "radius": "",\n          "alignment": "",\n          "type": "",\n          "customCheck": "",\n          "ignoreSelf": false,\n          "height": false,\n          "hidden": false,\n          "displayTemp": false,\n          "hostile": false,\n          "onlyOnce": false,\n          "wallsBlock": "system"\n        }\n      },\n      "icon": "modules/dfreds-convenient-effects/images/poisoned.svg",\n      "name": "Poisoned",\n      "origin": "",\n      "tint": null,\n      "transfer": false,\n      "statuses": [\n        "Convenient Effect: Poisoned",\n        "poison"\n      ],\n      "_id": "okjAiINyCoY5M8Ax"\n    }\n  ],\n    flags: { midiProperties: { nodam: true } },\n  };\n}',
            author: 'RDUD9VahrEsIwEDB',
            _id: null,
            img: 'icons/consumables/potions/potion-tube-corked-bubbling-green.webp',
            folder: null,
            sort: 0,
            ownership: {
              default: 3,
            },
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
        },
        dae: {
          macro: {
            name: 'Potent Poison, (vial) (Poisoner)',
            img: 'icons/consumables/potions/potion-tube-corked-bubbling-green.webp',
            type: 'script',
            scope: 'global',
            command:
              '// ##################################################################################################\n// Read First!!!!\n// Allow to choose a weapon or ammo on which the poison is applied. The chosen weapon or ammo applies\n// the poison effect on a hit for the duration.\n// v1.0.0\n// Author: Elwin#1410\n// Dependencies:\n//  - DAE, item macro [off]\n//  - Times Up\n//  - MidiQOL "on use" item macro, [postActiveEffects]\n//  - Warpgate (dialog and mutation)\n//  - Ammo Tracker (optional)\n//\n// How to configure:\n// The item details must be:\n//   - Activation cost: 1 Action\n//   - Target: Self\n//   - Range: None\n//   - Duration: 1 minutes (or adjust depending on poison duration)\n//   - Limited Uses: 1 of 1 per Charges\n//   - Destroy on empty: (checked)\n//   - Action type: Utility\n//   - No damage should be configured\n//   - Save: only set the type of DC, flat and the fixed DC value, if not set, DC 10 will be used,\n//           this is a hack to allow customization of the poison DC.\n//   - On Use Macros:\n//       ItemMacro | After Active Effects\n//   - This item macro code must be added to the ItemMacro code of the "Poison, XXX (vial)" item.\n// Usage:\n// This item must be used to activate its effect. It applies a mutation that adds the poison effect on a hit\n// on the selected weapon or ammunition.\n//\n// Description:\n// In the "off" DAE macro call:\n//   Reverts the warpgate mutation that added the poisoned effect.\n// In the postActiveEffects phase (of the source item):\n//   Prompts a dialog to choose the weapon or ammunition on which the poison will be applied.\n//   The if the chosen weapon or ammunition item quantity does not match the allowed quantity (1 or 3),\n//   A new item is created from the selected item with the allowed quantity and this quantity is removed\n//   from the selected item. A mutation is applied to the selected item or the new item created\n//   (when quantity does not match allowed quantity). This mutation changes the name and description,\n//   sets an onUse [postActiveEffects] item macro and a special item macro to handle it and\n//   adds an active effect with a macro.itemMacro change, this is used to be notified when the poison expires.\n//   If Ammo Tracker is active and a new ammunition item was created, updates the Combat flag that\n//   contains the module\'s ammunition tracking info.\n// In the postActiveEffects phase (of the poisoned item):\n//   On a hit, a temporary item to apply the poison effects is created and used with a MidiQOL.completeItemUse call.\n//   If the poisoned item is a weapon, and it has uses, its uses are decremented, if there is no more\n//   uses the poison active effect is deleted to force its expiration.\n// ###################################################################################################\n\nconst DEFAULT_ITEM_NAME = "Potent Poison, (vial) (Poisoner)";\nconst debug = true;\nconst MUT_NAME_PREFIX = "PoisonAppliedTo";\nconst AMMO_TRACKER_MOD = "ammo-tracker-fvtt";\nconst DEFAULT_SAVE_ABILITY = "con";\nconst DEFAULT_DAMAGE_FORMULA = "2d8";\nconst DEFAULT_DAMAGE_TYPE = "poison";\n\n///////////////// BEGIN CUSTOMIZE THIS /////////////////////////////\n// Change dependending on the allowed weapon types\nconst ALLOWED_WEAPON_TYPES = ["simpleM", "martialM", "simpleR", "martialR"];\n// Change dependending on the allowed weapon damage types: slashing, piercing, bludgeoning\nconst ALLOWED_DMG_TYPES = ["slashing", "piercing", "bludgeoning"];\n// Change depending on the number of ammunitions that can be covered by one dose.\nconst MAX_AMMO = 3;\n// Null if no max uses with a weapon for this poison, otherwise set a number of hits allowed.\nconst MAX_WEAPON_HITS = 1;\n///////////////// END CUSTOMIZE THIS /////////////////////////////\n\nconst dependencies = ["dae", "times-up", "midi-qol", "warpgate"];\nif (!requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {\n  return;\n}\n\n/**\n * If the requirements are met, returns true, false otherwise.\n *\n * @param {string} name - The name of the item for which to check the dependencies.\n * @param {Array} dependencies - The array of module ids which are required.\n *\n * @returns {boolean} true if the requirements are met, false otherwise.\n */\nfunction requirementsSatisfied(name, dependencies) {\n  let missingDep = false;\n  dependencies.forEach((dep) => {\n    if (!game.modules.get(dep)?.active) {\n      const errorMsg = `${name}: ${dep} must be installed and active.`;\n      ui.notifications.error(errorMsg);\n      console.warn(errorMsg);\n      missingDep = true;\n    }\n  });\n  return !missingDep;\n}\n\nif (debug) {\n  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? args[0].macroPass : args[0] }, arguments);\n}\n\nif (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") \n{\n  // Called on poison vial item\n  const weaponChoices = actor.itemTypes.weapon\n    .filter((i) => ALLOWED_WEAPON_TYPES.includes(i.system?.weaponType) && !i.system?.properties?.amm)\n    .concat(actor.itemTypes.consumable.filter((i) => i.system?.consumableType === "ammo"))\n    .filter(\n      (i) =>\n        i.system?.damage?.parts?.some((part) => ALLOWED_DMG_TYPES.includes(part[1])) &&\n        i.system?.quantity > 0 &&\n        !i.getFlag("midi-item-showcase-community", "appliedPoison.origin")\n    );\n\n  if (debug) {\n    console.warn(`${DEFAULT_ITEM_NAME} | weaponChoices`, weaponChoices);\n  }\n\n  const data = {\n    buttons: weaponChoices.map((i) => ({\n      label: i.name + (i.type === "consumable" ? `[${i.system.quantity}]` : ""),\n      value: i.id,\n    })),\n    title: "⚔️ Choose your Poisoned Weapon or Ammo:",\n  };\n  const selectedWeaponId = await warpgate.buttonDialog(data, "column");\n  if (!selectedWeaponId) {\n    if (debug) {\n      console.warn(`${DEFAULT_ITEM_NAME} | Weapon or ammo selection was cancelled.`);\n    }\n    return;\n  }\n  const selectedWeapon = workflow.actor.items.get(selectedWeaponId);\n  let poisonedItem = selectedWeapon;\n  const allowedQuantity = selectedWeapon.type === "consumable" ? Math.min(MAX_AMMO, selectedWeapon.system.quantity) : 1;\n\n  const poisonedName = CONFIG.DND5E.conditionTypes["poisoned"];\n  if (allowedQuantity !== selectedWeapon.system.quantity) {\n    // Split item with allowed quantity\n    weaponData = selectedWeapon.toObject();\n    delete weaponData._id;\n    weaponData.system.quantity = allowedQuantity;\n    await actor.updateEmbeddedDocuments("Item", [\n      {\n        _id: selectedWeapon.id,\n        ["system.quantity"]: selectedWeapon.system.quantity - allowedQuantity,\n      },\n    ]);\n    const [newItem] = await actor.createEmbeddedDocuments("Item", [weaponData]);\n    poisonedItem = newItem;\n  }\n\n  // Get Poison Effect Item UUID if defined From a special effect\n  const poisonEffectItemUuid = rolledItem.effects\n    ?.getName("PoisonEffect")\n    ?.changes.find((c) => c.key === "flags.midi-item-showcase-community.poisonEffectItemUuid")?.value;\n  const poisonEffectItem = await fromUuid(poisonEffectItemUuid);\n  let poisonEffectItemData = undefined;\n  if (poisonEffectItem) {\n    if (poisonEffectItem instanceof CONFIG.Item.documentClass) {\n      poisonEffectItemData = poisonEffectItem.toObject();\n    } else {\n      console.warn(`${DEFAULT_ITEM_NAME} | The specified UUID is not an item`, { poisonedItem });\n    }\n  }\n  const mutName = `${MUT_NAME_PREFIX}-${poisonedItem.id}`;\n  const macroName = `${mutName}-by-${actor.uuid}`;\n  const newItemName = `${selectedWeapon.name} [${poisonedName}]`;\n  const appliedPoisonValue = {\n    origin: rolledItem.uuid,\n    name: rolledItem.name,\n    img: rolledItem.img,\n    saveDC: rolledItem.system?.save?.dc ?? 14,\n    poisonEffectItemData,\n  };\n  let onUseMacroNameValue = selectedWeapon.getFlag("midi-qol", "onUseMacroName");\n  if (onUseMacroNameValue) {\n    onUseMacroNameValue += `,[postActiveEffects]${macroName}`;\n  } else {\n    onUseMacroNameValue = `[postActiveEffects]${macroName}`;\n  }\n  const updates = {\n    embedded: {\n      Item: {\n        [poisonedItem.id]: {\n          name: newItemName,\n          system: {\n            description: {\n              value: `<p><em>${poisonedName} by ${rolledItem.name}</em></p>\\n${\n                selectedWeapon.system?.description?.value ?? ""\n              }`,\n            },\n          },\n          flags: {\n            midi-item-showcase-community: { appliedPoison: appliedPoisonValue },\n            // Flag to handle the poison effect after an attack that hit\n            "midi-qol": { onUseMacroName: onUseMacroNameValue },\n          },\n        },\n      },\n    },\n  };\n  if (poisonedItem.type === "weapon" && MAX_WEAPON_HITS) {\n    appliedPoisonValue.uses = MAX_WEAPON_HITS;\n  }\n\n  const options = {\n    name: mutName,\n    comparisonKeys: { Item: "id" },\n  };\n\n  // Remove previous applied AE if it exists (needs to be done before mutating otherwise the [off] callback reverts the mutation)\n  await workflow.actor.effects?.getName(mutName)?.delete();\n\n  if (!!warpgate.mutationStack(workflow.token.document).getName(mutName)) {\n    await warpgate.revert(workflow.token.document, mutName);\n  }\n\n  await warpgate.mutate(workflow.token.document, updates, {}, options);\n  // Create macro to handle poison effect (this is done to allow existing item macro to be untouched),\n  // but delete if it already exists.\n  await game.macros.getName(macroName)?.delete();\n  await Macro.createDocuments([\n    {\n      name: macroName,\n      type: "script",\n      scope: "global",\n      command: getPoisonedItemMacro(),\n    },\n  ]);\n\n  let effectDuration = { type: "seconds", seconds: 60 };\n  if (rolledItem.system?.duration?.value && rolledItem.system?.duration?.units) {\n    effectDuration = DAE.convertDuration(rolledItem.system.duration);\n  }\n  const effectData = {\n    changes: [\n      // Flag to handle end of effect\n      {\n        key: "macro.execute",\n        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,\n        value: macroName,\n        priority: 20,\n      },\n    ],\n    origin: poisonedItem.uuid, //flag the effect as associated to the poisoned item\n    disabled: false,\n    duration: effectDuration,\n    icon: rolledItem.img,\n    name: mutName,\n  };\n  await workflow.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);\n\n  // Make the proper adjustements for Ammo Tracker\n  if (\n    game.modules.get(AMMO_TRACKER_MOD)?.active &&\n    selectedWeapon.type === "consumable" &&\n    poisonedItem.id !== selectedWeaponId &&\n    workflow.actor.type === "character"\n  ) {\n    for (let combat of game.combats) {\n      const actorAmmoAttr = `projectileData.${workflow.actor.id}`;\n      const actorAmmo = combat.getFlag(AMMO_TRACKER_MOD, actorAmmoAttr);\n      if (actorAmmo?.[selectedWeaponId]) {\n        const updatedActorAmmo = deepClone(actorAmmo);\n        updatedActorAmmo[selectedWeaponId] = updatedActorAmmo[selectedWeaponId] - allowedQuantity;\n        updatedActorAmmo[poisonedItem.id] = allowedQuantity;\n        await combat.setFlag(AMMO_TRACKER_MOD, actorAmmoAttr, updatedActorAmmo);\n      }\n    }\n  }\n} \n\n/**\n * Returns the item macro to handle the poisoned item effect.\n *\n * @returns {String} the item macro to handle the poisoned item effect.\n */\nfunction getPoisonedItemMacro() {\n  return `\nconst DEFAULT_ITEM_NAME = "${DEFAULT_ITEM_NAME}";\nconst debug = ${debug};\n\nconst MUT_NAME_PREFIX = "${MUT_NAME_PREFIX}";\n\nconst DEFAULT_SAVE_ABILITY = "${DEFAULT_SAVE_ABILITY}";\nconst DEFAULT_DAMAGE_FORMULA = "${DEFAULT_DAMAGE_FORMULA}";\nconst DEFAULT_DAMAGE_TYPE = "${DEFAULT_DAMAGE_TYPE}";\n\nif (debug) {\n  console.warn(DEFAULT_ITEM_NAME, { phase: args[0].tag ? args[0].macroPass : args[0] }, arguments);\n}\n\nif (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {\n  const macroData = args[0];\n  if (workflow.hitTargets.size === 0) {\n    return;\n  }\n  await handlePoisonPostActiveEffects(macroData, workflow, rolledItem);\n} else if (args[0] === "off") {\n  const sourceToken = canvas.tokens.get(lastArgValue.tokenId);\n  const sourceItem = fromUuidSync(lastArgValue.origin);\n  const mutName = \\`\\${MUT_NAME_PREFIX}-\\${sourceItem?.id}\\`;\n  await warpgate.revert(sourceToken.document, mutName);\n  // Make sure that if other mutations were added after this one, \n  // we remove poisoned from the name\n  const poisonedName = \\` [\\${CONFIG.DND5E.conditionTypes["poisoned"]}]\\`;\n  if (sourceItem.name.includes(poisonedName)) {\n    const newName = sourceItem.name.replace(poisonedName, "");\n    await sourceItem.update({name: newName});\n  }\n\n  // Note: warpgate does not remove added flags, it nulls them, unset them is the item was not an added one\n  if (sourceItem) {\n    await sourceItem.unsetFlag("midi-item-showcase-community", "appliedPoison");\n  }\n  \n  // Delete created macro.\n  const macroName = \\`\\${mutName}-by-\\${sourceToken.actor.uuid}\\`;\n  await game.macros.getName(macroName)?.delete();\n}\n\n${handlePoisonPostActiveEffects.toString()}\n\n${getPoisonEffectItemData.toString()}\n\n`;\n}\n\n/**\n * Handles the poison effect when an attack hit with the poisoned weapon or the weapon that used a poisoned ammunition.\n * A temporary item is created to apply the damage on a failed saved and passed to MidiQOL.completeItemUse.\n *\n * @param {object} macroData the midi macro data.\n * @param {MidiQOL.Workflow} poisonAttackWorkflow the current midi workflow.\n * @param {Item5E} item the used item\n * @returns {void}\n */\nasync function handlePoisonPostActiveEffects(macroData, poisonAttackWorkflow, item) {\n  const appliedPoison = item.getFlag("midi-item-showcase-community", "appliedPoison");\n  if (!appliedPoison) {\n    console.error(`${DEFAULT_ITEM_NAME} | Missing appliedPoison flag on poisoned weapon or ammo.`);\n    return;\n  }\n  if (poisonAttackWorkflow.item?.uuid !== item.uuid && poisonAttackWorkflow.ammo?.uuid !== item.uuid) {\n    if (debug) {\n      console.warn(`${DEFAULT_ITEM_NAME} | Skip, called from a workflow on another item than the poisoned one.`);\n    }\n    return;\n  }\n\n  // Call complete item use with temp item on first hit target\n  const poisonItemData = await getPoisonEffectItemData(appliedPoison);\n  const poisonItem = new CONFIG.Item.documentClass(poisonItemData, { parent: workflow.actor, temporary: true });\n\n  const options = {\n    targetUuids: [macroData.hitTargetUuids[0]],\n  };\n  try {\n    await MidiQOL.completeItemUse(poisonItem, {}, options);\n  } finally {\n    // When the poisoned item is a weapon and has uses, update uses\n    if (item.type === "weapon" && appliedPoison.uses) {\n      const newUses = appliedPoison.uses - 1;\n      if (newUses > 0) {\n        await item.setFlag("midi-item-showcase-community", "appliedPoison.uses", newUses);\n      } else {\n        // The maximum uses has been reached, the poisoned weapon effect expires...\n        const mutName = `${MUT_NAME_PREFIX}-${item.id}`;\n        await poisonAttackWorkflow.actor.effects.getName(mutName)?.delete();\n      }\n    }\n  }\n}\n\n/**\n * Returns the temporary item data for the poison effect.\n * @param {object} appliedPoison the basic information on the poison that was applied.\n * @returns {object} a temporary item data for the poison effect.\n */\nasync function getPoisonEffectItemData(appliedPoison) {\n \n  // Use default basic poison\n  return {\n    type: "consumable",\n    name: `Poison - Effect`,\n    img: appliedPoison.img,\n    system: {\n      consumableType: "poison",\n      actionType: "other",\n      damage: { parts: [[DEFAULT_DAMAGE_FORMULA, DEFAULT_DAMAGE_TYPE]] },\n      save: { ability: DEFAULT_SAVE_ABILITY, dc: appliedPoison.saveDC, scaling: "flat" },\n    },\n"effects": [\n    {\n      "changes": [\n        {\n          "key": "flags.midi-qol.disadvantage.attack.all",\n          "mode": 0,\n          "value": "1",\n          "priority": 0\n        },\n        {\n          "key": "flags.midi-qol.disadvantage.ability.check.all",\n          "mode": 0,\n          "value": "1",\n          "priority": 0\n        }\n      ],\n      "description": "<p>- A poisoned creature has disadvantage on attack rolls and ability checks.</p>",\n      "disabled": false,\n      "duration": {\n        "rounds": 2,\n        "seconds": null,\n        "turns": null,\n        "startTime": null,\n        "combat": null,\n        "startRound": null,\n        "startTurn": null\n      },\n      "flags": {\n        "dfreds-convenient-effects": {\n          "isConvenient": true,\n          "isDynamic": false,\n          "isViewable": true,\n          "nestedEffects": [],\n          "subEffects": []\n        },\n        "dae": {\n          "stackable": "noneName",\n          "specialDuration": [\n            "turnEndSource"\n          ],\n          "transfer": false,\n          "disableIncapacitated": false,\n          "selfTarget": false,\n          "selfTargetAlways": false,\n          "dontApply": false,\n          "showIcon": false,\n          "durationExpression": "",\n          "macroRepeat": "none"\n        },\n        "times-up": {\n          "isPassive": false\n        },\n        "ActiveAuras": {\n          "isAura": false,\n          "aura": "None",\n          "nameOverride": "",\n          "radius": "",\n          "alignment": "",\n          "type": "",\n          "customCheck": "",\n          "ignoreSelf": false,\n          "height": false,\n          "hidden": false,\n          "displayTemp": false,\n          "hostile": false,\n          "onlyOnce": false,\n          "wallsBlock": "system"\n        }\n      },\n      "icon": "modules/dfreds-convenient-effects/images/poisoned.svg",\n      "name": "Poisoned",\n      "origin": "",\n      "tint": null,\n      "transfer": false,\n      "statuses": [\n        "Convenient Effect: Poisoned",\n        "poison"\n      ],\n      "_id": "okjAiINyCoY5M8Ax"\n    }\n  ],\n    flags: { midiProperties: { nodam: true } },\n  };\n}',
            author: 'RDUD9VahrEsIwEDB',
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
        },
      },
    };
  }
}
