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
  let actorName = 'Mage Hand'; //Name of the actor in the sidebar
  let duration = 60; //Duration of the summon in seconds
  let maxDistance = 30; //How far away the summon can be spawned
  let animationName = 'shadow'; //The name of the summon animation
  let updates = {
    token: {
      elevation: 3,
    },
  };

  let sourceActor = game.actors.getName(actorName); //Get the actor from the sidebar
  if (!sourceActor) return; //Bail out if the actor is not found

  await chrisPremades.tashaSummon.spawn(
    sourceActor,
    updates,
    duration,
    workflow.item,
    maxDistance,
    workflow.token,
    animationName
  ); //Call the API from this module, which will handle the rest.
}
