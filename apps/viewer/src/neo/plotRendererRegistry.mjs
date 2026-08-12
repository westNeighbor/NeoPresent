const renderers = new Map();

export function registerPlotRenderer(kind, renderer) {
  if (typeof kind !== 'string' || typeof renderer !== 'function') return;
  renderers.set(kind.toLowerCase(), renderer);
}

export function getPlotRenderer(kind) {
  return renderers.get(String(kind ?? '').toLowerCase());
}

export function listPlotRenderers() {
  return [...renderers.keys()];
}
