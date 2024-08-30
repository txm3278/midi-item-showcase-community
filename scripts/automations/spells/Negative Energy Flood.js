async function preDamageRoll() {
    const target = workflow.targets.first();
    const targetType = target.actor.system.details.type.value.toLowerCase();
    if (targetType != "undead") return;

    const updates = {
        "system.actionType"     : "heal",
        "system.damage.parts"   : [["5d12", "temphp"]],
        "system.save.ability"   : "",
        "system.save.dc"        : null,
        "system.save.scaling"   : "flag"
    }
    workflow.item = await macroUtil.item.syntheticItem(workflow.item, actor, updates);
}

async function preDamageApplication() {
    if (!workflow.damageItem.oldHP) return;
    if (workflow.damageItem.oldHP != workflow.damageItem.hpDamage) return;

    const zombification = macroItem.effects.find(ef => ef.name == "Zombification");
    const target = canvas.tokens.get(workflow.damageItem.tokenId);
    await macroUtil.effect.create(target.actor, zombification);
}

async function offEffect() {
    const zombie = game.actors.getName("Zombie");
    if (!zombie) ui.notifications.error("No zombie actor detected");
    else await actor.transformInto(zombie, {}, {renderSheet:false});
}

await macroUtil.runWorkflows(arguments, {
    preDamageRoll : preDamageRoll,
    preDamageApplication : preDamageApplication,
    off : offEffect,
});