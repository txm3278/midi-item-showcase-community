export async function spiritTotemBearSpirit({
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
  if (args[0].macroPass === 'templatePlaced') {
    game.user.updateTokenTargets(
      args[0].targets
        .filter(
          (tok) =>
            tok.disposition ==
            canvas.tokens.get(args[0].tokenId).document.disposition
        )
        .map((i) => i.id)
    );
  }
  if (args[0].macroPass === 'preActiveEffects') {
    return await game.modules
      .get('ActiveAuras')
      .api.AAHelpers.applyTemplate(args);
  }
}
