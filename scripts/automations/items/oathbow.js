export async function oathbow({
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
  if (!workflow.targets.size) return;
  const effectExists = workflow.targets
    .first()
    ?.actor?.appliedEffects?.find((ef) => ef.name === 'Sworn Enemy');
  if (!effectExists) return;

  let validTypes = ['rwak'];
  if (!validTypes.includes(workflow.item.system.actionType)) return;
  if (
    game.settings.get('midi-qol', 'ConfigSettings').optionalRules
      .coverCalculation === 'none'
  )
    return;
  let queueSetup = await chrisPremades.queue.setup(
    workflow.item.uuid,
    'oathbow',
    150
  );
  if (!queueSetup) return;
  let coverBonus = MidiQOL.computeCoverBonus(
    workflow.token,
    workflow.targets.first(),
    workflow.item
  );
  if (coverBonus > 5) {
    chrisPremades.queue.remove(workflow.item.uuid);
    return;
  }
  let updatedRoll = await chrisPremades.helpers.addToRoll(
    workflow.attackRoll,
    coverBonus
  );
  workflow.setAttackRoll(updatedRoll);
  chrisPremades.queue.remove(workflow.item.uuid);
}
