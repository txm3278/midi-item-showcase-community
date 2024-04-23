export async function spellStoring({
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
  if (!game.modules.get('warpgate').active) {
    ui.notifications.error('This macro requires Warp Gate!');
  }
  const listSource = canvas.tokens.controlled[0].actor;
  const levelFormat = (spell) => {
    if (spell.system.level === 0) {
      return spell.name + ' (Cantrip)';
    } else if (spell.system.level === 1) {
      return spell.name + ' (1st)';
    } else if (spell.system.level === 2) {
      return spell.name + ' (2nd)';
    } else if (spell.system.level === 3) {
      return spell.name + ' (3rd)';
    } else if (spell.system.level === 4) {
      return spell.name + ' (4th)';
    }
  }; // format warp gate menu
  const currentSpells = actor.items
    .filter((a) => a.type == 'spell')
    .map((a) => a.id); // grab current spell list and format to array
  const menuButtons = [
    { label: 'Cancel', value: false },
    { label: 'OK', value: true },
  ]; // set up menus
  const secondMenuButtons = [
    { label: 'No', value: false },
    { label: 'Yes', value: true },
  ]; // set up menus
  const spells = listSource.items
    .filter(
      (a) =>
        a.type == 'spell' &&
        a.system.level <= 4 &&
        (a.system.level == 0 ||
          a.system.preparation.prepared == true ||
          a.system.preparation.mode == 'atwill' ||
          a.system.preparation.mode == 'pact')
    )
    .map((a) => {
      // grab various states of spell prep incl. items on spells
      if (a.system.uses.max == '') {
        return {
          html: levelFormat(a),
          value: [
            a.id,
            a.system.level,
            a.system.preparation.mode,
            a.system.scaling,
          ],
        };
      } else if (a.system.uses.max != '') {
        return {
          html: a.name,
          value: [a.id, 'uses', a.system.preparation.mode, a.system.scaling],
        };
      }
      return a;
    })
    .sort(function (a, b) {
      if (a.html < b.html) {
        return -1;
      }
      if (a.html > b.html) {
        return 1;
      }
      return 0;
    }); // sort alphabetically
  const chosenSpell = await warpgate.menu(
    {
      // pick a spell
      inputs: [
        {
          type: 'info',
          label:
            '<p align="center">The golem stands still, helmet looking straight ahead...<br />Source: ' +
            listSource.name +
            '</p>',
        },
        {
          type: 'select',
          label: 'Select a spell to store',
          options: spells,
        },
      ],
      buttons: menuButtons,
    },
    {
      title: 'Spell Storing',
    }
  );

  const spellFromList = listSource.items.filter(
    (a) => a.id == chosenSpell.inputs[1][0]
  )[0]; // generate array
  const spellLevel = spellFromList.system.level; // grab spell level for slots
  let toCreate = []; // empty array for embeddedDocuments
  let clone = structuredClone(spellFromList);
  toCreate.push(clone);

  if (chosenSpell.buttons == false) {
    // set behavior for menu disposition beginning with no spell selected
    ui.notifications.info('No spell selected.');
    return;
  } else if (
    chosenSpell.buttons == true &&
    chosenSpell.inputs[1][1] == 'pact'
  ) {
    // check for pact slots
    if (listSource.system.spells.pact.value < 1) {
      ui.notifications.warn('Not enough pact magic slots!');
      return;
    }
  } else if (
    chosenSpell.buttons == true &&
    chosenSpell.inputs[1][1] == 'uses'
  ) {
    // check for item uses
    if (spellFromList.system.uses.value < 1) {
      ui.notifications.warn('Not enough item uses!');
      return;
    }
  } else {
    // check for spell slots
    if (listSource.system.spells['spell' + spellLevel] < 1) {
      ui.notifications.warn('Not enough spell slots!');
      return;
    }
  }

  if (chosenSpell.inputs[1][3].mode != 'none') {
    // do we want to upcast this spell?
    const upcastSlots = Object.keys(listSource.system.spells)
      .filter(
        (a) =>
          a.charAt(5) != '0' &&
          listSource.system.spells[a].value > 0 &&
          Number(a.charAt(5)) > spellLevel
      )
      .map((a) => {
        if (a != 'pact') {
          return {
            html: 'Level ' + a.charAt(5),
            value: [Number(a.charAt(5)), listSource.system.spells[a].value],
          };
        } else if (a === 'pact') {
          return {
            html: 'Spell uses Pact Magic',
            value: [
              Number(listSource.system.spells[a].level),
              listSource.system.spells[a].value,
            ],
          };
        }
        return a;
      });
    console.log(upcastSlots);
    const upcastSelector = await warpgate.menu(
      {
        inputs: [
          {
            type: 'info',
            label:
              '<p align="center">Do you want to upcast this spell?<br /><b>Always</b> select pact magic option if you are a Warlock.</p>',
          },
          {
            type: 'select',
            label: 'Select an upcast level<br />Spell level: ' + spellLevel,
            options: upcastSlots,
          },
        ],
        buttons: secondMenuButtons,
      },
      {
        title: 'Spell Storing',
      }
    );
    toCreate[0].system.level = upcastSelector.inputs[1][0];
  }

  toCreate[0].system.components.vocal = false;
  toCreate[0].system.components.somatic = false;
  toCreate[0].system.components.material = false;
  toCreate[0].system.components.ritual = false;
  toCreate[0].system.materials.consumed = false;
  toCreate[0].system.materials.cost = 0;
  toCreate[0].system.materials.supply = 0;
  toCreate[0].system.materials.value = '';
  toCreate[0].system.preparation.mode = 'atwill';
  toCreate[0].system.preparation.prepared = true;
  toCreate[0].system.uses.max = 1;
  toCreate[0].system.uses.value = 1;
  toCreate[0].system.uses.prompt = true;
  toCreate[0].system.uses.per = 'charges';

  if (spellFromList.system.preparation.mode == 'pact') {
    // decrement spell slots
    let levelUsed = getProperty(listSource.data.data, spells.pact.value);
    await listSource.update({
      [system.spells.pact.value]: Math.abs(levelUsed - 1),
    });
  } else if (spellFromList.system.uses.value !== null) {
    spellFromList.system.uses.value--;
  } else if (spellLevel != 0) {
    let levelUsed = getProperty(
      listSource.data.data,
      `spells.spell${toCreate[0].system.level}.value`
    );
    await listSource.update({
      [`system.spells.spell${toCreate[0].system.level}.value`]: Math.abs(
        levelUsed - 1
      ),
    });
  }

  await actor.deleteEmbeddedDocuments('Item', currentSpells); // remove old spell
  await actor.createEmbeddedDocuments('Item', toCreate); // create new spell
}
