export type GameInputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  panLeft: boolean;
  panRight: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  space: boolean;
  shift: boolean;
  battleView: boolean;
  attack: boolean;
}

export function createGameInputState() : GameInputState {
 return {
  forward: false,
  backward: false,
  left: false,
  right: false,
  panLeft: false,
  panRight: false,
  zoomIn: false,
  zoomOut: false,
  space: false,
  shift: false,
  battleView: false,
    attack: false
  };
}

function onKeydown(e: KeyboardEvent, state: GameInputState) {
  switch (e.key.toLowerCase()) {
    case "x":
      state.attack = true;
      break;
    case "q":
      state.battleView = false;
      break;
    case "b":
      state.battleView = true;
      break;
    case "w":
      state.forward = true;
      break;
    case "a":
      state.left = true;
      break;
    case "s": // s
      state.backward = true;
      break;
    case "d": // d
      state.right = true;
      break;
    case "shift":
      state.shift = true;
      break;
    case " ":
      state.space = true;
      break;
    case "arrowup":
      state.zoomIn = true;
      break;
    case "arrowleft":
      state.panLeft = true;
      break;
    case "arrowdown":
      state.zoomOut = true;
      break;
    case "arrowright":
      state.panRight = true;
      break;
  }
}

function onKeyup(e: KeyboardEvent, state: GameInputState) {
  switch (e.key.toLowerCase()) {
    case "x":
      state.attack = false;
      break;
    case "w":
      state.forward = false;
      break;
    case "a":
      state.left = false;
      break;
    case "s": // s
      state.backward = false;
      break;
    case "d": // d
      state.right = false;
      break;
    case "shift":
      state.shift = false;
      break;
    case " ":
      state.space = false;
      break;
    case "arrowup":
      state.zoomIn = false;
      break;
    case "arrowleft":
      state.panLeft = false;
      break;
    case "arrowdown":
      state.zoomOut = false;
      break;
    case "arrowright":
      state.panRight = false;
      break;
  }
}

export function setupKeyboardEventListeners(state: GameInputState) {
  window.addEventListener("keydown", e => onKeydown(e, state), false);
  window.addEventListener("keyup", e => onKeyup(e, state), false);
}
