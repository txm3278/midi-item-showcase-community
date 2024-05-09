export async function squireOfSolamniaPreciseStrike({
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
  async function refundUse(sourceActor, effectItem) {
    if (effectItem.system.uses?.value < effectItem.system.uses?.max) {
      const newValue = effectItem.system.uses.value + 1;
      const updateData = {
        _id: effectItem._id,
        system: { uses: { value: newValue } },
      };
      await sourceActor.updateEmbeddedDocuments('Item', [updateData]);

      console.log(
        'Attacked missed! refunding resource as per feature rules.',
        updateData
      );
      await ChatMessage.create(
        {
          user: game.user.id,
          content: `<b>${effectItem.name}</b><br>Attacked missed! Refunding use.`,
          speaker: ChatMessage.getSpeaker({ actor: sourceActor }),
        },
        {}
      );
    }
  }

  if (args[0] === 'off') {
    const lastArg = args[args.length - 1];
    const tokenOrActor = await fromUuid(lastArg.actorUuid);
    const targetActor = tokenOrActor.actor ? tokenOrActor.actor : tokenOrActor;
    const itemM = scope.macroItem;
    if (itemM) {
      if (!itemM.getFlag('midi-item-showcase-community', 'preciseStrikeHit')) {
        await refundUse(workflow.actor, itemM);
      }
    }
    return;
  } else if (args[0].tag === 'DamageBonus') {
    try {
      const effectItem = await fromUuid(args[0].sourceItemUuid);
      if (args[0].hitTargets.length === 0) {
        return {};
      } else {
        await effectItem.setFlag('midi-item-showcase-community', 'preciseStrikeHit', true);
        return {
          damageRoll: new CONFIG.Dice.DamageRoll(
            '1d8',
            {},
            { critical: workflow.isCritical || workflow.rollOptions.critical }
          ).formula,
          flavor: 'Precision Strike',
        };
      }
    } catch (err) {
      console.error(
        `${args[0].itemData.name} - Squire of Solamnia: Precise Strike ${version}`,
        err
      );
    }
  }
  if (
    args[0].macroPass === 'postAttackRoll' &&
    actor.effects.find(
      (e) =>
        e.name.includes('Squire of Solamnia: Precise Strike') &&
        args[0].hitTargets.length === 0
    )
  ) {
    await refundUse(workflow.actor, scope.macroItem);
  }
}
