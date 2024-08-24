// @bakanabaka

async function postActiveEffects() {
    function findItem(itemName) {
        return actor.items.find(it => it.name == itemName); 
    }

    let dagger = findItem("Dagger of Venom");
    if (!dagger) return;

    // Add poison effect
    let enableEffect = dagger.effects.find(ef => ef.name.includes("Enabled"));
    await enableEffect.update({"disabled": false});
}

await macroUtil.runWorkflows(arguments, {
    postActiveEffects : postActiveEffects
});
