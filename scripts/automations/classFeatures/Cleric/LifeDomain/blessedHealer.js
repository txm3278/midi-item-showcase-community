export async function blessedHealer({
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
  try {
    if (args[0].itemData.type !== 'spell') return;
    // no healing done?
    if (!args[0].damageList?.some((li) => li.oldHP < li.newHP)) return;
    // only targets self?

    if (!args[0].hitTargetUuids.some((uuid) => uuid !== args[0].tokenUuid))
      return;
    // await (new Promise(resolve => setTimeout(resolve, 100)))

    const tactor = await fromUuid(args[0].actorUuid);
    const spellLevel = args[0].spellLevel;
    const numHeal = 2 + spellLevel;
    ChatMessage.create({
      content: `${tactor.name} cures ${numHeal} HP of bonus healing`,
    });
    await MidiQOL.applyTokenDamage(
      [{ type: 'healing', damage: numHeal }],
      numHeal,
      new Set([tactor]),
      null,
      new Set(),
      { forceApply: false }
    );
  } catch (err) {
    console.error(`${args[0].itemData.name} - Blessed Healer`, err);
  }
}
