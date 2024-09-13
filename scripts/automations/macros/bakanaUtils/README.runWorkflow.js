/**
 *  Midiworkflow usage suggestions:
 * "preItemRoll"                   : Disable consumption usage
 * "preDamageRollComplete"         : Damage roll modifications (addition/removal)
 * "postDamageRoll"                : Damage die replacement
 * "postDamageRollComplete"        : Damage type conversions

    // On Use : two ways to activate
    // (this item only)     Midi-QOL on Use (this item only)
    // (all items on actor) flags.midi-qol.onUseMacroName | Custom | <macroRef>,<targetOnUse>{.<source>}
      preTargeting
      preItemRoll
      postNoAction
      preStart
      postStart
      preAoETargetConfirmation
      postAoETargetConfirmation
      preValidateRoll
      postValidateRoll
      prePreambleComplete
      preambleComplete
      postPreambleComplete
      preWaitForAttackRoll
      preAttackRoll
      postWaitForAttackRoll
      preAttackRollComplete
      isAttacked*
      preCheckHits
      isHit*
      postAttackRoll
      postAttackRollComplete
      preWaitForDamageRoll
      preDamageRoll
      postWaitForDamageRoll
      preConfirmRoll
      postConfirmRoll
      preDamageRollStarted
      DamageBonus**
      postDamageRollStarted
      preDamageRollComplete
      postDamageRoll
      postDamageRollComplete
      preWaitForSaves
      preSave
      isSaveSuccess*
      isSaveFailure*
      isSave*
      postWaitForSaves
      preSavesComplete
      postSave
      postSavesComplete
      preAllRollsComplete
      preTargetDamageApplication*
      isDamaged*
      preDamageApplication
      postAllRollsComplete
      preApplyDynamicEffects
      preActiveEffects
      postApplyDynamicEffects
      preRollFinished
      postActiveEffects
      postRollFinished
      preCleanup
      postCleanup
      preCompleted

      No notation: OnUse
      * TargetOnUse
      ** DamageBonus

    // Target On Use Workflows
    flags.midi-qol.onUseMacroName | Custom | <macroRef>,<targetOnUse>{.<source>}
      isAttacked,
      isHit,
      preSaveTarget,
      isSave,
      isSaveSuccess,
      isSaveFailure,
      isDamaged,
      preTargetDamageApplication,

    Third party reactions (exerpt from elwinsHelpers.js)
    flags.midi-qol.onUseMacroName | Custom | <macroRef>,<thirdPartyReactionTrigger>|<thirdPartyReactionOptions>
     - tpr.isTargeted: this is called in MidiQOL preValidateRoll, which is just before it validates a target’s range from the attacker.
     - tpr.isPreAttacked: this is called just before the attacker’s d20 roll.
     - tpr.isHit: this is called after MidiQOL validated that a target was hit.
     - tpr.isMissed: this is called after MidiQOL validated that a target was missed.
     - tpr.isDamaged: this is called after MidiQOL computed the damage to be dealt to a target but before it is applied.
     - tpr.isHealed: this is called after MidiQOL computed the healing to be done to a target but before it is applied.
     - tpr.isPreCheckSave: this is called just before a saving throw check is asked from the target.
   - thirdPartyReactionOptions: The options consist of a list of parameter/value pairs separated by `;`. The parameter and its value is separated by a `=`.
     - ignoreSelf: true or false to indicate if the owner being a target must not trigger the reaction. [default false]
     - triggerSource: target or attacker, determines to whom the canSee option, the item’s range and target applies. [default target]
     - canSee: true or false, if the trigger source must be seen or not by the owner. [default false]
     - pre: true or false, indicates if a pre reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.pre` suffix,
     - post: true or false, indicates if a post reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.post` suffix,

  // Item Macro effects
    "on"    :   effectOn,
    "each"  :   effectTurn,
    "off"   :   effectOff,
*/
