export async function infernalIchor({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
}) {
  let target = workflow.targets.first();
  let hp = target.actor.system.attributes.hp;
  let damage = workflow.damageItem.hpDamage;
  let distance = chrisPremades.helpers.getDistance(workflow.tolken, target);
  if (distance > 5) return;
  if (hp.value > damage) return;
  let effect = chrisPremades.helpers.findEffect(target.actor, 'Infernal Ichor');
  let feature = await fromUuid(effect.origin);
  let [config, options] = chrisPremades.constants.syntheticItemWorkflowOptions([
    workflow.token.document.uuid,
  ]);
  await MidiQOL.completeItemUse(feature, config, options);
}
