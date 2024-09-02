// @bakanabaka

async function postActiveEffects() {
    let dagger = actor.items.find(it => it.name == "Dagger of Venom"); 
    if (!dagger) return;
    let enableEffect = dagger.effects.find(ef => ef.name.includes(macroItem.name));
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
    workflow:   workflow,
    options:    options
  };
await macroUtil.runWorkflows(callArguments, {
    postActiveEffects : postActiveEffects
});