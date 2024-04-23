export async function corpseSlayerLongbow({
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
    if(workflow.item.name.includes("Turn Undead"))
    {
        workflow.saveDetails.disadvantage = true;
    }
}