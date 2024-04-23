export async function wail({
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
      if (chrisPremades.helpers.raceOrType(i.actor) == 'undead') continue;
      if (chrisPremades.helpers.raceOrType(i.actor) == 'construct') continue;
      if (chrisPremades.helpers.findEffect(i.actor, 'Deafened')) continue;
      if (chrisPremades.helpers.findEffect(i.actor, 'Dead')) continue;
      validTargets.push(i.id);
    }
    chrisPremades.helpers.updateTargets(validTargets);
  }
  if (args[0].macroPass === 'postActiveEffects') {
    if (workflow.failedSaves.size === 0) return;
    let destroyTokens = [];
    for (let i of Array.from(workflow.failedSaves)) {
      destroyTokens.push(i);
      new Sequence()
        .effect()
        .atLocation(i)
        .file('jb2a.divine_smite.target.blueyellow')
        .play();
    }
    if (destroyTokens.length === 0) return;
    await chrisPremades.helpers.applyDamage(destroyTokens, '10000', 'none');
  }
}
