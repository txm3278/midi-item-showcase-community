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
 *  Midiworkflow usage suggestions:
 * "preItemRoll"                   : Disable consumption usage
 * "preDamageRollComplete"         : Damage roll modifications (addition/removal)
 * "postDamageRoll"                : Damage die replacement
 * "postDamageRollComplete"        : Damage type conversions

    // Self workflows
    "preTargeting"              : preTargeting,
    "preItemRoll"               : preItemRoll,
    "postNoAction"              : postNoAction,
    "preStart"                  : preStart,
    "postStart"                 : postStart,
    "preAoETargetConfirmation"  : preAoETargetConfirmation,
    "postAoETargetConfirmation" : postAoETargetConfirmation,
    "preValidateRoll"           : preValidateRoll,
    "postValidateRoll"          : postValidateRoll,
    "prePreambleComplete"       : prePreambleComplete,
    "preambleComplete"          : preambleComplete,
    "postPreambleComplete"      : postPreambleComplete,
    "preWaitForAttackRoll"      : preWaitForAttackRoll,
    "preAttackRoll"             : preAttackRoll,
    "postWaitForAttackRoll"     : postWaitForAttackRoll,
    "preAttackRollComplete"     : preAttackRollComplete,
    "preCheckHits"              : preCheckHits,
    "postAttackRoll"            : postAttackRoll,
    "postAttackRollComplete"    : postAttackRollComplete,
    "preWaitForDamageRoll"      : preWaitForDamageRoll,
    "preDamageRoll"             : preDamageRoll,
    "postWaitForDamageRoll"     : postWaitForDamageRoll,
    "preConfirmRoll"            : preConfirmRoll,
    "postConfirmRoll"           : postConfirmRoll,
    "preDamageRollStarted"      : preDamageRollStarted,
    "postDamageRollStarted"     : postDamageRollStarted,
    "preDamageRollComplete"     : preDamageRollComplete,
    "postDamageRoll"            : postDamageRoll,
    "postDamageRollComplete"    : postDamageRollComplete,
    "preWaitForSaves"           : preWaitForSaves,
    "preSave"                   : preSave,
    "postWaitForSaves"          : postWaitForSaves,
    "preSavesComplete"          : preSavesComplete,
    "postSave"                  : postSave,
    "postSavesComplete"         : postSavesComplete,
    "preAllRollsComplete"       : preAllRollsComplete,
    "preDamageApplication"      : preDamageApplication,
    "postAllRollsComplete"      : postAllRollsComplete,
    "preApplyDynamicEffects"    : preApplyDynamicEffects,
    "preActiveEffects"          : preActiveEffects,
    "postApplyDynamicEffects"   : postApplyDynamicEffects,
    "preRollFinished"           : preRollFinished,
    "postActiveEffects"         : postActiveEffects,
    "postRollFinished"          : postRollFinished,
    "preCleanup"                : preCleanup,
    "postCleanup"               : postCleanup,
    "preCompleted"              : preCompleted,
    
    // Damage Bonus - Recommend not to use
    "DamageBonus"                 : DamageBonus,

    // Target Workflows
    "isAttacked"                    : isAttacked,
    "isHit"                         : isHit,
    "preSaveTarget"                 : preSaveTarget,
    "isSave"                        : isSave,
    "isSaveSuccess"                 : isSaveSuccess,
    "isSaveFailure"                 : isSaveFailure,
    "isDamaged"                     : isDamaged,
    "preTargetDamageApplication"    : preTargetDamageApplication,

    "on"    :   effectOn,
    "each"  :   effectTurn,
    "off"   :   effectOff,
*/

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
    Below this line is the main function which runs everything else... you shouldn't need to
    modify this unless you need some additional debug information that isn't coming back.
    --------------------------------------------------------------------------------------------*/
   
    let workflowReturn; 
    const [firstArg] = args;
    let  workflowAction = (firstArg.macroPass || firstArg);
    try {
        if (macroUtil.debugLevel) {
            console.group(`%c↳ (${macroItem.name}) [${workflowAction}]`, 'background:black; color: white; padding:2px 5px;font-weight:bold;');
        }

        if (firstArg.tag == "OnUse" || firstArg.tag == "DamageBonus" || firstArg.tag == "TargetOnUse"){
            if (macroUtil.debugLevel > 2) console.warn("midiWorkflow:", workflow);
            if (!config[workflowAction]) console.error(`Undefined workflow attempting to run : ${workflowAction}`);
            else workflowReturn = await config[workflowAction](firstArg);

            // Handle some compatibilty corner cases
            // TODO(bakanabaka)
            // End corner cases

            if (macroUtil.debugLevel > 1) {
                if (workflow.aborted) console.warn("Aborted flag on workflow is set to :", workflow.aborted);
            }
        } else {            
            if (!config[workflowAction]) console.error(`Undefined workflow attempting to run : ${workflowAction}`);
            else workflowReturn = await config[workflowAction](args.splice(1));
        }

        if(macroUtil.debugLevel) console.groupEnd();
        return workflowReturn;
    } catch (e) {
        ui.notifications.error(`An unexpected error occurred in the execcution of the ${macroItem.name} ItemMacro. Please press <F12> and inspect the console errors for more information.`);
        console.group(`%c❗❗ (${macroItem.name}) [Error in ${workflowAction}] ❗❗`, 'background:black; color: white; padding:2px 5px;font-weight:bold;');
        console.error("Unexpected error occurred :", e);
        if (config.exceptionHandler) await config.exceptionHandler(e);
        console.groupEnd();
        if(macroUtil.debugLevel) console.groupEnd(); 
    }
}

export const workflowApi = { runWorkflows };