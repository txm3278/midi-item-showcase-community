// @bakanabaka

const spellLevel = args[1];
const MOTE_COUNT = ((spellLevel || 7) - 7) * 2 + 7;

async function onEffect() {
    let starMoteItem = actor.items.find(it => it.name == 'Star Mote');
    await starMoteItem.update({
            "system.uses" : { value: MOTE_COUNT, max: MOTE_COUNT, per: 'charges' }
        });
    ui.notifications.notify('Your Star Motes have been created as a spell in your spellbook.');
    
    // Don't realistically need to wait on either of these
    actor.setFlag('world', `${macroItem.name}`, [...Array(MOTE_COUNT).keys()].map(i => i + 1));
    macroUtil.animation.crownOfStars(token, MOTE_COUNT, effect, macroItem.name);
}

async function offEffect() {
    await Sequencer.EffectManager.endEffects({
        name: `${macroItem.name} - ${actor.id} - *`,
        objects: token,
      });
    await actor.unsetFlag('world', `${macroItem.name}`);
}

await macroUtil.runWorkflows(arguments, {
    on : onEffect,
    off : offEffect
});