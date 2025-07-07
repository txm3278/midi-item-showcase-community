import { moduleName } from './constants.js';
import { scripts } from './macros.js';

export function registerSettings() {
  game.settings.register(moduleName, 'Elwin Helpers', {
    name: game.i18n.localize('midi-item-showcase-community.ElwinHelpersName'),
    hint: game.i18n.localize('midi-item-showcase-community.ElwinHelpersHint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (value) {
        scripts.runElwinsHelpers();
        scripts.runElwinsHelpersCoating();
      }
    },
  });
}
