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
  // @sayshal    - Original Author
  // @bakanabaka - Rewrite for extra functionality

  const macroItem = scope.macroItem;
  let config = {
    t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE,
    distance: 40,
    fillColor: 'red',
    icon: {
      texture: macroItem.img,
      borderVisible: false,
    },
    snap: {
      position:
        CONST.GRID_SNAPPING_MODES.CENTER |
        CONST.GRID_SNAPPING_MODES.EDGE_MIDPOINT |
        CONST.GRID_SNAPPING_MODES.VERTEX,
    },
    lockDrag: true,
    label: {
      text: 'Meteor Swarm (X/4)',
    },
    location: {
      limitMaxRange: 5280,
      showRange: true,
    },
  };

  async function postPreambleComplete() {
    let targetSet = new Set();
    let templateSet = new Set();
    let positionSet = new Set();
    for (let idx = 0; idx < 4; ++idx) {
      config.label.text = `Meteor Swarm (${idx + 1}/4)`;
      let position = await Sequencer.Crosshair.show(config);
      if (!position) break;
      positionSet.add(position);
      let circle = await macroUtil.template.circle(position, 40);
      templateSet.add(circle);
      let targets = macroUtil.template.targets(circle);
      for (let target of targets) targetSet.add(target);
    }

    workflow.meteorSwarmPositions = positionSet;
    workflow.aborted = templateSet.size == 0;
    for (let t of templateSet) t.delete();
    game.user.updateTokenTargets(targetSet.map((t) => t.id));
  }

  async function postDamageRoll() {
    // Animate the explosions
    async function explosions(pos) {
      new Sequence()
        .effect()
        .file('jb2a.fireball.explosion.orange')
        .atLocation(pos)
        .scaleToObject(1.5)
        .play();
      if (game.modules.getName('dnd5e-animations')) {
        const audio_cfg = {
          src: 'modules/dnd5e-animations/assets/sounds/Damage/Explosion/explosion-echo-5.mp3',
          volume: 0.5,
          autoplay: true,
          loop: false,
        };
        AudioHelper.play(audio_cfg, false);
      }
    }

    // The delays are just to give the animations a sense of rhythm
    let positions = workflow.meteorSwarmPositions;
    for (let position of positions) {
      await explosions(position);
      await Sequencer.Helpers.wait(Math.floor(Math.random() * 750));
    }
  }

  const callArguments = {
    speaker: speaker,
    actor: actor,
    token: token,
    character: character,
    item: item,
    args: args,
    scope: scope,
  };
  await macroUtil.runWorkflows(callArguments, {
    postPreambleComplete: postPreambleComplete,
    postDamageRoll: postDamageRoll,
  });
}
