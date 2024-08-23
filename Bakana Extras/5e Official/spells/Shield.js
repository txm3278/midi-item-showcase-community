// @bakanabaka

async function animation(animatedToken) {
    //You need to select a token before using the macro.
    let effectScale = 0.5;
    let tokenSize = (animatedToken.data.width + animatedToken.data.height) /2;

    new Sequence()
    //Will play the intro sequence of the Shield animation.
        .effect()
            .file("jb2a.shield.01.intro.blue") //Edit this line to customize the intro animation as follow jb2a.shield.version_number.intro.color
            .scale(effectScale * tokenSize)
            .atLocation(animatedToken)
            .waitUntilFinished(-250)
    //Then it will transition to the loop sequence of the Shield animation.        
        .effect()
            .file("jb2a.shield.01.loop.blue") //Edit this line to customize the loop animation as follow jb2a.shield.version_number.loop.color
            .scale(effectScale * tokenSize)
            .atLocation(animatedToken)
            .fadeIn(50)
            .fadeOut(50)
            .waitUntilFinished(-250)
    //Finally it will play the outro sequence of the Shield animation as follow jb2a.shield.version_number.outro.color. 
    //You can also change '_explode' to '_fade' to have a different ending.
        .effect()
            .file("jb2a.shield.01.outro_explode.blue") //Edit this line to customize the outro animation.
            .scale(effectScale * tokenSize)
            .atLocation(animatedToken)
        .play()
}

async function postCleanup(midiMacro) {
    let actorToken = canvas.tokens.get(midiMacro.tokenId);
    await animation(actorToken);
}

async function confirm(title, question) {
    return await Dialog.confirm({
        title: title,
        content: question,
        yes: () => true,
        no: () => false
    });
}

async function promptShield() {
    let confirmed = await confirm(macroItem.name, "You are being attacked by magic missile. Cast shield?");
    if (!confirmed) return;
    await MidiQOL.completeItemUse(macroItem, {}, {});
}

async function isDamaged() {
    if (!item.name.includes("Magic Missile")) return;
    let shieldEffect = macroItem.effects.find(ef => ef.name == macroItem.name);
    let actorEffect = macroUtil.effect.find(actor, shieldEffect);
    if (!actorEffect) await promptShield();
}

async function preTargetDamageApplication(midiMacro) {
    if (!item.name.includes("Magic Missile")) return;
    let actorToken = canvas.tokens.get(workflow.targets.first().id);
    await animation(actorToken);
    workflow.damageItem.hpDamage = 0;
}

await macroUtil.runWorkflows(arguments, {
        postCleanup                 : postCleanup,
        isDamaged                   : isDamaged,
        preTargetDamageApplication  : preTargetDamageApplication,
    });