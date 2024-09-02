function hasPermission(entity, userId) {
    let user = game.users.get(userId);
    if (!user) return false;
    return entity.testUserPermission(user, 'OWNER');
}

async function remove(entity) {
    let isPermitted = hasPermission(entity, game.user.id);
    if (isPermitted) return await entity.delete();
    await MidiQOL.executeAsGM(sockets.deleteEntity.name, entity.uuid);
}

export const genericApi = { remove, hasPermission };