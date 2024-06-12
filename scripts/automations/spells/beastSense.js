export async function beastSense({
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
  // check to see if Beast Sense is not enabled to apply actor conditions.
  async function disabledBeastSense() {
    try {
      // Ensure a token is selected
      if (!token) {
        console.error('No token selected.');
        ui.notifications.warn('Please select your token.');
        return;
      }

      // Ensure casterActor is defined
      const casterActor = token.actor;
      if (!casterActor) {
        console.error('No caster actor found.');
        ui.notifications.warn('Caster actor not found.');
        return;
      }
      const concentrating = casterActor.effects.find(
        (e) => e.name === 'Concentrating: Beast Sense (Spirit Seeker)'
      );
      const casterActorId = casterActor.id;
      const casterActorUuid = casterActor.uuid;

      // Automatically target the first selected token
      const targetTokens = Array.from(game.user.targets);
      if (targetTokens.length === 0) {
        console.error('No target selected.');
        ui.notifications.warn('Please select a target.');
        if (concentrating) await concentrating.delete();
        return;
      }

      const targetToken = targetTokens[0];
      const tokenType = MidiQOL.typeOrRace(targetToken);

      if (tokenType == 'beast') {
      } else {
        ui.notifications.warn('Target is NOT a beast!');
        if (concentrating) await concentrating.delete();
        return;
      }

      let tokenUuid = targetToken.document.uuid;
      let parts = tokenUuid.split('.');
      let tokenId = parts[parts.length - 1]; // The last part of the split array is the token ID

      const targetActor = targetToken.actor;

      // Define the origin for the effect if not already defined
      const beastSenseOrigin = concentrating._id;
      const beastSenseOriginUuid = concentrating.uuid;

      const concEffect = MidiQOL.getConcentrationEffect(casterActor);

      //The After Effects
      const beastSenseEffects = {
        name: 'Beast Sense Effects',
        icon: 'graphics/Zantor/icons/humanoid-single-green-blue.png',
        changes: [
          {
            key: 'macro.CE',
            mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
            value: 'Blinded',
          },
          {
            key: 'macro.CE',
            mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
            value: 'Deafened',
          },
        ],
        origin: beastSenseOrigin,
        disabled: false,
        flags: { dae: { showIcon: true } },
      };

      //apply the after effects
      const [newAE] = await casterActor.createEmbeddedDocuments(
        'ActiveEffect',
        [beastSenseEffects]
      );
      ``;

      // add as dependent to concentration
      MidiQOL.addConcentrationDependent(casterActor, newAE);
    } catch (error) {
      console.error('Error applying conditions:', error);
      ui.notifications.error('Failed to apply conditions.');
    }
  }

  //check if Beast Sense is already enabled to remove conditiions.
  async function enableBeastSense() {
    try {
      // Ensure casterActor is defined
      const casterActor = token.actor;
      if (!casterActor) {
        console.error('No caster actor found.');
        ui.notifications.warn('Caster actor not found.');
        return;
      }
      const custom = casterActor.effects.find(
        (e) => e.name === 'Beast Sense Effects'
      );
      const concentrating = casterActor.effects.find(
        (e) => e.name === 'Concentrating: Beast Sense (Spirit Seeker)'
      );

      if (custom) await custom.delete(); // Corrected line
      if (concentrating) await concentrating.delete();

      //executeSetPermissionAsGM("setPermissionToDefault", tokenId);
    } catch (error) {
      console.error('Error removing conditions:', error);
      ui.notifications.error('Failed to remove conditions.');
    }
  }

  // Ensure a token is selected
  if (!token) {
    console.error('No token selected.');
    ui.notifications.warn('Please select your token.');
    return;
  }

  // Find the "Beast Sense (Enabled)" effect on the caster
  const beastSenseEffect = token.actor?.effects.find(
    (e) => e.name === 'Beast Sense Effects'
  );

  if (beastSenseEffect) {
    await enableBeastSense();
  } else {
    await disabledBeastSense();
  }

  // Ensure to clear targets to avoid issues with left-clicking in the future
  game.user.updateTokenTargets([]);
}
