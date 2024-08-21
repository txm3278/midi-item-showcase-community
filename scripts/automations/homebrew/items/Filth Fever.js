// @bakanabaka

const INFECTION_DC = undefined; // Set this to a DC to mark this as a carrier (immune but viral)
const SEVERITY_LIST = [         // Sorted in descending order of stacks required
    { infectionDc : 38, min : 60, dc : 5,  name : "Death" },
    { infectionDc : 35, min : 40, dc : 11, name : "Slowness" },
    { infectionDc : 32, min : 20, dc : 13, name : "Weakness" },
    { infectionDc : 30, min : 0,  dc : 16, name : "Incubation" }
];

// Complicated enough -- require macroUtil functions
if (typeof macroUtil === "undefined") {
    console.error("Requires macroUtil to function. Enable MISC module");
    return;
}

async function rollItemAgainst(rollItem, targetActor) {
    const options = {
        targetUuids: [targetActor.uuid],
        showFullCard: false,
        createWorkflow: true,
        configureDialog: false,
    };

    await MidiQOL.completeItemUse(rollItem, {}, options);
}

async function effectOn() {}
async function effectOff() {
    await rollItemAgainst(macroItem, actor);
}

async function preItemRoll() {
    if (INFECTION_DC) {
        // TODO(bakanabaka) -- remove special duration from carrier
        // remove the special duration removal
        workflow.aborted = true;
    }
}

function getSeverityLevel(level) {
    for (let severity of SEVERITY_LIST) 
        if (severity.min < level) return severity;
    return undefined;
}

async function preSave() {
    const severity = getSeverityLevel(persistentData.illnessSeverity);

    const targetActor = workflow.targets.first().actor;
    let updates = {};
    if (!targetActor.items.find(it => it.name == macroItem.name)) {
        updates = {"system.save.dc" : INFECTION_DC || severity.infectionDc};
    } else {
        updates = {"system.save.dc" : severity.dc};
    }

    workflow.item = workflow.item.clone(updates, {keepId: true});
}

async function applySeverity(illnessLevel) {
    let fever = duplicate(macroItem.effects.find(ef => ef.name == macroItem.name));
    const applyEffects = SEVERITY_LIST.filter(severity => severity.min < illnessLevel).map(sev => sev.name);
    if (macroUtil.debugLevel) console.log(`Active severity levels`, applyEffects);

    for (let applyEffect of applyEffects) {
        if (applyEffect == "Death") actor.update({"system.attributes.hp.value" : 0});
        let additionalChanges = macroItem.effects.find(ef => ef.name.includes(applyEffect));
        if (!additionalChanges) continue;
        fever.changes = fever.changes.concat(additionalChanges.changes);
    }

    if (macroUtil.debugLevel) console.log(`Applying effect`, fever)
    await macroUtil.effect.create(actor, fever);
}

async function postSave() {
    const targetActor = workflow.targets.first().actor;
    const illnessDice = (workflow.saves.size > 0) ? `2d6[healing]` : `2d10[poison]`;
    const illnessRoll = await new Roll(illnessDice).evaluate();
    await game.dice3d?.showForRoll(illnessRoll);

    const illnessDelta = ((workflow.saves.size > 0) ? -1 : 1) * illnessRoll.total;
    persistentData.illnessSeverity = Math.max(persistentData.illnessSeverity + illnessDelta, 0);
    if (macroUtil.debugLevel) console.log(`Updating severity to ${persistentData.illnessSeverity}`);

    if (!persistentData.illnessSeverity) {
        persistentData.unset = true;
        const feverItem = targetActor.items.find(ef => ef.name == macroItem.name);
        await feverItem.delete();
        return;
    }
    await applySeverity(persistentData.illnessSeverity);
}

async function ensureActorItem(targetActor, itemName) {
    // This requires the item to exist in your loaded game items
    const gameItem = game.items.find(item => item.name === itemName);
    if (gameItem == null) {
        ui.notifications.error(`The item "${itemName}" does not exist : complain to your DM to get this added into the item tab`);
        return false;
    }

    // Ensure actor has named spell
    let actorItem = targetActor.items.find(item => item.name === itemName);
    if (actorItem == null) await Item.create(gameItem, { parent: targetActor });  
}

async function postDamageRollComplete() {
    if (item.type != "weapon") return;
    const targetActor = workflow.targets.first().actor;
    if (targetActor.items.find(it => it.name == macroItem.name)) return;

    const severity = getSeverityLevel(persistentData.illnessSeverity);
    const infectionDc = INFECTION_DC || severity.infectionDc;

    let saveRoll = await targetActor.rollAbilitySave('con', { chatMessage: true, fastForward: true });
    await game.dice3d.showForRoll(saveRoll);

    if (saveRoll.total >= infectionDc) return; // exit if save succeeded

    // TODO bakana -- change macroItem DC to spread... apply to target
    await ensureActorItem(targetActor, macroItem.name);
    await rollItemAgainst(macroItem, targetActor);

    // Set initial illness value
    const illnessDice = `2d10[poison]`;
    const illnessRoll = await new Roll(illnessDice).evaluate();
    await game.dice3d?.showForRoll(illnessRoll);
    await DAE.setFlag(targetActor, persistentDataName, { illnessSeverity : 1 + illnessRoll.total})
}

const persistentDataName = `(Filth Fever) - Persistent Data`;
const defaultPersistentData = { illnessSeverity : 1 };
let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;

await macroUtil.runWorkflows(arguments, {
    on : effectOn,
    off : effectOff,
    preItemRoll : preItemRoll,
    postDamageRollComplete : postDamageRollComplete,
    preSave : preSave,
    postSave : postSave,
});

if (persistentData.unset) await DAE.unsetFlag(actor, persistentDataName);
else await DAE.setFlag(actor, persistentDataName, persistentData);