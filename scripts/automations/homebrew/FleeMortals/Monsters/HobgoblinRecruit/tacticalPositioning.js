export async function tacticalPositioning({
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
  let isMinion = chrisPremades.helpers.findEffect(
    workflow.token.actor,
    'Minion'
  );
  if (isMinion) return;
  let nearbyMinions = chrisPremades.helpers.findNearby(
    workflow.targets.first(),
    5,
    'enemy',
    false,
    false
  );
  let count = 0;
  for (let i = 0; i < nearbyMinions.length; i++) {
    let effect = chrisPremades.helpers.findEffect(
      nearbyMinions[i].actor,
      'Minion'
    );
    if (effect) count++;
  }
  if (count == 0) return;
  ChatMessage.create({
    content: `${token.name} gains a +${count} bonus from nearby minions.`,
  });
  let updatedRoll = await chrisPremades.helpers.addToRoll(
    workflow.attackRoll,
    count
  );
  workflow.setAttackRoll(updatedRoll);
}
