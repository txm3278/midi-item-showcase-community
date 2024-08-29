export async function slow({
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
  const effectImage = effect.img;
  if (args[0] === 'each') {
    await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Effect Reminder' },
      position: { width: 400 },
      content: `<img src="${effectImage}"><br/><br/>${actor.name} can use either an action or a bonus action, not both. Regardless of the creature's abilities or magic items, it can't make more than one melee or ranged attack during its turn.`,
    });
  }
}
