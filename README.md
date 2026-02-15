# Midi Item Showcase - Community

![GitHub Release](https://img.shields.io/github/v/release/txm3278/midi-item-showcase-community) ![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/txm3278/midi-item-showcase-community/total)

A collection of Midi Automations from the Posney's Foundry Automation Discord

## Automations added with permission from

- Elwin
- Moto Moto
- thatlonelybugbear
- WurstKorn
- Bakana
- Xenophes
- SagaTympana
- Christopher
- Fridan99
- tb

## Elwin Helpers

A collection of utility functions to facilitate automations.

### List of Functions

- elwinHelpers.isDebugEnabled - Returns the current value of the debug flag.
- elwinHelpers.setDebugEnabled - Sets the current value of the debug flag.
- elwinHelpers.getTargetDivs - Returns div to place in a chat card containing info about a target name, on version for players and one for the GM.
- elwinHelpers.reduceAppliedDamage - Reduces the applied damage by a specified amount on a midi damageItem object.
- elwinHelpers.calculateAppliedDamage - Recomputes the applied damage for a midi damageItem.
- elwinHelpers.insertTextIntoMidiItemCard - Inserts text into an item card.
- elwinHelpers.requirementsSatisfied - Utility function to check module requirements.
- elwinHelpers.isWeapon - Returns true if an item is a weapon.
- elwinHelpers.isMeleeWeapon - Returns true if an item is a melee weapon.
- elwinHelpers.isRangedWeapon - Returns true if an item is a ranged weapon.
- elwinHelpers.isRangedAttack - Returns true if an activity is considered a ranged attack.
- elwinHelpers.isRangedWeaponAttack - Returns true if an activity is considered a ranged weapon attack.
- elwinHelpers.isMeleeAttack - Returns true if an activity is considered a melee attack.
- elwinHelpers.isMeleeWeaponAttack - Returns true if an activity is considered a melee weapon attack.
- elwinHelpers.isMidiHookStillValid - Utility function to validate if a dnd5e hook has been called for the same midi-qol workflow on which it was registered.
- elwinHelpers.getTokenName - Returns the token name using midi-qol config for token name.
- elwinHelpers.getTokenImage - Returns the token image to display.
- elwinHelpers.getActorSizeValue - Returns the size value of an actor
- elwinHelpers.getSizeValue - Returns the value for a size.
- elwinHelpers.buttonDialog - Helper function to create a simple dialog with labeled buttons and associated data.
- elwinHelpers.remoteButtonDialog - Helper function to create a simple remote dialog with labeled buttons and associated data displayed to the specified user.
- elwinHelpers.getAttackSegment - Computes the intersection point between a source token and a target token and the ray used to compute the intersection.
- elwinHelpers.getMoveTowardsPosition - Returns the position where to move the token so its border is next to the specified point.
- elwinHelpers.findMovableSpaceNearDest - Returns a position near the specified destPos where the specified token can be moved.
- elwinHelpers.convertCriticalToNormalHit - Converts a midi-qol workflow's critical into a normal hit.
- elwinHelpers.adjustAttackRollTargetAC - Adjust the midi-qol workflow attack roll target AC, it is used by dnd5e chat message to display the attack result.
- elwinHelpers.getDamageRollOptions - Returns the damage roll options based on the options set on the first damage roll of the midi-qol worflow.
- elwinHelpers.getAppliedEnchantments - Gets the applied enchantments for the specified item or activity uuid if any exist.
- elwinHelpers.deleteAppliedEnchantments - Deletes the applied enchantments for the specified item or activity uuid.
- elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll - Disables manual enchantment placing and configuration dialog if enchantment already exists.
- elwinHelpers.toggleSelfEnchantmentOnUsePostActiveEffects - Applies or removes an enchantment to/from the item of the used enchantment activity.
- elwinHelpers.getAutomatedEnchantmentSelectedProfile - Returns the selected enchantment profile for automated enchantment application.
- elwinHelpers.applyEnchantmentToItem - Applies programmatically an enchantment to the specified item.
- elwinHelpers.applyEnchantmentToItemFromOtherActivity - Applies programmatically an enchantment to the specified item from an enchant activity different than the one from the workflow
- elwinHelpers.getEquippedWeapons - Returns a list of equipped weapons for a specified actor.
- elwinHelpers.getEquippedMeleeWeapons - Returns a list of equipped melee weapons for a specified actor.
- elwinHelpers.getEquippedRangedWeapons - Returns a list of equipped ranged weapons for a specified actor.
- elwinHelpers.getRules - Returns `modern` or `legacy` depending on the specified item rules version.
- elwinHelpers.registerWorkflowHook - Registers a callback on an event for the duration of the specified workflow. 
- elwinHelpers.damageConfig.updateBasic - Updates the damage roll configuration by adding a damage bonus and or replacing the damage type of the rolls.
- elwinHelpers.damageConfig.updateCustom - Updates the damage roll configuration by executing the specified callback function.
- elwinHelpers.attachToToken - Marks the specified UUIDs as attached to the specified token. When the token moves, the attached entities, will be updated accordingly (x, y, elevation, rotation).
- elwinHelpers.detachFromToken - Removes the specified UUIDs from the entities attached to the specified token.
- elwinHelpers.attachToTemplate - Marks the specified UUIDs as attached to the specified template document. When the template document is updated, the attached entities, will be updated accordingly (x, y, elevation, rotation).<br>**Note:** Currently only attachments to circle templates are supported.
- elwinHelpers.detachFromTemplate - Removes the specified UUIDs from the entities attached to the specified template document.
- elwinHelpers.attachAmbientLightToTemplate - Creates and attaches an ambient light source to the specified template document.<br>**Note:** ambient light sources can only be attached to circle templates and they are attached with the sync option true.
- elwinHelpers.getEffectiveDamage - Calculates the effective damage totals by categories from a list of damages.
- elwinHelpers.getReactionFlavor - Returns the reaction flavor for the reaction dialog.
- elwinHelpers.getReactionSetting - Returns the reaction setting for the specified user.
 <br>**Note:** Copied from midi-qol because this utility function is not exposed.
- elwinHelpers.enchantItemTemporarily - Enchants the specified item to change the activation type of its activities to special for the specified activity types that matches its conditions, otherwise the activities are marked as automationOnly.
- elwinHelpers.ItemSelectionDialog - Utility dialog to select an item from a list of items.
- elwinHelpers.TokenSelectionDialog - Utility dialog to select a token from a list of tokens.

### Enchantment Extra Restrictions

If you want to have add more restrictions on which item can be enchanted than the ones offered by dnd5e on the enchantment activity, you can use special flags on your Enchantement Active Effect.

- **Key**: `flags.[world|midi-item-showcase-community].elwinHelpers.extraEnchantRestrictions.<index>.condition`
- **Change Mode**: Override
- **Value**: A condition which must evaluates to true. The available data comes from midi-qol conditional data for the target item roll data.
 This is executed using `MidiQOL.evalCondition` function.
- **Key**: `flags.[world|midi-item-showcase-community].elwinHelpers.extraEnchantRestrictions.<index>.conditionMsg`
- **Change Mode**: Override
- **Value**: The message to be displayed if the condition for the same index is false.

The extra restrictions are evaluated by index order (which can have a value from 0 to 99). If a condition does not have an associated condition message, the condition will be displayed instead.

Example:
`flags.midi-item-showcase-community.elwinHelpers.extraEnchantRestrictions.1.condition` | `Override` | `["greatsword", "longsword", "rapier", "scimitar", "shortsword"].includes(item.type?.baseItem)`
`flags.midi-item-showcase-community.elwinHelpers.extraEnchantRestrictions.1.conditionMsg` | `Override` | `The item must be a sword.`

### Third Party Reaction Framework

To use this new third party reaction framework you need to define an active effect (usually a transfer effect) using the following key and value:

- **Key**: flags.midi-qol.onUseMacroName
- **Change Mode**: Custom
- **Value**: `<macroRef>,<thirdPartyReactionTrigger>|<thirdPartyReactionOptions>`

The value is composed of three parts, the first two are similar to those used by normal MidiQOL onUseMacroName.

- **macroRef**: this can be an item macro, a macro, or a function, it uses the same syntax MidiQOL uses.
- **thirdPartyReactionTrigger**: the currently supported values are:
  - tpr.isTargeted: this is called in the "midi-qol.preValidateRoll" hook, which is just before it validates a target’s range from the attacker.
  - tpr.isPreAttacked: this is called in the "midi-qol.preAttackRoll" hook, which is called before the attacker’s d20 roll.
  - tpr.isAttacked: this is called in the "midi-qol.preCheckHits" hook, which is called after the attacker’s d20 roll but before validating if a target was hit or missed.
  - tpr.isHit: this is called in the "midi-qol.hitsChecked" hook, which is called after MidiQOL validated that a target was hit.
  - tpr.isMissed: this is called in the "midi-qol.hitsChecked" hook, which is called after MidiQOL validated that a target was missed.
  - tpr.isPreDamaged: this is called in the "midi-qol.preDamageRoll" hook, which is called before the attacker's damage roll.
  - tpr.isDamaged: this is called in the "midi-qol.preTargetDamageApplication", which is called after MidiQOL computed the damage to be dealt to a target but before it is applied.
  - tpr.isHealed: this is called in the "midi-qol.preTargetDamageApplication", which is called after MidiQOL computed the healing to be done to a target but before it is applied.
  - tpr.isPreCheckSave: this is called in the "midi-qol.preCheckSaves", which is called just before a saving throw check is asked from the target.
  - tpr.isPostCheckSave: this is called in the "midi-qol.postCheckSaves", which is called after a saving throw check is asked from the target but before it is displayed.
- **thirdPartyReactionOptions**: The options consist of a list of parameter/value pairs separated by `;`. The parameter and its value is separated by a `=`.
  - ignoreSelf: true or false to indicate if the owner being a target must not trigger the reaction. [default false]
  - triggerSource: target or attacker, determines to whom the canSee option, the item’s range and target applies. [default target]
  - canSee: true or false, if the trigger source must be seen or not by the owner. [default false]
  - pre: true or false, indicates if a pre reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.pre` suffix,
       e.g.: `tpr.isHit.pre`. This macro is called in the triggering workflow (not supported when reactionNone is true).  [default false]
  - post: true or false, indicates if a post reaction macro should be called, its targetOnUse value will be the reaction trigger phase with a `.post` suffix,
       e.g.: `tpr.isHit.post`. This macro is called in the triggering workflow (not supported when reactionNone is true). [default false]
  - reactionNone: true or false, indicates that no reaction activity is associated and that only a macro should be called,
       its targetOnUse value will be the reaction trigger phase,
       e.g.: `tpr.isHit`. This macro is called in the triggering workflow. [default false]
  - range: the maximum range between the owner and the triggering source allowed to trigger the reaction, only used if reactionNone is true.
  - wallsBlock: true of false, indicates if wallsBlock, only used if reactionNone is true.
  - disposition: relative disposition of the triggering source compared to the owner, only used if reactionNone is true.
  - condition: condition to evaluate to trigger the reaction, only used if reactionNone is true.

Example: `ItemMacro,tpr.isDamaged|ignoreSelf=true;canSee=true;pre=true;post=true`

**TPR pre macro**: It is always called before prompting, it is used to set things or cleanup things, it can also be used to add complex activation condition, if it returns the object `{skip: true}`, this reaction will not be prompted.
    This is called before the prompt in the workflow of the attacker.

**TPR post macro**: It is always called after the prompt and execution of the selected reaction even it it was cancelled or a reaction was aborted.
    It should be used to cleanup and apply affects on the attacker's workflow if the proper reaction was chosen and was successful.

**TPR (reactionNone) macro**: It should be used to apply affects on the attacker's workflow.

The pre, post and reactionNone macros are called in the item use workflow, it means that any changes to the MidiQOL workflow are live. The macro parameters are the same as any macro call with an `args[0].tag` value of `'TargetOnUse'`.

The TPR pre, reaction and TPR post or TPR reactionNone are all executed in the same phase of the attacker's workflow. For example if `tpr.isAttacked`, they are executed after attack roll but before its evaluation for hit or miss.

When the tpr reaction is called, the following attributes in options are available:

- options.thirdPartyReaction.trigger: name of the tpr trigger, e.g.: tpr.isDamaged
- options.thirdPartyReaction.itemUuids: array of reaction uuids that were prompted on a trigger for an actor owner of TPR reactions.
- options.thirdPartyReaction.triggerSource: target or attacker, this depends on the value configured on the thirdPartyReactionOptions of the TPR active effect
- options.thirdPartyReaction.targetUuid: UUID of the target of the item that triggered the TPR, only set if the triggerSource is attacker.
- options.thirdPartyReaction.attackerUuid: UUID of the actor that used the item that triggered the TPR, only set if the triggerSource is target.

The reaction condition data is augmented for third party reactions. The following extra attributes are available:

- tpr.item: reaction item roll data.
- tpr.actor: reaction item owner’s roll data.
- tpr.actorId: actor id of the reaction item owner’s.
- tpr.actorUuid: actor UUID of the reaction item owner’s.
- tpr.tokenId: token id associated with the reaction item owner’s.
- tpr.tokenUuid: token UUID associated with the reaction item owner’s.
- tpr.canSeeTriggerSource: boolean to indicate if the owner canSee the triggerSource, usually the target but in some cases the attacker.
- tpr.isMeleeAttack: boolean to indicate if the item that triggered the reaction is a melee attack.
- tpr.isMeleeWeaponAttack: boolean to indicate if the item that triggered the reaction is a melee weapon attack.
- tpr.isRangedAttack: boolean to indicate if the item that triggered the reaction is a ranged attack.
- tpr.isRangedWeaponAttack: boolean to indicate if the item that triggered the reaction is a ranged weapon attack.

### Coating Framework

A list of utility functions to facilitate the implementation of substances that can be used to coat a weapon or ammunition to deliver damage or effects on hit.

- elwinHelpers.coating.getCoatingWeaponFilter - Returns a weapon filter function for the specified options.
- elwinHelpers.coating.getCoatingAmmoFilter - Returns an ammunition filter function for the specified options.
- elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects - Handles the coating of a weapon or ammunition.
- elwinHelpers.coating.handleCoatedItemOnUsePostActiveEffects - Handles the application of the coating effect activity when a coated weapon or ammunition hits.
- elwinHelpers.coating.handleCoatedItemOnUsePostDamageRoll - Handles the coating effect bonus damage that occurs during the coated item worflow.
- elwinHelpers.coating,handleCoatingEffectActivityConditionalStatuses - Handles adding the conditional statuses if at least one of the coating effect associated AEs was applied to the target.

To use this coating framework you must a create a consumable with the following pattern:

- Details tab:
  - Consumable Type: Poison [or any other type]
  - Poison Type: Injury [or any other subtype supported by the consumable type]
  - Limited Uses: 1 of [your amount of doses] per Charges
  - Destroy on Empty: (checked) [if desired]
- Activities tab:
  - [your consumable apply coating's activity name] of type Enchant.
    - Activation tab:
      - Time:
        - Activation Cost: Action or Bonus (most of the use cases)
      - Consumption:
        - Type: Item Uses
        - Amount: 1
      - Targeting:
        - Range: Self
    - Enchanting tab:
       You should have at least one enchantment active effect associated. You must also specify a special additional activity to be transferred with the enchantment. This activity must have a midi-qol identifier of `coating-effect` and be of type save or damage.
    - Midi-QOL tab:
      - Identifier: `apply-coating`
  - [your consumable coating effect's activity name] of type Save or Damage.
    - Activation tab:
      - Time:
        - Activation Cost: Special
        - Duration: duration of your enchanment if it expires after a specific time.
      - Targeting:
        - Range: Any
        - Target: 1 Creature (most of the use cases)
    - Effect tab: your coating effect, can also apply Active Effects
    - Midi-QOL tab:
      - Use Condition: `workflow?.hitTargets?.size === 1` (most of the use cases)
      - Identifier: `coating-effect`
      - Automation Only: (checked)
      - Other Activity Compatible: (checked)
- Midi-QOL tab:
  - On Use Macros:
    - `function.elwinHelpers.disableManualEnchantmentPlacingOnUsePreItemRoll` | Called before targeting is resolved
    - `function.elwinHelpers.coating.handleCoatingItemOnUsePostActiveEffects` | After Active Effects
- Effects tab: One special effect can also be added
  - [your consumable coating's name] - Config:
    - Transfer Effect to Actor on ItemEquip (unchecked)
    - Don't apply the effect: (checked)
    - Duration empty
    - Effects:
      - `flags.[world|midi-item-showcase-community].appliedCoating` | `Override` | `<JSON format of applied coating, see below>`

JSON format of applied coating effect:

- **allowedWeaponTypes**: Array of weapon types allowed to be coated.
    (true means all types allowed, null or undefined means default `["simpleM", "martialM", "simpleR", "martialR"])`.

- **allowedDamageTypes**: Array of damage types allowed to be coated.
    (true means all types allowed, null or undefined means default `["slashing", "piercing"])`.
- **allowedAmmoTypes**: Array of ammo types allowed to be coated.
    (true means all types allowed, undefined means use default mapping of damage type to ammo type).
- **maxWeaponHits**: The maximum number of hits allowed before the coating wears off.
     (default value of 1, 0 means no limit)
- **maxAmmo**: The maximum number of ammos than can be coated with one dose.
     (default value of 1, 0 means ammo not allowed).
- **conditionalStatuses**: Array of conditional statuses to be applied when a coated weapon or ammo hits if the condition is met.
  - *status*: Status to apply when the weapon or ammo hits.
  - *specialDurations*: Special durations to set on the conditional status.
  - *condition*: MidiQOL condition expression to determine if the conditional status can be applied or not on hit.

**Note**: the condition for the conditionalStatuses contains extra data that contains the target save total and DC,
      this allows for example to add an extra status depending on the level of save failure.

- targetData:
  - saveDC - The save DC of the coating item effect.
  - saveTotal - The save total of the hit target.

Examples of appliedCoating flag value:

1. Poison with extra status in case of failure by 5 or more on a hit.

    ```json
    {
      "conditionalStatuses": [
        {
          "status": "unconscious",
          "specialDurations": ["isDamaged"],
          "condition": "target.statuses?.has('poisoned') && (targetData?.saveTotal + 5) <= targetData?.saveDC"
        }
      ]
    }
    ```

2. Oil that allows any damage types and has 3 uses.

    ```json
    {
      "maxWeaponHits": 3,
      "maxAmmo": 3,
      "allowedDamageTypes": true,
    }
    ```
