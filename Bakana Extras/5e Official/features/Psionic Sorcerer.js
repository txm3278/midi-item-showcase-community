// @bakanabaka

const keyphrase = "Granted by Psionic Sorcery"
const sorcerypoints = actor.items.find(it=>it.name == "Sorcery Points");

async function preItemRoll() {
    // Check if it is "Granted by Psionic Sorcery"
    if (!rolledItem.system.description.value.includes(keyphrase)) return;

    // Check that you have enough sorcery points
    const pointsRemaining = sorcerypoints.system.uses;
    const pointsConsumed  = rolledItem.system.level; 
    if (pointsRemaining < pointsConsumed) return;

    // Prompt if they want to use sorcery points instead of spell slots
    let response = await Dialog.confirm({
        title: `Use ${effectItem.name}?`,
        content: `Spend ${pointsConsumed} sorcery points to cast ${rolledItem.name} as a level ${pointsConsumed} spell?`,
        yes: () => { return true },
        no: () => { return false }
    });
    if (!response) return;

    // Turn off usage requirements
    macroUtil.item.setPreUseItemConfig(macroItem,
        {consumeSpellSlot : null},
        {configureDialog : false}
    );

    // Consume sorcery points
    await sorcerypoints.update({"uses" : pointsRemaining - pointsConsumed})
}