export async function shieldOfMissileAttraction({
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
  //ItemMacro, isAttacked
  if (args[0].macroPass === 'isAttacked') {
    // Check if ranged weapon attack
    let actionType = workflow.item.system.actionType;
    if (actionType === 'rwak') {
      // Get token wielding the shield
      let tokenN = item.parent.token ?? item.parent.getActiveTokens()[0];

      // Swap original target for wielding token
      workflow.targets.delete(token);
      workflow.targets.add(tokenN);

      // Simulate attack for new target
      const dummyWorkflow = await new MidiQOL.DummyWorkflow(
        workflow.actor,
        workflow.item,
        ChatMessage.getSpeaker({ token: token.document }),
        new Set([tokenN])
      ).simulateAttack(tokenN);

      // Get advantage/disadvantage, if both cancel out
      let { advantage: oldAdv, disadvantage: oldDis } = workflow;
      let { advantage: newAdv, disadvantage: newDis } = dummyWorkflow;
      if (newAdv && newDis) {
        newAdv = false;
        newDis = false;
      }

      // Get original roll
      let oldRoll = workflow.attackRoll;
      let originalD20 = oldRoll.terms[0].results;

      // Roll new attack
      let newRoll = await workflow.item.rollAttack({
        fastForward: true,
        chatMessage: false,
        isDummy: true,
        advantage: newAdv,
        disadvantage: newDis,
      });

      // Replace new roll with old roll
      newRoll.terms[0].results[0].result = originalD20[0].result;
      if (newAdv || newDis) {
        // If original & new both have 2d20 replace the 2nd roll
        if (oldAdv || oldDis) {
          newRoll.terms[0].results[1].result = originalD20[1].result;
        }
      }
      for (let i = 1; i < oldRoll.terms.length; i++) {
        let oldTerm = oldRoll.terms[i];

        // If term was temp, add to formula
        if (!newRoll.terms[i]) {
          newRoll._formula += oldTerm.expression;
        }
        newRoll.terms[i] = oldTerm;
      }

      // Calc new total and apply
      newRoll._total = eval(newRoll.result);
      await workflow.setAttackRoll(newRoll);
    }
  }

  //Missile Resistance
  //ItemMacro, isDamaged
  if (args[0].macroPass === 'isHit') {
    let actionType = workflow.item.system.actionType;

    if (actionType === 'rwak') {
      // Get target token/actor
      let token = workflow.targets?.first();
      let target = token.actor;

      // Create a resistance effect
      let effectData = {
        changes: [
          {
            key: 'system.traits.dr.all',
            mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
            value: 1,
            priority: 20,
          },
        ],
        flags: {
          dae: { specialDuration: ['isDamaged'], stackable: 'noneName' },
        },
        name: 'Missile Resistance',
        origin: target.uuid,
      };

      // Apply the effect
      await MidiQOL.socket().executeAsGM('createEffects', {
        actorUuid: target.uuid,
        effects: [effectData],
      });
    }
  }
}
