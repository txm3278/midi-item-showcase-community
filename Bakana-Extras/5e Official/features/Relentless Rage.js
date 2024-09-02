// @bakanabaka

async function preItemRoll() {
    let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;
    if (!persistentData.workflowId) {
        ui.notifications.error(`${macroItem.name} can only be called from within a workflow.`);
        workflow.aborted = true;
        return false;
    }

    let configs = {consumeUsage : false};
    let options = {};
    macroUtil.item.preItemRoll.config(configs, options);
    // Jank -- use the uses to track the number of times it has occurred
    //    we do this because it automatically will reset on short rest this way
    const updates = {"system.save.dc" : 5 * macroItem.system.uses.value};
    workflow.item = await macroUtil.item.syntheticItem(workflow.item, actor, updates);
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
    let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;
    persistentData.workflowId = workflow.id;
    await MidiQOL.completeItemUse(macroItem, {}, {});
    await macroItem.update({"system.uses.value" : macroItem.system.uses.value + 1});
    
    persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;
    persistentData.workflowId = undefined;
    if (persistentData.isActive) workflow.damageItem.hpDamage -= 1;
    await DAE.setFlag(actor, persistentDataName, persistentData);
}

const persistentDataName = `(Relentless Rage) - Persistent Data`;
const defaultPersistentData = { isActive : false, workflowId : undefined };

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
    preItemRoll  : preItemRoll,
    preTargetDamageApplication  : preTargetDamageApplication,
    postSave : postSave
});