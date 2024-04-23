export async function mordenkainensSword({
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
  const actorD = game.actors.get(args[0].actor._id);
  const tokenD = canvas.tokens.get(args[0].tokenId);
  const summonName = 'Magic Sword';
  const summonerDc = actorD.system.attributes.spelldc;
  const summonerAttack = summonerDc - 8;

  let updates = {
    token: { alpha: 0 },
    embedded: {
      Item: {
        'Magic Sword Attack': {
          'system.attackBonus': `${summonerAttack}`,
        },
      },
    },
  };

  const [summon] = await warpgate.spawn(summonName, updates);

  new Sequence()
    .effect()
    .file('jb2a.magic_signs.circle.02.evocation.complete.pink')
    .atLocation(summon)
    .belowTokens()
    .scale(0.2)
    .playbackRate(2)
    .waitUntilFinished(-1000)
    .effect()
    .file('jb2a.cure_wounds.200px.pink')
    .atLocation(summon)
    .animation()
    .on(summon)
    .fadeIn(500)
    .opacity(1.0)
    .play();
}
