export async function powerWordKill({
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
  /* Version: 1.1.0
   * Creator: Fridan99
   * Colaborator: thatlonelybugbear (help improving the macro)
   * Target an enemy, and the macro auto-detects how many current hit points has the target. If higher to 100, then the GM receives a green card (the spell doesn't nothing), if fewer or equal to 100, then the GM receives a red card (the spell autoreduce to 0 hit points the target)
   * The macro auto-detects if the target has an active DAE effect called "Death Ward" spell. So you can create a DAE effect, put Duration: 28800, Details: active Always Show Effect Icon. If the effect of Death Ward is active, then prevent the Power Word Kill, and the effect dissapears.
   */

  // Power Word Kill Macro

  // Get the targeted token
  const target = workflow.targets.first();
  const targetActor = target.actor;

  // Check the current hit points of the targeted token
  const targetHP = targetActor.system.attributes.hp.value;

  // Check if the targeted token has the "Death Ward" effect
  const deathWardEffect = targetActor.appliedEffects.find(
    (e) => e.name === 'Death Ward'
  );

  // Determine the message and action based on the current hit points and "Death Ward" effect
  let message;
  let color;
  if (targetHP > 100) {
    message = `The spell doesn't do anything because the targeted token <strong>${target.name}</strong> has more than 100 hit points (<strong style="color:white;">${targetHP} current HP</strong>).`;
    color = '#4CAF50'; // Green
  } else if (deathWardEffect) {
    // The token has the "Death Ward" effect, so prevent the damage and remove the effect
    await MidiQOL.socket().executeAsGM('removeEffects', {
      actorUuid: targetActor.uuid,
      effects: [deathWardEffect.id],
    });
    message = `The token <strong>${target.name}</strong> prevents to die, and the Death Ward spell is lost.`;
    color = '#4CAF50'; // Green
  } else {
    // Reduce the token's hit points to 0 using MidiQOL
    const damage = targetHP + (targetActor.system.attributes.hp.temp ?? 0);
    await MidiQOL.applyTokenDamage(
      [{ damage, type: 'necrotic' }],
      damage,
      new Set([target]),
      scope.rolledItem,
      new Set(),
      { forceApply: true }
    );
    message = `The token <strong>${target.name}</strong> dies because it has less than 100 hit points (<strong style="color:white;">${targetHP} current HP</strong>).`;
    color = '#F44336'; // Red
  }

  // Create the chat card
  const chatCard = `
<div style="border-radius: 8px; padding: 16px; background-color: ${color}; color: white; font-family: Arial, sans-serif;">
  <h3 style="margin-top: 0;">Power Word: Kill</h3>
  <p>${message}</p>
</div>
`;

  // Whisper the chat card to the GM
  ChatMessage.create({
    content: chatCard,
    whisper: [game.users.find((u) => u.isGM).id],
  });
}
