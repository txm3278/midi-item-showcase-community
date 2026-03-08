export async function charger({
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
  let selection = await chrisPremades.utils.dialogUtils.confirm(
    workflow.item.name,
    "Has this character moved atleast 10 feet in a straight line before the attack?",
    { userId: chrisPremades.utils.socketUtils.gmID() },
  );
  if (!selection) {
    ui.notifications.warn(
      "The DM is either afk or has deemed Charger is not allowed for this attack.",
    );
    return "+0[Dm Cancelled]";
  } else {
    if (selection) {
      let buttons = [
        [
          "Push",
          "push",
          { image: "modules/monks-little-details/icons/push.svg" },
        ],
        [
          "Bonus Damage",
          "bonusDamage",
          { image: "icons/skills/melee/sword-damaged-chipped-green.webp" },
        ],
        ["Cancel", "cancel", { image: "icons/svg/cancel.svg" }],
      ];
      let selection2 = await chrisPremades.utils.dialogUtils.buttonDialog(
        workflow.item.name,
        "Push the target, Deal bonus damage, or cancel?",
        buttons,
      );
      if (!selection2) {
        ui.notifications.warn("You are cancelling your charger bonus.");
        return "+0[Player Cancelled]";
      } else if (selection2 === "push") {
        let delayMs = 10000;
        setTimeout(async () => {
          let targetToken = workflow.targets.first();
          await chrisPremades.utils.tokenUtils.pushToken(
            token,
            targetToken,
            10,
          );
        }, delayMs);
        return "+0[Charger Push]";
      } else if (selection2 === "bonusDamage") {
        return "+1d8";
      } else if (selection2 === "cancel") {
        return "+0[Player Cancelled]";
      }
    }
  }
  return "+0[Unexpected Selection]";
}
