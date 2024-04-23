export async function forage({
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
  /* Creator: thatlonelybugbear
   * Colaborators: Fridan99, ctbritt
   */

  // Define common food items to reduce redundancy in region definitions.
  const commonFoodItems = [
    'Berries',
    'Fish',
    'Flowers',
    'Fruit',
    'Fungi',
    'Insects',
    'Meat',
    'Seeds',
    'Roots',
    'Weeds',
  ];

  const regions = {
    'Mountains & Hills [DC 15]': {
      dc: 15,
      food: [...commonFoodItems, 'Nuts', 'Plants'],
    },
    'Forest & Jungle [DC 10]': {
      dc: 10,
      food: [...commonFoodItems, 'Nuts', 'Plants', 'Vegetables'],
    },
    'Desert [DC 20]': {
      dc: 20,
      food: ['Insects', 'Meat', 'Seeds', 'Roots', 'Weeds'],
    },
    'Dungeon & Underdark [DC 20]': {
      dc: 20,
      food: [
        'Berries',
        'Fish',
        'Flowers',
        'Fruit',
        'Fungi',
        'Meat',
        'Seeds',
        'Roots',
        'Weeds',
      ],
    },
    'City [DC 15]': {
      dc: 15,
      food: [
        'Flowers',
        'Insects',
        'Meat',
        'Seeds',
        'Roots',
        'Rubbish',
        'Weeds',
      ],
      note: 'Note: the Meat probably be bird, cat, dog, or rat',
    },
    'Arctic [DC 20]': {
      dc: 20,
      food: ['Fish', 'Meat', 'Seeds', 'Roots', 'Weeds'],
    },
    'Swamp [DC 15]': {
      dc: 15,
      food: [
        'Berries',
        'Fish',
        'Flowers',
        'Fungi',
        'Insects',
        'Meat',
        'Seeds',
        'Roots',
        'Weeds',
      ],
    },
    'Grassland [DC 10]': {
      dc: 10,
      food: [
        'Berries',
        'Flowers',
        'Fruit',
        'Insects',
        'Meat',
        'Seeds',
        'Roots',
        'Vegetables',
        'Weeds',
      ],
    },
    'Coast [DC 10]': {
      dc: 10,
      food: ['Fish', 'Fruit', 'Mollusks', 'Roots', 'Seaweed', 'Weeds'],
    },
  };

  // Set variables
  let foodRoll;
  let waterRoll;
  let numberRations = 0;
  let numberWaterskins = 0;
  let newFood;
  let newWater;

  // Check if the actor has a feature called "Natural Explorer".
  // Using `.some()` because we just need a boolean indicating existence.
  const isNaturalExplorer = token.actor.items.some((i) =>
    i.name.includes('Natural Explorer')
  );

  // Get various bonuses and mods
  let wisMod = token.actor.system.abilities.wis.mod;
  let proficiencyBonus = token.actor.system.attributes.prof;
  let isSurvivalProf = token.actor.system.skills.sur.prof.hasProficiency;
  let survivalBonus =
    token.actor.system.skills.sur.mod + (isSurvivalProf ? proficiencyBonus : 0);
  let waterBonus = `1d6 + ${wisMod}`;
  let foodBonus = `1d6 + ${wisMod}`;

  // Dialog 1 for region and roll type
  const dialogOptions = Object.entries(regions).reduce(
    (acc, [type, { dc }]) =>
      (acc += `<option value="${type}">${type}</option>`),
    ``
  );

  const title = 'Foraging';
  const buttons = ['Advantage', 'Normal', 'Disadvantage'].map((i) => ({
    label: i,
    callback: () => {
      const region = document.querySelector('#type')?.value;
      return { region, rollType: i };
    },
  }));
  const content = `
  <p>Choose a region and type of roll!</p>
  <hr>
  <form>
    <div class="form-group">
      <label for="type">Survival skill check</label>
      <div class="form-fields">
        <select id="type">${dialogOptions}</select>
      </div>
    </div>
  </form>`;
  const close = () => false;

  const dialog = await Dialog.wait(
    { title, content, buttons, close },
    { id: 'foraging-dialog' }
  );
  if (!dialog) return;

  // Dialog 2 for Natural Explorer
  if (isNaturalExplorer) {
    const rangerOptions = {
      No: 0,
      Yes: 1,
    };

    const rangerDialogOptions = Object.entries(rangerOptions).reduce(
      (acc, [type, value]) =>
        (acc += `<option value="${value}">${type}</option>`),
      ``
    );

    const buttons2 = ['Submit'].map((i) => ({
      label: i,
      callback: () => {
        const rangerOption = document.querySelector('#rangerOption')?.value;
        return { rangerOption };
      },
    }));
    const content2 = `
  <p>Is this your favorite terrain?</p>
  <hr>
  <form>
    <div class="form-group">
      <label for="rangerOption">Option</label>
      <div class="form-fields">
        <select id="rangerOption">${rangerDialogOptions}</select>
      </div>
    </div>
  </form>`;
    const close2 = () => false;

    const dialog2 = await Dialog.wait(
      { title, content: content2, buttons: buttons2, close: close2 },
      { id: 'ranger-dialog' }
    );
    if (!dialog2) return;
    const rangerOption = dialog2.rangerOption;

    if (rangerOption == 1) {
      foodBonus = `2 * (1d6 + ${wisMod})`;
    }
    if (rangerOption == 1) {
      survivalBonus += proficiencyBonus;
    }
  }

  // Roll the dice
  const diceFormula = dialog.rollType === 'Normal' ? '1d20' : '2d20';
  const survivalRoll = await new Roll(
    `${diceFormula}${
      dialog.rollType === 'Advantage'
        ? 'kh'
        : dialog.rollType === 'Disadvantage'
        ? 'kl'
        : ''
    } + ${survivalBonus}`,
    token.actor.getRollData()
  ).evaluate();
  let msg = await survivalRoll.toMessage({
    flavor: `Survival skill check (the task takes 4h of effort)`,
  });
  await game.dice3d?.waitFor3DAnimationByMessageID(msg.id);

  // Check if the roll is successful
  if (survivalRoll.total < regions[dialog.region].dc) {
    await ChatMessage.create({ content: `You didn't find any food or water` });
  } else {
    // Roll for food and water
    const waterRoll = await new Roll(`(${waterBonus})`).evaluate();
    msg = await waterRoll.toMessage({ flavor: `You get in gallons of water` });
    await game.dice3d?.waitFor3DAnimationByMessageID(msg.id);
    numberWaterskins = Math.floor(waterRoll.total / 2);

    const foodRoll = await new Roll(`(${foodBonus})`).evaluate();
    msg = await foodRoll.toMessage({ flavor: `You get in pounds of food` });
    await game.dice3d?.waitFor3DAnimationByMessageID(msg.id);
    numberRations = foodRoll.total;

    // Create the food types and message

    const foodTypes = {};
    for (let i = 0; i < foodRoll.total; i++) {
      const foodType =
        regions[dialog.region].food[
          Math.floor(Math.random() * regions[dialog.region].food.length)
        ];
      foodTypes[foodType] = (foodTypes[foodType] || 0) + 1;
    }
    const foodMessage = Object.entries(foodTypes)
      .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
      .map(([type, count]) => `${count > 1 ? count + 'x ' : ''}${type}`)
      .join(', ');
    await ChatMessage.create({
      content: `<b>You gathered the following types of food</b>: ${foodMessage}`,
    });
    if (dialog.region === 'City [DC 15]') {
      await ChatMessage.create({
        content: `<span style="color:red">Note:</span> The Meat is probably bird, cat, dog, or rat`,
      });
    }
  }

  // create rations from numberRations
  const newRations = {
    name: 'Rations (1 day)',
    type: 'consumable',
    system: {
      description: {
        value:
          '<p>Rations consist of dry foods suitable for extended travel, including jerky, dried fruit, hardtack, and nuts.</p>',
        chat: '',
        unidentified: 'Gear',
      },
      source: {
        custom: "Basic Rules, Player's Handbook",
      },
      quantity: numberRations,
      weight: 2,
      price: {
        value: 5,
        denomination: 'sp',
      },
      attunement: 0,
      equipped: false,
      rarity: '',
      identified: true,
      activation: {
        type: '',
        cost: null,
        condition: '',
      },
      duration: {
        value: '',
        units: '',
      },
      cover: null,
      crewed: false,
      target: {
        value: null,
        width: null,
        units: '',
        type: '',
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
      consume: {
        type: '',
        target: null,
        amount: null,
        scale: false,
      },
      ability: null,
      actionType: '',
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
        dc: null,
        scaling: 'spell',
      },
      consumableType: 'food',
      properties: {},
    },
    flags: {
      ddbimporter: {
        dndbeyond: {
          type: 'Adventuring Gear',
          isConsumable: false,
          isContainer: false,
          isCustomItem: false,
          isHomebrew: false,
          isMonkWeapon: false,
          isPack: false,
          levelInfusionGranted: null,
          tags: ['Social', 'Utility', 'Consumable'],
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
        definitionId: 75,
        originalName: 'Rations (1 day)',
        version: '3.6.0',
      },
      'scene-packer': {
        sourceId: 'Item.',
        hash: '48e25bc763ee0105fb7e517ca9d3f455627600d0',
      },
      'midi-qol': {
        onUseMacroName: '',
      },
      'hide-item-value': {
        appraised: '',
        showPrice: false,
      },
      'custom-character-sheet-sections': {
        sectionName: '',
      },
      'rest-recovery': {
        data: {
          consumable: {
            enabled: true,
            dayWorth: true,
          },
          recovery: {
            enabled: false,
          },
        },
      },
      LocknKey: {
        IDKeysFlag: '',
        RemoveKeyonUseFlag: false,
        LPFormulaFlag: '',
        LPFormulaOverrideFlag: false,
        LBFormulaFlag: '',
        LBFormulaOverrideFlag: false,
        ReplacementItemFlag: '',
      },
      core: {},
      exportSource: {
        world: 'Rime-of-the-Frost-Maiden',
        system: 'dnd5e',
        coreVersion: '11.315',
        systemVersion: '2.4.0',
      },
    },
    effects: [],
    img: 'icons/consumables/meat/hock-leg-pink-brown.webp',
    folder: 'Odle0eG1kGbV13zL',
    _stats: {
      systemId: 'dnd5e',
      systemVersion: '2.4.0',
      coreVersion: '11.315',
      createdTime: 1695068367276,
      modifiedTime: 1701375852979,
      lastModifiedBy: 'jM4h8qpyxwTpfNli',
    },
  };
  // create waterskins from numberWaterskins
  const newWaterskins = {
    name: 'Waterskin',
    type: 'consumable',
    system: {
      description: {
        value: '<p>A waterskin can hold 4 pints of liquid.</p>',
        chat: '',
        unidentified: 'Gear',
      },
      source: {
        custom: "Basic Rules, Player's Handbook",
      },
      quantity: numberWaterskins ? Math.floor(numberWaterskins / 2) : 0,
      weight: 5,
      price: {
        value: 2,
        denomination: 'sp',
      },
      attunement: 0,
      equipped: false,
      rarity: '',
      identified: true,
      activation: {
        type: 'special',
        cost: null,
        condition: '',
      },
      duration: {
        value: '',
        units: '',
      },
      cover: null,
      crewed: false,
      target: {
        value: null,
        width: null,
        units: '',
        type: '',
        prompt: true,
      },
      range: {
        value: null,
        long: null,
        units: '',
      },
      uses: {
        value: 4,
        max: '4',
        per: 'charges',
        recovery: '',
        autoDestroy: false,
        prompt: true,
      },
      consume: {
        type: '',
        target: null,
        amount: null,
        scale: false,
      },
      ability: null,
      actionType: '',
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
        dc: null,
        scaling: 'spell',
      },
      consumableType: 'food',
      properties: {},
    },
    flags: {
      ddbimporter: {
        dndbeyond: {
          type: 'Adventuring Gear',
          isConsumable: false,
          isContainer: false,
          isCustomItem: false,
          isHomebrew: false,
          isMonkWeapon: false,
          isPack: false,
          levelInfusionGranted: null,
          tags: ['Container'],
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
        definitionId: 92,
        originalName: 'Waterskin',
        version: '3.6.0',
      },
      'midi-qol': {
        onUseMacroName: '',
        onUseMacroParts: {
          items: [],
        },
      },
      'hide-item-value': {
        appraised: '',
        showPrice: false,
      },
      'custom-character-sheet-sections': {
        sectionName: '',
      },
      'rest-recovery': {
        data: {
          consumable: {
            enabled: true,
            dayWorth: true,
          },
          recovery: {
            enabled: false,
          },
        },
      },
      dicerecharge: {
        special: {
          active: false,
        },
        destroy: {
          check: false,
        },
      },
      LocknKey: {
        IDKeysFlag: '',
        RemoveKeyonUseFlag: false,
        LPFormulaFlag: '',
        LPFormulaOverrideFlag: false,
        LBFormulaFlag: '',
        LBFormulaOverrideFlag: false,
        ReplacementItemFlag: '',
      },
      core: {},
      exportSource: {
        world: 'Rime-of-the-Frost-Maiden',
        system: 'dnd5e',
        coreVersion: '11.315',
        systemVersion: '2.4.0',
      },
    },
    effects: [],
    img: 'icons/sundries/survival/wetskin-leather-purple.webp',
    folder: 'Odle0eG1kGbV13zL',
    _stats: {
      systemId: 'dnd5e',
      systemVersion: '2.4.0',
      coreVersion: '11.315',
      createdTime: 1696627466086,
      modifiedTime: 1701376004159,
      lastModifiedBy: 'jM4h8qpyxwTpfNli',
    },
  };

  // Add the rations and waterskins to the actor
  if (actor.items.find((i) => i.name === 'Rations (1 day)')) {
    let currentRations = actor.items.getName('Rations (1 day)').system.quantity;
    await actor.items
      .getName('Rations (1 day)')
      .update({ system: { quantity: currentRations + numberRations } });
  } else {
    await actor.createEmbeddedDocuments('Item', [newRations]);
  }
  if (actor.items.find((i) => i.name === 'Waterskin')) {
    let currentWaterskins = actor.items.getName('Waterskin').system.quantity;
    await actor.items
      .getName('Waterskin')
      .update({ system: { quantity: currentWaterskins + numberWaterskins } });
  } else {
    await actor.createEmbeddedDocuments('Item', [newWaterskins]);
  }
}
