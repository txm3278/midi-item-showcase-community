// @bakanabaka

async function postAttackRoll() {
    if (!item.system.actionType.includes("mwak")) return;
    if (!workflow.hitTargets.size)  {
        const effectData = macroItem.effects.find(ef => ef.name == "Off-Balance");
        await macroUtil.effect.create(actor, effectData);
    } else {
        workflow.item = await macroUtil.item.syntheticItem(workflow.item, actor);
        let damageFormula = workflow.item.system.damage.parts[0][0];
        workflow.item.system.damage.parts[0][0] = damageFormula + ` + @mod`;
    }

    const effectData = macroItem.effects.find(ef => ef.name == macroItem.name);
    await macroUtil.effect.remove(actor, effectData);
}

await macroUtil.runWorkflows(arguments, {
    postAttackRoll : postAttackRoll
});