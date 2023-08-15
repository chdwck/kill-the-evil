import { applyTurnDelta, type BattleState } from "./battle";
import { GameEntity, gameEntityTypes, heroId } from "./entities";

export const HERO_ACTIONS_UI = "heroactionsui";
export const AP_COUNTER = "apcounter";
function createHeroActionsUI(battleState: BattleState) {
  const heroActions = document.createElement("div");
  heroActions.id = HERO_ACTIONS_UI;
  heroActions.style.position = "fixed";
  heroActions.style.bottom = "0px";
  heroActions.style.left = "0px";
  heroActions.style.right = "0px";
  heroActions.style.height = "50px";
  heroActions.style.borderTop = "1px solid white";
  heroActions.style.background = "rgba(0,0,0,0.5)";
  heroActions.style.padding = "12px";
  heroActions.style.display = "flex";
  heroActions.style.alignItems = "center";

  const apCounter = document.createElement("div");
  apCounter.id = AP_COUNTER;
  const apText = document.createElement("span");
  apText.style.color = "white";
  apText.innerText = "Action Points: ";
  apCounter.appendChild(apText);
  apCounter.appendChild(createAPDots(battleState));

  heroActions.appendChild(apCounter);

  document.body.appendChild(heroActions);
}

function apDotId(idx: number): string {
  return `ap-circle-${idx}`;
}

function createAPDots(battleState: BattleState): HTMLDivElement {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "3px";

  for (let i = 0; i < battleState.entityAP[heroId]; i++) {
    const circle = document.createElement("div");
    circle.id = apDotId(i);
    circle.className = "ap-circle";
    circle.style.borderRadius = "9999px";
    circle.style.border = "1px solid white";
    circle.style.background = "red";
    circle.style.height = "10px";
    circle.style.width = "10px";
    circle.style.opacity = "1";
    circle.style.transition = "background";
    circle.style.transitionDuration = "100ms";
    container.appendChild(circle);
  }

  return container;
}

export function syncHeroAPDots(battleState: BattleState) {
  const start = battleState.entityAP[heroId] - battleState.currentActionAPCost;
  const end = battleState.entityAP[heroId];
  const apCircles = document.querySelectorAll(".ap-circle");
  for (let i = 0; i < apCircles.length; i++) {
    const apCircle = apCircles[i] as HTMLDivElement;
    if (i >= start && i < end) {
      apCircle.style.background = "yellow";
    } else if (i < start) {
      apCircle.style.background = "red";
    } else {
      apCircle.style.background = "transparent";
    }
  }
}

function getEntityClass(entity: GameEntity): string {
  switch (entity.type) {
    case gameEntityTypes.hero:
      return "heroThumbnail";
    case gameEntityTypes.skeleton:
      return "skeletonThumbnail";
  }
}

function entityTurnboxId(entity: GameEntity) {
  return `turnbox-${entity.id}`;
}

const entityBoxWidthPx = 40;
const entityBoxGapPx = 10;
function createTurnBoxUI(battleState: BattleState) {
  const turnboxContainer = document.createElement("div");
  turnboxContainer.id = "turnbox-container";
  const turnbox = document.createElement("div");
  turnbox.id = "turnbox";
  const turnboxWidthPx = entityBoxWidthPx * battleState.turnOrder.length;
  turnbox.style.width = `${turnboxWidthPx}px`;
  turnboxContainer.appendChild(turnbox);

  for (let i = 0; i < battleState.turnOrder.length; i++) {
    const entity = battleState.turnOrder[i];
    const entityBox = document.createElement("div");
    entityBox.id = entityTurnboxId(entity);
    entityBox.dataset.entityId = entity.id;
    entityBox.classList.add("entityBox");
    entityBox.classList.add(getEntityClass(entity));

    const left = entityBoxWidthPx * i + entityBoxGapPx * i;
    entityBox.style.left = `${left}px`;
    entityBox.style.width = `${entityBoxWidthPx}px`;

    const healthBar = document.createElement("div");
    healthBar.classList.add("healthBar");

    entityBox.appendChild(healthBar);
    turnbox.appendChild(entityBox);
  }

  document.body.appendChild(turnboxContainer);
}

function syncTurnbox(battleState: BattleState) {
  const entityBoxes = document.querySelectorAll(".entityBox:not(.fadeOut)");
  entityBoxes.forEach((el) => {
    const _el = el as HTMLDivElement;
    if (battleState.deadEntityIds[_el.dataset.entityId!]) {
      el.classList.add("fadeOut");
    }
  });

  for (let i = 0; i < battleState.turnOrder.length; i++) {
    const truIdx = applyTurnDelta(battleState, i);
    const entity = battleState.turnOrder[truIdx];

    const entityHealth = battleState.entityHealth[entity.id];
    const entityBox = document.getElementById(entityTurnboxId(entity))!;
    if (!entityBox) {
      continue;
    }
    const left = entityBoxWidthPx * i + entityBoxGapPx * i;
    entityBox.style.left = `${left}px`;
    const widthPrcnt =
      100 - ((entity.baseHealth - entityHealth) / entity.baseHealth) * 100;
    const healthBar = entityBox.querySelector("div");
    if (!healthBar) {
      continue;
    }
    healthBar.style.width = `${widthPrcnt}%`;
  }
}

export function initBattleUI(battleState: BattleState) {
  createHeroActionsUI(battleState);
  createTurnBoxUI(battleState);
}

export function syncBattleUI(battleState: BattleState) {
  syncHeroAPDots(battleState);
  syncTurnbox(battleState);
}
