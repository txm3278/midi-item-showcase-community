export async function tombOfLevistus({
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
  if (
    args[0].macroPass === 'preTargetDamageApplication' &&
    !actor.system.traits.dv.value.has('fire')
  )
    await actor.update({
      'flags.midi-item-showcase-community': {
        tol: Array.from(actor.system.traits.dv.value),
      },
      'system.traits.dv.value': Array.from(
        actor.system.traits.dv.value.add('fire')
      ),
    });

  if (args[0] === 'off') {
    const updates = { 'system.attributes.hp.temp': null };
    if (actor.flags.midi - item - showcase - community?.tol) {
      updates['system.traits.dv.value'] =
        actor.flags.midi - item - showcase - community.tol;
      updates['flags.midi-item-showcase-community.-=tol'] = null;
    }
    await actor.update(updates);
  }
}
