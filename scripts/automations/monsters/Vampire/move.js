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
  await token.document.update({ rotation: 0 });
  const distanceAvailable = 40;
  let crosshairsDistance = 0;
  const checkDistance = async (crosshairs) => {
    while (crosshairs.inFlight) {
      await warpgate.wait(100);

      const ray = new Ray(token.center, crosshairs);
      const distance = canvas.grid.measureDistances([{ ray }], {
        gridSpaces: true,
      })[0];

      if (crosshairsDistance !== distance) {
        crosshairsDistance = distance;
        if (distance > distanceAvailable) {
          crosshairs.icon = 'icons/svg/hazard.svg';
        } else {
          crosshairs.icon = 'icons/svg/target.svg';
        }

        crosshairs.draw();
        crosshairs.label = `${distance} ft`;
      }
    }
  };

  const config = {
    size: token.document.width,
    icon: 'icons/svg/target.svg',
    label: 'Move',
    tag: 'Move',
    drawIcon: true,
    drawOutline: false,
    interval: token.document.width % 2 === 0 ? 1 : -1,
  };

  const position = await warpgate.crosshairs.show(config, {
    show: checkDistance,
  });
  await new Sequence()

    .effect()
    .atLocation(token)
    .file('jb2a.bats.loop.01.red')
    .scale(0.5, 0.5)
    .playbackRate(2)
    //.tint("#0a0a0a")
    .fadeIn(500)
    .fadeOut(500)

    .sound()
    .file('modules/dnd5e-animations/assets/sounds/Spells/Fear.mp3')
    .volume(0.2)
    //.fadeInAudio(100)
    //.fadeOutAudio(2000)
    .timeRange(800, 2850)

    .effect()
    .atLocation(token)
    .stretchTo(position)
    .file('jb2a.gust_of_wind.default')
    .scale(1.0, 0.5)
    .playbackRate(2)
    .tint('#0a0a0a')
    .fadeIn(500)
    .fadeOut(500)

    .animation()
    .on(token)
    .fadeOut(250)
    .teleportTo(position)
    .snapToGrid()
    .waitUntilFinished(800)

    .effect()
    .atLocation(position)
    .file('jb2a.bats.loop.01.red')
    .scale(0.5, 0.5)
    .playbackRate(2)
    //.tint("#0a0a0a")
    .fadeIn(500)
    .fadeOut(500)

    .animation()
    .delay(1000)
    .on(token)
    .fadeIn(250)

    .play();

  token.control({ releaseOthers: true });
}
