export async function memorizeSpell({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
}) {
  const mutName = 'Memorize Spell';
  const thisToken = token.document;

  function sortFunc(a, b) {
    if (a.system.level > b.system.level) return 1;
    else if (b.system.level > a.system.level) return -1;
    else return a.name.localeCompare(b.name);
  }

  const spells = actor.items
    .filter(
      (i) =>
        i.type === 'spell' &&
        i.system.level > 0 &&
        i.system.preparation.mode === 'prepared' &&
        !i.system.preparation.prepared
    )
    .sort(sortFunc);

  const options = spells.reduce((acc, curr) => {
    acc.push({
      label: `<img src="${curr.img}" width="32px" style="margin-bottom:-8px;border:none"> ${curr.name}`,
      value: curr,
    });
    return acc;
  }, []);

  const selection = await warpgate.buttonDialog(
    { buttons: options, title: 'Choose a spell.' },
    'column'
  );
  if (!selection) return;

  const toShorthand = (shorthand, item) => {
    shorthand[item.id] = {
      'system.preparation.prepared': true,
    };

    return shorthand;
  };

  const hasMutation = (tokenDoc) => {
    const stack = warpgate.mutationStack(tokenDoc);
    return !!stack.getName(mutName);
  };

  const thisActor = thisToken.actor;
  const entries = [selection].reduce(toShorthand, {});

  if (hasMutation(thisToken)) await warpgate.revert(thisToken, mutName);
  await warpgate.mutate(
    thisToken,
    { embedded: { Item: entries } },
    {},
    { name: mutName, comparisonKeys: { Item: 'id' } }
  );
}
