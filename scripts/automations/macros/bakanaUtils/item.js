function config(cfgs, opts){
    for (let key of Object.keys(opts))
        workflow.options[key] = opts[key];
    for (let key of Object.keys(cfgs))
        workflow.config[key] = cfgs[key];
}

async function createSyntheticItem(itemData, actor) {
    if (macroUtil.moduleApi.activated('chris-premades'))
        return await chrisPremades.itemUtils.syntheticItem(itemData, actor);
    else { // Scraped from CPR 08/24/2024
        let item = new CONFIG.Item.documentClass(itemData, {parent: actor});
        item.prepareData();
        item.prepareFinalAttributes();
        item.applyActiveEffects();
        return item;
    }
}

async function syntheticItemRoll(item, targets, {options = {}, config = {}} = {}) {
    if (macroUtil.moduleApi.activated('chris-premades'))
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

async function syntheticItemDataRoll(itemData, actor, targets, {options = {}, config = {}} = {}) {
    if (macroUtil.moduleApi.activated('chris-premades'))
        return await chrisPremades.utils.workflowUtils.syntheticItemDataRoll(item, targets, {options: options, config: config});
    else { // Scraped from CPR 08/24/2024
        let item = await createSyntheticItem(itemData, actor);
        return await syntheticItemRoll(item, targets, {options, config});
    }
}

const preItemRoll = {
    config,
};

export const itemApi = { 
    createSyntheticItem,
    syntheticItemRoll,
    syntheticItemDataRoll,
    preItemRoll,
};
