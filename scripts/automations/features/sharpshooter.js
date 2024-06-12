export async function sharpshooter({
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
  if (workflow.item.system?.actionType !== 'rwak') return;
  let sharpshooterEffect = workflow.actor.effects.getName('Sharpshooter');
  let sharpshooterActive = sharpshooterEffect && !sharpshooterEffect.disabled;
  let sharpshooterFeat = workflow.actor.items.getName('Sharpshooter');
  let useSharpshooter = await Dialog.confirm({
    title: 'Sharpshooter?',
    content:
      '<p style="text-align: center;">Use Sharpshooter? (-5 to attack, +10 to damage)</p>',
    yes: () => true,
    no: () => false,
  });
  if (
    (useSharpshooter && !sharpshooterActive) ||
    (sharpshooterActive && !useSharpshooter)
  ) {
    await sharpshooterEffect.update({ disabled: sharpshooterActive });
  }
}
