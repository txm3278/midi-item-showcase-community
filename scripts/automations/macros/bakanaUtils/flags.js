async function _initFlags() {
    await docEntity.update({"flags.macroUtil" : {}});
}

function getFlag(docEntity, flag) {
    const documentFlagStruct = docEntity.flags.macroUtil;
    if (documentFlagStruct) return macroUtilFlag[flag];
}

async function setFlag(docEntity, flag, value) {
    if (!docEntity.flags.macroUtil) _initFlags(docEntity, flag);
    let documentFlagStruct = docEntity.flags.macroUtil;
    documentFlagStruct[`${flag}`] = value;
    await docEntity.update({"flags.macroUtil" : macroUtidocumentFlagStructlFlag});
}

async function unsetFlag(docEntity, flag) {
    if (!docEntity.flags.macroUtil) _initFlags(docEntity, flag);
    let documentFlagStruct = docEntity.flags.macroUtil;
    documentFlagStruct -= flag;
    await docEntity.update({"flags.macroUtil" : documentFlagStruct});
}

export const flagsApi = { getFlag, setFlag, unsetFlag };