// ##################################################################################################
// Read First!!!!
// Reaction that reduces the damage taken by 2d4 (+1d4 per spell level) for melee attacks and adds a
// +2 bonus (intended as half cover) until the user's next turn.
// v1.0.0
// Author: tb
// Dependencies:
//  - DAE
//  - MidiQOL "on use" actor macro [isTargeted],[isDamaged],[isSave],[isHit],[isMissed]
//  - MidiQOL "on use" item macro [postPreambleComplete]
//  - Elwin Helpers world script
//
// Usage:
//   When used, rolls an Intelligence Check using the appropriate skill depending on the selected creature and
//   outputs the result.
//
// Description:
// There are multiple calls of this item macro.
// In the isTargeted (actor OnUse) phase of a damaging activity (in attacker's workflow):
//   Any unwelcome Spiny Shield Cover effects are removed to make sure there are no problems,
//   then if the attack is a ranged attack a Spiny Shield Cover effect is created.
// In the isDamaged (actor OnUse) phase of a damaging activity (in attacker's workflow):
//   The Reflect Damage activity is rolled applying 2d4 piercing (scales) damage to the attacker,
//   then the incoming damage is reduced by that amount.
// In the isSave/isHit/isMissed (actor OnUse) phase of a damaging activity (in attacker's workflow):
//   The Spiny Shield Cover effects are removed for good measure.
// In the postPreambleComplete (item OnUse) phase of the reaction (in owner's workflow):
//   A Spiny Shield Cover effect is created for this workflow as it will not trigger isTargeted.
// ###################################################################################################

// Default name of the item
const DEFAULT_ITEM_NAME = 'Spiny Shield';
const WORLD_ID = 'world';

/**
 * Validates if the required dependencies are met.
 *
 * @returns {boolean} True if the requirements are met, false otherwise.
 */
function checkDependencies() {
  if (!foundry.utils.isNewerVersion(globalThis?.elwinHelpers?.version ?? '1.1', '3.5.0')) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | The Elwin Helpers setting must be enabled.`;
    ui.notifications.error(errorMsg);
    return false;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return false;
  }
  return true;
}

export async function spinyShield({ speaker, actor, token, character, macroItem, args, scope, workflow, options }) {
  if (!checkDependencies()) {
    return;
  }
  
  //isSave should never come up but just incase, DAE expiry was being wierd with this effect so this is my solution.
  const removeTags = [
    'isTargeted',
    'isSave',
    'isHit',
    'isMissed'
  ]
  
  if (args[0].tag === 'TargetOnUse' && removeTags.includes(args[0].macroPass)) {
  	const effect = actor.appliedEffects.find(ef => ef.flags['midi-item-showcase-community']?.tb?.identifier === 'spiny-shield-cover');

    if(effect) {
      if (!actor.isOwner) await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: token.actor.uuid, effects: [effect.id], options: {} });
      else await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
    }
    
    if (args[0].macroPass === 'isTargeted') {
      await handleSpinyShieldCover(workflow.token, workflow.activity ?? workflow.item, false);
    }
  }
  else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'isDamaged') {
    if(!elwinHelpers.isMeleeAttack(workflow.activity ?? workflow.item, workflow.token, token)) {
      return;
    }

    const activity = macroItem.system.activities.find(activity => activity.identifier === 'reflect-damage');
    
    const midiOptions = {
      targetUuids: [workflow.token.document.uuid],
      configureDialog: false,
      ignoreUserTargets: true,
      workflowOptions: {
        autoRollDamage: true,
        autoFastDamage: true
      }
    };
    
    // cpr scraped - call as the owner.
    if (!activity.actor?.testUserPermission(game.user, 'OWNER')) {
      let permissions = foundry.utils.getProperty(activity.actor ?? {}, 'ownership') ?? {};
      let playerOwners = Object.entries(permissions).filter(([id, level]) => !game.users.get(id)?.isGM && game.users.get(id)?.active && level === 3).map(([id]) => id);
      
      if (playerOwners.length > 0) {
        midiOptions.checkGMStatus = true;
        midiOptions.asUser = (playerOwners.length > 0) ? playerOwners[0] : gmOwners[0];
      }
    }
    
    const config = {
      consumeUsage: false,
      consumeSpellSlot: false,
      consume: {
        resources: false
      },
      midiOptions
    }
    
    const effect = actor.appliedEffects.find(ef => ef.name === 'Spiny Shield' || ef.name === macroItem.name);
    
    const spellLevel = Object.entries(actor.system.spells)?.find(i => i[1].level == effect?.flags['midi-qol']?.castData?.castLevel)?.[0];
    
    if (spellLevel) {
      config.spell = { slot: spellLevel };
    }
    
    const spinyShieldDR = await MidiQOL.completeActivityUse(activity, config, { configure: false });
    
    elwinHelpers.reduceAppliedDamage(workflow.damageItem, spinyShieldDR.damageItem.rawDamageDetail[0].value, macroItem);
  }
  else if (args[0].tag === 'OnUse' && args[0].macroPass === 'postPreambleComplete' && workflow.activity?.type === 'utility' && workflow.activity?.activation?.type === 'reaction') {
    const sourceToken = MidiQOL.getTokenForActor(await fromUuid(workflow.workflowOptions.sourceActorUuid));
    const triggerActivity = await fromUuid(workflow.workflowOptions.sourceItemUuid);
    
    await handleSpinyShieldCover(sourceToken, triggerActivity, true);
    
    const eventUuid = workflow.activity?.uuid ?? workflow.item?.uuid;
  }
  
  
  /**
   * Handles the spiny shield cover effect on an actor, based on if it was a ranged attack, faking the cover checks if needed.
   *
   * @param {Token5e} sourceToken - The token that the attack originates from.
   * @param {Item5e|Activity} triggerActivity - The item/activity that set up the attack.
   * @param {bool} fakeCover - If this is true we are being called during the reaction workflow so we check if midi-qol has applied cover and do it that way..
   */
  async function handleSpinyShieldCover(sourceToken, triggerActivity, fakeCover) {
    if (!elwinHelpers.isRangedAttack(triggerActivity, sourceToken, token)) return;
        
    let acBonus = foundry.utils.getProperty(actor, 'flags.midi-qol.acBonus');
    
    console.log(acBonus);
    
    // if this is a reaction, we are too late to mess with acBonus so we just fake it till we make it for this effect!    
    if (fakeCover) {
      if (acBonus >= 2) return;
      // we already have half cover the spell is ineffective (the +2 is treated as half cover).
      // if this spell actually means for the purposes of sharpshooter and not just get half cover if you dont have it I guess this needs to be changed!
      
      //this is heresy but its copied from midiqol and adapted so we dont get issues.
      const noCoverFlag = foundry.utils.getProperty(sourceToken.actor, `flags.midi-qol.ignoreCover`);
      
      let ignoreCover = false;
      if (noCoverFlag) {
        const conditionData = MidiQOL.createConditionData({ workflow, target: token, actor: sourceToken.actor });
        ignoreCover ||= MidiQOL.evalAllConditions(sourceToken.actor, `flags.midi-qol.ignoreCover`, conditionData);
      }
      
      if (workflow.activity?.actionType === "rsak" && foundry.utils.getProperty(token.actor, "flags.dnd5e.spellSniper")) {
        const conditionData = MidiQOL.createConditionData({ workflow, target: token, actor: sourceToken.actor });
        ignoreCover ||= MidiQOL.evalAllConditions(sourceToken.actor, `flags.dnd5e.spellSniper`, conditionData);
      }
      
      const sharpShooterFlag = foundry.utils.getProperty(sourceToken.actor, `flags.midi-qol.sharpShooter`) || foundry.utils.getProperty(sourceToken.actor, `flags.dnd5e.sharpShooter`);
      if (workflow.activity?.actionType === "rwak" && sharpShooterFlag) {
        const conditionData = MidiQOL.createConditionData({ workflow, target: token, actor: sourceToken.actor });
        ignoreCover ||= MidiQOL.evalAllConditions(sourceToken.actor, `flags.midi-qol.sharpShooter`, conditionData);
        ignoreCover ||= MidiQOL.evalAllConditions(sourceToken.actor, `flags.dnd5e.sharpShooter`, conditionData);
      }
      
      if (!acBonus) acBonus = 0;
      
      if (ignoreCover) return;
    }    
  
    // note: it is so infinitesimally impossible that the calculated acBonus will be 1 but JUST INCASE we do this with fakeCover, specialduration incase it lingers.
    const effectData = {
      img: macroItem.img,
      changes: [
        {
          key: fakeCover ? 'system.attributes.ac.bonus' : 'flags.midi-qol.acBonus',
          mode: fakeCover ? CONST.ACTIVE_EFFECT_MODES.ADD : CONST.ACTIVE_EFFECT_MODES.UPGRADE,
          value: fakeCover ? (2 - acBonus) : 2,
          priority: 20,
        },
      ],
      flags: {
        dae: { 
          stackable: 'noneName',
          specialDuration: [ 'turnStartSource' ]
        },
        'midi-item-showcase-community': { 
          tb: { identifier: 'spiny-shield-cover' }
        },
      },
      name: 'Spiny Shield Cover',
      origin: actor.uuid,
    };
      
    if (!actor.isOwner) await MidiQOL.socket().executeAsGM('createEffects', { actorUuid: actor.uuid, effects: [effectData] });
    else await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }
}