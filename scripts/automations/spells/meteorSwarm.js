export async function meteorSwarm({
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
  const config = {
    gridHighlight: true,
    icon: {
      texture: workflow.item.img,
      borderVisible: false,
    },
    snap: {
      size: 16,
    },
    lockDrag: true,
    label: {
      text: 'Meteor Swarm (1/4)',
    },
    location: {
      obj: null,
      limitMinRange: null,
      limitMaxRange: 5280,
      showRange: false,
      lockToEdge: false,
      lockToEdgeDirection: false,
      offset: {
        x: null,
        y: null,
      },
      wallBehavior: 'sight',
    },
    lockManualrotation: true,
  };
  const cancelled = {
    [Sequencer.Crosshair.CALLBACKS.CANCEL]: () => {
      workflow.aborted = true;
      return;
    },
  };

  // Get meteor positions
  const positionArray = [];

  await workflow.actor.sheet.minimize();
  const position1 = await Sequencer.Crosshair.show(config, cancelled);
  positionArray.push(position1);

  config.label.text = 'Meteor Swarm (2/4)';
  const position2 = await Sequencer.Crosshair.show(config, cancelled);
  positionArray.push(position2);

  config.label.text = 'Meteor Swarm (3/4)';
  const position3 = await Sequencer.Crosshair.show(config, cancelled);
  positionArray.push(position3);

  config.label.text = 'Meteor Swarm (4/4)';
  const position4 = await Sequencer.Crosshair.show(config, cancelled);
  positionArray.push(position4);

  // For every position, see what tokens are inside, then add them to a Set so overlapping positions don't add the same token twice.
  let targets = new Set();

  for (let pos of positionArray) {
    let target = await Sequencer.Crosshair.collect(pos, 'Token');
    for (let t of target) {
      targets.add(t);
    }
  }

  // Update targets
  await game.user.updateTokenTargets(Array.from(targets).map((t) => t.id));

  // Animate the explositions
  async function explosions(pos) {
    /*   let explosionSound = '';
    if (game.modules.get('dnd5e-animations')?.active) {
      explosionSound = 'modules/dnd5e-animations/assets/sounds/Damage/Explosion/explosion-echo-5.mp3';
    } */
    new Sequence()
      .effect()
      .file('jb2a.fireball.explosion.orange')
      .atLocation({ x: pos.x, y: pos.y })
      //  .sound()
      //  .file(explosionSound)
      .play();
  }

  // The delays are just to give the animations a sense of rhythm
  await explosions(position1);
  await Sequencer.Helpers.wait(150);
  await explosions(position2);
  await Sequencer.Helpers.wait(600);
  await explosions(position3);
  await Sequencer.Helpers.wait(450);
  await explosions(position4);

  await workflow.actor.sheet.maximize();
}
