// @bakanabaka

async function preAttackRoll() {
    let itemEffect = macroItem.effects.find(ef => ef.name == `${macroItem.name} Enabled`);
    let actorEffect = await macroUtil.effect.find(actor, itemEffect);

    if (!actorEffect) return; // Sharpshooter is not enabled
    // if (item.system.actionType != "rwak") return; // not a ranged weapon (checked by DAE)
    if (!rolledItem.system?.prof.hasProficiency) return; // not proficient

    if (item.bakanabaka?.sharpshooter) return;  // already initialized
    let bakanabaka = item.flags.bakanabaka || {};
    bakanabaka.sharpshooter = { atk : -5, dmg : 10 };
    await item.update({"flags.bakanabaka" : bakanabaka }); // set DAE flags
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
  await macroUtil.runWorkflows(callArguments, {preAttackRoll : preAttackRoll});
