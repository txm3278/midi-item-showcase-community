import { moduleName } from './constants.js';
import { registerSettings } from './settings.js';
import { setConfig } from './config.js';
import { setupActors } from './actors.js';
import { macros, scripts } from './macros.js';

Hooks.once('init', async function () {
  registerSettings();
  setConfig();
});

Hooks.once('ready', async function () {
  if (game.user.isGM) {
    if (game.settings.get(moduleName, 'Update Actors')) await setupActors();
  }
  if (game.settings.get(moduleName, 'Elwin Helpers')) {
    await scripts.runElwinsHelpers();
  }
});

globalThis['MISC'] = {
  macros,
};
