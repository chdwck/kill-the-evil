const keys = {
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
};

type InputKey = keyof typeof keys;

function onKeydown(e: KeyboardEvent) {
  switch (e.key.toLowerCase()) {
    case "q":
      keys.battleView = false;
      break;
    case "b":
      keys.battleView = true;
      break;
    case "w":
      keys.forward = true;
      break;
    case "a":
      keys.left = true;
      break;
    case "s": // s
      keys.backward = true;
      break;
    case "d": // d
      keys.right = true;
      break;
    case "shift":
      keys.shift = true;
      break;
    case " ":
      keys.space = true;
      break;
    case "arrowup":
      keys.zoomIn = true;
      break;
    case "arrowleft":
      keys.panLeft = true;
      break;
    case "arrowdown":
      keys.zoomOut = true;
      break;
    case "arrowright":
      keys.panRight = true;
      break;
  }
}

function onKeyup(e: KeyboardEvent) {
  switch (e.key.toLowerCase()) {
    case "w":
      keys.forward = false;
      break;
    case "a":
      keys.left = false;
      break;
    case "s": // s
      keys.backward = false;
      break;
    case "d": // d
      keys.right = false;
      break;
    case "shift":
      keys.shift = false;
      break;
    case " ":
      keys.space = false;
      break;
    case "arrowup":
      keys.zoomIn = false;
      break;
    case "arrowleft":
      keys.panLeft = false;
      break;
    case "arrowdown":
      keys.zoomOut = false;
      break;
    case "arrowright":
      keys.panRight = false;
      break;
  }
}

export function setupKeyboardEventListeners() {
  window.addEventListener("keydown", onKeydown, false);
  window.addEventListener("keyup", onKeyup, false);
}

export function readKey(key: InputKey): boolean {
  return keys[key];
}
