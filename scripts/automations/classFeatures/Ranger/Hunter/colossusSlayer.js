// @bakanabaka
export async function colossusSlayer({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
  options,
}) {
  async function preDamageRollComplete() {
    if (!item.system.actionType.includes('wak')) return;
    const targetActorHp = workflow.targets.first()?.actor.system.attributes.hp;
    if (!targetActorHp) return; // no target... weird
    if (targetActorHp.value == targetActorHp.max) return;

    if (macroUtil.combat.isSameTurn(persistentData.combat)) return;
    persistentData.combat = macroUtil.combat.getCombatInfo();

    const damageAmount = macroUtil.combat.damageFormula(workflow, '1d8');
    const damageRoll = await new Roll(damageAmount).evaluate();
    await game.dice3d?.showForRoll(damageRoll);

    workflow.damageRolls.push(damageRoll);
    await workflow.setDamageRolls(workflow.damageRolls);
  }

  const persistentDataName = `(Colossus Slayer) - Persistent Data`;
  const defaultPersistentData = { combat: {} };
  let persistentData =
    (await DAE.getFlag(actor, persistentDataName)) || defaultPersistentData;

  const callArguments = {
    speaker: speaker,
    actor: actor,
    token: token,
    character: character,
    item: item,
    args: args,
    scope: scope,
  };
  await macroUtil.runWorkflows(callArguments, {
    preDamageRollComplete: preDamageRollComplete, // damage die additions
  });

  await DAE.setFlag(actor, persistentDataName, persistentData);
}
