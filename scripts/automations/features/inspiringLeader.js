export async function inspiringLeader({
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
  game.user.updateTokenTargets(
    workflow.targets
      .filter(
        (t) =>
          !t.actor.appliedEffects.some((e) => e.name === `Inspiring Leader`)
      )
      .map((i) => i.id)
  );
}
