async function isDamaged() {
    const threshold = Number(macroItem.system.activation.condition);
    const damage = workflow.damageItem;
    if (damage.oldHP == damage.hpDamage) {
        if (damage.appliedDamage <= threshold) workflow.damageItem.hpDamage -= 1;
    }
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
    isDamaged : isDamaged,
});