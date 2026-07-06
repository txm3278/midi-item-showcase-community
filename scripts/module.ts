import { moduleName } from "./constants.ts";
import { registerSettings } from "./settings.ts";
import { automationConfig, setConfig } from "./config.ts";
import { macros, scripts } from "./macros.ts";
import type { ItemAutomation } from "./_types.ts";

// @ts-expect-error Foundry's Hooks.once is provided at runtime by the game environment.
Hooks.once("init", function () {
  registerSettings();
  setConfig();
});

Hooks.once("ready", function () {
  if (game.settings?.get(moduleName, "Elwin Helpers")) {
    scripts.runElwinsHelpers();
    scripts.runElwinsHelpersCoating();
  }
});

// @ts-expect-error Foundry's Hooks.once is provided at runtime by the CAT module.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
Hooks.once("catReady", async () => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!game.modules?.get("cat")?.active) {
    return;
  }
  const packs = [
    "misc-actions",
    "misc-class-features",
    "misc-class-features-2024",
    "misc-feats",
    "misc-feats-2024",
    "misc-items",
    "misc-items-2024",
    "misc-monster-features",
    "misc-monster-features-2024",
    "misc-race-features",
    "misc-spells",
    "misc-spells-2024",
    "misc-third-party",
  ];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  cat.api.registerSourceName(moduleName, game.modules?.get(moduleName)?.title ?? "Midi Item Showcase Community");
  await Promise.all(
    packs.map(async (id: string) => {
      const pack = game.packs?.get(moduleName + "." + id);
      if (!pack) return;
      const index = await pack.getIndex({ fields: ["system.identifier", "system.source.rules", "type"] });
       index.contents.forEach((entry) => {
        const { uuid, name } = entry;
        const type = foundry.utils.getProperty(entry, "type") as string;
        const identifier = foundry.utils.getProperty(entry, "system.identifier") as string | undefined;
        const rules = foundry.utils.getProperty(entry, "system.source.rules") as string | undefined;
        const monsterAuto = id.startsWith("misc-monster");
        if (!rules || !name || !type || !uuid || !identifier) {
          return;
        }
        const config = getConfig(name, rules, monsterAuto);
        if (!config?.version || config.factory) {
          return;
        }
        interface CatAutomation {
          source: string;
          rules: string;
          identifier: string;
          version: string;
          uuid: string;
          type: string;
          monsterIdentifier?: string;
        };
        const automation: CatAutomation = {
          source: moduleName,
          rules,
          identifier,
          version: config.version,
          uuid,
          type,
        };
        if (monsterAuto && config.monsterIdentifier) {
          automation.monsterIdentifier = config.monsterIdentifier;
        }
        if (automation.identifier !== identifier) {
          console.warn(
            `MISC | identifier is not equal to its index entry version ${name}, rules ${rules}, ${automation.identifier} != ${identifier} from config.`,
          );
        }

        cat.api.registerAutomation(automation);
      });
    }),
  );
});

/**
 * Returns the automation config entry.
 * @param {string} name - Name of the item.
 * @param {string|undefined} rules - Rules of the item.
 * @param {boolean} monsterAuto - Flag to indicate if item is for a monster automation.
 * @returns {ItemAutomation|undefined} automation config
 */
function getConfig(name: string, rules: string | undefined, monsterAuto: boolean): ItemAutomation | undefined {
  if (!name || !rules) {
    return undefined;
  }
  if (!monsterAuto) {
    const automationsByRules = automationConfig.automations[rules === "2014" ? "legacy" : "modern"];
    const automation = automationsByRules[name] as ItemAutomation | undefined;
    if (!automation) {
      console.warn(`MISC | Could not find automation for name ${name}, rules ${rules} from config.`);
      return undefined;
    }
    return automation;
  } else {
    const automationsByRules = automationConfig.monsterAutomations[rules === "2014" ? "legacy" : "modern"];
    for (const monsterName of Object.keys(automationsByRules)) {
      const monsterAutomation = automationsByRules[monsterName];
      if (!monsterAutomation) continue;
      const automation = monsterAutomation[name] as ItemAutomation | undefined;
      if (automation) {
        const slugifiedId: string = dnd5e.utils.formatIdentifier(monsterName);
        if (slugifiedId && automation.monsterIdentifier !== slugifiedId) {
          console.warn(
            `MISC | monsterIdentifier is not equal to its slugified version ${name}, rules ${rules}, ${automation.monsterIdentifier ?? "undefined"} != ${slugifiedId} from config.`,
          );
        }
        return automation;
      }
    }
    console.warn(`MISC | Could not find monster automation for name ${name}, rules ${rules} from config.`);
  }
}

foundry.utils.setProperty(globalThis, "MISC.macros", macros);