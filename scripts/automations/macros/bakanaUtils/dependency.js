// Returns true if version A <= B <= C
function _isAscending(a, b, c) {
    return !foundry.utils.isNewerVersion(a, b) && !foundry.utils.isNewerVersion(b, c);
}

function _activated(dependency) {
    let isModule = game.modules.get(dependId);
    let entity = (isModule) ? game.modules.get(dependId) : globalThis[dependId];
    if (dependId == "foundry") entity = game;
    if (!entity) return false;

    if (!entity.active && isModule) return false;
    if (!entity.version) ui.notifications.warn(`${entity} does not have a version field`);
    if (minimum == undefined) minimum = entity.version ?? "0.0.0";
    if (maximum == undefined) maximum = entity.version ?? "0.0.0";
    return [_isAscending(dependency.min, entity.version, dependency.max), entity?.version];
}

function _versionMessageAppend(dependency, version) {
    let msg = "";
    if (dependency.min) msg += `\n\tMinimum version: ${dependency.min}`;
    if (dependency.max) msg += `\n\tMaximum version: ${dependency.max}`;
    msg += "\n\tCurrent version: " + (version) ? version : "NOT INSTALLED";
    return msg;
}

// Returns true if dependency exists, is active, and is inside any provided version window
function isActivated(dependency, warnMessage) {
    if (!dependency.id) return [false, undefined];
    let [isActivated, currentVersion] = _activated(dependency);
    if (!isActivated && warnMessage) {
        if (warnMessage.length) warnMessage += '\n';
        warnMessage += `Warning: ${dependency.id} is not between expected versions.`;
        warnMessage += _versionMessageAppend(dependency, currentVersion)
        console.warn(warnMessage);
    }
    return isActivated;
}

// Throws an error if dependency does not exist, is not active, or is outside of version window
function requires(dependency) {
    let [isActivated, currentVersion] = _activated(dependency);
    if (isActivated) return true;

    let errorMsg = `Requires ${dependency.id} to be installed and activated.`;
    errorMsg += _versionMessageAppend(dependency, currentVersion);
    throw errorMsg;
}

// Throws an error if no entry in dependency list exists, is active, and is inside version window
function requiresOne(dependencyList) {
    let errorMsg = `Requires at least one of the following to be installed and activated:\n`;

    for (let dependency of dependencyList) {
        let [isActivated, currentVersion] = _activated(dependency);
        if (isActivated) return true;

        errorMsg += `Module Id: ${dependency.id}`;
        errorMsg += _versionMessageAppend(dependency, currentVersion);
    }
    throw errorMsg;
}

export const dependencyApi = { 
    isActivated,
    requires,
    requiresOne
};