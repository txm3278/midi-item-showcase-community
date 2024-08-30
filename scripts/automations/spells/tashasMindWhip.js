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
  const effectImage = scope.effect.img;
  await new Promise((r) => setTimeout(r, 500));
  await MidiQOL.setReactionUsed(actor);
  if (args[0] === 'each') {
    await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Effect Reminder' },
      position: { width: 400 },
      content: `<img src="${effectImage}"><br/><br/><p>${actor.name} can’t take a reaction until the end of this turn. Moreover, on this next turn, ${actor.name} must choose whether it gets a <strong>move</strong>, an <strong>action</strong>, or a <strong>bonus action</strong>; it gets <strong>only one of the three</strong>.</p>`,
    });
  }
}
