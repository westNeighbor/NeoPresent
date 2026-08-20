import BaseViewport from '../../../node_modules/neo.mjs/src/container/Viewport.mjs';
import Container from '../../../node_modules/neo.mjs/src/container/Base.mjs';
import Component from '../../../node_modules/neo.mjs/src/component/Base.mjs';
import Label from '../../../node_modules/neo.mjs/src/component/Label.mjs';
import StateProvider from '../../../node_modules/neo.mjs/src/state/Provider.mjs';
import Toolbar from '../../../node_modules/neo.mjs/src/toolbar/Base.mjs';
import { hydrateDataNode, hydrateSlideChartData } from '../chartData.mjs';
import { createSlideVdom } from '../createSlideView.mjs';
import { getTheme } from '../theme.mjs';
import ViewportController from './ViewportController.mjs';
import { getGalleryLayout, getHelixLayout } from './overviewLayout.mjs';

/** Creates a Neo viewport for an already-compiled presentation deck. */
export function createViewport(
  deck,
  deckUrl = new URL('/presentation.md', globalThis.location.href)
) {
  const themeOptions = {
    cimentHatchAlpha: deck.getAttribute?.('cimentHatchAlpha'),
    cimentHatchColor: deck.getAttribute?.('cimentHatchColor'),
    cimentHatchDensity: deck.getAttribute?.('cimentHatchDensity'),
    fymaPalette: deck.getAttribute?.('fymaPalette'),
    fymaGradientDirection: deck.getAttribute?.('fymaGradientDirection')
  };
  const theme = getTheme(deck.theme, themeOptions);
  let liveTheme = '';
  let liveAspect = '';
  const getSlideTheme = (slide) =>
    getTheme(liveTheme || slide?.getAttribute?.('slideTheme') || deck.theme, themeOptions);
  const hashChannel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('neopresent-deeplink');
  const helpChannel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('neopresent-viewer-help');
  const controlsHiddenByDefault = deck.getAttribute?.('controls') === 'hidden';
  const footer = {
    center: deck.getAttribute?.('footer') ?? '',
    left: deck.getAttribute?.('footerLeft') ?? '',
    right: deck.getAttribute?.('footerRight') ?? '',
    font: deck.getAttribute?.('footerFont') ?? '',
    leftFont: deck.getAttribute?.('footerLeftFont') ?? '',
    centerFont: deck.getAttribute?.('footerCenterFont') ?? '',
    rightFont: deck.getAttribute?.('footerRightFont') ?? '',
    size: deck.getAttribute?.('footerSize') ?? '.85rem',
    offset: deck.getAttribute?.('footerOffset') ?? '0,0',
    shadow: deck.getAttribute?.('footerShadow') ?? '',
    shadowColor: deck.getAttribute?.('footerShadowColor') ?? '',
    shadowOpacity: deck.getAttribute?.('footerShadowOpacity') ?? '',
    shadowAngle: deck.getAttribute?.('footerShadowAngle') ?? '',
    shadowDistance: deck.getAttribute?.('footerShadowDistance') ?? '',
    shadowOffset: deck.getAttribute?.('footerShadowOffset') ?? '',
    shadowBlur: deck.getAttribute?.('footerShadowBlur') ?? '',
    shadowCurve: deck.getAttribute?.('footerShadowCurve') ?? '',
    shadowSize: deck.getAttribute?.('footerShadowSize') ?? '',
    shadowPerspective: deck.getAttribute?.('footerShadowPerspective') ?? ''
  };
  const logo = deck.getAttribute?.('logo') ?? '';
  const logoOffset = deck.getAttribute?.('logoOffset') ?? '0,0';
  const presenterLogo = logo ? { offset: logoOffset, src: logo } : null;
  const pageNumbersEnabled = deck.getAttribute?.('pageNumber') === true;
  const pageTotalEnabled = deck.getAttribute?.('pageTotal') === true;
  const pageTotalIncludesNoToc = deck.getAttribute?.('pageTotalNotoc') === true;
  const numberedSlideIndexes = deck.children.flatMap((slide, index) =>
    slide.getAttribute?.('titleSlide') === true ||
    slide.getAttribute?.('tocGenerated') === true ||
    (!pageTotalIncludesNoToc && slide.getAttribute?.('tocEntry') === false)
      ? []
      : [index]
  );
  let tocSectionStarted = false;
  const tocEntries = deck.children.flatMap((slide, index) => {
    if (
      slide.getAttribute?.('titleSlide') === true ||
      slide.getAttribute?.('tocGenerated') === true ||
      slide.getAttribute?.('agenda') ||
      slide.getAttribute?.('tocEntry') === false
    )
      return [];
    const title = getSlideTitle(slide);
    if (!title || title === 'Untitled slide') return [];
    const section = Boolean(slide.getAttribute?.('section'));
    const indented = tocSectionStarted && !section;
    if (section) tocSectionStarted = true;
    return [{ index, indented, section, title }];
  });
  const getPageNumber = (index) =>
    pageNumbersEnabled && numberedSlideIndexes.includes(index)
      ? {
          current: numberedSlideIndexes.indexOf(index) + 1,
          total: numberedSlideIndexes.length,
          showTotal: pageTotalEnabled,
          position: deck.getAttribute?.('pageNumberPosition') ?? 'bottom-right',
          offset: deck.getAttribute?.('pageNumberOffset') ?? '0,0',
          size: deck.getAttribute?.('pageNumberSize') ?? '.85rem'
        }
      : null;
  const progressEnabled = deck.getAttribute?.('progress') === true;
  const getProgress = (index) =>
    progressEnabled ? { current: index + 1, total: deck.children.length } : null;
  const autoplayMs = Math.max(0, Number(deck.getAttribute?.('autoplayMs') ?? 0));
  const slidePdfModes = new Map();
  // PDF blocks can be nested inside columns, grids, and other containers.
  // A slide-level mode override intentionally applies to every PDF on it.
  const findFirstPdf = (node) => {
    if (!node) return null;
    if (node.type === 'pdf') return node;
    for (const child of node.children ?? []) {
      const pdf = findFirstPdf(child);
      if (pdf) return pdf;
    }
    return null;
  };
  const slideRevealIndexes = new Map();
  // Card-layout internals are not part of Neo's public API. Keep a direct
  // reference to each mounted slide instead of walking `items` by position;
  // controls and overlays may be added around the deck without breaking a
  // staged-reveal redraw.
  const slideComponents = new Map();
  const overviewComponents = new Map();
  const overviewPreviewCache = new Map();
  const overviewModes = ['grid', 'gallery', 'helix'];
  let previousOverviewIndex = 0;
  let overviewRenderRevision = 0;
  let overviewRenderUpdate = Promise.resolve();
  const presentationStartedAt = Date.now();
  const presenterChannel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('neopresent-presenter');
  let viewportInstance;
  let timerPaused = false;
  let autoplayPaused = false;
  let laserPointer;
  let autoplayTimer;
  let autoplayDeadline = 0;
  let filmstripComponent;
  let liveStyleRevision = 0;
  let liveStyleUpdate = Promise.resolve();
  const serializePresenterSlide = (
    slide,
    index,
    revealIndex,
    animate = false,
    revealDirection = 'forward'
  ) => {
    if (!slide) return null;
    const slideTheme = getSlideTheme(slide);
    return {
      ...serializeSlide(
        slide,
        revealIndex,
        slideTheme,
        getProgress(index),
        footer,
        presenterLogo,
        getPageNumber(index),
        liveAspect
      ),
      vdom: createSlideVdom(
        slide,
        slideTheme,
        controlsHiddenByDefault,
        // Keep speaker previews on the PDF.js canvas renderer. Chromium's
        // native PDF extension shares zoom/sidebar preferences across embedded
        // viewers and browser windows; loading the tiny presenter iframe can
        // otherwise overwrite the audience PDF's zoom and scroll geometry.
        'canvas',
        revealIndex,
        animate,
        footer,
        logo,
        getProgress(index),
        logoOffset,
        getPageNumber(index),
        liveAspect,
        false,
        revealDirection
      )
    };
  };

  const scheduleAutoplay = () => {
    clearTimeout(autoplayTimer);
    autoplayDeadline = 0;
    if (!viewportInstance || autoplayPaused) return;
    const state = viewportInstance.getStateProvider().data;
    const duration = Number(
      deck.children[state.activeIndex]?.getAttribute?.('durationMs') ?? autoplayMs
    );
    if (duration <= 0) return;
    if (state.activeIndex >= state.maxIndex) return;
    autoplayDeadline = Date.now() + duration;
    autoplayTimer = setTimeout(() => navigateFromPresenter('next', undefined, true), duration);
  };

  const pauseAutoplay = () => {
    autoplayPaused = true;
    clearTimeout(autoplayTimer);
    autoplayDeadline = 0;
  };

  const updateLaserPointer = ({ x, y, visible }) => {
    if (typeof document === 'undefined') return;

    if (!laserPointer) {
      laserPointer = document.createElement('div');
      laserPointer.setAttribute('aria-hidden', 'true');
      Object.assign(laserPointer.style, {
        background: '#ff3b30',
        border: '2px solid rgba(255,255,255,.9)',
        borderRadius: '50%',
        boxShadow: '0 0 8px 3px rgba(255,59,48,.72)',
        height: '14px',
        pointerEvents: 'none',
        position: 'fixed',
        transform: 'translate(-50%, -50%)',
        transition: 'opacity 80ms linear',
        width: '14px',
        zIndex: '9999'
      });
      document.body.append(laserPointer);
    }

    const viewport = document.querySelector('.neo-viewport');
    if (!visible || !viewport || !Number.isFinite(x) || !Number.isFinite(y)) {
      laserPointer.style.opacity = '0';
      return;
    }

    const bounds = viewport.getBoundingClientRect();
    laserPointer.style.left = `${bounds.left + x * bounds.width}px`;
    laserPointer.style.top = `${bounds.top + y * bounds.height}px`;
    laserPointer.style.opacity = '1';
  };

  const publishPresenterState = () => {
    if (!presenterChannel || !viewportInstance) return;

    const state = viewportInstance.getStateProvider().data;
    const activeSlide = deck.children[state.activeIndex];
    const previousSlide = deck.children[state.activeIndex - 1];
    const nextSlide = deck.children[state.activeIndex + 1];
    const activePdf = findFirstPdf(activeSlide);
    presenterChannel.postMessage({
      type: 'state',
      theme: getSlideTheme(activeSlide),
      activeIndex: state.activeIndex,
      controlsVisible: state.controlsVisible,
      elapsedSeconds: state.elapsedSeconds,
      filmstripOpen: state.filmstripOpen,
      overview: state.overview,
      pdfMode: activePdf
        ? (slidePdfModes.get(state.activeIndex) ?? activePdf.mode ?? 'canvas')
        : '',
      tocOpen: state.tocOpen,
      currentSlide: serializePresenterSlide(
        activeSlide,
        state.activeIndex,
        state.revealIndex,
        true,
        state.revealDirection
      ),
      currentTitle: activeSlide ? getSlideTitle(activeSlide) : '',
      notes: activeSlide?.notes ?? '',
      previousTitle: previousSlide ? getSlideTitle(previousSlide) : 'Start of presentation',
      previousSlide: serializePresenterSlide(
        previousSlide,
        state.activeIndex - 1,
        Number.POSITIVE_INFINITY
      ),
      nextTitle: nextSlide ? getSlideTitle(nextSlide) : 'End of presentation',
      nextSlide: serializePresenterSlide(
        nextSlide,
        state.activeIndex + 1,
        Number.POSITIVE_INFINITY
      ),
      startedAt: presentationStartedAt,
      slides: deck.children.map((slide, index) => ({
        index,
        title: getSlideTitle(slide) || `Slide ${index + 1}`,
        section: Boolean(slide.getAttribute?.('section')),
        tocVisible:
          slide.getAttribute?.('titleSlide') !== true &&
          slide.getAttribute?.('tocGenerated') !== true &&
          !slide.getAttribute?.('agenda') &&
          slide.getAttribute?.('tocEntry') !== false
      })),
      title: deck.title || 'NeoPresent',
      autoplayConfigured: deck.children.some(
        (slide) => Number(slide.getAttribute?.('durationMs') ?? autoplayMs) > 0
      ),
      autoplayDeadline,
      autoplayRunning:
        Number(activeSlide?.getAttribute?.('durationMs') ?? autoplayMs) > 0 && !autoplayPaused,
      timerRunning: !timerPaused,
      liveTheme,
      liveAspect,
      totalSlides: deck.children.length
    });
  };

  const navigateFromPresenter = (direction, requestedIndex, automatic = false) => {
    if (!viewportInstance) return;
    if (!automatic) pauseAutoplay();

    const state = viewportInstance.getStateProvider().data;
    let index = state.activeIndex;
    state.overview = false;

    if (direction === 'next') {
      if (viewportInstance.advanceReveal()) {
        publishPresenterState();
        scheduleAutoplay();
        return;
      }
      index += 1;
    } else if (direction === 'previous') {
      if (viewportInstance.reverseReveal()) {
        publishPresenterState();
        return;
      }
      index -= 1;
    } else if (direction === 'first') {
      index = 0;
    } else if (direction === 'last') {
      index = state.maxIndex;
    } else if (direction === 'goto') {
      index = Number(requestedIndex);
      if (!Number.isInteger(index)) return;
    } else {
      return;
    }

    state.activeIndex = Math.max(0, Math.min(index, state.maxIndex));
    viewportInstance.resetReveal(state.activeIndex);
    viewportInstance.syncSlideHash();
    publishPresenterState();
    scheduleAutoplay();
  };

  const applySlideHash = (hash) => {
    if (!viewportInstance) return;
    const index = getHashSlideIndex(hash, deck.children.length);
    const exportMode = isExportHash(hash);
    const exportRevealIndex = getExportRevealIndex(hash);
    const state = viewportInstance.getStateProvider().data;
    state.activeIndex = index;
    state.overview = false;
    state.controlsVisible = exportMode ? false : state.controlsVisible;
    if (exportMode) {
      const revealIndex = exportRevealIndex ?? Number.POSITIVE_INFINITY;
      state.revealIndex = revealIndex;
      slideRevealIndexes.set(index, revealIndex);
      viewportInstance.refreshActiveSlide(false, true);
      setTimeout(() => viewportInstance?.refreshActiveSlide(false, true), 0);
    } else {
      viewportInstance.resetReveal(index);
      viewportInstance.syncSlideHash();
    }
    publishPresenterState();
  };

  if (hashChannel) {
    hashChannel.onmessage = (event) => {
      if (event.data?.type === 'open-slide') applySlideHash(event.data.hash);
    };
    hashChannel.postMessage({ type: 'request-hash' });
  }

  if (presenterChannel) {
    presenterChannel.onmessage = (event) => {
      if (event.data?.type === 'request-state') {
        publishPresenterState();
      } else if (event.data?.type === 'request-deck') {
        presenterChannel.postMessage({
          type: 'deck',
          slides: deck.children.map((slide, index) => ({
            index,
            preview: serializePresenterSlide(slide, index, Number.POSITIVE_INFINITY),
            title: getSlideTitle(slide) || `Slide ${index + 1}`
          }))
        });
      } else if (event.data?.type === 'navigate' && viewportInstance) {
        navigateFromPresenter(event.data.direction, event.data.index);
      } else if (event.data?.type === 'timer' && viewportInstance) {
        if (event.data.action === 'pause') timerPaused = true;
        if (event.data.action === 'resume') timerPaused = false;
        if (event.data.action === 'reset')
          viewportInstance.getStateProvider().data.elapsedSeconds = 0;
        publishPresenterState();
      } else if (event.data?.type === 'autoplay' && viewportInstance) {
        autoplayPaused =
          event.data.action === 'pause'
            ? true
            : event.data.action === 'resume'
              ? false
              : !autoplayPaused;
        scheduleAutoplay();
        publishPresenterState();
      } else if (event.data?.type === 'live-style' && viewportInstance) {
        liveTheme = String(event.data.theme ?? '');
        liveAspect = /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(String(event.data.aspect ?? ''))
          ? String(event.data.aspect)
          : '';
        // Update the presenter's current/previous/next previews immediately.
        // The larger viewer and filmstrip transaction continues below.
        publishPresenterState();
        const revision = ++liveStyleRevision;
        liveStyleUpdate = liveStyleUpdate
          .catch(() => undefined)
          .then(async () => {
            if (revision !== liveStyleRevision) return;
            for (const component of slideComponents.values()) {
              await component.refreshLiveStyle();
              if (revision !== liveStyleRevision) return;
            }
            const liveState = viewportInstance.getStateProvider().data;
            const reopenFilmstrip = Boolean(liveState.filmstripOpen);
            if (reopenFilmstrip) {
              presenterChannel.postMessage({
                type: 'filmstrip-theme-swap',
                phase: 'start'
              });
              liveState.filmstripOpen = false;
              publishPresenterState();
              // Let the removeDom binding finish before replacing the large
              // preview tree. Reconciling two complete theme layouts while the
              // strip is mounted can retain old descendants or wedge Neo's
              // update queue.
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
            await filmstripComponent?.refreshLiveStyle(false);
            if (reopenFilmstrip) {
              liveState.filmstripOpen = true;
              await filmstripComponent?.setPreviewsVisible(true);
              publishPresenterState();
              await new Promise((resolve) => setTimeout(resolve, 50));
              presenterChannel.postMessage({
                type: 'filmstrip-theme-swap',
                phase: 'end'
              });
            }
            if (revision !== liveStyleRevision) return;
            overviewPreviewCache.clear();
            if (liveState.overview) {
              await viewportInstance.focusOverviewCard(liveState.overviewIndex, true);
            }
            if (revision !== liveStyleRevision) return;
            presenterChannel.postMessage({
              type: 'deck',
              slides: deck.children.map((slide, index) => ({
                index,
                preview: serializePresenterSlide(slide, index, Number.POSITIVE_INFINITY),
                title: getSlideTitle(slide) || `Slide ${index + 1}`
              }))
            });
            publishPresenterState();
          });
      } else if (event.data?.type === 'laser') {
        updateLaserPointer(event.data);
      }
    };
  }
  const collectPdfViewerHosts = (node, hosts = []) => {
    if (!node || typeof node !== 'object') return hosts;
    if (node.data?.pdfViewerHost === 'true') {
      hosts.push(node);
      return hosts;
    }
    if (Array.isArray(node.cn)) {
      node.cn.forEach((child) => collectPdfViewerHosts(child, hosts));
    }
    return hosts;
  };
  const configurePdfInspectionHost = (host) => {
    host.data = {
      ...host.data,
      pdfViewerInspection: 'true',
      pdfViewerHeightConstrained: 'false',
      pdfViewerWidthConstrained: 'true'
    };
    host.style = {
      ...host.style,
      alignSelf: 'stretch',
      flex: '0 0 auto',
      maxHeight: 'none',
      maxWidth: 'none',
      overflow: 'hidden',
      width: '100%'
    };
    const configureFrame = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.data?.pdfViewerFrame === 'true') {
        node.data = {
          ...node.data,
          pdfViewerInspection: 'true',
          pdfViewerHeightConstrained: 'false',
          pdfViewerWidthConstrained: 'true'
        };
        return;
      }
      if (Array.isArray(node.cn)) node.cn.forEach(configureFrame);
    };
    configureFrame(host);
    return host;
  };
  const createAudienceSlideVdom = (...args) => {
    const [slide, , , pdfModeOverride] = args;
    const pdf = findFirstPdf(slide);
    const nativePdfViewer = pdf && (pdfModeOverride ?? pdf.mode ?? 'canvas') === 'viewer';
    const slideView = createSlideVdom(...args);

    if (nativePdfViewer) {
      const pdfHosts = collectPdfViewerHosts(slideView).map(configurePdfInspectionHost);
      if (pdfHosts.length > 0) {
        slideView.data = {
          ...slideView.data,
          neopresentPdfInspection: 'true'
        };
        slideView.style = {
          ...slideView.style,
          alignItems: 'stretch',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '2cqw',
          justifyContent: 'flex-start',
          overflowX: 'auto',
          overflowY: 'auto',
          padding: '2cqw'
        };
        // Inspection mode intentionally shows only the original PDF pages.
        // Slide titles, footers, columns, and other presentation layout can
        // otherwise reduce the useful reading width or create nested scrollers.
        slideView.cn = pdfHosts;
      }
    }

    return {
      data: {
        neopresentPdfViewerHost: String(Boolean(nativePdfViewer)),
        neopresentSlideHost: 'true'
      },
      style: {
        alignItems: 'center',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: '100%'
      },
      cn: [slideView]
    };
  };
  const slideModules = deck.children.map((initialSlide, index) => {
    let slide = initialSlide;
    const refreshMs = Math.max(
      ...slide.children
        .filter((node) => node.type === 'chart' || node.type === 'table')
        .map((node) => node.refreshMs),
      0
    );

    class SlideComponent extends Component {
      static config = {
        className: `NeoPresent.viewer.Slide${index + 1}`,
        vdom: createAudienceSlideVdom(
          slide,
          getSlideTheme(slide),
          controlsHiddenByDefault,
          slidePdfModes.get(index),
          slideRevealIndexes.get(index) ?? 0,
          true,
          footer,
          logo,
          getProgress(index),
          logoOffset,
          getPageNumber(index),
          liveAspect
        )
      };

      onConstructed() {
        super.onConstructed();
        slideComponents.set(index, this);
        this.webSockets = [];
        this.connectWebSocketSources();
        if (refreshMs > 0) {
          this.chartRefreshTimer = setInterval(() => this.refreshCharts(), refreshMs);
        }
      }

      async refreshLiveStyle() {
        this._vdom = createAudienceSlideVdom(
          slide,
          getSlideTheme(slide),
          controlsHiddenByDefault,
          slidePdfModes.get(index),
          slideRevealIndexes.get(index) ?? Number.POSITIVE_INFINITY,
          false,
          footer,
          logo,
          getProgress(index),
          logoOffset,
          getPageNumber(index),
          liveAspect
        );
        // Card-layout slides which are not active are unmounted. Their new
        // VDOM is cached above and will be used on the next mount; awaiting a
        // DOM update here would leave the whole live-theme transaction waiting
        // indefinitely for that slide to become active.
        if (!this.mounted) return;
        this.updateDepth = -1;
        await this.promiseUpdate();
      }

      connectWebSocketSources() {
        if (typeof WebSocket === 'undefined') return;
        slide.children
          .filter(
            (node) =>
              (node.type === 'chart' || node.type === 'table') && /^wss?:\/\//i.test(node.source)
          )
          .forEach((node) => {
            const socket = new WebSocket(node.source);
            socket.addEventListener('message', (event) => {
              try {
                const current = slide.children.find((candidate) => candidate.id === node.id);
                if (!current) return;
                const payload = typeof event.data === 'string' ? event.data : String(event.data);
                const updated = hydrateDataNode(current, payload, `${node.source}.json`);
                slide = slide.with({
                  children: slide.children.map((candidate) =>
                    candidate.id === node.id ? updated : candidate
                  )
                });
                this._vdom = createAudienceSlideVdom(
                  slide,
                  getSlideTheme(slide),
                  controlsHiddenByDefault,
                  slidePdfModes.get(index),
                  Number.POSITIVE_INFINITY,
                  true,
                  footer,
                  logo,
                  getProgress(index),
                  logoOffset,
                  getPageNumber(index),
                  liveAspect
                );
                this.updateVdom();
              } catch (error) {
                console.warn(
                  `NeoPresent could not apply WebSocket data from ${node.source}: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            });
            this.webSockets.push(socket);
          });
      }

      async refreshCharts() {
        if (this.isRefreshingCharts) return;
        this.isRefreshingCharts = true;

        try {
          slide = await hydrateSlideChartData(slide, deckUrl, true);
          this._vdom = createAudienceSlideVdom(
            slide,
            getSlideTheme(slide),
            controlsHiddenByDefault,
            slidePdfModes.get(index),
            Number.POSITIVE_INFINITY,
            true,
            footer,
            logo,
            getProgress(index),
            logoOffset,
            getPageNumber(index),
            liveAspect
          );
          this.updateVdom();
        } finally {
          this.isRefreshingCharts = false;
        }
      }

      destroy() {
        clearInterval(this.chartRefreshTimer);
        this.webSockets?.forEach((socket) => socket.close());
        slideComponents.delete(index);
        super.destroy();
      }
    }

    return Neo.setupClass(SlideComponent);
  });

  const createOverviewPreview = (slide, index, animatePreview = true) => {
    const preview = createSlideVdom(
      slide,
      getSlideTheme(slide),
      controlsHiddenByDefault,
      slidePdfModes.get(index),
      Number.POSITIVE_INFINITY,
      animatePreview,
      footer,
      logo,
      getProgress(index),
      logoOffset,
      getPageNumber(index),
      liveAspect
    );
    if (!animatePreview) disableOverviewPreviewAnimations(preview);
    return preview;
  };

  const createCachedOverviewPreview = (slide, index) => {
    if (!overviewPreviewCache.has(index)) {
      const preview = createOverviewPreview(slide, index, false);
      preview.data = { ...preview.data, neopresentOverviewPreview: 'true' };
      overviewPreviewCache.set(index, preview);
    }
    return overviewPreviewCache.get(index);
  };

  class ViewportStateProvider extends StateProvider {
    static config = {
      className: 'NeoPresent.viewer.ViewportStateProvider',
      data: {
        activeIndex: 0,
        elapsedSeconds: 0,
        revealIndex: 0,
        revealDirection: 'forward',
        controlsVisible: !controlsHiddenByDefault,
        maxIndex: Math.max(deck.children.length - 1, 0),
        notesOpen: false,
        tocOpen: false,
        filmstripOpen: false,
        overview: false,
        overviewMode: 0,
        overviewIndex: 0
      }
    };
  }

  const NeoViewportStateProvider = Neo.setupClass(ViewportStateProvider);

  const slideDeck = {
    module: Container,
    // A card layout briefly exposes its own element while the incoming slide
    // is mounted. Give that element the deck palette so a browser-default
    // white surface cannot flash between slide animations.
    style: {
      background: theme.background,
      minHeight: 0,
      overflow: 'hidden',
      position: 'relative'
    },
    layout: {
      ntype: 'card',
      // Ordinary presentation navigation stays instantaneous. Overview mode
      // can retain Neo's card movement alongside its gallery/helix camera.
      bind: {
        activeIndex: (data) => data.activeIndex,
        slideDirection: (data) => (data.overview ? 'horizontal' : null)
      }
    },
    items: slideModules.map((module) => ({ module }))
  };

  class OverviewComponent extends Component {
    static config = {
      className: 'NeoPresent.viewer.Overview',
      vdom: createOverviewSurface(
        deck,
        getSlideTheme,
        theme,
        overviewModes[0],
        0,
        createCachedOverviewPreview,
        liveAspect,
        0,
        false
      )
    };

    onConstructed() {
      super.onConstructed();
      overviewComponents.set(0, this);
    }

    destroy() {
      overviewComponents.delete(0);
      super.destroy();
    }
  }

  // Keep only one complete overview tree alive. Cycling Grid, Gallery, and
  // Helix reuses this component instead of retaining three copies of every
  // plot, image, table, and PDF preview.
  const overview = { module: Neo.setupClass(OverviewComponent) };

  class FilmstripComponent extends Component {
    static config = {
      className: 'NeoPresent.viewer.Filmstrip',
      style: { height: '100%', width: '100%' },
      vdom: createFilmstripSurface(deck, getSlideTheme, createOverviewPreview, liveAspect, false)
    };

    onConstructed() {
      super.onConstructed();
      // The live filmstrip bridge intentionally keeps the active component instance.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      filmstripComponent = this;
    }

    async refreshLiveStyle(update = true) {
      const visible = Boolean(viewportInstance?.getStateProvider().data.filmstripOpen);
      this._vdom = createFilmstripSurface(
        deck,
        getSlideTheme,
        createOverviewPreview,
        liveAspect,
        visible
      );
      if (update) {
        this.updateDepth = -1;
        await this.promiseUpdate();
      }
    }

    async setPreviewsVisible(visible) {
      this._vdom = createFilmstripSurface(
        deck,
        getSlideTheme,
        createOverviewPreview,
        liveAspect,
        visible
      );
      if (!this.mounted) return;
      this.updateDepth = -1;
      await this.promiseUpdate();
    }

    destroy() {
      if (filmstripComponent === this) filmstripComponent = undefined;
      super.destroy();
    }
  }

  const NeoFilmstripComponent = Neo.setupClass(FilmstripComponent);

  class Viewport extends BaseViewport {
    static config = {
      className: 'NeoPresent.viewer.Viewport',
      controller: ViewportController,
      layout: { ntype: 'vbox', align: 'stretch' },
      stateProvider: NeoViewportStateProvider,
      style: { background: theme.background },
      keys: {
        Right: 'onMoveRight',
        Down: 'onMoveDown',
        PageDown: 'onNextSlide',
        Left: 'onMoveLeft',
        Up: 'onMoveUp',
        PageUp: 'onPreviousSlide',
        Home: 'onFirstSlide',
        End: 'onLastSlide',
        Enter: 'onSelectOverviewFocus',
        Escape: 'onDismissPanels',
        0: 'onExitOverview',
        O: 'onCycleOverview',
        N: 'onToggleNotes',
        T: 'onToggleToc',
        V: 'onToggleFilmstrip',
        C: 'onToggleControls',
        P: 'onTogglePdfMode'
      },
      items: [
        {
          module: Container,
          flex: 1,
          layout: {
            ntype: 'card',
            bind: { activeIndex: (data) => (data.overview ? 1 : 0) }
          },
          items: [slideDeck, overview]
        },
        {
          module: Container,
          cls: ['neopresent-toc-panel'],
          flex: 'none',
          style: {
            backdropFilter: 'blur(18px)',
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderLeft: 0,
            borderRadius: '0 1rem 1rem 0',
            bottom: '1.25rem',
            boxShadow: '0 20px 60px rgba(0,0,0,.38)',
            boxSizing: 'border-box',
            color: theme.foreground,
            left: 0,
            maxWidth: 'min(26rem, calc(100vw - 2rem))',
            overflowY: 'auto',
            padding: '1.25rem 1.4rem 1.4rem',
            position: 'fixed',
            top: '1.25rem',
            width: '22rem',
            zIndex: 40
          },
          items: [
            {
              module: Label,
              html: createTocPanelMarkup(tocEntries, theme),
              style: { lineHeight: 1.4 }
            }
          ]
        },
        {
          module: Container,
          cls: ['neopresent-filmstrip-panel'],
          flex: 'none',
          hideMode: 'visibility',
          bind: { hidden: (data) => !data.filmstripOpen },
          style: {
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderBottom: 0,
            borderRadius: '1rem 1rem 0 0',
            bottom: 0,
            boxShadow: '0 -22px 60px rgba(0,0,0,.38)',
            boxSizing: 'border-box',
            height: 'min(38vh, 390px)',
            left: '2vw',
            overflow: 'hidden',
            padding: '.85rem 0',
            position: 'fixed',
            right: '2vw',
            zIndex: 45
          },
          items: [{ module: NeoFilmstripComponent }]
        },
        {
          module: Container,
          flex: 'none',
          height: 190,
          hideMode: 'visibility',
          bind: { hidden: (data) => !data.notesOpen },
          layout: { ntype: 'hbox', align: 'stretch' },
          style: {
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: '0.75rem',
            bottom: '4.5rem',
            boxSizing: 'border-box',
            color: theme.muted,
            left: '1.25rem',
            overflowY: 'auto',
            padding: '1rem 1.5rem',
            position: 'fixed',
            right: '1.25rem',
            boxShadow: '0 18px 50px rgba(0,0,0,.35)',
            zIndex: 20
          },
          items: [
            {
              module: Container,
              flex: 2,
              layout: { ntype: 'vbox', align: 'stretch' },
              style: { minWidth: 0, paddingRight: '2rem' },
              items: [
                {
                  module: Label,
                  bind: {
                    html: (data) => {
                      const notes =
                        deck.children[data.activeIndex]?.notes ||
                        'No speaker notes for this slide.';
                      return createMathAwareNotesMarkup(notes);
                    }
                  },
                  style: {
                    color: theme.muted,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }
                }
              ]
            },
            {
              module: Container,
              flex: 1,
              layout: { ntype: 'vbox', align: 'stretch' },
              style: {
                borderLeft: `1px solid ${theme.border}`,
                minWidth: 0,
                paddingLeft: '2rem'
              },
              items: [
                {
                  module: Label,
                  bind: {
                    html: (data) => {
                      const previous = deck.children[data.activeIndex - 1];
                      const title = previous ? getSlideTitle(previous) : 'Start of presentation';
                      return `Previous slide — ${createMathAwareNotesMarkup(title)}`;
                    }
                  },
                  style: {
                    color: theme.muted,
                    fontSize: '1.15rem',
                    lineHeight: 1.4,
                    whiteSpace: 'normal'
                  }
                }
              ]
            },
            {
              module: Container,
              flex: 1,
              layout: { ntype: 'vbox', align: 'stretch' },
              style: {
                borderLeft: `1px solid ${theme.border}`,
                minWidth: 0,
                paddingLeft: '2rem'
              },
              items: [
                {
                  module: Label,
                  bind: {
                    html: (data) => {
                      const next = deck.children[data.activeIndex + 1];
                      const title = next ? getSlideTitle(next) : 'End of presentation';
                      return `Next slide — ${createMathAwareNotesMarkup(title)}`;
                    }
                  },
                  style: {
                    color: theme.muted,
                    fontSize: '1.15rem',
                    lineHeight: 1.4,
                    whiteSpace: 'normal'
                  }
                }
              ]
            }
          ]
        },
        {
          module: Toolbar,
          cls: ['neopresent-viewer-controls'],
          flex: 'none',
          height: 64,
          hideMode: 'visibility',
          bind: { hidden: (data) => !data.controlsVisible },
          style: {
            background: theme.surface,
            bottom: 0,
            boxSizing: 'border-box',
            color: theme.foreground,
            height: '64px',
            left: 0,
            position: 'fixed',
            right: 0,
            zIndex: 30
          },
          items: [
            {
              handler: 'onPreviousSlide',
              text: 'Previous',
              bind: {
                disabled: (data) => data.overview || data.activeIndex === 0
              }
            },
            {
              handler: 'onCycleOverview',
              bind: {
                text: (data) =>
                  ['Overview: Grid', 'Overview: Gallery', 'Overview: Helix'][data.overviewMode]
              }
            },
            {
              handler: 'onToggleNotes',
              bind: {
                text: (data) => (data.notesOpen ? 'Hide notes' : 'Notes')
              }
            },
            {
              handler: 'onToggleControls',
              text: 'Hide controls'
            },
            {
              handler: 'onTogglePdfMode',
              text: 'PDF mode'
            },
            {
              handler: 'onToggleHelp',
              text: 'Help'
            },
            {
              module: Label,
              bind: {
                text: (data) => `Slide ${data.activeIndex + 1} / ${data.maxIndex + 1}`
              }
            },
            {
              handler: 'onNextSlide',
              text: 'Next',
              bind: {
                disabled: (data) => data.overview || data.activeIndex === data.maxIndex
              }
            }
          ]
        }
      ]
    };

    onConstructed() {
      super.onConstructed();
      // Presenter synchronization callbacks intentionally target this viewport instance.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      viewportInstance = this;
      this.changeVdomRootKey('tabIndex', 0);
      this.presenterTimer = setInterval(() => {
        if (!timerPaused) this.getStateProvider().data.elapsedSeconds += 1;
      }, 1000);
      // Export captures open a fresh viewer document. There may be no other
      // BroadcastChannel instance to echo its hash back, so apply it directly.
      if (globalThis.location?.hash) applySlideHash(globalThis.location.hash);
      publishPresenterState();
      scheduleAutoplay();
      hashChannel?.postMessage({ type: 'request-hash' });
    }

    destroy() {
      clearInterval(this.presenterTimer);
      clearTimeout(autoplayTimer);
      presenterChannel?.close();
      hashChannel?.close();
      helpChannel?.close();
      laserPointer?.remove();
      super.destroy();
    }

    publishPresenterState() {
      publishPresenterState();
    }

    syncSlideHash() {
      const index = this.getStateProvider().data.activeIndex + 1;
      hashChannel?.postMessage({ type: 'set-hash', index });
    }

    afterSetMounted(value, oldValue) {
      super.afterSetMounted(value, oldValue);

      if (value) this.focus(undefined, false, true);
    }

    onNextSlide() {
      pauseAutoplay();
      this.getController().onNextSlide();
      publishPresenterState();
    }
    onPreviousSlide() {
      pauseAutoplay();
      this.getController().onPreviousSlide();
      publishPresenterState();
    }
    onMoveRight() {
      const controller = this.getController();
      const state = this.getStateProvider().data;
      if (state.overview) controller.moveOverviewFocus(1);
      else this.onNextSlide();
    }
    onMoveLeft() {
      const controller = this.getController();
      const state = this.getStateProvider().data;
      if (state.overview) controller.moveOverviewFocus(-1);
      else this.onPreviousSlide();
    }
    onMoveDown() {
      const controller = this.getController();
      const state = this.getStateProvider().data;
      if (state.overview) {
        if (state.overviewMode === 1) this.moveGalleryOverviewFocusByRow(1);
        else if (state.overviewMode === 2) controller.moveOverviewFocus(1);
        else controller.moveOverviewFocusByRow(1);
      } else this.onNextSlide();
    }
    onMoveUp() {
      const controller = this.getController();
      const state = this.getStateProvider().data;
      if (state.overview) {
        if (state.overviewMode === 1) this.moveGalleryOverviewFocusByRow(-1);
        else if (state.overviewMode === 2) controller.moveOverviewFocus(-1);
        else controller.moveOverviewFocusByRow(-1);
      } else this.onPreviousSlide();
    }
    moveGalleryOverviewFocusByRow(direction) {
      const state = this.getStateProvider().data;
      const columns = Math.max(1, Math.ceil(deck.children.length / 3));
      const row = Math.floor(state.overviewIndex / columns);
      const columnInRow = state.overviewIndex % columns;
      const visualColumn = row % 2 === 0 ? columnInRow : columns - 1 - columnInRow;
      const targetRow = Math.max(0, Math.min(2, row + direction));
      const targetColumnInRow = targetRow % 2 === 0 ? visualColumn : columns - 1 - visualColumn;
      this.getController().setOverviewFocus(targetRow * columns + targetColumnInRow);
    }
    onFirstSlide() {
      pauseAutoplay();
      this.getController().onFirstSlide();
      publishPresenterState();
    }
    onLastSlide() {
      pauseAutoplay();
      this.getController().onLastSlide();
      publishPresenterState();
    }
    onCycleOverview() {
      this.getController().onCycleOverview();
      publishPresenterState();
    }
    onSelectOverviewFocus() {
      this.getController().onSelectOverviewFocus();
      publishPresenterState();
    }
    onToggleNotes() {
      this.getController().onToggleNotes();
    }
    onToggleToc() {
      this.getController().onToggleToc();
      publishPresenterState();
    }
    onToggleFilmstrip() {
      const opening = !this.getStateProvider().data.filmstripOpen;
      if (opening) filmstripComponent?.setPreviewsVisible(true).catch(() => undefined);
      this.getController().onToggleFilmstrip();
      if (!opening) {
        setTimeout(
          () => filmstripComponent?.setPreviewsVisible(false).catch(() => undefined),
          0
        );
      }
      publishPresenterState();
    }
    onToggleControls() {
      this.getController().onToggleControls();
    }
    onTogglePdfMode() {
      this.getController().onTogglePdfMode();
    }
    onToggleHelp() {
      helpChannel?.postMessage({ type: 'toggle' });
    }
    onDismissPanels() {
      if (this.getStateProvider().data.overview) return;
      const closeFilmstrip = this.getStateProvider().data.filmstripOpen;
      this.getController().onDismissPanels();
      if (closeFilmstrip) {
        setTimeout(
          () => filmstripComponent?.setPreviewsVisible(false).catch(() => undefined),
          0
        );
      }
      publishPresenterState();
    }
    onExitOverview() {
      if (!this.getStateProvider().data.overview) return;
      this.getController().onDismissPanels();
      publishPresenterState();
    }

    focusOverviewCard(index, rebuildSurface = false) {
      const state = this.getStateProvider().data;
      const mode = overviewModes[state.overviewMode] ?? 'grid';
      const overviewComponent = overviewComponents.get(0);
      if (!overviewComponent) return;
      const galleryRotationDirection = Math.sign(index - previousOverviewIndex);
      previousOverviewIndex = index;

      // Moving focus must not rebuild every preview. Plot, table, image, and
      // PDF descendants are deliberately kept mounted while the browser only
      // changes the card/camera styles. A full VDOM refresh is still useful
      // when an overview is first opened or its layout mode changes.
      if (!rebuildSurface) {
        hashChannel?.postMessage({
          type: 'focus-overview',
          index,
          mode,
          direction: galleryRotationDirection
        });
        return;
      }

      const revision = ++overviewRenderRevision;
      overviewRenderUpdate = overviewRenderUpdate
        .catch(() => undefined)
        .then(async () => {
          // Fast repeated mode changes collapse into the newest request rather
          // than allocating several complete preview trees concurrently.
          if (revision !== overviewRenderRevision) return;
          overviewComponent._vdom = createOverviewSurface(
            deck,
            getSlideTheme,
            theme,
            mode,
            index,
            createCachedOverviewPreview,
            liveAspect,
            galleryRotationDirection,
            false
          );
          overviewComponent.updateDepth = -1;
          await overviewComponent.promiseUpdate();
          if (revision !== overviewRenderRevision) return;
          const liveState = this.getStateProvider().data;
          hashChannel?.postMessage({
            type: 'focus-overview',
            index: liveState.overviewIndex,
            mode: overviewModes[liveState.overviewMode] ?? 'grid',
            direction: 0
          });
        })
        .catch(() => undefined);
      return overviewRenderUpdate;
    }

    getOverviewColumnCount() {
      // A conservative row width for worker-side keyboard navigation. It is
      // intentionally independent of DOM measurement, which is unavailable
      // in Neo's worker runtime.
      return this.getStateProvider().data.overviewMode === 0
        ? 4
        : this.getStateProvider().data.overviewMode === 2
          ? 1
          : Math.max(1, Math.ceil(deck.children.length / 3));
    }

    advanceReveal() {
      const state = this.getStateProvider().data;
      const revealCount = getRevealCount(deck.children[state.activeIndex]);
      const currentReveal = Math.max(
        0,
        Math.min(revealCount, Math.floor(Number(state.revealIndex) || 0))
      );
      state.revealIndex = currentReveal;
      if (currentReveal >= revealCount) return false;

      state.revealIndex = currentReveal + 1;
      state.revealDirection = 'forward';
      slideRevealIndexes.set(state.activeIndex, state.revealIndex);
      this.refreshActiveSlide(true);
      publishPresenterState();
      return true;
    }

    reverseReveal() {
      const state = this.getStateProvider().data;
      const revealCount = getRevealCount(deck.children[state.activeIndex]);
      const currentReveal = Math.max(
        0,
        Math.min(revealCount, Math.floor(Number(state.revealIndex) || 0))
      );
      state.revealIndex = currentReveal;
      if (currentReveal === 0) return false;

      state.revealIndex = currentReveal - 1;
      state.revealDirection = 'backward';
      slideRevealIndexes.set(state.activeIndex, state.revealIndex);
      this.refreshActiveSlide(true);
      publishPresenterState();
      return true;
    }

    goToPreviousSlideAtFinalReveal() {
      const state = this.getStateProvider().data;
      const previousIndex = Math.max(0, state.activeIndex - 1);
      if (previousIndex === state.activeIndex) return;

      state.activeIndex = previousIndex;
      state.revealIndex = getRevealCount(deck.children[previousIndex]);
      slideRevealIndexes.set(previousIndex, state.revealIndex);
      this.refreshActiveSlide();
      this.syncSlideHash();
      publishPresenterState();
    }

    resetReveal(index) {
      this.getStateProvider().data.revealIndex = 0;
      slideRevealIndexes.set(index, 0);
    }

    refreshActiveSlide(animate = false, exportSnapshot = false) {
      const state = this.getStateProvider().data;
      const slide = deck.children[state.activeIndex];
      const slideComponent = slideComponents.get(state.activeIndex);
      if (slide && slideComponent) {
        slideComponent._vdom = createAudienceSlideVdom(
          slide,
          getSlideTheme(slide),
          controlsHiddenByDefault,
          slidePdfModes.get(state.activeIndex),
          state.revealIndex,
          animate,
          footer,
          logo,
          getProgress(state.activeIndex),
          logoOffset,
          getPageNumber(state.activeIndex),
          liveAspect,
          exportSnapshot,
          state.revealDirection
        );
        slideComponent.updateVdom();
      }
    }

    togglePdfMode() {
      const state = this.getStateProvider().data;
      const slide = deck.children[state.activeIndex];
      const pdf = findFirstPdf(slide);
      if (!pdf) return;

      const currentMode = slidePdfModes.get(state.activeIndex) ?? pdf.mode ?? 'canvas';
      const nextMode = currentMode === 'canvas' ? 'viewer' : 'canvas';
      slidePdfModes.set(state.activeIndex, nextMode);

      // The card layout owns the actual slide instances. `vdom` is a
      // pseudo-config in Neo: assigning to it asks Neo to re-render the
      // existing tree, but does not replace that tree. Store the replacement
      // first, then request the update.
      const slideComponent = slideComponents.get(state.activeIndex);
      if (slideComponent) {
        slideComponent._vdom = createAudienceSlideVdom(
          slide,
          getSlideTheme(slide),
          controlsHiddenByDefault,
          nextMode,
          state.revealIndex,
          true,
          footer,
          logo,
          getProgress(state.activeIndex),
          logoOffset,
          getPageNumber(state.activeIndex),
          liveAspect
        );
        slideComponent.updateVdom();
      }
      publishPresenterState();
    }
  }

  return Neo.setupClass(Viewport);
}

function getHashSlideIndex(hash, slideCount) {
  const requested = Number(new URLSearchParams(String(hash ?? '').replace(/^#/, '')).get('slide'));
  if (!Number.isInteger(requested)) return 0;
  return Math.max(0, Math.min(requested - 1, Math.max(0, slideCount - 1)));
}

function createMathAwareNotesMarkup(value) {
  const source = String(value ?? '');
  let cursor = 0;
  let markup = '';
  let styleSpan;
  while ((styleSpan = findNotesInlineStyleSpan(source, cursor))) {
    markup += createMathOnlyNotesMarkup(source.slice(cursor, styleSpan.start));
    markup += `<span style="${escapeNotesHtml(createNotesInlineStyle(styleSpan.specification))}">${createMathAwareNotesMarkup(styleSpan.text)}</span>`;
    cursor = styleSpan.end;
  }
  return markup + createMathOnlyNotesMarkup(source.slice(cursor));
}

function createMathOnlyNotesMarkup(source) {
  const pattern = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let cursor = 0;
  let markup = '';
  let match;
  while ((match = pattern.exec(source)) !== null) {
    markup += escapeNotesHtml(source.slice(cursor, match.index));
    const display = Boolean(match[1]);
    const math = String(match[1] || match[2]).trim();
    markup += `<span data-katex-source="${escapeNotesHtml(math)}" data-katex-display="${display ? 'display' : 'inline'}"></span>`;
    cursor = match.index + match[0].length;
  }
  return markup + escapeNotesHtml(source.slice(cursor));
}

function findNotesInlineStyleSpan(source, fromIndex) {
  const start = source.indexOf('{{', fromIndex);
  if (start < 0) return null;
  const separator = source.indexOf('|', start + 2);
  if (separator < start + 3) return findNotesInlineStyleSpan(source, start + 2);
  const specification = source.slice(start + 2, separator).trim();
  if (!/^(?:font|color|size|offset|style):/i.test(specification))
    return findNotesInlineStyleSpan(source, start + 2);

  let depth = 0;
  for (let index = separator + 1; index < source.length - 1; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      if (depth > 0) depth -= 1;
      else if (source[index + 1] === '}')
        return { start, end: index + 2, specification, text: source.slice(separator + 1, index) };
    }
  }
  return null;
}

function createNotesInlineStyle(specification) {
  const source = specification.startsWith('style:') ? specification.slice(6) : specification;
  const options = Object.fromEntries(
    source.split(';').flatMap((declaration) => {
      const separator = declaration.search(/[:=]/);
      if (separator < 1) return [];
      const key = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      return key && value ? [[key, value]] : [];
    })
  );
  const styles = [];
  const add = (property, value, pattern) => {
    if (value && pattern.test(value)) styles.push(`${property}:${value}`);
  };
  const colorPattern = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.%\s,]+\)|[a-z]+)$/i;
  const lengthPattern = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt|em|rem|%|vw|vh)?$/i;
  add('color', options.color, colorPattern);
  add('background-color', options.background || options['background-color'], colorPattern);
  add('font-size', options.size, lengthPattern);
  add('font-family', options.font, /^[\w\s,'"-]+$/);
  add('font-weight', options.weight, /^(?:[1-9]00|normal|bold|lighter|bolder)$/i);
  add('opacity', options.opacity, /^(?:0(?:\.\d+)?|1(?:\.0+)?|\d{1,2}%|100%)$/);
  add('letter-spacing', options['letter-spacing'], lengthPattern);
  add('border-color', options['border-color'], colorPattern);
  add('border-width', options['border-size'], lengthPattern);
  add('border-style', options['border-style'], /^(?:solid|dashed|dotted|double)$/i);
  if (options.italic === 'true' || options.italic === 'yes') styles.push('font-style:italic');
  if (options.underline === 'true' || options.underline === 'yes')
    styles.push('text-decoration:underline');
  return styles.join(';');
}

function escapeNotesHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createTocPanelMarkup(entries, theme) {
  const links = entries
    .map(
      ({ index, indented, section, title }, entryIndex) =>
        `<li style="align-items:start;display:grid;grid-template-columns:2.2rem minmax(0,1fr);margin:.18rem 0;padding-left:${indented ? '1.15rem' : '0'}"><span aria-hidden="true" style="color:var(--np-muted,${escapeNotesHtml(theme.muted)});font-variant-numeric:tabular-nums;padding:.55rem .15rem;text-align:right">${entryIndex + 1}.</span><a href="#slide=${index + 1}" target="_self" style="color:var(--np-foreground,${escapeNotesHtml(theme.foreground)});display:block;font-weight:${section ? '750' : '500'};min-width:0;padding:.55rem .6rem;text-decoration:none;border-radius:.55rem">${createMathAwareNotesMarkup(title)}</a></li>`
    )
    .join('');
  return `<nav aria-label="Table of contents"><div style="color:var(--np-muted,${escapeNotesHtml(theme.muted)});font-size:.78rem;font-weight:800;letter-spacing:.12em;margin:0 0 .75rem .7rem;text-transform:uppercase">Contents</div><ol style="list-style:none;margin:0;padding:0">${links}</ol></nav>`;
}

function isExportHash(hash) {
  return new URLSearchParams(String(hash ?? '').replace(/^#/, '')).get('export') === '1';
}

function getExportRevealIndex(hash) {
  const raw = new URLSearchParams(String(hash ?? '').replace(/^#/, '')).get('reveal');
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function getSlideTitle(slide) {
  const heading = slide.children.find((node) => node.type === 'heading');
  return heading?.text ?? slide.getAttribute?.('section') ?? 'Untitled slide';
}

function createOverviewSurface(
  deck,
  getSlideTheme,
  theme,
  mode,
  overviewIndex,
  createPreview,
  aspectOverride = '',
  galleryRotationDirection = 0,
  previewAnimations = true
) {
  const modeStyles = {
    grid: {
      gap: '1rem',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'
    },
    gallery: {
      display: 'block',
      overflow: 'hidden',
      padding: 0,
      perspective: '600px',
      transformStyle: 'preserve-3d'
    },
    helix: {
      display: 'block',
      overflow: 'hidden',
      padding: 0,
      perspective: '800px',
      transformStyle: 'preserve-3d'
    }
  }[mode];
  return {
    tag: 'div',
    style: {
      background: mode === 'gallery' || mode === 'helix' ? '#000000' : theme.background,
      boxSizing: 'border-box',
      display: 'grid',
      inset: 0,
      overflowY: 'auto',
      padding: '5.5rem 2rem 5rem',
      position: 'fixed',
      scrollBehavior: 'smooth',
      scrollSnapType: 'y proximity',
      width: '100vw',
      zIndex: 20,
      ...modeStyles
    },
    data: { neopresentOverview: mode },
    cn: [
      {
        tag: 'div',
        data: {
          neopresentGalleryCamera: mode === 'gallery' ? String(overviewIndex) : undefined,
          neopresentGalleryRotation: mode === 'gallery' ? String(galleryRotationDirection) : '0',
          neopresentHelixGroup: mode === 'helix' ? String(overviewIndex) : undefined
        },
        style: {
          backfaceVisibility: mode === 'gallery' ? 'hidden' : undefined,
          display: mode === 'gallery' || mode === 'helix' ? 'block' : 'contents',
          inset: mode === 'gallery' || mode === 'helix' ? 0 : undefined,
          position: mode === 'gallery' || mode === 'helix' ? 'absolute' : undefined,
          transformOrigin: 'center center',
          transformStyle: mode === 'gallery' || mode === 'helix' ? 'preserve-3d' : undefined,
          willChange: mode === 'helix' ? 'transform' : undefined
        },
        cn: deck.children.map((slide, index) => {
          const slideTheme = getSlideTheme(slide);
          const selected = index === overviewIndex;
          const gallery = getGalleryLayout(index, overviewIndex, deck.children.length);
          const helix = getHelixLayout(index, overviewIndex, galleryRotationDirection);
          const [aspectWidth, aspectHeight] = String(
            aspectOverride || slide.getAttribute?.('aspect') || '16:9'
          )
            .split(':')
            .map(Number);
          return {
            tag: 'a',
            href: `#slide=${index + 1}`,
            data: {
              neopresentGallerySelected: mode === 'gallery' ? String(selected) : undefined,
              neopresentOverviewCard: String(index),
              neopresentOverviewSelected: String(selected)
            },
            style: {
              '--neopresent-helix-from-opacity': helix.previous.opacity,
              '--neopresent-helix-from-transform': helix.previous.transform,
              '--neopresent-helix-to-opacity': selected ? 1 : helix.opacity,
              '--neopresent-helix-to-transform': helix.transform,
              animation:
                mode === 'helix' && galleryRotationDirection !== 0
                  ? 'neopresent-helix-card-move 1000ms ease-in-out both'
                  : undefined,
              aspectRatio:
                aspectWidth > 0 && aspectHeight > 0 ? `${aspectWidth} / ${aspectHeight}` : '16 / 9',
              background: slide.getAttribute?.('background') ?? slideTheme.surface,
              border: `1px solid ${slideTheme.border}`,
              boxSizing: 'border-box',
              boxShadow: selected
                ? mode === 'gallery'
                  ? '0 34px 80px rgba(0,0,0,.62)'
                  : mode === 'helix'
                    ? '0 0 35px #61dfe5'
                    : '0 0 0 4px rgba(251,191,36,.28), 0 16px 34px rgba(0,0,0,.35)'
                : '0 8px 20px rgba(0,0,0,.18)',
              color: slideTheme.foreground,
              containerType: 'size',
              display: 'block',
              filter: 'none',
              left: mode === 'gallery' || mode === 'helix' ? 0 : undefined,
              opacity:
                mode === 'gallery' && selected
                  ? 0.95
                  : mode === 'helix'
                    ? selected
                      ? 1
                      : helix.opacity
                    : 1,
              overflow: mode === 'gallery' ? 'visible' : 'hidden',
              position: mode === 'gallery' || mode === 'helix' ? 'absolute' : undefined,
              scrollSnapAlign: 'center',
              textDecoration: 'none',
              top: mode === 'gallery' || mode === 'helix' ? 0 : undefined,
              transform:
                mode === 'gallery'
                  ? `translate3d(calc(50vw + ${(gallery.column - gallery.selectedColumn) * 350}px), calc(50vh + ${(gallery.row - gallery.selectedRow) * 290}px), 0) translate(-50%, -50%)`
                  : mode === 'helix'
                    ? helix.transform
                    : undefined,
              transition:
                mode === 'gallery'
                  ? 'transform 1000ms ease-in-out, opacity 1000ms ease-in-out, box-shadow 1000ms ease-in-out'
                  : mode === 'helix'
                    ? 'transform 1s ease-in-out, opacity 1s ease-in-out, box-shadow 1s ease-in-out'
                    : undefined,
              transformStyle: mode === 'gallery' ? 'preserve-3d' : undefined,
              width: mode === 'gallery' || mode === 'helix' ? '340px' : undefined,
              zIndex: (mode === 'gallery' || mode === 'helix') && selected ? 5 : 1
            },
            cn: createGalleryCard(
              createPreview(slide, index, previewAnimations),
              index,
              slideTheme,
              mode === 'gallery' && selected
            )
          };
        })
      }
    ]
  };
}

function createGalleryCard(
  preview,
  index,
  theme,
  selectedGalleryCard = false
) {
  makeOverviewPreviewContainerRelative(preview);
  const previewPadding = String(preview.style?.padding ?? '').replace(/vw\b/g, '%');
  preview.style = {
    ...preview.style,
    height: '100%',
    left: 0,
    overflow: 'hidden',
    padding: previewPadding,
    pointerEvents: 'auto',
    position: 'absolute',
    top: 0,
    transform: 'none',
    translate: 'none',
    width: '100%'
  };
  return [
    {
      tag: 'div',
      data: { neopresentGalleryCardInner: 'true' },
      style: {
        boxSizing: 'border-box',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        transform: selectedGalleryCard ? 'translateZ(180px) scale(1.5)' : 'translateZ(0) scale(1)',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
        transition: 'transform 1000ms cubic-bezier(.2,.6,.6,.9)',
        width: '100%'
      },
      cn: [
        preview,
        {
          tag: 'span',
          text: String(index + 1),
          style: {
            background: theme.accent,
            borderRadius: '999px',
            color: theme.kind === 'fyma' || theme.kind === 'ciment' ? '#ffffff' : theme.background,
            fontSize: '.72rem',
            fontWeight: 800,
            padding: '.28rem .48rem',
            position: 'absolute',
            right: '.6rem',
            top: '.6rem'
          }
        }
      ]
    }
  ];
}

function createFilmstripSurface(
  deck,
  getSlideTheme,
  createPreview,
  aspectOverride = '',
  includePreviews = true
) {
  return {
    tag: 'div',
    data: { neopresentFilmstrip: 'true' },
    style: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      gap: '1rem',
      height: '100%',
      overflowX: 'auto',
      overflowY: 'hidden',
      overscrollBehavior: 'contain',
      padding: '.35rem 1.1rem 1rem',
      scrollBehavior: 'auto',
      scrollSnapType: 'none',
      touchAction: 'pan-x',
      width: '100%'
    },
    cn: includePreviews
      ? deck.children.map((slide, index) => {
      const slideTheme = getSlideTheme(slide);
      const [aspectWidth, aspectHeight] = String(
        aspectOverride || slide.getAttribute?.('aspect') || '16:9'
      )
        .split(':')
        .map(Number);
      const preview = createPreview(slide, index, false);
      makeOverviewPreviewContainerRelative(preview);
      preview.style = {
        ...preview.style,
        height: '100%',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        width: '100%'
      };
      return {
        tag: 'a',
        href: `#slide=${index + 1}`,
        target: '_self',
        data: { neopresentFilmstripCard: String(index) },
        style: {
          aspectRatio:
            aspectWidth > 0 && aspectHeight > 0 ? `${aspectWidth} / ${aspectHeight}` : '16 / 9',
          background: slide.getAttribute?.('background') ?? slideTheme.surface,
          border: `1px solid ${slideTheme.border}`,
          borderRadius: '.55rem',
          boxShadow: '0 10px 26px rgba(0,0,0,.3)',
          containerType: 'size',
          display: 'block',
          flex: '0 0 auto',
          height: 'auto',
          overflow: 'hidden',
          position: 'relative',
          scrollSnapAlign: 'center',
          textDecoration: 'none',
          width: 'clamp(280px, 32vw, 520px)'
        },
        cn: [
          preview,
          {
            tag: 'span',
            text: String(index + 1),
            style: {
              backdropFilter: 'blur(5px)',
              background: `color-mix(in srgb, ${slideTheme.surface} 72%, transparent)`,
              border: `1px solid color-mix(in srgb, ${slideTheme.border} 82%, ${slideTheme.foreground})`,
              borderRadius: '999px',
              bottom: '.4rem',
              boxShadow: `0 2px 7px color-mix(in srgb, ${slideTheme.background} 34%, transparent)`,
              color: slideTheme.foreground,
              fontSize: '.68rem',
              fontWeight: 750,
              lineHeight: 1,
              padding: '.18rem .34rem',
              position: 'absolute',
              right: '.4rem'
            }
          }
        ]
      };
        })
      : []
  };
}

function makeOverviewPreviewContainerRelative(node) {
  if (!node || typeof node !== 'object') return;
  Object.entries(node.style || {}).forEach(([property, value]) => {
    if (typeof value !== 'string') return;
    node.style[property] = value
      .replace(/(-?\d*\.?\d+)rem\b/g, (_, amount) => `${Number(amount) * 1.1}cqw`)
      // Overview cards are uniformly scaled versions of a 1600px-wide slide.
      // Keep pixel-based offsets, dimensions, borders, and chart sizes in the
      // same proportions instead of applying their full viewer-side pixels to
      // a small thumbnail.
      .replace(/(-?\d*\.?\d+)px\b/g, (_, amount) => `${Number(amount) / 16}cqw`)
      .replace(/(-?\d*\.?\d+)vw\b/g, '$1cqw')
      .replace(/(-?\d*\.?\d+)vh\b/g, '$1cqh');
  });
  const children = Array.isArray(node.cn) ? node.cn : node.cn == null ? [] : [node.cn];
  children.forEach(makeOverviewPreviewContainerRelative);
}

function disableOverviewPreviewAnimations(node) {
  if (!node || typeof node !== 'object') return;
  if (node.style) {
    node.style.animationDelay = '-100000s';
    node.style.animationFillMode = 'both';
    node.style.animationPlayState = 'paused';
    node.style.transition = 'none';
  }
  if (typeof node.html === 'string') {
    node.html = node.html
      .replace(/transition:[^;"']*;?/gi, 'transition:none;');
  }
  const children = Array.isArray(node.cn) ? node.cn : node.cn == null ? [] : [node.cn];
  children.forEach(disableOverviewPreviewAnimations);
}

function getRevealCount(slide) {
  if (slide?.getAttribute?.('reveal') !== 'true') return 0;
  const stagedRevealOnly = slide?.getAttribute?.('stagedRevealOnly') === true;
  const hasNestedRevealTrigger = (node) => {
    if (node.getAttribute?.('blockTransitionTrigger') === 'reveal') return true;
    return (
      node.type === 'columns' &&
      node.columns.some((column) => column.children.some(hasNestedRevealTrigger))
    );
  };
  const blockTransitionsReveal =
    slide?.getAttribute?.('blockTransitionTrigger') === 'reveal' ||
    slide.children.some(hasNestedRevealTrigger);
  const countNode = (node) => {
    // A transition attached to a ::columns block reveals the entire layout as
    // one unit. Check it before descending into its parallel child columns.
    if (node.getAttribute?.('blockEnter') && blockTransitionsReveal)
      return Math.max(1, countEmbeddedNode(node));
    // ::group deliberately suppresses the reveal behavior of its children.
    // Without an entrance transition, its heading and list are static content
    // and must not consume hidden navigation steps.
    if (node.type === 'columns' && node.getAttribute?.('layout') === 'group') return 0;
    if (node.type === 'chart') return getChartRevealCount(node);
    if (node.type === 'paragraph' && node.getAttribute?.('feynman'))
      return getFeynmanRevealCount(node.text);
    if (node.type === 'columns')
      return Math.max(
        0,
        ...node.columns.map((column) =>
          column.children.reduce((sum, child) => sum + countNode(child), 0)
        )
      );
    if (node.type === 'list') return stagedRevealOnly ? 0 : node.items.length;
    return !stagedRevealOnly && node.getAttribute?.('fragment') ? 1 : 0;
  };
  const countEmbeddedNode = (node) => {
    if (node.type === 'chart') return getChartRevealCount(node);
    if (node.type === 'paragraph' && node.getAttribute?.('feynman'))
      return getFeynmanRevealCount(node.text);
    if (node.type === 'columns')
      return Math.max(
        0,
        ...node.columns.map((column) =>
          column.children.reduce((sum, child) => sum + countEmbeddedNode(child), 0)
        )
      );
    return 0;
  };
  let count = 0;
  let hasRevealStep = false;
  for (const node of slide.children) {
    const units = countNode(node);
    if (node.getAttribute?.('blockEnter') && blockTransitionsReveal) {
      // The first replaceable block is the slide's initial state. Its first
      // internal stage is therefore visible at reveal index zero and does not
      // consume an extra blank navigation press.
      count += Math.max(0, units - (hasRevealStep ? 0 : 1));
      hasRevealStep = true;
    } else {
      count += units;
      hasRevealStep ||= units > 0 || Boolean(node.getAttribute?.('blockExit'));
    }
  }
  return count;
}

function getChartRevealCount(chart) {
  const style = chart?.getAttribute?.('plotStyle') ?? {};
  if (String(style['animation-trigger'] ?? '').toLowerCase() !== 'reveal') return 0;
  const values = [style['reveal-stages'], style['reveal-stage-default']];
  for (const item of chart.getAttribute?.('series') ?? []) {
    values.push(item?.revealStage);
    for (const layer of item?.uncertaintyLayers ?? []) values.push(layer?.revealStage);
  }
  for (const item of chart.getAttribute?.('uncertaintyLayers') ?? []) values.push(item?.revealStage);
  for (const item of chart.getAttribute?.('shapes') ?? []) values.push(item?.['reveal-stage']);
  for (const item of chart.getAttribute?.('annotations') ?? []) values.push(item?.revealStage);
  for (const item of chart.getAttribute?.('fitDefinitions') ?? [])
    values.push(item?.fields?.['fit-reveal-stage']);
  for (const item of chart.getAttribute?.('diagramReveals') ?? []) values.push(item?.stage);
  for (const item of chart.getAttribute?.('diagramHighlights') ?? []) values.push(item?.stage);
  for (const key of ['fit-reveal-stage', 'stats-reveal-stage']) values.push(style[key]);
  return Math.max(0, ...values.map((value) => Math.floor(Number(value) || 0)));
}

function getFeynmanRevealCount(source) {
  const text = String(source ?? '');
  if (!/^\s*animation-trigger\s*:\s*reveal\s*$/im.test(text)) return 0;
  return Math.max(
    0,
    ...[...text.matchAll(/(?:^|\|)\s*reveal-stage(?:s|-default)?\s*:\s*(\d+)/gim)].map(
      (match) => Number(match[1]) || 0
    )
  );
}

function serializeSlide(
  slide,
  revealIndex = Number.POSITIVE_INFINITY,
  theme = null,
  progress = null,
  footer = null,
  logo = null,
  pageNumber = null,
  aspectOverride = ''
) {
  if (!slide) return null;
  return {
    background: slide.getAttribute?.('background') ?? '',
    backgroundOverlay: slide.getAttribute?.('backgroundOverlay') ?? '',
    backgroundPosition: slide.getAttribute?.('backgroundPosition') ?? 'center',
    backgroundSize: slide.getAttribute?.('backgroundSize') ?? 'cover',
    aspect: aspectOverride || slide.getAttribute?.('aspect') || '',
    font: slide.getAttribute?.('font') ?? '',
    bodyFont: slide.getAttribute?.('bodyFont') ?? '',
    bodyAlign: slide.getAttribute?.('bodyAlign') ?? slide.getAttribute?.('align') ?? 'center',
    blockTransitionTrigger: slide.getAttribute?.('blockTransitionTrigger') ?? 'auto',
    headingFont: slide.getAttribute?.('headingFont') ?? '',
    headingPosition: slide.getAttribute?.('headingPosition') ?? 'flow',
    headingAlign: slide.getAttribute?.('headingAlign') ?? slide.getAttribute?.('align') ?? 'center',
    headingOffset: slide.getAttribute?.('headingOffset') ?? '0,0',
    headingPanelWidth: slide.getAttribute?.('headingPanelWidth') ?? '',
    headingPanelMaxWidth: slide.getAttribute?.('headingPanelMaxWidth') ?? '',
    headingPanelPadding: slide.getAttribute?.('headingPanelPadding') ?? '',
    deckShadowDefaults: slide.getAttribute?.('deckShadowDefaults') ?? {},
    deckGlassDefaults: slide.getAttribute?.('deckGlassDefaults') ?? {},
    listFont: slide.getAttribute?.('listFont') ?? '',
    quoteFont: slide.getAttribute?.('quoteFont') ?? '',
    align: slide.getAttribute?.('align') ?? 'center',
    children: slide.children.map(serializeNode),
    footnotes: slide.getAttribute?.('footnotes') ?? [],
    footer,
    hideFooter: slide.getAttribute?.('hideFooter') === true,
    logo,
    pageNumber,
    reveal: slide.getAttribute?.('reveal') === 'true',
    revealIndex,
    progress,
    section: slide.getAttribute?.('section') ?? '',
    theme,
    valign: slide.getAttribute?.('valign') ?? 'center'
  };
}

function serializeNode(node) {
  const base = {
    type: node.type,
    blockStyle: node.getAttribute?.('blockStyle') ?? null
  };

  if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'quote') {
    return {
      ...base,
      callout: node.getAttribute?.('callout'),
      buttonHref: node.getAttribute?.('buttonHref'),
      cards: node.getAttribute?.('cards'),
      divider: node.getAttribute?.('divider'),
      embedSrc: node.getAttribute?.('embedSrc'),
      embedTitle: node.getAttribute?.('embedTitle'),
      fragment: node.getAttribute?.('fragment'),
      level: node.level,
      math: node.getAttribute?.('math'),
      mermaid: node.getAttribute?.('mermaid'),
      feynman: node.getAttribute?.('feynman'),
      poll: node.getAttribute?.('poll'),
      pollId: node.id,
      text: node.text,
      titleMeta: node.getAttribute?.('titleMeta'),
      references: node.getAttribute?.('references'),
      stat: node.getAttribute?.('stat'),
      timeline: node.getAttribute?.('timeline')
    };
  }
  if (node.type === 'code')
    return {
      ...base,
      code: node.code,
      language: node.language,
      lineNumbers: node.getAttribute?.('lineNumbers') ?? false,
      lineNumberStart: node.getAttribute?.('lineNumberStart') ?? 1
    };
  if (node.type === 'image') return { ...base, alt: node.alt, src: node.src };
  if (node.type === 'audio' || node.type === 'video') return { ...base, src: node.src };
  if (node.type === 'pdf') return { ...base, page: node.page, src: node.src };
  if (node.type === 'list')
    return {
      ...base,
      items: node.items,
      ordered: node.ordered,
      listSymbol: node.getAttribute?.('listSymbol') ?? '',
      listSymbols: node.getAttribute?.('listSymbols') ?? []
    };
  if (node.type === 'table')
    return {
      ...base,
      alignments: node.getAttribute?.('alignments') ?? [],
      animation: node.getAttribute?.('animation') ?? '',
      animationDelay: node.getAttribute?.('animationDelay') ?? '',
      animationDuration: node.getAttribute?.('animationDuration') ?? '',
      animationEasing: node.getAttribute?.('animationEasing') ?? '',
      animationStagger: node.getAttribute?.('animationStagger') ?? '',
      highlightCell: node.getAttribute?.('highlightCell') ?? '',
      highlightColor: node.getAttribute?.('highlightColor') ?? '',
      highlightColumn: node.getAttribute?.('highlightColumn') ?? '',
      highlightDelay: node.getAttribute?.('highlightDelay') ?? '',
      highlightDuration: node.getAttribute?.('highlightDuration') ?? '',
      highlightEffect: node.getAttribute?.('highlightEffect') ?? '',
      highlightRow: node.getAttribute?.('highlightRow') ?? '',
      headers: node.headers,
      rows: node.rows
    };
  if (node.type === 'chart')
    return {
      ...base,
      annotations: node.getAttribute?.('annotations') ?? [],
      asymmetricErrors: node.getAttribute?.('asymmetricErrors') ?? null,
      asymmetricXErrors: node.getAttribute?.('asymmetricXErrors') ?? null,
      xErrorValues: node.getAttribute?.('xErrorValues') ?? [],
      asymmetricErrorFields: node.getAttribute?.('asymmetricErrorFields') ?? null,
      uncertaintyLayers: node.getAttribute?.('uncertaintyLayers') ?? [],
      heatmapYValues: node.getAttribute?.('heatmapYValues') ?? [],
      vectorU: node.getAttribute?.('vectorU') ?? [],
      vectorV: node.getAttribute?.('vectorV') ?? [],
      covarianceCorrelation: node.getAttribute?.('covarianceCorrelation') ?? [],
      diagramHighlights: node.getAttribute?.('diagramHighlights') ?? [],
      diagramReveals: node.getAttribute?.('diagramReveals') ?? [],
      functionOverlays: node.getAttribute?.('functionOverlays') ?? [],
      bins: node.bins,
      errorValues: node.errorValues,
      id: node.id,
      kind: node.kind,
      labels: node.labels,
      legendItems: node.getAttribute?.('legendItems') ?? [],
      referenceLines: node.getAttribute?.('referenceLines') ?? [],
      plotStyle: node.getAttribute?.('plotStyle'),
      series: node.getAttribute?.('series') ?? [],
      shapes: node.getAttribute?.('shapes') ?? [],
      title: node.title,
      trendline: node.trendline,
      values: node.values,
      xLabel: node.xLabel,
      xValues: node.xValues,
      yLabel: node.yLabel
    };
  if (node.type === 'columns')
    return {
      ...base,
      blockTransitionTrigger: node.getAttribute?.('blockTransitionTrigger') ?? '',
      columnWidths: node.getAttribute?.('columnWidths') ?? [],
      columns: node.columns.map((column) => column.children.map(serializeNode)),
      columnsPerRow: node.getAttribute?.('columnsPerRow') ?? 2,
      layout: node.getAttribute?.('layout') ?? 'columns',
      reveal: node.getAttribute?.('reveal') === 'true'
    };
  return base;
}
