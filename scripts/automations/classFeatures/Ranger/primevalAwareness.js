// @bakanabaka
export async function primevalAwareness({
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
  async function postCleanup() {
    const castLevel = arguments[0].castData.castLevel;
    let effect = actor.effects.find((ef) => ef.name == scope.macroItem.name);
    await effect.update({
      'duration.rounds': 10 * castLevel,
      'duration.seconds': 60 * castLevel,
    });
  }

  
  const callArguments = {  
    speaker:    speaker,
    actor:      actor,
    token:      token,
    character:  character,
    item:       item,
    args:       args,
    scope:      scope,
    workflow:   workflow,
    options:    options
  };
  await macroUtil.runWorkflows(callArguments, {
    postCleanup: postCleanup 
  });
}
