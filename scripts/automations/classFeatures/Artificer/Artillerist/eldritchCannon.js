export async function eldritchCannon({
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
  async function summonCannon() {
    let controllingActor = workflow.token;
    let cannonActor = game.actors.getName('eldritch-cannon');
    let cannonType;
    let cannonSize;
    let maxCannons = 1;

    //Check if Rideable plugin is installed: TODO

    const effectStatus = await findLeveledEffects({ owner: controllingActor });
    if (effectStatus.hasFortifiedPosition) {
      maxCannons += 1;
    }

    let cannonsExist = await findExistingCannons({
      owner: controllingActor,
      maximumCannons: maxCannons,
    });
    if (cannonsExist) {
      return;
    }

    //Select a type and size of Cannon
    const selection = await warpgate.menu(
      {
        inputs: [
          {
            label: 'Small (Independant)',
            type: 'radio',
            options: 'group1',
          },
          {
            label: 'Tiny (Handheld)',
            type: `radio`,
            options: 'group1',
          },
        ],
        buttons: [
          {
            label: 'Ballista',
            value: 'ballista',
          },
          {
            label: 'Flamethrower',
            value: 'flamethrower',
          },
          {
            label: 'Protector',
            value: 'protector',
          },
        ],
      },
      {
        title: 'Size and Type of Cannon?',
      }
    );
    let halfCoverAura = {
      changes: [
        {
          key: 'system.attributes.ac.bonus',
          mode: 2,
          value: '+ 2',
          priority: 20,
        },
        {
          key: 'system.abilities.dex.bonuses.save',
          mode: 2,
          value: '+ 2',
          priority: 20,
        },
      ],
      disabled: false,
      label: 'Fortified Position - Aura',
      flags: {
        ActiveAuras: {
          aura: 'Allies',
          displayTemp: true,
          ignoreSelf: true,
          isAura: true,
          radius: '10',
        },
      },
    };

    //Assigning cannon size and type to variables
    if (selection.inputs[0] === true) {
      cannonSize = 'small';
    } else {
      cannonSize = 'tiny';
    }

    cannonType = selection.buttons;

    //Assigning the cannon model: TODO
    //Assigning the cannon abilities: DONE
    const featurePack = await game.packs.get(
      'midi-item-showcase-community.misc-class-features-items'
    );
    let featurePackIndex = await featurePack.getIndex();
    let cannonFeature;
    let cannonFeatureItem;
    let detonateCannon;
    let detonateCannonFeature;

    let attackBonus =
      controllingActor.actor.system.attributes.prof +
      controllingActor.actor.system.abilities.int.mod;
    let attackDC = controllingActor.actor.system.attributes.spelldc;
    let healBonus = controllingActor.actor.system.abilities.int.mod;
    let cannonDamage;
    if (effectStatus.hasExplosiveCannon) {
      detonateCannon = await featurePackIndex.find(
        (item) => item.name === 'Detonate'
      );
      detonateCannonFeature = (
        await featurePack.getDocument(detonateCannon._id)
      )?.toObject();
      detonateCannonFeature.system.save.dc = attackDC;
      cannonDamage = '3d8';
    } else {
      cannonDamage = '2d8';
    }

    if (cannonType === 'ballista') {
      let update;

      cannonFeature = await featurePackIndex.find(
        (item) => item.name === 'Eldritch Cannon - Ballista'
      );
      cannonFeatureItem = (
        await featurePack.getDocument(cannonFeature._id)
      )?.toObject();
      cannonFeatureItem.system.attackBonus = attackBonus - 2;
      cannonFeatureItem.system.damage.parts[0][0] = cannonDamage;
      if (
        effectStatus.hasExplosiveCannon &&
        effectStatus.hasFortifiedPosition
      ) {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
              [detonateCannonFeature.name]: detonateCannonFeature,
            },
            ActiveEffect: {
              [halfCoverAura.label]: halfCoverAura,
            },
          },
        };
      } else if (
        effectStatus.hasExplosiveCannon &&
        !effectStatus.hasFortifiedPosition
      ) {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
              [detonateCannonFeature.name]: detonateCannonFeature,
            },
          },
        };
      } else {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
            },
          },
        };
      }
      spawnCannon({
        owner: controllingActor,
        cannon: cannonActor,
        ability: update,
        name: cannonFeatureItem.name,
        size: cannonSize,
      });
    } else if (cannonType === 'flamethrower') {
      let update;

      cannonFeature = await featurePackIndex.find(
        (item) => item.name === 'Eldritch Cannon - Flamethrower'
      );
      cannonFeatureItem = (
        await featurePack.getDocument(cannonFeature._id)
      )?.toObject();
      cannonFeatureItem.system.save.dc = attackDC;
      cannonFeatureItem.system.damage.parts[0][0] = cannonDamage;
      if (
        effectStatus.hasExplosiveCannon &&
        effectStatus.hasFortifiedPosition
      ) {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
              [detonateCannonFeature.name]: detonateCannonFeature,
            },
            ActiveEffect: {
              [halfCoverAura.label]: halfCoverAura,
            },
          },
        };
      } else if (
        effectStatus.hasExplosiveCannon &&
        !effectStatus.hasFortifiedPosition
      ) {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
              [detonateCannonFeature.name]: detonateCannonFeature,
            },
          },
        };
      } else {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
            },
          },
        };
      }
      spawnCannon({
        owner: controllingActor,
        cannon: cannonActor,
        ability: update,
        name: cannonFeatureItem.name,
        size: cannonSize,
      });
    } else if (cannonType === 'protector') {
      let update;

      cannonFeature = await featurePackIndex.find(
        (item) => item.name === 'Eldritch Cannon - Protector'
      );
      cannonFeatureItem = (
        await featurePack.getDocument(cannonFeature._id)
      )?.toObject();
      cannonFeatureItem.system.damage.parts[0][0] = `1d8 + ${healBonus}`;
      if (
        effectStatus.hasExplosiveCannon &&
        effectStatus.hasFortifiedPosition
      ) {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
              [detonateCannonFeature.name]: detonateCannonFeature,
            },
            ActiveEffect: {
              [halfCoverAura.label]: halfCoverAura,
            },
          },
        };
      } else if (
        effectStatus.hasExplosiveCannon &&
        !effectStatus.hasFortifiedPosition
      ) {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
              [detonateCannonFeature.name]: detonateCannonFeature,
            },
          },
        };
      } else {
        update = {
          embedded: {
            Item: {
              [cannonFeatureItem.name]: cannonFeatureItem,
            },
          },
        };
      }
      spawnCannon({
        owner: controllingActor,
        cannon: cannonActor,
        ability: update,
        name: cannonFeatureItem.name,
        size: cannonSize,
      });
    }
  }
  async function findLeveledEffects({ owner }) {
    const hasExplosiveCannon = !!owner.actor.effects.find(
      (e) => e.name === 'Explosive Cannon'
    );
    const hasFortifiedPosition = !!owner.actor.effects.find(
      (e) => e.name === 'Fortified Position'
    );

    return {
      hasExplosiveCannon,
      hasFortifiedPosition,
    };
  }
  async function findExistingCannons({ owner, maximumCannons }) {
    let ownedCannons = [];
    let existingCannons = canvas.tokens.objects.children.filter((token) =>
      token.name.includes('eldritch-cannon')
    );
    if (existingCannons) {
      for (const cannon of existingCannons) {
        if (cannon.actor.system.details.source === owner.name) {
          ownedCannons.push(cannon);
        }
      }
      if (ownedCannons.length >= maximumCannons) {
        ui.notifications.warn(
          `You are unable to create more than ${maximumCannons} Eldritch Cannon(s).`
        );
        return true;
      }
    }
  }
  async function spawnCannon({ owner, cannon, ability, name, size }) {
    let tokenDocument = await cannon.getTokenDocument();

    let spawnedToken = await warpgate.spawn(tokenDocument, {}, {}, options);
    let spawnedCannon = game.canvas.scene.tokens.get(spawnedToken[0]);

    if (size === 'tiny') {
      spawnedCannon.update({
        height: 0.5,
        width: 0.5,
      });
    }
    spawnedCannon.actor.update({
      'system.details.source': owner.actor.name,
      'system.attributes.hp.max':
        owner.actor._classes.artificer.system.levels * 5,
      'system.attributes.hp.value':
        owner.actor._classes.artificer.system.levels * 5,
    });
    await warpgate.mutate(spawnedCannon, ability);
  }
  summonCannon();
}
