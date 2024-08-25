function versionCompare(a, b) {
    let A = a.split('.').map(v => Number(v));
    let B = b.split('.').map(v => Number(v));

    let idx = 0;
    for (idx = 0; idx < A.length && idx < B.length; ++idx) {
        if (A[idx] > B[idx]) return -1;
        if (A[idx] < B[idx]) return 1;
    }
    while (A[idx] != undefined) { if (A[idx++]) return -1; }
    while (B[idx] != undefined) { if (B[idx++]) return 1; }
    return 0;
}

function versionClamp(a, version, b) {
    if (versionCompare(a, version) < 0) return false;
    if (versionCompare(version, b) > 0) return false;
    return true;
}

function activated(dependId, minimum, maximum) {
    let entity = (dependId == "dnd5e") ? game.system : game.modules.get(depId);
    if (!entity?.activated) return false;
    if (minimum == undefined) minimum = entity.version;
    if (maximum == undefined) maximum = entity.version;
    return !versionClamp(minimum, entity.version, maximum);
}

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