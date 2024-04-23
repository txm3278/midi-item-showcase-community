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
  const params = args[0];
  const config = {
    size: 16,
    icon: params.item.img,
    label: 'Meteor Swarm (1/4)',
    interval: 2,
  };

  // Get meteor positions
  const positionArray = [];
  const position1 = await warpgate.crosshairs.show(config);
  if (position1.cancelled) {
    workflow.aborted = true;
    return;
  }
  config.label = 'Meteor Swarm (2/4)';
  positionArray.push(position1);
  const position2 = await warpgate.crosshairs.show(config);
  if (position2.cancelled) {
    workflow.aborted = true;
    return;
  }
  positionArray.push(position2);
  config.label = 'Meteor Swarm (3/4)';
  const position3 = await warpgate.crosshairs.show(config);
  if (position3.cancelled) {
    workflow.aborted = true;
    return;
  }
  positionArray.push(position3);
  config.label = 'Meteor Swarm (4/4)';
  const position4 = await warpgate.crosshairs.show(config);
  if (position4.cancelled) {
    workflow.aborted = true;
    return;
  }
  positionArray.push(position4);

  // For every position, see what tokens are inside, then add them to a Set so overlapping positions don't add the same token twice.
  let targets = new Set();
  for (let pos of positionArray) {
    let target = await warpgate.crosshairs.collect(pos, 'Token');
    for (let t of target) {
      targets.add(t);
    }
  }

  // Update targets
  await game.user.updateTokenTargets(Array.from(targets).map((t) => t.id));

  // Animate the explositions
  async function explosions(pos) {
    new Sequence()
      .effect()
      .file('jb2a.fireball.explosion.orange')
      .atLocation({ x: pos.x, y: pos.y })
      .size(22, { gridUnits: true })
      .play();
  }

  // The delays are just to give the animations a sense of rhythm
  await explosions(position1);
  await warpgate.wait(150);
  await explosions(position2);
  await warpgate.wait(600);
  await explosions(position3);
  await warpgate.wait(450);
  await explosions(position4);
}
