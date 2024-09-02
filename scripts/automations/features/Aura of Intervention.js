// @bakanabaka
macroUtil.dependsOn.required('elwinHelpers', '2.2');
const macroPass = args[0].macroPass;
const tprToken = (macroPass?.includes('tpr.')) ? token : token;

async function tpr_isDamaged_post() {
    if (!workflow.damageItem.oldHP) return;
    if (workflow.damageItem.oldHP != workflow.damageItem.hpDamage) return;
    const targetToken = workflow.targets.first();
    const targetActor = targetToken.actor;
    if (!macroUtil.token.areAllies(targetToken, tprToken)) return;
    const ineligibleEffect = macroItem.effects.find(ef => ef.name == `${macroItem.name} - Immune`);
    if (macroUtil.effect.find(targetActor, ineligibleEffect)) return;

    await macroUtil.effect.create(targetActor, ineligibleEffect);
    workflow.damageItem.hpDamage -= 1;
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
    "tpr.isDamaged.post" : tpr_isDamaged_post,
});