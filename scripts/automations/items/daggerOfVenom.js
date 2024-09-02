// @bakanabaka
export async function daggerOfVenom({
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
  async function onEffect() {
    await scope.macroItem.setFlag(
      'midi-qol',
      'onUseMacroName',
      '[postActiveEffects]ItemMacro'
    );
    let poisonEffect = scope.macroItem.effects.find(
      (ef) => ef.name == scope.macroItem.name
    );
    await poisonEffect.setFlag('dae', 'dontApply', false);

    const updates = {
      'system.formula': '2d10[poison]',
      'system.save.ability': 'con',
      'system.save.dc': 15,
    };
    await scope.macroItem.update(updates);
  }

  async function offEffect() {
    await scope.macroItem.setFlag('midi-qol', 'onUseMacroName', '');
    let poisonEffect = scope.macroItem.effects.find(
      (ef) => ef.name == scope.macroItem.name
    );
    await poisonEffect.setFlag('dae', 'dontApply', true);

    const updates = {
      'system.formula': '',
      'system.save.ability': '',
      'system.save.dc': undefined,
    };
    await scope.macroItem.update(updates);
  }

  async function postActiveEffects() {
    let enableEffect = scope.macroItem.effects.find(
      (ef) => !ef.name.includes(scope.macroItem.name)
    );
    await enableEffect.update({ Suppressed: true, disabled: true });
  }

  await macroUtil.runWorkflows(arguments, {
    on: onEffect,
    off: offEffect,
    postActiveEffects: postActiveEffects,
  });
}
