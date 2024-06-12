import { moduleName } from './constants.js';

export function setConfig() {
  setProperty(CONFIG, moduleName, {
    module: moduleName,
    automations: {
      'Absorb Elements': {
        name: 'Absorb Elements',
        type: 'Spell',
        version: '1.0.2',
        authors: ['Bradeck', 'thatlonelybugbear'],
      },
      "Alchemist's Fire (flask)": {
        name: "Alchemist's Fire (flask)",
        type: 'Item',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      'All of Nothing Armor': {
        name: 'All of Nothing Armor',
        type: 'Item',
        homebrew: true,
        version: '0.1.1',
        authors: ['CoolHand'],
      },
      'Arms of the Astral Self': {
        name: 'Arms of the Astral Self',
        type: 'Class Feature',
        version: '1.0.0',
        authors: ['Spoob'],
      },
      'Arrow-Catching Shield': {
        name: 'Arrow-Catching Shield',
        type: 'Item',
        version: '3.1.0',
        authors: ['Elwin'],
      },
      'Aspect of the Beast: Bear': {
        name: 'Aspect of the Beast: Bear',
        type: 'Class Feature',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      Assassinate: {
        name: 'Assassinate',
        type: 'Class Feature',
        version: '1.0.0',
        authors: ['thatlonelybugbear'],
      },
      'Beast Sense': {
        name: 'Beast Sense',
        type: 'Spell',
        version: '1.0.0',
        authors: ['Luvac Zantor'],
      },
      Bless: {
        name: 'Bless',
        type: 'Spell',
        version: '0.1.1',
        authors: ['Moto Moto'],
      },
      'Blessed Healer': {
        name: 'Blessed Healer',
        type: 'Class Feature',
        version: '1.0.1',
        authors: ['SagaTympana, Moto Moto'],
      },
      'Borrowed Knowledge': {
        name: 'Borrowed Knowledge',
        type: 'Spell',
        version: '0.1.1',
        authors: ['SagaTympana'],
      },
      'Channel Divinity: Divine Spark': {
        name: 'Channel Divinity: Divine Spark',
        type: 'Class Feature',
        UA: true,
        version: '0.1.1',
        authors: ['SagaTympana'],
      },
      'Channel Divinity: Turn the Tide': {
        name: 'Channel Divinity: Turn the Tide',
        type: 'Class Feature',
        version: '1.0.1',
        authors: ['Christopher'],
      },
      'Clockwork Amulet': {
        name: 'Clockwork Amulet',
        type: 'Item',
        version: '0.1.1',
        authors: ['thatlonelybugbear'],
      },
      'Corpse Slayer Longbow': {
        name: 'Corpse Slayer Longbow',
        type: 'Item',
        version: '0.1.1',
        authors: ['SagaTympana'],
      },
      Countercharm: {
        name: 'Countercharm',
        type: 'Class Feature',
        version: '1.0.2',
        authors: ['Moto Moto'],
      },
      'Crown of Stars': {
        name: 'Crown of Stars',
        type: 'Spell',
        version: '1.0.1',
        authors: ['Xenophes'],
      },
      'Deflect Missiles': {
        name: 'Deflect Missiles',
        type: 'Class Feature',
        version: '1.0.1',
        authors: ['thatlonelybugbear'],
      },
      'Deflect Missiles Attack': {
        name: 'Deflect Missiles Attack',
        type: 'Class Feature',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Deft Strike': {
        name: 'Deft Strike',
        type: 'Class Feature',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Divine Allegiance': {
        name: 'Divine Allegiance',
        type: 'Class Feature',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      Driftglobe: {
        name: 'Driftglobe',
        type: 'Item',
        version: '0.1.1',
        authors: ['buttcheeksio'],
      },
      'Dungeon Delver': {
        name: 'Dungeon Delver',
        type: 'Feat',
        version: '0.1.1',
        authors: ['TMinz'],
      },
      'Dust of Dryness': {
        name: 'Dust of Dryness',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Dust of Sneezing and Choking': {
        name: 'Dust of Sneezing and Choking',
        type: 'Item',
        version: '1.0.0',
        authors: ['SaltyJ'],
      },
      'Eldritch Cannon': {
        name: 'Eldritch Cannon',
        type: 'Class Feature',
        version: '0.1.1',
        authors: ['allgoodtogrow'],
      },
      Elusive: {
        name: 'Elusive',
        type: 'Class Feature',
        version: '0.1.0',
        authors: ['SagaTympana'],
      },
      'Eyes of Minute Seeing': {
        name: 'Eyes of Minute Seeing',
        type: 'Item',
        version: '1.9.0',
        authors: ['Moto Moto'],
      },
      'Fighting Style: Great Weapon Fighting': {
        name: 'Fighting Style: Great Weapon Fighting',
        type: 'Class Feature',
        version: '0.1.3',
        authors: ['WurstKorn'],
      },
      'Flame Tongue Rapier': {
        name: 'Flame Tongue Rapier',
        type: 'Item',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      'Flames of Phlegethos': {
        name: 'Flames of Phlegethos',
        type: 'Feat',
        version: '2.1.0',
        authors: ['Elwin'],
      },
      'Flaming Sphere': {
        name: 'Flaming Sphere',
        type: 'Spell',
        version: '1.0.2',
        authors: ['Moto Moto'],
      },
      'Flash of Genius': {
        name: 'Flash of Genius',
        type: 'Class Feature',
        version: '0.1.0',
        authors: ['SagaTympana'],
      },
      Forage: {
        name: 'Forage',
        type: 'Generic Action',
        version: '0.1.1',
        authors: ['Fridan99', 'Christopher'],
      },
      'Gift of Alacrity': {
        name: 'Gift of Alacrity',
        type: 'Spell',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Gift of the Metallic Dragon': {
        name: 'Gift of the Metallic Dragon',
        type: 'Feat',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      'Goggles of Object Reading': {
        name: 'Goggles of Object Reading',
        type: 'Item',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      Goodberry: {
        name: 'Goodberry',
        type: 'Spell',
        version: '2.0.2',
        authors: ['Elwin'],
      },
      'Great Weapon Master': {
        name: 'Great Weapon Master',
        type: 'Feat',
        version: '2.1.2',
        authors: ['Elwin'],
      },
      'Great Weapon Master Attack': {
        name: 'Great Weapon Master Attack',
        type: 'Feat',
        version: '2.1.2',
        authors: ['Elwin'],
      },
      'Guardian Emblem': {
        name: 'Guardian Emblem',
        type: 'Item',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      Healer: {
        name: 'Healer',
        type: 'Feat',
        version: '0.1.1',
        authors: ['SagaTympana', 'WurstKorn'],
      },
      'Hero Points': {
        name: 'Hero Points',
        type: 'Generic Feature',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      Immolation: {
        name: 'Immolation',
        type: 'Spell',
        version: '0.1.0',
        authors: ['Moto Moto', 'SagaTympana', 'Worthlesston'],
      },
      'Indomitable Might': {
        name: 'Indomitable Might',
        type: 'Class Feature',
        version: '0.1.0',
        authors: ['Muhammad2126'],
      },
      'Inspiring Leader': {
        name: 'Inspiring Leader',
        type: 'Feat',
        version: '1.0.0',
        authors: ['SagaTympana'],
      },
      "Lila's Famous Mushroom Tea": {
        name: "Lila's Famous Mushroom Tea",
        type: 'Item',
        homebrew: true,
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Mage Hand': {
        name: 'Mage Hand',
        type: 'Spell',
        version: '1.0.0',
        authors: ['Lukas'],
      },
      'Magic Stone': {
        name: 'Magic Stone',
        type: 'Spell',
        version: '0.1.2',
        authors: ['Bradeck', 'Coolhand', 'SagaTympana'],
      },
      'Medium Armor Master': {
        name: 'Medium Armor Master',
        type: 'Feat',
        version: '0.1.0',
        authors: ['Muhammad2126'],
      },
      'Memorize Spell': {
        name: 'Memorize Spell',
        type: 'Class Feature',
        UA: true,
        version: '0.1.1',
        authors: ['SagaTympana'],
      },
      'Mental Prison': {
        name: 'Mental Prison',
        type: 'Spell',
        version: '1.0.0',
        authors: ['Spoob'],
      },
      'Meteor Swarm': {
        name: 'Meteor Swarm',
        type: 'Spell',
        version: '1.0.1',
        authors: ['Xenophes'],
      },
      Mislead: {
        name: 'Mislead',
        type: 'Spell',
        version: '1.0.0',
        authors: ['TMinz'],
      },
      'Moon-Touched Sword, Greatsword': {
        name: 'Moon-Touched Sword, Greatsword',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Moon-Touched Sword, Longsword': {
        name: 'Moon-Touched Sword, Longsword',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Moon-Touched Sword, Scimitar': {
        name: 'Moon-Touched Sword, Scimitar',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Moon-Touched Sword, Shortsword': {
        name: 'Moon-Touched Sword, Shortsword',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Moon-Touched, Rapier': {
        name: 'Moon-Touched, Rapier',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      "Mordenkainen's Sword": {
        name: "Mordenkainen's Sword",
        type: 'Spell',
        version: '0.1.1',
        authors: ['Janner3D'],
      },
      Net: {
        name: 'Net',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      Oathbow: {
        name: 'Oathbow',
        type: 'Item',
        version: '1.0.1',
        authors: ['Christopher'],
      },
      Poisoner: {
        name: 'Poisoner',
        type: 'Feat',
        version: '0.1.2',
        authors: ['WurstKorn'],
      },
      'Potion of Healing': {
        name: 'Potion of Healing',
        type: 'Item',
        homebrew: true,
        version: '0.1.1',
        authors: ['TreeDragon', 'thatlonelybugbear'],
      },
      'Potion of Healing (Greater)': {
        name: 'Potion of Healing (Greater)',
        type: 'Item',
        homebrew: true,
        version: '0.1.1',
        authors: ['TreeDragon', 'thatlonelybugbear'],
      },
      'Potion of Healing (Superior)': {
        name: 'Potion of Healing (Superior)',
        type: 'Item',
        homebrew: true,
        version: '0.1.1',
        authors: ['TreeDragon', 'thatlonelybugbear'],
      },
      'Potion of Healing (Supreme)': {
        name: 'Potion of Healing (Supreme)',
        type: 'Item',
        homebrew: true,
        version: '0.1.1',
        authors: ['TreeDragon', 'thatlonelybugbear'],
      },
      'Power Word Pain': {
        name: 'Power Word Pain',
        type: 'Spell',
        version: '0.1.1',
        authors: ['Xenophes'],
      },
      'Primal Champion': {
        name: 'Primal Champion',
        type: 'Class Feature',
        version: '0.1.0',
        authors: ['Muhammad2126'],
      },
      'Protection from Poison': {
        name: 'Protection from Poison',
        type: 'Spell',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      'Psionic Power: Protective Field': {
        name: 'Psionic Power: Protective Field',
        type: 'Class Feature',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      'Psychic Blades': {
        name: 'Psychic Blades',
        type: 'Class Feature',
        version: '1.0.0',
        authors: ['SagaTympana'],
      },
      'Raise Dead': {
        name: 'Raise Dead',
        type: 'Spell',
        version: '0.1.0',
        authors: ['SagaTympana'],
      },
      'Recall Monster Lore': {
        name: 'Recall Monster Lore',
        type: 'Generic Action',
        version: '0.1.1',
        authors: ['Fridan99'],
      },
      Resurrection: {
        name: 'Resurrection',
        type: 'Spell',
        version: '0.1.0',
        authors: ['SagaTympana'],
      },
      'Ryath Root': {
        name: 'Ryath Root',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      'Scaled Ornament (stirring)': {
        name: 'Scaled Ornament (stirring)',
        type: 'Item',
        version: '0.1.0',
        authors: ['Muhammad2126'],
      },
      "Sentinel at Death's Door": {
        name: "Sentinel at Death's Door",
        type: 'Class Feature',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      Sharpshooter: {
        name: 'Sharpshooter',
        type: 'Feat',
        version: '1.0.1',
        authors: ['Moto Moto'],
      },
      'Shield of Missile Attraction': {
        name: 'Shield of Missile Attraction',
        type: 'Item',
        version: '1.0.0',
        authors: ['Ris'],
      },
      Slow: {
        name: 'Slow',
        type: 'Spell',
        version: '1.0.2',
        authors: ['Moto Moto'],
      },
      Snare: {
        name: 'Snare',
        type: 'Spell',
        version: '0.1.0',
        authors: ['Quinn Dexter'],
      },
      'Sorcerous Burst': {
        name: 'Sorcerous Burst',
        type: 'Spell',
        UA: true,
        version: '1.0.1',
        authors: ['SagaTympana'],
      },
      'Soul of Artifice': {
        name: 'Soul of Artifice',
        type: 'Class Feature',
        version: '0.1.1',
        authors: ['SagaTympana'],
      },
      'Spirit Shield': {
        name: 'Spirit Shield',
        type: 'Class Feature',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      'Spirit Totem: Bear Spirit': {
        name: 'Spirit Totem: Bear Spirit',
        type: 'Class Feature',
        version: '0.1.1',
        authors: ['Moto Moto'],
      },
      'Squire of Solamnia: Precise Strike': {
        name: 'Squire of Solamnia: Precise Strike',
        type: 'Feat',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      'Starry Wisp': {
        name: 'Starry Wisp',
        type: 'Spell',
        UA: true,
        version: '0.1.0',
        authors: ['SagaTympana'],
      },
      'Steady Aim': {
        name: 'Steady Aim',
        type: 'Class Feature',
        version: '2.2.0',
        authors: ['Elwin'],
      },
      'Tomb of Levistus': {
        name: 'Tomb of Levistus',
        type: 'Class Feature',
        version: '0.1.3',
        authors: ['pospa4'],
      },
      'Toughened Skin': {
        name: 'Toughened Skin',
        type: 'Feat',
        homebrew: true,
        version: '0.1.0',
        authors: ['Muhammad2126'],
      },
      'Unwavering Mark': {
        name: 'Unwavering Mark',
        type: 'Class Feature',
        version: '2.1.0',
        authors: ['Elwin'],
      },
      'Vengeful Ancertors': {
        name: 'Vengeful Ancertors',
        type: 'Class Feature',
        version: '2.0.2',
        authors: ['Elwin'],
      },
      Vial: {
        name: 'Vial',
        type: 'Item',
        version: '1.0.0',
        authors: ['Moto Moto'],
      },
      'Vigilant Guardian': {
        name: 'Vigilant Guardian',
        type: 'Race Feature',
        version: '3.0.0',
        authors: ['Elwin'],
      },
      'Wand of Winter': {
        name: 'Wand of Winter',
        type: 'Item',
        version: '0.1.1',
        authors: ['thatlonelybugbear'],
      },
      'Warding Flare': {
        name: 'Warding Flare',
        type: 'Class Feature',
        version: '2.0.0',
        authors: ['Elwin'],
      },
      'Wukka Nuts': {
        name: 'Wukka Nuts',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
      Wildroot: {
        name: 'Wildroot',
        type: 'Item',
        version: '0.1.0',
        authors: ['Moto Moto'],
      },
    },
    monsterAutomations: {
      'Adrix, The Hammer': {
        'Dreadful Smite': {
          name: 'Dreadful Smite',
          version: '1.0.0',
          authors: ['TMinz'],
        },
        'Dreadful Wrath': {
          name: 'Dreadful Wrath',
          version: '1.0.0',
          authors: ['TMinz'],
        },
      },
      'Awakened White Moose': {
        Charge: {
          name: 'Charge',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Banshee: {
        Wail: {
          name: 'Wail',
          version: '0.1.1',
          authors: ['Moto Moto'],
        },
        'Horrifying Visage': {
          name: 'Horrifying Visage',
          version: '0.1.1',
          authors: ['Moto Moto'],
        },
      },
      Bulezau: {
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      'Burnished Hart': {
        Charge: {
          name: 'Charge',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Dao: {
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Fraughashar: {
        'Deft Snow Walk': {
          name: 'Deft Snow Walk',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      'Fulgorax: The Beacon': {
        'Evasion': {
          name: 'Evasion',
          version: '1.0.0',
          authors: ['TMinz'],
        },
        'Magic Resistance': {
          name: 'Magic Resistance',
          version: '1.0.0',
          authors: ['TMinz'],
        },
        'Move': {
          name: 'Move',
          version: '1.0.0',
          authors: ['TMinz'],
        },
        'Turn Immunity': {
          name: 'Turn Immunity',
          version: '1.0.0',
          authors: ['TMinz'],
        },
      },
      'Giant Goat': {
        Charge: {
          name: 'Charge',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      'Giant Spider': {
        Web: {
          name: 'Web',
          version: '0.1.0',
          authors: ['CoolHand'],
        },
      },
      Goat: {
        Charge: {
          name: 'Charge',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      'Goat-Knight Steed': {
        Charge: {
          name: 'Charge',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      'Hundred-Handed One': {
        Reactive: {
          name: 'Reactive',
          version: '0.1.0',
          authors: ['Muhammad2126'],
        },
      },
      Lindwurm: {
        'Sure-Footed Skater': {
          name: 'Sure-Footed Skater',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Marilith: {
        Reactive: {
          name: 'Reactive',
          version: '0.1.0',
          authors: ['Muhammad2126'],
        },
      },
      'Marilith (Summoner Variant)': {
        Reactive: {
          name: 'Reactive',
          version: '0.1.0',
          authors: ['Muhammad2126'],
        },
      },
      'Mountain Goat': {
        Charge: {
          name: 'Charge',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Mule: {
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Nimblewright: {
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      Sheep: {
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.1',
          authors: ['Moto Moto'],
        },
      },
      'Shield Guardian': {
        'Spell Storing': {
          name: 'Spell Storing',
          version: '1.0.1',
          authors: ['n3veruary'],
        },
      },
      'Spider King': {
        Web: {
          name: 'Web',
          version: '0.1.0',
          authors: ['CoolHand'],
        },
      },
      Vampire: {
        Bite: {
          name: 'Bite',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto', 'thatlonelybugbear'],
        },
        'Bite (Bat or Vampire Form Only)': {
          name: 'Bite (Bat or Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto', 'thatlonelybugbear'],
        },
        'Unarmed Strike (Vampire Form Only)': {
          name: 'Unarmed Strike (Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        'Unarmed Strike': {
          name: 'Unarmed Strike',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        'Multiattack (Vampire Form Only)': {
          name: 'Multiattack (Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'tposney'],
        },
        Move: {
          name: 'Move',
          version: '1.0.0',
          authors: ['TreeDragon', 'Janner3D'],
        },
        Shapechanger: {
          name: 'Shapechanger',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher'],
        },
        'Misty Escape': {
          name: 'Misty Escape',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher'],
        },
      },
      'Vampire Spawn': {
        Bite: {
          name: 'Bite',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto'],
        },
        Claws: {
          name: 'Claws',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        Multiattack: {
          name: 'Multiattack',
          version: '1.0.0',
          authors: ['tposney'],
        },
      },
      'Vampire Spellcaster': {
        Bite: {
          name: 'Bite',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto', 'thatlonelybugbear'],
        },
        'Bite (Bat or Vampire Form Only)': {
          name: 'Bite (Bat or Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto', 'thatlonelybugbear'],
        },
        'Unarmed Strike (Vampire Form Only)': {
          name: 'Unarmed Strike (Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        'Unarmed Strike': {
          name: 'Unarmed Strike',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        'Multiattack (Vampire Form Only)': {
          name: 'Multiattack (Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'tposney'],
        },
        Move: {
          name: 'Move',
          version: '1.0.0',
          authors: ['TreeDragon', 'Janner3D'],
        },
        Shapechanger: {
          name: 'Shapechanger',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher'],
        },
        'Misty Escape': {
          name: 'Misty Escape',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher'],
        },
      },
      'Vampire Warrior': {
        Bite: {
          name: 'Bite',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto', 'thatlonelybugbear'],
        },
        'Bite (Bat or Vampire Form Only)': {
          name: 'Bite (Bat or Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'Moto Moto', 'thatlonelybugbear'],
        },
        'Unarmed Strike (Vampire Form Only)': {
          name: 'Unarmed Strike (Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        'Unarmed Strike': {
          name: 'Unarmed Strike',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher', 'thatlonelybugbear'],
        },
        'Multiattack (Vampire Form Only)': {
          name: 'Multiattack (Vampire Form Only)',
          version: '1.0.0',
          authors: ['TreeDragon', 'tposney'],
        },
        Move: {
          name: 'Move',
          version: '1.0.0',
          authors: ['TreeDragon', 'Janner3D'],
        },
        Shapechanger: {
          name: 'Shapechanger',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher'],
        },
        'Misty Escape': {
          name: 'Misty Escape',
          version: '1.0.0',
          authors: ['TreeDragon', 'Christopher'],
        },
      },
      Vrock: {
        Spores: {
          name: 'Spores',
          version: '0.1.0',
          authors: ['natesummers#8576'],
        },
        'Stunning Screech': {
          name: 'Stunning Screech',
          version: '0.1.0',
          authors: ['Muhammad2126'],
        },
      },
      'Vrock (Summoner Variant)': {
        Spores: {
          name: 'Spores',
          version: '0.1.0',
          authors: ['natesummers#8576'],
        },
        'Stunning Screech': {
          name: 'Stunning Screech',
          version: '0.1.0',
          authors: ['Muhammad2126'],
        },
      },
      'Wooden Donkey': {
        'Sure-Footed': {
          name: 'Sure-Footed',
          version: '1.0.0',
          authors: ['Moto Moto'],
        },
      },
    },
  });
}
