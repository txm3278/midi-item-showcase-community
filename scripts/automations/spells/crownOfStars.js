export async function crownOfStars({
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
  if (args[0] === 'on' && args.length === 3) {
    const params = args[2];
    const sourceToken = canvas.tokens.get(params.tokenId);
    const sourceActor = game.actors.get(params.actorId);
    const activeEffect = sourceActor.effects.get(params.effectId);
    const starFile = 'jb2a.twinkling_stars.points07.white';
    const starItem = await sourceActor.items.find(
      (i) => i.name === 'Crown of Stars'
    );
    const moteNumber = ((params.efData.changes[1].value || 7) - 7) * 2 + 7;

    if (moteNumber === 7) {
      const moteScale = 0.5;
      let starsSequence = new Sequence()
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 1)
        .name('StarMoteEffect1')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 2)
        .name('StarMoteEffect2')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 3)
        .name('StarMoteEffect3')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 4)
        .name('StarMoteEffect4')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 5)
        .name('StarMoteEffect5')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 6)
        .name('StarMoteEffect6')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 7)
        .name('StarMoteEffect7');
      starsSequence.play();
    }

    if (moteNumber === 9) {
      const moteScale = 0.45;
      let starsSequence = new Sequence()
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 1)
        .name('StarMoteEffect1')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 2)
        .name('StarMoteEffect2')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 3)
        .name('StarMoteEffect3')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 4)
        .name('StarMoteEffect4')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 5)
        .name('StarMoteEffect5')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 6)
        .name('StarMoteEffect6')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 7)
        .name('StarMoteEffect7')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 8)
        .name('StarMoteEffect8')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 9)
        .name('StarMoteEffect9');
      starsSequence.play();
    }

    if (moteNumber === 11) {
      const moteScale = 0.4;
      let starsSequence = new Sequence()
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 1)
        .name('StarMoteEffect1')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 2)
        .name('StarMoteEffect2')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 3)
        .name('StarMoteEffect3')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 4)
        .name('StarMoteEffect4')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 5)
        .name('StarMoteEffect5')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 6)
        .name('StarMoteEffect6')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 7)
        .name('StarMoteEffect7')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 8)
        .name('StarMoteEffect8')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 9)
        .name('StarMoteEffect9')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 10)
        .name('StarMoteEffect10')
        .effect()
        .file(starFile)
        .from(sourceToken, { cacheLocation: true })
        .tieToDocuments(activeEffect)
        .attachTo(sourceToken)
        .scale(moteScale)
        .fadeIn(300)
        .fadeOut(500)
        .aboveLighting()
        .persist()
        .loopProperty('sprite', 'rotation', {
          from: 0,
          to: 360,
          duration: 5000,
          delay: 500,
        })
        .loopProperty('spriteContainer', 'rotation', {
          from: 0,
          to: 360,
          duration: 4000,
        })
        .spriteOffset({ x: 0.5 }, { gridUnits: true })
        .rotate((360 / moteNumber) * 11)
        .name('StarMoteEffect11');
      starsSequence.play();
    }

    const updates = {
      // ADD LIGHTING
      token: {
        light: {
          alpha: 0.4,
          animation: {
            intensity: 2,
            speed: 5,
            type: 'torch',
          },
          bright: 30,
          dim: 60,
          color: '#ffd79e',
          luminosity: 0.5,
        },
      },
      embedded: {
        Item: {
          'Star Mote': {
            name: 'Star Mote',
            img: 'icons/magic/light/projectile-stars-blue.webp', //here to change star mote icon
            type: 'spell',
            flags: {
              autoanimations: {
                version: 3,
                killAnim: false,
                animLevel: false,
                options: {
                  ammo: false,
                  rangeType: 'spell',
                  variant: '01',
                  enableCustom: false,
                  repeat: null,
                  delay: null,
                },
                override: true,
                sourceToken: { enable: false },
                targetToken: { enable: false },
                levels3d: { type: '' },
                macro: { enable: false },
                animType: 'range',
                animation: 'eldritchblast',
                color: 'lightgreen', // here for changing color of star mote beam
                audio: { a01: { enable: false } },
                preview: false,
                explosions: { enable: false },
              },
              itemacro: {
                macro: {
                  // ADD CHECK FOR LIGHTING
                  command: `const params = args[0];\n
                                const sourceToken = canvas.tokens.get(params.tokenId);\n
                                const sourceActor = params.actor;\n
                                const inFilters = { name: 'StarMoteEffect*', object: sourceToken };\n
                                await Sequencer.EffectManager.endEffects(Sequencer.EffectManager.getEffects(inFilters).at(-1).data);\n
                                const starsEffect = await sourceActor.effects.find(ef => ef.label === "Crown of Stars");
                                const moteItem = await sourceActor.items.find(i => i.name === "Star Mote");\n
                                if (moteItem.system.uses.value === 0 && starsEffect) {\n
                                    await starsEffect.delete();\n 
                                };`,
                  name: 'Star Mote',
                  scope: 'global',
                  type: 'script',
                },
              },
              'midi-qol': {
                onUseMacroName: '[postActiveEffects]ItemMacro',
              },
            },
            system: {
              actionType: 'rsak',
              school: 'evo',
              level: 0,
              preparation: { mode: 'atwill', prepared: true },
              damage: { parts: [['4d12', 'radiant']] },
              activation: { type: 'bonus', cost: 1 },
              duration: { value: null, units: 'inst' },
              target: { value: 1, type: 'creature' },
              uses: { value: moteNumber, max: moteNumber, per: 'charges' },
              components: {
                vocal: false,
                somatic: false,
                material: false,
                ritual: false,
                concentration: false,
              },
              range: { value: starItem.system.range.value, units: 'ft' },
              scaling: { mode: 'none' },
              description: {
                value: `Replace with item description (contained in macro)`,
              },
            },
          },
        },
      },
    };

    await warpgate.mutate(
      sourceToken.document,
      updates,
      {},
      { name: 'Star Mote' }
    );
    await ui.notifications.notify(
      'Your Star Motes have been created as a spell in your spellbook.'
    ); // here to change the dialogue that appears when casting the spell
  } else if (args[0] === 'off' && args.length === 3) {
    const params = args[2];
    const sourceToken = canvas.tokens.get(params.tokenId);
    await Sequencer.EffectManager.endEffects({
      name: '*StarMoteEffect*',
      objects: sourceToken,
    });
    await warpgate.revert(sourceToken.document, 'Star Mote');
  }

  if (args.length !== 3) {
    return;
  }
}
