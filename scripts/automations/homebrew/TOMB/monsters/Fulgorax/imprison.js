export async function imprison({
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
  if (!workflow.hitTargets.size) return;
  let targetToken = workflow.targets.first();
  if (game.modules.get('Rideable')?.active) {
    game.Rideable.Mount([targetToken.document], workflow.token.document, {
      Grappled: true,
      MountingEffectsOverride: [workflow.item.name],
    });
  }
}

export async function imprisonHealing({
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
  if (!workflow.hitTargets.size) return;
  await MidiQOL.applyTokenDamage(
    [
      {
        damage: workflow.damageDetail[0].damage,
        type: 'healing',
      },
    ],
    workflow.damageDetail[0].damage,
    new Set([token]),
    null,
    null
  );
}
