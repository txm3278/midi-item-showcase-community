// @bakanabaka

let MathClamp = Math.clamp || Math.clamped;
async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }

async function preTargetDamageApplication() {
    const appliedDamage = workflow.damageItem.appliedDamage;
    const hpDamage = workflow.damageItem.hpDamage;
    const sharedDamage = (appliedDamage > 0) ?  Math.ceil(appliedDamage / 2) : Math.floor(appliedDamage / 2);
    
    if (!actor.flags.world.lifelink) {
        console.error("Lifelink target not set");
        return;
    }
    let sharedToken = canvas.tokens.get(actor.flags.world.lifelink);
    if (!sharedToken) {
        console.error("Shared damage target does not exist");
        return;
    }
    workflow.damageItem.hpDamage = (appliedDamage > 0) ? Math.min(sharedDamage, hpDamage) : Math.max(sharedDamage, hpDamage);

    // specifically don't await this.
    // we want to force the damage to apply after combat damage is assigned
    updateTargetHealth(sharedToken, sharedDamage);
}

async function updateTargetHealth(sharedToken, sharedDamage) {
    await wait(500);
    MidiQOL.applyTokenDamage([{damage: sharedDamage, type: "none"}], sharedDamage, new Set([sharedToken]), undefined, new Set(), { existingDamage: [], superSavers: new Set(), semiSuperSavers: new Set(), workflow: undefined, updateContext: {onUpdateCalled: true} })
}

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
    preTargetDamageApplication : preTargetDamageApplication,
});