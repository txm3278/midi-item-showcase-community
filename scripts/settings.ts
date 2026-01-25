import { moduleName } from "./constants.ts";
import { scripts } from "./macros.ts";

function keysToOptionsObj(prefix: string, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, `${moduleName}.${prefix}.${key}`]));
}

const goodberryBatchIdFormatChoices = keysToOptionsObj("Goodberry.BatchIdFormat.Choices", ["default", "uid", "none"]);

export function registerSettings() {
  game.settings?.register(moduleName, "Elwin Helpers", {
    name: game.i18n?.localize(`${moduleName}.ElwinHelpersName`),
    hint: game.i18n?.localize(`${moduleName}.ElwinHelpersHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (value) {
        scripts.runElwinsHelpers();
        scripts.runElwinsHelpersCoating();
      }
    },
  });
  game.settings?.register(moduleName, "goodberryBatchIdFormat", {
    name: game.i18n?.localize(`${moduleName}.Goodberry.BatchIdFormat.Name`),
    hint: game.i18n?.localize(`${moduleName}.Goodberry.BatchIdFormat.Hint`),
    scope: "world",
    config: true,
    type: String,
    default: "default",
    choices: goodberryBatchIdFormatChoices,
  });
}
