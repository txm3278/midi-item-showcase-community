function activated(moduleName) {
    return game.modules.get(moduleName)?.active;
}

function requires(moduleName) {
    if (!activated(moduleName)) 
        throw `This function requires ${moduleName} to be installed and activated`;
}

export const moduleApi = { 
    activated,
    requires
};