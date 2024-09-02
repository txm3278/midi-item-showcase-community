export async function mageHand({
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
  let sourceActor = game.actors.getName('Mage Hand');
  let duration = 60; //Seconds
  let range = 30; //feet
  await chrisPremades.Summons.spawn(
    [sourceActor],
    undefined,
    workflow.item,
    workflow.token,
    { duration: duration, range: range, animation: 'default' }
  );
}
