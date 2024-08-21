async function isDamaged() {
    const threshold = Number(macroItem.system.activation.condition);
    const damage = workflow.damageItem;
    if (damage.oldHP == damage.hpDamage) {
        if (damage.appliedDamage <= threshold) workflow.damageItem.hpDamage -= 1;
    }
}

await macroUtil.runWorkflows(arguments, {
    isDamaged : isDamaged,
});