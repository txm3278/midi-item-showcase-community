import { moduleName } from './constants.js';
import { registerSettings } from './settings.js';
import { setupActors } from './actors.js';
import { runMacro } from './macros.js';

Hooks.once('init', async function () {
  registerSettings();
});

Hooks.once('ready', async function () {
  if (game.user.isGM) {
    if (game.settings.get(moduleName, 'Update Actors')) await setupActors();
    if (game.settings.get(moduleName, 'Third Party Reactions'))
      await runMacro('Third Party Reactions');
  }
});
