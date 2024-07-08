async function circle(positionEntity, range, color) {
  const gridScale = canvas.dimensions.distance; // distance of a tile

  const distance = Math.max(range, gridScale); // at minimum stretch to next grid
  const rangeTemplates = await canvas.scene.createEmbeddedDocuments(
    'MeasuredTemplate',
    [
      {
        t: 'circle',
        user: game.user.id,
        x: positionEntity.center.x || positionEntity.x,
        y: positionEntity.center.y || positionEntity.y,
        direction: 0,
        distance: distance,
        borderColor: '#000000',
        fillColor: color,
      },
    ]
  );
  return rangeTemplates[0];
}

export const templateApi = { circle };
