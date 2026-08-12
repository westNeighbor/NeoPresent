let katexPromise;

async function getKatex() {
  katexPromise ??= import('../../node_modules/katex/dist/katex.mjs').then(
    ({ default: katex }) => katex
  );
  return katexPromise;
}

async function renderMath(host) {
  const source = host.dataset.katexSource;
  if (!source || host.dataset.katexRendering === 'true' || host.dataset.katexRendered === source)
    return;

  host.dataset.katexRendering = 'true';
  try {
    const katex = await getKatex();
    katex.render(source, host, {
      displayMode: host.dataset.katexDisplay !== 'inline',
      throwOnError: true,
      trust: false
    });
    host.dataset.katexRendered = source;
  } catch (error) {
    console.error('NeoPresent could not render this equation.', error);
    host.textContent = `Unable to render equation: ${error instanceof Error ? error.message : String(error)}`;
    Object.assign(host.style, {
      color: '#fda4af',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      whiteSpace: 'pre-wrap'
    });
  } finally {
    delete host.dataset.katexRendering;
  }
}

function renderAllMath() {
  document
    .querySelectorAll('[data-katex-source]')
    .forEach((host) => requestAnimationFrame(() => renderMath(host)));
}

const observer = new MutationObserver(renderAllMath);
observer.observe(document.documentElement, { childList: true, subtree: true });
renderAllMath();
