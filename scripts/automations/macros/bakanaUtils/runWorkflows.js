// ---------------------------------------------------------------------------------------------------
//                            Template Developed and Written by @bakanabaka
//
//  Generalized Midi-QOL workflow function injection utilizing a DAE effect to enable calls
//  Add a DAE effects to the actor to have them call into this macro during workflow execution.
//
//  After writing your code, feel free to remove any unused functions declarations / lookup entries
//     
//                          Don't be a baka, but do things that are bakana!
//                      No credit required for this. Just be cool to other people.
// ---------------------------------------------------------------------------------------------------

/**
  * Validates dependencies.
  * @param config.module A list of module names
  * @param config.setting Configurations defining how CompleteMidi will run.
  * @param config.verbose Verbose debug settings.
  * @param config.WORKFLOWNAME A function to run when the specified workflow occurs. (eg preCheckHits / off)
  * @param config.exceptionHandler(e) A function which runs before exit on a caught exception
  */
function validateDependencies({module: requiredModules, setting: requiredSettings}) {
    function moduleIsActive(name) { return game.modules.get(name)?.active; }
    if (requiredModules)
        for (let name of requiredModules) {
            if (!moduleIsActive(name)) throw Error(`Module ${name} is not installed or activated`);
        }
    if (requiredSettings)
        for (let {moduleName: name, settingName: setting} of requiredSettings) {
            if (!game.settings.get(name, setting)) throw Error(`Setting ${setting} is not enabled in ${name}`);
        }
}

/**
  * Advanced error handler for Midi Macros, wraps all code in a try/catch and helps organize code.
  * @param argumentInput The args value passed into the macro.
  * @param config Configurations defining how CompleteMidi will run.
  * @param config.verbose Verbose debug settings.
  * @param config.WORKFLOWNAME A function to run when the specified workflow occurs. (eg preCheckHits / off)
  * @param config.exceptionHandler(e) A function which runs before exit on a caught exception
  */
async function runWorkflows(argumentInput, config) {
    const args = argumentInput[4].args;
    const macroItem = argumentInput[4].macroItem;
    const workflow = argumentInput[4].workflow;

    /* ---------------------------------------------------------------------------------------------
        Workflow states that are being run
    --------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------------
        If you want these to fire EVERY time when you use THIS item activate with Midi-QOL
            Enabled by selecting the appropriate option from the dropdown menu
        If you want these to fire EVERY time on EVERY weapon activate with Dynamic Effects
            Enable by creating a dynamic effect with effect: 
        
        flags.midi-qol.onUseMacroName  |   custom   | ItemMacro(.$ItemName),${WorkflowName} |  20
    --------------------------------------------------------------------------------------------*/
    const workflowStates = {
        // OnUse macros                    registered callback                      example use case
        "preTargeting"                  : config.preTargeting,
        "preItemRoll"                   : config.preItemRoll,                       // Disable consumption usage
        "postNoAction"                  : config.postNoAction,
        "preStart"                      : config.preStart,
        "postStart"                     : config.postStart,
        "preAoETargetConfirmation"      : config.preAoETargetConfirmation,
        "postAoETargetConfirmation"     : config.postAoETargetConfirmation,
        "preValidateRoll"               : config.preValidateRoll,
        "postValidateRoll"              : config.postValidateRoll,
        "prePreambleComplete"           : config.prePreambleComplete,
        "preambleComplete"              : config.preambleComplete,
        "postPreambleComplete"          : config.postPreambleComplete,
        "preWaitForAttackRoll"          : config.preWaitForAttackRoll,
        "preAttackRoll"                 : config.preAttackRoll,
        "postWaitForAttackRoll"         : config.postWaitForAttackRoll,
        "preAttackRollComplete"         : config.preAttackRollComplete,
        "preCheckHits"                  : config.preCheckHits,
        "postAttackRoll"                : config.postAttackRoll,
        "postAttackRollComplete"        : config.postAttackRollComplete,
        "preWaitForDamageRoll"          : config.preWaitForDamageRoll,
        "preDamageRoll"                 : config.preDamageRoll,
        "postWaitForDamageRoll"         : config.postWaitForDamageRoll,
        "preConfirmRoll"                : config.preConfirmRoll,
        "postConfirmRoll"               : config.postConfirmRoll,
        "preDamageRollStarted"          : config.preDamageRollStarted,
        "postDamageRollStarted"         : config.postDamageRollStarted,
        "preDamageRollComplete"         : config.preDamageRollComplete,         // damage die additions
        "postDamageRoll"                : config.postDamageRoll,                // damage die replacement
        "postDamageRollComplete"        : config.postDamageRollComplete,        // damage type conversions
        "preWaitForSaves"               : config.preWaitForSaves,
        "preSave"                       : config.preSave,
        "postWaitForSaves"              : config.postWaitForSaves,
        "preSavesComplete"              : config.preSavesComplete,
        "postSave"                      : config.postSave,
        "postSavesComplete"             : config.postSavesComplete,
        "preAllRollsComplete"           : config.preAllRollsComplete,
        "preDamageApplication"          : config.preDamageApplication,
        "postAllRollsComplete"          : config.postAllRollsComplete,
        "preApplyDynamicEffects"        : config.preApplyDynamicEffects,
        "preActiveEffects"              : config.preActiveEffects,
        "postApplyDynamicEffects"       : config.postApplyDynamicEffects,
        "preRollFinished"               : config.preRollFinished,
        "postActiveEffects"             : config.postActiveEffects,
        "postRollFinished"              : config.postRollFinished,
        "preCleanup"                    : config.preCleanup,
        "postCleanup"                   : config.postCleanup,
        "preCompleted"                  : config.preCompleted,
        
        // Damage Bonus
        "DamageBonus"                   : config.DamageBonus,

        // Target Workflows
        "isAttacked"                    : config.isAttacked,
        "isHit"                         : config.isHit,
        "preSaveTarget"                 : config.preSaveTarget,
        "isSave"                        : config.isSave,
        "isSaveSuccess"                 : config.isSaveSuccess,
        "isSaveFailure"                 : config.isSaveFailure,
        "isDamaged"                     : config.isDamaged,
        "preTargetDamageApplication"    : config.preTargetDamageApplication,
    };

    /* ---------------------------------------------------------------------------------------------
        Enable by creating a dynamic effect with effect

        macro.itemMacro  |   custom   |      |  20
    --------------------------------------------------------------------------------------------*/

    const effectStates = {
        "on"                            : config.on,
        "each"                          : config.each,
        "off"                           : config.off,
    };

    /* ---------------------------------------------------------------------------------------------
    Below this line is the main function which runs everything else... you shouldn't need to
    modify this unless you need some additional debug information that isn't coming back.
   --------------------------------------------------------------------------------------------*/
    let  workflowAction = (args[0].macroPass || args[0]);
    try {
        if (macroUtil.debugLevel) validateDependencies(config.dependsOn || {});

        let workflowReturn;
        const [firstArg] = args;

        if (macroUtil.debugLevel > 0) {
            console.group(`%c↳ (${macroItem.name}) [${workflowAction}]`, 'background:black; color: white; padding:2px 5px;font-weight:bold;');
        }

        if (firstArg.tag == "OnUse" || firstArg.tag == "DamageBonus" || firstArg.tag == "TargetOnUse"){
            if (macroUtil.debugLevel > 1) console.warn("midiWorkflow:", workflow);
            if (!workflowStates[workflowAction]) throw `Undefined midiWorkflow name : ${workflowAction}`;
            else workflowReturn = await workflowStates[workflowAction](firstArg);

            if (workflowReturn === false) workflow.aborted = true;
            if (macroUtil.debugLevel > 1) console.warn("Aborted flag on workflow is set to :", workflow.aborted);
        } else {
            if (!effectStates[workflowAction]) throw `Undefined effectState : ${workflowAction}`;
            else workflowReturn = await effectStates[workflowAction](args.splice(1));
        }

        if(macroUtil.debugLevel > 0) console.groupEnd();
        return workflowReturn;
    } catch (e) {
        ui.notifications.error(`An unexpected error occurred in the execcution of the ${macroItem.name} ItemMacro. Please press <F12> and inspect the console errors for more information.`);
        console.group(`%c❗❗ (${macroItem.name}) [Error in ${workflowAction}] ❗❗`, 'background:black; color: white; padding:2px 5px;font-weight:bold;');
        console.error("Unexpected error occurred :", e);
        if (config.exceptionHandler) await config.exceptionHandler(e);
        console.groupEnd();
        if(macroUtil.debugLevel > 0) console.groupEnd(); 
    }
}

export const workflowApi = { runWorkflows };