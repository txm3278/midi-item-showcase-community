export async function message({
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
   * You can choose a Player Character, or an NPC (for which you must write a name) and it will be sent to the GM.
   */

  let tokens = canvas.tokens.placeables.filter((t) => t.actor.hasPlayerOwner);
  let controlledTokenName = canvas.tokens.controlled[0]?.name || game.user.name;
  let tokenNames = tokens
    .map((t) => t.name)
    .sort()
    .filter((name) => name !== controlledTokenName);

  new Dialog({
    title: 'Message Spell',
    content: `
    <style>
      .message-dialog {
        background-color: #f0f8ff;
        border-radius: 8px;
        padding: 20px;
      }
      .message-dialog h3 {
        color: #4b9cd3;
        font-family: 'Arial', sans-serif;
      }
      .message-dialog p {
        color: #333;
        font-family: 'Verdana', sans-serif;
      }
      .message-dialog .form-group {
        margin-bottom: 15px;
      }
      .message-dialog label {
        color: #555;
        font-weight: bold;
      }
      .message-dialog input[type="text"],
      .message-dialog select {
        width: 100%;
        padding: 8px 12px;
        margin-top: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
      }
      .message-dialog select {
        height: auto; /* Ensures the height adjusts properly */
        line-height: normal; /* Default line height to avoid cropping text */
      }
      .message-dialog input[type="radio"] {
        margin-right: 10px;
      }
      .message-dialog .small-text {
        font-size: 12px;
        color: #888;
      }
      .dialog-buttons {
        margin-top: 20px;
      }
      .dialog-buttons .button {
        background-color: #4b9cd3;
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
      }
      .dialog-buttons .button:hover {
        background-color: #357aab;
      }
    </style>
    <div class="message-dialog">
      <h3>You are casting the <i>message</i> spell</h3>
      <p>Send a whisper message to a creature up to 120 feet of distance.</p><br>
      <form>
        <div class="form-group">
          <label>Whisper message:</label>
          <input id="message-text" name="message-text" type="text"/>
        </div>
        <div class="form-group">
          <label><input type="radio" name="target-type" value="token" checked> Choose Player:</label>
          <select id="target-token" name="target-token">
            ${tokenNames
              .map((name) => `<option value="${name}">${name}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label><input type="radio" name="target-type" value="npc"> Choose NPC:</label>
          <input id="target-npc" name="target-npc" type="text" placeholder="Write the NPC name"/>
        </div>
      </form>
      <p class="small-text">If you choose a NPC, then write the name and the message will be sent to the GM.</p>
    </div>
  `,
    buttons: {
      send: {
        label: 'Send',
        callback: (html) => {
          let messageText = html.find('#message-text')[0].value;
          let targetType = html.find('input[name="target-type"]:checked')[0]
            .value;
          let targetTokenName = html.find('#target-token')[0].value;
          let targetNpcName = html.find('#target-npc')[0].value;
          let targetName =
            targetType === 'token' ? targetTokenName : targetNpcName;

          if (targetType === 'token') {
            let targetToken = tokens.find((t) => t.name === targetName);
            if (targetToken) {
              let whisperRecipients = targetToken.actor
                .getActiveTokens()
                .map((t) => t.actor)
                .filter((a) => a.hasPlayerOwner && a.owner)
                .map((a) => a.owner);
              whisperRecipients.push(game.user); // Add the current user to the recipients
              whisperRecipients = whisperRecipients
                .filter((u) => u)
                .map((u) => u.id); // Convert to user IDs

              ChatMessage.create({
                content: `<b>${controlledTokenName}</b> is sending a <span style="color:blue;font-weight:bold">whisper</span> message to <b>${targetName}</b>:<br><br><i>${messageText}</i><br><br><br>You can reply to <b>${controlledTokenName}</b> in a <span style="color:blue;font-weight:bold">whisper</span>.`,
                whisper: whisperRecipients,
              });
            } else {
              ui.notifications.warn(
                `No token named "${targetName}" was found.`
              );
            }
          } else {
            // If the target is an NPC, we send a whisper to the GM.
            let gm = game.users.find((u) => u.isGM);
            if (gm) {
              ChatMessage.create({
                content: `<b>${controlledTokenName}</b> is sending a <span style="color:blue;font-weight:bold">whisper</span> message to <b>${targetName} (NPC Character)</b>:<br><br><i>${messageText}</i><br><br><br>You can reply to <b>${controlledTokenName}</b> in a <span style="color:blue;font-weight:bold">whisper</span>.`,
                whisper: [gm.id],
              });
            } else {
              ui.notifications.warn(`No GM found.`);
            }
          }
        },
      },
    },
    default: 'send',
  }).render(true);
}
