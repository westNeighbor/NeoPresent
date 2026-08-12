let mermaidPromise;
let sequence = 0;

async function getMermaid() {
  mermaidPromise ??= import('../../node_modules/mermaid/dist/mermaid.esm.min.mjs').then(
    ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' });
      return mermaid;
    }
  );
  return mermaidPromise;
}

async function renderDiagram(host) {
  const source = host.dataset.mermaidSource;
  if (
    !source ||
    host.dataset.mermaidRendering === 'true' ||
    host.dataset.mermaidRendered === source
  )
    return;

  host.dataset.mermaidRendering = 'true';
  try {
    const mermaid = await getMermaid();
    const { svg } = await mermaid.render(`neopresent-mermaid-${(sequence += 1)}`, source);
    host.replaceChildren();
    host.insertAdjacentHTML('afterbegin', svg);
    const diagram = host.querySelector('svg');
    if (diagram)
      Object.assign(diagram.style, {
        height: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
        width: 'auto'
      });
    host.dataset.mermaidRendered = source;
  } catch (error) {
    console.error('NeoPresent could not render this Mermaid diagram.', error);
    host.textContent = `Unable to render Mermaid diagram: ${error instanceof Error ? error.message : String(error)}`;
    Object.assign(host.style, {
      color: '#fda4af',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      whiteSpace: 'pre-wrap'
    });
  } finally {
    delete host.dataset.mermaidRendering;
  }
}

function renderAllDiagrams() {
  document
    .querySelectorAll('[data-mermaid-source]')
    .forEach((host) => requestAnimationFrame(() => renderDiagram(host)));
}

const observer = new MutationObserver(renderAllDiagrams);
observer.observe(document.documentElement, { childList: true, subtree: true });
renderAllDiagrams();
