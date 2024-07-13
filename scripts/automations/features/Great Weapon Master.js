// @bakanabaka

async function preAttackRoll() {
    let itemEffect = macroItem.effects.find(ef => ef.name == `${macroItem.name} Enabled`);
    let actorEffect = await macroUtil.effect.find(actor, itemEffect);

    if (!actorEffect) return; // Great Weapon Master is not enabled
    // if (item.system.actionType != "mwak") return; // not a melee weapon attack (checked by DAE)
    if (!item.system.properties.has("hvy")) return; // not a heavy weapon
    if (!rolledItem.system?.prof.hasProficiency) return; // not proficient

    if (item.bakanabaka?.gwm) return;  // already initialized
    let bakanabaka = item.flags.bakanabaka || {};
    bakanabaka.gwm = { atk : -5, dmg : 10 };
    await item.update({"flags.bakanabaka" : bakanabaka }); // set DAE flags
}

async function preDamageApplication() {
    if (item.system.actionType != "mwak") return;
    let modifierEffect = macroItem.effects.find(ef => ef.name.includes("Modifiers"));
    await macroUtil.effect.remove(actor, modifierEffect);

    let targetHpToZero = workflow.damageItem.oldHP && (workflow.damageItem.hpDamage == workflow.damageItem.oldHP);
    if (workflow.isCritical || targetHpToZero){
        if (!game.combat?.active) return;   // only give extra bonus attacks in combat
        let bonusAttack = macroItem.effects.find(ef => ef.name.includes("Bonus Attack"));
        await macroUtil.effect.create(actor, bonusAttack);
    }
}

async function postCleanup() {
    let itemEffect = macroItem.effects.find(ef => ef.name == `${macroItem.name} Enabled`);
    await macroUtil.effect.toggle(actor, itemEffect);
}

await macroUtil.runWorkflows(arguments, {
        preAttackRoll : preAttackRoll, 
        preDamageApplication : preDamageApplication,
        postCleanup : postCleanup
    });