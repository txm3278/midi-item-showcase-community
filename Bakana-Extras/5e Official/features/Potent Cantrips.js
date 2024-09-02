// @bakanabaka

async function preDamageRollComplete() {
    if (rolledItem.type != "spell") return;
    if (rolledItem.system.level != 0) return;

    const spellmod = actor.system.attributes.spellmod;
    const damageAmount = `${spellmod}`;
    const damageRoll = await new Roll(damageAmount).evaluate();
    //  await game.dice3d?.showForRoll(damageRoll); // flat addition, no dice to animate

    workflow.damageRolls.push(damageRoll);
    await workflow.setDamageRolls(workflow.damageRolls);
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
    preDamageRollComplete  : preDamageRollComplete,
});