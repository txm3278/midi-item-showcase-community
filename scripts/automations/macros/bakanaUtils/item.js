function config(workflow, cfgs, opts){
    for (let key of Object.keys(opts))
        workflow.options[key] = opts[key];
    for (let key of Object.keys(cfgs))
        workflow.config[key] = cfgs[key];
}

//---------------------------------------------------------------------------------------------------------------
// Synthetic Item Suite
//    Used to create temporary items that do not exist on the character sheet
//    These are helpful when you want to modify an item without actually modifying the item
//    Alternatively if you want to call an item on an actor that does not have that item currently
//
//  Mini-Guide:
//    https://github.com/MotoMoto1234/Midi-Wiki/wiki/Tutorials-‐-How-to-Make-CPR-Actions-in-Token-Action-Hud
//---------------------------------------------------------------------------------------------------------------

async function syntheticItem(itemData, actor, updates = {}) {
    let item;
    foundry.utils.mergeObject(updates, {"flags.world.syntheticItem" : true});

    if (itemData.flags?.world?.syntheticItem && itemData.parent == actor) {
        item = itemData;
    } else if (macroUtil.dependsOn.isActivated({id: 'chris-premades', min: '0.12.27'})) {
        item = await chrisPremades.utils.itemUtils.syntheticItem(itemData, actor);
    } else { // Scraped from CPR 08/24/2024
        item = new CONFIG.Item.documentClass(itemData, {parent: actor});
        item.prepareData();
        item.prepareFinalAttributes();
        if (macroUtil.dependsOn.isActivated('dnd5e', '3.2')) item.applyActiveEffects();
    }

    return foundry.utils.mergeObject(item, updates);
}

async function syntheticItemDataRoll(itemData, actor, targets, {options = {}, config = {}} = {}) {
    // Scraped from chrisPremades 08/24/2024 : utils.workflowUtils.syntheticItemDataRoll
    let item = await syntheticItem(itemData, actor);
    return await syntheticItemRoll(item, targets, {options, config});
}

async function syntheticItemRoll(item, targets, {options = {}, config = {}} = {}) {
    if (macroUtil.dependsOn.isActivated({id: 'chris-premades', min: '0.12.27'}))
        return chrisPremades.utils.workflowUtils.syntheticItemRoll(item, targets, {options: options, config: config} = {});
    else {  // Scraped from CPR 08/24/2024
        let defaultConfig = {
            consumeUsage: false,
            consumeSpellSlot: false
        };
        let defaultOptions = {
            targetUuids: targets.map(i => i.document.uuid),
            configureDialog: false,
            ignoreUserTargets: true,
            workflowOptions: {
                autoRollDamage: 'always',
                autoFastDamage: true,
                autoRollAttack: true
            }
        };
        options = foundry.utils.mergeObject(defaultOptions, options);
        config = foundry.utils.mergeObject(defaultConfig, config);
        return await MidiQOL.completeItemUse(item, config, options);
    }
}

const preItemRoll = {
    config,
};

export const itemApi = { 
    syntheticItem,
    syntheticItemRoll,
    syntheticItemDataRoll,
    preItemRoll,
};
