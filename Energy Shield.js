// @bakanabaka

async function effectEach() {
    const { value, max } = actor.system.resources.tertiary ?? {};
    const perTurnReplenishAmount = 0; // change to what needed.
    const newValue = Math.min(value + perTurnReplenishAmount, max);
    return await actor.update({ 'system.resources.tertiary.value': newValue });
}

async function preTargetDamageApplication() {
  if (args[0].tag !== 'TargetOnUse') return;
  
  const damageArray = workflow.damageItem.damageDetail.flat(1).filter(d=>d);
  const piercing = damageArray.partition(d=>d.type !== 'piercing')[0].reduce((psum,a) => psum + a.damage, 0);
  const slashing = damageArray.partition(d=>d.type !== 'bludgeoning')[0].reduce((psum,a) => psum + a.damage, 0);
  const bludgeoning = damageArray.partition(d=>d.type !== 'slashing')[0].reduce((psum,a) => psum + a.damage, 0);
  const totalPhys = piercing + slashing + bludgeoning;
  console.log(totalPhys + "is the physical");   //
  
  const { value, max } = options.actor.system.resources.tertiary ?? {};
  if (!value) return console.log(`${options.actor.name} shield is depleted`);
  //Calc Phys vs Nonphys
  console.log("Original damage is " + workflow.damageItem.hpDamage );
  const incomingDamage = workflow.damageItem.hpDamage - totalPhys;
  //Take non-phys from shield
  var shieldNonPhys = value - (incomingDamage);
  var shieldNewValue = shieldNonPhys;
  
  var isBroken = shieldNonPhys <= 0 ? true : false;
  
  var shieldPhys;
  var overflowDamage;
  
  //NEW CODE
  if (!isBroken)
  {//Take phys from shield, as long as its not broken
      shieldPhys = shieldNonPhys - (totalPhys * 2);
      //if the shield is negative because of the physical damage, cut the overflow damage in half
      overflowDamage = shieldPhys <= 0 ? Math.floor(shieldPhys / 2) : 0;
      //set the current value of the shield to the proper value in case it wasn't broken
      shieldNewValue = shieldPhys;
      
      //if the shield is 0, that means it was broken.
      if (shieldPhys <= 0)
      {
          shieldNewValue = 0;
      }    
  }
  else 
  { 
      overflowDamage = Math.abs(shieldNonPhys) + totalPhys;
      shieldNewValue = 0;
  }
  
  /*shieldNonPhys = shieldNonPhys <= 0 ? shieldNonPhys : 0;
  
  console.log("Step 1: Shield after non-phys will be " + shieldNonPhys);
  //subtract physical damage. If the overflow is already less than 0, then subtract less physical to overflow
  var shieldPhys = shieldNonPhys <= 0 ? shieldNonPhys - totalPhys : (shieldNonPhys - totalPhys * 2);
  
  console.log("Step 2: Shield after phys will be " + shieldPhys);
  
  //set the shield's new value after all damage is done.'
  var shieldNewValue = value > incomingDamage ? value - incomingDamage : 0;
  
  console.log("Step 3: ACTUAL Shield after non-phys is " + shieldNewValue);
  
  shieldNewValue = shieldNewValue > (totalPhys * 2) ? shieldNewValue - (totalPhys * 2) : 0;
  
  console.log("Step 4: totalPhys is " + totalPhys);
  
  console.log("Step 5: Shield Value is now " + shieldNewValue);
  
  //convert overflow to positive integer
  totalOverflow = totalOverflow < 0 ? totalOverflow * -1 : totalOverflow; */
  
  console.log("Overflow damage, after everything is " + overflowDamage);
  
  workflow.damageItem.hpDamage = !!shieldNewValue ? 0 : overflowDamage;
  await options.actor.update({ 'system.resources.tertiary.value': shieldNewValue});
}

await macroUtil.runWorkflows(arguments, {
    each  : effectEach,
    preTargetDamageApplication : preTargetDamageApplication,
});