// @bakanabaka

async function preDamageRollComplete() {
    if (item.system.actionType != "mwak" && item.system.actionType != "rwak") return;

    new MidiQOL.TrapWorkflow(actor, macroItem, workflow.targets);

    const damageAmount = '2[poison]';
    const damageRoll = await new Roll(damageAmount).evaluate();
    // await game.dice3d?.showForRoll(damageRoll);

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
    preDamageRollComplete : preDamageRollComplete   // damage die additions
});