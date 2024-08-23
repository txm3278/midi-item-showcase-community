async function postActiveEffects() {
    function findItem(itemName) {
        return actor.items.find(it => it.name == itemName); 
    }

    let dagger = findItem("Dagger of Venom");
    if (!dagger) return;

    // Add poison effect
    let poisonEffect = dagger.effects.find(ef => ef.name == dagger.name);
    await poisonEffect.update({"disabled": false, "isSuppressed": false});
    await dagger.setFlag("midi-qol", "onUseMacroName", "[preDamageRoll]ItemMacro");
}

await macroUtil.runWorkflows(arguments, {
    postActiveEffects : postActiveEffects
});