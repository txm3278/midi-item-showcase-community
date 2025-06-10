// ##################################################################################################
// Read First!!!!
// Rolls an Intelligence Check using the appropirate skill depending on the selected creature type.
// v1.0.0
// Author: Elwin#1410 based on Fridan99 version
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [postActiveEffects]
//  - Elwin Helpers world script
//
// Usage:
//   When used, rolls an Intelligence Check using the appropriate skill depending on the selected creature and
//   outputs the result.
//
// Description:
// In the postActiveEffects (item OnUse) phase of the Recall Monster Lore/Study Monster activity (in owner's workflow):
//   Rolls an Intelligence Check for the skill appropriate to the selected target creature type,
//   then outputs the result and the roll in a chat message.
// In the dnd5e.postSkillRollConfiguration hook (in owner's workflow):
//   Keeps the messageConfig for later use.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = 'Recall Monster Lore';
const WORLD_ID = 'world';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function recallMonsterLore({ speaker, actor, token, character, item, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'postActiveEffects') {
    const target = workflow.targets.first()?.actor;
    const type = target.system.details.race?.system?.type?.value || target.system.details?.type?.value || 'humanoid';

    // Note: In prevision to support 2024 rules
    const modern = elwinHelpers.getRules(scope.rolledItem) === 'modern';
    const skill = {
      aberration: 'arc',
      construct: 'arc',
      elemental: 'arc',
      monstrosity: 'arc',
      dragon: modern ? 'nat' : 'his',
      giant: 'his',
      humanoid: 'his',
      beast: 'nat',
      fey: modern ? 'arc' : 'nat',
      ooze: 'nat',
      plant: 'nat',
      celestial: 'rel',
      fiend: 'rel',
      undead: 'rel',
    }[type];

    let messageConfig = undefined;
    Hooks.once('dnd5e.postSkillRollConfiguration', (rolls, config, dialog, message) => {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | dnd5e.postSkillRollConfiguration`, { rolls, config, dialog, message });
      }
      messageConfig = message;
    });
    const rolls = await token.actor.rollSkill({ skill }, { chatMessage: false }, {});
    let roll = rolls?.length ? rolls[0] : null;
    if (!roll) {
      // Roll aborted
      return;
    }
    const title = `${modern ? 'Study Monster' : 'Monster Lore'} (${messageConfig?.data.flavor})`;
    const subTitle = `<b>Arcana:</b> Aberrations, Constructs, Elementals, ${
      modern ? 'Fey, ' : ''
    }Monstrosities<br/><b>History:</b> ${!modern ? 'Dragons, ' : ''}Giants, Humanoids<br/><b>Nature:</b> Beasts, ${
      modern ? 'Dragons' : 'Fey'
    }, Oozes, Plants<br/><b>Religion:</b> Celestials, Fiends, Undead"`;
    const text = ' is trying to know';
    const flavorGradient = 'to bottom';
    const flavorColorFrom = '#a623f0';
    const flavorColorTo = '#c90cc6';
    const titleGradient = 'to left'; //Only change this to right
    const titleColorFrom = '#0073e6';
    const titleColorTo = '#0059b3';

    const name = MidiQOL.getTokenPlayerName(token);
    const avatar = await elwinHelpers.getTokenImage(token);

    //Formatting of the Chat message. I would not modify this if you are not proficient in HTML
    const flavor = `
<div style="display: flex; flex-direction: column;"> <div style="background: linear-gradient(${flavorGradient}, ${flavorColorFrom}, ${flavorColorTo}); margin-top: px; margin-bottom: 1px; padding: 1px; text-align: center; border-radius: 5px; width: 100%;">
  <div style = 'display: table-cell; border: none; border-radius: 50px; vertical-align: middle; text-align: center; font-size:14px; padding: 0 5px 0 55px; background-image: url("${avatar}"); background-size: 45px 45px; background-position: 5px; background-repeat: no-repeat; height: 6px; min-height: 6px;'>
    <div style = "display: table-cell; color: white; font-size: 12px; font-style: italic; font-family: 'Signika'; text-align: center; vertical-align: middle;">${name}${text}</div>
  </div>
</div>`;
    let html = `
<div style="background: linear-gradient(${titleGradient}, ${titleColorFrom}, ${titleColorTo}); color: black; font-size: 12px; font-family: 'Signika'; font-weight:bolder; margin-bottom: 0; padding: 0; text-align: center; border-radius: 5px 5px 0 0; text-shadow: 0 0 5px white; ">${title}</div>
<div style="background: linear-gradient(${titleGradient}, ${titleColorFrom}, ${titleColorTo}); color: black; font-size: 10.5px;  text-shadow: 0 0 20px white; font-family: 'Signika'; font-weight:normal; margin-top: 0; margin-bottom: 1px; padding: 0; text-align: left; border-radius: 0 0 5px 5px; ">${subTitle}</div>
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

    // Display a Chat message with the roll result.
    await roll.toMessage(
      {
        flavor: flavor + html,
        speaker: ChatMessage.getSpeaker({ token: token.document }),
      },
      { rollMode: messageConfig?.rollMode }
    );
  }
}
