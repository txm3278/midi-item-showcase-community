// ##################################################################################################
// Author: Elwin#1410
// Gives Dwarven like traits to the owner and evaluates each day art dawn if the wearer grows a beard.
// v1.0.0
// Dependencies:
//  - DAE [on],[init]
//  - MidiQOL "on use" item macro, [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
// The feature is a passive one that is active when attuned and equipped. There is also a check done once per day
// that is triggered at dawn to verify if the owner grows a beard or becomes thicker.
//
// Description:
// In the postActiveEffects (item OnUse) phase of the Beard Check activity (in owner's workflow):
//   If the check if 51+, increase the level of beard growth (kept on an actor flag) and adds 
//   a note to the chat message.
// In the "init" or "on" DAE macro call:
//   If not already registered, register a hook on updateWorldTime to handle when dawn occurs.
// In the updateWorldTime hook:
//   Compute how many dawn were passed since the hook was last called and calls the Check Beard activity
//   for each dawn passed up to 4. If greater than 4, the results are rolled all at once.
//   Sets the level of beard growth (kept on an actor flag) accordingly and the results are
//   displayed in a chat message.
// updateWorldTime hook:
//   
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = "Belt of Dwarvenkind";
const MODULE_ID = "midi-item-showcase-community";
const MAX_BEARD_CHECK = 4;
const BEARD_GROWTH_MSG= "You grow a full beard or it has grown thicker.";
const CalendarData5e = dnd5e.dataModels.calendar.CalendarData5e;

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (foundry.utils.isNewerVersion("3.5.17", globalThis?.elwinHelpers?.version ?? "1.1")) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize("midi-item-showcase-community.ElwinHelpersRequired")}`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ["dae", "midi-qol"];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function beltOfDwarvenkind({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (!checkDependencies()) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments,
    );
  }

  if (args[0].tag === "OnUse" && args[0].macroPass === "postActiveEffects") {
    await handleOnUsePostActiveEffects(actor, scope.macroItem, workflow, debug);
  } else if (args[0] === "init" || args[0] === "on") {
    // Refresh hook in case the implentation has changed.
    const previousHookId = foundry.utils.getProperty(globalThis, "beltOfDwarvenkindHookId");
    if (previousHookId) {
      Hooks.off("updateWorldTime", previousHookId);
      foundry.utils.deleteProperty(globalThis, "beltOfDwarvenkindHookId");
    }
    const hookId = Hooks.on("updateWorldTime", (worldTime, deltaTime, options, userId) => {
      onUpdateWorldTime(item, debug, worldTime, deltaTime, options, userId);
    });
    foundry.utils.setProperty(globalThis, "beltOfDwarvenkindHookId", hookId);
  }
}

/**
 * Handles the post active effect
 * @param {Actor} actor - The owner of the Belt of Dwarvenkind item.
 * @param {Item} sourceItem - The Belt of Dwarvenkind item.
 * @param {MidiQOL.Workflow} workflow - The current midi-qol workflow.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @returns {Promise<void>}
 */
async function handleOnUsePostActiveEffects(actor, sourceItem, workflow, debug) {
  const beardCheckResult = workflow.utilityRoll?.total ?? 0;

  if (beardCheckResult <= 50) {
    return;
  }
  // check path to alternate image for character portrait and update if present
  if (debug) {
    console.warn("beltOfDwarvenkind.handleOnUsePostActiveEffects | beardCheckResult:", { beardCheckResult });
  }
  const beardGrowth = actor.getFlag(MODULE_ID, "beltOfDwarvenkindBeardGrowth") ?? 0;
  await actor.setFlag(MODULE_ID, "beltOfDwarvenkindBeardGrowth", beardGrowth + 1);
  //await updateImages(actor, actor.getActiveTokens(true), sourceItem, beardGrowth + 1);
  const message = BEARD_GROWTH_MSG;
  elwinHelpers.insertTextIntoMidiItemCard("beforeButtons", workflow, message);
}

/**
 * Handles the passage of time. For each dawn passed, up to 4, executes the source item beard-check actity.
 * When more than 4 dawn have passed, a combined roll is executed and a message is displayed if the rolls
 * result in a beard growing or becoming thicker.
 *
 * @param {Item} sourceItem - The Belt of Dwarvenkind item.
 * @param {boolean} debug - Flag to indicate debug mode.
 * @param {number} worldTime - World time in seconds.
 * @param {number} deltaTime - Seconds that have passed since previous call.
 * @param {object} options - Configuration options passed from the requesting client
 *                           that initiated the time change workflow.
 * @param {string} userId - The id of the user who advanced or altered the time.
 * @returns {Promise<void>}
 */
async function onUpdateWorldTime(sourceItem, debug, worldTime, deltaTime, options, userId) {
  if (debug) {
    console.warn("beltOfDwarvenkind.onUpdateWorldTime:", { worldTime, deltaTime, options, userId });
  }
  if (!sourceItem.system.attuned) {
    // When not attuned, no check for beard growth, so just return.
    return;
  }
  // Note: an old version of Calendaria did not set day, so we need to recompture dnd5e deltas if not present in options.dnd5e.deltas
  const deltas = foundry.utils.getProperty(options, "dnd5e.deltas") ?? {};
  if (!deltas?.midnights || Number.isNaN(deltas.midnights)) {
    const previousTime = game.time.calendar.timeToComponents(game.time.worldTime - deltaTime);
    if (!previousTime.day) {
      previousTime.day = getTotalDays(previousTime.year, previousTime.month, previousTime.dayOfMonth);
    }
    const previousHour = CalendarData5e.hoursOfDay(previousTime);
    const nowTime = game.time.components;
    if (!nowTime.day) {
      nowTime.day = getTotalDays(nowTime.year, nowTime.month, nowTime.dayOfMonth);
    }
    const nowHour = CalendarData5e.hoursOfDay(nowTime);
    const passedHour = (hour) => {
      if (previousHour < hour && nowHour > hour) return 1;
      if (previousHour > hour && nowHour < hour) return -1;
      return 0;
    };

    const days =
      typeof CalendarData5e.dayDifference === "function"
        ? CalendarData5e.dayDifference(previousTime, nowTime)
        : dayDifference(previousTime, nowTime);
    deltas.midnights = days;
    deltas.middays = days + passedHour(game.time.calendar.days.hoursPerDay / 2);
    deltas.sunrises = "sunrise" in game.time.calendar ? days + passedHour(game.time.calendar.sunrise(nowTime)) : null;
    deltas.sunsets = "sunset" in game.time.calendar ? days + passedHour(game.time.calendar.sunset(nowTime)) : null;
    foundry.utils.setProperty(options, "dnd5e.deltas", deltas);
  }
  console.warn("beltOfDwarvenkind.deltas:", { deltas });
  if (deltas.sunrises < 1) {
    return;
  }

  const activity = sourceItem.system.activities?.find((a) => a.identifier === "beard-check");
  if (!activity) {
    return;
  }

  // Note: Roll the beard check activity, a max of MAX_BEARD_CHECK times to prevent too many rolls,
  // when more than MAX_BEARD_CHECK sunrises have passed, roll once for all sunrises and count successes.
  if (deltas.sunrises <= MAX_BEARD_CHECK) {
    let nbSunrises = deltas.sunrises;
    const config = {
      midiOptions: {
        configureDialog: false,
        workflowOptions: { autoRollDamage: "always", fastForwardDamage: true },
      },
    };

    while (nbSunrises > 0) {
      await MidiQOL.completeActivityUse(activity, config, {});
      nbSunrises--;
    }
  } else {
    const actor = sourceItem.actor;
    const beardGrowth = actor.getFlag(MODULE_ID, "beltOfDwarvenkindBeardGrowth") ?? 0;
    const beardGrowthIncrease = (await new Roll(`${deltas.sunrises}d100cs>50`).evaluate()).total;
    await actor.setFlag(MODULE_ID, "beltOfDwarvenkindBeardGrowth", beardGrowth + beardGrowthIncrease);
    const tokens = actor.getActiveTokens(true);
    await updateImages(actor, tokens, sourceItem, beardGrowth + beardGrowthIncrease);
    const message = BEARD_GROWTH_MSG;
    await ChatMessage.implementation.create({
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: message,
      speaker: ChatMessage.getSpeaker({ actor, token: tokens[0] }),
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id),
    });
  }
}

/**
 * Updates an actor's images for the specified bread growth increment level.
 * @param {Actor} actor - The owner of the Belt of Dwarvenkind item.
 * @param {Token[]} tokens - The tokens associated to the owner of the Belt of Dwarvenkind item.
 * @param {Item} sourceItem - The Belf of Dwarvenkind item.
 * @param {number} beardGrowth - The current number of beard growth increment.
 */
async function updateImages(actor, tokens, sourceItem, beardGrowth) {
  // TODO revise this to use CAT config for beard image config... 
  /*
  const portraitImagePath = await getImageForBeardGrowth(actor, beardGrowth, "beltOfDwarvenkindBasePortraitSrc");
  if (portraitImagePath) {
    await actor.update({ img: portraitImagePath });
  }
  const tokenImagePath = await getImageForBeardGrowth(actor, beardGrowth, "beltOfDwarvenkindBaseTokenSrc");
  if (tokenImagePath) {
    for (const token of tokens) {
      if (token?.document) {
        await token.document.update({ "texture.src": tokenImagePath });
      }
    }
    if (!actor.isToken) {
      await actor.prototypeToken.update({ "texture.img": tokenImagePath });
    }
  }
  */
}

/**
 * Returns the image for the beard growth level.
 * @param {Actor} actor - The actor which is beard has grown. 
 * @param {number} beardGrowth - The level of beard growth.
 * @param {string} imageFlag - The flag value which contains the beard image pattern. 
 * @returns Promise<{string}> The path of the image for the specified beardGrowth.
 */
async function getImageForBeardGrowth(actor, beardGrowth, imageFlag) {
  const baseImageSrc = actor.getFlag(MODULE_ID, imageFlag);
  if (baseImageSrc) {
    // Update the actor image to the next beard growth level if the image exists, max 5 levels of beard growth.
    let growthLevel = Math.min(beardGrowth, 5);
    let imagePath = baseImageSrc.replace(/\$\{level\}/, `${growthLevel}`);
    while (!(await foundry.utils.srcExists(imagePath)) && growthLevel > 1) {
      growthLevel--;
      imagePath = baseImageSrc.replace(/\$\{level\}/, `${growthLevel}`);
    }
    if (growthLevel > 0) {
      return imagePath;
    }
  }
  return null;
}

/**
 * Returns the current total days since the start of the specified year, month and dayOfMonth.
 * @param {number} year - Year
 * @param {number} month - Month
 * @param {number} dayOfMonth - Day in the specified month.
 * @returns {number} Total days passed since start of the year.
 */
function getTotalDays(year, month, dayOfMonth) {
  let totalDays = 0;
  for (let m = 0; m < month; m++) totalDays += game.time.calendar.getDaysInMonth(m, year);
  totalDays += dayOfMonth;
  return totalDays;
}

/**
 * Note: Copied from dnd5e 5.2.x because its private, remove when only supporting dnd5e 5.3.x or later.
 * Count the total number of full days that have passed between two times.
 * @param {Components} previousTime
 * @param {Components} currentTime
 * @returns {number}
 */
function dayDifference(previousTime, currentTime) {
  // If years are the same, simple subtraction should work
  if (previousTime.year === currentTime.year) return currentTime.day - previousTime.day;

  // Calculate the number of days just in current & previous years
  const daysForYear = (year) =>
    game.time.calendar.isLeapYear(previousTime.year)
      ? game.time.calendar.days.daysPerLeapYear
      : game.time.calendar.days.daysPerYear;
  let days = 0;
  if (previousTime.year < currentTime.year) {
    days += currentTime.day + (daysForYear(previousTime.year) - previousTime.day);
  } else {
    days -= daysForYear(currentTime.year) - currentTime.day + previousTime.day;
  }

  // If more than one year has passed, count the number of days for each year
  const largerYear = Math.max(currentTime.year, previousTime.year);
  const smallerYear = Math.min(currentTime.year, previousTime.year);
  for (let year = smallerYear + 1; year < largerYear; year++) {
    if (previousTime.year < currentTime.year) days += daysForYear(year);
    else days -= daysForYear(year);
  }

  return days;
}
