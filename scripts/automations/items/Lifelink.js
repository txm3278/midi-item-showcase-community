// @bakanabaka

let MathClamp = Math.clamp || Math.clamped;

async function preTargetDamageApplication() {
    const appliedDamage = workflow.damageItem.appliedDamage;
    const hpDamage = workflow.damageItem.hpDamage;
    const sharedDamage = (appliedDamage > 0) ?  Math.ceil(appliedDamage / 2) : Math.floor(appliedDamage / 2);
    console.warn("workflow", workflow);
    
    if (!actor.flags.world.lifelink) {
        console.error("Lifelink target not set");
        return;
    }
    let sharedTarget =  await fromUuidSync(actor.flags.world.lifelink);
    if (!sharedTarget) {
        console.error("Shared damage target does not exist");
        return;
    }

    const lifelinkMax = sharedTarget.system.attributes.hp.max;
    const lifelinkHp = sharedTarget.system.attributes.hp.value;

    workflow.damageItem.hpDamage = (appliedDamage > 0) ? Math.min(sharedDamage, hpDamage) : Math.max(sharedDamage, hpDamage);
    sharedTarget.update({"system.attributes.hp.value" : MathClamp(lifelinkHp - sharedDamage, 0, lifelinkMax)});
}

await macroUtil.runWorkflows(arguments, {
    preTargetDamageApplication  : preTargetDamageApplication,
});