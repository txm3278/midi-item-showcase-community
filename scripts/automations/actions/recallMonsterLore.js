export async function recallMonsterLore({
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
  if (!token) return ui.notifications.warn('You must select a token.');
  const target = game.user.targets.first()?.actor;
  if (!target) return ui.notifications.warn('You must select a target.');
  const type = target.system.details.race || target.system.details.type.value;

  const skill = {
    aberration: 'arc',
    construct: 'arc',
    elemental: 'arc',
    monstrosity: 'arc',
    dragon: 'his',
    giant: 'his',
    humanoid: 'his',
    beast: 'nat',
    fey: 'nat',
    ooze: 'nat',
    plant: 'nat',
    celestial: 'rel',
    fiend: 'rel',
    undead: 'rel',
  }[type];

  const roll = await token.actor.rollSkill(skill, {
    event,
    chatMessage: false,
  });

  let Title = `Monster Lore (${roll.options.flavor})`;
  let SubTitle =
    '<b>Arcana:</b> Aberrations, Constructs, Elementals, Monstrosities<br/><b>History:</b> Dragons, Giants, Humanoids<br/><b>Nature:</b> Beasts, Fey, Oozes, Plants<br/><b>Religion:</b> Celestials, Fiends, Undead';
  let text = ' is trying to know';
  let flavorGradient = 'to bottom';
  let flavorColorFrom = '#a623f0';
  let flavorColorTo = '#c90cc6';
  let titleGradient = 'to left'; //Only change this to right
  let titleColorFrom = '#0073e6';
  let titleColorTo = '#0059b3';

  //Don't change this... Probably
  let name = token.document.name;
  let avatar = token.document.texture.src;

  //Formatting of the Chat message. I would not modify this if you are not proficient in HTML
  let flavor = `
<div style="display: flex; flex-direction: column;"> <div style="background: linear-gradient(${flavorGradient}, ${flavorColorFrom}, ${flavorColorTo}); margin-top: px; margin-bottom: 1px; padding: 1px; text-align: center; border-radius: 5px; width: 100%;">
  <div style = 'display: table-cell; border: none; border-radius: 50px; vertical-align: middle; text-align: center; font-size:14px; padding: 0 5px 0 55px; background-image: url("${avatar}"); background-size: 45px 45px; background-position: 5px; background-repeat: no-repeat; height: 6px; min-height: 6px;'>
    <div style = "display: table-cell; color: white; font-size: 12px; font-style: italic; font-family: 'Signika'; text-align: center; vertical-align: middle;">${name}${text}</div>
  </div>
</div>`;
  let html = `
<div style="background: linear-gradient(${titleGradient}, ${titleColorFrom}, ${titleColorTo}); color: black; font-size: 12px; font-family: 'Signika'; font-weight:bolder; margin-bottom: 0; padding: 0; text-align: center; border-radius: 5px 5px 0 0; text-shadow: 0 0 5px white; ">${Title}</div>
<div style="background: linear-gradient(${titleGradient}, ${titleColorFrom}, ${titleColorTo}); color: black; font-size: 10.5px;  text-shadow: 0 0 20px white; font-family: 'Signika'; font-weight:normal; margin-top: 0; margin-bottom: 1px; padding: 0; text-align: left; border-radius: 0 0 5px 5px; ">${SubTitle}</div>
<div style="width: 100%; background: #CEC7B6; color: black; border-width: 1px 1px 0 1px; border-style: solid; border-color:black; font-size: 11.5px; font-family: 'Signika'; margin-bottom: 0; padding: 3px 2px 3px 2px; text-align: left; border-radius: 5px 5px 0 0; ">`;
  if (roll.total >= 15) {
    html += `
  <div style="display: table-cell; width: 80px; font-weight: normal;"><strong><u>DC</u></strong><br/>
    15<br/>
    ${roll.total >= 20 ? '20<br/>' : ''}
    ${roll.total >= 25 ? '25<br/>' : ''}
    ${roll.total >= 30 ? '30+<br/>' : ''}
  </div>`;
  } else html += "You don't know anything about the creature...";

  if (roll.total >= 15) {
    html += `
  <div style="display: table-cell; font-weight:normal;"><strong><u>Information</u></strong><br/>
    Name, creature type<br/>
    ${roll.total >= 20 ? 'Senses, special abilities<br/>' : ''}
    ${roll.total >= 25 ? 'Resistances, vulnerabilities<br/>' : ''}
    ${roll.total >= 30 ? 'Legendary actions<br/>' : ''}
  </div>`;
  }
  html += `</div>
<div style="width: 100%; background: #B6AB91; color: black; border-width: 0 1px 0 1px; border-style: solid; border-color:black; font-size: 16px; font-family: 'Signika'; margin-bottom: 0; padding: 0; text-align: left; border-radius: 0; ">
  <div style="display: table-cell; width: 80px; font-weight:bold;"></div>
  <div style="display: table-cell; font-weight:normal;"></div>
</div>
<div style="width: 100%; background: #CEC7B6; color: black; border-width: 0 1px 1px 1px; border-style: solid; border-color:black; font-size: 16px; font-family: 'Signika'; margin-bottom: 0; padding: 3px 2px 0 2px; text-align: left; border-radius: 0 0 5px 5px; "></div>`;

  //Creation of the Chat message. Definitely don't modify this unless you can write this shit on your own!
  roll.toMessage({
    flavor: flavor + html,
    speaker: ChatMessage.getSpeaker({ token: token.document }),
  });
}
