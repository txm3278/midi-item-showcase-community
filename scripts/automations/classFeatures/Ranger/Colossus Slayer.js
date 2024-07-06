// @bakanabaka

async function preDamageRollComplete() {
    if (item.system.actionType != "mwak") return;
    if (macroUtil.combat.isSameTurn(persistentData.combat)) return;
    persistentData.combat = macroUtil.combat.getCombatInfo();

    const damageAmount = macroUtil.combat.damageFormula(workflow, '1d8');
    const damageRoll = await new Roll(damageAmount).evaluate();
    await game.dice3d?.showForRoll(damageRoll);

    workflow.damageRolls.push(damageRoll);
    await workflow.setDamageRolls(workflow.damageRolls);
}


const persistentDataName = `(Colossus Slayer) - Persistent Data`;
const defaultPersistentData = { combat : {} };
let persistentData = await DAE.getFlag(actor, persistentDataName) || defaultPersistentData;

await macroUtil.runWorkflows(arguments, {
    preDamageRollComplete : preDamageRollComplete   // damage die additions
});

await DAE.setFlag(actor, persistentDataName, persistentData);