// Modified by @bakanabaka

async function effectEach() {
    const { value, max } = actor.system.resources.tertiary ?? {};
    const perTurnReplenishAmount = max; // change to what needed.
    const newValue = Math.min(value + perTurnReplenishAmount, max);
    return await actor.update({ 'system.resources.tertiary.value': newValue });
}

async function isDamaged() {
    const damageArray = workflow.damageItem.damageDetail.flat(1).filter(d=>d);
    const piercing = damageArray.partition(d=>d.type !== 'piercing')[0].reduce((psum,a) => psum + a.damage, 0);
    const slashing = damageArray.partition(d=>d.type !== 'bludgeoning')[0].reduce((psum,a) => psum + a.damage, 0);
    const bludgeoning = damageArray.partition(d=>d.type !== 'slashing')[0].reduce((psum,a) => psum + a.damage, 0);
    const shieldPhysicalDamage = piercing + slashing + bludgeoning;
    console.warn("A total of", shieldPhysicalDamage, "physical damage");  // verified working

    const { value, max } = actor.system.resources.tertiary ?? {};
    const shieldEnergyStrength = value;
    if (!shieldEnergyStrength) return console.warn(`${actor.name} shield is depleted`);
    //Calc Phys vs Nonphys
    console.warn("Original damage is", workflow.damageItem.hpDamage);
    let remainingDamage = workflow.damageItem.hpDamage;
    const shieldEnergyDamage = remainingDamage - shieldPhysicalDamage;

    // non-phys trades 1 for 1
    let shieldRemaining = Math.max(shieldEnergyStrength - shieldEnergyDamage, 0);
    console.warn("non-physical damage reduced shields from", shieldEnergyStrength, "to", shieldRemaining);
    remainingDamage -= (shieldEnergyStrength - shieldRemaining);
  
    // phys trades at 2 for 1
    const shieldPhysicalStrength = Math.ceil(shieldRemaining / 2);
    shieldRemaining = 2 * Math.max(shieldPhysicalStrength - shieldPhysicalDamage, 0);
    console.warn("physical damage reduced shields from", 2*shieldPhysicalStrength, "+/- 1 to", shieldRemaining);
    remainingDamage -= (shieldPhysicalStrength - shieldRemaining / 2);
  
    console.log("Overflow damage, after everything is", remainingDamage);
    workflow.damageItem.hpDamage = remainingDamage;
    await actor.update({ 'system.resources.tertiary.value': shieldRemaining});
}

async function onEffect() {}
async function offEffect() {}

await macroUtil.runWorkflows(arguments, {
    on : onEffect,
    off : offEffect,
    each  : effectEach,
    isDamaged : isDamaged,
});