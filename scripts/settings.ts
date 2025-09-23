import { moduleName } from './constants.ts';
import { scripts } from './macros.ts';

export function registerSettings() {
  game.settings?.register(moduleName, 'Elwin Helpers', {
    name: game.i18n?.localize('midi-item-showcase-community.ElwinHelpersName'),
    hint: game.i18n?.localize('midi-item-showcase-community.ElwinHelpersHint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (value) {
        scripts.runElwinsHelpers();
        scripts.runElwinsHelpersCoating();
      }
    },
  });
}
