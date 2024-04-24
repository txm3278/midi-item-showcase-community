export async function allOrNothingArmor({
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
  // Function for parsing the damage formula and calculating maximum damage for each damage type
  function calculateMaxDamage(damageFormula) {
    // Split the formula by "+" to handle multiple damage types
    let damageParts = damageFormula.split('+').map((part) => part.trim());
    return damageParts.map((part) => {
      // Extract the dice formula and damage type
      let [diceFormula, damageType] = part.match(/(\d+d\d+)\[(.*?)\]/).slice(1);

      let diceMaxMatch = diceFormula.match(/(\d+)d(\d+)/);
      if (!diceMaxMatch) return { damage: 0, type: damageType || 'unknown' };
      let numDice = parseInt(diceMaxMatch[1]);
      let diceType = parseInt(diceMaxMatch[2]);
      let maxDiceRoll = numDice * diceType;

      return { damage: maxDiceRoll, type: damageType };
    });
  }

  // Function to retrieve and apply the correct damage multiplier for each damage type
  function applyDamageMultipliers(maxDamages, damageDetails) {
    return maxDamages.map((maxDamage) => {
      const detail = damageDetails.find(
        (detail) => detail.type === maxDamage.type
      );
      const multiplier = detail?.damageMultiplier ?? 1;
      return {
        ...maxDamage,
        damage: maxDamage.damage * multiplier, // Apply the multiplier to the damage
      };
    });
  }

  let context = args[0];
  const itemC = context.item;
  switch (context.macroPass) {
    case 'preTargetDamageApplication':
      if (
        itemC.type === 'spell' &&
        context.attackRoll === undefined &&
        context.failedSaves.length > 0 &&
        context.damageRoll != undefined
      ) {
        let maxDamages = calculateMaxDamage(context.damageRoll.formula);

        let damageDetails = context.workflow.damageItem.damageDetail[0];

        maxDamages = applyDamageMultipliers(maxDamages, damageDetails);

        context.failedSaves.forEach((tokenDocument) => {
          const token = canvas.tokens.get(tokenDocument._id);
          if (token && token.actor) {
            console.log(`${token.name} failed save.`);

            let totalAdjustedDamage = maxDamages.reduce(
              (acc, { damage }) => acc + damage,
              0
            );

            let damageItem = context.workflow.damageItem;
            damageItem.hpDamage = totalAdjustedDamage; // Applies adjusted damage to actor

            // Chat message about max damage
            let chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ token: token.actor }),
              content: `<strong>Max Damage Applied:</strong> ${token.name} takes max damage of ${totalAdjustedDamage} from ${itemC.name}.`,
            };

            ChatMessage.create(chatData).then((message) =>
              console.log('Max damage notification sent to chat.')
            );
          }
        });
      } else {
        console.log('No failed saves detected or the item is not a spell.');
      }
      break;

    case 'preTargetSave': //Give advantage on saving throws for spells that do damage
      if (itemC.type === 'spell' && context.damageRoll != undefined) {
        context.workflow.saveDetails.advantage = true;
      }
      break;
  }
}
