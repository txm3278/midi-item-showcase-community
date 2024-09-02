// @bakanabaka
const FORCE_ALL_EXPLOSIONS = false;         // If a user doesn't select an option or cancels out, skip rest of explosion
const ALLOW_TEMPHP_EXPLOSIONS = false;      // If a the triggering damage is Healing (Temporary) whether to explode

// Parse danageRoll entries into maximalMap to count number of perfect rolls
function parseDamageRoll(damageRoll, maximalMap) {
    let damageType = damageRoll.options.type;
    if (maximalMap[damageType] == undefined) maximalMap[damageType] = {};

    for (let term of damageRoll.terms) {
        if (!term.faces) continue;
        for (let result of term.results) {
            if (maximalMap[damageType][term.faces] == undefined) 
                maximalMap[damageType][term.faces] = 0;

            if (term.faces == result.result) maximalMap[damageType][term.faces]++;
        }
    }
}

function parseRolls(damageType) {
    let options = [];
    // I got lazy with making this fully generic... these are the supported die types
    // This makes it easier to order them, could grab all die types from the map and order them
    // and remove duplicates, would be O(nlogn) or more likely O(n^2) ... or just O(1) this way
    const dieTypes = [2, 4, 6, 8, 10, 12, 20, 100];
    for (let dieType of dieTypes)
        if (damageType[dieType]) options.push([dieType, damageType[dieType]])

    return options;
}

async function rollExplosionDice(damageType, faces, count) {
    const damageAmount =`${count}d${faces}[${damageType}]`;
    const damageRoll = await new Roll(damageAmount).evaluate();
    await game.dice3d?.showForRoll(damageRoll);
    workflow.damageRolls.push(damageRoll);

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
      `<p>Choose up to ${remainingLimit} die to reroll.</p>` +
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
                        if (!radioVal) {
                            resolve({ cancelled: true, selection: undefined});
                            return;
                        }
                        let [numFaces, damageType] = radioVal;
                        let userInput = document.getElementById(damageType).value;  // only the user input has this id
                        resolve({ cancelled: false, selection: [damageType, numFaces, Math.min(userInput, remainingLimit)] });
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

async function promptUser(optionMap, limit) {
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
    if (!(response?.selection)) return [lastDamage, undefined, undefined];
    return response.selection;
}

async function explode(optionMap, limit) {
    let explosionCount = 0;
    while (explosionCount < limit) {
        [damageType, faces, count] = await promptUser(optionMap, limit - explosionCount);
        if (!damageType) break;
        if (!faces || !count) {
            if (FORCE_ALL_EXPLOSIONS) continue;
            else break;
        }
        let typeRolled = optionMap[damageType];
        
        let newMap = await rollExplosionDice(damageType, faces, count);

        explosionCount += count;    // increment explosion count
        typeRolled[typeRolled.length-1][1] += newMap[undefined][faces] - count; // adjust # of die available to explode
        if (!typeRolled[typeRolled.length-1][1]) typeRolled.pop(); // remove empty entry
    }
    await workflow.setDamageRolls(workflow.damageRolls);
}

async function postDamageRoll() {
    if (rolledItem.type != "spell" && rolledItem.type != "weapon") return;

    let maximalMap = {};
    for (let damageRoll of workflow.damageRolls)
        parseDamageRoll(damageRoll, maximalMap);

    let damageMap = {};
    let healingMap = {};
    for (let damageType in maximalMap) {
        if (damageType == "heal" || (damageType == "temphp" && ALLOW_TEMPHP_EXPLOSIONS)) {
            let parsedRolls = parseRolls(maximalMap[damageType]);
            if (parsedRolls.length) {
                healingMap[damageType] = parsedRolls;
            }
        } else if (damageType != "temphp") {
            let parsedRolls = parseRolls(maximalMap[damageType]);
            if (parsedRolls.length) {
                damageMap[damageType] = parsedRolls;
            }
        }
    }
    
    let explosionLimit = actor.flags.world.explosionLimit;
    
    let limit = (rolledItem.type == "spell") ? explosionLimit.spell : explosionLimit.weapon;
    await explode(damageMap, limit);
    await explode(healingMap, explosionLimit.healing);
}

const callArguments = {  
    speaker:    speaker,
    actor:      actor,
    token:      token,
    character:  character,
    item:       item,
    args:       args,
    scope:      scope,
    workflow:   workflow,
    options:    options
  };
await macroUtil.runWorkflows(callArguments, {
    postDamageRoll  : postDamageRoll,
});