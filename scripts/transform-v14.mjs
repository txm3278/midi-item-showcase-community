import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

/**
 * Configuration: files to be transformed
 */
const FILES_WITH_DURATION_TO_CONVERT = ["packData/**/*.json"];

function transformItem(item) {
  let changed = false;

  if (!Array.isArray(item.effects)) return null;

  for (const effect of item.effects) {
    // ---------- Duration ----------
    if (effect.duration) {
      const normalized = normalizeDuration(effect.duration, effect.flags.dae?.specialDuration ?? []);

      if (
        JSON.stringify(effect.duration) !== JSON.stringify(normalized.duration) ||
        JSON.stringify(effect.flags.dae?.specialDuration ?? []) !== JSON.stringify(normalized.specialDuration)
      ) {
        effect.duration = normalized.duration;
        effect.flags.dae ??= {};
        effect.flags.dae.specialDuration = normalized.specialDuration;
        changed = true;
      }
      if (effect.flags.dae?.showIcon === true) {
        insertPropAfterInPlace(effect, "changes", "showIcon", 2);
      }
      delete effect.flags.dae.showIcon;
      changed = true;
    }
  }

  return changed ? item : null;
}

// helper: insert property after a given key while keeping object identity
function insertPropAfterInPlace(obj, afterKey, propKey, propValue) {
  const entries = Object.entries(obj);
  const newEntries = [];
  let inserted = false;
  for (const [k, v] of entries) {
    newEntries.push([k, v]);
    if (k === afterKey && !inserted) {
      newEntries.push([propKey, propValue]);
      inserted = true;
    }
  }
  if (!inserted) newEntries.push([propKey, propValue]);
  for (const k of Object.keys(obj)) delete obj[k];
  for (const [k, v] of newEntries) obj[k] = v;
}

const DEPRECATED_SPECIAL_DURATIONS = new Set(["turnStart", "turnEnd", "turnStartSource", "turnEndSource", "combatEnd"]);

function normalizeDuration(duration = {}, specialDuration = []) {
  // replace {"turns": 1} by {"value": null, "units": "seconds", "expiry": "turnEnd"}
  if (
    duration.rounds === null &&
    duration.turns === 1 &&
    !specialDuration.some((d) => DEPRECATED_SPECIAL_DURATIONS.has(d))
  ) {
    return { duration: { value: null, unit: "seconds", expiry: "turnEnd" }, specialDuration };
  }
  // replace DAE turnEndSource {"rounds": 1, "turns": 1} by {"value": 1, "units": "rounds", "expiry": "sourceEnd"}
  if (duration.rounds === 1 && duration.turns === 1 && specialDuration[0] === "turnEndSource") {
    return { duration: { value: 1, unit: "rounds", expiry: "sourceEnd" }, specialDuration: specialDuration.slice(1) };
  }
  // replace DAE turnStartSource {"rounds": 1 or null} by {"value": 1, "units": "rounds", "expiry": "sourceStart"}
  if (
    (duration.rounds === 1 || duration.rounds === null) &&
    duration.turns === null &&
    specialDuration[0] === "turnStartSource"
  ) {
    return { duration: { value: 1, unit: "rounds", expiry: "sourceStart" }, specialDuration: specialDuration.slice(1) };
  }
  // replace DAE turnEnd {"rounds": 1, "turns": 1} by {"value": 1, "units": "rounds", "expiry": "targetEnd"}
  if (duration.rounds === 1 && duration.turns === 1 && specialDuration[0] === "turnEnd") {
    return { duration: { value: 1, unit: "rounds", expiry: "targetEnd" }, specialDuration: specialDuration.slice(1) };
  }
  // replace {"turns": null, "rounds": null, "seconds": 60} by {"value": 1, "units": "minutes", "expiry": "turnStart"}
  if (
    duration.rounds === null &&
    duration.turns === null &&
    duration.seconds === 60 &&
    !specialDuration.some((d) => DEPRECATED_SPECIAL_DURATIONS.has(d))
  ) {
    return { duration: { value: 1, unit: "minutes", expiry: "turnStart" }, specialDuration };
  }
  // replace {"turns": null, "rounds": null, "seconds": 3600} by {"value": 1, "units": "hours", "expiry": "turnStart"}
  if (
    duration.rounds === null &&
    duration.turns === null &&
    duration.seconds === 3600 &&
    !specialDuration.some((d) => DEPRECATED_SPECIAL_DURATIONS.has(d))
  ) {
    return { duration: { value: 1, unit: "hours", expiry: "turnStart" }, specialDuration };
  }
  // replace {"turns": null, "rounds": null, "seconds": null} by {"value": null, "units": "seconds", "expiry": null}
  if (
    duration.rounds === null &&
    duration.turns === null &&
    duration.seconds === null &&
    !specialDuration.some((d) => DEPRECATED_SPECIAL_DURATIONS.has(d))
  ) {
    return { duration: { value: null, unit: "seconds", expiry: null }, specialDuration };
  }
  return { duration, specialDuration };
}

async function main() {
  const files = (
    await Promise.all(FILES_WITH_DURATION_TO_CONVERT.map((relativeFilePath) => glob(relativeFilePath)))
  ).flat();
  if (!files.length) {
    console.warn("No files found for transformation. Check the configuration.");
    return;
  }

  let updatedCount = 0;

  for (const file of files) {
    const raw = await fs.readFile(file, "utf-8");
    const json = JSON.parse(raw);
    const transformed = transformItem(json);
    if (transformed) {
      await fs.writeFile(file, JSON.stringify(transformed, null, 2), "utf-8");
      updatedCount++;
      console.log(`Updated file: ${file}`);
    }
  }
  console.log(`Transformation complete. Updated ${updatedCount} out of ${files.length} files.`);
}

main().catch((error) => {
  console.error("An error occurred during transformation:", error);
  process.exit(1);
});
