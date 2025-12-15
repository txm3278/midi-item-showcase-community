// ##################################################################################################
// Read First!!!!
// Adds a prompt to raise a specter as an ally after defeating a humanoid creature.
// v5.1.9
// Dependencies:
//  - MidiQOL "on use" actor macro [postActiveEffects]
// Optional Dependencies:
//  - DAE provides summon expiry on long rest
//  - CPR provides hands free setup and cleaner summoning
//
// Usage:
// This item has a passive effect that triggers a prompt once per long rest when a humanoid is defeated.
//
// Description:
// In the postActiveEffects (actor OnUse) phase of any item roll (in owner's workflow):
//   Validates that this item has remaining uses, the actor has a warlock class, and
//   the target is a humanoid with zero hit points. The activity workflow execution is otherwise aborted.
// In the preItemRoll (item OnUse) phase of this item (in owner's workflow):
//   Validates that the appropriate settings are configured. If CPR is not installed, the user must have
//   Permissions -> Token Create and DND5E -> Allow Summoning. If these requirements are met, summoning
//   is initiated based on whether CPR is installed. With CPR, the core summon is cancelled in the 
//   dnd5e.preSummon hook and the CPR summon is called in the next pass. Without CPR, the creature
//   summoned by the system summon activity is updated in the dnd5e.postSummon hook with bonuses
//   as described in this feature. If DAE is installed, a special duration is added to the summoner's
//   active effect in order to automatically expire the summon.
// In the postNoAction (item OnUse) phase of this item (in owner's workflow):
//   This phase is only used if CPR is installed in order to delay the CPR summon until after config
//   dialogs are closed.
// ###################################################################################################

export async function accursedSpecter({
  speaker,
  actor,
  token,
  character,
  item,
  args,
  scope,
  workflow,
  options,
}) {
  const DEFAULT_CLASS_ID = "warlock";
  const DEFAULT_BONUS_ABILITY = "cha";

  const DAE_MODULE_ID = "dae"
  const DAE_EXPIRY = "longRest";

  const CPR_MODULE_ID = "chris-premades";
  const CPR_RANGE = 30;
  const CPR_ANIMATION = "smoke";

  // trigger after slaying a humanoid - actor OnUse
  if (args[0].macroPass === "postActiveEffects") {
    const uses = scope.macroItem.system.uses;
    if (uses.value <= 0) return;
    if (!actor.classes[DEFAULT_CLASS_ID]) return;
    
    const slayed = workflow.hitTargets.some(t => 
      t.actor.system.attributes.hp.value <= 0 &&
      MidiQOL.humanoid.includes(MidiQOL.typeOrRace(t)));

    if (!slayed) return;
    const choice = await foundry.applications.api.Dialog.confirm({
      window: { title: `${actor.name} - ${scope.macroItem.name}` },
      content: `<div style="text-align:center">${game.i18n.localize("DND5E.SUMMON.Title")} ${scope.macroItem.name}?</div>
      <div style="text-align:center">${game.i18n.localize("DND5E.ConsumeCharges")} <b>${uses.value} / ${uses.max}</b></div>`
    });
    if (choice) MidiQOL.completeItemUse(scope.macroItem, {}, {configure: false});
  }

  if (scope.macroActivity.identifier !== "accursed-specter") return;
  const attackBonusEffect = getEffect(Math.max(0, actor.system.abilities[DEFAULT_BONUS_ABILITY].mod));
  const tempHP = Math.floor(0.5 * actor.classes[DEFAULT_CLASS_ID]?.system.levels ?? 0);

  // setup - item OnUse
  if (args[0].macroPass === "preItemRoll") {
    if (!requirementsMet()) return false;
    
    if (game.modules.has(CPR_MODULE_ID)) {
      if (game.user.can("TOKEN_CREATE")) {
        const preHook = Hooks.on("dnd5e.preSummon", (activity) => {
          if (activity.id !== scope.macroActivity.id) return;      
          Hooks.off("dnd5e.preSummon", preHook);
          return false;
        });
      }
    } else {
      const postHook = Hooks.on("dnd5e.postSummon", (activity, _, summons) => {
        if (activity.id !== scope.macroActivity.id) return;
        Hooks.off("dnd5e.postSummon", postHook);

        for (const summon of summons) {
          summon.actor.update({"system.attributes.hp.temp": tempHP});
          if (token.inCombat)
            summon.actor.rollInitiative({createCombatants: true});
          if (attackBonusEffect)
            summon.actor.createEmbeddedDocuments("ActiveEffect", [attackBonusEffect]);
        }
      });
    }
    
    if (game.modules.has(DAE_MODULE_ID)) {
      // don't hook if summoner effect is already present
      if (actor.effects.some(e => e.origin === scope.macroItem.uuid &&
      (e.name.includes(game.i18n.localize("DND5E.SUMMON.Title")) || // midi summon
      !!e.flags[CPR_MODULE_ID]?.summons?.ids[scope.macroItem.name]))) // cpr summon
          return;
      
      const effectHook = Hooks.on("preCreateActiveEffect", effect => {
        if (effect.parent.id !== actor.id || effect.origin !== scope.macroItem.uuid) return;
        Hooks.off("preCreateActiveEffect", effectHook);
        
        const specials = effect.getFlag(DAE_MODULE_ID, "specialDuration") ?? [];
        specials.push(DAE_EXPIRY);
        effect.updateSource({
          duration: ActiveEffect.prototype.schema.fields.duration.getInitialValue(),
          "flags.dae.specialDuration": specials
        });
      });
    }
  }

  // CPR summoning - item OnUse
  if(args[0].macroPass === "postNoAction" && game.modules.has(CPR_MODULE_ID)) {
      const uuid = scope.macroActivity.profiles?.[0]?.uuid;
      const summon = await fromUuid(uuid);
      if (!summon) {
        ui.notifications.warn(`[${scope.macroItem.name}]: ${game.i18n.format("DND5E.SUMMON.Warning.NoProfile",{profileId: "", item: scope.macroItem.name})}`);
        return;
      }
      
      const tokenData = { disposition: token.document.disposition };
      const updates = [{ 
        actor: {
          system: { attributes: { hp: { temp: tempHP }}},
          effects: attackBonusEffect ? [attackBonusEffect] : [],
          prototypeToken: tokenData
        },
        token: tokenData
      }];
      chrisPremades.Summons.spawn(summon, updates, scope.macroItem, token, {
        range: CPR_RANGE,
        animation: CPR_ANIMATION
      });
  }

  function getEffect(abilityMod) {
    if (abilityMod <= 0) return;
    
    const baseEffect = {
      name: `${scope.macroItem.name} - ${game.i18n.localize("DND5E.BonusAttack")}`,
      img: scope.macroItem.img,
      origin: scope.macroItem.uuid
    };
    
    if (game.modules.has(DAE_MODULE_ID)) {
      baseEffect.changes = [{
        key: 'system.bonuses.All-Attacks',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        priority: 20,
        value: abilityMod
      }];
    } else {
      baseEffect.changes = ["msak", "mwak", "rsak", "rwak"].map(a => a = {
        key: `system.bonuses.${a}.attack`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        priority: 20,
        value: `+${abilityMod}`
      });
    }
    return baseEffect;
  }

  function requirementsMet() {
    let met = true;
    if (!actor.classes[DEFAULT_CLASS_ID]) {
      const req = scope.macroItem.system.prerequisites.level;
      const msg = req ? 
        game.i18n.format("DND5E.Prerequisites.Warning.InvalidLevel", {level: req}) :
        game.i18n.localize("DND5E.MaxClassLevelMinimumWarn");
      ui.notifications.warn(`[${scope.macroItem.name}]: ${DEFAULT_CLASS_ID} - ${msg}`);
      met = false;
    } 
    if(game.modules.has(CPR_MODULE_ID)) return met;
    
    // these are only needed for the system summon - CPR is socketed
    if (!game.user.hasPermission("TOKEN_CREATE")) {
      ui.notifications.warn(`[${scope.macroItem.name}]: ${game.i18n.localize("DND5E.ContextMenuActionEnable")} ${game.i18n.localize("PERMISSION.Permission")} - ${game.i18n.localize("PERMISSION.TokenCreate")} (<i>${game.i18n.localize("PERMISSION.TokenCreateHint")}</i>)`);
      met = false;
    }
    if (!game.settings.get("dnd5e", "allowSummoning")) {
      ui.notifications.warn(`[${scope.macroItem.name}]: ${game.i18n.localize("DND5E.ContextMenuActionEnable")} ${game.i18n.localize("SETTINGS.TabSystem")} - ${game.i18n.localize("SETTINGS.DND5E.PERMISSIONS.AllowSummoning.Name")}`);
      met = false;
    }
    return met;
  }
}