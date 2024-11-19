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
  let damageTypes = {
    acid: '🧪 Acid',
    cold: '❄️ Cold',
    fire: '🔥 Fire',
    lightning: '⚡ Lightning',
    poison: '☠️ Poison',
    psychic: '🧠 Psychic',
    thunder: '☁️ Thunder',
  };

  const menu = new Portal.FormBuilder();
  menu.title('Sorcerous Burst').select({
    name: 'damageType',
    options: damageTypes,
    label: 'Select a damage type',
  });

  let selection = await menu.render();

  if (!selection) {
    return;
  }

  let damageFormula = workflow.item.system.damage.parts[0][0].replace(
    'none',
    selection.damageType
  );
  let damage = [[damageFormula, selection.damageType]];
  let animation, color;

  switch (selection.damageType) {
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
