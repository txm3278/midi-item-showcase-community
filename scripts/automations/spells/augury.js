export async function augury({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
}) {
  /* Version: 1.1.3
   * Creator: Fridan99
   * Colaborators: Krig (advice an away code), MikeyTheMoose [Suggestion: ui.notifications.warn() instead of console.log()], Freeze (redundancy notice for canvas.tokens.controlled[0], and item as predefined variable)
   * The macro auto-detects how many times the Augury spell has been used, and automatically rolls 1d100 from the 2nd use, respecting the percentage for each subsequent use to get a random answer. Both the chat text and the 1d100 roll are private and only seen by the GM.
   */

  let options = [
    'Weal, for good results',
    'Woe, for bad results',
    'Weal and woe, for both good and bad results',
  ];

  async function auguryResult(question, isPublic) {
    let availableUses = item.system.uses.value;
    let maxUses = item.system.uses.max;
    let chance;

    if (availableUses === maxUses - 1) {
      chance = 0;
    } else if (availableUses === maxUses - 2) {
      chance = 25;
    } else if (availableUses === maxUses - 3) {
      chance = 50;
    } else if (availableUses === maxUses - 4) {
      chance = 75;
    } else {
      chance = 100;
    }

    let result = '';
    let rollResult = '';
    if (availableUses === maxUses - 1) {
      result = `None, GM chooses. NO roll.`;
    } else {
      let roll = new Roll('1d100');
      await roll.evaluate();
      rollResult = `The result of the d100 roll is: <span style="color:blue">${roll.total}</span>`;

      if (roll.total <= chance) {
        let randomOption = options[Math.floor(Math.random() * options.length)];
        result = `${randomOption}`;
      } else {
        result = `None, GM chooses.`;
      }

      if (game.dice3d) {
        await game.dice3d.showForRoll(
          roll,
          game.user,
          true,
          game.users.contents.filter((u) => u.isGM),
          { blind: true }
        );
      }
    }

    let description = `<b>${token.name}</b> is casting the <i>Augury</i> spell to predict the outcome of a specific course of action.<br/><br/><b>Question:</b><br/>${question}`;

    let chatData = {
      user: game.user._id,
      speaker: { alias: token.name },
      content: `${description}`,
    };

    if (!isPublic) {
      chatData.whisper = game.users.contents
        .filter((u) => u.isGM)
        .map((u) => u._id);
    }

    ChatMessage.create(chatData);

    let resultData = {
      user: game.user._id,
      speaker: { alias: token.name },
      content: `<b>Choose one between:</b><br/><br/>- ${options.join(
        '<br/>- '
      )}<br/><br/><b>The random result is as follows:</b><br/>${result}<br/><br/><b>${rollResult}</b>`,
      whisper: game.users.contents.filter((u) => u.isGM).map((u) => u._id),
      blind: true,
    };

    ChatMessage.create(resultData);

    let responseRequirement = isPublic
      ? `<b><span style="color:blue">Public</span></b>`
      : `<b><span style="color:blue">Whisper</span></b>`;
    let responseMessage = `${token.name} requires responses to be sent by ${responseRequirement}.`;

    let responseData = {
      user: game.user._id,
      speaker: { alias: token.name },
      content: responseMessage,
    };

    if (!isPublic) {
      responseData.whisper = game.users.contents
        .filter((u) => u.isGM)
        .map((u) => u._id);
    }

    ChatMessage.create(responseData);
  }

  new Dialog({
    title: 'Ask your question',
    content: `
        <form style="background-color: #f2f2f2; border-radius: 15px; padding: 20px;">
            <p style="color: #333; font-size: 16px;">If you want to make public your question and answer, let empty the question field and press <b style="color: #4CAF50;">Skip</b></p>
            <p style="color: #333; font-size: 16px;">If you want to make secretly your question and answer, fill the question and press <b style="color: #4CAF50;">Secretly</b></p>
            <div class="form-group">
                <label style="color: #333; font-size: 14px;">Question:</label>
                <input name="question" type="text" style="width: 100%; padding: 12px 20px; margin: 8px 0; box-sizing: border-box;"/>
            </div>
        </form>
    `,
    buttons: {
      skip: {
        label: 'Skip',
        callback: (html) =>
          auguryResult(html.find('[name="question"]').val(), true),
      },
      submit: {
        label: 'Secretly',
        callback: (html) =>
          auguryResult(html.find('[name="question"]').val(), false),
      },
    },
    default: 'submit',
  }).render(true);
}
