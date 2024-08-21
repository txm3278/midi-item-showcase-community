async function find(actorEntity, effect) {
    if (!effect || !actorEntity) return false;
    return actorEntity.effects.find(ef => ef.name == effect.name);
}

async function create(actorEntity, effect) {
    if (!effect || !actorEntity) return;
    await MidiQOL.socket().executeAsGM('createEffects', { actorUuid: actorEntity.uuid, effects: [effect] });
    return await find(actorEntity, effect);
}

async function remove(actorEntity, effect) {
    if (!effect || !actorEntity) return;
    let appliedEffect = await find(actorEntity, effect);
    if (!appliedEffect) return;
    await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: actorEntity.uuid, effects: [appliedEffect.id] });
    return !(await find(actorEntity, effect));
}

async function update(actorEntity, effect) {
    if (!effect || !actorEntity) return;
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