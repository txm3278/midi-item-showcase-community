async function circle(positionEntity, range, color) {
  const gridScale = canvas.dimensions.distance; // distance of a tile

  const distance = Math.max(range, gridScale); // at minimum stretch to next grid
  const rangeTemplates = await canvas.scene.createEmbeddedDocuments(
    'MeasuredTemplate',
        [
            {
                t: 'circle',
                user: game.user.id,
                x: positionEntity.center?.x ?? positionEntity.x,
                y: positionEntity.center?.y ?? positionEntity.y,
                direction: 0,
                distance: distance,
                borderColor: '#000000',
                fillColor: color,
            },
        ]
  );
  return rangeTemplates[0];
}

function targets(template) {
    function getTargets(shape){
        const allTokens = canvas.tokens.placeables.filter(obj => obj);
        const targetArray = allTokens.filter(obj => {
            const c = obj.center;
            return shape.contains(c.x, c.y);
        });
        return targetArray;
    }

    let shape;
    if(template.t === CONST.MEASURED_TEMPLATE_TYPES.CIRCLE) {
        const ratio = canvas.scene.dimensions.distancePixels;
        shape = new PIXI.Circle(template.x, template.y, template.distance * ratio);
    }
    else if(template.t === CONST.MEASURED_TEMPLATE_TYPES.RECTANGLE) {
        shape = new PIXI.Rectangle(template.x, template.y, template.width, template.height);
    }
    else if(template.t === CONST.MEASURED_TEMPLATE_TYPES.CONE || template.t === CONST.MEASURED_TEMPLATE_TYPES.RAY) {
        shape = new PIXI.Polygon(template.shape.points.map((p,i) => {
            if(i%2 === 0) return p+template.x;
            else return p+template.y;
        }));
    }

    if(!shape) return;
    return getTargets(shape);
}

export const templateApi = { circle, targets };
