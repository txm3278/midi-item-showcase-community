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
  const effectImage = scope.effect.img;
  if (args[0] === 'each') {
    await foundry.applications.api.DialogV2.prompt({
      window: { title: 'Effect Reminder' },
      position: { width: 400 },
      content: `<img src="${effectImage}">
        
        ${actor.name} can use an Action OR a Bonus Action.
        
        <br>
        
        Can only make ONE attack.
        
        <br>
        
        Cannot take Reactions.
        
        <br>
        
        When casting a (1-Action) spell, roll a d20.
        
        <hl>
        
        Automatically applied:
        
        <ul style="margin: 0;">
        <li>1/2 Speed</li>
        <li>-2 to AC</li>
        <li>-2 to Dex Saves</li>
        </ul>`,
    });
  }
}
