export async function channelDivinityTurnTheTide({
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
  if (args[0].macroPass === 'preambleComplete') {
    if (workflow.targets.size === 0) return;
    let validTargets = [];
    for (let i of Array.from(workflow.targets)) {
      if (
        i.actor.system.attributes.hp.value >
        i.actor.system.attributes.hp.max / 2
      )
        continue;
      validTargets.push(i.id);
    }
    chrisPremades.helpers.updateTargets(validTargets);
  }
}
