export async function runMacro(macroName) {
  const pack = game.packs.get('midi-item-showcase-community.misc-macros');
  let contents = await pack.getDocuments();
  const macro = contents.find((macro) => macro.name.includes(macroName));
  try {
    eval(macro.command);
  } catch (err) {
    console.error(err);
  }
}
