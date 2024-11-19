import { moduleName } from './constants.js';
import { setupActors } from './actors.js';
import { scripts } from './macros.js';

export function registerSettings() {
  game.settings.register(moduleName, 'Update Actors', {
    name: 'Create Module Actors',
    hint: 'Enabling this will create actors from this module in the sidebar',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (value && game.user.isGM) await setupActors();
    },
  });
  game.settings.register(moduleName, 'Elwin Helpers', {
    name: 'Use Elwin Helpers',
    hint: "Enabling this will enable automations that rely on Elwin's Helper Script",
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (value) {
        await scripts.runElwinsHelpers();
        await scripts.runElwinsHelpersCoating();
      }
    },
  });
}
