export interface State<TProxy, TInput> {
  parent: FSM<TProxy, TInput>;
  name: string;
  update(timeElapsed: number, input: TInput): void;
  enter(state: State<TProxy, TInput> | null): void;
  exit(): void;
}

export default class FSM<TProxy, TInput> {
  states: Record<string, State<TProxy, TInput>>;
  currentState: State<TProxy, TInput> | null;
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

  update(timeElapsed: number, input: TInput) {
    if (this.currentState) {
      this.currentState.update(timeElapsed, input);
    }
  }
}
