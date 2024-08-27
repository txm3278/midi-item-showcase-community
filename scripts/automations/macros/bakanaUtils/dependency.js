// Returns true if version A <= B <= C
function _isAscending(a, b, c) {
    return !foundry.utils.isNewerVersion(a, b) && !foundry.utils.isNewerVersion(b, c);
}

function _activated(dependency) {
    if (!dependency.id) return [false, undefined];
    let isModule = game.modules.get(dependency.id);
    let entity = (isModule) ? game.modules.get(dependency.id) : globalThis[dependency.id];
    if (!entity?.active && isModule) return [false, undefined];
    if (dependency.min == undefined) dependency.min = entity.version ?? "0.0.0";
    if (dependency.max == undefined) dependency.max = entity.version ?? "0.0.0";
    return [_isAscending(dependency.min, entity.version, dependency.max), entity?.version];
}

// Returns true if dependency exists, is active, and is inside any provided version window
function activated(dependency) {
    let [isActivated, currentVersion] = _activated(dependency);
    return isActivated;
}

// Throws an error if dependency does not exist, is not active, or is outside of version window
function required(dependency) {
    let [isActivated, currentVersion] = _activated(dependency);
    if (isActivated) return true;

    let errorMsg = `Requires ${dependency.id} to be installed and activated.`;
    if (dependency.min) errorMsg += `\tMinimum version: ${dependency.min}`;
    if (dependency.max) errorMsg += `\tMaximum version: ${dependency.max}`;
    errorMsg += "\tCurrent version: " + (currentVersion) ? currentVersion : "not installed";

    throw errorMsg;
}

// Throws an error if no entry in dependency list exists, is active, and is inside version window
function someRequired(dependencyList) {
    let errorMsg = `Requires at least one of the following to be installed and activated:\n`;

    for (let dependency of dependencyList) {
        let [isActivated, currentVersion] = _activated(dependency);
        if (isActivated) return true;

        errorMsg += `Module Id: ${dependency.id}`;
        if (dependency.min) errorMsg += `\tMinimum version: ${dependency.min}`;
        if (dependency.max) errorMsg += `\tMaximum version: ${dependency.max}`;
        errorMsg += "\tCurrent version: " + (currentVersion) ? currentVersion : "not installed";
    }

    throw errorMsg;
}

export const dependencyApi = { 
    activated,
    required,
    someRequired
};