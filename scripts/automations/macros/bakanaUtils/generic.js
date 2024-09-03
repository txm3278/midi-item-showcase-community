function hasPermission(entity, userId) {
  let user = game.users.get(userId);
  if (!user) return false;
  return entity.testUserPermission(user, 'OWNER');
}

async function remove(entity) {
  let isPermitted = hasPermission(entity, game.user.id);
  if (isPermitted) return await entity.delete();

  let [typeIs, config] = [undefined, undefined];
  if (entity instanceof ActiveEffect) {
    typeIs = 'removeEffects';
    config = { effects: [entity.id], actorUuid: entity.parent.uuid };
  }

  if (config && typeIs) await MidiQOL.socket().executeAsGM(typeIs, config);
}

export const genericApi = { remove, hasPermission };
