// @bakanabaka

async function postAttackRoll() {
    const randomIndex = Math.floor(Math.random() * remainingStars.length);
    let randomStar = remainingStars[randomIndex];
    await macroUtil.animation.crownOfStars.remmove(token, {id: `[${actor.id}] Crown of Stars`}, randomStar);
    
    remainingStars[randomIndex] = remainingStars[remainingStars.length-1];
    remainingStars.pop();
    if (remainingStars.length == 3) {
        let allEffects = Array.from(actor.allApplicableEffects());
        let lightEffect = allEffects.find(ef => ef.name == macroItem.name);
        let changes = lightEffect.changes;
        changes.pop();  // We have structured it so ATL.light.bright is at the end
        changes.find(ch => ch.key == "ATL.light.dim").value = "30";
        await lightEffect.update({changes: changes});
    }

    if (!remainingStars.length) {
        let crownEffect = actor.effects.find(ef => ef.name == "Crown of Stars");
        await crownEffect.delete();
    }
}

let remainingStars = actor.getFlag('world', `Crown of Stars`);
await macroUtil.runWorkflows(arguments, {
    postAttackRoll : postAttackRoll 
});
await actor.setFlag('world', `Crown of Stars`, remainingStars)