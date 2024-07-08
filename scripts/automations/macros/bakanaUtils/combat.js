/**
 * Adjusts damage formula to take critical hits into account if necessary.
 */
function damageFormula(workflow, formula) {
  // https://discord.com/channels/915186263609454632/1121049053497671761/1238084919893168188
  // Adjusts damage while ensuring damage multipliers are applied correctly
  const rollOptions = workflow.damageRolls[0].options;
  return new CONFIG.Dice.DamageRoll(formula, workflow.actor.getRollData(), {
    critical: workflow.isCritical || rollOptions.critical,
    criticalBonusDamage: rollOptions.criticalBonusDamage,
    criticalBonusDice: rollOptions.criticalBonusDice,
    criticalMultiplier: rollOptions.criticalMultiplier,
    multiplyNumeric: rollOptions.multiplyNumeric,
    powerfulCritical: rollOptions.powerfulCritical,
  }).formula;
}

function getCombatInfo() {
  return {
    active: game.combat?.active,
    round: game.combat?.round,
    turn: game.combat?.turn,
    id: game.combat?.id,
  };
}

function isSameTurn(combatInfo) {
  if (!game.combat) return false;
  if (combatInfo.id != game.combat.id) return false;
  if (combatInfo.round != game.combat.round) return false;
  return combatInfo.turn == game.combat.turn;
}

function isSameRound(combatInfo) {
  if (!game.combat) return false;
  if (combatInfo.id != game.combat.id) return false;
  return combatInfo.round == game.combat.round;
}

export const combatApi = {
  damageFormula,
  getCombatInfo,
  isSameTurn,
  isSameRound,
};
