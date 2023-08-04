export type DebouncerDatum = {
  ts: number;
  hits: number;
};
export class Debouncer {
  data: Record<string, DebouncerDatum>;
  releaseAfterMs: number;

  constructor(releaseAfterMs: number) {
    this.releaseAfterMs = releaseAfterMs;
    this.data = {};
  }

  canExecute(key: string): boolean {
    const datum = this.data[key];
    const now = Date.now();
    if (datum === undefined) {
      this.data[key] = { ts: now, hits: 1 };
      return true;
    }
    const diff = now - datum.ts;
    if (diff >= (this.releaseAfterMs / datum.hits) * 15) {
      this.data[key].ts = now;
      this.data[key].hits = 1;
      return true;
    }

    this.data[key].hits += 1;

    return false;
  }
}
