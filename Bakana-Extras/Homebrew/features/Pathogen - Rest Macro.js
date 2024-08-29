[token, character, actor, speaker, scene, origin, effect, item] = arguments;

const persistentDataName = `(${origin.name}) Persistent Data`;
let persistentData = await DAE.getFlag(actor, persistentDataName);
let syntheticItem = origin.clone({"system.save.dc" : persistentData.recoveryDc}, {keepId: true});

await macroUtil.item.syntheticItemDataRoll(syntheticItem, actor, [token]);

// Search for any other effects we need to apply
let allEffects = Array.from(actor.allApplicableEffects());
let pathogenEffect = allEffects.find(ef => ef.name == origin.name);
if (pathogenEffect.changes.find(ch => ch.key == "applyPathogen.deadly"))
    actor.update({"system.attributes.hp.value" : 0});