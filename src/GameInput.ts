type Keys = {
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
};

export default class GameInput {
  keys: Keys;
  constructor() {
    this.keys = {
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
      battleView: false
    };
    window.addEventListener("keydown", (e) => this.onKeyDown(e), false);
    window.addEventListener("keyup", (e) => this.onKeyUp(e), false);
  }

  onKeyDown(e: KeyboardEvent) {
    switch (e.key.toLowerCase()) {
      case 'q':
        this.keys.battleView = false;
        break;
      case 'b':
        this.keys.battleView = true;
        break;
      case "w":
        this.keys.forward = true;
        break;
      case "a":
        this.keys.left = true;
        break;
      case "s": // s
        this.keys.backward = true;
        break;
      case "d": // d
        this.keys.right = true;
        break;
      case "shift":
        this.keys.shift = true;
        break;
      case " ":
        this.keys.space = true;
        break;
      case "arrowup":
        this.keys.zoomIn = true;
        break;
      case "arrowleft":
        this.keys.panLeft = true;
        break;
      case "arrowdown":
        this.keys.zoomOut = true;
        break;
      case "arrowright":
        this.keys.panRight = true;
        break;
    }
  }

  onKeyUp(e: KeyboardEvent) {
    switch (e.key.toLowerCase()) {
      case "w":
        this.keys.forward = false;
        break;
      case "a":
        this.keys.left = false;
        break;
      case "s": // s
        this.keys.backward = false;
        break;
      case "d": // d
        this.keys.right = false;
        break;
      case "shift":
        this.keys.shift = false;
        break;
      case " ":
        this.keys.space = false;
        break;
      case "arrowup":
        this.keys.zoomIn = false;
        break;
      case "arrowleft":
        this.keys.panLeft = false;
        break;
      case "arrowdown":
        this.keys.zoomOut = false;
        break;
      case "arrowright":
        this.keys.panRight = false;
        break;
    }
  }
}
