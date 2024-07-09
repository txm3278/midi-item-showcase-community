// @bakanabaka

async function preTargeting() {
    if (workflow.targets.length) return;
    let produceFlame = macroItem.effects.find(ef => ef.name == "Produce Flame");
    await macroUtil.effect.toggle(actor, produceFlame);
}
  
async function postAttackRoll() {
    let produceFlame = macroItem.effects.find(ef => ef.name == "Produce Flame");
    await macroUtil.effect.remove(actor, produceFlame);
}

await macroUtil.runWorkflows(arguments, {
    preTargeting      : preTargeting,
    postAttackRoll    : postAttackRoll,
});