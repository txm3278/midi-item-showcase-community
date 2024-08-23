export async function clockworkAmulet({
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
  if (args[0].macroPass === 'preAttackRoll')
    workflow.workflowOptions.attackRollDSN = false; //optional to make sure no Attack Roll dice gets rolled
  if (args[0].macroPass === 'preCheckHits') {
    const formulaData = workflow.item.getAttackToHit().parts.join('+');
    const { api } = game.modules.get('babonus');
    const getBabosAttackToHit = api
      .getType(workflow.actor, 'attack')
      .map((bab) => bab.bonuses.bonus)
      .join('+');
    let newRoll;
    if (getBabosAttackToHit)
      newRoll = await new Roll(
        `10 + ${formulaData} + ${getBabosAttackToHit}`,
        actor.getRollData()
      ).evaluate();
    else
      newRoll = await new Roll(
        `10 + ${formulaData}`,
        actor.getRollData()
      ).evaluate();
    workflow.setAttackRoll(newRoll);
    MidiQOL.displayDSNForRoll(newRoll);
  }
}
