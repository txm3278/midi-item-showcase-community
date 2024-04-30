export async function unarmedStrike({
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
  const targetToken = workflow.hitTargets.first();
  if (!targetToken) return;
  const targetActor = targetToken.actor;
  const effect = targetToken.actor.effects.getName(
    game.i18n.localize('Grappled')
  );

  if (!effect) {
    if (args[0].macroPass === 'postAttackRoll') {
      //prepare the dialog
      const title = scope.rolledItem.name;
      const content = 'Pick an attack';
      const buttons = {
        attack: { label: 'Attack' },
        grapple: { label: 'Grapple' },
      };
      const close = () => false;

      //dialog data
      const dialog = await Dialog.wait({ title, content, buttons, close });

      if (!dialog) return false;
      else if (dialog === 'grapple') {
        if (
          chrisPremades.helpers.getSize(targetActor) >
          chrisPremades.helpers.getSize(actor) + 1
        ) {
          ui.notifications.info('Target is too big to grapple!');
          return;
        }

        workflow.item = workflow.item.clone(
          { 'system.damage.parts': [] },
          { keepId: true }
        );

        if (game.modules.get('Rideable')?.active) {
          game.Rideable.Mount([targetToken.document], token.document, {
            Grappled: true,
            MountingEffectsOverride: ['Grappled'],
          });
        } else {
          // Prepare effect data for grappling state
          const effectData =
            game.dfreds.effectInterface.findEffectByName('Grappled');
          const uuid = targetToken.document.uuid;
          // Modify the effects data to restrict movement and flag for over time application
          effectData.changes = [
            {
              key: 'flags.midi-qol.OverTime', // Apply 'over time' effect
              mode: 0,
              value: `turn=end,rollType=skill,saveAbility=acr|ath,saveDC=${item.system.save.dc},actionSave=true,label=Grabbed by ${actor.name}!`, // Specifies when and how the over time effect is applied
              priority: 20,
            },
          ];
          // Add the grappling effect to the target using its unique identifier (uuid)
          game.dfreds.effectInterface.addEffectWith({ effectData, uuid });
        }
      }
    }
  }
}
