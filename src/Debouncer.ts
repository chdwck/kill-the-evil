export type DebouncerDatum = {
  ts: number;
  hits: number;
};

type DebouncerCache = {
  data: Record<string, DebouncerDatum>;
  releaseAfterMs: number;
};

export function createDebouncerCache(releaseAfterMs: number): DebouncerCache {
  return {
    data: {},
    releaseAfterMs,
  };
}

export function checkDebouncerCache(
  cache: DebouncerCache,
  key: string,
): boolean {
  const datum = cache.data[key];
  const now = Date.now();
  if (datum === undefined) {
    cache.data[key] = { ts: now, hits: 1 };
    return true;
  }
  const diff = now - datum.ts;
  if (diff >= (cache.releaseAfterMs / datum.hits) * 15) {
    cache.data[key].ts = now;
    cache.data[key].hits = 1;
    return true;
  }

  cache.data[key].hits += 1;

  return false;
}
