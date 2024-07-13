async function rootOrigin(child) {
    if (!child) return  undefined;
    let recursiveLimit = 5;
    while (recursiveLimit--) {
        if (!child) throw `Unhandlabled exception: origin chain of ${child} is improper`;
        if (child?.documentName == 'Item') return child.uuid;
        child = await fromUuid(child.origin);
    }
    throw `Recursion depth reached while attempting to find root origin`
}

async function find(actorEntity, effect) {
    if (!effect) return false;
    let rootOriginItem =  await rootOrigin(effect);
    let possibleEffects = actorEntity.effects.filter(ef => ef.name == effect?.name);
    for (let possible of possibleEffects) {
        let rootOriginEffect = await rootOrigin(possible);
        if (rootOriginEffect == rootOriginItem) return possible;
    }
    return undefined;
}

async function create(actorEntity, effect, parentEffect) {
    if (!actorEntity) return;
    if (parentEffect?.uuid) {
        let createdEffect = duplicate(effect);
        createdEffect.origin = parentEffect.uuid;
        await MidiQOL.socket().executeAsGM('createEffects', { actorUuid: actorEntity.uuid, effects: [createdEffect] });
    } else {
        await MidiQOL.socket().executeAsGM('createEffects', { actorUuid: actorEntity.uuid, effects: [effect] });
    }
    let actorInfo = await fromUuid(actorEntity.uuid);   // poll actor info again to update
    return await find(actorInfo, effect);
}

async function remove(actorEntity, effect) {
    if (!actorEntity) return;
    let appliedEffect = await find(actorEntity, effect);
    if (!appliedEffect) return;
    await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: actorEntity.uuid, effects: [appliedEffect.id] });
    return !(await find(actorEntity, effect));
}

async function update(actorEntity, effect) {
    if (!actorEntity) return;
}

async function toggle(actorEntity, effect) {
    if (!actorEntity) return;
    if (await remove(actorEntity, effect)) return true;
    return await create(actorEntity, effect);
}

async function stack(actorEntity, effect, config) {
    let tempEffect = duplicate(effect); 
    const actorEffects = Array.from(actorEntity.allApplicableEffects());
    const actorEffect = actorEffects.find(ef => ef.name.includes(effect.name));
    let charges = 0;

    if (!actorEffect) {
        charges = config.intial || 1;
        tempEffect.name = effect.name + ` (${charges})`;
        tempEffect.flags.dae.stackCount = charges;
        return create(actorEntity, tempEffect);
    } else {
        const increment = config.increment || 1;
        charges = actorEffect.flags.dae.stackCount;
        if (charges < config.maximum) {
            charges = (config.maximum) ? Math.min(charges + increment, config.maximum) : charges + increment;
            tempEffect.name = effect.name + ` (${charges})`;
            tempEffect.flags.dae.stackCount = charges;
            await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: actorEntity.uuid, effects: [actorEffect.id] });
            return create(actorEntity, tempEffect);
        }
    }
}

export const effectsApi = { create, find, remove, toggle };