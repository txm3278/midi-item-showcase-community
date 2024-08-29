// @bakanabaka

async function postActiveEffects() {
    let dagger = actor.items.find(it => it.name == "Dagger of Venom"); 
    if (!dagger) return;
    let enableEffect = dagger.effects.find(ef => ef.name.includes(macroItem.name));
    await enableEffect.update({"disabled": false});
}

await macroUtil.runWorkflows(arguments, {
    postActiveEffects : postActiveEffects
});