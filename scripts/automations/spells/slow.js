export async function slow({
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
  ChatMessage.create({
    content: `You can choose up to 6 targets inside the template.`,
    whisper: [game.user.id],
  });
}
