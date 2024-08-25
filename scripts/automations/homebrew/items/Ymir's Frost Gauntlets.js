// @bakanabaka

function isMeleeAttack() {
    // probably doesn't correctly handle the thrown property
    return workflow.item.system.actionType == "mwak" || workflow.item.system.actionType == "msak";
}

function isMetal(specifiedItem) {
    return specifiedItem.system.description.value.includes("metal");
}

function addDamageType(damageType) {
    let damageParts = workflow.item.system.damage.parts;
    if (damageParts.find(part => part[1] == damageType))        // if the weapon already does cold damage
        damageParts.push(['1d8', damageType]);                  //   do additional damage as well
}

function updateDamageType(damageType) {
    let damageParts = workflow.item.system.damage.parts;
    for (let part of damageParts) part[1] = damageType;         // convert all damage to cold damage
}

async function preDamageRoll() {
    if (!isMeleeAttack()) return;                   // not a melee attack
    if (workflow.item.type != "weapon") return;     // not a weapon
    workflow.item = macroUtil.item.syntheticItem(workflow.item, actor);
    addDamageType("cold");
    if (!isMetal(workflow.item)) return;            // not metal
    updateDamageType("cold");
}

await macroUtil.runWorkflows(arguments, {
    preDamageRoll : preDamageRoll,
});