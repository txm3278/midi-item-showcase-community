export async function setupActors() {
  let folder = game.folders.find(
    (i) => i.name === 'Midi Item Showcase - Community' && i.type === 'Actor'
  );
  if (!folder) {
    folder = await Folder.create({
      name: 'Midi Item Showcase - Community',
      type: 'Actor',
      color: '#018e5f',
    });
  }
  const actorsCompendium = game.packs.get(
    'midi-item-showcase-community.misc-actors'
  );
  if (!actorsCompendium) return;
  const documents = await actorsCompendium.getDocuments();
  if (documents.length === 0) return;
  for (const actor of documents) {
    if (folder.contents.find((act) => act.name === actor.name)) {
      continue;
    }
    let actorData = actor.toObject();
    actorData.folder = folder.id;
    await Actor.create(actorData);
  }
}
