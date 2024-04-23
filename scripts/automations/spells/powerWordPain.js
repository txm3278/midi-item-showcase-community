export async function powerWordPain({
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
  const params = args[0];
  const item = params.item;
  if (item.type != 'spell') return;
  const sourceToken = canvas.tokens.get(params.tokenId);
  const originEffect = await params.actor.effects.find(
    (ef) => ef.label === 'Power Word Pain'
  );
  const originItem = await fromUuid(originEffect.origin);

  let actorSave = await params.actor.rollAbilitySave('con');
  if (actorSave.total >= originItem.system.save.dc) {
    return;
  } else {
    await ChatMessage.create({
      content: `<i><strong>${sourceToken.name}</strong> is too wracked with pain to cast the spell!</i>`,
    });
    this.aborted = true;
    await game.user.updateTokenTargets();
  }
  Hooks.once('AutomatedAnimations-WorkflowStart', (data) => {
    data.stopWorkflow = true;
  });
}
