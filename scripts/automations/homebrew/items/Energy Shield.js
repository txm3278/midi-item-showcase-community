// Modified by @bakanabaka

async function effectEach() {
    const { value, max } = actor.system.resources.tertiary ?? {};
    const perTurnReplenishAmount = max; // change to what needed.
    const newValue = Math.min(value + perTurnReplenishAmount, max);
    return await actor.update({ 'system.resources.tertiary.value': newValue });
}

async function isDamaged() {
    let remainingDamage = workflow.damageItem.hpDamage;

    const bludgeoning = workflow.damageDetail.find(d=>d.type=='bludgeoning')?.damage ?? 0;
    const slashing = workflow.damageDetail.find(d=>d.type=='slashing')?.damage ?? 0;
    const piercing = workflow.damageDetail.find(d=>d.type=='piercing')?.damage ?? 0;
    const healing = workflow.damageDetail.find(d=>d.type=='healing')?.damage ?? 0;

    const physicalDamage = piercing + slashing + bludgeoning;
    const energyDamage = remainingDamage - physicalDamage - healing;

    const { value, max } = actor.system.resources.tertiary ?? {};
    let remainingShield = value;
    if (!remainingShield) return console.warn(`${actor.name} shield is depleted`);

    // non-phys trades 1 for 1
    let shieldDamage = Math.min(energyDamage, remainingShield);
    remainingDamage -= shieldDamage;
    remainingShield -= shieldDamage;
  
    // phys trades at 2 for 1
    shieldDamage = Math.min(physicalDamage * 2, remainingShield);
    remainingDamage -= Math.ceil(shieldDamage / 2);
    remainingShield -= shieldDamage;
  
    workflow.damageItem.hpDamage = remainingDamage;
    await actor.update({ 'system.resources.tertiary.value': remainingShield});
}

async function onEffect() {}
async function offEffect() {}

await macroUtil.runWorkflows(arguments, {
    on : onEffect,
    off : offEffect,
    each  : effectEach,
    isDamaged : isDamaged,
});