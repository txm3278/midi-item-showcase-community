import { macros } from "./macros.ts";

declare module "fvtt-types/configuration" {
  interface SettingConfig {
    "midi-item-showcase-community.Elwin Helpers": boolean;
  }

  interface HookConfig {
    catReady: () => Promise<void>;
  }
}

declare global {
  namespace dnd5e {
    namespace utils {
      export function formatIdentifier(id: string): string;
    }
  }

  var MISC: {
    macros: typeof macros;
  };

  var cat: {
    api: {
      registerSourceName(id: string, name: string): void;
      registerAutomation(automationData: object): void;
    };
  };
}
