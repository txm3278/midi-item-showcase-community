export async function soulOfArtifice({
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
  const damageReduction =
    args[0].workflowOptions.damageTotal - actor.system.attributes.hp.value + 1;
  const imgPropName = game.version < 12 ? 'icon' : 'img';
  let effectData = {
    name: workflow.item.name,
    [imgPropName]: workflow.item.img,
    origin: workflow.item.uuid,
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'flags.midi-qol.DR.all',
        mode: 0,
        value: damageReduction,
        priority: 20,
      },
    ],
    flags: {
      dae: {
        specialDuration: ['1Reaction'],
      },
    },
  };

  const checkUser =
    game.user?.isGM || game.user?.id === MidiQOL.playerForActor(actor)?.id;
  if (checkUser) await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  else await MidiQOL.socket().executeAsGM('createEffect', actor.uuid, effectData);
}
