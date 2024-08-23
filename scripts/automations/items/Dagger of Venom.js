// @bakanabaka

async function preDamageRoll() {
    let poisonEffect = macroItem.effects.find(ef => ef.name == macroItem.name);
    await macroItem.setFlag("midi-qol", "onUseMacroName", "");
    if (poisonEffect.disabled) return;

    const updates = {
        "system.formula"      : "2d10[poison]",
        "system.save.ability" : "con",
        "system.save.dc"      : 15,
        "system.save.scaling" : "flat",
        // Below flags enabled by above four fields (damage + saving throw)
        //"flags.midiProperties.saveDamage"       : "fulldam",      // Set directly in item
        //"flags.midiProperties.otherSaveDamage"  : "nodam",        // Set directly in item
    };
    const options = {keepId: true};
    workflow.item = workflow.item.clone(updates, options);

    await poisonEffect.update({"disabled": true, "isSuppressed": true});
}

await macroUtil.runWorkflows(arguments, {
    preDamageRoll : preDamageRoll
});