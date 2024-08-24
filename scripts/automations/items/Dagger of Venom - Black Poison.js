// @bakanabaka

let dagger = actor.items.find(it => it.name == "Dagger of Venom"); 
if (!dagger) {
    console.error("'Dagger of Venom' not found on actor!");
    return;
}
let enableEffect = dagger.effects.find(ef => ef.name.includes(macroItem.name));
await enableEffect.update({"disabled": false});
