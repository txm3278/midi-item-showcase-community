// @bakanabaka

// If we are attacking with any melee weapon, there is a chance to spread
async function postDamageRollComplete() {
    if (!item.actionType == "mwak" && !item.actionType == "swak") return;

    const targetActor = workflow.targets.first().actor;
    const targetActorEffects = Array.from(targetActor.allApplicableEffects());
    if (targetActorEffects.find(ef => ef.name == macroItem.name)) return;

    const probabilityRoll = await new Roll(`1d100[necrotic]`).evaluate();
    await game.dice3d?.showForRoll(probabilityRoll);
    if (probabilityRoll.total > persistentData.spreadProbability) return;

    const pathogen = macroItem.effects.find(ef => ef.name == macroItem.name);
    await macroUtil.effect.create(targetActor, pathogen);
}

async function postActiveEffects() {
    // Check if the entity is a carrier and is therefore immune to the disease
    if (actor.items.find(it => it.name == macroItem.name)) return;

    // Based on saving throw, either increase or decrease
    async function iterateSeverity() {
        if (macroUtil.debugLevel) console.log("Current severity", persistentData.severity);
        const severityDice = (workflow.saves.size > 0) ? `2d6[radiant]` : `2d10[poison]`;
        const severityRoll = await new Roll(severityDice).evaluate();
        await game.dice3d?.showForRoll(severityRoll);

        const severityChange = ((workflow.saves.size) ? -1 : 1) * severityRoll.total;
        persistentData.severity = Math.max(persistentData.severity + severityChange, 0);
        if (macroUtil.debugLevel) console.log("Updating severity to", persistentData.severity);
    }

    // Returns appropriately leveled effect and updates persistentData
    async function updateEffect(severity) {
        const stages = macroItem.effects.filter(ef => ef.name.includes("Stage "));

        let maxSeverity = -1;
        let changeList = [];
        let icon = macroItem.img;
        for (let stage of stages) {
            const pathogenMinSeverity = stage.changes.find(ch => ch.key == "pathogen.severityMin")?.value;
            if (severity < Number(pathogenMinSeverity)) continue;
            const changes = stage.changes.filter(ch => !ch.key.includes("pathogen."));
            changeList = [...changeList, ...changes];

            if (pathogenMinSeverity > maxSeverity) {
                maxSeverity = pathogenMinSeverity;
                icon = stage.icon;

                let recoveryDc = stage.changes.find(ch => ch.key == "pathogen.recoveryDc")?.value;
                if (recoveryDc != undefined) persistentData.recoveryDc = Number(recoveryDc);

                let spreadProbability = stage.changes.find(ch => ch.key == "pathogen.spreadProbability")?.value;
                if (spreadProbability != undefined) persistentData.spreadProbability = Number(spreadProbability);
            }
        }

        const macroItemChanges = duplicate(macroItem.effects.find(ef => ef.name == macroItem.name)).changes;
        const updatedChanges = [...macroItemChanges, ...changeList];

        const allActorEffects = Array.from(actor.allApplicableEffects());
        let activepathogen = allActorEffects.find(ef => ef.name == macroItem.name);
        await activepathogen.update({"icon": icon, "changes": updatedChanges});
    }

    if (item.name != macroItem.name) return;
    await iterateSeverity();

    if (!persistentData.severity) {
        const allActorEffects = Array.from(actor.allApplicableEffects());
        let activepathogen = allActorEffects.find(ef => ef.name == macroItem.name);
        await activepathogen.delete();
        return;
    }

    await updateEffect(persistentData.severity);
}

async function effectOn() {
    if (actor.items.find(it => it.name == macroItem.name)) {    // immune carrier
        let baseEffect = macroItem.effects.find(ef => ef.name == macroItem.name);
        let percentage = baseEffect.changes.find(ch => ch.key == "pathogen.spreadPercentage")?.value;
        persistentData.spreadProbability = (percentage) ? Number(percentage) : 25;
    } else {    // non-carrier
        await macroUtil.item.syntheticItemDataRoll(macroItem, actor, [token]);
        persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;
    }
}
async function effectOff() {
    persistentData.unset = true;
}

const persistentDataName = `(${macroItem.name}) Persistent Data`;
const defaultPersistentData = { severity : 1, spreadProbability : 100, recoveryDc : 15 };
let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;

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
    on : effectOn,
    off : effectOff,
    postDamageRollComplete : postDamageRollComplete,
    postActiveEffects : postActiveEffects,
});

if (persistentData.unset) await DAE.unsetFlag(actor, persistentDataName);
else await DAE.setFlag(actor, persistentDataName, persistentData);