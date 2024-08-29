let poisonEffect = macroItem.effects.find(ef => ef.name == macroItem.name);
await macroItem.setFlag("midi-qol", "onUseMacroName", "");
if (poisonEffect.disabled) return;

const updates = {
    "system.formula"      : "2d10[poison]",
    "system.save.ability" : "con",
    "system.save.dc"      : 15,
    "system.save.scaling" : "flat",
};
workflow.item = workflow.item.clone(updates, {keepId: true});

await poisonEffect.update({"disabled": true, "isSuppressed": true});
