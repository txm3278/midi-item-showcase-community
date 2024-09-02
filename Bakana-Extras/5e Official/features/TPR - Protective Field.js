// @Elwin's TPR Protective Field introductory item rewritten with macroUtil
// Possible TPR repetitive structures:
const tprResult = options?.thirdPartyReactionResult;
const tprWorkflow = workflow.options?.thirdPartyReaction;
const macroPass = args[0].macroPass;
const tprActor = (macroPass.includes('tpr.')) ? macroItem.actor : workflow.actor;

// Core functionality
macroUtil.dependsOn.required({id: 'elwinHelpers', min: '2.2'});
macroUtil.dependsOn.required({id: 'dae'});
macroUtil.dependsOn.required({id: 'midi-qol'});

// Original workflow
async function tprIsDamagedPre() {
    await DAE.unsetFlag(macroItem.actor, "protectiveFieldPreventedDmg");
}

// TPR Actor's workflow
async function handleOnUsePreTargeting() {
  // If the user clicks onUser rather than reaction
  if ( tprWorkflow?.trigger !== "tpr.isDamaged" || !tprWorkflow?.itemUuids?.includes(macroItem.uuid) ) {
    ui.notifications.warn(`${macroItem.name} | This reaction can only be triggered when a nearby creature of the Fighter is damaged.`);
    workflow.aborted = true;
    return false;
  }
  foundry.utils.setProperty(workflow, "options.workflowOptions.fastForwardDamage", true);
}

// TPR Actor's workflow
async function handleOnUsePostActiveEffects() {
  const targetToken = workflow.targets.first();
  if (!targetToken) return;
  const targetActor = targetToken.actor;
  if (!targetActor) return;

  await DAE.setFlag(tprActor, "protectiveFieldPreventedDmg", workflow.damageTotal);

  const infoMsg = `<p>You prevent <strong>${workflow.damageTotal}</strong> points of damage to <strong>\${tokenName}</strong>.</p>`;
  await elwinHelpers.insertTextIntoMidiItemCard(
    "beforeButtons",
    workflow,
    elwinHelpers.getTargetDivs(targetToken, infoMsg)
  );
}

// Original workflow
async function tprIsDamagedPost() {
  if ( tprResult?.uuid === macroItem.uuid ) {
    const preventedDmg = DAE.getFlag(tprActor, "protectiveFieldPreventedDmg");
    if ( preventedDmg > 0 ) elwinHelpers.reduceAppliedDamage(workflow.damageItem, preventedDmg);
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
    "tpr.isDamaged.pre" : tprIsDamagedPre,
    preTargeting : handleOnUsePreTargeting,
    postActiveEffects : handleOnUsePostActiveEffects,
    "tpr.isDamaged.post" : tprIsDamagedPost,
});