// @bakanabaka
export async function piercer({
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
  async function getSelection(optionsObj) {
    // Header
    let selectionList = '';
    selectionList += `<tr>`;
    selectionList += `<td></td>`;
    selectionList += `<th>Damage Die</th>`;
    selectionList += `<th>Lowest Value</th>`;
    selectionList += `</tr>`;

    // Options
    for (const damageType in optionsObj)
      for (const numFaces in optionsObj[damageType]) {
        let rollValue = optionsObj[damageType][numFaces];
        let uniqueId = `${damageType}|${numFaces}|${rollValue}`;
        selectionList += `<tr>`;
        selectionList += `<td><input type="radio" id="${uniqueId}" name="selection" value=${uniqueId}></td>`;
        selectionList += `<td style="text-align: center;">d${numFaces} ${damageType}</td>`;
        selectionList += `<td style="text-align: center;">${rollValue}</td>`;
        selectionList += `</tr>`;
      }

    const title = 'Piercer';
    const content =
      `<p>Choose up to one die to reroll.</p>` +
      `<form class="flexcol"><tbody><table width="100%">` +
      selectionList +
      `</table></tbody></form>`;

    let resolution = await new Promise((resolve) => {
      new Dialog({
        title: title,
        content: content,
        buttons: {
          select: {
            label: 'Select',
            callback: () => {
              let radios = document.getElementsByTagName('input');
              for (let radio of radios) {
                if (radio.type === 'radio' && radio.checked) {
                  resolve({ cancelled: false, selection: radio.value });
                  return;
                }
              }
              resolve({ cancelled: true, selection: undefined });
            },
          },
          cancel: {
            label: 'Cancel',
            callback: () => {
              resolve({ cancelled: true, selection: undefined });
            },
          },
        },
        default: 'Cancel',
        callback: () => {
          resolve({ cancelled: true, selection: undefined });
        },
      }).render(true);
    });

    return resolution;
  }

  async function reroll(damageRolls) {
    // Create the Minimal Roll Table
    // { type : { sides : minimumRoll } }
    let minimumRollTable = {};
    for (let damageRoll of damageRolls) {
      // we appear to be in the workflow stage that simultaneously sets the default damage for any undefined damage.
      // set it here ourselves so we don't get undefined behavior
      let attackType = damageRoll.options.type
        ? damageRoll.options.type
        : workflow.damageDetail[0].type;

      // update minimumRollTable
      let damageType = minimumRollTable[attackType] || {};
      for (let term of damageRoll.terms) {
        if (!term.results) continue; // does not contain a die roll
        let results = term.results.map((die) => die.result);
        damageType[term.faces] = Math.min(
          ...results,
          damageType[term.faces] || term.faces
        );
      }
      minimumRollTable[attackType] = damageType;
    }

    //                    Piercer
    //            Choose a Die to Reroll
    //    Damage Type   |    Die Type    | Minimum Rolled
    //  O  radiant      |       d8       |      7
    //  X  piercing     |       d8       |      2
    //  O  piercing     |       d6       |      4
    //
    //      > Select <           |       Cancel
    let option = await getSelection(minimumRollTable);
    if (option.cancelled) return false;
    let [damageType, dieFaces, dieValue] = option.selection.split('|');

    for (let i = 0; i < damageRolls.length; ++i) {
      let damageRoll = damageRolls[i];
      if (
        (damageRoll.options.type || workflow.damageDetail[0].type) != damageType
      )
        continue; // wrong damage

      for (let j = 0; j < damageRoll.terms.length; ++j) {
        let term = damageRoll.terms[j];
        if (!term.results) continue; // does not contain a die roll
        if (term.faces != Number(dieFaces)) continue; // wrong type of die
        if (!term.results.find((die) => die.result == dieValue)) continue; // couldn't find the rolled value

        for (let k = 0; k < term.results.length; ++k) {
          let dieRoll = term.results[k];
          if (dieRoll.result != dieValue) continue;
          // Roll a new die to replace old one
          const damageAmount = `1d${dieFaces}`;
          const newDamageRoll = await new Roll(damageAmount).evaluate();
          await game.dice3d?.showForRoll(newDamageRoll);

          let newDieRoll = newDamageRoll.terms[0].results[0];

          // Overwrite with new die roll
          damageRolls[i].terms[j].results[k] = newDieRoll;

          // Adjust roll damage
          const rollDelta = newDieRoll.result - dieValue;
          damageRolls[i]._total += rollDelta;

          // Set workflow damageRolls
          await workflow.setDamageRolls(damageRolls);
          return true;
        }
      }
    }

    throw Error(
      `Did the damageRolls change underneith me? Attempting to reroll a 1d${dieFaces} with value ${dieValue} but none exist.`
    );
  }

  function maximalDie(dieRolls) {
    let maximal = 0;
    for (let roll of dieRolls) {
      let dieUsed = roll.formula.split(' ').filter((op) => op.includes('d'));
      const values = dieUsed.map((die) => Number(die.split('d')[1]));
      maximal = Math.max(Math.max(...values), maximal);
    }
    return maximal;
  }

  async function preDamageRollComplete() {
    let piercingDamage = workflow.damageRolls.filter(
      (roll) => roll?.options.type == 'piercing'
    );
    if (!piercingDamage.length) return;

    // Additional damage die
    if (workflow.isCritical) {
      const damageAmount = `1d${maximalDie(workflow.damageRolls)}[piercing]`;
      const damageRoll = await new Roll(damageAmount).evaluate();
      await game.dice3d?.showForRoll(damageRoll);

      workflow.damageRolls.push(damageRoll);
      await workflow.setDamageRolls(workflow.damageRolls);
    }
  }

  async function postDamageRoll() {
    let piercingDamage = workflow.damageRolls.filter(
      (roll) => roll?.options.type == 'piercing'
    );
    if (!piercingDamage.length) return;

    if (macroUtil.combat.isSameTurn(persistentData.combat)) return;
    if (!(await reroll(workflow.damageRolls))) return;

    persistentData.combat = macroUtil.combat.getCombatInfo();
  }

  const persistentDataName = `(Piercer) - Persistent Data`;
  const defaultPersistentData = { combat: {} };
  let persistentData =
    (await DAE.getFlag(actor, persistentDataName)) || defaultPersistentData;

  const callArguments = {
    speaker:    speaker,
    actor:      actor,
    token:      token,
    character:  character,
    item:       item,
    args:       args,
    scope:      scope,
};
  await macroUtil.runWorkflows(callArguments, {
    preDamageRollComplete: preDamageRollComplete, // damage die additions
    postDamageRoll: postDamageRoll, // damage die replacement effect
  });

  await DAE.setFlag(actor, persistentDataName, persistentData);
}
