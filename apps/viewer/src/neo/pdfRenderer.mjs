import {
  getDocument,
  GlobalWorkerOptions
} from '../../node_modules/pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = new URL(
  '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).href;

const rendered = new WeakMap();
const pendingRenderKeys = new WeakMap();
const activeRenderTasks = new WeakMap();
const renderGenerations = new WeakMap();
const observedHosts = new WeakSet();
const observedNativeFrames = new WeakSet();
const pdfPageMetrics = new Map();
// Chromium and Edge place their native PDF toolbar inside the iframe. Keep
// this separate from the PDF page's aspect-ratio box; otherwise a correctly
// fitted page is clipped by exactly the toolbar height and gains stale scroll
// extents along both axes.
const nativePdfToolbarHeight = 56;
const nativePdfViewportPadding = 16;
// Chromium may retain its thumbnail rail even when `pagemode=none` is
// requested. Reserve room inside the iframe so the outer HTML scroller can
// reach the entire rendered page instead of losing its right edge.
const pdfPointsToCssPixels = 96 / 72;
const nativePdfContext = /(?:^|\/)presenter\.html$/i.test(globalThis.location.pathname)
  ? 'presenter'
  : 'audience';
let nativePdfRefreshPending = false;

const nativePdfFrameResizeObserver = new ResizeObserver((entries) => {
  entries.forEach(({ target: frame }) => {
    const expectedWidth = Number(frame.dataset.pdfViewerTargetWidth);
    const expectedHeight = Number(frame.dataset.pdfViewerTargetHeight);
    if (
      (!expectedWidth || Math.abs(frame.offsetWidth - expectedWidth) <= 1) &&
      (!expectedHeight || Math.abs(frame.offsetHeight - expectedHeight) <= 1)
    )
      return;
    requestAnimationFrame(() => fitNativePdfFrame(frame));
  });
});

const nativePdfHostResizeObserver = new ResizeObserver((entries) => {
  entries.forEach(({ target: host }) => {
    const frame = host.querySelector('iframe[data-pdf-viewer-frame="true"]');
    if (!frame || frame.dataset.pdfViewerInspection !== 'true') return;
    const width = Math.round(host.clientWidth);
    if (width <= 0 || Number(host.dataset.pdfViewerObservedWidth) === width) return;
    host.dataset.pdfViewerObservedWidth = String(width);
    requestAnimationFrame(() => fitNativePdfFrame(frame));
  });
});

async function getPdfPageMetrics(src, pageNumber) {
  const key = `${src}:${pageNumber}`;
  if (!pdfPageMetrics.has(key)) {
    pdfPageMetrics.set(
      key,
      (async () => {
        const document = await getDocument({ url: src }).promise;
        const page = await document.getPage(Math.max(1, pageNumber));
        const viewport = page.getViewport({ scale: 1 });
        const [x1, y1, x2, y2] = page.view;
        const userUnit = Number(page.userUnit) || 1;
        return {
          height: viewport.height,
          nativeHeight: Math.abs(y2 - y1) * userUnit,
          nativeWidth: Math.abs(x2 - x1) * userUnit,
          page,
          width: viewport.width
        };
      })()
    );
  }
  return pdfPageMetrics.get(key);
}

async function fitNativePdfFrame(frame) {
  const src = frame.dataset.pdfViewerSrc;
  const pageNumber = Number(frame.dataset.pdfViewerPage ?? '1');
  if (!src || frame.dataset.pdfViewerSizing === 'true') return;

  frame.dataset.pdfViewerSizing = 'true';
  try {
    const page = await getPdfPageMetrics(src, pageNumber);
    if (!frame.isConnected || page.width <= 0 || page.height <= 0) return;

    const host = frame.closest('[data-pdf-viewer-host="true"]') || frame.parentElement;
    if (!host) return;
    const inspectionMode = frame.dataset.pdfViewerInspection === 'true';
    const baseWidth = inspectionMode
      ? host.clientWidth || host.offsetWidth
      : Number(host.dataset.pdfViewerBaseWidth) || host.offsetWidth || host.clientWidth;
    const baseHeight =
      Number(host.dataset.pdfViewerBaseHeight) || host.offsetHeight || host.clientHeight;
    if (baseWidth <= 0 || baseHeight <= 0) return;
    if (!inspectionMode) {
      host.dataset.pdfViewerBaseWidth = String(baseWidth);
      host.dataset.pdfViewerBaseHeight = String(baseHeight);
    }

    const widthConstrained = frame.dataset.pdfViewerWidthConstrained === 'true';
    const heightConstrained = frame.dataset.pdfViewerHeightConstrained === 'true';
    const ratio = page.width / page.height;
    let width;
    let height;

    if (widthConstrained && !heightConstrained) {
      width = baseWidth;
      height = width / ratio + nativePdfToolbarHeight;
    } else if (heightConstrained && !widthConstrained) {
      const pageHeight = Math.max(1, baseHeight - nativePdfToolbarHeight);
      height = pageHeight + nativePdfToolbarHeight;
      width = pageHeight * ratio;
      if (width > baseWidth) {
        width = baseWidth;
        height = width / ratio + nativePdfToolbarHeight;
      }
    } else {
      const pageAreaHeight = Math.max(1, baseHeight - nativePdfToolbarHeight);
      const fit = Math.min(baseWidth / page.width, pageAreaHeight / page.height);
      width = page.width * fit;
      height = page.height * fit + nativePdfToolbarHeight;
    }

    host.style.height = `${Math.max(1, height)}px`;
    // Inspection mode lives in an actual browser-sized canvas. Retaining a
    // percentage width lets it shrink and grow with that canvas; a pixel width
    // here would permanently remember the size from the moment P was pressed.
    const inspectionZoom = Math.max(0.75, Number(host.dataset.pdfViewerZoom) || 1);
    host.style.width = inspectionMode
      ? `${inspectionZoom * 100}%`
      : `${Math.max(1, width)}px`;
    const fitWidth = Math.max(1, width - nativePdfViewportPadding);
    const fitHeight = Math.max(
      1,
      height - nativePdfToolbarHeight - nativePdfViewportPadding
    );
    const fitZoom =
      Math.min(
        fitWidth / (page.nativeWidth * pdfPointsToCssPixels),
        fitHeight / (page.nativeHeight * pdfPointsToCssPixels)
      ) * 100;
    const visualScale = Math.max(
      0.01,
      (host.getBoundingClientRect().width || width) / Math.max(1, host.offsetWidth || width)
    );
    // Chromium's native viewer inconsistently ignores decimal zoom fragments
    // (for example `zoom=59.3`) and falls back to a shared fit state. Use the
    // integer percentage defined by the PDF open-parameter convention.
    const resolvedZoom = Math.max(
      5,
      Math.min(400, Math.round((fitZoom * visualScale) / pdfPointsToCssPixels))
    );
    frame.dataset.pdfViewerFitZoom = String(resolvedZoom);
    // Chromium clamps its native PDF viewer near 50%. Give the embedded
    // viewer enough unscaled room for that effective minimum, then let the
    // surrounding HTML host provide reliable scrolling inside a scaled slide.
    const nativeZoom = resolvedZoom / 100;
    const targetHeight = Math.max(
      height,
      page.nativeHeight * pdfPointsToCssPixels * nativeZoom +
        nativePdfToolbarHeight +
        nativePdfViewportPadding
    );
    // Horizontal state belongs to this native viewer. Do not manufacture an
    // off-screen thumbnail allowance: Chromium may open or close that rail per
    // iframe, and a fixed allowance creates a blank left gap in one frame while
    // clipping the right edge of another.
    const targetScrollLeft = 0;
    const targetWidth = width;
    const geometryChanged =
      Math.abs(frame.offsetWidth - targetWidth) > 1 ||
      Math.abs(frame.offsetHeight - targetHeight) > 1;
    frame.dataset.pdfViewerTargetHeight = String(targetHeight);
    frame.dataset.pdfViewerTargetScrollLeft = String(targetScrollLeft);
    frame.dataset.pdfViewerTargetWidth = String(targetWidth);
    frame.style.height = `${targetHeight}px`;
    frame.style.width = `${targetWidth}px`;
    frame.dataset.pdfViewerAspectFitted = 'true';
    if (geometryChanged) delete host.dataset.pdfViewerPageAligned;
    alignNativePdfPage(frame, host);
    scheduleNativePdfFrameRefresh();
    // The responsive inspection iframe is already created with page-fit open
    // parameters. Reloading it after layout doubles every PDF request and is
    // the main source of intermittent gray native-viewer placeholders when P
    // is toggled quickly. Fixed slide-layout viewers retain the legacy restart.
    if (!inspectionMode) restartNativePdfFrameOnce(frame);
  } catch (error) {
    console.error('NeoPresent could not size the native PDF viewer.', error);
  } finally {
    delete frame.dataset.pdfViewerSizing;
  }
}

function alignNativePdfPage(frame, host) {
  if (host.dataset.pdfViewerPageAligned === 'true') return;
  const apply = () => {
    if (!frame.isConnected || !host.isConnected) return;
    const targetScrollLeft = Number(frame.dataset.pdfViewerTargetScrollLeft) || 0;
    const maximumScrollLeft = Math.max(0, host.scrollWidth - host.clientWidth);
    host.scrollLeft = Math.min(targetScrollLeft, maximumScrollLeft);
    host.dataset.pdfViewerPageAligned = 'true';
  };
  // The width assignment above already participates in layout. Align now and
  // once more on the next frame in case the native plugin finishes attaching
  // after this JavaScript turn.
  void frame.offsetWidth;
  apply();
  requestAnimationFrame(apply);
}

const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach(({ target }) => {
    target.querySelectorAll('canvas[data-pdf-src]').forEach((canvas) => {
      rendered.delete(canvas);
      renderPdfPage(canvas);
    });
  });
});

async function renderPdfPage(canvas) {
  const src = canvas.dataset.pdfSrc;
  const pageNumber = Number(canvas.dataset.pdfPage ?? '1');
  if (!src) return;

  const host = canvas.parentElement;
  const bounds = host?.getBoundingClientRect();
  // A PDF fence can constrain either axis. Otherwise retain the responsive
  // default of fitting the page to its slide container.
  const availableWidth =
    (canvas.dataset.pdfWidthConstrained === 'true' ? canvas.clientWidth : 0) ||
    host?.clientWidth ||
    bounds?.width ||
    0;
  const availableHeight =
    (canvas.dataset.pdfHeightConstrained === 'true' ? canvas.clientHeight : 0) ||
    host?.clientHeight ||
    bounds?.height ||
    0;
  if (availableWidth === 0 || availableHeight === 0) return;

  const key = `${src}:${pageNumber}:${Math.round(availableWidth)}:${Math.round(availableHeight)}`;
  if (rendered.get(canvas) === key || pendingRenderKeys.get(canvas) === key) return;

  const generation = (renderGenerations.get(canvas) ?? 0) + 1;
  renderGenerations.set(canvas, generation);
  pendingRenderKeys.set(canvas, key);
  canvas.dataset.rendering = 'true';
  activeRenderTasks.get(canvas)?.cancel?.();
  activeRenderTasks.delete(canvas);
  const previousContext = canvas.getContext('2d', { alpha: true });
  previousContext?.clearRect(0, 0, canvas.width, canvas.height);
  let renderTask;
  try {
    const metrics = await getPdfPageMetrics(src, pageNumber);
    if (renderGenerations.get(canvas) !== generation || !canvas.isConnected) return;
    const page = metrics.page;
    const unscaled = { height: metrics.height, width: metrics.width };
    const scale = Math.min(availableWidth / unscaled.width, availableHeight / unscaled.height);
    const pixelRatio = Math.min(Math.max(globalThis.devicePixelRatio || 1, 2), 3);
    const viewport = page.getViewport({ scale: scale * pixelRatio });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
    canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;

    // Keep areas that the PDF does not paint transparent, so a figure with no
    // page background blends into the slide just as it does in Keynote.
    const context = canvas.getContext('2d', { alpha: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    renderTask = page.render({
      canvasContext: context,
      viewport,
      background: 'rgba(0, 0, 0, 0)'
    });
    activeRenderTasks.set(canvas, renderTask);
    await renderTask.promise;
    if (renderGenerations.get(canvas) !== generation) return;
    rendered.set(canvas, key);
    canvas.style.animationPlayState = 'running';
    const captionHost = canvas.closest('[data-pdf-caption-host="true"]');
    if (captionHost) captionHost.style.animationPlayState = 'running';
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') return;
    console.error('NeoPresent could not render the PDF page.', error);
    if (renderGenerations.get(canvas) === generation)
      drawError(canvas, 'Unable to render this PDF page.');
  } finally {
    if (activeRenderTasks.get(canvas) === renderTask) activeRenderTasks.delete(canvas);
    if (pendingRenderKeys.get(canvas) === key) pendingRenderKeys.delete(canvas);
    if (renderGenerations.get(canvas) === generation) {
      delete canvas.dataset.rendering;
      canvas.style.animationPlayState = 'running';
      const captionHost = canvas.closest('[data-pdf-caption-host="true"]');
      if (captionHost) captionHost.style.animationPlayState = 'running';
    }
  }
}

function drawError(canvas, message) {
  canvas.width ||= 640;
  canvas.height ||= 160;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#7f1d1d';
  context.font = '18px sans-serif';
  context.fillText(message, 24, 48);
}

function observeCanvas(canvas) {
  const host = canvas.parentElement;

  if (host && !observedHosts.has(host)) {
    observedHosts.add(host);
    resizeObserver.observe(host);
  }
}

function renderAllPdfPages() {
  document.querySelectorAll('canvas[data-pdf-src]').forEach((canvas) => {
    observeCanvas(canvas);
    requestAnimationFrame(() => renderPdfPage(canvas));
  });
  document.querySelectorAll('iframe[data-pdf-viewer-frame="true"]').forEach((frame) => {
    if (!observedNativeFrames.has(frame)) {
      observedNativeFrames.add(frame);
      nativePdfFrameResizeObserver.observe(frame);
    }
    const host = frame.closest('[data-pdf-viewer-host="true"]');
    if (host && frame.dataset.pdfViewerInspection === 'true' && !observedHosts.has(host)) {
      observedHosts.add(host);
      nativePdfHostResizeObserver.observe(host);
    }
    requestAnimationFrame(() => fitNativePdfFrame(frame));
  });
}

document.addEventListener(
  'load',
  (event) => {
    if (event.target?.matches?.('iframe[data-pdf-viewer-frame="true"]')) {
      event.target.style.animationPlayState = 'running';
      delete event.target.dataset.pdfViewerCompactBootstrap;
      fitNativePdfFrame(event.target);
      scheduleNativePdfFrameRefresh();
    }
  },
  true
);

function restartNativePdfFrameOnce(frame) {
  if (frame.dataset.pdfViewerFitRestarted === 'true') return;
  frame.dataset.pdfViewerFitRestarted = 'true';
  // Chromium's PDF viewer reads its initial zoom and scroll extents from the
  // iframe's current size. This function is called only after the PDF page
  // aspect ratio has set the final frame dimensions. Reloading once after two
  // layout frames makes the native viewer calculate both scroll axes from the
  // settled box instead of retaining the earlier generic placeholder height.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (!frame.isConnected) return;
      const src = frame.getAttribute('src');
      if (!src) return;
      const url = new URL(src, globalThis.location.href);
      const parameters = new URLSearchParams(url.hash.replace(/^#/, ''));
      parameters.set('view', 'Fit');
      parameters.delete('zoom');
      // Chromium remembers native PDF zoom and scroll state by document URL.
      // Give the presenter preview and audience canvas distinct identities so
      // the tiny preview can never overwrite the audience viewer's geometry.
      parameters.set('neopresent-fit', nativePdfContext);
      url.hash = parameters.toString();
      frame.setAttribute('src', url.href);
    })
  );
}

function scheduleNativePdfFrameRefresh() {
  if (nativePdfRefreshPending) return;
  nativePdfRefreshPending = true;
  // Column/flex layout reaches its final size after the inserted iframe has
  // loaded. Wait through two frames, then nudge the native PDF viewer to
  // recompute its page-fit zoom against that final size.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      nativePdfRefreshPending = false;
      refreshNativePdfFrames();
    })
  );
}

function refreshNativePdfFrames() {
  document.querySelectorAll('iframe[data-pdf-viewer-frame="true"]').forEach((frame) => {
    if (frame.dataset.pdfViewerRefreshing === 'true') return;
    frame.dataset.pdfViewerRefreshing = 'true';
    const width = Number(frame.dataset.pdfViewerTargetWidth) || frame.offsetWidth;
    const height = Number(frame.dataset.pdfViewerTargetHeight) || frame.offsetHeight;
    frame.style.width = `${Math.max(1, width - 1)}px`;
    frame.style.height = `${Math.max(1, height - 1)}px`;
    void frame.offsetWidth;
    requestAnimationFrame(() => {
      if (!frame.isConnected) return;
      frame.style.width = `${Math.max(1, width)}px`;
      frame.style.height = `${Math.max(1, height)}px`;
      delete frame.dataset.pdfViewerRefreshing;
    });
  });
}

document.addEventListener('fullscreenchange', () => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      refreshNativePdfFrames();
      if (!document.fullscreenElement) return;
      document.querySelectorAll('iframe[data-pdf-viewer-frame="true"]').forEach((frame) => {
        const src = frame.getAttribute('src');
        if (src) frame.setAttribute('src', src);
      });
    })
  );
});

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.target.matches?.('canvas[data-pdf-src]'))
      rendered.delete(mutation.target);
  });
  renderAllPdfPages();
});
observer.observe(document.documentElement, {
  attributeFilter: ['data-pdf-page', 'data-pdf-src'],
  attributes: true,
  childList: true,
  subtree: true
});
window.addEventListener('resize', () => {
  document.querySelectorAll('canvas[data-pdf-src]').forEach((canvas) => rendered.delete(canvas));
  document.querySelectorAll('[data-pdf-viewer-host="true"]').forEach((host) => {
    delete host.dataset.pdfViewerBaseWidth;
    delete host.dataset.pdfViewerBaseHeight;
  });
  renderAllPdfPages();
  scheduleNativePdfFrameRefresh();
});
window.visualViewport?.addEventListener('resize', () => {
  document.querySelectorAll('canvas[data-pdf-src]').forEach((canvas) => rendered.delete(canvas));
  document.querySelectorAll('[data-pdf-viewer-host="true"]').forEach((host) => {
    delete host.dataset.pdfViewerBaseWidth;
    delete host.dataset.pdfViewerBaseHeight;
  });
  renderAllPdfPages();
  scheduleNativePdfFrameRefresh();
});

renderAllPdfPages();
scheduleNativePdfFrameRefresh();
