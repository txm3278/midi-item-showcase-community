import { runElwinsHelpers } from './automations/macros/elwinsHelpers.js';
import { actions } from './automations/actions/actions.js';
import { classFeatures } from './automations/classFeatures/classFeatures.js';
import { features } from './automations/features/features.js';
import { homebrew } from './automations/homebrew/homebrew.js';
import { itemFeatures } from './automations/itemFeatures/itemFeatures.js';
import { items } from './automations/items/items.js';
import { monsters } from './automations/monsters/monsters.js';
import { raceFeatures } from './automations/raceFeatures/raceFeatures.js';
import { spellItems } from './automations/spellItems/spellItems.js';
import { spells } from './automations/spells/spells.js';
import { UA } from './automations/unearthedArcana/unearthedArcana.js';

export let scripts = {
  runElwinsHelpers,
};

export let macros = {
  actions,
  classFeatures,
  features,
  homebrew,
  itemFeatures,
  items,
  monsters,
  raceFeatures,
  spellItems,
  spells,
  UA,
};
