async function preItemRoll() {
    let huntersMark = macroItem.effects.find(ef => ef.name == macroItem.name);
    let originalCast = !(await macroUtil.effect.find(actor, huntersMark));

    if (!originalCast) {
        let formerPrey = canvas.tokens.get(persistentData.targetTokenId);
        let formerPreyRollData = formerPrey?.actor.getRollData();
        if (!formerPrey || !formerPreyRollData.attributes.hp.value) {
            // Turn off all consumption (manual) and chatbox creation (remove clutter)
            macroUtil.item.setPreUseItemConfig(macroItem,
                {beginConcentrating : null, consumeSpellSlot : null},
                {createMessage : false}
            );
            return;
        }
    }

    // In preItemRoll we don't know the level of the spell yet, set to default
    persistentData.duration = 0;
}

async function postRollFinished(midiArgs) {
    let concentration = actor.effects.find(ef => ef.name == `Concentrating: ${macroItem.name}`);
    let huntersMark = macroItem.effects.find(ef => ef.name == macroItem.name);
    if (!persistentData.duration) {
        let castlevel = midiArgs.castData?.castLevel;
        let hours = (castlevel >= 5) ? 24 : ((castlevel >= 3) ? 8 : 1);
        persistentData.duration = hours * 600; // 600 turns per hour

        //let markEffect = await macroUtil.effect.create(actor, huntersMark, concentration);
        console.warn("concentration", concentration);
        //console.warn("target mark",  markEffect);
        await concentration.update({ "duration.rounds"  : persistentData.duration });
        //await markEffect.update({ "duration.rounds"  : persistentData.duration });
    }

    // Personalize hunter's mark
    let markedTarget = duplicate(macroItem.effects.find(ef => ef.name == `${macroItem.name}:`));
    markedTarget.name += " " + actor.name;

    // Remove hunter's mark from former target
    let formerTargetId = persistentData.targetTokenId;
    let formerTargetActor = canvas.tokens.get(formerTargetId)?.actor;
    await macroUtil.effect.remove(formerTargetActor, markedTarget);

    // Apply hunter's mark to new target
    let targetActor = workflow.targets.first().actor;
    let markEffect = await macroUtil.effect.create(targetActor, markedTarget, huntersMark);
    persistentData.targetTokenId = workflow.targets.first().id;

    // Update hunter's mark duration
    await markEffect.update({ "duration.rounds"  : persistentData.duration });
}

async function preDamageRollComplete() {
    if (rolledItem.type != "weapon") return;
    let targetId = workflow.targets.first().id;
    if (targetId != persistentData.targetTokenId) return; // not our target
    // really the Active Effect on the target is just for visual description

    // Add Hunter's Mark damage
    const damageAmount = macroUtil.combat.damageFormula(workflow, '1d6');
    const damageRoll = await new Roll(damageAmount).evaluate();
    await game.dice3d?.showForRoll(damageRoll);

    workflow.damageRolls.push(damageRoll);
    await workflow.setDamageRolls(workflow.damageRolls);
}

const persistentDataName = `(Hunter's Mark) - Persistent Data`;
const defaultPersistentData = { targetTokenId : undefined, duration : undefined };
let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;

await macroUtil.runWorkflows(arguments, {
    preItemRoll  : preItemRoll,
    preDamageRollComplete  : preDamageRollComplete,
    postRollFinished :  postRollFinished,
});

await DAE.setFlag(actor, persistentDataName, persistentData);