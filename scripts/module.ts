import { moduleName } from './constants.ts';
import { registerSettings } from './settings.ts';
import { setConfig } from './config.ts';
import { macros, scripts } from './macros.ts';

Hooks.once('init', function () {
  registerSettings();
  setConfig();
});

Hooks.once('ready', function () {
  if (game.settings?.get(moduleName, 'Elwin Helpers')) {
    scripts.runElwinsHelpers();
    scripts.runElwinsHelpersCoating();
  }
});

globalThis.MISC = {
  macros,
};
