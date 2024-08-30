async function remove(entity) {
    let hasPermission = hasPermission(entity, game.user.id);
    if (hasPermission) return await entity.delete();
    await MidiQOL.executeAsGM(sockets.deleteEntity.name, entity.uuid);
}

function hasPermission(entity, userId) {
    let user = game.users.get(userId);
    if (!user) return false;
    return entity.testUserPermission(user, 'OWNER');
}

export const genericApi = { remove, hasPermission };