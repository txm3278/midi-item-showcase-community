export async function driftglobe({
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
  const documents = [
    {
      name: 'Light (20ft + 20ft)',
      img: 'icons/magic/light/explosion-star-small-blue-yellow.webp',
      creatureName: 'Driftglobe (Light)',
    },
    {
      name: 'Daylight (60ft + 60ft)',
      img: 'icons/magic/light/beam-rays-yellow.webp',
      creatureName: 'Driftglobe (Daylight)',
    },
  ];

  const selectedItemArray = await chrisPremades.helpers.selectDocument(
    'Activate Driftglobe',
    documents,
    false
  );

  if (!selectedItemArray[0])
    return ui.notifications.warn('Driftglobe not activated!');

  const [spawn] = await warpgate.spawn(selectedItemArray[0].creatureName);

  await game.Rideable.FollowbyID([spawn], token.id);
}
