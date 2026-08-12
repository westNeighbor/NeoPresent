import { parseMarkdown } from '../../../node_modules/@neopresent/markdown/dist/index.js';
import { hydratePresentationCharts } from './chartData.mjs';
import { createViewport } from './view/Viewport.mjs';

export const onStart = async () => {
  const deckUrl = await resolveDeckUrl();
  const reloadChannel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('neopresent-live-reload');
  const initialDeck = await loadDeckSource(deckUrl);
  const source = initialDeck.source;
  let deck;

  try {
    deck = await hydratePresentationCharts(parseMarkdown(source), deckUrl);
  } catch (error) {
    reloadChannel?.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  Neo.app({ mainView: createViewport(deck, deckUrl), name: deck.title || 'NeoPresent Viewer' });

  let loadedSource = source;
  let reportedInvalidSource = '';
  let checking = false;

  // Webpack watches JavaScript, but the presentation itself is an authored
  // Markdown asset. Poll it lightly in development so saves appear without a
  // manual refresh. A changed deck is parsed before reloading the page.
  setInterval(async () => {
    if (checking) return;
    checking = true;

    try {
      const nextSource = (await loadDeckSource(deckUrl)).source;
      if (nextSource === loadedSource) {
        reloadChannel?.postMessage({ type: 'clear-error' });
        return;
      }
      if (nextSource === reportedInvalidSource) return;

      try {
        parseMarkdown(nextSource);
      } catch (error) {
        reportedInvalidSource = nextSource;
        reloadChannel?.postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : String(error)
        });
        return;
      }

      reloadChannel?.postMessage({ type: 'reload' });
    } catch (error) {
      reloadChannel?.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      checking = false;
    }
  }, 1200);
};

const includePattern = /^\s*@include\s+(.+?)\s*$/;

async function loadDeckSource(url, ancestry = []) {
  const canonicalUrl = new URL(url);
  canonicalUrl.search = '';
  canonicalUrl.hash = '';
  const key = canonicalUrl.href;
  if (ancestry.includes(key))
    throw new Error(`Circular Markdown include: ${[...ancestry, key].join(' → ')}`);

  const response = await fetch(canonicalUrl, { cache: 'no-store' });
  if (!response.ok)
    throw new Error(
      `Could not load presentation Markdown (${response.status}): ${canonicalUrl.pathname}`
    );

  const lines = (await response.text()).split(/\r?\n/);
  const output = [];
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const include = fenced ? null : line.match(includePattern);
    if (!include) {
      output.push(line);
      continue;
    }
    const target = include[1].trim().replace(/^(?:"([^"]+)"|'([^']+)')$/, '$1$2');
    if (!/\.md$/i.test(target))
      throw new Error(`Markdown includes must reference a .md file: ${target}`);
    const includedUrl = new URL(target, canonicalUrl);
    if (includedUrl.origin !== canonicalUrl.origin)
      throw new Error(`Markdown includes must stay on the presentation server: ${target}`);
    output.push((await loadDeckSource(includedUrl, [...ancestry, key])).source);
  }
  return { source: output.join('\n') };
}

async function resolveDeckUrl() {
  const { location } = globalThis;
  const port = location.port || (location.protocol === 'https:' ? '443' : '80');

  try {
    const pointerUrl = new URL(`/__neopresent_deck_${port}.json`, location.href);
    const response = await fetch(pointerUrl, { cache: 'no-store' });
    if (response.ok) {
      const { file } = await response.json();
      if (typeof file === 'string' && file === file.split('/').pop() && /\.md$/i.test(file)) {
        return new URL(`/${encodeURIComponent(file)}`, location.href);
      }
    }
  } catch (error) {
    throw new Error('No presentation Markdown file was selected.', { cause: error });
  }

  throw new Error('No presentation Markdown file was selected. Start NeoPresent with a .md path.');
}
