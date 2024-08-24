// @bakanabaka

async function onEffect() {
    await macroItem.setFlag("midi-qol", "onUseMacroName", "[postActiveEffects]ItemMacro");
    let poisonEffect = macroItem.effects.find(ef => ef.name == macroItem.name);
    await poisonEffect.setFlag("dae", "dontApply", false);

    const updates = {
        "system.formula"      : "2d10[poison]",
        "system.save.ability" : "con",
        "system.save.dc"      : 15,
    };
    await macroItem.update(updates);
}

async function offEffect() {
    await macroItem.setFlag("midi-qol", "onUseMacroName", "");
    let poisonEffect = macroItem.effects.find(ef => ef.name == macroItem.name);
    await poisonEffect.setFlag("dae", "dontApply", true);

    const updates = {
        "system.formula"      : "",
        "system.save.ability" : "",
        "system.save.dc"      : undefined,
    };
    await macroItem.update(updates);
}

async function postActiveEffects() {
    let enableEffect = macroItem.effects.find(ef => ef.name.includes("Enabled"));
    await enableEffect.update({"Suppressed": true, "disabled": true});
}

await macroUtil.runWorkflows(arguments, {
    on : onEffect,
    off : offEffect,
    postActiveEffects : postActiveEffects
});