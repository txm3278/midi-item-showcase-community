// @bakanabaka
export async function daggerOfVenomBlackPoison({
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
  async function postActiveEffects() {
    let dagger = actor.items.find((it) => it.name == 'Dagger of Venom');
    if (!dagger) return;
    let enableEffect = dagger.effects.find((ef) =>
      ef.name.includes(scope.macroItem.name)
    );
    await enableEffect.update({ disabled: false });
  }

  await macroUtil.runWorkflows(arguments, {
    postActiveEffects: postActiveEffects,
  });
}
