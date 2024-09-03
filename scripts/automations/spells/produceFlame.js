// @bakanabaka

export async function produceFlame({
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
  const macroItem = scope.macroItem;

  async function preTargeting() {
    let produceFlameEffect = macroItem.effects.find(
      (ef) => ef.name == 'Produce Flame'
    );
    if (!workflow.targets.size) {
      const updates = {
        system: { target: { value: null, units: null, type: 'self' } },
      };
      workflow.item = await macroUtil.item.syntheticItem(
        workflow.item,
        actor,
        updates
      );
      produceFlameEffect.update({ disabled: !produceFlameEffect.disabled });
    }
  }

  async function preItemRoll() {
    if (!workflow.targets.size) {
      workflow.aborted = true;
    }
  }

  async function postAttackRoll() {
    let produceFlameEffect = macroItem.effects.find(
      (ef) => ef.name == 'Produce Flame'
    );
    if (produceFlameEffect) produceFlameEffect.update({ disabled: true });
  }

  const callArguments = {
    speaker: speaker,
    actor: actor,
    token: token,
    character: character,
    item: item,
    args: args,
    scope: scope,
  };
  await macroUtil.runWorkflows(callArguments, {
    preTargeting: preTargeting,
    preItemRoll: preItemRoll,
    postAttackRoll: postAttackRoll,
  });
}
