// @bakanabaka

async function isMeleeAttack() {
    // probably doesn't correctly handle the thrown property
    return workflow.item.system.actionType == "mwak" || workflow.item.system.actionType == "msak";
}

async function isMetal(item) {
    return item.system.description.value.includes("metal");
}

async function updateDamageType(damageType){
    let damageParts = duplicate(item.system.damage.parts);
    if (damageParts.find(part => part[1] == damageType))        // if the weapon already does cold damage
        damageParts.push(['1d8', damageType]);                  //   do additional damage as well
    for (let part of damageParts) part[1] = damageType;         // convert all damage to cold damage
    const updates = {"system.damage.parts" : damageParts};
    workflow.item = workflow.item.clone(updates, {keepId: true});
}

async function preDamageRoll() {
    if (!isMeleeAttack()) return;                   // not a melee attack
    if (workflow.item.type != "weapon") return;     // not a weapon
    if (!isMetal(workflow.item)) return;            // not metal
    await updateDamageType("cold");
}

await macroUtil.runWorkflows(arguments, {
    preDamageRoll : preDamageRoll,
});

