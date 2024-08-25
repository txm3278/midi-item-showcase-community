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

function activated(moduleName, minimum, maximum) {
    let module = game.modules.get(moduleName);
    if (!module?.activated) return false;
    if (minimum == undefined) minimum = module.version;
    if (maximum == undefined) maximum = module.version;
    return !versionClamp(minimum, module.version, maximum);
}

function requires(moduleName, minimum, maximum) {
    if (!activated(moduleName, minimum, maximum)) 
        throw `This function requires ${moduleName} to be installed and activated`;
}

export const moduleApi = { 
    activated,
    requires
};