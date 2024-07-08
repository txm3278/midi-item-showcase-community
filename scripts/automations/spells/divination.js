export async function divination({
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
  /* Version: 1.0.0
   * Creator: Fridan99
   * The macro auto-detects how many times the Divination spell has been used, and automatically rolls 1d100 from the 2nd use, respecting the percentage for each subsequent use to get a random answer. You can choose to make it public or private, in case of public just click the Skip button, you don't need to fill in the question fields, just ask your GM. For private, fill in the question fields, then press Secretly, and wait for your GM to send you a whisper.
   * The GM is the only one who sees the relevant information whether it is public or secret..
   */

  let descriptions = [
    'You feel a divine presence surrounding you, filling the air with a sense of calm and wisdom.',
    'A mystical energy envelops you, and you sense a connection with a higher power.',
    'You reach out with your mind, and feel a celestial entity gently touch your consciousness.',
    "You close your eyes and when you open them, you're in a different realm, filled with divine energy.",
    'You whisper your questions into the void, and feel a comforting presence wrap around you, ready to guide you.',
    'You feel a warm, gentle energy envelop you as you reach out to the divine.',
    'You feel your consciousness expand, reaching out to touch a divine presence.',
    'A soft, ethereal light surrounds you, and you feel a connection with the divine.',
    'You feel a gentle tug at your mind, a divine entity making its presence known.',
    'You reach out with your senses, and feel a divine presence reach back.',
  ];

  async function divinationResult(html, isPublic) {
    let questions = [html.find('[name="question1"]').val()];

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
    if (availableUses === maxUses - 1 || chance === 0) {
      result = `<b>${token.name}</b> <b><span style="color:blue">The DM offers a truthful reply. The reply might be a short phrase, a cryptic rhyme, or an omen.</span></b>`;
    } else {
      let roll = new Roll('1d100');
      await roll.evaluate({ async: true });

      if (roll.total > chance) {
        result = `<b>${token.name}</b> <span style="color:blue"><b>The DM offers a truthful reply. The reply might be a short phrase, a cryptic rhyme, or an omen.</span></b>`;
        rollResult = `The result of the d100 roll is: <span style="color:blue">${roll.total}</span>`;
      } else {
        result = `<b>${token.name}</b> <span style="color:blue">get a random reading.</span></b>`;
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

    let description =
      descriptions[Math.floor(Math.random() * descriptions.length)];

    let questionContent = questions
      .map((question, index) =>
        question ? `<b>Question ${index + 1}:</b> ${question}<br/>` : ''
      )
      .join('');

    // Send the casting message, description, questions, and whisper requirement to the chat
    ChatMessage.create({
      user: game.user._id,
      speaker: { alias: token.name },
      content: `<b>${
        token.name
      }</b> is casting <i>Divination</i> spell......<br/><br/>${description}<br/><br/>${questionContent}<br/><b>The entity takes its time to give you an answer...</b><br/><br/>(The <b>${
        token.name
      }</b> requires responses to be sent by <b><span style="color:blue">${
        isPublic ? 'Public' : 'Whisper'
      }</span></b>.)`,
      whisper: isPublic ? null : ChatMessage.getWhisperRecipients('GM'),
    });

    // Send the result and roll result to the GM
    ChatMessage.create({
      user: game.user._id,
      speaker: { alias: token.name },
      content: `<b>${result}</b><br/><br/><b>${rollResult}</b>`,
      whisper: ChatMessage.getWhisperRecipients('GM'),
      blind: true,
    });
  }

  new Dialog({
    title: 'Ask your questions',
    content: `
        <form style="background-color: #f2f2f2; border-radius: 15px; padding: 20px;">
            <p style="color: #333; font-size: 16px;">If you want to make public your questions and answers, let empty the questions field and press <b style="color: #4CAF50;">Skip</b></p>
            <p style="color: #333; font-size: 16px;">If you want to make secretly your questions and answers, fill the questions and press <b style="color: #4CAF50;">Secretly</b></p>
            <div class="form-group">
                <label style="color: #333; font-size: 14px;">Question 1:</label>
                <input name="question1" type="text" style="width: 100%; padding: 12px 20px; margin: 8px 0; box-sizing: border-box;"/>
            </div>
        </form>
    `,
    buttons: {
      skip: {
        label: 'Skip',
        callback: (html) => divinationResult(html, true),
      },
      submit: {
        label: 'Secretly',
        callback: (html) => divinationResult(html, false),
      },
    },
    default: 'submit',
  }).render(true);
}
