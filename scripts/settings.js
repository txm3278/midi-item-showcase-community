import { moduleName } from './constants.js';
import { setupActors } from './actors.js';
import { runMacro } from './macros.js';

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
  game.settings.register(moduleName, 'Third Party Reactions', {
    name: 'Use Third Party Reactions (By Elwin)',
    hint: "Enabling this will enable automations that rely on Elwin's Third Party Reactions script",
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (value && game.user.isGM) await runMacro('Third Party Reactions');
    },
  });
}
