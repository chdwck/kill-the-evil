import { type BattleState } from "./battle";
import { heroId } from "./entities";

export const HERO_ACTIONS_UI = "heroactionsui";
export const AP_COUNTER = "apcounter";
export function initBattleUI(battleState: BattleState) {
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
  const heroAP = battleState.entityAP[heroId] - battleState.currentActionAPCost;
  const apCircles = document.querySelectorAll(".ap-circle");
  apCircles.forEach((apCircle, i) => {
    (apCircle as HTMLDivElement).style.background =
      i < heroAP ? "red" : "transparent";
  });
}

export function syncBattleUI(battleState: BattleState) {
  syncHeroAPDots(battleState);
}
