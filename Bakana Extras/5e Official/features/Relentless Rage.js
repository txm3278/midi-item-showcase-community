// @bakanabaka

async function preItemRoll() {
    let configs = {consumeUsage : false};
    let options = {};
    macroUtil.item.preItemRoll.config(configs, options);
    // Jank -- use the uses to track the number of times it has occurred
    //    we do this because it automatically will reset on short rest this way
    const updates = {"system.save.dc" : 5 * macroItem.system.uses.value};
    workflow.item = macroUtil.item.syntheticItem(workflow.item, actor, updates);
}

async function postSave () {
    let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;
    persistentData.isActive = (workflow.saves.size > 0);
    await DAE.setFlag(actor, persistentDataName, persistentData);
}

async function preTargetDamageApplication() {
    if (!(actor.effects.find(ef => ef.name == "Rage"))) return;
    if (workflow.damageItem.oldHP == 0) return;
    if (workflow.damageItem.oldHP != workflow.damageItem.hpDamage) return;
    await MidiQOL.completeItemUse(macroItem, {}, {});
    await macroItem.update({"system.uses.value" : macroItem.system.uses.value + 1});
    
    let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;
    if (persistentData.isActive) workflow.damageItem.hpDamage -= 1;
}

const persistentDataName = `(Relentless Rage) - Persistent Data`;
const defaultPersistentData = { isActive : false };

await macroUtil.runWorkflows(arguments, {
    preItemRoll  : preItemRoll,
    preTargetDamageApplication  : preTargetDamageApplication,
    postSave : postSave
});