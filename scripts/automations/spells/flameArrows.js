export async function flameArrows({
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
  // Variables needed for the code to work
  let target = workflow.targets.first().actor;
  const hasConcApplied = MidiQOL.getConcentrationEffect(actor, scope.macroItem.uuid);
  let spellLevel = workflow.castData.castLevel;
  let effect = target.effects.getName('Flame Arrows');
  if (effect) return; // Exit if the effect is already on the target
  let ammo = 2 * spellLevel + 6; // 2 * (spellLevel - 3) + 12
  const effectData = {
    name: scope.macroItem.name,
    changes: [
      {
        key: 'flags.midi-qol.optional.flameArrows.activation',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: "workflow.hitTargets.size, item.actionType === 'rwak'",
      },
      {
        key: 'flags.midi-qol.optional.flameArrows.damage.rwak',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: '1d6[fire]',
      },
      {
        key: 'flags.midi-qol.optional.flameArrows.label',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: 'Flame Arrows',
      },
      {
        key: 'flags.midi-qol.optional.flameArrows.force',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: 'true',
      }, // Change to flase if you don't want to always use the flame arrows
      {
        key: 'flags.midi-qol.optional.flameArrows.count',
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        value: ammo,
      },
    ],
    icon: 'icons/weapons/ammunition/arrow-broadhead-glowing-orange.webp', // Place the path of your image here in between the ` `
    origin: hasConcApplied.uuid,
    duration: {
      seconds: 3600,
    },
  };
  let effectName = await MidiQOL.socket().executeAsGM('createEffects', {
    actorUuid: target.uuid,
    effects: [effectData],
  });
  await MidiQOL.socket().executeAsGM('addDependent', {
    concentrationEffectUuid: hasConcApplied.uuid,
    dependentUuid: `${effectName[0].uuid}`,
  });
}
