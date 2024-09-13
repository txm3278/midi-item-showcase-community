function lightLevel(location = { x : 0, y : 0 }) {
    if (canvas.scene.globalLight) return 'bright';
    let c = Object.values(location);

    let lights = canvas.effects.lightSources.filter(src => !(src instanceof GlobalLightSource) && src.shape.contains(...c));
    if (!lights.length) return 'dark';
    let inBright = lights.some(light => {
        let {'data': {x, y}, ratio} = light;
        let bright = ClockwiseSweepPolygon.create({'x': x, 'y': y}, {
            'type': 'light',
            'boundaryShapes': [new PIXI.Circle(x, y, ratio * light.shape.config.radius)]
        });
        return bright.contains(...c);
    });
    if (inBright) return 'bright';
    return 'dim';
}

export const sceneApi = {
    lightLevel,
};