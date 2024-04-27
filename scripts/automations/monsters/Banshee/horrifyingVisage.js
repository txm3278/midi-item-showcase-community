export async function horrifyingVisage({
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
  if (item.name !== 'Horrifying Visage') return;

  const effectName = 'Horrifying Visage'; //that should match the effect name

  const sourceActor = fromUuidSync(
    actor.effects.getName(effectName).origin
  ).actor;

  if (!sourceActor) return;
  const sourceToken = sourceActor.token ?? sourceActor.getActiveTokens()[0];

  const distance = MidiQOL.computeDistance(token, sourceToken, true);

  if (!distance) return;

  const canSeeSource = MidiQOL.findNearby(null, token, distance, {
    isSeen: true,
  }).find((t) => t === sourceToken.object);

  if (!canSeeSource) return;

  workflow.saveDetails.disadvantage = true;
}
