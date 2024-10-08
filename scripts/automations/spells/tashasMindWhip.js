export async function tashasMindWhip({
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
  if (args[0] === 'each') {
    const effectImage = scope.effect.img;
    await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Effect Reminder' },
      position: { width: 400 },
      content: `<img src="${effectImage}"><br/><br/><p>${token.actor.name} can’t take a reaction until the end of this turn. Moreover, on this next turn, ${token.actor.name} must choose whether it gets a <strong>move</strong>, an <strong>action</strong>, or a <strong>bonus action</strong>; it gets <strong>only one of the three</strong>.</p>`,
    });
  }
}
