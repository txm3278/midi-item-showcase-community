// @bakanabaka

async function postActiveEffects() {
    let dagger = actor.items.find(it => it.name == "Dagger of Venom"); 
    if (!dagger) return;
    let enableEffect = dagger.effects.find(ef => ef.name == `${macroItem.name} Applied`);
    await enableEffect.update({"disabled": false});
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
    postActiveEffects : postActiveEffects
});