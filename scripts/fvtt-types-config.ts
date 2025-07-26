import { macros } from './macros.ts';

declare module 'fvtt-types/configuration' {
  interface SettingConfig {
    'midi-item-showcase-community.Elwin Helpers': boolean;
  }
}

declare global {
  var MISC: {
    macros: typeof macros;
  };
}

export {};
