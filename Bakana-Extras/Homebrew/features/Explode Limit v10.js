// @bakanabaka
// Explosion Limit v1.0.3

// The first time this macro is run the user settings are locked in until the user refreshes
// The choices apply to all actors the user is controlling and launching workflows from
const FORCE_ALL_EXPLOSIONS = false;         // If a user doesn't select an option or cancels out, skip rest of explosion
const ALLOW_TEMPHP_EXPLOSIONS = false;      // If a the triggering damage is Healing (Temporary) whether to explode
const DEBUG_LEVEL = 1;                      // macroUtil.debugLevel stand-in

// Parse damageRoll entries into maximalMap to count number of perfect rolls
function parseDamageRoll(damageRoll, maximalMap) {
    //let damageType = damageRoll.options.type;
    //if (maximalMap[damageType] == undefined) maximalMap[damageType] = {};

    for (let term of damageRoll.terms) {
        if (!term.faces) continue;
        let damageType = term.options.flavor;
        if (maximalMap[damageType] == undefined) maximalMap[damageType] = {};
        for (let result of term.results) {
            if (maximalMap[damageType][term.faces] == undefined) 
                maximalMap[damageType][term.faces] = 0;

            if (term.faces == result.result) maximalMap[damageType][term.faces]++;
        }
    }
}

// Sort maximal rolls of a specific damage type into a stack to pop from
function parseRolls(damageTypePerfects) {
    let optionStack = [];
    // I got lazy with making this fully generic... these are the supported die types
    // This makes it easier to order them, could grab all die types from the map and order them
    // and remove duplicates, would be O(nlogn) or more likely O(n^2) ... or just O(1) this way
    const dieTypes = [2, 4, 6, 8, 10, 12, 20, 100];
    for (let dieType of dieTypes)
        if (damageTypePerfects[dieType]) optionStack.push([dieType, damageTypePerfects[dieType]])

    return optionStack;
}

// VERY useful utility function from CPR
async function addToRoll(roll, addonFormula, damageType) {
    let addonFormulaRoll = await new Roll('0 + ' + addonFormula).evaluate({'async': true});
    addonFormulaRoll.terms[2].options.flavor = damageType;
    game.dice3d?.showForRoll(addonFormulaRoll);
    for (let i = 1; i < addonFormulaRoll.terms.length; i++) {
        roll.terms.push(addonFormulaRoll.terms[i]);
    }
    roll._total += addonFormulaRoll.total;
    roll._formula = roll._formula + ' + ' + addonFormula;
    return addonFormulaRoll;
}

async function rollExplosionDice(damageType, faces, count) {
    const damageAmount =`${count}d${faces}`;
    //workflow.damageRolls.push(damageRoll);
    let damageRoll = await addToRoll(workflow.damageRoll, damageAmount, damageType);

    let rollMap = {};
    parseDamageRoll(damageRoll, rollMap);
    return rollMap;
}

function getHTMLHeader() {
    let HTMLHeader = `<tr><td></td>` + `<th>Damage Type</th>` + `<th>Damage Die</th>` + `<th>Count</th></tr>`;
    return HTMLHeader;
}

function getHTMLSelection(damageType, numFaces, count) {
    let option = "";
    option += `<tr>`;
    option += `<td><input type="radio" id="button" name="selection" value="${numFaces} ${damageType}"></td>`;
    option += `<td style="text-align: center;">${damageType} damage</td>`;
    option += `<td style="text-align: center;">${count}d${numFaces}</td>`;
    option += `<td><input type="text" id="${damageType}" placeholder="0" maxlength="3"></td>`;
    option += `</tr>`;
    return option;
}

async function queryUser(HTMLHeader, HTMLOptions, remainingLimit) {
    const title = `${macroItem.name}`;
    const content =
      `<p>Choose up to ${remainingLimit} die to explode.</p>` +
      `<form class="flexcol"><tbody><table width="100%">` +
      HTMLHeader + HTMLOptions +
      `</table></tbody></form>`;

    let resolution = await new Promise((resolve) => {
        new Dialog({
            title: title,
            content: content,
            buttons: {
                select: {
                    label: 'Select',
                    callback: async (html) => {
                        let radio = html.find('input[name="selection"]:checked');
                        let radioVal = radio.val()?.split(' ');
                        if (radioVal) {
                            let [numFaces, damageType] = radioVal;
                            let userInput = document.getElementById(damageType).value;  // only the user input has this id
                            resolve({ cancelled: false, selection: [damageType, numFaces, Math.min(userInput, remainingLimit)] });
                        } else {
                            resolve({ cancelled: true, selection: undefined});
                        }
                    },
                },
                cancel: {
                    label: 'Cancel',
                    callback: () => {
                        resolve({ cancelled: true, selection: undefined });
                    },
                },
            },
            default: 'Cancel',
            callback: () => {
                resolve({ cancelled: true, selection: undefined });
            },
        }).render(true);
    });

    return resolution;
}

async function getExplosionChoice(optionMap, limit) {
    // Create HTML Header
    let HTMLHeader = getHTMLHeader();
    let HTMLOptions = "";
        
    let optionCount = 0;
    [lastDamage, lastFaces, lastCount] = [undefined, 0, 0];
    for (let damageType in optionMap) {
        let option = optionMap[damageType];
        option = option[option.length - 1];
        if (!option) continue;
        
        // Store last seen so if there is one option we can just roll them
        lastDamage = damageType;
        lastFaces = option[0];
        lastCount = option[1];
    
        // Compile into a row of HTML to display
        HTMLOptions += getHTMLSelection(damageType, lastFaces, lastCount);
        ++optionCount;
    }
    
    if (optionCount == 0) return [undefined, undefined, undefined];
    if (optionCount == 1 && FORCE_ALL_EXPLOSIONS) return [lastDamage, lastFaces, Math.min(lastCount, limit)];

    let response = await queryUser(HTMLHeader, HTMLOptions, limit);
    if (response?.cancelled) return [lastDamage, undefined, undefined];
    return response.selection;
}

async function explode(optionMap, limit) {
    let explosionCount = 0;
    while (explosionCount < limit) {
        [damageType, faces, count] = await getExplosionChoice(optionMap, limit - explosionCount);
        if (!damageType) break; // no valid roll options
        if (!faces || !count) {
            if (FORCE_ALL_EXPLOSIONS) continue; 
            else break;
        }
        
        let typeRolled = optionMap[damageType];
        
        let newMap = await rollExplosionDice(damageType, faces, count);

        explosionCount += count;    // increment explosion count
        typeRolled[typeRolled.length-1][1] += newMap[damageType][faces] - count; // adjust # of die available to explode
        if (!typeRolled[typeRolled.length-1][1]) typeRolled.pop(); // remove empty entry
    }
    await workflow.setDamageRoll(workflow.damageRoll);
}

async function preDamageRollComplete() {
    if (workflow.item.type != "spell" && workflow.item.type != "weapon") return;

    let maximalMap = {};
    //for (let damageRoll of workflow.damageRolls)
        parseDamageRoll(workflow.damageRoll, maximalMap);

    let damageMap = {};
    let healingMap = {};
    for (let damageType in maximalMap) {
        if (damageType == "Healing" || (damageType.includes("Healing") && ALLOW_TEMPHP_EXPLOSIONS)) {
            let parsedRolls = parseRolls(maximalMap[damageType]);
            if (parsedRolls.length) {
                healingMap[damageType] = parsedRolls;
            }
        } else if (!damageType.includes("Healing")) {
            let parsedRolls = parseRolls(maximalMap[damageType]);
            if (parsedRolls.length) {
                damageMap[damageType] = parsedRolls;
            }
        }
    }
    
    let explosionLimit = workflow.actor.flags.world?.explosionLimit;
    if (!explosionLimit) return;
    
    let limit = ((workflow.item.type == "spell") ? explosionLimit.spell : explosionLimit.weapon) ?? 0;
    await explode(damageMap, limit);                            // Explode damage dice
    await explode(healingMap, explosionLimit.healing ?? 0);     // Explode healing dice
}

// ---------------------------------------------------------------------------------------------------
//                            Template Developed and Written by @bakanabaka
//
//  Generalized Midi-QOL workflow function injection utilizing a DAE effect to enable calls
//  Add a DAE effects to the actor to have them call into this macro during workflow execution.
//
//                          Don't be a baka, but do things that are bakana!
//                      No credit required for this. Just be cool to other people.
// ---------------------------------------------------------------------------------------------------

// Add in fake macroItem and workflow.item to make more compatible with v11+
const macroItem = {name: "Explosion Limit"};
let workflow;
async function runWorkflows(argumentInput, config) {
    // const [speaker, actor, token, character, scope, workflow, item, workflow.item, macroItem, args, options, midiData] = argumentInput; (v11+)
    // const [speaker, actor, token, character, scope, workflow, item, args, options] = argumentInput;
    workflow = argumentInput[0];
    const workflowAction = "preDamageRollComplete"

    let workflowReturn; 
    try {
        if (DEBUG_LEVEL) {
            console.group(
                `%c↳ (${macroItem.name}) [${workflowAction}]`,
                'background:black; color: white; padding:2px 5px;font-weight:bold;'
            );
        }

        if (DEBUG_LEVEL > 2) console.warn("midiWorkflow:", workflow);
        if (!config[workflowAction]) 
        console.warn(`Undefined workflow attempting to run : ${workflowAction}`);
        else workflowReturn = await config[workflowAction]();

        if (DEBUG_LEVEL > 1) {
            if (workflow.aborted) console.warn("Aborted flag on workflow is set to :", workflow.aborted);
        }

        if(DEBUG_LEVEL) console.groupEnd();
        return workflowReturn;
    } catch (e) {
        ui.notifications.error(`An unexpected error occurred in the execution of the ${macroItem.name} ItemMacro. Please press <F12> and inspect the console errors for more information.`);
        console.group(`%c❗❗ (${macroItem.name}) [Error in ${workflowAction}] ❗❗`, 'background:black; color: white; padding:2px 5px;font-weight:bold;');
        console.error("Unexpected error occurred :", e);
        if (config.exceptionHandler) await config.exceptionHandler(e);
        console.groupEnd();
        if(DEBUG_LEVEL) console.groupEnd(); 
    }
}

// v10 is so old... most of these workflows seem inaccesible without hooks
// can't seem to get into the preDamageRollComplete stage in other ways
async function preDamageRollCompleteHook(workflowArray) {
    await runWorkflows(arguments, {
        preDamageRollComplete  : preDamageRollComplete,
    });
}

// Only add this hook once per user per login
if (globalThis.explosionLimitApplied) return;
globalThis.explosionLimitApplied = true;
Hooks.on("midi-qol.preDamageRollComplete", preDamageRollCompleteHook);