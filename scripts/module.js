import { moduleName } from './constants.js';
import { registerSettings } from './settings.js';
import { setConfig } from './config.js';
import { macros, scripts } from './macros.js';

Hooks.once('init', async function () {
  registerSettings();
  setConfig();
});

Hooks.once('ready', async function () {
  if (game.settings.get(moduleName, 'Elwin Helpers')) {
    scripts.runElwinsHelpers();
    scripts.runElwinsHelpersCoating();
  }
});

globalThis['MISC'] = {
  macros,
};
