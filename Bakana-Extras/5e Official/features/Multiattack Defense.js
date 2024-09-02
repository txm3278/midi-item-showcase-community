// @bakanabaka

async function isAttacked() {
    if (!macroUtil.combat.isSameTurn(persistentData.combat)) {
        persistentData.actorIds = [];
    }

    if (!persistentData.actorIds.includes(workflow.actor.id)) {
        await macroUtil.setFlag(actor, "multiattack defense", 0); 
                // there is currently no "isAllRollsComplete" for when someone is done attacking
                // this is a janky way to make sure the effect is disabled when you are attacked
                // otherwise, when they miss, isAttacked is all that is called, which is too
                // soon to disable it wiithout it carrying to future attacks.

                // preference would be for an isAllRollsComplete to set these flags
    } else {
        await macroUtil.setFlag(actor, "multiattack defense", 1); 
                // note : the way this is coded, the defense will persist until they are attacked
                // by someone new or until the turn changes and the temporary effect drops.
    }
}

async function isDamaged() {
    if (!rolledItem.system.actionType.includes("ak")) return;

    if (!macroUtil.combat.isSameTurn(persistentData.combat)) {
        persistentData.combat = macroUtil.combat.getCombatInfo();
        persistentData.actorIds = [];
    }

    if (persistentData.actorIds.includes(workflow.actor.id)) return;
    persistentData.actorIds.push(workflow.actor.id);

    let madEffect = macroItem.effects.find(ef => ef.name == `${macroItem.name} Active`);
    if (await macroUtil.effect.find(actor, madEffect)) return; // don't reapply if already exists
    await macroUtil.effect.create(actor, madEffect);
}

const persistentDataName = `(Multiattack Defense) - Persistent Data`;
const defaultPersistentData = { combat : {}, actorIds : [] };
let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;

const callArguments = {
    speaker:    speaker,
    actor:      actor,
    token:      token,
    character:  character,
    item:       item,
    args:       args,
    scope:      scope,
};
await macroUtil.runWorkflows(callArguments, {
    isAttacked  : isAttacked,
    isDamaged   : isDamaged,
});

await DAE.setFlag(actor, persistentDataName, persistentData);