export async function redirectAttack({
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
  const DEFAULT_ITEM_NAME = 'Redirect Attack';
  const debug = globalThis.elwinHelpers?.isDebugEnabled() ?? false;

  if (
    !foundry.utils.isNewerVersion(
      globalThis?.elwinHelpers?.version ?? '1.1',
      '3.3.0'
    )
  ) {
    const errorMsg = `${DEFAULT_ITEM_NAME} | ${game.i18n.localize('midi-item-showcase-community.ElwinHelpersRequired')}`;
    ui.notifications.error(errorMsg);
    return;
  }
  const dependencies = ['dae', 'midi-qol'];
  if (!elwinHelpers.requirementsSatisfied(DEFAULT_ITEM_NAME, dependencies)) {
    return;
  }

  if (debug) {
    console.warn(
      DEFAULT_ITEM_NAME,
      { phase: args[0].tag ? `${args[0].tag}-${args[0].macroPass}` : args[0] },
      arguments
    );
  }

  if (args[0].tag === 'OnUse' && args[0].macroPass === 'preTargeting') {
    return handleOnUsePreTargeting(workflow, scope.macroItem, actor);
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isAttacked.pre') {
    DAE.unsetFlag(scope.macroItem.actor, 'redirectAttackAlly');
  } else if (args[0].tag === 'TargetOnUse' && args[0].macroPass === 'tpr.isAttacked.post') {
    await handleTargetOnUseIsAttackedPost(workflow, token, scope.macroItem, options?.thirdPartyReactionResult);
  }

  /**
   * Handles the preTargeting phase of the Redirect Attack reaction activity.
   * Validates that the reaction was triggered by the tpr.isAttacked remote reaction.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Item5e} sourceItem The Redirect Attack item.
   *
   * @returns {boolean} true if all requirements are fulfilled, false otherwise.
   */
  async function handleOnUsePreTargeting(currentWorkflow, sourceItem, sourceActor) {
    if (
      currentWorkflow.workflowOptions?.thirdPartyReaction?.trigger !==
        'tpr.isAttacked' ||
      !currentWorkflow.workflowOptions?.thirdPartyReaction?.activityUuids?.some(
        (u) => sourceItem.system.activities?.some((a) => a.uuid === u)
      )
    ) {
      // Reaction should only be triggered by third party reaction effect
      const msg = `${sourceItem.name} | This reaction can only be triggered when the owner is attacked.`;
      ui.notifications.warn(msg);
      return false;
    }

    // Filter for Small or Medium allies within 5 feet
    const eligibleAllies = MidiQOL.findNearby(1, token, 5, {
      includeIncapacitated: false,
      includeToken: false,
      canSee: true,
    })
      .filter((i) => !i.document.hidden)
      .filter(
        (t) =>
          t.actor.system.traits.size === 'sm' ||
          t.actor.system.traits.size === 'med'
      );
    if (eligibleAllies.length === 0) {
      ui.notifications.warn(
        'No eligible Small or Medium allies within 5 feet.'
      );
      return;
    }

    // Prompt user to select an ally
    const allyChoices = eligibleAllies.reduce((obj, t) => {
      obj[t.id] = t.name;
      return obj;
    }, {});

    const selectedAllyId = await new Promise((resolve) => {
      new Dialog({
        title: 'Redirect Attack: Choose Ally',
        content: `<p>Select an ally to swap with:</p>
        <form>
          <div class="form-group">
            <label>Ally:</label>
            <select id="ally-select">${Object.entries(allyChoices).map(
              ([id, name]) => `<option value="${id}">${name}</option>`
            )}</select>
          </div>
        </form>`,
        buttons: {
          ok: {
            label: 'OK',
            callback: (html) => resolve(html.find('#ally-select').val()),
          },
        },
        default: 'ok',
        close: () => resolve(null),
      }).render(true);
    });

    if (!selectedAllyId) return;

    const allyToken = eligibleAllies.find((t) => t.id === selectedAllyId);
    DAE.setFlag(sourceActor, 'redirectAttackAlly', allyToken.id);

    // Swap positions
    const goblinPos = { x: token.x, y: token.y };
    const allyPos = { x: allyToken.x, y: allyToken.y };

    await token.document.move(allyPos);
    await allyToken.document.move(goblinPos);
    return true;
  }

  /**
   * Handles the tpr.isAttacked post macro of the Redirect Attack item in the triggering midi-qol workflow.
   * If the reaction was used and completed successfully, the target is changed to a nearby ally of the owner of Redirect Attack.
   *
   * @param {MidiQOL.Workflow} currentWorkflow - The current midi-qol workflow.
   * @param {Token5e} targetToken - The target token that is hit.
   * @param {Item5e} sourceItem - The Redirect Attack item.
   * @param {object} thirdPartyReactionResult - The third party reaction result.
   */
  async function handleTargetOnUseIsAttackedPost(
    currentWorkflow,
    targetToken,
    sourceItem,
    thirdPartyReactionResult
  ) {
    if (debug) {
      console.warn(DEFAULT_ITEM_NAME + ' | reaction result', {
        thirdPartyReactionResult,
      });
    }
    if (
      !sourceItem.system.activities?.some(
        (a) => a.uuid === thirdPartyReactionResult?.uuid
      )
    ) {
      return;
    }

    const sourceActor = sourceItem.actor;

    if (!sourceActor || !targetToken) {
      console.error(
        `${DEFAULT_ITEM_NAME} | Missing sourceActor or targetToken`,
        { sourceActor, targetToken }
      );
      return;
    }

    const sourceToken = MidiQOL.tokenForActor(sourceActor);
    if (!sourceToken) {
      if (debug) {
        console.warn(`${DEFAULT_ITEM_NAME} | No source token could be found.`);
      }
      return;
    }
    const allyId = DAE.getFlag(sourceActor, 'redirectAttackAlly');
    if (!allyId) {
      console.warn(
        `${DEFAULT_ITEM_NAME} | No ally selected.`
      );
      return;
    }
    const allyToken = canvas.tokens.get(allyId);

    // Change the attack's target to the ally
    currentWorkflow.targets.delete(targetToken);
    currentWorkflow.targets.add(allyToken);
  }
}
