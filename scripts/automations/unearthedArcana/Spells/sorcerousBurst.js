export async function sorcerousBurst({
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
  let damageTypes = [
    {
      label: '🧪 Acid',
      value: 'acid',
    },
    {
      label: '❄️ Cold',
      value: 'cold',
    },
    {
      label: '🔥 Fire',
      value: 'fire',
    },
    {
      label: '⚡ Lightning',
      value: 'lightning',
    },
    {
      label: '☠️ Poison',
      value: 'poison',
    },
    {
      label: '🧠 Psychic',
      value: 'psychic',
    },
    {
      label: '☁️ Thunder',
      value: 'thunder',
    },
  ];

  let selection = await warpgate.buttonDialog(
    {
      buttons: damageTypes,
      title: 'Select a damage type',
    },
    'column'
  );

  if (!selection) {
    return;
  }

  let damageFormula = workflow.item.system.damage.parts[0][0].replace(
    'none',
    selection
  );
  let damage = [[damageFormula, selection]];
  let animation, color;

  switch (selection) {
    case 'acid':
      animation = 'rayoffrost';
      color = 'green';
      break;
    case 'cold':
      animation = 'rayoffrost';
      color = 'blue';
      break;
    case 'fire':
      animation = 'firebolt';
      color = 'orange';
      break;
    case 'lightning':
      animation = 'chainlightning';
      color = 'purpleblue';
      break;
    case 'poison':
      animation = 'scorchingray';
      color = 'green';
      break;
    case 'psychic':
      animation = 'firebolt';
      color = 'purple';
      break;
    case 'thunder':
      animation = 'rayoffrost';
      color = 'yellowblue';
      break;
  }

  const updates = {
    'system.damage.parts': damage,
    'system.prof': workflow.item.system.prof,
    'flags.autoanimations.primary.video.animation': animation,
    'flags.autoanimations.primary.video.color': color,
  };

  let newItem = workflow.item.clone(updates, { keepId: true });
  newItem.prepareFinalAttributes();
  workflow.item = newItem;
}
