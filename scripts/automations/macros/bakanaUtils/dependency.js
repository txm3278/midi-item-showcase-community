// Returns true if version A <= B <= C
function versionBetween(a, b, c) {
    return !foundry.utils.isNewerVersion(a, b) && !foundry.utils.isNewerVersion(b, c);
}

// Returns true if dependency exists, is active, and is appropriately versioned
function activated(dependId, minimum, maximum) {
    let isModule = game.modules.get(dependId);
    let entity = (isModule) ? game.modules.get(dependId) : globalThis[dependId];
    if (!entity?.active && isModule) return false;
    if (minimum == undefined) minimum = entity.version ?? "0.0.0";
    if (maximum == undefined) maximum = entity.version ?? "0.0.0";
    return versionBetween(minimum, entity.version, maximum);
}

// Throws an error if dependency does not exist, is not active, or is outside of versions
function required(dependId, minimum, maximum) {
    if (!activated(dependId, minimum, maximum)) {
        let errorMsg = `Requires ${dependId} to be installed and activated.`;
        if (minimum) errorMsg += ` Minimum version: ${minimum}`;
        if (maximum) errorMsg += ` Maximum version: ${maximum}`;
        throw errorMsg;
    }
}

export const dependencyApi = { 
    activated,
    required
};