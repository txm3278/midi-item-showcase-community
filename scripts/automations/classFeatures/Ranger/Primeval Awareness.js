// @bakanabaka

async function postCleanup() {
    const castLevel = arguments[0].castData.castLevel;
    let effect = actor.effects.find(ef => ef.name == macroItem.name);
    await effect.update({
        "duration.rounds"  : 10 * castLevel, 
        "duration.seconds" : 60 * castLevel
    });
}

if (macroUtil) await macroUtil.runWorkflows(arguments, {postCleanup : postCleanup});
else await postCleanup();