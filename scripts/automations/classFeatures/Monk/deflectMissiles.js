export async function deflectMissiles({
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
  if (args[0].macroPass == 'preItemRoll') {
    workflow.config.consumeResource = null;
  }
  const deflectMsg = workflow.chatCard;
  const DIV = document.createElement('DIV');
  DIV.innerHTML = deflectMsg.content;
  const deflectRoll = await new Roll(
    '1d10 + @abilities.dex.mod + @classes.monk.levels',
    actor.getRollData()
  ).evaluate();

  const msg = await deflectRoll.toMessage(
    { flavor: DIV.innerHTML },
    { create: false }
  );
  const newMessage = duplicate(msg);
  newMessage._id = deflectMsg._id;
  const deflectRollMsg = await ChatMessage.updateDocuments([newMessage]);

  const effectData = {
    changes: [
      { key: 'flags.midi-qol.DR.all', mode: 0, value: deflectRoll.total },
    ],
    icon: 'icons/skills/ranged/arrow-flying-white-blue.webp',
    duration: { rounds: 1 },
    name: 'Damage Reduction - Deflect Missiles',
    origin: item.uuid,
    flags: { dae: { specialDuration: ['isDamaged', 'isAttacked'] } },
  };
  await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
  if (deflectRoll.total >= args[0].workflowOptions.damageTotal) {
    let throwBack = false;
    if (actor.items.get(scope.macroItem.system.consume.target).system.uses.value) {
      throwBack = await Dialog.confirm({
        title: game.i18n.localize('Return Missile'),
        content: `<p>Throw the missile back at the attacker</p>`,
      });
    }
    if (!throwBack) {
      await actor.createEmbeddedDocuments('Item', [
        fromUuidSync(
          workflow.workflowOptions.sourceAmmoUuid ??
            workflow.workflowOptions.sourceItemUuid
        ).clone({ 'system.quantity': 1 }),
      ]);
    } else {
      const theItem = await fromUuid(
        workflow.workflowOptions.sourceAmmoUuid ??
          workflow.workflowOptions.sourceItemUuid
      );
      const theItemData = theItem.toObject();
      theItemData.system.range.value = 20;
      theItemData.system.range.long = 60;
      theItemData.system.actionType = 'rwak';
      theItemData.system.uses = {
        autoDestroy: true,
        max: 1,
        per: 'charges',
        prompt: false,
        value: 1,
      };
      theItemData.system.consume = {
        type: 'charges',
        target: scope.rolledItem.system.consume.target,
        amount: 1,
        scale: false,
      };
      theItemData.system.attack.bonus = '@prof';
      theItemData.system.proficient = 0;
      theItemData.system.consume.amount = 1;
      setProperty(theItemData.system.damage, 'parts', [
        [
          '1@scale.monk.die + @mod',
          theItem.system.damage?.parts[0]?.[1] ?? 'bludgeoning',
        ],
      ]);
      const theActor = workflow.actor;
      const ownedItem = new CONFIG.Item.documentClass(theItemData, {
        parent: theActor,
      });
      const targetTokenOrActor = await fromUuid(
        workflow.workflowOptions.sourceActorUuid
      );
      const targetActor = targetTokenOrActor.actor ?? targetTokenOrActor;
      const target = MidiQOL.tokenForActor(targetActor);
      ownedItem.prepareFinalAttributes();
      await MidiQOL.completeItemUse(
        ownedItem,
        {},
        {
          targetUuids: [target.document.uuid],
          workflowOptions: { notReaction: false, autoConsumeResource: 'both' },
        }
      );
    }
  }
}
