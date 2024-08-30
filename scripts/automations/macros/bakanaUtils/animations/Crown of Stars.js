// Original animation author Xenophes
// Rewritten animation by @bakanabaka

/**
 * Advanced error handler for Midi Macros, wraps all code in a try/catch and helps organize code.
 * @param token The token this effect should occur on
 * @param effect The active effect this should be tied to if any, undefined if none
 * @param moteCount The number of motes to space equally around the token
 * @param identifier A unique name if for some reason more than one of this effect is run on this actor
 */
export function crownOfStars(token, moteCount, effect=undefined, identifier="Crown of Stars") {
    const STAR_FILE = 'jb2a.twinkling_stars.points07.white';
    const MOTE_SCALE = 0.5

    function rotateSprites(sequence) {
        sequence = sequence
            .effect()
            .file(STAR_FILE)
            .from(token, { cacheLocation: true });

        if (effect) sequence = sequence.tieToDocuments(effect);
            
        return sequence
            .attachTo(token)
            .scale(MOTE_SCALE)
            .fadeIn(300)
            .fadeOut(500)
            .aboveLighting()
            .persist();
    }

    function loopDaLoop(sequence, objectName, delay) {
        return sequence
            .loopProperty(objectName, 'rotation', {
                from: 0,
                to: 360,
                duration: 5000,
                delay: delay,
            });
    }

    function createStarMoteEffect(sequence, idx) {
        sequence = rotateSprites(sequence)
        sequence = loopDaLoop(sequence, 'sprite', 500)
        sequence = loopDaLoop(sequence, 'spriteContainer', 0)
        return sequence
            .spriteOffset({ x: 0.5 }, { gridUnits: true })
            .rotate((360 / moteCount) * idx)
            .name(`${identifier} - ${token.actor.id} - ${idx}`);
    }

    let starsSequence = new Sequence();
    for (let idx=1; idx <= moteCount; ++idx) 
        starsSequence = createStarMoteEffect(starsSequence, idx);
    starsSequence.play();
}