export async function bite({
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
  const { damage, damageMultiplier } =
    workflow.damageItem.damageDetail[0].find((d) => d.type === 'necrotic') ||
    {};
  if (damage && workflow.hitTargets.size === 1) {
    const dmgToApply = Math.floor(damage * damageMultiplier);
    await MidiQOL.applyTokenDamage(
      [
        {
          damage: dmgToApply,
          type: 'healing',
        },
      ],
      dmgToApply,
      new Set([token]),
      null,
      null
    );
  }
}
