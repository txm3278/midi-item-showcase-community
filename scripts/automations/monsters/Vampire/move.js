export async function move({
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
  // Based on animation shared by Janner3D (https://discord.com/channels/915186263609454632/1187930136016859186)
  // Requires Sequencer, JB2A, D&D5E Animations (optional, for sound effect)

  const location = await Sequencer.Crosshair.show({
    label: {
      text: 'Move to',
    },
    location: {
      obj: token,
      limitMaxRange: 30,
    },
  });

  if (!location) {
    return;
  }

  new Sequence()

    .effect()
    .atLocation(token)
    .file('jb2a.bats.loop.01.red')
    .scaleToObject()
    .playbackRate(2)
    .tint('#0a0a0a')
    .fadeIn(500)
    .fadeOut(500)
    .elevation(0)

    .sound()
    .file('modules/dnd5e-animations/assets/sounds/Spells/Fear.mp3')
    .volume(0.2)
    .fadeInAudio(100)
    .fadeOutAudio(2000)
    .timeRange(800, 2850)

    .effect()
    .file('jb2a.gust_of_wind.default')
    .atLocation(token)
    .stretchTo(location)
    .elevation(0)
    .scale(1.0, 0.5)
    .playbackRate(2)
    .tint('#0a0a0a')
    .fadeIn(500)
    .fadeOut(500)

    .animation()
    .on(token)
    .fadeOut(250)
    .teleportTo(location)
    .snapToGrid()
    .waitUntilFinished(800)

    .effect()
    .file('jb2a.bats.loop.01.red')
    .atLocation(token)
    .scaleToObject()
    .playbackRate(2)
    .tint('#0a0a0a')
    .fadeIn(500)
    .fadeOut(500)

    .animation()
    .delay(1000)
    .on(token)
    .fadeIn(250)

    .play();
}
