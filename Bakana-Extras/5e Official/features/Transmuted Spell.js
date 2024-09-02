// @bakanabaka

async function preDamageRoll() {
    // Check if is a spell
    if (!['msak', 'rsak'].includes(rolledItem.system.actionType)) return;

    // Check spell damage types
    const allOptions = ["acid", "cold", "fire", "lightning", "poison", "thunder"];
    // all damage types
    let damageType = macroUtil.dialog.selectFromDropdown(macroItem.name, `Damage type to replace`, damageTypes)
    if (!damageType)  return;

    // Prompt spell damage elsewhere from list
    const index = allOptions.indexOf(damageType);
    const options = allOptions.splice(index, 1);
    let selection = macroUtil.dialog.selectFromDropdown(macroItem.name, `Change ${damageType} into what other element?`, options);
    if (!selection) return;

    // Change damage to specified type
    await updateDamageType(damageType, selection);
}

async function updateDamageType(damageType, replacementType){
    let damageParts = duplicate(item.system.damage.parts);
    for (let part of damageParts) 
        if (part[1] == damageType)
            part[1] = replacementType;         // convert all damage to cold damage
    const updates = {"system.damage.parts" : damageParts};
    workflow.item = await macroUtil.item.syntheticItem(workflow.item, actor, updates);
}

await macroUtil.runWorkflows(arguments, {
    preDamageRoll  : preDamageRoll,
});