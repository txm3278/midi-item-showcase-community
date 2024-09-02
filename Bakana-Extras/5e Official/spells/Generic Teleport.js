// @bakanabaka

async function teleport() {
    // Original Author: EskieMoh#2969
    // Alterations by bakanabaka
    let config = {
        size: token.document.width,
        icon: 'icons/skills/movement/ball-spinning-blue.webp',
        label: `${item.name}`,
        tag: `${item.name}`,
        drawIcon: true,
        drawOutline: true,
        interval: token.document.width % 2 === 0 ? 1 : -1,
        rememberControlled: true
    }

    console.error("rolledItem", rolledItem);
    let template = await macroUtil.template.circle(token, rolledItem.system.target.value, "#90EE90");
    let position = await warpgate.crosshairs.show(config);
    await template.delete();
    console.error(position);
    if (!position) {
        console.error("no selection, returning");
        workflow.aborted = true;
        return;
    }

    new Sequence()

        .animation()
        .delay(800)
        .on(token)
        .fadeOut(200)

        .effect()
        .file("jb2a.misty_step.01.blue")
        .atLocation(token)
        .scaleToObject(2)
        .waitUntilFinished(-2000)

        .animation()
        .on(token)
        .teleportTo(position)
        .snapToGrid()
        .offset({ x: -1, y: -1 })
        .waitUntilFinished(200)

        .effect()
        .file("jb2a.misty_step.02.blue")
        .atLocation(token)
        .scaleToObject(2)

        .animation()
        .delay(1400)
        .on(token)
        .fadeIn(200)

        .play();    
}

async function preItemRoll() {
    await teleport();
}

const callArguments = {
    speaker:    speaker,
    actor:      actor,
    token:      token,
    character:  character,
    item:       item,
    args:       args,
    scope:      scope,
};
await macroUtil.runWorkflows(callArguments, {
    preItemRoll  : preItemRoll,
});