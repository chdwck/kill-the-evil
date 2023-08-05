export interface State<TProxy> {
  parent: FSM<TProxy>;
  name: string;
  update(timeElapsed: number): void;
  enter(state: State<TProxy> | null): void;
  exit(): void;
}

export default class FSM<TProxy> {
  states: Record<string, State<TProxy>>;
  currentState: State<TProxy> | null;
  proxy: TProxy;

  constructor(proxy: TProxy) {
    this.states = {};
    this.currentState = null;
    this.proxy = proxy;
  }

  setState(name: string) {
    const prevState = this.currentState;

    if (prevState) {
      if (prevState.name === name) {
        return;
      }

      prevState.exit();
    }

    const state = this.states[name];
    this.currentState = state;
    state.enter(prevState);
  } 

  update(timeElapsed: number) {
    if (this.currentState) {
      this.currentState.update(timeElapsed);
    }
  }
}
