import { moduleName } from './constants.js';
import { scripts } from './macros.js';

export function registerSettings() {
  game.settings.register(moduleName, 'Elwin Helpers', {
    name: 'Use Elwin Helpers',
    hint: "Enabling this will enable automations that rely on Elwin's Helper Script",
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
