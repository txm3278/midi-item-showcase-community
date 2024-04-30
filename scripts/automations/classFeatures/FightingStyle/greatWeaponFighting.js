export async function greatWeaponFighting({
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
  if (
    args[0].macroPass === 'preDamageRoll' &&
    scope.rolledItem.type == 'weapon' &&
    scope.rolledItem.system.type.value.match(/^(simpleM|martialM)$/)
  ) {
    if (scope.rolledItem.system.properties.has('two')) {
      let parts = [];
      scope.rolledItem.system.damage.parts.forEach((part) =>
        parts.push([replace(part[0]), part[1]])
      );
      workflow.item = workflow.item.clone(
        { 'system.damage.parts': parts },
        { keepId: true }
      );
    }
    if (scope.rolledItem.system.properties.has('ver')) {
      workflow.item = workflow.item.clone(
        {
          'system.damage.versatile': replace(
            workflow.item.system.damage.versatile
          ),
        },
        { keepId: true }
      );
    }
  }

  function replace(part) {
    var i = 0;
    var j = 0;
    var modifiedPart = deepClone(part);
    while (i >= 0) {
      let regex = /([0-9]d[0-9])/;
      i = search(modifiedPart, regex, i);
      regex = /([0-9]([^0-9d]|$))/;
      i = search(modifiedPart, regex, i);
      if (i >= 0) {
        modifiedPart =
          modifiedPart.slice(0, i + 1) + 'r<=2' + modifiedPart.slice(i + 1);
        i += 4;
      }
      j += 1;
      if (j > 20) break; //max 20 modifications
    }
    return modifiedPart;
  }

  function search(string, regexp, from) {
    const index = string.slice(from).search(regexp);
    return index === -1 ? -1 : index + from;
  }
}
