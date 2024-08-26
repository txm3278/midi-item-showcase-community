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
 * Advanced error handler for Midi Macros, wraps all code in a try/catch and helps organize code.
 * @param argumentInput The args value passed into the macro.
 * @param config Configurations defining how CompleteMidi will run.
 * @param config.verbose Verbose debug settings.
 * @param config.WORKFLOWNAME A function to run when the specified workflow occurs. (eg preCheckHits / off)
 * @param config.exceptionHandler(e) A function which runs before exit on a caught exception
 */
async function runWorkflows(argumentInput, config) {
  const [speaker, actor, token, character, scope, workflow, item, rolledItem, macroItem, args, options, midiData] = argumentInput;

  /* ---------------------------------------------------------------------------------------------
    Below this line is the main function which runs everything else... you shouldn't need to
    modify this unless you need some additional debug information that isn't coming back.
    --------------------------------------------------------------------------------------------*/
   
    let workflowReturn; 
    const [firstArg] = args;
    let  workflowAction = firstArg.macroPass || firstArg;
    try {
        if (macroUtil.debugLevel) {
        
            console.group(
            	`%c↳ (${macroItem.name}) [${workflowAction}]`,
            	'background:black; color: white; padding:2px 5px;font-weight:bold;'
            );
        }

        if (firstArg.tag == "OnUse" || firstArg.tag == "DamageBonus" || firstArg.tag == "TargetOnUse"){
            if (macroUtil.debugLevel > 2) console.warn("midiWorkflow:", workflow);
            if (!config[workflowAction]) 
              console.warn(`Undefined workflow attempting to run : ${workflowAction}`);
            else workflowReturn = await config[workflowAction](firstArg);


            if (macroUtil.debugLevel > 1) {
                if (workflow.aborted) console.warn("Aborted flag on workflow is set to :", workflow.aborted);
            }
        } else {            
            if (!config[workflowAction]) {
              if (workflowAction != "on" && workflowAction != "off")
                console.warn(`Undefined workflow attempting to run : ${workflowAction}`);
            } else workflowReturn = await config[workflowAction](args.splice(1));
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
