import { highlightCode } from './syntaxHighlight.mjs';
import { getPlotRenderer, registerPlotRenderer } from './plotRendererRegistry.mjs';
import { paletteGradientStops, resolvePalette, samplePalette } from './rootPalettes.mjs';

/** Converts a NeoPresent slide into the VDOM consumed by a Neo component. */
export function createSlideVdom(...args) {
  const vdom = createSlideVdomRaw(...args);
  applyBlockTransitions(vdom, args[0], args[4], args[5] !== false);
  applyTextAnimations(vdom, args[0], args[5] !== false);
  return makeSlideSizingResponsive(vdom, args[0]);
}

function applyBlockTransitions(vdom, slide, revealIndex, animate) {
  if (!Array.isArray(vdom?.cn) || !Array.isArray(slide?.children)) return;
  const activeRevealIndex = revealIndex ?? Number.POSITIVE_INFINITY;
  const trigger = String(slide.getAttribute?.('blockTransitionTrigger') ?? 'auto').toLowerCase();
  const stagedRevealOnly = slide.getAttribute?.('stagedRevealOnly') === true;
  let revealStep = 0;
  let hasRevealStep = false;
  const enterSteps = new Map();
  slide.children.forEach((child, index) => {
    if (child.getAttribute?.('blockEnter') && trigger === 'reveal') {
      const start = hasRevealStep ? revealStep + 1 : 0;
      enterSteps.set(index, start);
      revealStep = start + Math.max(1, getEmbeddedRevealCount(child)) - 1;
      hasRevealStep = true;
    } else if (!stagedRevealOnly && child.type === 'list') {
      revealStep += child.items.length;
      hasRevealStep ||= child.items.length > 0;
    } else if (!stagedRevealOnly && child.getAttribute?.('fragment')) {
      revealStep += 1;
      hasRevealStep = true;
    } else if (child.getAttribute?.('blockExit') && trigger === 'reveal') {
      // A block with an exit but no enter is the sequence's initial visible
      // state. The following @block-enter must therefore start on press 1,
      // not replace this block immediately at reveal index zero.
      hasRevealStep = true;
    }
  });
  const nextEnterStep = (index) => {
    for (let next = index + 1; next < slide.children.length; next += 1)
      if (enterSteps.has(next)) return enterSteps.get(next);
    return Number.POSITIVE_INFINITY;
  };
  slide.children.forEach((child, index) => {
    const target = vdom.cn[index];
    if (!target || typeof target !== 'object') return;
    const requestedScale = String(child.getAttribute?.('blockStyle')?.scale ?? '').trim();
    const scalePercent = parseBlockScalePercent(requestedScale);
    const baseZoom = target.data?.pdfViewerScaleManaged
      ? '100%'
      : scalePercent !== null
        ? `${scalePercent}%`
        : '100%';
    const enter = String(child.getAttribute?.('blockEnter') ?? '').toLowerCase();
    const exit = String(child.getAttribute?.('blockExit') ?? '').toLowerCase();
    const duration = normalizeAnimationTime(
      child.getAttribute?.('blockTransitionDuration'),
      '650ms'
    );
    const delay = normalizeAnimationTime(child.getAttribute?.('blockTransitionDelay'), '0ms');
    const animations = [];
    if (enter) {
      const step = enterSteps.get(index);
      const visible = trigger === 'auto' || activeRevealIndex >= step;
      target.style = {
        ...target.style,
        '--neopresent-block-base-zoom': baseZoom,
        maxHeight: enter === 'grow' || enter === 'zoom' ? (visible ? '100vh' : '0px') : undefined,
        opacity: visible ? 1 : 0,
        overflow: target.style?.overflow,
        pointerEvents: visible ? target.style?.pointerEvents : 'none',
        visibility: visible ? 'visible' : 'hidden',
        zoom: visible ? baseZoom : '0%'
      };
      if (
        visible &&
        ((trigger === 'auto' && animate) || (trigger === 'reveal' && activeRevealIndex === step))
      )
        animations.push(
          `${child.type === 'pdf' && enter === 'grow' ? 'neopresent-pdf-enter-grow' : `neopresent-block-enter-${enter}`} ${duration} cubic-bezier(.2,.8,.2,1) ${delay} both`
        );
    }
    if (exit) {
      const step = nextEnterStep(index);
      const exited = trigger === 'auto' || activeRevealIndex >= step;
      if (exited) {
        const animateExit =
          (trigger === 'auto' && animate) || (trigger === 'reveal' && activeRevealIndex === step);
        const requestedScale = String(child.getAttribute?.('blockShrinkScale') ?? '35%');
        const scale = /^(?:\d+(?:\.\d+)?|\.\d+)%$/.test(requestedScale)
          ? `${Math.max(0, Math.min(100, Number.parseFloat(requestedScale)))}%`
          : '35%';
        target.style = {
          ...target.style,
          '--neopresent-block-base-zoom': baseZoom,
          '--neopresent-block-target-zoom': exit === 'replace' ? '0%' : scale,
          maxHeight: exit === 'replace' ? (animateExit ? '100vh' : '0px') : target.style?.maxHeight,
          opacity: exit === 'replace' ? (animateExit ? 1 : 0) : 1,
          overflow:
            exit === 'replace' ? (animateExit ? 'visible' : 'hidden') : target.style?.overflow,
          pointerEvents: exit === 'replace' ? 'none' : target.style?.pointerEvents,
          position: exit === 'replace' ? 'absolute' : target.style?.position,
          zoom: exit === 'replace' ? baseZoom : scale
        };
        if (animateExit)
          animations.push(
            `neopresent-block-${exit} ${duration} cubic-bezier(.2,.8,.2,1) ${delay} both`
          );
      }
    }
    if (animations.length > 0) {
      target.style.animation = target.style?.animation
        ? `${target.style.animation}, ${animations.join(', ')}`
        : animations.join(', ');
      if (child.type === 'pdf') target.style.animationPlayState = 'paused';
    }
  });
}

function getEmbeddedRevealCount(node) {
  if (!node) return 0;
  if (node.type === 'chart') return getChartStageCount(node);
  if (node.type === 'paragraph' && node.getAttribute?.('feynman')) {
    const source = String(node.text ?? '');
    if (!/^\s*animation-trigger\s*:\s*reveal\s*$/im.test(source)) return 0;
    return Math.max(
      0,
      ...[...source.matchAll(/(?:^|\|)\s*reveal-stage(?:s|-default)?\s*:\s*(\d+)/gim)].map(
        (match) => Number(match[1]) || 0
      )
    );
  }
  if (node.type === 'columns')
    return Math.max(
      0,
      ...node.columns.map((column) =>
        column.children.reduce((sum, child) => sum + getEmbeddedRevealCount(child), 0)
      )
    );
  return 0;
}

function getChartStageCount(chart) {
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

function getBlockLocalRevealIndex(slide, nodeIndex, revealIndex) {
  const active = revealIndex ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(active)) return active;
  if (String(slide.getAttribute?.('blockTransitionTrigger') ?? 'auto').toLowerCase() !== 'reveal')
    return active;
  const stagedRevealOnly = slide.getAttribute?.('stagedRevealOnly') === true;
  let cursor = 0;
  let hasRevealStep = false;
  for (let index = 0; index <= nodeIndex; index += 1) {
    const child = slide.children[index];
    if (child?.getAttribute?.('blockEnter')) {
      const start = hasRevealStep ? cursor + 1 : 0;
      const span = Math.max(1, getEmbeddedRevealCount(child));
      if (index === nodeIndex) return Math.max(0, active - start + 1);
      cursor = start + span - 1;
      hasRevealStep = true;
    } else if (!stagedRevealOnly && child?.type === 'list') {
      cursor += child.items.length;
      hasRevealStep ||= child.items.length > 0;
    } else if (!stagedRevealOnly && child?.getAttribute?.('fragment')) {
      cursor += 1;
      hasRevealStep = true;
    } else if (child?.getAttribute?.('blockExit')) {
      hasRevealStep = true;
    }
  }
  return active;
}

function applyTextAnimations(vdom, slide, animate) {
  if (!animate || !Array.isArray(vdom?.cn) || !Array.isArray(slide?.children)) return;
  slide.children.forEach((child, index) => {
    if (!['heading', 'paragraph', 'quote', 'list'].includes(child.type)) return;
    if (String(child.getAttribute?.('textAnimation') ?? '').toLowerCase() !== 'typing') return;
    const target = vdom.cn[index];
    if (!target || typeof target !== 'object') return;
    const text = child.type === 'list' ? child.items.join(' ') : String(child.text ?? '');
    const characters = Math.max(1, Math.min(240, [...text].length));
    const duration = normalizeAnimationTime(
      child.getAttribute?.('textAnimationDuration'),
      `${Math.max(700, Math.min(8000, characters * 55))}ms`
    );
    const delay = normalizeAnimationTime(child.getAttribute?.('textAnimationDelay'), '0ms');
    const cursorColor = safeColor(child.getAttribute?.('textAnimationCursorColor'), 'currentColor');
    const typing = `neopresent-text-typing ${duration} steps(${characters}, end) ${delay} both`;
    const caret = `neopresent-text-caret 700ms step-end ${delay} infinite`;
    target.data = { ...target.data, neopresentTextAnimation: 'typing' };
    target.style = {
      ...target.style,
      '--neopresent-typing-cursor-color': cursorColor,
      animation: target.style?.animation
        ? `${target.style.animation}, ${typing}, ${caret}`
        : `${typing}, ${caret}`,
      borderRight: `3px solid ${cursorColor}`,
      clipPath: 'inset(0 0 0 0)',
      willChange: 'clip-path'
    };
  });
}

function createSlideVdomRaw(
  slide,
  theme,
  fullBleed,
  pdfModeOverride,
  revealIndex = Number.POSITIVE_INFINITY,
  animate = true,
  footer = {},
  logo = '',
  progress = null,
  logoOffset = '0,0',
  pageNumber = null,
  aspectOverride = '',
  exportSnapshot = false
) {
  const background = resolveBackground(
    slide.getAttribute?.('background'),
    theme.background,
    slide.getAttribute?.('backgroundOverlay'),
    slide.getAttribute?.('backgroundPosition'),
    slide.getAttribute?.('backgroundSize')
  );
  const transition = slide.getAttribute?.('transition') ?? 'none';
  const transitionDurationMs = slide.getAttribute?.('transitionDurationMs');
  const alignment = getSlideAlignment(slide);
  const stagedRevealOnly = slide.getAttribute?.('stagedRevealOnly') === true;
  const revealState = {
    revealPosition: 0,
    remaining:
      slide.getAttribute?.('reveal') === 'true' && !stagedRevealOnly
        ? revealIndex
        : Number.POSITIVE_INFINITY
  };
  const section = slide.getAttribute?.('section');
  const titleSlide = slide.getAttribute?.('titleSlide') === true;
  const requestedAspect = aspectOverride || slide.getAttribute?.('aspect') || '16:9';
  const aspectStyle = getAspectStyle(requestedAspect, 100);
  const [aspectWidth, aspectHeight] = String(requestedAspect).split(':').map(Number);
  const designWidth = 1600;
  const designHeight =
    aspectWidth > 0 && aspectHeight > 0 ? designWidth * (aspectHeight / aspectWidth) : 900;
  const letterboxColor = getLetterboxColor(background, theme.background, theme.surface);
  if (aspectStyle.width) aspectStyle.boxShadow = `0 0 0 100vmax ${letterboxColor}`;
  const slideFont = String(slide.getAttribute?.('font') ?? '').trim();
  const defaultFont = 'Inter, system-ui, sans-serif';
  const bodyFont =
    String(slide.getAttribute?.('bodyFont') ?? '').trim() || slideFont || defaultFont;
  const headingFont =
    String(slide.getAttribute?.('headingFont') ?? '').trim() || slideFont || bodyFont;
  const listFont = String(slide.getAttribute?.('listFont') ?? '').trim() || bodyFont;
  const quoteFont = String(slide.getAttribute?.('quoteFont') ?? '').trim() || bodyFont;
  const headingPosition = String(slide.getAttribute?.('headingPosition') ?? 'flow').toLowerCase();
  const headingAlign = String(slide.getAttribute?.('headingAlign') ?? alignment.text).toLowerCase();
  const bodyAlign = String(slide.getAttribute?.('bodyAlign') ?? alignment.text).toLowerCase();
  const headingOffset = parseInlineOffset(slide.getAttribute?.('headingOffset')) ?? {
    x: '0',
    y: '0'
  };
  const primaryHeading = slide.getAttribute?.('nestedContent')
    ? undefined
    : slide.children.find((node) => node.type === 'heading');
  const footerNode = slide.getAttribute?.('hideFooter') ? null : createFooter(footer, theme);
  const footnotesNode = createFootnotes(
    slide.getAttribute?.('footnotes'),
    theme,
    Boolean(footerNode)
  );

  if (section) {
    return {
      data: {
        neopresentAspect: requestedAspect,
        neopresentDesignHeight: String(designHeight),
        neopresentDesignWidth: String(designWidth),
        neopresentLetterboxColor: letterboxColor,
        neopresentSlide: 'true'
      },
      style: {
        alignItems: 'center',
        background,
        boxSizing: 'border-box',
        color: theme.foreground,
        fontFamily: bodyFont,
        display: 'flex',
        flexDirection: 'column',
        height: aspectStyle.height ?? '100vh',
        justifyContent: 'center',
        padding: fullBleed ? '2%' : '8%',
        textAlign: 'center',
        animation: animate ? getTransitionAnimation(transition, transitionDurationMs) : undefined,
        position: 'relative',
        width: aspectStyle.width ?? '100vw',
        ...aspectStyle
      },
      cn: [
        {
          tag: 'div',
          style: {
            borderTop: `4px solid ${theme.accent}`,
            maxWidth: '900px',
            paddingTop: '1.5rem',
            width: '100%'
          },
          cn: [
            {
              tag: 'p',
              text: 'SECTION',
              style: {
                color: theme.accent,
                fontSize: '1.2rem',
                fontWeight: 700,
                letterSpacing: '.18em',
                margin: '0 0 .75rem'
              }
            },
            {
              tag: 'h1',
              cn: createInlineContent(resolveDatePlaceholders(section), theme),
              style: {
                background: theme.kind === 'fyma' ? '#ffffff' : undefined,
                borderBottom: theme.headingRule ? `2px solid ${theme.headingRule}` : undefined,
                borderTop: theme.kind === 'fyma' ? `1px solid ${theme.border}` : undefined,
                color: theme.headingColor ?? theme.foreground,
                fontFamily: headingFont,
                fontSize: '4.5rem',
                lineHeight: 1.1,
                margin: 0,
                padding: theme.kind === 'fyma' ? '1.4rem 3rem' : undefined
              }
            }
          ]
        },
        ...(footnotesNode ? [footnotesNode] : []),
        ...(footerNode ? [footerNode] : []),
        ...(progress ? [createProgress(progress, theme)] : []),
        ...(pageNumber ? [createPageNumber(pageNumber, theme)] : []),
        ...(logo ? [createLogo(logo, logoOffset)] : [])
      ]
    };
  }

  return {
    data: {
      neopresentAspect: requestedAspect,
      neopresentDesignHeight: String(designHeight),
      neopresentDesignWidth: String(designWidth),
      neopresentLetterboxColor: letterboxColor,
      neopresentSlide: 'true'
    },
    style: {
      alignItems: alignment.items,
      background,
      boxSizing: 'border-box',
      color: theme.foreground,
      fontFamily: bodyFont,
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      height: aspectStyle.height ?? '100vh',
      justifyContent: alignment.content,
      padding: fullBleed ? '2%' : '8%',
      textAlign: bodyAlign,
      animation: animate ? getTransitionAnimation(transition, transitionDurationMs) : undefined,
      position: 'relative',
      width: aspectStyle.width ?? '100vw',
      ...aspectStyle
    },
    cn: [
      ...slide.children.map((node, nodeIndex) => {
        const nodeRevealIndex = getBlockLocalRevealIndex(slide, nodeIndex, revealIndex);
        const blockEffects = createBlockStyle(node.getAttribute?.('blockStyle'));
        if (node.type === 'paragraph' && node.getAttribute?.('feynman')) {
          const feynmanExportStages = !/^\s*export-stages\s*:\s*(?:false|no|off|0)\s*$/im.test(
            String(node.text ?? '')
          );
          return {
            tag: 'div',
            html: createFeynmanDiagram(
              node.text,
              theme,
              exportSnapshot && !feynmanExportStages
                ? Number.POSITIVE_INFINITY
                : nodeRevealIndex,
              animate
            ),
            style: {
              lineHeight: 0,
              maxHeight: fullBleed ? '76vh' : '58vh',
              maxWidth: '100%',
              width: '100%',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('mermaid')) {
          return {
            tag: 'div',
            data: { mermaidSource: node.text },
            style: {
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'center',
              maxHeight: fullBleed ? '78vh' : '60vh',
              maxWidth: '100%',
              minHeight: '12rem',
              overflow: 'auto',
              width: '100%',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('math')) {
          return {
            tag: 'div',
            data: { katexSource: node.text },
            style: {
              color: theme.foreground,
              fontSize: '2.35rem',
              maxWidth: '100%',
              overflowX: 'auto',
              padding: '.5rem',
              textAlign: 'center',
              width: '100%',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('embedSrc')) {
          return {
            tag: 'iframe',
            allow: 'fullscreen',
            data: { neopresentEmbed: 'true' },
            referrerPolicy: 'strict-origin-when-cross-origin',
            sandbox: 'allow-forms allow-modals allow-popups allow-scripts allow-same-origin',
            src: node.getAttribute('embedSrc'),
            title: node.getAttribute('embedTitle') ?? 'Embedded content',
            style: {
              background: '#ffffff',
              border: `1px solid ${theme.border}`,
              borderRadius: '.7rem',
              boxSizing: 'border-box',
              height: fullBleed ? '76vh' : '58vh',
              maxWidth: '100%',
              width: '1100px',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('poll')) {
          return {
            tag: 'section',
            data: {
              neopresentPollId: node.id,
              neopresentPollSource: node.text
            },
            style: { maxWidth: '900px', width: '100%', ...blockEffects }
          };
        }

        if (
          (node.type === 'paragraph' || node.type === 'heading') &&
          node.getAttribute?.('fragment')
        ) {
          const headingFragment = node.type === 'heading';
          const visible = revealState.remaining > 0;
          const isNewlyRevealed = visible && revealState.revealPosition === revealIndex - 1;
          const animation = node.getAttribute?.('fragmentAnimation') ?? 'fade';
          const hiddenTransform =
            {
              zoom: 'scale(.88)',
              'slide-left': 'translateX(2rem)',
              'slide-right': 'translateX(-2rem)',
              'slide-up': 'translateY(1.5rem)',
              'slide-down': 'translateY(-1.5rem)'
            }[animation] ?? 'none';
          revealState.remaining = Math.max(0, revealState.remaining - 1);
          revealState.revealPosition += 1;
          return {
            tag: headingFragment ? `h${node.level}` : 'p',
            cn: createInlineContent(node.text, theme),
            style: {
              ...(headingFragment
                ? {
                    color: theme.headingColor ?? theme.foreground,
                    fontFamily: headingFont,
                    fontSize: node.level === 1 ? '4rem' : '2.75rem'
                  }
                : { fontSize: '2rem' }),
              lineHeight: 1.4,
              margin: 0,
              maxWidth: headingFragment ? '100%' : '850px',
              opacity: visible ? 1 : 0,
              // A reveal redraw mounts this fragment at its final state, so a
              // CSS transition has no previous rendered state to interpolate
              // from. A keyframe animation runs on mount and therefore gives
              // each fragment a visible build motion.
              animation: isNewlyRevealed ? getFragmentAnimation(animation) : undefined,
              transform: visible ? 'none' : hiddenTransform,
              transition: 'opacity 280ms ease-out, transform 280ms cubic-bezier(.2,.8,.2,1)',
              visibility: visible ? 'visible' : 'hidden',
              ...(headingFragment
                ? {
                    alignSelf: {
                      left: 'flex-start',
                      center: 'center',
                      right: 'flex-end'
                    }[headingAlign],
                    textAlign: headingAlign,
                    width: '100%'
                  }
                : {}),
              ...blockEffects
            }
          };
        }

        if (node.type === 'columns') {
          const gridColumns = Number(node.getAttribute?.('columnsPerRow') ?? 2);
          const isGrid = node.getAttribute?.('layout') === 'grid';
          const isGroup = node.getAttribute?.('layout') === 'group';
          const isPlaced = node.getAttribute?.('layout') === 'place';
          const columnTracks = normalizeColumnTracks(
            node.getAttribute?.('columnWidths'),
            node.columns.length
          );
          const hasCustomColumnWidths = columnTracks !== null;
          const position = node.getAttribute?.('position') ?? {};
          if (isGroup)
            return {
              tag: 'div',
              style: {
                alignItems: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                maxWidth: '100%',
                textAlign: String(
                  node.getAttribute?.('bodyAlign') ?? slide.getAttribute?.('bodyAlign') ?? bodyAlign
                ).toLowerCase(),
                width: '100%',
                ...blockEffects
              },
              cn: createSlideVdom(
                {
                  children: node.columns[0]?.children ?? [],
                  getAttribute: (name) => {
                    if (name === 'nestedContent') return true;
                    if (name === 'reveal') return 'false';
                    if (name === 'blockTransitionTrigger') return 'auto';
                    if (
                      [
                        'align',
                        'bodyAlign',
                        'bodyFont',
                        'font',
                        'headingAlign',
                        'headingFont',
                        'listFont',
                        'quoteFont'
                      ].includes(name)
                    )
                      return node.getAttribute?.(name) ?? slide.getAttribute?.(name);
                    return undefined;
                  }
                },
                theme,
                fullBleed,
                pdfModeOverride,
                nodeRevealIndex,
                animate
              ).cn
            };
          if (isPlaced)
            return {
              tag: 'div',
              style: {
                boxSizing: 'border-box',
                left: safePlacement(position.x, '0'),
                top: safePlacement(position.y, '0'),
                height: safePlacement(position.height, undefined),
                position: 'absolute',
                width: safePlacement(position.width, 'auto'),
                zIndex: safePlacement(position.z, undefined),
                ...blockEffects
              },
              cn: createSlideVdom(
                {
                  children: node.columns[0]?.children ?? [],
                  getAttribute: (name) => {
                    if (name === 'nestedContent') return true;
                    return ['reveal', 'blockTransitionTrigger'].includes(name)
                      ? (node.getAttribute?.(name) ?? slide.getAttribute?.(name))
                      : undefined;
                  }
                },
                theme,
                fullBleed,
                pdfModeOverride,
                nodeRevealIndex,
                animate
              ).cn
            };
          return {
            tag: 'div',
            style: {
              alignItems: 'stretch',
              display: isGrid || hasCustomColumnWidths ? 'grid' : 'flex',
              gap: '2rem',
              justifyContent: hasCustomColumnWidths ? 'center' : undefined,
              gridTemplateColumns: hasCustomColumnWidths
                ? columnTracks.join(' ')
                : isGrid
                  ? `repeat(${gridColumns}, minmax(0, 1fr))`
                  : undefined,
              maxWidth: '1200px',
              width: '100%',
              ...blockEffects
            },
            cn: node.columns.map((column) => ({
              tag: 'div',
              style: {
                alignItems: 'center',
                display: 'flex',
                flex: isGrid || hasCustomColumnWidths ? undefined : '1 1 0',
                flexDirection: 'column',
                gap: '1.25rem',
                justifyContent: 'center',
                minWidth: 0,
                position: 'relative',
                textAlign: String(
                  column.getAttribute?.('bodyAlign') ??
                    slide.getAttribute?.('bodyAlign') ??
                    bodyAlign
                ).toLowerCase()
              },
              cn: createSlideVdom(
                {
                  children: column.children,
                  getAttribute: (name) => {
                    if (name === 'nestedContent') return true;
                    if (['reveal', 'blockTransitionTrigger'].includes(name))
                      return node.getAttribute?.(name) ?? slide.getAttribute?.(name);
                    if (
                      [
                        'align',
                        'bodyAlign',
                        'bodyFont',
                        'font',
                        'headingAlign',
                        'headingFont',
                        'listFont',
                        'quoteFont'
                      ].includes(name)
                    )
                      return column.getAttribute?.(name) ?? slide.getAttribute?.(name);
                    return undefined;
                  }
                },
                theme,
                fullBleed,
                pdfModeOverride,
                nodeRevealIndex,
                animate
              ).cn
            }))
          };
        }

        if (node.type === 'heading') {
          const positioned = node === primaryHeading && headingPosition !== 'flow';
          return {
            tag: `h${node.level}`,
            cn: createInlineContent(node.text, theme),
            style: {
              fontFamily: headingFont,
              fontSize: node.level === 1 ? '4rem' : '2.75rem',
              color: theme.headingColor ?? theme.foreground,
              ...(node === primaryHeading && theme.headingRule && !titleSlide
                ? {
                    borderBottom: `${theme.kind === 'ciment' ? '3px' : '1px'} solid ${theme.headingRule}`,
                    paddingBottom: '.12em'
                  }
                : {}),
              margin: 0,
              alignSelf: {
                left: 'flex-start',
                center: 'center',
                right: 'flex-end'
              }[headingAlign],
              textAlign: headingAlign,
              width: positioned ? (fullBleed ? '96%' : '84%') : '100%',
              ...(!positioned && (headingOffset.x !== '0' || headingOffset.y !== '0')
                ? {
                    position: 'relative',
                    left: headingOffset.x,
                    top: headingOffset.y
                  }
                : {}),
              ...(positioned
                ? {
                    left: '50%',
                    position: 'absolute',
                    top:
                      headingPosition === 'top'
                        ? fullBleed
                          ? '2vw'
                          : '3vw'
                        : headingPosition === 'center'
                          ? '50%'
                          : undefined,
                    bottom: headingPosition === 'bottom' ? (fullBleed ? '2vw' : '3vw') : undefined,
                    transform:
                      headingPosition === 'center'
                        ? `translate(calc(-50% + ${headingOffset.x}), calc(-50% + ${headingOffset.y}))`
                        : `translate(calc(-50% + ${headingOffset.x}), ${headingOffset.y})`,
                    zIndex: 2
                  }
                : {}),
              ...blockEffects
            }
          };
        }

        if (node.type === 'list') {
          const tocGenerated = slide.getAttribute?.('tocGenerated') === true;
          const tocColumns = tocGenerated
            ? Math.max(1, Math.min(5, Number(slide.getAttribute?.('tocColumns') ?? 1)))
            : 1;
          const visibleItems = revealState.remaining;
          const listSymbol = node.listSymbol ?? node.getAttribute?.('listSymbol') ?? '';
          const listSymbols = node.listSymbols ?? node.getAttribute?.('listSymbols') ?? [];
          const customMarkers = Boolean(listSymbol) || listSymbols.length > 0;
          revealState.remaining = Math.max(0, revealState.remaining - node.items.length);
          revealState.revealPosition += node.items.length;
          return {
            tag: node.ordered ? 'ol' : 'ul',
            style: {
              fontSize: tocColumns >= 4 ? '1.25rem' : tocColumns === 3 ? '1.45rem' : '1.7rem',
              fontFamily: listFont,
              lineHeight: tocColumns > 1 ? 1.42 : 1.6,
              margin: 0,
              maxWidth: '100%',
              paddingLeft: tocGenerated ? 0 : '1.5em',
              columnCount: tocColumns > 1 ? tocColumns : undefined,
              columnFill: tocColumns > 1 ? 'balance' : undefined,
              columnGap: tocColumns > 1 ? '4rem' : undefined,
              columnRule:
                tocColumns > 1 ? `1px solid ${withAlpha(theme.border, '55%')}` : undefined,
              width: tocColumns > 1 ? '100%' : undefined,
              ...blockEffects
            },
            cn: node.items.map((item, index) => {
              const task = item.match(/^\[([ xX])]\s+(.+)$/);
              const inlineContent = task
                ? createInlineContent(task[2], theme)
                : createInlineContent(item, theme);
              const synchronizedMarkerSize =
                inlineContent.length === 1 &&
                inlineContent[0]?.tag === 'span' &&
                inlineContent[0]?.style?.fontSize
                  ? inlineContent[0].style.fontSize
                  : undefined;
              if (slide.getAttribute?.('tocGenerated') === true) {
                inlineContent.forEach((content) => {
                  if (content?.tag === 'a') {
                    content.style = {
                      ...content.style,
                      textDecoration: 'none'
                    };
                  }
                });
              }
              const marker =
                listSymbols[index] || listSymbol || (node.ordered ? `${index + 1}.` : '•');
              const textColumn = {
                tag: 'span',
                cn: inlineContent,
                style: {
                  flex: '1 1 auto',
                  minWidth: 0,
                  textAlign: 'inherit'
                }
              };
              return {
                tag: 'li',
                cn: tocGenerated
                  ? [
                      {
                        tag: 'span',
                        text: `${index + 1}.`,
                        style: {
                          flex: '0 0 2.15em',
                          fontStyle: 'normal',
                          paddingRight: '.55em',
                          textAlign: 'right'
                        }
                      },
                      textColumn
                    ]
                  : task
                    ? [
                        {
                          tag: 'span',
                          text: task[1].toLowerCase() === 'x' ? '☑' : '☐',
                          style: {
                            color: task[1].toLowerCase() === 'x' ? theme.accent : theme.muted,
                            flex: '0 0 1.65em',
                            fontStyle: 'normal'
                          }
                        },
                        textColumn
                      ]
                    : customMarkers
                      ? [
                          {
                            tag: 'span',
                            text: `${marker ?? ''}`,
                            style: {
                              flex: '0 0 1.65em',
                              fontStyle: 'normal',
                              paddingRight: '.25em',
                              textAlign: 'right'
                            }
                          },
                          textColumn
                        ]
                      : inlineContent,
                style: {
                  breakInside: tocColumns > 1 ? 'avoid' : undefined,
                  display: tocGenerated || task || customMarkers ? 'flex' : undefined,
                  alignItems: tocGenerated || task || customMarkers ? 'baseline' : undefined,
                  fontSize: synchronizedMarkerSize,
                  marginBottom: tocColumns > 1 ? '.22em' : undefined,
                  listStyle: tocGenerated || task || customMarkers ? 'none' : undefined,
                  opacity: index < visibleItems ? 1 : 0,
                  transition: 'opacity 220ms ease-out',
                  visibility: index < visibleItems ? 'visible' : 'hidden'
                }
              };
            })
          };
        }

        if (node.type === 'code') {
          const lineNumbers = node.getAttribute?.('lineNumbers');
          const lineNumberStart = Math.max(0, Number(node.getAttribute?.('lineNumberStart') ?? 1));
          const runnable = node.getAttribute?.('runnable');
          return {
            tag: runnable ? 'section' : 'pre',
            ...(runnable
              ? {
                  data: {
                    neopresentRunnableCode: node.code,
                    neopresentRunnableLanguage:
                      node.getAttribute?.('runnableLanguage') ?? 'javascript',
                    neopresentRunnablePackages: (node.getAttribute?.('pythonPackages') ?? []).join(
                      ','
                    )
                  }
                }
              : {}),
            style: {
              background: theme.panel,
              borderRadius: '0.5rem',
              boxSizing: 'border-box',
              color: theme.foreground,
              fontSize: '1.2rem',
              display: lineNumbers || runnable ? 'flex' : undefined,
              flexDirection: runnable ? 'column' : undefined,
              margin: 0,
              maxWidth: '100%',
              overflowX: 'auto',
              padding: '1.25rem',
              whiteSpace: runnable ? 'pre-wrap' : undefined,
              width: '100%',
              ...blockEffects
            },
            cn: [
              ...(lineNumbers
                ? [
                    {
                      tag: 'span',
                      text: node.code
                        .split('\n')
                        .map((_, index) => String(index + lineNumberStart))
                        .join('\n'),
                      style: {
                        color: theme.codeComment,
                        paddingRight: '1rem',
                        textAlign: 'right',
                        userSelect: 'none'
                      }
                    }
                  ]
                : []),
              {
                tag: 'code',
                cn: highlightCode(node.code, node.language, theme)
              }
            ]
          };
        }

        if (node.type === 'image') {
          const imageWidth = normalizeImageSize(node.getAttribute?.('width'));
          const imageHeight = normalizeImageSize(node.getAttribute?.('height'));
          const imageMaxWidth = normalizeImageSize(node.getAttribute?.('maxWidth')) ?? '100%';
          const imageMaxHeight =
            normalizeImageSize(node.getAttribute?.('maxHeight')) ??
            (fullBleed ? 'calc(100vh - 8vw)' : '59vh');
          const imageFit = ['contain', 'cover', 'fill', 'none', 'scale-down'].includes(
            String(node.getAttribute?.('fit') ?? '').toLowerCase()
          )
            ? String(node.getAttribute?.('fit')).toLowerCase()
            : 'contain';
          const imageAlign = String(node.getAttribute?.('align') ?? 'center').toLowerCase();
          const imageCaptionAttribute = node.getAttribute?.('caption');
          const imageCaption =
            imageCaptionAttribute === undefined ? node.alt : String(imageCaptionAttribute);
          return {
            tag: 'figure',
            style: {
              alignSelf:
                imageAlign === 'left'
                  ? 'flex-start'
                  : imageAlign === 'right'
                    ? 'flex-end'
                    : 'center',
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '.65rem',
              margin: 0,
              maxHeight: imageMaxHeight,
              maxWidth: imageMaxWidth,
              width: imageWidth,
              ...blockEffects
            },
            cn: [
              {
                tag: 'img',
                alt: node.alt,
                src: node.src,
                style: {
                  display: 'block',
                  height: imageHeight,
                  maxHeight: imageMaxHeight,
                  maxWidth: '100%',
                  objectFit: imageFit,
                  width: imageWidth ? '100%' : undefined
                }
              },
              ...(imageCaption
                ? [
                    {
                      tag: 'figcaption',
                      text: resolveDatePlaceholders(imageCaption),
                      style: {
                        color: theme.muted,
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }
                    }
                  ]
                : [])
            ]
          };
        }

        if (node.type === 'quote') {
          const { attribution, quote } = splitQuoteAttribution(node.text);
          return {
            tag: 'blockquote',
            cn: [
              ...createInlineContent(quote, theme),
              ...(attribution
                ? [
                    {
                      tag: 'footer',
                      text: resolveDatePlaceholders(attribution),
                      style: {
                        color: theme.accent,
                        fontSize: '1.15rem',
                        fontStyle: 'normal',
                        marginTop: '.75rem'
                      }
                    }
                  ]
                : [])
            ],
            style: {
              fontFamily: quoteFont,
              borderLeft: `6px solid ${theme.accent}`,
              color: theme.foreground,
              fontSize: '2rem',
              fontStyle: 'italic',
              lineHeight: 1.45,
              margin: 0,
              maxWidth: '90%',
              paddingLeft: '1.25rem',
              whiteSpace: 'pre-wrap',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('callout')) {
          const kind = node.getAttribute('callout');
          const palette = {
            note: { color: '#60a5fa', label: 'Note' },
            tip: { color: '#34d399', label: 'Tip' },
            warning: { color: '#fbbf24', label: 'Warning' }
          }[kind] ?? { color: theme.accent, label: 'Note' };
          return {
            tag: 'aside',
            style: {
              background: theme.panel,
              border: `1px solid ${palette.color}`,
              borderLeft: `7px solid ${palette.color}`,
              borderRadius: '.5rem',
              boxSizing: 'border-box',
              maxWidth: '900px',
              padding: '1rem 1.25rem',
              width: '100%',
              ...blockEffects
            },
            cn: [
              {
                tag: 'strong',
                text: palette.label,
                style: {
                  color: palette.color,
                  display: 'block',
                  marginBottom: '.35rem',
                  textTransform: 'uppercase'
                }
              },
              {
                tag: 'p',
                cn: createInlineContent(node.text, theme),
                style: { fontSize: '1.5rem', margin: 0 }
              }
            ]
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('stickybox')) {
          return createStickybox(node.text, theme, node.getAttribute?.('blockStyle'));
        }

        if (node.type === 'paragraph' && node.getAttribute?.('timeline')) {
          const timeline = createTimeline(node.text, theme);
          timeline.style = { ...timeline.style, ...blockEffects };
          return timeline;
        }

        if (node.type === 'paragraph' && node.getAttribute?.('cards')) {
          const cards = createCards(node.text, theme, node.getAttribute?.('blockStyle'));
          const cardLayoutEffects = { ...blockEffects };
          delete cardLayoutEffects.background;
          delete cardLayoutEffects.borderColor;
          if (
            ['on', 'true', 'yes', 'glass', '1'].includes(
              String(node.getAttribute?.('blockStyle')?.glass ?? '').toLowerCase()
            )
          ) {
            delete cardLayoutEffects.backdropFilter;
            delete cardLayoutEffects.webkitBackdropFilter;
            delete cardLayoutEffects.border;
            delete cardLayoutEffects.borderRadius;
            delete cardLayoutEffects.boxShadow;
          }
          cards.style = { ...cards.style, ...cardLayoutEffects };
          return cards;
        }

        if (node.type === 'paragraph' && node.getAttribute?.('buttonHref')) {
          const href = node.getAttribute('buttonHref');
          const internal = /^#slide=\d+$/i.test(href);
          return {
            tag: 'a',
            href,
            rel: 'noopener noreferrer',
            target: internal ? undefined : '_blank',
            text: resolveDatePlaceholders(node.text),
            style: {
              background: theme.accent,
              borderRadius: '.45rem',
              color: theme.background,
              fontSize: '1.35rem',
              fontWeight: 700,
              padding: '.65rem 1rem',
              textDecoration: 'none',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('references')) {
          return {
            tag: 'aside',
            style: {
              borderTop: `1px solid ${theme.border}`,
              boxSizing: 'border-box',
              color: theme.muted,
              fontSize: '1rem',
              lineHeight: 1.45,
              maxWidth: '1000px',
              paddingTop: '.65rem',
              textAlign: 'left',
              width: '100%',
              ...blockEffects
            },
            cn: [
              {
                tag: 'strong',
                text: 'REFERENCES',
                style: {
                  color: theme.accent,
                  display: 'block',
                  fontSize: '.8rem',
                  letterSpacing: '.12em',
                  marginBottom: '.35rem'
                }
              },
              ...node.text
                .split('\n')
                .filter(Boolean)
                .map((line) => ({
                  tag: 'div',
                  cn: createInlineContent(line, theme)
                }))
            ]
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('stat')) {
          const [value = '', ...label] = node.text.split('\n').filter(Boolean);
          return {
            tag: 'aside',
            style: {
              background: theme.panel,
              border: `2px solid ${theme.accent}`,
              borderRadius: '.75rem',
              boxSizing: 'border-box',
              minWidth: '260px',
              padding: '1.25rem 1.75rem',
              textAlign: 'center',
              ...blockEffects
            },
            cn: [
              {
                tag: 'div',
                text: resolveDatePlaceholders(value),
                style: {
                  color: theme.accent,
                  fontSize: '4rem',
                  fontWeight: 800,
                  lineHeight: 1
                }
              },
              {
                tag: 'div',
                cn: createInlineContent(label.join(' '), theme),
                style: {
                  color: theme.muted,
                  fontSize: '1.2rem',
                  marginTop: '.65rem'
                }
              }
            ]
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('divider')) {
          return {
            tag: 'hr',
            style: {
              border: 0,
              borderTop: `2px solid ${theme.accent}`,
              margin: '.25rem 0',
              maxWidth: '760px',
              opacity: 0.72,
              width: '70%',
              ...blockEffects
            }
          };
        }

        if (node.type === 'paragraph' && node.getAttribute?.('titleMeta')) {
          const titleMeta = node.getAttribute('titleMeta');
          return {
            tag: 'p',
            cn: createInlineContent(node.text, theme),
            style:
              titleMeta === 'author'
                ? {
                    color: theme.accent,
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    margin: 0,
                    ...blockEffects
                  }
                : {
                    color: theme.muted,
                    fontSize: '2rem',
                    lineHeight: 1.4,
                    margin: 0,
                    maxWidth: '850px',
                    ...blockEffects
                  }
          };
        }

        if (node.type === 'video' || node.type === 'audio') {
          const media = {
            tag: node.type,
            src: node.src,
            style:
              node.type === 'video'
                ? {
                    background: '#000000',
                    maxHeight: fullBleed ? 'calc(100vh - 4vw)' : '65vh',
                    maxWidth: '100%',
                    width: '100%',
                    ...blockEffects
                  }
                : {
                    maxWidth: '100%',
                    width: 'min(720px, 100%)',
                    ...blockEffects
                  }
          };

          if (node.autoplay) media.autoplay = true;
          if (node.controls) media.controls = true;
          if (node.loop) media.loop = true;
          if (node.muted) media.muted = true;
          if (node.poster) media.poster = node.poster;
          return media;
        }

        if (node.type === 'pdf') {
          const pdfWidth = safeDimension(node.getAttribute?.('width'), fullBleed ? '100%' : '90%');
          const pdfHeight = safeDimension(
            node.getAttribute?.('height'),
            // Use the slide container, not the browser window. The presenter
            // preview already resolves to its own slide dimensions; matching
            // that here keeps native PDF viewer mode fitted identically.
            fullBleed ? 'calc(100cqh - 4cqw)' : '70cqh'
          );
          const pdfCaption = String(node.getAttribute?.('caption') ?? '').trim();
          const pdfCaptionPosition =
            String(node.getAttribute?.('captionPosition') ?? '').toLowerCase() === 'top'
              ? 'top'
              : 'bottom';
          const pdfCaptionAlign = ['left', 'center', 'right'].includes(
            String(node.getAttribute?.('captionAlign') ?? '').toLowerCase()
          )
            ? String(node.getAttribute?.('captionAlign')).toLowerCase()
            : 'center';
          const wrapPdfCaption = (content) => {
            if (!pdfCaption) return content;
            const caption = {
              tag: 'figcaption',
              cn: createInlineContent(resolveDatePlaceholders(pdfCaption), theme),
              style: {
                color: withAlpha(
                  safeColor(node.getAttribute?.('captionColor'), theme.muted),
                  node.getAttribute?.('captionAlpha') ?? '1'
                ),
                fontFamily: safeFont(node.getAttribute?.('captionFont'), bodyFont),
                fontSize: safeDimension(node.getAttribute?.('captionSize'), '1.1rem'),
                lineHeight: 1.3,
                left:
                  normalizeSignedCssLength(node.getAttribute?.('captionOffsetX')) ?? '0px',
                margin: 0,
                position: 'relative',
                textAlign: pdfCaptionAlign,
                top:
                  normalizeSignedCssLength(node.getAttribute?.('captionOffsetY')) ?? '0px',
                width: '100%'
              }
            };
            const contentWidth = content.style?.width ?? pdfWidth;
            content.style = {
              ...content.style,
              alignSelf: 'stretch',
              marginInline: 0,
              width: '100%'
            };
            return {
              tag: 'figure',
              data: {
                pdfCaptionHost: 'true',
                ...(content.data?.pdfViewerScaleManaged
                  ? { pdfViewerScaleManaged: 'true' }
                  : {})
              },
              style: {
                alignSelf: 'center',
                alignItems: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                gap: safeDimension(node.getAttribute?.('captionGap'), '.65rem'),
                margin: 0,
                maxHeight: '100%',
                maxWidth: '100%',
                width: contentWidth,
                ...blockEffects
              },
              cn: pdfCaptionPosition === 'top' ? [caption, content] : [content, caption]
            };
          };
          if ((pdfModeOverride ?? node.mode) === 'viewer') {
            const requestedPdfScale = String(node.getAttribute?.('blockStyle')?.scale ?? '100%');
            const pdfScale = (parseBlockScalePercent(requestedPdfScale) ?? 100) / 100;
            return wrapPdfCaption({
              tag: 'div',
              data: {
                pdfViewerHost: 'true',
                pdfViewerHeightConstrained: String(Boolean(node.getAttribute?.('height'))),
                pdfViewerScaleManaged: 'true',
                pdfViewerWidthConstrained: String(Boolean(node.getAttribute?.('width')))
              },
              style: {
                alignSelf: 'center',
                background: '#ffffff',
                boxSizing: 'border-box',
                display: 'block',
                height: node.getAttribute?.('height')
                  ? pdfHeight
                  : fullBleed
                    ? `calc(${trimInlineNumber(100 * pdfScale)}cqh - ${trimInlineNumber(4 * pdfScale)}cqw)`
                    : `${trimInlineNumber(70 * pdfScale)}cqh`,
                marginInline: 'auto',
                maxHeight: '100%',
                maxWidth: '100%',
                minHeight: 0,
                minWidth: 0,
                // Chromium's native PDF scrollbars do not retain correct hit
                // geometry when the whole slide is scaled. This ordinary HTML
                // container owns scrolling instead, so its horizontal and
                // vertical bars remain usable in the audience canvas.
                overflow: 'auto',
                width: node.getAttribute?.('width')
                  ? pdfWidth
                  : `${trimInlineNumber((fullBleed ? 100 : 90) * pdfScale)}%`,
                ...(pdfCaption ? {} : blockEffects)
              },
              cn: [
                {
                  tag: 'iframe',
                  data: {
                    pdfViewerFrame: 'true',
                    pdfViewerHeightConstrained: String(Boolean(node.getAttribute?.('height'))),
                    pdfViewerPage: node.page,
                    pdfViewerSrc: node.src,
                    pdfViewerWidthConstrained: String(Boolean(node.getAttribute?.('width')))
                  },
                  scrolling: 'yes',
                  // Start without the thumbnail/navigation rail. On a narrow
                  // inspection window that rail can consume half the usable
                  // width and make a correctly resized page appear tiny.
                  src: `${node.src}#page=${node.page}&zoom=page-fit&pagemode=none&navpanes=0`,
                  title: `PDF: ${node.src}`,
                  style: {
                    background: '#ffffff',
                    border: 0,
                    boxSizing: 'border-box',
                    display: 'block',
                    flex: '0 0 auto',
                    height: '100%',
                    minHeight: '100%',
                    minWidth: '100%',
                    width: '100%'
                  }
                }
              ]
            });
          }

          return wrapPdfCaption({
            tag: 'canvas',
            data: {
              pdfHeightConstrained: String(Boolean(node.getAttribute?.('height'))),
              pdfPage: node.page,
              pdfSrc: node.src,
              pdfWidthConstrained: String(Boolean(node.getAttribute?.('width')))
            },
            style: {
              alignSelf: 'center',
              background: 'transparent',
              border: 0,
              display: 'block',
              height: pdfHeight,
              marginInline: 'auto',
              maxWidth: '100%',
              width: pdfWidth,
              ...(pdfCaption ? {} : blockEffects)
            }
          });
        }

        if (node.type === 'table') {
          const error = node.getAttribute?.('error');
          if (error) {
            return {
              tag: 'p',
              text: error,
              style: { color: '#fb7185', fontSize: '1.2rem', margin: 0 }
            };
          }
          const alignments = node.getAttribute?.('alignments') ?? [];
          const tableAnimation = String(node.getAttribute?.('animation') ?? '').toLowerCase();
          const animationEnabled =
            animate && ['fade', 'rows', 'columns', 'grow', 'cells'].includes(tableAnimation);
          const animationDuration = normalizeAnimationTime(
            node.getAttribute?.('animationDuration'),
            '700ms'
          );
          const animationDelay = animationTimeMs(node.getAttribute?.('animationDelay'));
          const animationStagger = animationTimeMs(node.getAttribute?.('animationStagger'), 100);
          const animationEasing =
            String(node.getAttribute?.('animationEasing') ?? '').trim() ||
            'cubic-bezier(.2,.8,.2,1)';
          const highlightRows = new Set(
            parseTableSelection(node.getAttribute?.('highlightRow'))
              .map(Number)
              .filter((value) => Number.isInteger(value) && value > 0)
              .map((value) => value - 1)
          );
          const resolveColumn = (value) => {
            const number = Number(value);
            if (Number.isInteger(number) && number > 0) return number - 1;
            const name = String(value).trim().toLocaleLowerCase();
            return node.headers.findIndex(
              (header) => String(header).trim().toLocaleLowerCase() === name
            );
          };
          const highlightColumns = new Set(
            parseTableSelection(node.getAttribute?.('highlightColumn'))
              .map(resolveColumn)
              .filter((value) => value >= 0)
          );
          const highlightCells = new Set(
            String(node.getAttribute?.('highlightCell') ?? '')
              .split(';')
              .map((value) => value.match(/^\s*(\d+)\s*,\s*(.+?)\s*$/))
              .filter(Boolean)
              .map((match) => `${Number(match[1]) - 1}:${resolveColumn(match[2])}`)
          );
          const highlightEffect = String(
            node.getAttribute?.('highlightEffect') ?? 'glow'
          ).toLowerCase();
          const highlightColor =
            String(node.getAttribute?.('highlightColor') ?? '').trim() || theme.accent;
          const highlightDuration = normalizeAnimationTime(
            node.getAttribute?.('highlightDuration'),
            '1600ms'
          );
          const highlightDelay = normalizeAnimationTime(
            node.getAttribute?.('highlightDelay'),
            '0ms'
          );
          const animationStyle = (name, delay = animationDelay) =>
            animationEnabled
              ? `neopresent-chart-${name} ${animationDuration} ${animationEasing} ${delay}ms both`
              : undefined;
          const cellStyle = (index, ordinal, rowIndex) => {
            const style = {
              border: `1px solid ${theme.border}`,
              padding: '0.7rem 1rem',
              textAlign: alignments[index] ?? 'left'
            };
            if (tableAnimation === 'columns')
              style.animation = animationStyle('fade', animationDelay + index * animationStagger);
            if (tableAnimation === 'cells')
              style.animation = animationStyle('grow', animationDelay + ordinal * animationStagger);
            const highlighted =
              highlightColumns.has(index) ||
              (rowIndex >= 0 &&
                (highlightRows.has(rowIndex) || highlightCells.has(`${rowIndex}:${index}`)));
            if (highlighted && (highlightEffect === 'glow' || highlightEffect === 'flow')) {
              const emphasisAnimation =
                highlightEffect === 'flow'
                  ? `neopresent-table-light-flow ${highlightDuration} linear ${highlightDelay} infinite`
                  : `neopresent-table-glow ${highlightDuration} ease-in-out ${highlightDelay} infinite alternate`;
              style.animation = style.animation
                ? `${style.animation}, ${emphasisAnimation}`
                : emphasisAnimation;
              style.backgroundColor = `color-mix(in srgb, ${highlightColor} 18%, transparent)`;
              style.boxShadow = `inset 0 0 0 2px color-mix(in srgb, ${highlightColor} 78%, transparent), inset 0 0 18px color-mix(in srgb, ${highlightColor} 42%, transparent)`;
              if (highlightEffect === 'flow') {
                style.backgroundImage = `linear-gradient(105deg, transparent 20%, color-mix(in srgb, ${highlightColor} 18%, transparent) 38%, color-mix(in srgb, ${highlightColor} 72%, white 18%) 50%, color-mix(in srgb, ${highlightColor} 18%, transparent) 62%, transparent 80%)`;
                style.backgroundSize = '240% 100%';
              }
            }
            return style;
          };

          const table = {
            tag: 'table',
            data: { neopresentTableAnimation: tableAnimation || undefined },
            style: {
              animation:
                tableAnimation === 'fade' || tableAnimation === 'grow'
                  ? animationStyle(tableAnimation)
                  : undefined,
              borderCollapse: 'collapse',
              color: theme.foreground,
              fontSize: '1.2rem',
              maxWidth: '100%'
            },
            cn: [
              {
                tag: 'thead',
                style: {
                  animation: tableAnimation === 'rows' ? animationStyle('fade') : undefined,
                  background: 'transparent'
                },
                cn: [
                  {
                    tag: 'tr',
                    cn: node.headers.map((header, index) => ({
                      tag: 'th',
                      cn: createInlineContent(resolveDatePlaceholders(header), theme),
                      style: cellStyle(index, index, -1)
                    }))
                  }
                ]
              },
              {
                tag: 'tbody',
                cn: node.rows.map((row, rowIndex) => ({
                  tag: 'tr',
                  style: {
                    animation:
                      tableAnimation === 'rows'
                        ? animationStyle('rise', animationDelay + (rowIndex + 1) * animationStagger)
                        : undefined
                  },
                  cn: row.map((cell, index) => ({
                    tag: 'td',
                    cn: createInlineContent(resolveDatePlaceholders(cell), theme),
                    style: cellStyle(
                      index,
                      node.headers.length + rowIndex * node.headers.length + index,
                      rowIndex
                    )
                  }))
                }))
              }
            ]
          };

          // Applying a CSS filter directly to a table can cause browsers to
          // paint its shadow per table section, making it look like only the
          // header has a shadow. Keep table animation on the table, scrolling
          // on an inner wrapper, and block effects on one complete outer box.
          return {
            tag: 'div',
            style: {
              display: 'inline-block',
              maxWidth: '100%',
              ...blockEffects
            },
            cn: [
              {
                tag: 'div',
                style: { maxWidth: '100%', overflowX: 'auto' },
                cn: [table]
              }
            ]
          };
        }

        if (node.type === 'chart') {
          const error = node.getAttribute?.('error');
          if (error) {
            return {
              tag: 'p',
              text: error,
              style: { color: '#fb7185', fontSize: '1.2rem', margin: 0 }
            };
          }
          const originalPlotStyle = node.getAttribute?.('plotStyle') ?? {};
          const revealTriggered =
            String(originalPlotStyle['animation-trigger'] ?? '').toLowerCase() === 'reveal';
          const plotExportStages = !['false', 'no', 'off', '0'].includes(
            String(originalPlotStyle['export-stages'] ?? 'true').trim().toLowerCase()
          );
          const chartRevealIndex =
            exportSnapshot && !plotExportStages
              ? Number.POSITIVE_INFINITY
              : nodeRevealIndex;
          const statsStage = Math.max(
            0,
            Math.floor(Number(originalPlotStyle['stats-reveal-stage']) || 0)
          );
          const stagedPlotStyle =
            revealTriggered && chartRevealIndex < statsStage
              ? { ...originalPlotStyle, 'stats-alpha': '0' }
              : revealTriggered && statsStage > 0 && chartRevealIndex !== statsStage
                ? { ...originalPlotStyle, 'stats-animation': 'none' }
                : originalPlotStyle;
          const chart = createChartView(
            node.with({
              attributes: {
                ...node.attributes,
                plotStyle: stagedPlotStyle,
                activeRevealIndex: chartRevealIndex,
                revealAnimate: animate
              }
            }),
            theme
          );
          chart.style = { ...chart.style, ...blockEffects };
          return chart;
        }

        return {
          tag: 'p',
          cn: createInlineContent(node.text, theme),
          style: { fontFamily: bodyFont, fontSize: '1.75rem', margin: 0, ...blockEffects }
        };
      }),
      ...(footnotesNode ? [footnotesNode] : []),
      ...(footerNode ? [footerNode] : []),
      ...(progress ? [createProgress(progress, theme)] : []),
      ...(pageNumber ? [createPageNumber(pageNumber, theme)] : []),
      ...(logo ? [createLogo(logo, logoOffset)] : [])
    ]
  };
}

function animationTimeMs(value, fallback = 0) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(ms|s)$/i);
  if (!match) return fallback;
  return Number(match[1]) * (match[2].toLowerCase() === 's' ? 1000 : 1);
}

function normalizeAnimationTime(value, fallback) {
  const text = String(value ?? '').trim();
  return /^\d+(?:\.\d+)?\s*(?:ms|s)$/i.test(text) ? text : fallback;
}

function parseTableSelection(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function plotHighlightValue(source, camelName, cssName) {
  return source?.[camelName] ?? source?.[cssName] ?? '';
}

function createPlotHighlightStyle(source, fallbackColor) {
  const effect = String(
    plotHighlightValue(source, 'highlightEffect', 'highlight-effect')
  ).toLowerCase();
  if (!['glow', 'flow'].includes(effect)) return '';
  if (parseTableSelection(plotHighlightValue(source, 'highlightIndex', 'highlight-index')).length)
    return '';
  const color =
    String(plotHighlightValue(source, 'highlightColor', 'highlight-color')).trim() || fallbackColor;
  const duration = normalizeAnimationTime(
    plotHighlightValue(source, 'highlightDuration', 'highlight-duration'),
    effect === 'flow' ? '1800ms' : '1600ms'
  );
  const delay = normalizeAnimationTime(
    plotHighlightValue(source, 'highlightDelay', 'highlight-delay'),
    '0ms'
  );
  const easing = effect === 'flow' ? 'linear' : 'ease-in-out';
  const direction = effect === 'glow' ? ' alternate' : '';
  return `--neopresent-highlight-color:${safeColor(color, fallbackColor)};animation:neopresent-plot-${effect} ${duration} ${easing} ${delay} infinite${direction};transform-box:fill-box;transform-origin:center`;
}

function decoratePlotElements(markup, source, fallbackColor) {
  const selected = new Set(
    parseTableSelection(plotHighlightValue(source, 'highlightIndex', 'highlight-index'))
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)
  );
  if (selected.size === 0) return markup;
  const highlightStyle = createPlotHighlightStyle(
    {
      highlightEffect: plotHighlightValue(source, 'highlightEffect', 'highlight-effect'),
      highlightColor: plotHighlightValue(source, 'highlightColor', 'highlight-color'),
      highlightDuration: plotHighlightValue(source, 'highlightDuration', 'highlight-duration'),
      highlightDelay: plotHighlightValue(source, 'highlightDelay', 'highlight-delay')
    },
    fallbackColor
  );
  if (!highlightStyle) return markup;
  let index = 0;
  return String(markup).replace(
    /<([a-z][\w:-]*)(\s+[^>]*data-neopresent-tooltip="[^"]*"[^>]*)>/gi,
    (match, tag, attributes) => {
      index += 1;
      if (!selected.has(index)) return match;
      const styled = /\sstyle="[^"]*"/i.test(attributes)
        ? attributes.replace(/\sstyle="([^"]*)"/i, (_style, existingStyle) => {
            const existingAnimation = existingStyle.match(/(?:^|;)\s*animation:([^;]+)/i)?.[1];
            const highlightAnimation = highlightStyle.match(/(?:^|;)animation:([^;]+)/i)?.[1];
            const mergedHighlight =
              existingAnimation && highlightAnimation
                ? highlightStyle.replace(
                    /(?:^|;)animation:[^;]+/i,
                    `;animation:${existingAnimation.trim()}, ${highlightAnimation.trim()}`
                  )
                : highlightStyle;
            return ` style="${existingStyle};${mergedHighlight}"`;
          })
        : `${attributes} style="${highlightStyle}"`;
      return `<${tag}${styled}>`;
    }
  );
}

function findChartMarkupNode(node) {
  if (!node || typeof node !== 'object') return null;
  if (typeof node.html === 'string') return node;
  if (!Array.isArray(node.cn)) return null;
  for (const child of node.cn) {
    const match = findChartMarkupNode(child);
    if (match) return match;
  }
  return null;
}

function applyChartHighlights(view, chart, theme) {
  const style = chart.getAttribute?.('plotStyle') ?? {};
  const fallbackColor = style['data-color'] || theme.accent;
  const frame = findChartMarkupNode(view);
  if (!frame) return view;
  if (parseTableSelection(style['highlight-index']).length > 0) {
    frame.html = decoratePlotElements(frame.html, style, fallbackColor);
    return view;
  }
  const highlightStyle = createPlotHighlightStyle(style, fallbackColor);
  if (!highlightStyle) return view;
  frame.html = frame.html.replace(/<svg\b([^>]*)>/i, (match, attributes) => {
    const styled = /\sstyle="[^"]*"/i.test(attributes)
      ? attributes.replace(/\sstyle="([^"]*)"/i, ` style="$1;${highlightStyle}"`)
      : `${attributes} style="${highlightStyle}"`;
    return `<svg${styled}>`;
  });
  return view;
}

function makeSlideSizingResponsive(vdom, slide) {
  if (!vdom || typeof vdom !== 'object') return vdom;
  vdom.style = {
    ...vdom.style,
    containerType: vdom.data?.neopresentSlide ? 'size' : vdom.style?.containerType
  };
  if (Array.isArray(vdom.cn) && Array.isArray(slide?.children)) {
    slide.children.forEach((child, index) => {
      const scale = parseBlockScalePercent(child.getAttribute?.('blockStyle')?.scale);
      if (scale === null || !vdom.cn[index]) return;
      if (vdom.cn[index].data?.pdfViewerScaleManaged === 'true') return;
      const percent = scale;
      vdom.cn[index].style = {
        ...vdom.cn[index].style,
        zoom: `${percent}%`,
        transformOrigin: 'center'
      };
    });
  }
  const convert = (value) =>
    typeof value === 'string'
      ? value.replace(/(-?(?:\d+\.?\d*|\.\d+))rem\b/g, (_match, number) => `${number}cqw`)
      : value;
  const visit = (node, root = false) => {
    if (!node || typeof node !== 'object') return;
    if (node.style && !root)
      node.style = Object.fromEntries(
        Object.entries(node.style).map(([key, value]) => [key, convert(value)])
      );
    if (Array.isArray(node.cn)) node.cn.forEach((child) => visit(child));
  };
  visit(vdom, true);
  return vdom;
}

/** Produces the audience-equivalent SVG markup for a plain serialized chart. */
export function createScientificChartMarkup(serializedChart, theme) {
  const chart = {
    ...serializedChart,
    id: serializedChart.id ?? 'presenter-preview-chart',
    getAttribute(name) {
      const attributes = {
        activeRevealIndex: serializedChart.activeRevealIndex,
        annotations: serializedChart.annotations,
        asymmetricErrors: serializedChart.asymmetricErrors,
        asymmetricXErrors: serializedChart.asymmetricXErrors,
        asymmetricErrorFields: serializedChart.asymmetricErrorFields,
        uncertaintyLayers: serializedChart.uncertaintyLayers,
        xErrorValues: serializedChart.xErrorValues,
        legendItems: serializedChart.legendItems,
        referenceLines: serializedChart.referenceLines,
        heatmapYValues: serializedChart.heatmapYValues,
        functionOverlays: serializedChart.functionOverlays,
        diagramHighlights: serializedChart.diagramHighlights,
        diagramReveals: serializedChart.diagramReveals,
        plotStyle: serializedChart.plotStyle,
        revealAnimate: serializedChart.revealAnimate,
        series: serializedChart.series,
        shapes: serializedChart.shapes
      };
      return attributes[name];
    }
  };
  const view = createChartView(chart, theme);
  if (typeof view?.html === 'string') return view.html;
  const svgContainer = view.cn?.find(
    (item) => item && typeof item === 'object' && typeof item.html === 'string'
  );
  return svgContainer?.html ?? '';
}

/** Produces the audience-equivalent SVG markup for a serialized Feynman fence. */
export function createFeynmanMarkup(source, theme) {
  return createFeynmanDiagram(source, theme);
}

function safePlacement(value, fallback) {
  const text = String(value ?? '').trim();
  return /^-?\d+(?:\.\d+)?(?:px|%|vw|vh|rem|em)?$/.test(text) || text === 'auto' ? text : fallback;
}

function getAspectStyle(value, maximumHeightVh = 100) {
  const match = String(value ?? '').match(/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) return {};
  const ratio = Number(match[1]) / Number(match[2]);
  if (!Number.isFinite(ratio) || ratio <= 0) return {};
  const safeHeight = Math.max(1, Math.min(100, Number(maximumHeightVh) || 100));
  return {
    height: `min(${safeHeight}vh, ${(100 / ratio).toFixed(5)}vw)`,
    margin: 'auto',
    width: `min(100vw, ${(ratio * safeHeight).toFixed(5)}vh)`
  };
}

function getLetterboxColor(background, fallback, surface) {
  const solidColor = /^(?:#[\da-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|color\(|var\(|[a-z]+$)/i;
  const base = [background, fallback, surface]
    .map((value) => String(value ?? '').trim())
    .find((value) => solidColor.test(value));
  const resolved = base || '#101522';
  const hex = resolved.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  const luminance = hex
    ? (0.299 * Number.parseInt(hex[1], 16) +
        0.587 * Number.parseInt(hex[2], 16) +
        0.114 * Number.parseInt(hex[3], 16)) /
      255
    : 1;
  return `color-mix(in srgb, ${resolved} 86%, ${luminance < 0.35 ? 'white' : 'black'})`;
}

function splitQuoteAttribution(text) {
  const lines = text.split('\n');
  const lastLine = lines.at(-1)?.trim() ?? '';
  if (!/^(?:—|--|-)\s+/.test(lastLine)) return { attribution: '', quote: text };
  return { attribution: lastLine, quote: lines.slice(0, -1).join('\n') };
}

function createFooter(footer, theme) {
  if (!footer.left && !footer.center && !footer.right) return null;
  const offset = parseInlineOffset(footer.offset) ?? { x: '0', y: '0' };
  const effectStyle = createBlockStyle({
    shadow: footer.shadow,
    'shadow-color': footer.shadowColor,
    'shadow-opacity': footer.shadowOpacity,
    'shadow-angle': footer.shadowAngle,
    'shadow-distance': footer.shadowDistance,
    'shadow-offset': footer.shadowOffset,
    'shadow-blur': footer.shadowBlur
  });
  const createSlot = (text, position, alignment, font) =>
    text
      ? {
          tag: 'span',
          cn: createInlineContent(resolveDatePlaceholders(text), theme),
          style: {
            fontFamily: font || footer.font || 'inherit',
            left: position === 'left' ? 0 : position === 'center' ? '50%' : undefined,
            position: 'absolute',
            right: position === 'right' ? 0 : undefined,
            textAlign: alignment,
            transform: position === 'center' ? 'translateX(-50%)' : undefined,
            whiteSpace: 'nowrap'
          }
        }
      : null;
  return {
    tag: 'footer',
    style: {
      ...effectStyle,
      bottom: '1.4rem',
      color: theme.muted,
      fontFamily: footer.font || 'inherit',
      fontSize: safeDimension(footer.size, '.85rem'),
      left: '2rem',
      opacity: 0.82,
      position: 'absolute',
      right: '2rem',
      transform: `translate(${offset.x}, ${offset.y})`
    },
    cn: [
      createSlot(footer.left, 'left', 'left', footer.leftFont),
      createSlot(footer.center, 'center', 'center', footer.centerFont),
      createSlot(footer.right, 'right', 'right', footer.rightFont)
    ].filter(Boolean)
  };
}

function resolveDatePlaceholders(value, date = new Date()) {
  return String(value ?? '').replace(
    /\{\{(?:date|today)(?::(short|medium|long|full|iso))?\}\}/gi,
    (_placeholder, requestedStyle) => {
      const style = String(requestedStyle ?? 'medium').toLowerCase();
      if (style === 'iso') {
        const year = String(date.getFullYear()).padStart(4, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return new Intl.DateTimeFormat(undefined, { dateStyle: style }).format(date);
    }
  );
}

function createFootnotes(footnotes, theme, hasFooter) {
  if (!Array.isArray(footnotes) || footnotes.length === 0) return null;
  return {
    tag: 'aside',
    style: {
      bottom: hasFooter ? '3.15rem' : '1.45rem',
      color: theme.muted,
      fontSize: '.82rem',
      left: '2rem',
      lineHeight: 1.35,
      maxWidth: '65%',
      position: 'absolute',
      textAlign: 'left'
    },
    cn: footnotes.map(({ id, text }) => ({
      tag: 'div',
      cn: [
        {
          tag: 'sup',
          text: `[${id}] `,
          style: { color: theme.accent, fontWeight: 700 }
        },
        ...createInlineContent(text, theme)
      ]
    }))
  };
}

function createTimeline(text, theme) {
  const entries = text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [when, ...rest] = line.split(/\s*(?:\||—|--)\s*/);
      return { when: when.trim(), detail: rest.join(' — ').trim() };
    });
  return {
    tag: 'ol',
    style: {
      borderLeft: `3px solid ${theme.accent}`,
      boxSizing: 'border-box',
      listStyle: 'none',
      margin: 0,
      maxWidth: '950px',
      padding: '0 0 0 1.6rem',
      textAlign: 'left',
      width: '100%'
    },
    cn: entries.map(({ when, detail }) => ({
      tag: 'li',
      style: { margin: '0 0 1rem', position: 'relative' },
      cn: [
        {
          tag: 'span',
          style: {
            background: theme.accent,
            border: `3px solid ${theme.background}`,
            borderRadius: '50%',
            height: '14px',
            left: '-2.12rem',
            position: 'absolute',
            top: '.25rem',
            width: '14px'
          }
        },
        {
          tag: 'strong',
          text: resolveDatePlaceholders(when),
          style: { color: theme.accent, display: 'block', fontSize: '1.25rem' }
        },
        {
          tag: 'span',
          cn: createInlineContent(detail, theme),
          style: {
            color: theme.foreground,
            fontSize: '1.6rem',
            lineHeight: 1.3
          }
        }
      ]
    }))
  };
}

function createCards(text, theme, blockStyle) {
  const cards = text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [icon, title, ...description] = line.split('|').map((part) => part.trim());
      return {
        description: description.join(' | '),
        icon,
        title: title ?? icon
      };
    });
  const cardSurfaceStyle = createBlockSurfaceStyle(blockStyle);
  return {
    tag: 'div',
    style: {
      display: 'grid',
      gap: '1.1rem',
      gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cards.length))}, minmax(0, 1fr))`,
      maxWidth: '1180px',
      width: '100%'
    },
    cn: cards.map(({ icon, title, description }) => ({
      tag: 'article',
      style: {
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: '.65rem',
        boxSizing: 'border-box',
        minWidth: 0,
        padding: '1.2rem',
        textAlign: 'left',
        ...cardSurfaceStyle
      },
      cn: [
        {
          tag: 'div',
          text: resolveDatePlaceholders(icon),
          style: {
            color: theme.accent,
            fontSize: '2rem',
            lineHeight: 1,
            marginBottom: '.65rem'
          }
        },
        {
          tag: 'h3',
          cn: createInlineContent(title, theme),
          style: { fontSize: '1.55rem', margin: '0 0 .45rem' }
        },
        {
          tag: 'p',
          cn: createInlineContent(description, theme),
          style: {
            color: theme.muted,
            fontSize: '1.1rem',
            lineHeight: 1.35,
            margin: 0
          }
        }
      ]
    }))
  };
}

function createStickybox(text, theme, options = {}) {
  const width = isInlineLength(String(options['sticky-width'] ?? ''))
    ? options['sticky-width']
    : '30rem';
  const rotation = /^-?(?:\d+(?:\.\d+)?|\.\d+)deg$/i.test(String(options['sticky-rotation'] ?? ''))
    ? options['sticky-rotation']
    : '-2deg';
  const position = String(options['sticky-position'] ?? 'center').toLowerCase();
  const tape = String(options['sticky-tape'] ?? 'center').toLowerCase();
  const tapeVisible = !['false', 'none', 'off', '0'].includes(tape);
  const tapePosition = tape === 'left' || tape === 'right' ? tape : 'center';
  const tapeAlpha = options['sticky-tape-alpha'] ?? '10%';
  const fill = options['sticky-fill'] ?? options.fill ?? '#fff1a8';
  const alpha = options['sticky-alpha'] ?? options['fill-alpha'] ?? '100%';
  const effects = createBlockStyle(options);
  const offset = parseInlineOffset(options.offset) ?? { x: '0', y: '0' };
  const effectTransform = effects.transform ?? '';
  delete effects.left;
  delete effects.position;
  delete effects.top;
  delete effects.transform;
  const anchorTransform =
    position === 'left'
      ? 'translateY(-50%)'
      : position === 'right'
        ? 'translateY(-50%)'
        : 'translate(-50%, -50%)';
  return {
    tag: 'aside',
    style: {
      ...effects,
      background: withAlpha(fill, alpha),
      boxShadow:
        effects.boxShadow ??
        (effects.filter
          ? undefined
          : '-.55rem .72rem .65rem -.5rem rgba(15,23,42,.3), .55rem .72rem .65rem -.5rem rgba(15,23,42,.3), 0 .48rem .4rem -.42rem rgba(15,23,42,.18)'),
      boxSizing: 'border-box',
      color: theme.foreground,
      fontSize: '1.55rem',
      lineHeight: 1.42,
      maxWidth: '100%',
      padding: '2.1rem 1.7rem 1.55rem',
      position: 'absolute',
      left: position === 'right' ? undefined : position === 'left' ? '8%' : '50%',
      right: position === 'right' ? '8%' : undefined,
      top: '50%',
      transform:
        `${anchorTransform} translate(${offset.x}, ${offset.y}) rotate(${rotation}) ${effectTransform}`.trim(),
      width,
      zIndex: 6
    },
    cn: [
      ...(tapeVisible
        ? [
            {
              tag: 'span',
              data: { neopresentStickyTape: 'true' },
              style: {
                background: withAlpha('#e2e8f0', tapeAlpha),
                height: '1.35rem',
                left: tapePosition === 'left' ? '22%' : tapePosition === 'right' ? '78%' : '50%',
                position: 'absolute',
                top: '-.62rem',
                transform: 'translateX(-50%) rotate(2deg)',
                width: '7rem'
              }
            }
          ]
        : []),
      {
        tag: 'div',
        cn: createInlineContent(text, theme),
        style: { whiteSpace: 'pre-wrap' }
      }
    ]
  };
}

function createBlockSurfaceStyle(options) {
  if (!options || typeof options !== 'object') return {};
  const style = createBlockStyle(options);
  delete style.left;
  delete style.position;
  delete style.top;
  delete style.transform;
  return style;
}

function createProgress(progress, theme) {
  const percent = Math.max(
    0,
    Math.min(100, (progress.current / Math.max(1, progress.total)) * 100)
  );
  return {
    tag: 'div',
    data: { neopresentProgress: 'true' },
    style: {
      background: theme.border,
      bottom: 0,
      height: '5px',
      left: 0,
      position: 'absolute',
      width: '100%'
    },
    cn: [
      {
        tag: 'div',
        style: {
          background: theme.accent,
          height: '100%',
          transition: 'width 240ms ease',
          width: `${percent}%`
        }
      }
    ]
  };
}

function createLogo(logo, logoOffset = '0,0') {
  const offset = parseInlineOffset(logoOffset) ?? {
    x: '0',
    y: '0'
  };
  return {
    tag: 'img',
    alt: '',
    src: logo,
    style: {
      maxHeight: '3.25rem',
      maxWidth: '10rem',
      objectFit: 'contain',
      opacity: 0.82,
      position: 'absolute',
      right: '2rem',
      top: '1.5rem',
      transform: `translate(${offset.x}, ${offset.y})`
    }
  };
}

function createPageNumber(pageNumber, theme) {
  const requestedPosition = String(pageNumber.position ?? 'bottom-right').toLowerCase();
  const position = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ].includes(requestedPosition)
    ? requestedPosition
    : 'bottom-right';
  const [vertical = 'bottom', horizontal = 'right'] = position.split('-');
  const offset = parseInlineOffset(pageNumber.offset) ?? { x: '0', y: '0' };
  return {
    tag: 'span',
    text: pageNumber.showTotal
      ? `${pageNumber.current}/${pageNumber.total}`
      : String(pageNumber.current),
    style: {
      color: theme.muted,
      fontSize: safeDimension(pageNumber.size, '.85rem'),
      fontVariantNumeric: 'tabular-nums',
      opacity: 0.82,
      position: 'absolute',
      top: vertical === 'top' ? '1.5rem' : undefined,
      bottom: vertical === 'bottom' ? '1.4rem' : undefined,
      left: horizontal === 'left' ? '2rem' : horizontal === 'center' ? '50%' : undefined,
      right: horizontal === 'right' ? '2rem' : undefined,
      transform:
        horizontal === 'center'
          ? `translate(calc(-50% + ${offset.x}), ${offset.y})`
          : `translate(${offset.x}, ${offset.y})`,
      zIndex: 3
    }
  };
}

function getSlideAlignment(slide) {
  const align = slide.getAttribute?.('align') ?? 'center';
  const valign = slide.getAttribute?.('valign') ?? 'center';
  return {
    content: { top: 'flex-start', center: 'center', bottom: 'flex-end' }[valign] ?? 'center',
    items: { left: 'flex-start', center: 'center', right: 'flex-end' }[align] ?? 'center',
    text: align
  };
}

function resolveBackground(value, fallback, overlay, position = 'center', size = 'cover') {
  const background = value || fallback;
  if (!background) return fallback;
  let resolved = background;
  if (/\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(background.trim())) {
    resolved = `${position} / ${size} no-repeat url("${background.replace(/"/g, '%22')}")`;
  }
  return overlay ? `linear-gradient(${overlay}, ${overlay}), ${resolved}` : resolved;
}

/** Converts a small, safe subset of inline Markdown into VDOM nodes without HTML injection. */
function createInlineContent(text, theme) {
  text = resolveDatePlaceholders(text);
  const wrappedStyle = parseFullInlineStyle(text);
  if (wrappedStyle)
    return [
      {
        tag: 'span',
        cn: createInlineContent(wrappedStyle.text, theme),
        style: createInlineStyle(wrappedStyle.specification)
      }
    ];
  const nodes = [];
  const inlinePattern =
    /\{\{((?:font|color|size|offset|style):[^|{}]+)\|([^{}]+)\}\}|\{(color|size|offset):([^|{}]+)\|([^{}]+)\}|\[\^([^\]]+)]|\[([^\]]+)]\(([^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|==([^=]+)==|~~([^~]+)~~|\$([^$\n]+)\$|\*([^*]+)\*/g;
  let cursor = 0;
  let match;

  while ((match = inlinePattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push({ vtype: 'text', text: text.slice(cursor, match.index) });
    const [
      markdown,
      styleSpec,
      styleText,
      simpleStyleName,
      simpleStyleValue,
      simpleStyleText,
      footnote,
      label,
      href,
      boldText,
      codeText,
      highlightText,
      strikeText,
      mathText,
      italicText
    ] = match;
    if (styleSpec && styleText) {
      nodes.push({
        tag: 'span',
        cn: createInlineContent(styleText, theme),
        style: createInlineStyle(styleSpec)
      });
    } else if (simpleStyleName && simpleStyleText) {
      nodes.push({
        tag: 'span',
        cn: createInlineContent(simpleStyleText, theme),
        style: createInlineStyle(`${simpleStyleName}:${simpleStyleValue}`)
      });
    } else if (footnote) {
      nodes.push({
        tag: 'sup',
        text: `[${footnote}]`,
        style: {
          color: theme.accent,
          fontSize: '.7em',
          fontWeight: 700,
          marginLeft: '.08em'
        }
      });
    } else if (label && href && isSafeLink(href)) {
      const internalSlideLink = /^#slide=\d+$/.test(href);
      nodes.push({
        tag: 'a',
        href,
        rel: internalSlideLink ? undefined : 'noopener noreferrer',
        target: internalSlideLink ? '_self' : '_blank',
        cn: createInlineContent(label, theme),
        style: { color: theme.accent, textDecoration: 'underline' }
      });
    } else if (boldText) {
      nodes.push({ tag: 'strong', text: boldText });
    } else if (codeText) {
      nodes.push({
        tag: 'code',
        text: codeText,
        style: {
          background: theme.panel,
          borderRadius: '.25rem',
          color: theme.codeString,
          padding: '.08em .28em'
        }
      });
    } else if (highlightText) {
      nodes.push({
        tag: 'mark',
        text: highlightText,
        style: {
          background: theme.accent,
          borderRadius: '.18em',
          color: theme.background,
          padding: '.06em .22em'
        }
      });
    } else if (strikeText) {
      nodes.push({
        tag: 's',
        text: strikeText,
        style: { color: theme.muted, textDecorationThickness: '.12em' }
      });
    } else if (mathText) {
      nodes.push({
        tag: 'span',
        data: { katexDisplay: 'inline', katexSource: mathText },
        style: { display: 'inline-block', whiteSpace: 'nowrap' }
      });
    } else if (italicText) {
      nodes.push({ tag: 'em', text: italicText });
    } else {
      nodes.push({ vtype: 'text', text: markdown });
    }
    cursor = match.index + markdown.length;
  }

  if (cursor < text.length) nodes.push({ vtype: 'text', text: text.slice(cursor) });
  return nodes;
}

function parseFullInlineStyle(text) {
  if (!text.startsWith('{{') || !text.endsWith('}}')) return null;
  const separator = text.indexOf('|', 2);
  if (separator < 3) return null;
  const specification = text.slice(2, separator).trim();
  if (!/^(?:font|color|size|offset|style):/i.test(specification)) return null;
  let depth = 0;
  for (let index = separator + 1; index < text.length - 1; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      if (depth > 0) depth -= 1;
      else if (text[index + 1] === '}' && index + 2 !== text.length) return null;
    }
  }
  if (depth !== 0) return null;
  return { specification, text: text.slice(separator + 1, -2) };
}

function createInlineStyle(specification) {
  const style = {};
  const source = specification.startsWith('style:') ? specification.slice(6) : specification;
  const options = {};
  source.split(';').forEach((declaration) => {
    const separator = declaration.search(/[:=]/);
    if (separator < 1) return;
    const key = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!value) return;
    options[key] = value;
  });
  if (options.font) style.fontFamily = options.font;
  const glass = ['on', 'true', 'yes', 'glass', '1'].includes(
    String(options.glass ?? '').toLowerCase()
  );
  if (glass) {
    const tint = options['glass-color'] ?? '#ffffff';
    const tintAlpha = options['glass-transparency']
      ? `${trimInlineNumber((1 - parseInlineAlpha(options['glass-transparency'])) * 100)}%`
      : (options['glass-alpha'] ?? '18%');
    const blur = isInlineLength(options['glass-blur']) ? options['glass-blur'] : '18px';
    const saturation = /^\d+(?:\.\d+)?%$/.test(String(options['glass-saturation'] ?? ''))
      ? options['glass-saturation']
      : '145%';
    const thickness = isInlineLength(options['glass-thickness'])
      ? options['glass-thickness']
      : '1px';
    const edgeColor = options['glass-edge-color'] ?? '#ffffff';
    const edgeAlpha = options['glass-edge-alpha'] ?? '42%';
    const radius = isInlineLength(options['glass-radius']) ? options['glass-radius'] : '.8rem';
    const depth = isInlineLength(options['glass-depth']) ? options['glass-depth'] : '.55rem';
    const depthAlpha = options['glass-depth-alpha'] ?? '24%';
    style.background = `linear-gradient(135deg, ${withAlpha('#ffffff', '18%')}, transparent 48%), ${withAlpha(tint, tintAlpha)}`;
    style.backdropFilter = `blur(${blur}) saturate(${saturation})`;
    style.webkitBackdropFilter = `blur(${blur}) saturate(${saturation})`;
    style.border = `${thickness} solid ${withAlpha(edgeColor, edgeAlpha)}`;
    style.borderRadius = radius;
    style.boxShadow = `inset 0 1px 0 ${withAlpha('#ffffff', '35%')}, 0 ${depth} calc(${depth} * 2.4) ${withAlpha('#000000', depthAlpha)}`;
  }
  if (options.fill)
    style.background = withAlpha(options.fill, options['fill-alpha'] ?? options.alpha ?? '100%');
  if (options['frame-color']) style.borderColor = options['frame-color'];
  if (options.color)
    style.color = withAlpha(options.color, options['color-alpha'] ?? options.alpha);
  if (options.size && isInlineLength(options.size)) style.fontSize = options.size;
  const offset = parseInlineOffset(options.offset);
  if (offset)
    Object.assign(style, {
      position: 'relative',
      left: offset.x,
      top: offset.y
    });
  const scale = Math.min(5, Number(options['frame-scale'] ?? 1));
  if (Number.isFinite(scale) && scale > 0 && scale !== 1) style.transform = `scale(${scale})`;
  const border = String(options.border ?? '').toLowerCase();
  if (border === 'line') {
    style.borderStyle = ['solid', 'dashed', 'dotted', 'double'].includes(options['border-style'])
      ? options['border-style']
      : 'solid';
    style.borderColor = withAlpha(
      options['border-color'] ?? 'currentColor',
      options['border-alpha']
    );
    style.borderWidth = isInlineLength(options['border-size']) ? options['border-size'] : '1px';
    style.borderRadius = isInlineLength(options['border-radius'])
      ? options['border-radius']
      : '.12em';
    style.padding = isInlineLength(options['border-padding'])
      ? options['border-padding']
      : '.08em .2em';
  } else if (border === 'picture' || border === 'picture-frame') {
    const size = isInlineLength(options['border-size']) ? options['border-size'] : '.18em';
    style.border = `${size} solid ${withAlpha(options['border-color'] ?? '#f8fafc', options['border-alpha'])}`;
    style.outline = `1px solid ${withAlpha(options['frame-inner-color'] ?? '#475569', options['border-alpha'])}`;
    style.outlineOffset = `-${size}`;
    style.padding = isInlineLength(options['border-padding'])
      ? options['border-padding']
      : '.18em .3em';
  }
  const shadow = String(options.shadow ?? '').toLowerCase();
  if (['drop', 'box', 'box-shadow', 'contact', 'curved'].includes(shadow)) {
    const shadowOffset = resolveShadowOffset(options);
    const blur = isInlineLength(options['shadow-blur']) ? options['shadow-blur'] : '.2em';
    const color = withAlpha(options['shadow-color'] ?? '#000', options['shadow-opacity'] ?? '35%');
    if (shadow === 'drop')
      style.filter = `drop-shadow(${shadowOffset.x} ${shadowOffset.y} ${blur} ${color})`;
    if (shadow === 'box' || shadow === 'box-shadow' || shadow === 'contact')
      style.boxShadow = `${shadowOffset.x} ${shadowOffset.y} ${blur} ${color}`;
    if (shadow === 'curved') style.boxShadow = createCurvedShadow(options, shadowOffset, color);
  }
  const reflection = parseInlineAlpha(options.reflection);
  if (reflection > 0)
    style['-webkit-box-reflect'] =
      `below .08em linear-gradient(transparent 15%, rgba(255,255,255,${reflection}))`;
  if (border || shadow || reflection > 0 || offset || style.transform)
    style.display = 'inline-block';
  return style;
}

function createBlockStyle(options) {
  if (!options || typeof options !== 'object') return {};
  const style = createInlineStyle(
    `style:${Object.entries(options)
      .map(([key, value]) => `${key}=${value}`)
      .join(';')}`
  );
  // Inline effects need inline-block for reflection and framing, but block
  // renderers already own their layout mode (grid, flex, table, etc.).
  delete style.display;
  return style;
}

function parseBlockScalePercent(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d+(?:\.\d+)?|\.\d+)(?:%|cqw)$/i);
  if (!match) return null;
  const percent = Number(match[1]);
  return Number.isFinite(percent) ? Math.max(1, Math.min(500, percent)) : null;
}

function normalizeImageSize(value) {
  const text = String(value ?? '').trim();
  return /^(?:auto|\d+(?:\.\d+)?(?:px|rem|em|%|vw|vh|cqw|cqh))$/i.test(text)
    ? text
    : undefined;
}

function parseInlineOffset(value) {
  if (!value) return null;
  const [x = '0', y = '0'] = value.split(',').map((part) => part.trim());
  return isInlineLength(x, true) && isInlineLength(y, true) ? { x, y } : null;
}

function resolveShadowOffset(options) {
  const explicit = parseInlineOffset(options['shadow-offset']);
  const angle = Number.parseFloat(options['shadow-angle']);
  if (!Number.isFinite(angle)) return explicit ?? { x: '0', y: '.22em' };
  const distance = parseInlineLength(options['shadow-distance']) ?? {
    number: 0.22,
    unit: 'em'
  };
  const radians = (angle * Math.PI) / 180;
  return {
    x: `${trimInlineNumber(Math.cos(radians) * distance.number)}${distance.unit}`,
    y: `${trimInlineNumber(Math.sin(radians) * distance.number)}${distance.unit}`
  };
}

function createCurvedShadow(options, offset, color) {
  const rawCurve = String(options['shadow-curve'] ?? options.curve ?? 'outward').toLowerCase();
  const curve = rawCurve === 'inward' ? -50 : rawCurve === 'outward' ? 50 : Number(rawCurve);
  const amount = Math.max(-100, Math.min(100, Number.isFinite(curve) ? curve : 50)) / 100;
  const size = parseInlineLength(options['shadow-size']) ?? { number: 0.14, unit: 'em' };
  const magnitude = Math.max(0.02, Math.abs(size.number));
  const blur = `${trimInlineNumber(magnitude * 3.2)}${size.unit}`;
  const spread = `-${trimInlineNumber(magnitude * 2.4)}${size.unit}`;
  const bend = trimInlineNumber(Math.abs(amount) * 0.34);
  const sideY = amount >= 0 ? `calc(${offset.y} + ${bend}em)` : offset.y;
  const centerY = amount < 0 ? `calc(${offset.y} + ${bend}em)` : offset.y;
  return `calc(${offset.x} - .42em) ${sideY} ${blur} ${spread} ${color}, calc(${offset.x} + .42em) ${sideY} ${blur} ${spread} ${color}, ${offset.x} ${centerY} ${blur} ${spread} ${color}`;
}

function parseInlineLength(value) {
  const match = String(value ?? '').match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em|%|vw|vh)$/);
  return match ? { number: Number(match[1]), unit: match[2] } : null;
}

function trimInlineNumber(value) {
  return Number(value.toFixed(4));
}

function parseInlineAlpha(value) {
  if (!value) return 0;
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, value.endsWith('%') || number > 1 ? number / 100 : number));
}

function withAlpha(color, alpha) {
  return alpha
    ? `color-mix(in srgb, ${color} ${parseInlineAlpha(alpha) * 100}%, transparent)`
    : color;
}

function isInlineLength(value, allowZero = false) {
  return (
    /^(?:-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vw|vh)|0)$/.test(value) &&
    (allowZero || !value.startsWith('-'))
  );
}

function isSafeLink(href) {
  return /^(?:https?:|mailto:|\/|\.\/?|#slide=\d+$)/i.test(href);
}

function getTransitionAnimation(transition, durationMs) {
  const animations = {
    fade: { duration: 300, easing: 'ease-out', name: 'neopresent-fade-in' },
    'slide-left': {
      duration: 360,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-left'
    },
    'slide-right': {
      duration: 360,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-right'
    },
    'slide-up': {
      duration: 360,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-up'
    },
    'slide-down': {
      duration: 360,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-down'
    },
    zoom: {
      duration: 340,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-zoom-in'
    },
    flip: {
      duration: 420,
      easing: 'cubic-bezier(.2,.75,.2,1)',
      name: 'neopresent-flip-in'
    }
  };
  if (['none', 'off', 'false'].includes(String(transition).toLowerCase())) return undefined;
  const animation = animations[transition] ?? animations.fade;
  const duration =
    Number.isFinite(Number(durationMs)) && Number(durationMs) > 0
      ? Number(durationMs)
      : animation.duration;
  return `${animation.name} ${duration}ms ${animation.easing} both`;
}

function getFragmentAnimation(animation) {
  const animations = {
    fade: { duration: 280, easing: 'ease-out', name: 'neopresent-fade-in' },
    zoom: {
      duration: 360,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-zoom-in'
    },
    'slide-left': {
      duration: 380,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-left'
    },
    'slide-right': {
      duration: 380,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-right'
    },
    'slide-up': {
      duration: 380,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-up'
    },
    'slide-down': {
      duration: 380,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      name: 'neopresent-slide-down'
    }
  };
  const selected = animations[animation] ?? animations.fade;
  return `${selected.name} ${selected.duration}ms ${selected.easing} both`;
}

function createFeynmanDiagram(
  source,
  theme,
  revealIndex = Number.POSITIVE_INFINITY,
  animate = true
) {
  const settings = {};
  const vertices = new Map();
  const edges = [];
  const fieldsFor = (parts) =>
    Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^\s*([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1].toLowerCase(), field[2].trim()]] : [];
      })
    );
  for (const raw of String(source ?? '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const vertex = line.match(/^vertex\s*:\s*(.*?)\s*$/i);
    const edge = line.match(/^edge\s*:\s*(.*?)\s*$/i);
    const setting = line.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
    if (vertex) {
      const [name = '', ...parts] = vertex[1].split('|').map((value) => value.trim());
      const fields = fieldsFor(parts);
      if (name)
        vertices.set(name, {
          ...fields,
          name,
          x: feynmanNumber(fields.x, 0.5),
          y: feynmanNumber(fields.y, 0.5),
          label: fields.label ?? '',
          color: fields.color ?? '',
          size: feynmanNumber(fields.size, 5),
          visible: !['false', 'off', 'no'].includes(String(fields.visible ?? '').toLowerCase()),
          labelOffsetX: fields['label-offset-x'],
          labelOffsetY: fields['label-offset-y']
        });
      continue;
    }
    if (edge) {
      const [connection = '', ...parts] = edge[1].split('|').map((value) => value.trim());
      const match = connection.match(/^(.+?)\s*(?:->|→)\s*(.+?)$/);
      if (match)
        edges.push({
          from: match[1].trim(),
          to: match[2].trim(),
          ...fieldsFor(parts)
        });
      continue;
    }
    if (setting) settings[setting[1].toLowerCase()] = setting[2].trim();
  }
  const width = Math.max(240, Math.min(1800, feynmanNumber(settings.width, 900)));
  const height = Math.max(160, Math.min(1200, feynmanNumber(settings.height, 460)));
  const foreground = safeColor(settings.color, theme.foreground);
  const lineWidth = Math.max(0.5, feynmanNumber(settings['line-width'], 2.6));
  const fontSize = Math.max(8, feynmanNumber(settings['font-size'], 20));
  const coordinate = (vertex) => ({
    x: Math.max(0, Math.min(1, vertex.x)) * width,
    y: Math.max(0, Math.min(1, vertex.y)) * height
  });
  const vertexValues = [...vertices.values()];
  const animationOrder = String(settings['animation-order'] ?? 'edges-first').toLowerCase();
  const revealTriggered = String(settings['animation-trigger'] ?? '').toLowerCase() === 'reveal';
  const defaultRevealStage = Math.max(
    0,
    Math.floor(feynmanNumber(settings['reveal-stage-default'], 0))
  );
  const revealStageFor = (item) =>
    Math.max(0, Math.floor(feynmanNumber(item['reveal-stage'], defaultRevealStage)));
  const sourceAnimationRanks = new Map();
  const sourceStageCounts = new Map();
  if (revealTriggered) {
    [
      ...edges.map((edge, index) => ({ item: edge, key: `edge:${index}` })),
      ...vertexValues.map((vertex, index) => ({ item: vertex, key: `vertex:${index}` }))
    ].forEach(({ item, key }) => {
      const stage = revealStageFor(item);
      const rank = sourceStageCounts.get(stage) ?? 0;
      sourceAnimationRanks.set(key, rank);
      sourceStageCounts.set(stage, rank + 1);
    });
  }
  const spatialAnimationRanks = new Map();
  if (animationOrder === 'left-to-right' || animationOrder === 'right-to-left') {
    const direction = animationOrder === 'right-to-left' ? -1 : 1;
    const animationItems = [
      ...edges.flatMap((edge, index) => {
        const from = vertices.get(edge.from);
        const to = vertices.get(edge.to);
        if (!from || !to) return [];
        const a = coordinate(from);
        const b = coordinate(to);
        return [
          {
            key: `edge:${index}`,
            sourceIndex: index,
            stage: revealStageFor(edge),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
          }
        ];
      }),
      ...vertexValues.flatMap((vertex, index) => {
        if (!vertex.visible && !vertex.label) return [];
        const point = coordinate(vertex);
        return [
          {
            key: `vertex:${index}`,
            sourceIndex: edges.length + index,
            stage: revealStageFor(vertex),
            x: point.x,
            y: point.y
          }
        ];
      })
    ].sort((a, b) =>
      revealTriggered && a.stage !== b.stage
        ? a.stage - b.stage
        : direction * (a.x - b.x) || a.y - b.y || a.sourceIndex - b.sourceIndex
    );
    const stageRanks = new Map();
    animationItems.forEach((item, index) => {
      if (!revealTriggered) {
        spatialAnimationRanks.set(item.key, index);
        return;
      }
      const rank = stageRanks.get(item.stage) ?? 0;
      spatialAnimationRanks.set(item.key, rank);
      stageRanks.set(item.stage, rank + 1);
    });
  }
  const animationIndex = (kind, index, fallback) =>
    spatialAnimationRanks.get(`${kind}:${index}`) ??
    sourceAnimationRanks.get(`${kind}:${index}`) ??
    fallback;
  const revealStateFor = (item) => {
    const stage = revealStageFor(item);
    const visible = !revealTriggered || revealIndex >= stage;
    return {
      animate: !revealTriggered || (animate && visible && revealIndex === stage),
      stage,
      visible
    };
  };
  const edgeSvg = edges
    .map((edge, index) => {
      const from = vertices.get(edge.from);
      const to = vertices.get(edge.to);
      if (!from || !to) return '';
      const a = coordinate(from);
      const b = coordinate(to);
      const type = String(edge.type ?? 'fermion').toLowerCase();
      const color = safeColor(edge.color, foreground);
      const widthValue = Math.max(0.5, feynmanNumber(edge['line-width'], lineWidth));
      const arrow = !['false', 'off', 'no', '0'].includes(
        String(edge.arrow ?? (type === 'fermion' ? 'true' : 'false')).toLowerCase()
      );
      const geometry = feynmanEdgeGeometry(a, b, edge);
      const path =
        type === 'photon' || type === 'wavy'
          ? feynmanDecoratedCurvePath(geometry.pointAt, 7, 7, false)
          : type === 'gluon' || type === 'curly'
            ? feynmanGluonCoilPath(
                geometry.pointAt,
                Math.max(5, feynmanNumber(edge['curl-size'], 16)),
                feynmanNumber(edge['curl-count'], 0)
              )
            : geometry.path;
      const dash = type === 'scalar' ? '10 7' : type === 'ghost' ? '2 7' : 'none';
      const revealState = revealStateFor(edge);
      const requestedAnimation = getFeynmanAnimation(
        edge,
        settings,
        animationIndex('edge', index, index)
      );
      const animation = revealState.animate
        ? requestedAnimation
        : { ...requestedAnimation, name: '' };
      const drawStyle =
        animation.name === 'draw'
          ? `stroke-dasharray:1;stroke-dashoffset:1;animation:neopresent-chart-draw ${animation.duration} ${animation.easing} ${animation.delay} both;`
          : '';
      const arrowSvg = arrow
        ? feynmanArrowHead(
            geometry.pointAt,
            Math.max(0.05, Math.min(0.95, feynmanNumber(edge['arrow-position'], 0.5))),
            color,
            widthValue,
            feynmanNumber(edge['arrow-size'], 13)
          )
        : '';
      const lineSvg = `<path pathLength="1" style="${drawStyle}" d="${path}" fill="none" stroke="${color}" stroke-width="${widthValue}" stroke-dasharray="${drawStyle ? 1 : dash}" stroke-linecap="round" stroke-linejoin="round" />${arrowSvg}`;
      const momentumSvg = edge.momentum
        ? feynmanMomentumMarkup(edge, geometry.pointAt, color, fontSize)
        : '';
      const label = String(edge.label ?? '').trim();
      const animationStyle =
        animation.name && animation.name !== 'draw'
          ? `animation:neopresent-chart-${animation.name} ${animation.duration} ${animation.easing} ${animation.delay} both;transform-box:fill-box;transform-origin:center;`
          : animation.name === 'draw'
            ? `animation:neopresent-chart-fade ${animation.duration} ${animation.easing} ${animation.delay} both;`
            : '';
      const visibilityStyle = revealState.visible ? '' : 'opacity:0;visibility:hidden;';
      const groupStyle =
        animationStyle || visibilityStyle ? ` style="${visibilityStyle}${animationStyle}"` : '';
      if (!label) return `<g${groupStyle}>${lineSvg}${momentumSvg}</g>`;
      const fraction = Math.max(0, Math.min(1, feynmanNumber(edge['label-position'], 0.5)));
      const labelPoint = geometry.pointAt(fraction);
      const x = labelPoint.x + feynmanNumber(edge['label-offset-x'], 0);
      const y = labelPoint.y + feynmanNumber(edge['label-offset-y'], -12);
      return `<g${groupStyle}>${lineSvg}${momentumSvg}${feynmanLabelMarkup(label, x, y, safeColor(edge['label-color'], color), safeFont(edge['label-font'], 'system-ui, sans-serif'), Math.max(9, feynmanNumber(edge['label-size'], fontSize)))}</g>`;
    })
    .join('');
  const vertexSvg = vertexValues
    .map((vertex, index) => {
      const point = coordinate(vertex);
      const color = safeColor(vertex.color, foreground);
      const dot = vertex.visible
        ? `<circle cx="${point.x}" cy="${point.y}" r="${vertex.size}" fill="${color}" />`
        : '';
      const label = vertex.label
        ? feynmanLabelMarkup(
            vertex.label,
            point.x + feynmanNumber(vertex.labelOffsetX, 0),
            point.y + feynmanNumber(vertex.labelOffsetY, -14),
            safeColor(vertex['label-color'], color),
            safeFont(vertex['label-font'], 'system-ui, sans-serif'),
            Math.max(9, feynmanNumber(vertex['label-size'], fontSize))
          )
        : '';
      const revealState = revealStateFor(vertex);
      const requestedAnimation = getFeynmanAnimation(
        vertex,
        settings,
        animationIndex('vertex', index, edges.length + index)
      );
      const animation = revealState.animate
        ? requestedAnimation
        : { ...requestedAnimation, name: '' };
      const animationStyle = animation.name
        ? `animation:neopresent-chart-${animation.name === 'draw' ? 'fade' : animation.name} ${animation.duration} ${animation.easing} ${animation.delay} both;transform-box:fill-box;transform-origin:center;`
        : '';
      const visibilityStyle = revealState.visible ? '' : 'opacity:0;visibility:hidden;';
      const style =
        animationStyle || visibilityStyle ? ` style="${visibilityStyle}${animationStyle}"` : '';
      return `<g${style}>${dot}${label}</g>`;
    })
    .join('');
  const background = safeColor(settings.background, 'transparent');
  return `<svg role="img" aria-label="Feynman diagram" viewBox="0 0 ${width} ${height}" style="display:block;height:auto;max-height:100%;width:100%" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="${background}" />${edgeSvg}${vertexSvg}</svg>`;
}

function getFeynmanAnimation(item, settings, index) {
  const requested = String(item.animation ?? settings.animation ?? '')
    .trim()
    .toLowerCase();
  const name = ['fade', 'rise', 'grow', 'draw'].includes(requested) ? requested : '';
  const duration = safeCssTime(
    item['animation-duration'] ?? settings['animation-duration'],
    '700ms'
  );
  const baseDelay = cssTimeToMilliseconds(
    safeCssTime(item['animation-delay'] ?? settings['animation-delay'], '0ms')
  );
  const stagger = cssTimeToMilliseconds(
    safeCssTime(item['animation-stagger'] ?? settings['animation-stagger'], '0ms')
  );
  return {
    name,
    duration,
    delay: `${Math.round(baseDelay + stagger * index)}ms`,
    easing: safeEasing(
      item['animation-easing'] ?? settings['animation-easing'],
      'cubic-bezier(.2,.8,.2,1)'
    )
  };
}

function feynmanNumber(value, fallback) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function feynmanLabelMarkup(label, x, y, color, font, fontSize) {
  const math = getDelimitedMath(label);
  if (math)
    return `<foreignObject x="${x - 120}" y="${y - fontSize}" width="240" height="${Math.max(32, fontSize * 1.8)}"><div xmlns="http://www.w3.org/1999/xhtml" data-katex-source="${escapeSvgText(math.source)}" data-katex-display="inline" style="color:${color};font-family:${font};font-size:${fontSize}px;text-align:center;white-space:nowrap"></div></foreignObject>`;
  return `<text x="${x}" y="${y}" fill="${color}" font-family="${font}" font-size="${fontSize}" text-anchor="middle">${escapeSvgText(label)}</text>`;
}

function feynmanDecoratedCurvePath(pointAt, cycles, amplitude, curly) {
  const segments = Math.max(24, cycles * 12);
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const point = pointAt(t);
    if (index === 0 || index === segments) return point;
    const before = pointAt(Math.max(0, t - 1 / segments));
    const after = pointAt(Math.min(1, t + 1 / segments));
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const tangent = {
      x: (after.x - before.x) / length,
      y: (after.y - before.y) / length
    };
    const normal = { x: -tangent.y, y: tangent.x };
    const phase = Math.PI * 2 * cycles * t;
    const lateral = Math.sin(phase) * amplitude;
    const forward = curly ? (1 - Math.cos(phase)) * amplitude * 0.34 : 0;
    return {
      x: point.x + normal.x * lateral + tangent.x * forward,
      y: point.y + normal.y * lateral + tangent.y * forward
    };
  });
  return feynmanSmoothPath(points);
}

function feynmanGluonCoilPath(pointAt, radius, requestedCount) {
  const length = feynmanCurveLength(pointAt);
  const coils = Math.max(
    1,
    Math.round(requestedCount > 0 ? requestedCount : length / Math.max(10, radius * 2.25))
  );
  const segments = Math.max(32, coils * 24);
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const base = pointAt(t);
    if (index === 0 || index === segments) return base;
    const before = pointAt(Math.max(0, t - 1 / segments));
    const after = pointAt(Math.min(1, t + 1 / segments));
    const tangentLength = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const tangent = {
      x: (after.x - before.x) / tangentLength,
      y: (after.y - before.y) / tangentLength
    };
    const normal = { x: -tangent.y, y: tangent.x };
    const phase = Math.PI * 2 * coils * t;
    // A smooth trochoid: each period makes one round, touching coil.
    const forward = Math.sin(phase) * radius;
    const lateral = (1 - Math.cos(phase)) * radius;
    return {
      x: base.x + tangent.x * forward + normal.x * lateral,
      y: base.y + tangent.y * forward + normal.y * lateral
    };
  });
  return feynmanSmoothPath(points);
}

function feynmanCurveLength(pointAt) {
  const samples = 80;
  return Array.from({ length: samples }, (_, index) => {
    const a = pointAt(index / samples);
    const b = pointAt((index + 1) / samples);
    return Math.hypot(b.x - a.x, b.y - a.y);
  }).reduce((total, segment) => total + segment, 0);
}

function feynmanSmoothPath(points) {
  if (points.length < 2) return '';
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const c1 = {
      x: point.x + (next.x - previous.x) / 6,
      y: point.y + (next.y - previous.y) / 6
    };
    const c2 = {
      x: next.x - (following.x - point.x) / 6,
      y: next.y - (following.y - point.y) / 6
    };
    return `${path} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${next.x} ${next.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function feynmanArrowHead(pointAt, position, color, lineWidth, size) {
  const point = pointAt(position);
  const before = pointAt(Math.max(0, position - 0.01));
  const after = pointAt(Math.min(1, position + 0.01));
  const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
  const tangent = {
    x: (after.x - before.x) / length,
    y: (after.y - before.y) / length
  };
  const normal = { x: -tangent.y, y: tangent.x };
  const arrowSize = Math.max(4, size);
  const tip = {
    x: point.x + tangent.x * arrowSize * 0.5,
    y: point.y + tangent.y * arrowSize * 0.5
  };
  const base = {
    x: point.x - tangent.x * arrowSize * 0.5,
    y: point.y - tangent.y * arrowSize * 0.5
  };
  const left = {
    x: base.x + normal.x * arrowSize * 0.34,
    y: base.y + normal.y * arrowSize * 0.34
  };
  const right = {
    x: base.x - normal.x * arrowSize * 0.34,
    y: base.y - normal.y * arrowSize * 0.34
  };
  return `<path d="M ${tip.x} ${tip.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z" fill="${color}" stroke="${color}" stroke-width="${Math.max(0.5, lineWidth * 0.35)}" stroke-linejoin="round" />`;
}

function feynmanMomentumMarkup(edge, pointAt, fallbackColor, fallbackFontSize) {
  const position = Math.max(0.1, Math.min(0.9, feynmanNumber(edge['momentum-position'], 0.5)));
  const before = pointAt(Math.max(0, position - 0.02));
  const after = pointAt(Math.min(1, position + 0.02));
  const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
  let tangent = {
    x: (after.x - before.x) / length,
    y: (after.y - before.y) / length
  };
  if (
    String(edge['momentum-direction'] ?? 'forward')
      .trim()
      .toLowerCase() === 'reverse'
  )
    tangent = { x: -tangent.x, y: -tangent.y };
  const normal = { x: -tangent.y, y: tangent.x };
  const offset = feynmanNumber(edge['momentum-offset'], -18);
  const center = pointAt(position);
  const span = Math.max(14, feynmanNumber(edge['momentum-length'], 36));
  const start = {
    x: center.x + normal.x * offset - (tangent.x * span) / 2,
    y: center.y + normal.y * offset - (tangent.y * span) / 2
  };
  const end = {
    x: center.x + normal.x * offset + (tangent.x * span) / 2,
    y: center.y + normal.y * offset + (tangent.y * span) / 2
  };
  const color = safeColor(edge['momentum-color'], fallbackColor);
  const lineWidth = Math.max(0.5, feynmanNumber(edge['momentum-width'], 1.7));
  const size = Math.max(4, feynmanNumber(edge['momentum-arrow-size'], 8));
  const base = { x: end.x - tangent.x * size, y: end.y - tangent.y * size };
  const left = {
    x: base.x + normal.x * size * 0.42,
    y: base.y + normal.y * size * 0.42
  };
  const right = {
    x: base.x - normal.x * size * 0.42,
    y: base.y - normal.y * size * 0.42
  };
  const label = String(edge.momentum).trim();
  const labelOffset = feynmanNumber(edge['momentum-label-offset'], -8);
  const labelPoint = {
    x: center.x + normal.x * (offset + labelOffset),
    y: center.y + normal.y * (offset + labelOffset)
  };
  return `<path d="M ${start.x} ${start.y} L ${end.x} ${end.y}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" /><path d="M ${end.x} ${end.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z" fill="${color}" />${feynmanLabelMarkup(label, labelPoint.x, labelPoint.y, color, safeFont(edge['momentum-font'], 'system-ui, sans-serif'), Math.max(9, feynmanNumber(edge['momentum-size'], fallbackFontSize * 0.8)))}`;
}

function feynmanEdgeGeometry(a, b, edge) {
  const loop = String(edge.loop ?? '')
    .trim()
    .toLowerCase();
  const bend = feynmanNumber(edge.bend, 0);
  if (loop && ['left', 'right', 'top', 'bottom'].includes(loop)) {
    const size = Math.max(12, feynmanNumber(edge['loop-size'], 90));
    const direction = {
      left: [-1, 0],
      right: [1, 0],
      top: [0, -1],
      bottom: [0, 1]
    }[loop];
    const perpendicular = [-direction[1], direction[0]];
    const c1 = {
      x: a.x + direction[0] * size + perpendicular[0] * size,
      y: a.y + direction[1] * size + perpendicular[1] * size
    };
    const c2 = {
      x: a.x + direction[0] * size - perpendicular[0] * size,
      y: a.y + direction[1] * size - perpendicular[1] * size
    };
    return {
      curved: true,
      path: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${a.x} ${a.y}`,
      pointAt: (t) => cubicBezierPoint(a, c1, c2, a, t)
    };
  }
  if (bend) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const control = {
      x: (a.x + b.x) / 2 - (dy / length) * bend,
      y: (a.y + b.y) / 2 + (dx / length) * bend
    };
    return {
      curved: true,
      path: `M ${a.x} ${a.y} Q ${control.x} ${control.y}, ${b.x} ${b.y}`,
      pointAt: (t) => quadraticBezierPoint(a, control, b, t)
    };
  }
  return {
    curved: false,
    path: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
    pointAt: (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  };
}

function quadraticBezierPoint(a, control, b, t) {
  const inverse = 1 - t;
  return {
    x: inverse ** 2 * a.x + 2 * inverse * t * control.x + t ** 2 * b.x,
    y: inverse ** 2 * a.y + 2 * inverse * t * control.y + t ** 2 * b.y
  };
}

function cubicBezierPoint(a, c1, c2, b, t) {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * a.x + 3 * inverse ** 2 * t * c1.x + 3 * inverse * t ** 2 * c2.x + t ** 3 * b.x,
    y: inverse ** 3 * a.y + 3 * inverse ** 2 * t * c1.y + 3 * inverse * t ** 2 * c2.y + t ** 3 * b.y
  };
}

function createChartView(chart, theme) {
  return applyChartCaption(
    applyChartHighlights(createChartViewRaw(chart, theme), chart, theme),
    chart,
    theme
  );
}

function applyChartCaption(view, chart, theme) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const caption = String(style.caption ?? '').trim();
  if (!caption) return view;
  const align = ['left', 'center', 'right'].includes(String(style['caption-align']).toLowerCase())
    ? String(style['caption-align']).toLowerCase()
    : 'center';
  const size = normalizeImageSize(style['caption-size']) ?? '1.25rem';
  const offsetX = normalizeSignedCssLength(style['caption-offset-x']) ?? '0px';
  const offsetY = normalizeSignedCssLength(style['caption-offset-y']) ?? '0px';
  return {
    tag: 'figure',
    style: {
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      maxWidth: view?.style?.maxWidth ?? '100%',
      width: view?.style?.width ?? '100%'
    },
    cn: [
      view,
      {
        tag: 'figcaption',
        cn: createInlineContent(caption, theme),
        style: {
          color: safeColor(style['caption-color'], theme.muted),
          fontFamily: safeFont(style['caption-font'], 'inherit'),
          fontSize: size,
          lineHeight: 1.3,
          marginTop: '.45em',
          position: 'relative',
          left: offsetX,
          top: offsetY,
          textAlign: align,
          width: '100%'
        }
      }
    ]
  };
}

function normalizeSignedCssLength(value) {
  const text = String(value ?? '').trim();
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vw|vh|cqw|cqh)$/.test(text)
    ? text
    : undefined;
}

registerPlotRenderer('surface', createSurfaceView);
registerPlotRenderer('heatmap', createHeatmapView);
registerPlotRenderer('histogram', createHistogramView);
registerPlotRenderer('boxplot', createBoxPlotView);
registerPlotRenderer('contour', createContourView);
registerPlotRenderer('covariance', createCovarianceView);
registerPlotRenderer('density2d', createDensity2dView);
registerPlotRenderer('hexbin', createHexbinView);
registerPlotRenderer('quiver', createQuiverView);
registerPlotRenderer('profile', createProfileView);
registerPlotRenderer('periodic-table', createPeriodicTableView);
registerPlotRenderer('ridgeline', createRidgelineView);
registerPlotRenderer('streamline', createStreamlineView);
registerPlotRenderer('stacked-histogram', createStackedHistogramView);
registerPlotRenderer('standard-model', createStandardModelView);
registerPlotRenderer('violin', createViolinView);

function createChartViewRaw(chart, theme) {
  const registeredRenderer = getPlotRenderer(chart.kind);
  if (registeredRenderer) return registeredRenderer(chart, theme);
  const appearance = getPlotAppearance(chart, theme);
  const series = getRenderableSeries(chart);
  const leftSeries = series.filter((item) => item.yAxis !== 'right');
  const rightSeries = series.filter((item) => item.yAxis === 'right');
  const fitConfigs = getFitConfigs(chart, theme, appearance.fit);
  const fits = fitConfigs.flatMap((config) => createParametricFits(config, series));
  const scatter = chart.kind === 'scatter';
  const numericX =
    scatter ||
    series.some((item) => item.xValues.length === item.values.length && item.values.length > 0);
  const getYExtents = (items) =>
    items.flatMap((item) => {
      const lower =
        item.errorLowValues.length === item.values.length
          ? item.errorLowValues
          : item.errorValues.length === item.values.length
            ? item.errorValues
            : item.values.map(() => 0);
      const upper =
        item.errorHighValues.length === item.values.length
          ? item.errorHighValues
          : item.errorValues.length === item.values.length
            ? item.errorValues
            : item.values.map(() => 0);
      const layerExtents = item.uncertaintyLayers
        .filter(isUncertaintyLayerVisible)
        .flatMap((layer) => {
          const sigma = getUncertaintySigma(layer);
          const symmetric =
            layer.errorValues.length === item.values.length
              ? layer.errorValues
              : item.values.map(() => 0);
          const layerLower =
            layer.errorLowValues.length === item.values.length ? layer.errorLowValues : symmetric;
          const layerUpper =
            layer.errorHighValues.length === item.values.length ? layer.errorHighValues : symmetric;
          return item.values.flatMap((value, index) => [
            value - layerLower[index] * sigma,
            value + layerUpper[index] * sigma
          ]);
        });
      return [
        ...item.values.flatMap((value, index) => [value - lower[index], value + upper[index]]),
        ...layerExtents
      ];
    });
  const yExtents = getYExtents(leftSeries.length > 0 ? leftSeries : series);
  const fitValues = fits
    .filter((fit) => fit.yAxis !== 'right')
    .flatMap((fit) =>
      fit.samples
        .flatMap((sample) => [
          sample.y,
          sample.y + (sample.uncertainty || 0),
          sample.y - (sample.uncertainty || 0)
        ])
        .filter(Number.isFinite)
    );
  const yDataMinimum = Math.min(...yExtents, ...fitValues, ...(chart.kind === 'bar' ? [0] : []));
  const yDataMaximum = Math.max(...yExtents, ...fitValues, ...(chart.kind === 'bar' ? [0] : []));
  let yMinimum = appearance.yMin ?? yDataMinimum;
  let yMaximum = appearance.yMax ?? yDataMaximum;
  if (yMaximum <= yMinimum) [yMinimum, yMaximum] = [yDataMinimum, yDataMaximum];
  const yLog = appearance.yScale === 'log' && chart.kind !== 'bar' && yMinimum > 0;
  const yMinimumScaled = yLog ? Math.log10(yMinimum) : yMinimum;
  const yMaximumScaled = yLog ? Math.log10(yMaximum) : yMaximum;
  const yRange = Math.max(yMaximumScaled - yMinimumScaled, 1);
  const rightExtents = [
    ...getYExtents(rightSeries),
    ...fits
      .filter((fit) => fit.yAxis === 'right')
      .flatMap((fit) =>
        fit.samples
          .flatMap((sample) => [
            sample.y,
            sample.y + (sample.uncertainty || 0),
            sample.y - (sample.uncertainty || 0)
          ])
          .filter(Number.isFinite)
      )
  ];
  let rightYMinimum = appearance.rightYMin ?? (rightExtents.length ? Math.min(...rightExtents) : 0);
  let rightYMaximum = appearance.rightYMax ?? (rightExtents.length ? Math.max(...rightExtents) : 1);
  if (rightYMaximum <= rightYMinimum) rightYMaximum = rightYMinimum + 1;
  const rightYLog = appearance.rightYScale === 'log' && rightYMinimum > 0;
  const rightYMinimumScaled = rightYLog ? Math.log10(rightYMinimum) : rightYMinimum;
  const rightYMaximumScaled = rightYLog ? Math.log10(rightYMaximum) : rightYMaximum;
  const rightYRange = Math.max(rightYMaximumScaled - rightYMinimumScaled, 1);
  const pointCount = Math.max(...series.map((item) => item.values.length));
  const requestedDiagnostic = numericX && fits.length > 0 && appearance.fit.diagnostic;
  const diagnosticHeight = requestedDiagnostic
    ? Math.max(
        0,
        Math.min(
          appearance.plotHeight * 0.42,
          appearance.fit.diagnosticHeight,
          appearance.plotHeight - 168
        )
      )
    : 0;
  const diagnosticEnabled = diagnosticHeight >= 60;
  const diagnosticGap = diagnosticEnabled ? 48 : 0;
  const plot = {
    height: appearance.plotHeight - diagnosticHeight - diagnosticGap,
    left: 95,
    top: 30,
    width: appearance.plotWidth
  };
  plot.bottom = plot.top + plot.height;
  const diagnosticPlot = diagnosticEnabled
    ? {
        bottom: plot.bottom + diagnosticGap + diagnosticHeight,
        height: diagnosticHeight,
        left: plot.left,
        top: plot.bottom + diagnosticGap,
        width: plot.width
      }
    : null;
  const width = plot.left + plot.width + (rightSeries.length > 0 ? 105 : 30);
  const height = (diagnosticPlot?.bottom ?? plot.bottom) + 70;
  const suppliedX = series.flatMap((item) => {
    const values =
      item.xValues.length === item.values.length
        ? item.xValues
        : item.values.map((_, index) => index + 1);
    const lower =
      item.xErrorLowValues.length === values.length
        ? item.xErrorLowValues
        : item.xErrorValues.length === values.length
          ? item.xErrorValues
          : values.map(() => 0);
    const upper =
      item.xErrorHighValues.length === values.length
        ? item.xErrorHighValues
        : item.xErrorValues.length === values.length
          ? item.xErrorValues
          : values.map(() => 0);
    const layerExtents = item.uncertaintyLayers
      .filter(isUncertaintyLayerVisible)
      .flatMap((layer) =>
        layer.xErrorValues.length === values.length
          ? values.flatMap((value, index) => [
              value - layer.xErrorValues[index] * getUncertaintySigma(layer),
              value + layer.xErrorValues[index] * getUncertaintySigma(layer)
            ])
          : []
      );
    return [
      ...values.flatMap((value, index) => [value - lower[index], value + upper[index]]),
      ...layerExtents
    ];
  });
  const xDataMinimum = numericX ? Math.min(...suppliedX) : 0;
  const xDataMaximum = numericX ? Math.max(...suppliedX) : Math.max(pointCount - 1, 1);
  let xMinimum = numericX ? (appearance.xMin ?? xDataMinimum) : 0;
  let xMaximum = numericX ? (appearance.xMax ?? xDataMaximum) : Math.max(pointCount - 1, 1);
  if (xMaximum <= xMinimum) [xMinimum, xMaximum] = [xDataMinimum, xDataMaximum];
  const xLog = numericX && appearance.xScale === 'log' && xMinimum > 0;
  const xMinimumScaled = xLog ? Math.log10(xMinimum) : xMinimum;
  const xMaximumScaled = xLog ? Math.log10(xMaximum) : xMaximum;
  const xRange = Math.max(xMaximumScaled - xMinimumScaled, 1);
  const xFor = (item, index) =>
    numericX
      ? plot.left +
        (((xLog
          ? Math.log10(item.xValues[index] ?? index + 1)
          : (item.xValues[index] ?? index + 1)) -
          xMinimumScaled) /
          xRange) *
          plot.width
      : pointCount === 1
        ? plot.left + plot.width / 2
        : plot.left + (index / (pointCount - 1)) * plot.width;
  const yFor = (value) =>
    plot.bottom - (((yLog ? Math.log10(value) : value) - yMinimumScaled) / yRange) * plot.height;
  const rightYFor = (value) =>
    plot.bottom -
    (((rightYLog ? Math.log10(value) : value) - rightYMinimumScaled) / rightYRange) * plot.height;
  const yTicks = yLog
    ? createLogTicks(yMinimum, yMaximum)
    : createScientificTicks(yMinimum, yMaximum, appearance.tickDivisions);
  const grid = yTicks
    .map((value) => {
      const y = yFor(value);
      return `<path d="M ${plot.left} ${y} H ${plot.left + plot.width}" stroke="${appearance.gridColor}" stroke-width="${appearance.gridWidth}" stroke-dasharray="4 6" opacity="0.7" />
      <text x="${plot.left - 12 + appearance.tickOffsetX}" y="${y + 4 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="end">${formatScaleTick(value, yLog)}</text>`;
    })
    .join('');
  const rightTicks =
    rightSeries.length > 0
      ? (rightYLog
          ? createLogTicks(rightYMinimum, rightYMaximum)
          : Array.from(
              { length: 5 },
              (_, index) => rightYMinimum + ((rightYMaximum - rightYMinimum) * index) / 4
            )
        )
          .map((value) => {
            const y = rightYFor(value);
            return `<text x="${plot.left + plot.width + 12}" y="${y + 4}" fill="${appearance.rightTickColor}" font-family="${appearance.rightTickFont}" font-size="${appearance.rightTickSize}" text-anchor="start">${formatScaleTick(value, rightYLog)}</text>`;
          })
          .join('')
      : '';
  const labels = series[0].labels
    .map(
      (label, index) =>
        `<text x="${chart.kind === 'bar' ? plot.left + (index + 0.5) * (plot.width / pointCount) : xFor(series[0], index) + appearance.tickOffsetX}" y="${plot.bottom + 28 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="middle">${escapeSvgText(label)}</text>`
    )
    .join('');
  const xTicks = xLog
    ? createLogTicks(xMinimum, xMaximum)
    : createScientificTicks(xMinimum, xMaximum, appearance.tickDivisions);
  const xGrid = numericX
    ? xTicks
        .map((value) => {
          const x =
            plot.left +
            (((xLog ? Math.log10(value) : value) - xMinimumScaled) / xRange) * plot.width;
          return `<path d="M ${x} ${plot.top} V ${plot.bottom}" stroke="${appearance.gridColor}" stroke-width="${appearance.gridWidth}" stroke-dasharray="4 6" opacity="0.45" />
      ${diagnosticEnabled ? '' : `<text x="${x + appearance.tickOffsetX}" y="${plot.bottom + 28 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="middle">${formatScaleTick(value, xLog)}</text>`}`;
        })
        .join('')
    : '';
  const axisLabels = createAxisLabels(chart.xLabel, chart.yLabel, width, height, plot, appearance);
  const references = createReferenceLines({
    appearance,
    plot,
    xFor: (value) =>
      plot.left + (((xLog ? Math.log10(value) : value) - xMinimumScaled) / xRange) * plot.width,
    xLog,
    xMaximum,
    xMinimum,
    yFor,
    yLog,
    yMaximum,
    yMinimum,
    supportsX: numericX
  });
  const xForValue = (value) =>
    plot.left + (((xLog ? Math.log10(value) : value) - xMinimumScaled) / xRange) * plot.width;
  const palette = ['#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#c4b5fd', '#fb923c'];
  const visibleSeries = series.filter((item) => item.visible);
  const legendSeries = [];
  const data = visibleSeries
    .map((item, index) => {
      const itemAppearance = {
        ...appearance,
        animation: item.animation || appearance.animation,
        animationDelay: item.animationDelay || appearance.animationDelay,
        animationDuration: item.animationDuration || appearance.animationDuration,
        animationEasing: item.animationEasing || appearance.animationEasing,
        dataAlpha: item.dataAlpha === '' ? appearance.dataAlpha : safeAlpha(item.dataAlpha),
        dataColor:
          item.color ||
          (series.length > 1 ? palette[index % palette.length] : appearance.dataColor),
        dataSize:
          item.dataSize === ''
            ? appearance.dataSize
            : safeNumber(item.dataSize, appearance.dataSize),
        dataSymbol: item.symbol ? safeSymbol(item.symbol) : appearance.dataSymbol,
        lineStyle: item.lineStyle ? safeLineStyle(item.lineStyle) : appearance.lineStyle,
        drawMode: getDrawMode(item.draw || appearance.drawMode, chart.kind),
        band: item.band === '' ? appearance.band : isEnabled(item.band),
        bandAlpha: item.bandAlpha === '' ? appearance.bandAlpha : safeAlpha(item.bandAlpha),
        bandColor: item.bandColor || appearance.bandColor,
        bandLine: item.bandLine === '' ? appearance.bandLine : isEnabled(item.bandLine)
      };
      if (isLegendEntryEnabled(item.legend))
        legendSeries.push({ ...item, appearance: itemAppearance });
      const itemYFor = item.yAxis === 'right' ? rightYFor : yFor;
      const points = item.values.map((value, pointIndex) => ({
        x: xFor(item, pointIndex),
        y: itemYFor(value)
      }));
      const errors =
        item.errorValues.length === item.values.length
          ? item.errorValues
          : item.values.map(() => 0);
      const asymmetricErrors = {
        lower: item.errorLowValues.length === item.values.length ? item.errorLowValues : errors,
        upper: item.errorHighValues.length === item.values.length ? item.errorHighValues : errors
      };
      const itemChart = {
        ...chart,
        ...item,
        kind: chart.kind,
        smooth: item.smooth || chart.smooth,
        trendline: item.trendline || chart.trendline
      };
      const markup = scatter
        ? createScatterMarkup(
            itemChart,
            points,
            asymmetricErrors,
            {
              lower:
                item.xErrorLowValues.length === item.values.length
                  ? item.xErrorLowValues
                  : item.xErrorValues,
              upper:
                item.xErrorHighValues.length === item.values.length
                  ? item.xErrorHighValues
                  : item.xErrorValues
            },
            itemYFor,
            (value) =>
              plot.left +
              (((xLog ? Math.log10(value) : value) - xMinimumScaled) / xRange) * plot.width,
            item.xValues.length === item.values.length
              ? item.xValues
              : item.values.map((_, pointIndex) => pointIndex + 1),
            xMinimum,
            xMaximum,
            theme,
            itemAppearance,
            plot
          )
        : chart.kind === 'bar'
          ? createBarMarkup(itemChart, points, plot, itemYFor(0), theme, itemAppearance)
          : createLineMarkup(itemChart, points, errors, itemYFor, theme, itemAppearance, plot);
      const highlightedMarkup = decoratePlotElements(markup, item, itemAppearance.dataColor);
      const seriesStyle = createPlotHighlightStyle(item, itemAppearance.dataColor);
      return seriesStyle
        ? `<g data-neopresent-series="${escapeSvgText(item.name)}" style="${seriesStyle}">${highlightedMarkup}</g>`
        : highlightedMarkup;
    })
    .join('');
  const extraLegendItems = getPlotLegendItems(chart, appearance);
  const referenceLegendItems = appearance.referenceLines
    .filter((reference) => reference.legend)
    .map((reference) => ({
      name: reference.name,
      legendOrder: reference.legendOrder,
      appearance: {
        ...appearance,
        animation: reference.animation,
        animationDelay: reference.animationDelay,
        animationDuration: reference.animationDuration,
        animationEasing: reference.animationEasing,
        dataAlpha: reference.alpha,
        dataColor: reference.color || appearance.referenceColor,
        dataSize: reference.width || appearance.referenceWidth,
        drawMode: 'L',
        lineStyle: reference.dash || appearance.referenceDash
      }
    }));
  const bubbleLegendItems = appearance.bubbleLegend
    ? [
        {
          name: appearance.bubbleLegendLabel || 'Bubble size',
          appearance: {
            ...appearance,
            dataSize: Math.max(1, appearance.bubbleMax - 2),
            drawMode: 'P'
          }
        }
      ]
    : [];
  const uncertaintyLegendItems = visibleSeries.flatMap((item) =>
    item.uncertaintyLayers
      .filter(isUncertaintyLayerVisible)
      .filter(
        (layer) =>
          !['false', 'off', 'no', '0'].includes(
            String(layer.legend ?? '')
              .trim()
              .toLowerCase()
          )
      )
      .map((layer) => {
        const color = safeColor(layer.color, appearance.errorColor);
        const width = Math.max(0.5, safeNumber(layer.width, appearance.errorWidth));
        const alpha = layer.alpha === '' ? appearance.errorAlpha : safeAlpha(layer.alpha);
        return layer.style === 'box' || layer.style === 'ellipse' || layer.style === 'band'
          ? {
              name: layer.name,
              legendOrder: layer.legendOrder,
              bandFill: safeColor(layer.fillColor, color),
              bandFillAlpha:
                layer.fillAlpha === '' ? Math.min(0.22, alpha) : safeAlpha(layer.fillAlpha),
              appearance: {
                ...appearance,
                animation: layer.animation || appearance.animation,
                animationDelay: layer.animationDelay || appearance.animationDelay,
                animationDuration: layer.animationDuration || appearance.animationDuration,
                animationEasing: layer.animationEasing || appearance.animationEasing,
                dataColor: color,
                dataSize: width,
                dataAlpha: alpha,
                drawMode: 'BAND'
              }
            }
          : {
              name: layer.name,
              legendOrder: layer.legendOrder,
              appearance: {
                ...appearance,
                animation: layer.animation || appearance.animation,
                animationDelay: layer.animationDelay || appearance.animationDelay,
                animationDuration: layer.animationDuration || appearance.animationDuration,
                animationEasing: layer.animationEasing || appearance.animationEasing,
                dataColor: color,
                dataSize: width,
                dataAlpha: alpha,
                drawMode: 'E'
              }
            };
      })
  );
  const fitLegendItems = fits
    .filter((fit) => fit.config.draw && fit.config.legend)
    .map((fit) => ({
      legendOrder: fit.config.legendOrder,
      name: fit.config.legendLabel
        ? fit.config.legendLabel
        : fits.length === 1
          ? 'Fit'
          : `${fit.id} fit`,
      appearance: {
        ...appearance,
        animation: fit.config.animation,
        animationDelay: fit.config.animationDelay,
        animationDuration: fit.config.animationDuration,
        animationEasing: fit.config.animationEasing,
        dataColor: fit.config.color,
        dataSize: fit.config.width,
        dataAlpha: fit.config.alpha,
        drawMode: 'L',
        lineStyle: fit.config.lineStyle
      }
    }));
  const fitBandLegendItems = fits
    .filter((fit) => fit.config.band && fit.config.bandLegend)
    .map((fit) => ({
      name: fit.config.bandLegendLabel
        ? fit.config.bandLegendLabel
        : fits.length === 1
          ? 'Fit uncertainty'
          : `${fit.id} uncertainty`,
      bandFill: fit.config.bandColor,
      bandFillAlpha: fit.config.bandAlpha,
      appearance: {
        ...appearance,
        dataColor: fit.config.bandOutlineColor,
        dataSize: fit.config.bandOutlineWidth,
        dataAlpha: fit.config.bandOutlineAlpha,
        drawMode: 'BAND',
        lineStyle: fit.config.bandOutlineStyle
      }
    }));
  const legend = createChartLegend(
    [
      ...legendSeries,
      ...uncertaintyLegendItems,
      ...fitLegendItems,
      ...fitBandLegendItems,
      ...bubbleLegendItems,
      ...referenceLegendItems,
      ...extraLegendItems
    ],
    plot,
    {
      ...appearance,
      legend:
        appearance.legend &&
        (appearance.legendExplicit ||
          legendSeries.length > 1 ||
          uncertaintyLegendItems.length > 0 ||
          fitLegendItems.length > 0 ||
          fitBandLegendItems.length > 0 ||
          bubbleLegendItems.length > 0 ||
          referenceLegendItems.length > 0 ||
          extraLegendItems.length > 0)
    }
  );
  const fitMarkup = numericX
    ? fits
        .map((fit) =>
          createFitMarkup(
            fit,
            xForValue,
            fit.yAxis === 'right' ? rightYFor : yFor,
            appearance,
            plot
          )
        )
        .join('')
    : '';
  const shapes = createPlotShapes(
    chart,
    plot,
    {
      xFor: xForValue,
      yFor,
      xMinimum,
      xMaximum,
      yMinimum,
      yMaximum,
      xLog,
      yLog
    },
    appearance
  );
  const annotations = createPlotAnnotations(chart, plot, appearance, fits);
  const diagnostic = diagnosticPlot
    ? createFitDiagnostic(fits, diagnosticPlot, xForValue, xTicks, xLog, appearance, chart.xLabel)
    : '';
  const clipId = `neopresent-plot-clip-${String(chart.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const scientificAxes = createScientificAxes({
    appearance,
    plot,
    xFor: xForValue,
    xLog,
    xMaximum,
    xMinimum,
    xTicks: numericX ? xTicks : [],
    yFor,
    yLog,
    yMaximum,
    yMinimum,
    yTicks
  });

  return {
    tag: 'div',
    style: { maxWidth: '100%', width: appearance.chartWidth },
    cn: [
      createChartTitle(chart.title, appearance, theme),
      {
        tag: 'div',
        html: `<svg aria-label="${escapeSvgText(chart.title || 'Chart')}" viewBox="0 0 ${width} ${height}" style="height:${appearance.chartHeight};width:min(100%, ${width}px)" xmlns="http://www.w3.org/2000/svg">
          <defs><clipPath id="${clipId}"><rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" /></clipPath></defs>
          <g opacity="${appearance.gridAlpha}">${grid}${xGrid}</g>
          ${scientificAxes}
          ${rightSeries.length > 0 ? `${rightTicks}${createRightAxisLabel(appearance.rightYLabel, plot, appearance)}` : ''}
          ${references}
          <g clip-path="url(#${clipId})">${shapes}</g>
          <g opacity="${appearance.dataAlpha}">${data}</g>
          <g clip-path="url(#${clipId})">${fitMarkup}</g>
          ${diagnostic}
          <g opacity="${appearance.tickAlpha}">${numericX ? '' : labels}</g>
          ${legend}
          ${annotations}
          ${axisLabels}
        </svg>`,
        style: createChartFrameStyle(appearance)
      }
    ].filter(Boolean)
  };
}

function getCustomPalette(style, plotType) {
  const value = (name) => style[`${plotType}-palette-${name}`] ?? style[`palette-${name}`];
  return {
    stops: value('stops'),
    colors: value('colors'),
    red: value('red'),
    green: value('green'),
    blue: value('blue'),
    alpha: value('alpha')
  };
}

function getFitConfigs(chart, theme, fallback) {
  const definitions = chart.getAttribute?.('fitDefinitions');
  const configuredStyle = chart.getAttribute?.('plotStyle');
  const stageConfig = (fit, requestedStage) => {
    if (String(configuredStyle?.['animation-trigger'] ?? '').toLowerCase() !== 'reveal') return fit;
    const stage = Math.max(0, Math.floor(Number(requestedStage) || 0));
    const revealIndex = Number(chart.getAttribute?.('activeRevealIndex') ?? Infinity);
    if (revealIndex < stage) return { ...fit, draw: false };
    if (stage > 0 && revealIndex !== stage)
      return { ...fit, animation: '', bandAnimation: '' };
    return fit;
  };
  if (!Array.isArray(definitions) || definitions.length === 0)
    return [stageConfig(fallback, configuredStyle?.['fit-reveal-stage'])];
  const sharedStyle = Object.fromEntries(
    Object.entries(
      configuredStyle && typeof configuredStyle === 'object' ? configuredStyle : {}
    ).filter(([key]) => !key.startsWith('fit-') && key !== 'fit')
  );
  return definitions
    .filter((definition) => definition && typeof definition === 'object')
    .map(
      (definition) =>
        stageConfig(getPlotAppearance(
          {
            getAttribute(name) {
              return name === 'plotStyle' ? { ...sharedStyle, ...definition.fields } : undefined;
            }
          },
          theme
        ).fit, definition.fields?.['fit-reveal-stage'] ?? configuredStyle?.['fit-reveal-stage'])
    );
}

function scientificPlotFrame(chart, theme, marks, defs = '') {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const animation = String(style.animation ?? 'fade').toLowerCase();
  const duration = normalizeAnimationTime(style['animation-duration'], '900ms');
  const delay = normalizeAnimationTime(style['animation-delay'], '0ms');
  const motion =
    animation === 'draw'
      ? `neopresent-chart-draw ${duration} ease-out ${delay} both`
      : animation === 'rise' || animation === 'grow'
        ? `neopresent-chart-grow ${duration} ease-out ${delay} both`
        : `neopresent-chart-fade ${duration} ease-out ${delay} both`;
  const title = chart.title
    ? createChartTitle(chart.title, getPlotAppearance(chart, theme), theme)
    : null;
  return {
    tag: 'div',
    style: { width: '100%', maxWidth: '900px' },
    cn: [
      ...(title ? [title] : []),
      {
        tag: 'div',
        html: `<svg viewBox="0 0 700 430" style="width:100%;overflow:visible" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs><g style="animation:${motion};transform-origin:center">${marks}</g><path d="M70 25V370H675" fill="none" stroke="${escapeSvgText(theme.border)}" stroke-width="2"/><text x="372" y="415" text-anchor="middle" fill="${escapeSvgText(theme.muted)}" font-size="22">${escapeSvgText(chart.xLabel ?? '')}</text><text x="20" y="198" text-anchor="middle" transform="rotate(-90 20 198)" fill="${escapeSvgText(theme.muted)}" font-size="22">${escapeSvgText(chart.yLabel ?? '')}</text></svg>`
      }
    ]
  };
}

function chartAttribute(chart, name, fallback) {
  return chart[name] ?? chart.getAttribute?.(name) ?? fallback;
}

function numericDomain(values) {
  const finite = values.filter(Number.isFinite);
  const minimum = Math.min(...finite);
  const maximum = Math.max(...finite);
  return [minimum, maximum === minimum ? minimum + 1 : maximum];
}

function createContourView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chartAttribute(chart, 'heatmapYValues', []);
  const z = chart.values ?? [];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const levels = Math.max(2, Math.min(30, Number(style['contour-levels']) || 10));
  const palette = resolvePalette(style['heatmap-palette'] ?? 'kBird', style);
  const [zMin, zMax] = numericDomain(z);
  const cellWidth = 605 / Math.max(1, x.length);
  const cellHeight = 345 / Math.max(1, y.length);
  const cells = z
    .map((value, index) => {
      const column = index % x.length;
      const row = Math.floor(index / x.length);
      if (row >= y.length) return '';
      const level = Math.max(
        0,
        Math.min(levels - 1, Math.floor(((value - zMin) / (zMax - zMin)) * levels))
      );
      const color = samplePalette(palette, level / Math.max(1, levels - 1));
      return `<rect x="${70 + column * cellWidth}" y="${25 + (y.length - row - 1) * cellHeight}" width="${cellWidth + 0.5}" height="${cellHeight + 0.5}" fill="${color}" stroke="${escapeSvgText(style['contour-line-color'] ?? color)}" stroke-width="${Number(style['contour-line-width']) || 0.5}"/>`;
    })
    .join('');
  return scientificPlotFrame(chart, theme, cells);
}

function createQuiverView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chart.values ?? [];
  const u = chartAttribute(chart, 'vectorU', []);
  const v = chartAttribute(chart, 'vectorV', []);
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const [xMin, xMax] = numericDomain(x);
  const [yMin, yMax] = numericDomain(y);
  const scale = Number(style['quiver-scale']) || 22;
  const color = escapeSvgText(style['quiver-color'] ?? theme.accent);
  const arrows = x
    .map((value, index) => {
      const px = 70 + ((value - xMin) / (xMax - xMin)) * 605;
      const py = 370 - ((y[index] - yMin) / (yMax - yMin)) * 345;
      const dx = Number(u[index] ?? 0) * scale;
      const dy = -Number(v[index] ?? 0) * scale;
      return `<line x1="${px}" y1="${py}" x2="${px + dx}" y2="${py + dy}" stroke="${color}" stroke-width="${Number(style['quiver-width']) || 2.2}" marker-end="url(#np-quiver-arrow)"/>`;
    })
    .join('');
  return scientificPlotFrame(
    chart,
    theme,
    arrows,
    `<marker id="np-quiver-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${color}"/></marker>`
  );
}

function createStreamlineView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chart.values ?? [];
  const u = chartAttribute(chart, 'vectorU', []);
  const v = chartAttribute(chart, 'vectorV', []);
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const [xMin, xMax] = numericDomain(x);
  const [yMin, yMax] = numericDomain(y);
  const requestedSteps = Math.max(8, Math.min(200, Number(style['streamline-steps']) || 55));
  const step = Number(style['streamline-step']) || Math.min(xMax - xMin, yMax - yMin) / 35;
  const nearestVector = (px, py) => {
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    x.forEach((value, index) => {
      const candidate = (value - px) ** 2 + (Number(y[index]) - py) ** 2;
      if (candidate < distance) {
        distance = candidate;
        nearest = index;
      }
    });
    return [Number(u[nearest] ?? 0), Number(v[nearest] ?? 0)];
  };
  const seeds = x.filter((_, index) => index % Math.max(1, Math.floor(x.length / 18)) === 0);
  const paths = seeds
    .map((seedX, seedIndex) => {
      let px = seedX;
      let py = Number(y[seedIndex * Math.max(1, Math.floor(x.length / 18))] ?? y[seedIndex] ?? 0);
      const points = [];
      for (let index = 0; index < requestedSteps; index += 1) {
        if (px < xMin || px > xMax || py < yMin || py > yMax) break;
        points.push(
          `${70 + ((px - xMin) / (xMax - xMin)) * 605},${370 - ((py - yMin) / (yMax - yMin)) * 345}`
        );
        const [dx, dy] = nearestVector(px, py);
        const magnitude = Math.hypot(dx, dy);
        if (magnitude < 1e-9) break;
        px += (dx / magnitude) * step;
        py += (dy / magnitude) * step;
      }
      return points.length > 1
        ? `<polyline points="${points.join(' ')}" fill="none" stroke="${escapeSvgText(style['streamline-color'] ?? theme.accent)}" stroke-width="${Number(style['streamline-width']) || 2}" stroke-linecap="round"/>`
        : '';
    })
    .join('');
  return scientificPlotFrame(chart, theme, paths);
}

function createCovarianceView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chart.values ?? [];
  const sx = chartAttribute(chart, 'xErrorValues', chart.errorValues ?? []);
  const sy = chart.errorValues ?? [];
  const rho = chartAttribute(chart, 'covarianceCorrelation', []);
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const [xMin, xMax] = numericDomain(
    x.flatMap((value, index) => [value - Number(sx[index] ?? 0), value + Number(sx[index] ?? 0)])
  );
  const [yMin, yMax] = numericDomain(
    y.flatMap((value, index) => [value - Number(sy[index] ?? 0), value + Number(sy[index] ?? 0)])
  );
  const sigma = Math.max(0.1, Number(style['covariance-sigma']) || 1);
  const fill = escapeSvgText(style['covariance-fill-color'] ?? theme.accent);
  const stroke = escapeSvgText(style['covariance-line-color'] ?? theme.accent);
  const ellipses = x
    .map((value, index) => {
      const ax = (Number(sx[index] ?? 0) * 605) / (xMax - xMin);
      const ay = (Number(sy[index] ?? 0) * 345) / (yMax - yMin);
      const correlation = Math.max(-0.999, Math.min(0.999, Number(rho[index] ?? rho[0] ?? 0)));
      const a = ax ** 2;
      const c = ay ** 2;
      const b = correlation * ax * ay;
      const root = Math.sqrt((a - c) ** 2 + 4 * b ** 2);
      const major = sigma * Math.sqrt(Math.max(0, (a + c + root) / 2));
      const minor = sigma * Math.sqrt(Math.max(0, (a + c - root) / 2));
      const angle = (Math.atan2(2 * b, a - c) * 90) / Math.PI;
      const cx = 70 + ((value - xMin) / (xMax - xMin)) * 605;
      const cy = 370 - ((y[index] - yMin) / (yMax - yMin)) * 345;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${major}" ry="${minor}" transform="rotate(${angle} ${cx} ${cy})" fill="${fill}" fill-opacity="${safeAlpha(style['covariance-fill-alpha'] ?? 0.2)}" stroke="${stroke}" stroke-width="2"/>`;
    })
    .join('');
  return scientificPlotFrame(chart, theme, ellipses);
}

function createDensity2dView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chart.values ?? [];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const [xMin, xMax] = numericDomain(x);
  const [yMin, yMax] = numericDomain(y);
  const grid = Math.max(12, Math.min(70, Number(style['density-grid-size']) || 32));
  const bandwidth = Math.max(0.005, Number(style['density-bandwidth']) || 0.09);
  const densities = [];
  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const nx = (column + 0.5) / grid;
      const ny = (row + 0.5) / grid;
      densities.push(
        x.reduce((sum, value, index) => {
          const dx = (value - xMin) / (xMax - xMin) - nx;
          const dy = (Number(y[index]) - yMin) / (yMax - yMin) - ny;
          return sum + Math.exp(-(dx ** 2 + dy ** 2) / (2 * bandwidth ** 2));
        }, 0)
      );
    }
  }
  const maximum = Math.max(...densities, 1);
  const palette = resolvePalette(style['density-palette'] ?? 'kViridis', style);
  const width = 605 / grid;
  const height = 345 / grid;
  const cells = densities
    .map(
      (density, index) =>
        `<rect x="${70 + (index % grid) * width}" y="${25 + Math.floor(index / grid) * height}" width="${width + 0.4}" height="${height + 0.4}" fill="${samplePalette(palette, density / maximum)}"/>`
    )
    .join('');
  return scientificPlotFrame(chart, theme, cells);
}

function createHexbinView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chart.values ?? [];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const radius = Math.max(5, Math.min(40, Number(style['hexbin-radius']) || 18));
  const [xMin, xMax] = numericDomain(x);
  const [yMin, yMax] = numericDomain(y);
  const bins = new Map();
  x.forEach((value, index) => {
    const px = ((value - xMin) / (xMax - xMin)) * 605;
    const py = ((y[index] - yMin) / (yMax - yMin)) * 345;
    const row = Math.round(py / (radius * 1.5));
    const column = Math.round((px - (row % 2 ? radius * 0.866 : 0)) / (radius * 1.732));
    const key = `${column}:${row}`;
    bins.set(key, (bins.get(key) ?? 0) + 1);
  });
  const maximum = Math.max(...bins.values(), 1);
  const palette = resolvePalette(style['hexbin-palette'] ?? 'kViridis', style);
  const hexagons = [...bins]
    .map(([key, count]) => {
      const [column, row] = key.split(':').map(Number);
      const cx = 70 + column * radius * 1.732 + (row % 2 ? radius * 0.866 : 0);
      const cy = 370 - row * radius * 1.5;
      const points = Array.from(
        { length: 6 },
        (_, i) =>
          `${cx + radius * Math.cos((Math.PI / 3) * i)},${cy + radius * Math.sin((Math.PI / 3) * i)}`
      ).join(' ');
      return `<polygon points="${points}" fill="${samplePalette(palette, count / maximum)}" stroke="${escapeSvgText(theme.background)}" stroke-width="1"/>`;
    })
    .join('');
  return scientificPlotFrame(chart, theme, hexagons);
}

function createViolinView(chart, theme) {
  const values = chart.values ?? [];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const [minimum, maximum] = numericDomain(values);
  const bandwidth = Number(style['violin-bandwidth']) || (maximum - minimum) / 12;
  const samples = Array.from(
    { length: 60 },
    (_, index) => minimum + ((maximum - minimum) * index) / 59
  );
  const density = samples.map((sample) =>
    values.reduce((sum, value) => sum + Math.exp(-0.5 * ((sample - value) / bandwidth) ** 2), 0)
  );
  const maxDensity = Math.max(...density, 1);
  const side = samples.map((sample, index) => ({
    y: 370 - ((sample - minimum) / (maximum - minimum)) * 345,
    w: (density[index] / maxDensity) * 145
  }));
  const path = `M${side.map((point) => `${372 - point.w},${point.y}`).join('L')}L${[...side]
    .reverse()
    .map((point) => `${372 + point.w},${point.y}`)
    .join('L')}Z`;
  const fill = escapeSvgText(style['violin-fill-color'] ?? theme.accent);
  return scientificPlotFrame(
    chart,
    theme,
    `<path d="${path}" fill="${fill}" fill-opacity="${safeAlpha(style['violin-fill-alpha'] ?? 0.42)}" stroke="${fill}" stroke-width="2"/>`
  );
}

function createProfileView(chart, theme) {
  const x = chart.xValues ?? [];
  const y = chart.values ?? [];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const bins = Math.max(2, Math.min(100, Number(chart.bins) || 12));
  const [xMin, xMax] = numericDomain(x);
  const grouped = Array.from({ length: bins }, () => []);
  x.forEach((value, index) => {
    const bin = Math.max(
      0,
      Math.min(bins - 1, Math.floor(((value - xMin) / (xMax - xMin)) * bins))
    );
    grouped[bin].push(Number(y[index]));
  });
  const minimumCount = Math.max(1, Number(style['profile-min-count']) || 1);
  const points = grouped.flatMap((values, index) => {
    if (values.length < minimumCount) return [];
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);
    return [
      {
        x: xMin + ((index + 0.5) / bins) * (xMax - xMin),
        mean,
        error: Math.sqrt(variance / values.length)
      }
    ];
  });
  const [yMin, yMax] = numericDomain(
    points.flatMap((point) => [point.mean - point.error, point.mean + point.error])
  );
  const mapped = points.map((point) => ({
    x: 70 + ((point.x - xMin) / (xMax - xMin)) * 605,
    y: 370 - ((point.mean - yMin) / (yMax - yMin)) * 345,
    error: (point.error / (yMax - yMin)) * 345
  }));
  const color = escapeSvgText(style['data-color'] ?? theme.accent);
  const showErrors = String(style['profile-error'] ?? 'true') !== 'false';
  const marks = `<polyline points="${mapped.map((point) => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>${mapped.map((point) => `${showErrors ? `<path d="M${point.x},${point.y - point.error}V${point.y + point.error}M${point.x - 5},${point.y - point.error}H${point.x + 5}M${point.x - 5},${point.y + point.error}H${point.x + 5}" stroke="${color}"/>` : ''}<circle cx="${point.x}" cy="${point.y}" r="4" fill="${color}"/>`).join('')}`;
  return scientificPlotFrame(chart, theme, marks);
}

function createRidgelineView(chart, theme) {
  const rawSeries = chartAttribute(chart, 'series', []);
  const series = rawSeries.length
    ? rawSeries
    : [{ name: chart.title || 'Distribution', values: chart.values }];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const allValues = series.flatMap((item) => item.values ?? []);
  const [minimum, maximum] = numericDomain(allValues);
  const palette = resolvePalette(style['ridgeline-palette'] ?? 'kBird', style);
  const overlap = Math.max(0.2, Math.min(2.5, Number(style['ridgeline-overlap']) || 1));
  const marks = series
    .map((item, seriesIndex) => {
      const values = item.values ?? [];
      const bandwidth = (maximum - minimum) / 14;
      const samples = Array.from(
        { length: 70 },
        (_, index) => minimum + ((maximum - minimum) * index) / 69
      );
      const density = samples.map((sample) =>
        values.reduce((sum, value) => sum + Math.exp(-0.5 * ((sample - value) / bandwidth) ** 2), 0)
      );
      const maxDensity = Math.max(...density, 1);
      const baseline = 65 + (seriesIndex * 285) / Math.max(1, series.length - 1);
      const path = samples
        .map(
          (sample, index) =>
            `${70 + ((sample - minimum) / (maximum - minimum)) * 605},${baseline - (density[index] / maxDensity) * (75 * overlap)}`
        )
        .join('L');
      const color = samplePalette(palette, seriesIndex / Math.max(1, series.length - 1));
      return `<path d="M70,${baseline}L${path}L675,${baseline}Z" fill="${color}" fill-opacity="${safeAlpha(style['ridgeline-fill-alpha'] ?? 0.48)}" stroke="${color}" stroke-width="2"/><text x="76" y="${baseline - 7}" fill="${escapeSvgText(theme.foreground)}" font-size="16">${escapeSvgText(item.name ?? `Series ${seriesIndex + 1}`)}</text>`;
    })
    .join('');
  return scientificPlotFrame(chart, theme, marks);
}

function createStackedHistogramView(chart, theme) {
  const rawSeries = chartAttribute(chart, 'series', []);
  const series = rawSeries.length ? rawSeries : [{ values: chart.values }];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const allValues = series.flatMap((item) => item.values ?? []);
  const [minimum, maximum] = numericDomain(allValues);
  const bins = Math.max(2, Math.min(100, Number(chart.bins) || 10));
  const counts = series.map((item) => {
    const result = Array.from({ length: bins }, () => 0);
    (item.values ?? []).forEach((value) => {
      const index = Math.max(
        0,
        Math.min(bins - 1, Math.floor(((value - minimum) / (maximum - minimum)) * bins))
      );
      result[index] += 1;
    });
    return result;
  });
  const normalized = String(style['stack-normalized'] ?? 'false') === 'true';
  const totals = Array.from({ length: bins }, (_, bin) =>
    counts.reduce((sum, values) => sum + values[bin], 0)
  );
  const maximumTotal = normalized ? 1 : Math.max(...totals, 1);
  const palette = resolvePalette(style['stack-palette'] ?? 'kBird', style);
  const width = 605 / bins;
  const marks = Array.from({ length: bins }, (_, bin) => {
    let accumulated = 0;
    return counts
      .map((values, seriesIndex) => {
        const value = normalized ? values[bin] / Math.max(1, totals[bin]) : values[bin];
        const height = (value / maximumTotal) * 345;
        const y = 370 - accumulated - height;
        accumulated += height;
        return `<rect x="${70 + bin * width + 1}" y="${y}" width="${Math.max(1, width - 2)}" height="${height}" fill="${samplePalette(palette, seriesIndex / Math.max(1, series.length - 1))}"/>`;
      })
      .join('');
  }).join('');
  return scientificPlotFrame(chart, theme, marks);
}

const STANDARD_MODEL_PARTICLES = [
  ['u', 'up', '≈2.16 MeV/c²', '⅔', '½', 'quark', 0, 0],
  ['c', 'charm', '≈1.27 GeV/c²', '⅔', '½', 'quark', 1, 0],
  ['t', 'top', '≈172.6 GeV/c²', '⅔', '½', 'quark', 2, 0],
  ['d', 'down', '≈4.7 MeV/c²', '−⅓', '½', 'quark', 0, 1],
  ['s', 'strange', '≈93.5 MeV/c²', '−⅓', '½', 'quark', 1, 1],
  ['b', 'bottom', '≈4.18 GeV/c²', '−⅓', '½', 'quark', 2, 1],
  ['e', 'electron', '≈0.511 MeV/c²', '−1', '½', 'lepton', 0, 2],
  ['μ', 'muon', '≈105.7 MeV/c²', '−1', '½', 'lepton', 1, 2],
  ['τ', 'tau', '≈1.777 GeV/c²', '−1', '½', 'lepton', 2, 2],
  ['νₑ', 'electron neutrino', '<0.8 eV/c²', '0', '½', 'lepton', 0, 3],
  ['νμ', 'muon neutrino', '<0.17 MeV/c²', '0', '½', 'lepton', 1, 3],
  ['ντ', 'tau neutrino', '<18.2 MeV/c²', '0', '½', 'lepton', 2, 3],
  ['g', 'gluon', '0', '0', '1', 'boson', 3, 0],
  ['γ', 'photon', '0', '0', '1', 'boson', 3, 1],
  ['Z', 'Z boson', '≈91.19 GeV/c²', '0', '1', 'boson', 3, 2],
  ['W', 'W boson', '≈80.37 GeV/c²', '±1', '1', 'boson', 3, 3],
  ['G', 'graviton', '0', '0', '2', 'gravity', 4, 0],
  ['H', 'Higgs', '≈125.25 GeV/c²', '0', '0', 'higgs', 4, 3]
];

function createScientificDiagramFrame(chart, theme, content, defaultTitle, viewBoxWidth = 700) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const animation = String(style.animation ?? 'fade').toLowerCase();
  const duration = normalizeAnimationTime(style['animation-duration'], '900ms');
  const delay = normalizeAnimationTime(style['animation-delay'], '0ms');
  const revealTriggered = String(style['animation-trigger'] ?? '').toLowerCase() === 'reveal';
  const motion =
    animation === 'rise' || animation === 'grow'
      ? 'neopresent-chart-grow'
      : animation === 'draw'
        ? 'neopresent-chart-draw'
        : 'neopresent-chart-fade';
  return {
    tag: 'div',
    style: { width: '100%', maxWidth: '1100px' },
    html: `<svg aria-label="${escapeSvgText(chart.title || defaultTitle)}" viewBox="0 0 ${viewBoxWidth} 430" style="width:100%;overflow:visible" xmlns="http://www.w3.org/2000/svg"><rect width="${viewBoxWidth}" height="430" rx="18" fill="${escapeSvgText(style['diagram-background'] ?? 'transparent')}"/><g${revealTriggered ? '' : ` style="animation:${motion} ${duration} ease-out ${delay} both;transform-origin:center"`}>${content}</g></svg>`
  };
}

function diagramTime(value, fallback) {
  const text = String(value ?? '').trim();
  if (/^-\d+(?:\.\d+)?$/.test(text)) return { milliseconds: fallback, persistent: true };
  const match = text.match(/^(-?)(\d+(?:\.\d+)?)\s*(ms|s)$/i);
  if (!match) return { milliseconds: fallback, persistent: false };
  return {
    milliseconds: Number(match[2]) * (match[3].toLowerCase() === 's' ? 1000 : 1),
    persistent: match[1] === '-'
  };
}

function createDiagramHighlightPlan(chart, style, prefix, fallbackTarget) {
  const definitions = chartAttribute(chart, 'diagramHighlights', []);
  const revealTriggered = String(style['animation-trigger'] ?? '').toLowerCase() === 'reveal';
  const revealAnimate = chart.getAttribute?.('revealAnimate') !== false;
  const activeRevealIndex = Number(chart.getAttribute?.('activeRevealIndex') ?? Infinity);
  const rawSteps = (definitions.length
    ? definitions
    : String(fallbackTarget ?? '')
        .split(';')
        .map((target) => target.trim())
        .filter(Boolean)
        .map((target) => ({ target })))
    .filter((fields) => {
      const stage = Math.max(0, Math.floor(Number(fields.stage) || 0));
      return !revealTriggered || stage === 0 || stage === activeRevealIndex;
    });
  let cursor = 0;
  const steps = rawSteps.map((fields, index) => {
    const duration = diagramTime(
      fields.duration ?? style[`${prefix}-highlight-duration`] ?? style['highlight-duration'],
      1600
    );
    const explicitDelay = fields.delay ?? style[`${prefix}-highlight-delay`];
    const delay =
      explicitDelay === undefined ? cursor : diagramTime(explicitDelay, cursor).milliseconds;
    if (!duration.persistent) cursor = Math.max(cursor, delay + duration.milliseconds);
    const dimAlpha = Math.max(
      0,
      Math.min(1, Number(fields['dim-alpha'] ?? style[`${prefix}-dim-alpha`] ?? 1))
    );
    return {
      label: String(fields.label ?? fields.target ?? ''),
      targets: String(fields.target ?? '')
        .split(',')
        .map((target) => target.trim().toLowerCase())
        .filter(Boolean),
      effect: String(fields.effect ?? style[`${prefix}-highlight-effect`] ?? 'glow').toLowerCase(),
      color: String(fields.color ?? style[`${prefix}-highlight-color`] ?? '').trim(),
      duration: duration.milliseconds,
      persistent: duration.persistent,
      delay,
      dimAlpha,
      static: revealTriggered && !revealAnimate,
      key: `${String(chart.id).replace(/[^a-zA-Z0-9_-]/g, '')}-${index}`
    };
  });
  const css = steps
    .filter((step) => step.dimAlpha < 1)
    .map(
      (step) =>
        `@keyframes neopresent-diagram-dim-${step.key}{from{opacity:${step.dimAlpha}}to{opacity:${step.dimAlpha}}}`
    )
    .join('');
  return {
    steps,
    definitions: css ? `<style>${css}</style>` : ''
  };
}

function diagramHighlightStyle(plan, matches, originalColor) {
  const animations = [];
  const staticStyles = [];
  let highlightColor = originalColor;
  plan.steps.forEach((step) => {
    if (matches(step.targets)) {
      highlightColor = step.color || originalColor;
      if (step.static) {
        staticStyles.push(
          `filter:drop-shadow(0 0 ${step.effect === 'outline' ? '5px' : '9px'} ${escapeSvgText(highlightColor)}) brightness(1.32) saturate(1.25)`
        );
      } else if (step.effect === 'flow') {
        animations.push(
          `neopresent-plot-flow ${step.duration}ms ease-in-out ${step.delay}ms ${step.persistent ? 'infinite' : '1'}`
        );
      } else if (step.effect === 'outline') {
        animations.push(
          `neopresent-plot-glow ${Math.max(1, step.duration)}ms ease-in-out ${step.delay}ms ${step.persistent ? 'infinite alternate' : '1'}`
        );
      } else {
        animations.push(
          `neopresent-plot-glow ${step.persistent ? step.duration : Math.max(1, step.duration / 2)}ms ease-in-out ${step.delay}ms ${step.persistent ? 'infinite alternate' : '2 alternate'}`
        );
      }
    } else if (step.dimAlpha < 1 && step.static) {
      staticStyles.push(`opacity:${step.dimAlpha}`);
    } else if (step.dimAlpha < 1) {
      animations.push(
        `neopresent-diagram-dim-${step.key} ${step.persistent ? 1 : step.duration}ms linear ${step.delay}ms 1${step.persistent ? ' forwards' : ''}`
      );
    }
  });
  const declarations = [
    ...staticStyles,
    ...(animations.length > 0
      ? [
          `--neopresent-highlight-color:${escapeSvgText(highlightColor)}`,
          `animation:${animations.join(',')}`,
          'transform-box:fill-box',
          'transform-origin:center'
        ]
      : [])
  ];
  return declarations.length > 0 ? `${declarations.join(';')};` : '';
}

function diagramRevealStyle(chart, matches) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  if (String(style['animation-trigger'] ?? '').toLowerCase() !== 'reveal') return '';
  const definitions = chartAttribute(chart, 'diagramReveals', []);
  if (definitions.length === 0) return '';
  let stage = Math.max(0, Math.floor(Number(style['reveal-stage-default']) || 0));
  for (const definition of definitions) {
    const targets = String(definition.target ?? '')
      .split(',')
      .map((target) => target.trim().toLowerCase())
      .filter(Boolean);
    if (matches(targets)) stage = Math.max(0, Math.floor(Number(definition.stage) || 0));
  }
  const revealIndex = Number(chart.getAttribute?.('activeRevealIndex') ?? Infinity);
  if (revealIndex < stage) return 'opacity:0;visibility:hidden;';
  if (stage > 0 && revealIndex === stage && chart.getAttribute?.('revealAnimate') !== false) {
    const animation = String(style.animation ?? 'grow').toLowerCase();
    const name = ['rise', 'grow'].includes(animation) ? 'grow' : 'fade';
    return `animation:neopresent-chart-${name} ${normalizeAnimationTime(style['animation-duration'], '700ms')} ease-out both;transform-box:fill-box;transform-origin:center;`;
  }
  return '';
}

function createStandardModelView(chart, theme) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const colors = {
    quark: style['standard-model-quark-color'] ?? '#b95ee6',
    lepton: style['standard-model-lepton-color'] ?? '#55c83f',
    boson: style['standard-model-boson-color'] ?? '#ef6548',
    higgs: style['standard-model-higgs-color'] ?? '#e9bd26',
    gravity: style['standard-model-gravity-color'] ?? '#5aa6d1'
  };
  const quarkColors = [
    style['standard-model-quark-red'] ?? '#ef4444',
    style['standard-model-quark-green'] ?? '#22c55e',
    style['standard-model-quark-blue'] ?? '#3b82f6'
  ];
  const couplingColor = escapeSvgText(
    style['standard-model-coupling-color'] ?? '#ef4444'
  );
  const couplingFrameWidth = Math.max(
    0,
    Number(style['standard-model-coupling-frame-width'] ?? 0) || 0
  );
  const couplingPanelX = 550;
  const couplingPanelWidth = Math.max(
    120,
    Math.min(196, Number(style['standard-model-coupling-width'] ?? 130) || 130)
  );
  const gravityColumnX = couplingPanelX + couplingPanelWidth;
  const forceCarrierHeadingX = (494 + gravityColumnX + 56) / 2;
  const showNames = String(style['diagram-show-names'] ?? 'true') !== 'false';
  const showDetails = String(style['diagram-show-details'] ?? 'true') !== 'false';
  const showTooltips = String(style['diagram-tooltips'] ?? 'true') !== 'false';
  const labelColor = escapeSvgText(style['diagram-label-color'] ?? theme.foreground);
  const highlightPlan = createDiagramHighlightPlan(
    chart,
    style,
    'standard-model',
    style['standard-model-highlight']
  );
  const cells = STANDARD_MODEL_PARTICLES.map(
    ([symbol, name, mass, charge, spin, family, column, row]) => {
      const x = [82, 198, 314, 438, gravityColumnX][Number(column)];
      const y = 86 + Number(row) * 82;
      const color = escapeSvgText(colors[family]);
      const symbolText = String(symbol);
      const symbolMarkup = symbolText.startsWith('ν')
        ? `ν<tspan baseline-shift="-10%" font-size="60%">${escapeSvgText(symbolText.slice(1).replace('ₑ', 'e'))}</tspan>`
        : escapeSvgText(symbolText);
      let emphasisStyle = diagramHighlightStyle(
        highlightPlan,
        (targets) =>
          targets.some((target) => {
            const normalized = target.replace(/[\s_-]+/g, '');
            const fermion = Number(column) < 3;
            const gaugeBoson = family === 'boson';
            const forceBoson = family === 'boson' || family === 'gravity';
            return (
              target === String(symbol).toLowerCase() ||
              target === String(name).toLowerCase() ||
              target === String(family).toLowerCase() ||
              (['quark', 'quarks'].includes(normalized) && family === 'quark') ||
              (['lepton', 'leptons'].includes(normalized) && family === 'lepton') ||
              (['fermion', 'fermions', 'matter'].includes(normalized) && fermion) ||
              (['boson', 'bosons'].includes(normalized) &&
                !fermion) ||
              (['forcecarrier', 'forcecarriers', 'forceboson', 'forcebosons', 'interactionboson', 'interactionbosons'].includes(normalized) &&
                forceBoson) ||
              (['gaugeboson', 'gaugebosons', 'vectorboson', 'vectorbosons'].includes(normalized) &&
                gaugeBoson) ||
              (['scalarboson', 'scalarbosons', 'higgs'].includes(normalized) &&
                family === 'higgs') ||
              (['gravity', 'graviton', 'hypothetical', 'hypotheticalboson'].includes(normalized) &&
                family === 'gravity') ||
              (['tensorboson', 'tensorbosons'].includes(normalized) && family === 'gravity') ||
              (Number(column) < 3 &&
                [
                  `generation${Number(column) + 1}`,
                  `generation${['i', 'ii', 'iii'][Number(column)]}`
                ].includes(normalized))
            );
          }),
        colors[family]
      );
      const revealStyle = diagramRevealStyle(chart, (targets) =>
        targets.some((target) => {
          const normalized = target.replace(/[\s_-]+/g, '');
          return (
            target === String(symbol).toLowerCase() ||
            target === String(name).toLowerCase() ||
            target === String(family).toLowerCase() ||
            (['quark', 'quarks'].includes(normalized) && family === 'quark') ||
            (['lepton', 'leptons'].includes(normalized) && family === 'lepton') ||
            (['boson', 'bosons', 'forcecarrier', 'forcecarriers'].includes(normalized) && Number(column) >= 3) ||
            (['gaugeboson', 'gaugebosons', 'vectorboson', 'vectorbosons'].includes(normalized) && family === 'boson') ||
            (['higgs', 'scalarboson', 'scalarbosons'].includes(normalized) && family === 'higgs') ||
            (['gravity', 'graviton', 'hypothetical', 'tensorboson', 'tensorbosons'].includes(normalized) && family === 'gravity') ||
            (Number(column) < 3 && [`generation${Number(column) + 1}`, `generation${['i', 'ii', 'iii'][Number(column)]}`].includes(normalized))
          );
        })
      );
      emphasisStyle = revealStyle + emphasisStyle;
      const coupling =
        symbolText === 'g'
          ? { subscript: 's', value: '≈1' }
          : symbolText === 'γ'
            ? { subscript: '', value: '=1/137' }
            : ['Z', 'W'].includes(symbolText)
              ? { subscript: 'w', value: '≈10⁻⁶' }
              : symbolText === 'G'
                ? { subscript: 'g', value: '≈10⁻³⁹' }
                : null;
      const tooltip = showTooltips
        ? `<title>${escapeSvgText(name)} (${escapeSvgText(symbolText.replace('ₑ', 'e'))})&#10;Mass: ${escapeSvgText(mass)}&#10;Charge: ${escapeSvgText(charge)}&#10;Spin: ${escapeSvgText(spin)}&#10;Family: ${escapeSvgText(family)}${Number(column) < 3 ? `&#10;Generation: ${['I', 'II', 'III'][Number(column)]}` : ''}${coupling ? `&#10;Coupling: α${coupling.subscript} ${coupling.value}` : ''}</title>`
        : '';
      const particleBackground =
        family === 'quark'
          ? quarkColors
              .map(
                (quarkColor, index) =>
                  `<circle cx="${x + 47 + index * 9}" cy="${y + 43}" r="17" fill="${escapeSvgText(quarkColor)}" fill-opacity=".78"/>`
              )
              .join('')
          : `<circle cx="${x + 56}" cy="${y + 43}" r="17" fill="${color}" fill-opacity=".82"/>`;
      const couplingMarkup = coupling
        ? `<text x="${x + 104}" y="${y + 15}" text-anchor="end" fill="${couplingColor}" font-size="12" font-weight="700">α${coupling.subscript ? `<tspan baseline-shift="sub" font-size="70%">${coupling.subscript}</tspan>` : ''}</text>`
        : '';
      return `<g opacity="1" style="${emphasisStyle}">${tooltip}<rect x="${x}" y="${y}" width="112" height="78" rx="10" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-width="3"/>${showDetails ? `<text x="${x + 7}" y="${y + 13}" fill="${labelColor}" font-size="8">${escapeSvgText(mass)}</text><text x="${x + 7}" y="${y + 27}" fill="${labelColor}" font-size="8">${escapeSvgText(charge)}</text><text x="${x + 7}" y="${y + 41}" fill="${labelColor}" font-size="8">${escapeSvgText(spin)}</text>` : ''}${couplingMarkup}${particleBackground}<text x="${x + 56}" y="${y + 50}" text-anchor="middle" fill="#111827" font-size="${symbolText.length > 1 ? 19 : 25}" font-weight="600">${symbolMarkup}</text>${showNames ? `<text x="${x + 56}" y="${y + 70}" text-anchor="middle" fill="${labelColor}" font-size="${String(name).length > 13 ? 9 : 12}" font-weight="700">${escapeSvgText(name)}</text>` : ''}</g>`;
    }
  ).join('');
  const gravityCardRight = gravityColumnX + 112;
  const gravityLabelX = gravityCardRight - 8;
  const hypotheticalLabelX = gravityCardRight - 28;
  const higgsLabelX = gravityColumnX + 18;
  const couplingNameX = couplingPanelX + 6;
  const couplingAlphaX = couplingPanelX + couplingPanelWidth * 0.5;
  const couplingOperatorX = couplingPanelX + couplingPanelWidth * 0.68;
  const couplingRightX = couplingPanelX + couplingPanelWidth - 6;
  const couplingTitleX = couplingPanelX + couplingPanelWidth / 2;
  const couplingGroupAliases = [
    'coupling',
    'couplings',
    'couplingconstant',
    'couplingconstants',
    'interaction',
    'interactions',
    'interactionstrength',
    'interactionstrengths'
  ];
  const couplingRevealStyle = diagramRevealStyle(chart, (targets) =>
    targets.some((target) => couplingGroupAliases.includes(target.replace(/[\s_-]+/g, '')))
  );
  const headings = `<text x="254" y="59" text-anchor="middle" fill="${escapeSvgText(theme.muted)}" font-size="12" font-weight="700">THREE GENERATIONS OF MATTER (FERMIONS)</text><text x="${forceCarrierHeadingX}" y="59" text-anchor="middle" fill="${escapeSvgText(theme.muted)}" font-size="12" font-weight="700">FORCE CARRIERS (BOSONS)</text><text x="138" y="80" text-anchor="middle" fill="${escapeSvgText(theme.muted)}" font-size="13" font-weight="700">I</text><text x="254" y="80" text-anchor="middle" fill="${escapeSvgText(theme.muted)}" font-size="13" font-weight="700">II</text><text x="370" y="80" text-anchor="middle" fill="${escapeSvgText(theme.muted)}" font-size="13" font-weight="700">III</text><text x="45" y="185" text-anchor="middle" transform="rotate(-90 50 165)" fill="${escapeSvgText(colors.quark)}" font-size="17" font-weight="700">QUARKS</text><text x="50" y="350" text-anchor="middle" transform="rotate(-90 50 329)" fill="${escapeSvgText(colors.lepton)}" font-size="17" font-weight="700">LEPTONS</text>${showDetails ? `<text x="73" y="99" text-anchor="end" fill="${escapeSvgText(theme.muted)}" font-size="9">mass</text><text x="73" y="113" text-anchor="end" fill="${escapeSvgText(theme.muted)}" font-size="9">charge</text><text x="73" y="127" text-anchor="end" fill="${escapeSvgText(theme.muted)}" font-size="9">spin</text>` : ''}<text x="558" y="353" text-anchor="middle" transform="rotate(-90 558 333)" fill="${escapeSvgText(colors.boson)}" font-size="18" font-weight="700">GAUGE BOSONS</text><text x="570" y="360" text-anchor="middle" transform="rotate(-90 570 333)" fill="${escapeSvgText(colors.boson)}" font-size="13" font-weight="700">VECTOR BOSONS</text><text x="${gravityLabelX}" y="172" text-anchor="end" transform="rotate(-90 ${gravityLabelX} 172)" fill="${escapeSvgText(colors.gravity)}" font-size="18" font-weight="700">TENSOR BOSONS</text><text x="${hypotheticalLabelX}" y="172" text-anchor="end" transform="rotate(-90 ${hypotheticalLabelX} 172)" fill="${escapeSvgText(colors.gravity)}" font-size="13" font-weight="700">HYPOTHETICAL</text><text x="${higgsLabelX}" y="322" text-anchor="start" transform="rotate(-90 ${higgsLabelX} 326)" fill="${escapeSvgText(colors.higgs)}" font-size="18" font-weight="700">SCALAR BOSONS</text>`;
  const couplingRows = [
    ['Strong', 's', '≈', '1', ['strong', 'stronginteraction', 'alphas', 'gluon']],
    ['EM', '', '=', '1/137', ['em', 'electromagnetic', 'photon', 'gamma', 'alpha']],
    ['Weak', 'w', '≈', '10⁻⁶', ['weak', 'weakinteraction', 'alphaw', 'z', 'w']],
    ['Gravity', 'g', '≈', '10⁻³⁹', ['gravity', 'gravitational', 'alphag', 'graviton']]
  ];
  const couplingRowsMarkup = couplingRows
    .map(([name, subscript, operator, value, aliases], index) => {
      const y = 114 + index * 15;
      const alphaMarkup = `α${subscript ? `<tspan baseline-shift="sub" font-size="70%">${subscript}</tspan>` : ''}`;
      let rowEmphasisStyle = diagramHighlightStyle(
        highlightPlan,
        (targets) =>
          targets.some((target) => {
            const normalized = target.replace(/[\s_-]+/g, '');
            return aliases.includes(normalized) || couplingGroupAliases.includes(normalized);
          }),
        couplingColor
      );
      rowEmphasisStyle = couplingRevealStyle + rowEmphasisStyle;
      return `<g style="${rowEmphasisStyle}"><text x="${couplingNameX}" y="${y}" fill="${labelColor}" font-size="9">${name}</text><text x="${couplingAlphaX}" y="${y}" text-anchor="middle" fill="${couplingColor}" font-size="9" font-weight="700">${alphaMarkup}</text><text x="${couplingOperatorX}" y="${y}" text-anchor="middle" fill="${labelColor}" font-size="9">${operator}</text><text x="${couplingRightX}" y="${y}" text-anchor="end" fill="${labelColor}" font-size="9">${value}</text></g>`;
    })
    .join('');
  let couplingHeaderStyle = diagramHighlightStyle(
    highlightPlan,
    (targets) =>
      targets.some((target) => couplingGroupAliases.includes(target.replace(/[\s_-]+/g, ''))),
    couplingColor
  );
  couplingHeaderStyle = couplingRevealStyle + couplingHeaderStyle;
  const couplingPanel = `<g><g style="${couplingHeaderStyle}"><rect x="${couplingPanelX}" y="86" width="${couplingPanelWidth}" height="78" rx="0" fill="${escapeSvgText(theme.surface)}" fill-opacity=".7" stroke="${escapeSvgText(theme.border)}" stroke-width="${couplingFrameWidth}"/><text x="${couplingTitleX}" y="99" text-anchor="middle" fill="${labelColor}" font-size="9" font-weight="800">COUPLING CONSTANTS</text></g>${couplingRowsMarkup}</g>`;
  return createScientificDiagramFrame(
    chart,
    theme,
    highlightPlan.definitions + headings + couplingPanel + cells,
    'Standard Model of Elementary Particles + Gravity',
    900
  );
}

const PERIODIC_ELEMENT_DATA =
  'H:Hydrogen He:Helium Li:Lithium Be:Beryllium B:Boron C:Carbon N:Nitrogen O:Oxygen F:Fluorine Ne:Neon Na:Sodium Mg:Magnesium Al:Aluminium Si:Silicon P:Phosphorus S:Sulfur Cl:Chlorine Ar:Argon K:Potassium Ca:Calcium Sc:Scandium Ti:Titanium V:Vanadium Cr:Chromium Mn:Manganese Fe:Iron Co:Cobalt Ni:Nickel Cu:Copper Zn:Zinc Ga:Gallium Ge:Germanium As:Arsenic Se:Selenium Br:Bromine Kr:Krypton Rb:Rubidium Sr:Strontium Y:Yttrium Zr:Zirconium Nb:Niobium Mo:Molybdenum Tc:Technetium Ru:Ruthenium Rh:Rhodium Pd:Palladium Ag:Silver Cd:Cadmium In:Indium Sn:Tin Sb:Antimony Te:Tellurium I:Iodine Xe:Xenon Cs:Caesium Ba:Barium La:Lanthanum Ce:Cerium Pr:Praseodymium Nd:Neodymium Pm:Promethium Sm:Samarium Eu:Europium Gd:Gadolinium Tb:Terbium Dy:Dysprosium Ho:Holmium Er:Erbium Tm:Thulium Yb:Ytterbium Lu:Lutetium Hf:Hafnium Ta:Tantalum W:Tungsten Re:Rhenium Os:Osmium Ir:Iridium Pt:Platinum Au:Gold Hg:Mercury Tl:Thallium Pb:Lead Bi:Bismuth Po:Polonium At:Astatine Rn:Radon Fr:Francium Ra:Radium Ac:Actinium Th:Thorium Pa:Protactinium U:Uranium Np:Neptunium Pu:Plutonium Am:Americium Cm:Curium Bk:Berkelium Cf:Californium Es:Einsteinium Fm:Fermium Md:Mendelevium No:Nobelium Lr:Lawrencium Rf:Rutherfordium Db:Dubnium Sg:Seaborgium Bh:Bohrium Hs:Hassium Mt:Meitnerium Ds:Darmstadtium Rg:Roentgenium Cn:Copernicium Nh:Nihonium Fl:Flerovium Mc:Moscovium Lv:Livermorium Ts:Tennessine Og:Oganesson'
    .split(' ')
    .map((entry, index) => {
      const [symbol, name] = entry.split(':');
      return { number: index + 1, symbol, name };
    });

const PERIODIC_ROWS = [
  'H . . . . . . . . . . . . . . . . He',
  'Li Be . . . . . . . . . . B C N O F Ne',
  'Na Mg . . . . . . . . . . Al Si P S Cl Ar',
  'K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr',
  'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe',
  'Cs Ba La Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn',
  'Fr Ra Ac Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
].map((row) => row.split(' '));

const PERIODIC_SERIES = [
  'La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu'.split(' '),
  'Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr'.split(' ')
];

function periodicCategory(symbol, group, number) {
  if (number >= 57 && number <= 71) return 'lanthanide';
  if (number >= 89 && number <= 103) return 'actinide';
  if (group === 18) return 'noble';
  if ('F Cl Br I Ts'.split(' ').includes(symbol)) return 'halogen';
  if ('H C N O P S Se'.split(' ').includes(symbol)) return 'nonmetal';
  if ('B Si Ge As Sb Te At'.split(' ').includes(symbol)) return 'metalloid';
  if (group === 1) return 'alkali';
  if (group === 2) return 'alkaline';
  if (number >= 21 && number <= 112 && group >= 3 && group <= 12) return 'transition';
  return 'post-transition';
}

function createPeriodicTableView(chart, theme) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const bySymbol = new Map(PERIODIC_ELEMENT_DATA.map((element) => [element.symbol, element]));
  const colors = {
    alkali: '#ef6a6a',
    alkaline: '#f0a35b',
    transition: '#f4cf64',
    'post-transition': '#8fcf75',
    metalloid: '#55c6a9',
    nonmetal: '#59b8de',
    halogen: '#728fe3',
    noble: '#a679d2',
    lanthanide: '#e982b2',
    actinide: '#cf78b8'
  };
  const highlightPlan = createDiagramHighlightPlan(
    chart,
    style,
    'periodic-table',
    style['periodic-table-highlight']
  );
  const labelColor = escapeSvgText(style['diagram-label-color'] ?? '#111827');
  const showNames = String(style['diagram-show-names'] ?? 'true') !== 'false';
  const showTooltips = String(style['diagram-tooltips'] ?? 'true') !== 'false';
  const cell = (symbol, column, row, series = false) => {
    if (symbol === '.') return '';
    const element = bySymbol.get(symbol);
    if (!element) return '';
    const x = 20 + column * 37;
    const y = (series ? 346 : 57) + row * 40;
    const category = periodicCategory(symbol, column + 1, element.number);
    const period = series ? row + 6 : row + 1;
    const group = series ? 3 : column + 1;
    const fill =
      String(style['periodic-table-color-mode'] ?? 'category') === 'theme'
        ? theme.accent
        : colors[category];
    let emphasisStyle = diagramHighlightStyle(
      highlightPlan,
      (targets) =>
        targets.some((target) => {
          const normalized = target.replace(/[\s_-]+/g, '');
          const metal = [
            'alkali',
            'alkaline',
            'transition',
            'post-transition',
            'lanthanide',
            'actinide'
          ].includes(category);
          const nonmetal = ['nonmetal', 'halogen', 'noble'].includes(category);
          return (
            target === symbol.toLowerCase() ||
            target === String(element.number) ||
            target === element.name.toLowerCase() ||
            target === category ||
            normalized === `${category.replace('-', '')}s` ||
            (['metal', 'metals'].includes(normalized) && metal) ||
            (['nonmetal', 'nonmetals'].includes(normalized) && nonmetal) ||
            (['metalloid', 'metalloids'].includes(normalized) && category === 'metalloid') ||
            (['noblegas', 'noblegases'].includes(normalized) && category === 'noble') ||
            (['transitionmetal', 'transitionmetals'].includes(normalized) &&
              category === 'transition') ||
            normalized === `period${period}` ||
            normalized === `group${group}`
          );
        }),
      fill
    );
    emphasisStyle =
      diagramRevealStyle(chart, (targets) =>
        targets.some((target) => {
          const normalized = target.replace(/[\s_-]+/g, '');
          const metal = ['alkali', 'alkaline', 'transition', 'post-transition', 'lanthanide', 'actinide'].includes(category);
          const nonmetal = ['nonmetal', 'halogen', 'noble'].includes(category);
          return (
            target === symbol.toLowerCase() ||
            target === String(element.number) ||
            target === element.name.toLowerCase() ||
            target === category ||
            normalized === `${category.replace('-', '')}s` ||
            (['metal', 'metals'].includes(normalized) && metal) ||
            (['nonmetal', 'nonmetals'].includes(normalized) && nonmetal) ||
            normalized === `period${period}` ||
            normalized === `group${group}`
          );
        })
      ) + emphasisStyle;
    const tooltip = showTooltips
      ? `<title>${element.number} · ${escapeSvgText(element.name)} (${symbol})&#10;Category: ${escapeSvgText(category)}&#10;Period: ${period}&#10;Group: ${group}</title>`
      : '';
    return `<g style="${emphasisStyle}">${tooltip}<rect x="${x}" y="${y}" width="34" height="37" rx="4" fill="${escapeSvgText(fill)}" fill-opacity=".78" stroke="${escapeSvgText(style['diagram-border-color'] ?? theme.border)}" stroke-width=".8"/><text x="${x + 3}" y="${y + 9}" fill="${labelColor}" font-size="6">${element.number}</text><text x="${x + 17}" y="${y + 24}" text-anchor="middle" fill="${labelColor}" font-size="14" font-weight="700">${symbol}</text>${showNames ? `<text x="${x + 17}" y="${y + 33}" text-anchor="middle" fill="${labelColor}" font-size="4.8">${escapeSvgText(element.name)}</text>` : ''}</g>`;
  };
  const main = PERIODIC_ROWS.map((row, rowIndex) =>
    row.map((symbol, column) => cell(symbol, column, rowIndex)).join('')
  ).join('');
  const showLanthanides = String(style['periodic-table-show-lanthanides'] ?? 'true') !== 'false';
  const showActinides = String(style['periodic-table-show-actinides'] ?? 'true') !== 'false';
  const lower = PERIODIC_SERIES.map((row, rowIndex) => {
    if ((rowIndex === 0 && !showLanthanides) || (rowIndex === 1 && !showActinides)) return '';
    return (
      `<text x="18" y="${365 + rowIndex * 40}" fill="${escapeSvgText(theme.muted)}" font-size="8">${rowIndex === 0 ? '57–71' : '89–103'}</text>` +
      row.map((symbol, column) => cell(symbol, column + 2, rowIndex, true)).join('')
    );
  }).join('');
  return createScientificDiagramFrame(
    chart,
    theme,
    highlightPlan.definitions + main + lower,
    'Periodic Table'
  );
}

function createHeatmapView(chart, theme) {
  const ys = chart.getAttribute?.('heatmapYValues') ?? [];
  const xs = chart.xValues ?? [];
  const count = Math.min(xs.length, ys.length, chart.values.length);
  const xLabels = [...new Set(xs.slice(0, count))];
  const yLabels = [...new Set(ys.slice(0, count))];
  const width = 700,
    height = 420,
    left = 82,
    top = 36,
    plotWidth = 520,
    plotHeight = 310;
  const plotStyle = chart.getAttribute?.('plotStyle') ?? {};
  const paletteName = String(plotStyle['heatmap-palette'] ?? 'viridis');
  const palette = resolvePalette(paletteName, getCustomPalette(plotStyle, 'heatmap'));
  const dataMin = Math.min(...chart.values.slice(0, count)),
    dataMax = Math.max(...chart.values.slice(0, count));
  const requestedMin = Number(plotStyle['heatmap-min']),
    requestedMax = Number(plotStyle['heatmap-max']);
  const min = Number.isFinite(requestedMin)
    ? requestedMin
    : paletteName.toLowerCase() === 'correlation'
      ? -1
      : dataMin;
  const max =
    Number.isFinite(requestedMax) && requestedMax > min
      ? requestedMax
      : paletteName.toLowerCase() === 'correlation'
        ? 1
        : dataMax;
  const cellLabels = ['true', 'yes', 'on'].includes(
    String(plotStyle['heatmap-cell-labels'] ?? '').toLowerCase()
  );
  const cellLabelSize = Math.max(10, Number(plotStyle['heatmap-cell-label-size']) || 24);
  const xAxisLabels = String(plotStyle['heatmap-x-labels'] ?? '')
    .split(',')
    .map((label) => label.trim());
  const yAxisLabels = String(plotStyle['heatmap-y-labels'] ?? '')
    .split(',')
    .map((label) => label.trim());
  const colorLabel = String(plotStyle['heatmap-color-label'] ?? '').trim();
  const styleNumber = (key, fallback) =>
    Number.isFinite(Number(plotStyle[key])) ? Number(plotStyle[key]) : fallback;
  const styleColor = (key, fallback) => String(plotStyle[key] ?? fallback);
  const tickSize = styleNumber('heatmap-tick-size', 32);
  const tickColor = styleColor('heatmap-tick-color', theme.foreground);
  const xTickRotate = styleNumber('heatmap-x-tick-rotate', 0);
  const yTickRotate = styleNumber('heatmap-y-tick-rotate', 0);
  const cellAlpha = Math.max(0, Math.min(1, styleNumber('heatmap-cell-alpha', 1)));
  const cellLabelColor = styleColor('heatmap-cell-label-color', '#ffffff');
  const heatAnimation = ['fade', 'grow', 'rise', 'draw'].includes(
    String(plotStyle.animation ?? '').toLowerCase()
  )
    ? String(plotStyle.animation).toLowerCase()
    : '';
  const heatDuration = String(plotStyle['animation-duration'] ?? '600ms');
  const heatDelay = Number(String(plotStyle['animation-delay'] ?? '0').replace('ms', '')) || 0;
  const heatEasing = String(plotStyle['animation-easing'] ?? 'ease-out');
  const heatDurationMs = Number(heatDuration.replace('ms', '')) || 600;
  const colorbarWidth = styleNumber('heatmap-colorbar-width', 16);
  const colorbarHeight = styleNumber('heatmap-colorbar-height', plotHeight);
  const colorbarOffsetX = styleNumber('heatmap-colorbar-offset-x', 0);
  const colorbarOffsetY = styleNumber('heatmap-colorbar-offset-y', 0);
  const colorbarX = left + plotWidth + 16 + colorbarOffsetX;
  const colorbarY = top + colorbarOffsetY;
  const rangeLabelSize = styleNumber('heatmap-range-label-size', 26);
  const rangeLabelColor = styleColor('heatmap-range-label-color', theme.foreground);
  const minimumLabel = String(plotStyle['heatmap-min-label'] ?? formatChartValue(min));
  const maximumLabel = String(plotStyle['heatmap-max-label'] ?? formatChartValue(max));
  const colorLabelSize = styleNumber('heatmap-color-label-size', 36);
  const colorLabelColor = styleColor('heatmap-color-label-color', theme.foreground);
  const cellBorderColor = String(plotStyle['heatmap-cell-border-color'] ?? theme.background);
  const cellBorderWidth = Math.max(0, Number(plotStyle['heatmap-cell-border-width']) || 1);
  const colorScaleId = `neopresent-heatmap-scale-${String(chart.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const color = (value) => {
    const t = Math.max(0, Math.min(1, (value - min) / Math.max(1e-9, max - min)));
    return samplePalette(palette, t);
  };
  const cells = Array.from({ length: count }, (_, index) => {
    const column = xLabels.indexOf(xs[index]),
      row = yLabels.indexOf(ys[index]);
    const w = plotWidth / Math.max(1, xLabels.length),
      h = plotHeight / Math.max(1, yLabels.length);
    const x = left + column * w,
      y = top + (yLabels.length - row - 1) * h;
    const xTickLabel = xAxisLabels[column] || formatChartValue(xs[index]);
    const yTickLabel = yAxisLabels[row] || formatChartValue(ys[index]);
    const tip = `x=${xTickLabel}; y=${yTickLabel}; value=${formatChartValue(chart.values[index])}`;
    const animation =
      heatAnimation && heatAnimation !== 'draw'
        ? `animation:neopresent-chart-${heatAnimation} ${heatDuration} ${heatEasing} ${heatDelay + index * 35}ms both;transform-box:fill-box;transform-origin:center`
        : '';
    const labelAnimation = heatAnimation
      ? `animation:neopresent-chart-fade 260ms ${heatEasing} ${heatDelay + heatDurationMs + count * 35 + index * 25}ms both`
      : '';
    const label = cellLabels
      ? `<text style="${labelAnimation}" x="${x + w / 2 + styleNumber('heatmap-cell-label-offset-x', 0)}" y="${y + h / 2 + cellLabelSize * 0.35 + styleNumber('heatmap-cell-label-offset-y', 0)}" fill="${cellLabelColor}" font-size="${cellLabelSize}" font-weight="600" text-anchor="middle">${formatChartValue(chart.values[index])}</text>`
      : '';
    return `<rect data-neopresent-tooltip="${escapeSvgText(tip)}" style="${animation}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${color(chart.values[index])}" fill-opacity="${cellAlpha}" stroke="${cellBorderColor}" stroke-width="${cellBorderWidth}"><title>${escapeSvgText(tip)}</title></rect>${label}`;
  }).join('');
  const xTicks = xLabels
    .map((value, index) => {
      const x =
        left +
        ((index + 0.5) * plotWidth) / xLabels.length +
        styleNumber('heatmap-tick-offset-x', 0);
      const y = top + plotHeight + 24 + styleNumber('heatmap-tick-offset-y', 0);
      return createHeatmapSvgLabel(xAxisLabels[index] || formatChartValue(value), {
        x,
        y,
        color: tickColor,
        size: tickSize,
        anchor: xTickRotate ? 'end' : 'middle',
        rotate: xTickRotate
      });
    })
    .join('');
  const yTicks = yLabels
    .map((value, index) => {
      const x = left - 12 + styleNumber('heatmap-tick-offset-x', 0);
      const y =
        top +
        ((yLabels.length - index - 0.5) * plotHeight) / yLabels.length +
        11 +
        styleNumber('heatmap-tick-offset-y', 0);
      return createHeatmapSvgLabel(yAxisLabels[index] || formatChartValue(value), {
        x,
        y,
        color: tickColor,
        size: tickSize,
        anchor: 'end',
        rotate: yTickRotate
      });
    })
    .join('');
  const colorbarAlpha = Math.max(0, Math.min(1, styleNumber('heatmap-colorbar-alpha', cellAlpha)));
  const colorbar = `<rect x="${colorbarX}" y="${colorbarY}" width="${colorbarWidth}" height="${colorbarHeight}" fill="url(#${colorScaleId})" opacity="${colorbarAlpha}"/>`;
  const rangeX = colorbarX + colorbarWidth + 8 + styleNumber('heatmap-range-label-offset-x', 0);
  const rangeLabels =
    createHeatmapSvgLabel(maximumLabel, {
      x: rangeX,
      y: colorbarY + rangeLabelSize + styleNumber('heatmap-range-label-offset-y', 0),
      color: rangeLabelColor,
      size: rangeLabelSize
    }) +
    createHeatmapSvgLabel(minimumLabel, {
      x: rangeX,
      y: colorbarY + colorbarHeight + styleNumber('heatmap-range-label-offset-y', 0),
      color: rangeLabelColor,
      size: rangeLabelSize
    });
  const colorTitleX =
    colorbarX + colorbarWidth + 32 + styleNumber('heatmap-color-label-offset-x', 0);
  const colorTitleY =
    colorbarY + colorbarHeight / 2 + styleNumber('heatmap-color-label-offset-y', 0);
  const colorbarTitle = colorLabel
    ? createHeatmapSvgLabel(colorLabel, {
        x: colorTitleX,
        y: colorTitleY,
        color: colorLabelColor,
        size: colorLabelSize,
        anchor: 'middle',
        rotate: -90,
        width: 300
      })
    : '';
  const axes =
    createHeatmapSvgLabel(chart.xLabel, {
      x: left + plotWidth / 2,
      y: top + plotHeight + 54,
      color: theme.foreground,
      size: 32,
      anchor: 'middle',
      width: 300
    }) +
    createHeatmapSvgLabel(chart.yLabel, {
      x: left - 48,
      y: top + plotHeight / 2,
      color: theme.foreground,
      size: 32,
      anchor: 'middle',
      rotate: -90,
      width: 300
    });
  const drawCells =
    heatAnimation === 'draw'
      ? `animation:neopresent-chart-reveal-x ${heatDuration} ${heatEasing} ${heatDelay}ms both;clip-path:inset(0 100% 0 0)`
      : '';
  const drawLabels =
    heatAnimation === 'draw'
      ? `animation:neopresent-chart-fade 320ms ${heatEasing} ${heatDelay + Number(String(heatDuration).replace('ms', ''))}ms both`
      : '';
  return {
    tag: 'div',
    html: `<svg viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${colorScaleId}" x1="0" y1="1" x2="0" y2="0">${paletteGradientStops(palette)}</linearGradient></defs><rect width="100%" height="100%" fill="${theme.background}"/><g style="${drawCells}">${cells}</g><g style="${drawLabels}">${xTicks}${yTicks}${colorbar}${rangeLabels}${colorbarTitle}${axes}</g></svg>`
  };
}

function createHeatmapSvgLabel(
  value,
  { x, y, color, size, anchor = 'start', rotate = 0, width = 180 }
) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const mathMarkup = createHeatmapMathMarkup(text);
  const transform = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
  if (!mathMarkup) {
    return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}"${transform}>${renderSvgMath(text)}</text>`;
  }
  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  return `<foreignObject x="${left}" y="${y - size}" width="${width}" height="${size * 1.5}"${transform}><div xmlns="http://www.w3.org/1999/xhtml" style="color:${color};font-size:${size}px;line-height:1.2;text-align:${anchor === 'start' ? 'left' : anchor === 'end' ? 'right' : 'center'};white-space:nowrap">${mathMarkup}</div></foreignObject>`;
}

function createHeatmapMathMarkup(value) {
  const source = String(value);
  const pattern = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let markup = '';
  let cursor = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    markup += escapeSvgText(source.slice(cursor, match.index));
    markup += `<span data-katex-source="${escapeSvgText((match[1] ?? match[2]).trim())}" data-katex-display="inline"></span>`;
    cursor = match.index + match[0].length;
  }
  return cursor === 0 ? '' : markup + escapeSvgText(source.slice(cursor));
}

function createSurfaceView(chart, theme) {
  const ys = chart.getAttribute?.('heatmapYValues') ?? [];
  const xs = chart.xValues ?? [];
  const count = Math.min(xs.length, ys.length, chart.values.length);
  const xValues = [...new Set(xs.slice(0, count))];
  const yValues = [...new Set(ys.slice(0, count))];
  const style = chart.getAttribute?.('plotStyle') ?? {};
  const surfaceOverlays = (chart.getAttribute?.('functionOverlays') ?? []).filter(
    (item) => item?.dimension === 3
  );
  const width = 760;
  const height = 470;
  if (xValues.length < 2 || yValues.length < 2) {
    return {
      tag: 'p',
      text: 'A surface plot requires at least a 2 × 2 grid of x, y, and value points.',
      style: { color: '#fb7185', fontSize: '1.2rem' }
    };
  }
  const zValues = chart.values.slice(0, count);
  const overlayZValues = surfaceOverlays.flatMap((item) =>
    Array.isArray(item.values) ? item.values.filter(Number.isFinite) : []
  );
  const zMinimum = Math.min(...zValues, ...overlayZValues);
  const zMaximum = Math.max(...zValues, ...overlayZValues);
  const zSpan = Math.max(1e-9, zMaximum - zMinimum);
  const palette = resolvePalette(
    style['surface-palette'] ?? style['heatmap-palette'] ?? 'viridis',
    getCustomPalette(style, 'surface')
  );
  const meshColor = String(style['surface-mesh-color'] ?? 'rgba(15,23,42,.72)');
  const meshWidth = Math.max(0, Number(style['surface-mesh-width']) || 1.25);
  const alpha = Math.max(0, Math.min(1, Number(style['surface-alpha'] ?? 1)));
  const zLabel = String(style['surface-z-label'] ?? 'Value');
  const styleNumber = (key, fallback) =>
    Number.isFinite(Number(style[key])) ? Number(style[key]) : fallback;
  const styleColor = (key, fallback) => String(style[key] ?? fallback);
  const axisColor = styleColor('surface-axis-color', theme.foreground);
  const axisWidth = Math.max(0, styleNumber('surface-axis-width', 2));
  const tickColor = styleColor('surface-tick-color', theme.muted);
  const tickSize = Math.max(8, styleNumber('surface-tick-size', 24));
  const tickOffsetX = styleNumber('surface-tick-offset-x', 0);
  const tickOffsetY = styleNumber('surface-tick-offset-y', 0);
  const azimuth = Number.isFinite(Number(style['surface-azimuth']))
    ? Number(style['surface-azimuth'])
    : 45;
  const elevation = Number.isFinite(Number(style['surface-elevation']))
    ? Number(style['surface-elevation'])
    : 28;
  const zoom = Number.isFinite(Number(style['surface-zoom']))
    ? Math.max(0.45, Math.min(2.5, Number(style['surface-zoom'])))
    : 1;
  const interactive = !['false', 'off', 'no'].includes(
    String(style['surface-interactive'] ?? 'true').toLowerCase()
  );
  const surfaceAnimation = ['fade', 'grow', 'rise', 'draw', 'wave'].includes(
    String(style['surface-animation'] ?? style.animation ?? '')
      .trim()
      .toLowerCase()
  )
    ? String(style['surface-animation'] ?? style.animation)
        .trim()
        .toLowerCase()
    : '';
  const surfaceAnimationDuration = safeCssTime(
    style['surface-animation-duration'] ?? style['animation-duration'],
    '900ms'
  );
  const surfaceAnimationDelay = safeCssTime(
    style['surface-animation-delay'] ?? style['animation-delay'],
    '0ms'
  );
  const surfaceAnimationEasing = safeEasing(
    style['surface-animation-easing'] ?? style['animation-easing'],
    'cubic-bezier(.2,.8,.2,1)'
  );
  const pointByGrid = new Map();
  const project = (x, y, z) => {
    const angle = (azimuth * Math.PI) / 180;
    const tilt = (elevation * Math.PI) / 180;
    const centeredX = x - 0.5,
      centeredY = y - 0.5;
    const horizontal = centeredX * Math.cos(angle) - centeredY * Math.sin(angle);
    const depth = centeredX * Math.sin(angle) + centeredY * Math.cos(angle);
    return {
      x: 350 + horizontal * 430,
      y: 320 + depth * Math.sin(tilt) * 260 - z * Math.cos(tilt) * 270
    };
  };
  for (let index = 0; index < count; index += 1) {
    const column = xValues.indexOf(xs[index]);
    const row = yValues.indexOf(ys[index]);
    const normalizedX = column / (xValues.length - 1);
    const normalizedY = row / (yValues.length - 1);
    const normalizedZ = (zValues[index] - zMinimum) / zSpan;
    pointByGrid.set(`${column}:${row}`, {
      ...project(normalizedX, normalizedY, normalizedZ),
      normalizedX,
      normalizedY,
      normalizedZ,
      column,
      row,
      xValue: xs[index],
      yValue: ys[index],
      value: zValues[index]
    });
  }
  const paletteColor = (value) => {
    const t = Math.max(0, Math.min(1, (value - zMinimum) / zSpan));
    return samplePalette(palette, t);
  };
  const faces = [];
  for (let row = 0; row < yValues.length - 1; row += 1) {
    for (let column = 0; column < xValues.length - 1; column += 1) {
      const points = [
        pointByGrid.get(`${column}:${row}`),
        pointByGrid.get(`${column + 1}:${row}`),
        pointByGrid.get(`${column + 1}:${row + 1}`),
        pointByGrid.get(`${column}:${row + 1}`)
      ];
      if (points.some((point) => !point)) continue;
      faces.push({
        depth: column + row,
        points,
        value: points.reduce((sum, point) => sum + point.value, 0) / 4
      });
    }
  }
  surfaceOverlays.forEach((overlay, overlayIndex) => {
    const overlayXs = Array.isArray(overlay.xValues) ? overlay.xValues : [];
    const overlayYs = Array.isArray(overlay.yValues) ? overlay.yValues : [];
    const overlayValues = Array.isArray(overlay.values) ? overlay.values : [];
    const overlayCount = Math.min(overlayXs.length, overlayYs.length, overlayValues.length);
    const uniqueXs = [...new Set(overlayXs.slice(0, overlayCount))];
    const uniqueYs = [...new Set(overlayYs.slice(0, overlayCount))];
    if (uniqueXs.length < 2 || uniqueYs.length < 2) return;
    const overlayPoints = new Map();
    for (let index = 0; index < overlayCount; index += 1) {
      const column = uniqueXs.indexOf(overlayXs[index]);
      const row = uniqueYs.indexOf(overlayYs[index]);
      const normalizedX = column / (uniqueXs.length - 1);
      const normalizedY = row / (uniqueYs.length - 1);
      const normalizedZ = (overlayValues[index] - zMinimum) / zSpan;
      overlayPoints.set(`${column}:${row}`, {
        ...project(normalizedX, normalizedY, normalizedZ),
        normalizedX,
        normalizedY,
        normalizedZ,
        column,
        row,
        xValue: overlayXs[index],
        yValue: overlayYs[index],
        value: overlayValues[index]
      });
    }
    const overlayPalette = resolvePalette(
      overlay.palette || style['surface-palette'] || 'viridis',
      getCustomPalette(style, 'surface')
    );
    const overlayAlpha = Math.max(0, Math.min(1, Number(overlay.alpha || 0.55)));
    const overlayMeshColor = String(overlay.meshColor || overlay.color || '#f8fafc');
    const overlayMeshWidth = Math.max(0, Number(overlay.meshWidth || 1.5));
    for (let row = 0; row < uniqueYs.length - 1; row += 1) {
      for (let column = 0; column < uniqueXs.length - 1; column += 1) {
        const points = [
          overlayPoints.get(`${column}:${row}`),
          overlayPoints.get(`${column + 1}:${row}`),
          overlayPoints.get(`${column + 1}:${row + 1}`),
          overlayPoints.get(`${column}:${row + 1}`)
        ];
        if (points.some((point) => !point)) continue;
        const value = points.reduce((sum, point) => sum + point.value, 0) / 4;
        faces.push({
          depth: column + row,
          points,
          value,
          fill: overlay.color
            ? String(overlay.color)
            : samplePalette(overlayPalette, (value - zMinimum) / zSpan),
          alpha: overlayAlpha,
          meshColor: overlayMeshColor,
          meshWidth: overlayMeshWidth,
          name: String(overlay.name ?? `Function ${overlayIndex + 1}`)
        });
      }
    }
  });
  const sortedFaces = faces.sort((a, b) => b.depth - a.depth);
  const animationDurationMs = cssTimeToMilliseconds(surfaceAnimationDuration);
  const animationDelayMs = cssTimeToMilliseconds(surfaceAnimationDelay);
  const automaticFaceDuration = Math.max(120, animationDurationMs * 0.28);
  const automaticStagger =
    sortedFaces.length > 1
      ? Math.max(0, (animationDurationMs - automaticFaceDuration) / (sortedFaces.length - 1))
      : 0;
  const requestedStagger = Number(style['surface-animation-stagger']);
  const faceStagger = Number.isFinite(requestedStagger)
    ? Math.max(0, requestedStagger)
    : automaticStagger;
  const faceAnimation = (index) => {
    if (!['draw', 'wave'].includes(surfaceAnimation)) return '';
    const name = surfaceAnimation === 'wave' ? 'rise' : 'fade';
    const duration = Number.isFinite(requestedStagger)
      ? surfaceAnimationDuration
      : `${automaticFaceDuration}ms`;
    return ` style="opacity:0;animation:neopresent-chart-${name} ${duration} ${surfaceAnimationEasing} ${animationDelayMs + index * faceStagger}ms both;transform-box:fill-box;transform-origin:center"`;
  };
  const polygons = sortedFaces
    .map((face, index) => {
      const coordinates = face.points.map((point) => `${point.x},${point.y}`).join(' ');
      const tip = `${face.name ? `${face.name}; ` : ''}x=${formatChartValue(face.points[0].xValue)}–${formatChartValue(face.points[1].xValue)}; y=${formatChartValue(face.points[0].yValue)}–${formatChartValue(face.points[2].yValue)}; value=${formatChartValue(face.value)}`;
      const vertices = face.points
        .map((point) => `${point.normalizedX},${point.normalizedY},${point.normalizedZ}`)
        .join(';');
      return `<polygon points="${coordinates}" data-neopresent-surface-vertices="${vertices}" fill="${face.fill ?? paletteColor(face.value)}" fill-opacity="${face.alpha ?? alpha}" stroke="${face.meshColor ?? meshColor}" stroke-width="${face.meshWidth ?? meshWidth}" data-neopresent-tooltip="${escapeSvgText(tip)}"${faceAnimation(index)}><title>${escapeSvgText(tip)}</title></polygon>`;
    })
    .join('');
  const origin = project(0, 0, 0);
  const xEnd = project(1, 0, 0);
  const yEnd = project(0, 1, 0);
  const zEnd = project(0, 0, 1);
  const axes = `<g fill="none" stroke="${axisColor}" stroke-width="${axisWidth}" opacity=".9"><path data-neopresent-surface-edge="0,0,0;1,0,0" d="M ${origin.x} ${origin.y} L ${xEnd.x} ${xEnd.y}"/><path data-neopresent-surface-edge="0,0,0;0,1,0" d="M ${origin.x} ${origin.y} L ${yEnd.x} ${yEnd.y}"/><path data-neopresent-surface-edge="0,0,0;0,0,1" d="M ${origin.x} ${origin.y} L ${zEnd.x} ${zEnd.y}"/></g>`;
  const trackedLabel = (text, coordinate, point, options) =>
    `<g data-neopresent-surface-label="${coordinate.join(',')}"${options.tickAxis ? ` data-neopresent-surface-tick="${options.tickAxis}"` : ''} data-surface-label-x="${point.x}" data-surface-label-y="${point.y}">${createHeatmapSvgLabel(text, { x: point.x + options.offsetX, y: point.y + options.offsetY, color: options.color, size: options.size, anchor: options.anchor ?? 'middle' })}</g>`;
  const labels =
    trackedLabel(chart.xLabel || 'x', [1, 0, 0], xEnd, {
      color: styleColor('surface-x-label-color', theme.foreground),
      size: styleNumber('surface-x-label-size', 32),
      offsetX: styleNumber('surface-x-label-offset-x', 18),
      offsetY: styleNumber('surface-x-label-offset-y', 16)
    }) +
    trackedLabel(chart.yLabel || 'y', [0, 1, 0], yEnd, {
      color: styleColor('surface-y-label-color', theme.foreground),
      size: styleNumber('surface-y-label-size', 32),
      offsetX: styleNumber('surface-y-label-offset-x', -20),
      offsetY: styleNumber('surface-y-label-offset-y', 14)
    }) +
    trackedLabel(zLabel, [0, 0, 1], zEnd, {
      color: styleColor('surface-z-label-color', theme.foreground),
      size: styleNumber('surface-z-label-size', 32),
      offsetX: styleNumber('surface-z-label-offset-x', -12),
      offsetY: styleNumber('surface-z-label-offset-y', -8),
      anchor: 'end'
    });
  const automaticTickCount = Math.max(2, Math.min(7, Math.floor(430 / (tickSize * 2.6))));
  const configuredTickCount = Math.max(
    2,
    Math.min(20, Math.trunc(styleNumber('surface-tick-count', automaticTickCount)))
  );
  const selectedTicks = (values, axis) => {
    const count = Math.max(
      2,
      Math.min(20, Math.trunc(styleNumber(`surface-${axis}-tick-count`, configuredTickCount)))
    );
    if (values.length <= count) return values.map((value, index) => ({ value, index }));
    return [
      ...new Set(
        Array.from({ length: count }, (_, index) =>
          Math.round((index * (values.length - 1)) / (count - 1))
        )
      )
    ].map((index) => ({ value: values[index], index }));
  };
  const xTicks = selectedTicks(xValues, 'x')
    .map(({ value, index }) => {
      const coordinate = [index / (xValues.length - 1), 0, 0];
      return trackedLabel(formatChartValue(value), coordinate, project(...coordinate), {
        color: tickColor,
        size: tickSize,
        offsetX: tickOffsetX,
        offsetY: 20 + tickOffsetY,
        tickAxis: 'x'
      });
    })
    .join('');
  const yTicks = selectedTicks(yValues, 'y')
    .map(({ value, index }) => {
      const coordinate = [0, index / (yValues.length - 1), 0];
      return trackedLabel(formatChartValue(value), coordinate, project(...coordinate), {
        color: tickColor,
        size: tickSize,
        offsetX: -12 + tickOffsetX,
        offsetY: 18 + tickOffsetY,
        anchor: 'end',
        tickAxis: 'y'
      });
    })
    .join('');
  const zTicks = Array.from({ length: 5 }, (_, index) => {
    const normalized = index / 4;
    const coordinate = [0, 0, normalized];
    return trackedLabel(
      formatChartValue(zMinimum + normalized * zSpan),
      coordinate,
      project(...coordinate),
      {
        color: tickColor,
        size: tickSize,
        offsetX: -10 + tickOffsetX,
        offsetY: 5 + tickOffsetY,
        anchor: 'end'
      }
    );
  }).join('');
  const scaleId = `neopresent-surface-scale-${String(chart.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const legend = `<linearGradient id="${scaleId}" x1="0" y1="1" x2="0" y2="0">${paletteGradientStops(palette)}</linearGradient>`;
  const colorbarWidth = Math.max(2, styleNumber('surface-colorbar-width', 18));
  const colorbarHeight = Math.max(20, styleNumber('surface-colorbar-height', 250));
  const colorbarX = 704 + styleNumber('surface-colorbar-offset-x', 0);
  const colorbarY = 92 + styleNumber('surface-colorbar-offset-y', 0);
  const colorbarAlpha = Math.max(0, Math.min(1, styleNumber('surface-colorbar-alpha', alpha)));
  const rangeSize = Math.max(8, styleNumber('surface-range-label-size', 24));
  const rangeColor = styleColor('surface-range-label-color', theme.foreground);
  const rangeX = colorbarX + colorbarWidth + 8 + styleNumber('surface-range-label-offset-x', 0);
  const rangeOffsetY = styleNumber('surface-range-label-offset-y', 0);
  const colorLabel = String(style['surface-color-label'] ?? zLabel);
  const colorLabelSize = Math.max(8, styleNumber('surface-color-label-size', 32));
  const colorLabelColor = styleColor('surface-color-label-color', theme.foreground);
  const colorLabelX = colorbarX - 22 + styleNumber('surface-color-label-offset-x', 0);
  const colorLabelY =
    colorbarY + colorbarHeight / 2 + styleNumber('surface-color-label-offset-y', 0);
  const paletteMarkup = `<rect x="${colorbarX}" y="${colorbarY}" width="${colorbarWidth}" height="${colorbarHeight}" fill="url(#${scaleId})" opacity="${colorbarAlpha}"/>${createHeatmapSvgLabel(formatChartValue(zMaximum), { x: rangeX, y: colorbarY + rangeSize + rangeOffsetY, color: rangeColor, size: rangeSize })}${createHeatmapSvgLabel(formatChartValue(zMinimum), { x: rangeX, y: colorbarY + colorbarHeight + rangeOffsetY, color: rangeColor, size: rangeSize })}${createHeatmapSvgLabel(colorLabel, { x: colorLabelX, y: colorLabelY, color: colorLabelColor, size: colorLabelSize, anchor: 'middle', rotate: -90, width: colorbarHeight })}`;
  const surfaceGroupAnimation = ['fade', 'grow', 'rise'].includes(surfaceAnimation)
    ? ` style="animation:neopresent-chart-${surfaceAnimation} ${surfaceAnimationDuration} ${surfaceAnimationEasing} ${surfaceAnimationDelay} both;transform-box:fill-box;transform-origin:center"`
    : '';
  return {
    tag: 'div',
    html: `<svg data-neopresent-surface="true" data-surface-id="${escapeSvgText(chart.id)}" data-surface-azimuth="${azimuth}" data-surface-elevation="${elevation}" data-surface-zoom="${zoom}" data-surface-interactive="${interactive}" viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;touch-action:none;cursor:${interactive ? 'grab' : 'default'}" xmlns="http://www.w3.org/2000/svg"><defs>${legend}</defs><rect width="100%" height="100%" fill="${theme.background}"/><g data-neopresent-surface-scene="true" transform="translate(350 235) scale(${zoom}) translate(-350 -235)"><g data-neopresent-surface-faces="true" data-surface-animation="${surfaceAnimation}"${surfaceGroupAnimation}>${polygons}</g>${axes}${xTicks}${yTicks}${zTicks}${labels}</g>${paletteMarkup}</svg>`
  };
}

function getRenderableSeries(chart) {
  const base = getBaseRenderableSeries(chart);
  const overlays = chart.getAttribute?.('functionOverlays');
  const combined = !Array.isArray(overlays) ? base : [
    ...base,
    ...overlays
      .filter((item) => item?.dimension === 2)
      .map((item, index) => ({
        color: String(item.color ?? ''),
        animation: String(item.animation ?? ''),
        animationDelay: String(item.animationDelay ?? ''),
        animationDuration: String(item.animationDuration ?? ''),
        animationEasing: String(item.animationEasing ?? ''),
        highlightEffect: String(item.highlightEffect ?? ''),
        highlightColor: String(item.highlightColor ?? ''),
        highlightDuration: String(item.highlightDuration ?? ''),
        highlightDelay: String(item.highlightDelay ?? ''),
        highlightIndex: String(item.highlightIndex ?? ''),
        legend: String(item.legend ?? ''),
        legendOrder: String(item.legendOrder ?? ''),
        visible: true,
        dataAlpha: String(item.dataAlpha ?? ''),
        dataSize: String(item.dataSize ?? ''),
        symbol: '',
        lineStyle: String(item.lineStyle ?? ''),
        draw: String(item.draw ?? 'L'),
        band: '',
        bandColor: '',
        bandAlpha: '',
        bandLine: '',
        yAxis: 'left',
        fitAlpha: '',
        fitAnimation: '',
        fitAnimationDelay: '',
        fitAnimationDuration: '',
        fitAnimationEasing: '',
        fitColor: '',
        fitWidth: '',
        errorValues: [],
        errorLowValues: [],
        errorHighValues: [],
        xErrorValues: [],
        xErrorLowValues: [],
        xErrorHighValues: [],
        pointLabelValues: [],
        bubbleSizes: [],
        uncertaintyLayers: [],
        labels: Array.isArray(item.labels) ? item.labels.map(String) : [],
        name: String(item.name ?? `Function ${index + 1}`),
        smooth: false,
        trendline: false,
        values: Array.isArray(item.values) ? item.values.filter(Number.isFinite) : [],
        xValues: Array.isArray(item.xValues) ? item.xValues.filter(Number.isFinite) : []
      }))
      .filter((item) => item.values.length > 0)
  ];
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  if (String(style['animation-trigger'] ?? '').toLowerCase() !== 'reveal') return combined;
  const revealIndex = Number(chart.getAttribute?.('activeRevealIndex') ?? Infinity);
  const fallbackStage = Math.max(0, Math.floor(Number(style['reveal-stage-default']) || 0));
  return combined.map((item) => {
    const stage = Math.max(0, Math.floor(Number(item.revealStage) || fallbackStage));
    let stagedItem = item;
    if (revealIndex < stage)
      stagedItem = {
        ...item,
        animation: 'none',
        color: 'transparent',
        dataAlpha: '0',
        bandAlpha: '0',
        fitAlpha: '0',
        legend: 'false',
        statsStyle: { ...(item.statsStyle ?? {}), 'stats-alpha': '0' },
        uncertaintyLayers: (item.uncertaintyLayers ?? []).map((layer) => ({
          ...layer,
          animation: 'none',
          visible: 'false'
        }))
      };
    else if (stage > 0 && revealIndex !== stage)
      stagedItem = {
        ...item,
        animation: 'none',
        fitAnimation: '',
        uncertaintyLayers: (item.uncertaintyLayers ?? []).map((layer) => ({
          ...layer,
          animation: 'none'
        }))
      };
    return {
      ...stagedItem,
      uncertaintyLayers: (stagedItem.uncertaintyLayers ?? []).map((layer) => {
        if (String(layer.revealStage ?? '').trim() === '') return layer;
        const reveal = getPlotItemRevealState(chart, layer.revealStage);
        if (!reveal.visible) return { ...layer, visible: 'false' };
        return reveal.animate ? layer : { ...layer, animation: 'none' };
      })
    };
  });
}

function getPlotItemRevealState(chart, requestedStage) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  if (String(style['animation-trigger'] ?? '').toLowerCase() !== 'reveal')
    return { animate: true, stage: 0, visible: true };
  const fallbackStage = Math.max(0, Math.floor(Number(style['reveal-stage-default']) || 0));
  const stage = Math.max(0, Math.floor(Number(requestedStage) || fallbackStage));
  const revealIndex = Number(chart.getAttribute?.('activeRevealIndex') ?? Infinity);
  return {
    animate: stage === 0 || revealIndex === stage,
    stage,
    visible: revealIndex >= stage
  };
}

function getBaseRenderableSeries(chart) {
  const configured = chart.getAttribute?.('series');
  if (Array.isArray(configured) && configured.length > 0) {
    const series = configured
      .map((item, index) => ({
        color: String(item?.color ?? ''),
        dataAlpha: String(item?.dataAlpha ?? ''),
        dataSize: String(item?.dataSize ?? ''),
        symbol: String(item?.symbol ?? ''),
        lineStyle: String(item?.lineStyle ?? ''),
        draw: String(item?.draw ?? ''),
        band: String(item?.band ?? ''),
        bandColor: String(item?.bandColor ?? ''),
        bandAlpha: String(item?.bandAlpha ?? ''),
        bandLine: String(item?.bandLine ?? ''),
        yAxis: item?.yAxis === 'right' ? 'right' : 'left',
        animation: String(item?.animation ?? ''),
        animationDelay: String(item?.animationDelay ?? ''),
        animationDuration: String(item?.animationDuration ?? ''),
        animationEasing: String(item?.animationEasing ?? ''),
        revealStage: String(item?.revealStage ?? ''),
        highlightEffect: String(item?.highlightEffect ?? ''),
        highlightColor: String(item?.highlightColor ?? ''),
        highlightDuration: String(item?.highlightDuration ?? ''),
        highlightDelay: String(item?.highlightDelay ?? ''),
        highlightIndex: String(item?.highlightIndex ?? ''),
        histogramEdges: Array.isArray(item?.histogramEdges)
          ? item.histogramEdges.filter(Number.isFinite)
          : [],
        stats: String(item?.stats ?? ''),
        statsTitle: String(item?.statsTitle ?? ''),
        statsX: String(item?.statsX ?? ''),
        statsY: String(item?.statsY ?? ''),
        statsStyle: item?.statsStyle && typeof item.statsStyle === 'object' ? item.statsStyle : {},
        legend: String(item?.legend ?? ''),
        legendOrder: String(item?.legendOrder ?? ''),
        visible: item?.visible !== false,
        fitAlpha: String(item?.fitAlpha ?? ''),
        fitAnimation: String(item?.fitAnimation ?? ''),
        fitAnimationDelay: String(item?.fitAnimationDelay ?? ''),
        fitAnimationDuration: String(item?.fitAnimationDuration ?? ''),
        fitAnimationEasing: String(item?.fitAnimationEasing ?? ''),
        fitColor: String(item?.fitColor ?? ''),
        fitWidth: String(item?.fitWidth ?? ''),
        errorValues: Array.isArray(item?.errorValues)
          ? item.errorValues.filter(Number.isFinite)
          : [],
        errorLowValues: Array.isArray(item?.errorLowValues)
          ? item.errorLowValues.filter(Number.isFinite)
          : [],
        errorHighValues: Array.isArray(item?.errorHighValues)
          ? item.errorHighValues.filter(Number.isFinite)
          : [],
        xErrorValues: Array.isArray(item?.xErrorValues)
          ? item.xErrorValues.filter(Number.isFinite)
          : [],
        xErrorLowValues: Array.isArray(item?.xErrorLowValues)
          ? item.xErrorLowValues.filter(Number.isFinite)
          : [],
        xErrorHighValues: Array.isArray(item?.xErrorHighValues)
          ? item.xErrorHighValues.filter(Number.isFinite)
          : [],
        pointLabelValues: Array.isArray(item?.pointLabelValues)
          ? item.pointLabelValues.map(String)
          : [],
        bubbleSizes: Array.isArray(item?.bubbleSizes)
          ? item.bubbleSizes.filter(Number.isFinite)
          : [],
        uncertaintyLayers: resolveUncertaintyLayers(
          item?.uncertaintyLayers,
          item?.values?.length ?? 0
        ),
        labels: Array.isArray(item?.labels) ? item.labels.map(String) : [],
        name: String(item?.name ?? `Series ${index + 1}`),
        smooth: item?.smooth === true,
        trendline: item?.trendline === true,
        values: Array.isArray(item?.values) ? item.values.filter(Number.isFinite) : [],
        xValues: Array.isArray(item?.xValues) ? item.xValues.filter(Number.isFinite) : []
      }))
      .filter((item) => item.values.length > 0);
    if (series.length > 0)
      return series.map((item) => ({
        ...item,
        labels:
          item.labels.length === item.values.length
            ? item.labels
            : item.values.map((_, index) => String(index + 1))
      }));
  }
  return [
    {
      color: '',
      animation: '',
      animationDelay: '',
      animationDuration: '',
      animationEasing: '',
      highlightEffect: '',
      highlightColor: '',
      highlightDuration: '',
      highlightDelay: '',
      highlightIndex: '',
      legend: '',
      legendOrder: '',
      visible: true,
      dataAlpha: '',
      dataSize: '',
      symbol: '',
      lineStyle: '',
      draw: '',
      band: '',
      bandColor: '',
      bandAlpha: '',
      bandLine: '',
      yAxis: 'left',
      fitAlpha: '',
      fitAnimation: '',
      fitAnimationDelay: '',
      fitAnimationDuration: '',
      fitAnimationEasing: '',
      fitColor: '',
      fitWidth: '',
      errorValues: chart.errorValues ?? [],
      errorLowValues: chart.getAttribute?.('asymmetricErrors')?.lower ?? [],
      errorHighValues: chart.getAttribute?.('asymmetricErrors')?.upper ?? [],
      xErrorValues: chart.getAttribute?.('xErrorValues') ?? [],
      xErrorLowValues: chart.getAttribute?.('asymmetricXErrors')?.lower ?? [],
      xErrorHighValues: chart.getAttribute?.('asymmetricXErrors')?.upper ?? [],
      pointLabelValues: chart.getAttribute?.('pointLabelValues') ?? [],
      bubbleSizes: chart.getAttribute?.('bubbleSizes') ?? [],
      uncertaintyLayers: resolveUncertaintyLayers(
        chart.getAttribute?.('uncertaintyLayers'),
        chart.values.length
      ),
      labels: chart.labels,
      name: 'Series 1',
      smooth: chart.smooth,
      trendline: chart.trendline,
      values: chart.values,
      xValues: chart.xValues ?? []
    }
  ];
}

function createChartLegend(series, plot, appearance) {
  if (!appearance.legend || series.length === 0) return '';
  const orderedSeries = series
    .map((item, index) => {
      const requestedOrder = String(item.legendOrder ?? '').trim();
      return {
        item,
        index,
        // An explicit order is a one-based slot among the natural series
        // order. This lets a reference with `legend-order: 4` follow three
        // ordinary (unordered) legend entries.
        order: requestedOrder === '' ? index + 1 : Number(requestedOrder)
      };
    })
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.order) ? left.order : left.index + 1;
      const rightOrder = Number.isFinite(right.order) ? right.order : right.index + 1;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ item }) => item);
  const fontSize = appearance.legendSize;
  const labels = appearance.legendLabels
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  const columns = Math.max(1, Math.min(8, appearance.legendColumns));
  const entryWidth = Math.max(
    100,
    Math.min(
      220,
      Math.max(...orderedSeries.map((item, index) => (labels[index] || item.name).length)) *
        fontSize *
        0.62 +
        56
    )
  );
  const rows = Math.ceil(orderedSeries.length / columns);
  const legendWidth = entryWidth * columns;
  const legendHeight = rows * (fontSize + 10) + 12;
  const position = appearance.legendPosition;
  const x =
    (position.includes('right')
      ? plot.left + plot.width - legendWidth - 8
      : position.includes('center')
        ? plot.left + (plot.width - legendWidth) / 2
        : plot.left + 10) + appearance.legendOffsetX;
  const y =
    (position.includes('bottom')
      ? plot.bottom - legendHeight - 6
      : position.includes('middle')
        ? plot.top + (plot.height - legendHeight) / 2
        : plot.top + 6) + appearance.legendOffsetY;
  const entries = orderedSeries
    .map((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cx = x + 13 + column * entryWidth;
      const cy = y + 14 + row * (fontSize + 10);
      const style = item.appearance;
      const mode = style.drawMode === 'BAND' ? 'BAND' : getDrawMode(style.drawMode, 'line');
      const band =
        mode === 'BAND'
          ? `<rect x="${cx - 9}" y="${cy - 5}" width="18" height="10" fill="${item.bandFill || style.dataColor}" fill-opacity="${item.bandFillAlpha ?? 0.18}" stroke="${style.dataColor}" stroke-width="${Math.max(1, style.dataSize)}" stroke-opacity="${style.dataAlpha}" stroke-dasharray="${style.lineStyle || 'none'}" />`
          : '';
      const sample = mode.includes('L')
        ? `<path d="M ${cx - 8} ${cy} H ${cx + 8}" stroke="${style.dataColor}" stroke-width="${Math.max(2, style.dataSize * 0.55)}" stroke-dasharray="${style.lineStyle || 'none'}" stroke-linecap="round" />`
        : '';
      const error = mode.includes('E')
        ? `<path d="M ${cx} ${cy - 6} V ${cy + 6} M ${cx - 3} ${cy - 6} H ${cx + 3} M ${cx - 3} ${cy + 6} H ${cx + 3}" stroke="${style.dataColor}" stroke-width="1.5" />`
        : '';
      const marker = mode.includes('P')
        ? createPointSymbol(
            { x: cx, y: cy },
            { ...style, dataSize: Math.max(3, style.dataSize * 0.6) },
            '',
            ''
          )
        : '';
      const label = labels[index] || item.name;
      const mathMarkup = createHeatmapMathMarkup(label);
      // Keep legend text visually attached to its line/marker sample. This is
      // especially noticeable with a KaTeX label inside a foreignObject.
      const labelX = cx + 11;
      // KaTeX centers its inline output within some browser foreignObject
      // implementations. A content-sized box avoids a large apparent gap.
      const mathWidth = Math.max(
        52,
        Math.min(
          entryWidth - 38,
          Math.ceil(String(label).replace(/\$[^$]*\$/g, 'MM').length * fontSize * 0.66 + 18)
        )
      );
      const text = mathMarkup
        ? `<foreignObject x="${labelX}" y="${cy - fontSize * 0.76}" width="${mathWidth}" height="${fontSize * 1.6}"><div class="neopresent-legend-math" xmlns="http://www.w3.org/1999/xhtml" style="color:${appearance.legendColor};opacity:${appearance.legendAlpha};font-family:${appearance.legendFont};font-size:${fontSize}px;line-height:1.2;text-align:left;white-space:nowrap"><style>.neopresent-legend-math .katex{font-size:1em !important}</style>${mathMarkup}</div></foreignObject>`
        : `<text x="${labelX}" y="${cy + fontSize * 0.34}" fill="${appearance.legendColor}" opacity="${appearance.legendAlpha}" font-family="${appearance.legendFont}" font-size="${fontSize}">${escapeSvgText(label)}</text>`;
      return `<g style="${createLegendAnimation(style)}">${band}${sample}${error}${marker}${text}</g>`;
    })
    .join('');
  return `<g data-neopresent-chart-legend="true">${entries}</g>`;
}

function isLegendEntryEnabled(value) {
  return !['false', 'off', 'no', '0'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase()
  );
}

function createLegendAnimation(appearance) {
  if (!appearance.animation) return '';
  const duration = Math.max(
    120,
    Math.min(320, Math.round(cssTimeToMilliseconds(appearance.animationDuration) * 0.3))
  );
  return `opacity:0;animation:neopresent-chart-fade ${duration}ms ${appearance.animationEasing} ${appearance.animationDelay} both;transform-box:fill-box;transform-origin:center`;
}

function getPlotLegendItems(chart, appearance) {
  const configured = chart.getAttribute?.('legendItems');
  if (!Array.isArray(configured)) return [];
  return configured
    .map((item) => ({
      name: String(item?.name ?? '').trim(),
      legendOrder: String(item?.['legend-order'] ?? item?.order ?? ''),
      appearance: {
        ...appearance,
        dataColor: safeColor(item?.color, appearance.dataColor),
        dataSize: Math.max(
          1,
          safeNumber(item?.['line-width'] ?? item?.['data-size'], appearance.dataSize)
        ),
        dataSymbol: safeSymbol(item?.symbol ?? item?.['data-symbol']),
        lineStyle: safeLineStyle(item?.['line-style']),
        drawMode: getDrawMode(item?.draw ?? 'L', 'line')
      }
    }))
    .filter((item) => item.name);
}

function createPlotShapes(chart, plot, scales, appearance) {
  const shapes = chart.getAttribute?.('shapes');
  if (!Array.isArray(shapes)) return '';
  const number = (value, fallback = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;
  const x = (value) => scales.xFor(value);
  const y = (value) => scales.yFor(value);
  return shapes
    .map((shape) => {
      const reveal = getPlotItemRevealState(chart, shape['reveal-stage']);
      if (!reveal.visible) return '';
      const renderedShape = reveal.animate ? shape : { ...shape, animation: '' };
      const kind = String(shape.kind || '').toLowerCase();
      const stroke = safeColor(shape.color ?? shape['line-color'], appearance.dataColor);
      const fill = ['false', 'none', 'off', 'no'].includes(String(shape.fill ?? '').toLowerCase())
        ? 'none'
        : safeColor(shape['fill-color'] ?? shape.fill, stroke);
      const alpha = safeAlpha(shape.alpha ?? '1');
      const fillAlpha = safeAlpha(shape['fill-alpha'] ?? shape.alpha ?? '0.18');
      const width = Math.max(0.5, safeNumber(shape['line-width'], 2));
      const dash = safeLineStyle(shape['line-style']);
      const animation = createPlotShapeAnimation(renderedShape, kind);
      const common = `stroke="${stroke}" stroke-width="${width}" stroke-dasharray="${dash || 'none'}" stroke-opacity="${alpha}" fill="${fill}" fill-opacity="${fill === 'none' ? 0 : fillAlpha}"`;
      const x1 = x(number(shape.x ?? shape.x1));
      const y1 = y(number(shape.y ?? shape.y1));
      if (kind === 'circle' || kind === 'ellipse') {
        const rx = Math.abs(
          x(number(shape.x ?? shape.x1) + number(shape.rx ?? shape.r ?? shape.radius, 1)) - x1
        );
        const ry = Math.abs(
          y(number(shape.y ?? shape.y1) + number(shape.ry ?? shape.r ?? shape.radius, 1)) - y1
        );
        return `<g data-neopresent-shape="${kind}" style="${animation}"><ellipse cx="${x1}" cy="${y1}" rx="${rx}" ry="${ry}" ${common} /></g>`;
      }
      const x2 = x(number(shape.x2 ?? number(shape.x ?? shape.x1) + number(shape.width, 1)));
      const y2 = y(number(shape.y2 ?? number(shape.y ?? shape.y1) + number(shape.height, 1)));
      if (kind === 'box' || kind === 'rect' || kind === 'rectangle')
        return `<g data-neopresent-shape="${kind}" style="${animation}"><rect x="${Math.min(x1, x2)}" y="${Math.min(y1, y2)}" width="${Math.abs(x2 - x1)}" height="${Math.abs(y2 - y1)}" ${common} /></g>`;
      const end =
        kind === 'arrow' ? createArrowHead(x1, y1, x2, y2, shape, stroke, width, alpha) : '';
      return `<g data-neopresent-shape="${kind}" style="${animation}"><path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-dasharray="${dash || 'none'}" stroke-opacity="${alpha}" stroke-linecap="round" />${end}</g>`;
    })
    .join('');
}

function createPlotShapeAnimation(shape, kind) {
  const requested = String(shape.animation ?? '')
    .trim()
    .toLowerCase();
  if (!['fade', 'rise', 'grow', 'draw'].includes(requested)) return '';
  const lineLike = kind === 'line' || kind === 'arrow';
  const name = requested === 'draw' ? (lineLike ? 'reveal-x' : 'grow') : requested;
  const duration = safeCssTime(shape['animation-duration'], '600ms');
  const delay = safeCssTime(shape['animation-delay'], '0ms');
  const easing = safeEasing(shape['animation-easing'], 'cubic-bezier(.2,.8,.2,1)');
  const clip = name === 'reveal-x' ? 'clip-path:inset(0 100% 0 0);' : '';
  return `${clip}animation:neopresent-chart-${name} ${duration} ${easing} ${delay} both;transform-box:fill-box;transform-origin:center`;
}

function createArrowHead(x1, y1, x2, y2, shape, color, lineWidth, alpha) {
  const length = Math.max(4, safeNumber(shape['head-size'], 12));
  const angle = (Math.max(8, Math.min(80, safeNumber(shape['head-angle'], 28))) * Math.PI) / 180;
  const direction = Math.atan2(y2 - y1, x2 - x1);
  const arm = Math.max(1, length / Math.cos(angle));
  const left = [x2 - arm * Math.cos(direction - angle), y2 - arm * Math.sin(direction - angle)];
  const right = [x2 - arm * Math.cos(direction + angle), y2 - arm * Math.sin(direction + angle)];
  const style = String(shape['head-style'] ?? 'filled')
    .trim()
    .toLowerCase();
  const open = ['open', 'line', 'none'].includes(style);
  if (style === 'none') return '';
  return `<path d="M ${left[0]} ${left[1]} L ${x2} ${y2} L ${right[0]} ${right[1]}${open ? '' : ' Z'}" fill="${open ? 'none' : color}" stroke="${color}" stroke-width="${lineWidth}" stroke-opacity="${alpha}" stroke-linejoin="round" />`;
}

function createParametricFits(config, series) {
  if (!config.expression) return [];
  const selected = config.all
    ? series
    : [series.find((item) => item.name === config.series) ?? series[0]];
  const baseDelay = cssTimeToMilliseconds(config.animationDelay);
  const stagger = cssTimeToMilliseconds(config.animationStagger);
  return selected
    .map((item, index) =>
      createParametricFit(
        {
          ...config,
          alpha: item.fitAlpha === '' ? config.alpha : safeAlpha(item.fitAlpha),
          animation: item.fitAnimation || config.animation,
          animationDelay: item.fitAnimationDelay || `${Math.round(baseDelay + index * stagger)}ms`,
          animationDuration: item.fitAnimationDuration || config.animationDuration,
          animationEasing: item.fitAnimationEasing || config.animationEasing,
          color: item.fitColor || config.color,
          id: config.all ? safeFitIdentifier(item.name, `fit-${index + 1}`) : config.id,
          width: item.fitWidth === '' ? config.width : safeNumber(item.fitWidth, config.width)
        },
        item
      )
    )
    .filter(Boolean);
}

function createParametricFit(config, data) {
  if (!config.expression) return null;
  const x = data.xValues.length === data.values.length ? data.xValues : [];
  if (x.length < 2) return null;
  const lower = config.xMin ?? Math.min(...x);
  const upper = config.xMax ?? Math.max(...x);
  if (upper <= lower) return null;
  const isIncluded = (value) =>
    config.ranges.length === 0 ||
    config.ranges.some(([minimum, maximum]) => value >= minimum && value <= maximum);
  const isExcluded = (value) =>
    config.exclude.some(([minimum, maximum]) => value >= minimum && value <= maximum);
  const selected = x
    .map((value, index) => index)
    .filter((index) => {
      const value = x[index];
      return value >= lower && value <= upper && isIncluded(value) && !isExcluded(value);
    });
  if (selected.length < 2) return null;
  const parameters = parseFitParameters(config.params);
  if (parameters.length === 0) return null;
  const evaluate = compileFitFunction(
    config.expression,
    parameters.map((parameter) => parameter.name)
  );
  if (!evaluate) return null;
  const bounds = getFitBounds(parameters, config.bounds);
  let values = constrainFitValues(
    parameters.map((parameter) => parameter.value),
    bounds
  );
  const errors =
    data.errorValues.length === data.values.length ? data.errorValues : data.values.map(() => 0);
  const lowerErrors =
    data.errorLowValues.length === data.values.length ? data.errorLowValues : errors;
  const upperErrors =
    data.errorHighValues.length === data.values.length ? data.errorHighValues : errors;
  const asymmetric =
    data.errorLowValues.length === data.values.length ||
    data.errorHighValues.length === data.values.length;
  const errorForResidual = (index, residual) =>
    residual >= 0 ? upperErrors[index] : lowerErrors[index];
  if (config.method === 'poisson' && selected.some((index) => data.values[index] < 0)) return null;
  const linearSolution =
    asymmetric || config.method === 'poisson'
      ? null
      : solveLinearFit(
          config.expression,
          parameters,
          x,
          data.values,
          errors,
          selected,
          config.useErrors
        );
  if (linearSolution) values = constrainFitValues(linearSolution, bounds);
  const cost = (candidate) =>
    selected.reduce((total, index) => {
      const value = x[index];
      const prediction = evaluate(value, candidate);
      if (config.method === 'poisson') {
        if (!(prediction > 0) || !Number.isFinite(prediction)) return Number.POSITIVE_INFINITY;
        const observed = data.values[index];
        return (
          total +
          2 *
            (prediction -
              observed +
              (observed > 0 ? observed * Math.log(observed / prediction) : 0))
        );
      }
      const residual = data.values[index] - prediction;
      const error = errorForResidual(index, residual);
      const weight = config.useErrors && error > 0 ? 1 / error ** 2 : 1;
      return total + weight * residual ** 2;
    }, 0);
  let current = cost(values);
  if (!Number.isFinite(current)) return null;
  if (!linearSolution) {
    const optimized = optimizeNonlinearFit(
      evaluate,
      values,
      x,
      data.values,
      lowerErrors,
      upperErrors,
      selected,
      config.useErrors,
      config.method,
      current,
      bounds
    );
    values = optimized.values;
    current = optimized.cost;
  }
  const covariance =
    config.band || config.method === 'poisson' || config.correlation
      ? calculateFitCovariance(
          evaluate,
          values,
          x,
          errors,
          selected,
          config.useErrors,
          config.method,
          current
        )
      : null;
  const residualVariance = current / Math.max(1, selected.length - values.length);
  const measurementVariance = config.useErrors
    ? selected.reduce(
        (total, index) => total + (lowerErrors[index] ** 2 + upperErrors[index] ** 2) / 2,
        0
      ) / selected.length
    : residualVariance;
  const minimum = lower;
  const maximum = upper;
  const samples = Array.from({ length: config.samples }, (_, index) => {
    const sampleX = minimum + ((maximum - minimum) * index) / (config.samples - 1);
    const prediction = evaluate(sampleX, values);
    const modelUncertainty = covariance
      ? calculateModelUncertainty(evaluate, sampleX, values, covariance)
      : Number.NaN;
    const uncertainty = Number.isFinite(modelUncertainty)
      ? Math.sqrt(
          modelUncertainty ** 2 + (config.bandKind === 'prediction' ? measurementVariance : 0)
        ) * config.bandSigma
      : Number.NaN;
    return { x: sampleX, y: prediction, uncertainty };
  });
  const sigma = Math.sqrt(current / Math.max(1, selected.length - values.length));
  const uncertainties = values.map((value, index) => {
    const step = Math.max(Math.abs(value) * 1e-4, 1e-5);
    const plus = [...values];
    plus[index] += step;
    const minus = [...values];
    minus[index] -= step;
    const derivative = selected.map(
      (row) => (evaluate(x[row], plus) - evaluate(x[row], minus)) / (2 * step)
    );
    const information = derivative.reduce((sum, entry, row) => {
      const residual = data.values[selected[row]] - evaluate(x[selected[row]], values);
      const error = errorForResidual(selected[row], residual);
      return sum + entry ** 2 * (config.useErrors && error > 0 ? 1 / error ** 2 : 1);
    }, 0);
    if (config.method === 'poisson' && covariance?.[index]?.[index] > 0)
      return Math.sqrt(covariance[index][index]);
    return information > 0 ? sigma / Math.sqrt(information) : Number.NaN;
  });
  const hasMeasurementErrors =
    config.useErrors && [...lowerErrors, ...upperErrors].some((error) => error > 0);
  const degreesOfFreedom = Math.max(0, selected.length - values.length);
  const correlation = covariance
    ? covariance.map((row, rowIndex) =>
        row.map((entry, columnIndex) => {
          const denominator = Math.sqrt(
            Math.max(0, covariance[rowIndex][rowIndex] * covariance[columnIndex][columnIndex])
          );
          return denominator > 0 ? Math.max(-1, Math.min(1, entry / denominator)) : Number.NaN;
        })
      )
    : null;
  return {
    config,
    expression: config.expression,
    parameters: parameters.map((parameter, index) => ({
      ...parameter,
      error: uncertainties[index],
      value: values[index]
    })),
    covariance,
    correlation,
    quality: {
      cost: current,
      degreesOfFreedom,
      rmse: Math.sqrt(current / Math.max(1, selected.length)),
      weighted: hasMeasurementErrors,
      method: config.method,
      pValue: degreesOfFreedom > 0 ? chiSquareSurvival(current, degreesOfFreedom) : Number.NaN
    },
    id: config.id || 'fit',
    diagnosticPoints: selected.map((index) => {
      const residual = data.values[index] - evaluate(x[index], values);
      const error = residual >= 0 ? upperErrors[index] : lowerErrors[index];
      return {
        error,
        residual,
        pull: error > 0 ? residual / error : Number.NaN,
        x: x[index]
      };
    }),
    samples,
    yAxis: data.yAxis === 'right' ? 'right' : 'left'
  };
}

function calculateFitCovariance(evaluate, values, x, errors, selected, useErrors, method, cost) {
  const parameterCount = values.length;
  const normal = Array.from({ length: parameterCount }, () => Array(parameterCount).fill(0));
  for (const row of selected) {
    const derivative = numericalDerivatives(evaluate, x[row], values);
    if (!derivative.every(Number.isFinite)) return null;
    const prediction = evaluate(x[row], values);
    const weight =
      method === 'poisson'
        ? 1 / Math.max(prediction, 1e-9)
        : useErrors && errors[row] > 0
          ? 1 / errors[row] ** 2
          : 1;
    for (let i = 0; i < parameterCount; i += 1) {
      for (let j = 0; j < parameterCount; j += 1)
        normal[i][j] += weight * derivative[i] * derivative[j];
    }
  }
  const scale = method === 'poisson' ? 1 : cost / Math.max(1, selected.length - parameterCount);
  const inverse = Array.from({ length: parameterCount }, (_, column) =>
    solveLinearSystem(
      normal,
      Array.from({ length: parameterCount }, (_, row) => (row === column ? scale : 0))
    )
  );
  if (inverse.some((solution) => !solution)) return null;
  return Array.from({ length: parameterCount }, (_, row) =>
    inverse.map((solution) => solution[row])
  );
}

function chiSquareSurvival(value, degreesOfFreedom) {
  if (!(value >= 0) || !(degreesOfFreedom > 0)) return Number.NaN;
  const a = degreesOfFreedom / 2;
  const x = value / 2;
  const logGamma = logGammaLanczos(a);
  if (x < a + 1) {
    let term = 1 / a;
    let sum = term;
    for (let index = 1; index < 240; index += 1) {
      term *= x / (a + index);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return Math.max(0, Math.min(1, 1 - sum * Math.exp(-x + a * Math.log(x) - logGamma)));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / Math.max(b, 1e-30);
  let fraction = d;
  for (let index = 1; index < 240; index += 1) {
    const coefficient = -index * (index - a);
    b += 2;
    d = coefficient * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + coefficient / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    fraction *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - logGamma) * fraction));
}

function logGammaLanczos(value) {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (value < 0.5)
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGammaLanczos(1 - value);
  const z = value - 1;
  const series = coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient / (z + index + 1),
    0.9999999999998099
  );
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(series);
}

function calculateModelUncertainty(evaluate, x, values, covariance) {
  const derivative = numericalDerivatives(evaluate, x, values);
  const variance = derivative.reduce(
    (total, left, row) =>
      total +
      left * covariance[row].reduce((sum, entry, column) => sum + entry * derivative[column], 0),
    0
  );
  return variance > 0 && Number.isFinite(variance) ? Math.sqrt(variance) : 0;
}

function numericalDerivatives(evaluate, x, values) {
  return values.map((value, index) => {
    const step = Math.max(Math.abs(value) * 1e-5, 1e-6);
    const plus = [...values];
    const minus = [...values];
    plus[index] += step;
    minus[index] -= step;
    return (evaluate(x, plus) - evaluate(x, minus)) / (2 * step);
  });
}

function optimizeNonlinearFit(
  evaluate,
  initialValues,
  x,
  y,
  lowerErrors,
  upperErrors,
  selected,
  useErrors,
  method,
  initialCost,
  bounds = []
) {
  let values = [...initialValues];
  let cost = initialCost;
  let damping = 0.01;
  const parameterCount = values.length;
  for (let iteration = 0; iteration < 140; iteration += 1) {
    const normal = Array.from({ length: parameterCount }, () => Array(parameterCount).fill(0));
    const gradient = Array(parameterCount).fill(0);
    let valid = true;
    for (const row of selected) {
      const prediction = evaluate(x[row], values);
      if (!Number.isFinite(prediction) || (method === 'poisson' && prediction <= 0)) {
        valid = false;
        break;
      }
      const residual = y[row] - prediction;
      const error = residual >= 0 ? upperErrors[row] : lowerErrors[row];
      const weight =
        method === 'poisson'
          ? 1 / Math.max(prediction, 1e-9)
          : useErrors && error > 0
            ? 1 / error ** 2
            : 1;
      const derivative = numericalDerivatives(evaluate, x[row], values);
      if (!derivative.every(Number.isFinite)) {
        valid = false;
        break;
      }
      for (let i = 0; i < parameterCount; i += 1) {
        gradient[i] += weight * derivative[i] * residual;
        for (let j = 0; j < parameterCount; j += 1)
          normal[i][j] += weight * derivative[i] * derivative[j];
      }
    }
    if (!valid) break;
    const damped = normal.map((row, index) =>
      row.map(
        (entry, column) =>
          entry + (index === column ? damping * Math.max(1, normal[index][index]) : 0)
      )
    );
    const delta = solveLinearSystem(damped, gradient);
    if (!delta) {
      damping *= 10;
      continue;
    }
    const candidate = constrainFitValues(
      values.map((value, index) => value + delta[index]),
      bounds
    );
    const candidateCost = selected.reduce((total, row) => {
      const prediction = evaluate(x[row], candidate);
      if (method === 'poisson') {
        if (!(prediction > 0) || !Number.isFinite(prediction)) return Number.POSITIVE_INFINITY;
        const observed = y[row];
        return (
          total +
          2 *
            (prediction -
              observed +
              (observed > 0 ? observed * Math.log(observed / prediction) : 0))
        );
      }
      const residual = y[row] - prediction;
      const error = residual >= 0 ? upperErrors[row] : lowerErrors[row];
      const weight = useErrors && error > 0 ? 1 / error ** 2 : 1;
      return Number.isFinite(residual) ? total + weight * residual ** 2 : Number.POSITIVE_INFINITY;
    }, 0);
    if (Number.isFinite(candidateCost) && candidateCost < cost) {
      values = candidate;
      cost = candidateCost;
      damping = Math.max(1e-10, damping * 0.35);
      if (Math.hypot(...delta) < 1e-8) break;
    } else damping = Math.min(1e12, damping * 5);
  }
  return { values, cost };
}

function getFitBounds(parameters, configuredBounds) {
  return parameters.map(
    (parameter) =>
      configuredBounds[parameter.name] ?? {
        minimum: -Infinity,
        maximum: Infinity
      }
  );
}

function constrainFitValues(values, bounds) {
  return values.map((value, index) => {
    const bound = bounds[index] ?? { minimum: -Infinity, maximum: Infinity };
    return Math.max(bound.minimum, Math.min(bound.maximum, value));
  });
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1)
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    if (Math.abs(augmented[pivot][column]) < 1e-14) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let entry = column; entry <= size; entry += 1) augmented[column][entry] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry <= size; entry += 1)
        augmented[row][entry] -= factor * augmented[column][entry];
    }
  }
  return augmented.map((row) => row[size]);
}

function solveLinearFit(expression, parameters, x, y, errors, selected, useErrors) {
  const match = String(expression)
    .replace(/\s+/g, '')
    .match(/^([A-Za-z_]\w*)\*x([+-])([A-Za-z_]\w*)$/);
  if (!match) return null;
  const slopeIndex = parameters.findIndex((parameter) => parameter.name === match[1]);
  const interceptIndex = parameters.findIndex((parameter) => parameter.name === match[3]);
  if (slopeIndex < 0 || interceptIndex < 0 || slopeIndex === interceptIndex) return null;
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const index of selected) {
    const weight = useErrors && errors[index] > 0 ? 1 / errors[index] ** 2 : 1;
    sumW += weight;
    sumX += weight * x[index];
    sumY += weight * y[index];
    sumXX += weight * x[index] ** 2;
    sumXY += weight * x[index] * y[index];
  }
  const denominator = sumW * sumXX - sumX ** 2;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-12) return null;
  const slope = (sumW * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / sumW;
  const values = parameters.map((parameter) => parameter.value);
  values[slopeIndex] = slope;
  values[interceptIndex] = match[2] === '+' ? intercept : -intercept;
  return values;
}

function parseFitParameters(source) {
  return source.split(',').flatMap((part) => {
    const match = part
      .trim()
      .match(/^([A-Za-z_]\w*)\s*=\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i);
    return match ? [{ name: match[1], value: Number(match[2]) }] : [];
  });
}

function parseFitBounds(source) {
  const bounds = {};
  for (const part of String(source ?? '').split(',')) {
    const match = part
      .trim()
      .match(
        /^([A-Za-z_]\w*)\s*=\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)?\s*:\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)?$/i
      );
    if (!match) continue;
    const minimum = match[2] === undefined ? -Infinity : Number(match[2]);
    const maximum = match[3] === undefined ? Infinity : Number(match[3]);
    if (Number.isFinite(minimum) || Number.isFinite(maximum))
      bounds[match[1]] = { minimum, maximum: Math.max(minimum, maximum) };
  }
  return bounds;
}

function parseFixedFitParameters(source) {
  const bounds = {};
  for (const part of String(source ?? '').split(',')) {
    const match = part
      .trim()
      .match(/^([A-Za-z_]\w*)\s*=\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i);
    if (!match) continue;
    const value = Number(match[2]);
    bounds[match[1]] = { minimum: value, maximum: value };
  }
  return bounds;
}

function compileFitFunction(expression, names) {
  const normalized = expression
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E');
  if (!/^[\d\s+\-*/().,A-Za-z_]+$/.test(normalized)) return null;
  const allowed = new Set([
    'x',
    ...names,
    'Math',
    'PI',
    'E',
    'sin',
    'cos',
    'tan',
    'exp',
    'log',
    'sqrt',
    'abs',
    'pow',
    'min',
    'max'
  ]);
  if ([...normalized.matchAll(/[A-Za-z_]\w*/g)].some((match) => !allowed.has(match[0])))
    return null;
  try {
    const fn = Function(
      'x',
      'p',
      `"use strict"; const {${names.join(',')}} = p; const {sin,cos,tan,exp,log,sqrt,abs,pow,min,max} = Math; return (${normalized});`
    );
    return (x, values) => {
      const parameters = Object.fromEntries(names.map((name, index) => [name, values[index]]));
      const result = fn(x, parameters);
      return Number.isFinite(result) ? result : Number.NaN;
    };
  } catch {
    return null;
  }
}

function createFitMarkup(fit, xFor, yFor, appearance, plot) {
  const points = fit.samples.filter((sample) => Number.isFinite(sample.y));
  if (points.length < 2) return '';
  const belongsToFitRegion = (point) =>
    (fit.config.ranges.length === 0 ||
      fit.config.ranges.some(([minimum, maximum]) => point.x >= minimum && point.x <= maximum)) &&
    !fit.config.exclude.some(([minimum, maximum]) => point.x >= minimum && point.x <= maximum);
  const splitAtRejectedRegions = (items) => {
    const segments = [];
    let segment = [];
    for (const item of items) {
      if (!fit.config.drawExclude || belongsToFitRegion(item)) segment.push(item);
      else if (segment.length > 0) {
        segments.push(segment);
        segment = [];
      }
    }
    if (segment.length > 0) segments.push(segment);
    return segments;
  };
  const curveSegments = splitAtRejectedRegions(points).filter((segment) => segment.length > 1);
  const path = curveSegments
    .map((segment) =>
      segment
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point.x)} ${yFor(point.y)}`)
        .join(' ')
    )
    .join(' ');
  const envelope = points.filter(
    (point) => Number.isFinite(point.uncertainty) && point.uncertainty > 0
  );
  const envelopeSegments = splitAtRejectedRegions(envelope).filter((segment) => segment.length > 1);
  const bandAnimation = fit.config.bandAnimation === 'draw' ? 'reveal-x' : fit.config.bandAnimation;
  const bandStyle = bandAnimation
    ? `animation:neopresent-chart-${bandAnimation} ${fit.config.bandAnimationDuration} ${fit.config.bandAnimationEasing} ${fit.config.bandAnimationDelay} both;transform-box:fill-box;transform-origin:center${bandAnimation === 'reveal-x' ? ';clip-path:inset(0 100% 0 0)' : ''}`
    : '';
  const band =
    fit.config.band && envelopeSegments.length > 0
      ? envelopeSegments
          .map(
            (segment) =>
              `<path style="${bandStyle}" d="${segment.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(point.x)} ${yFor(point.y + point.uncertainty)}`).join(' ')} ${[
                ...segment
              ]
                .reverse()
                .map((point) => `L ${xFor(point.x)} ${yFor(point.y - point.uncertainty)}`)
                .join(
                  ' '
                )} Z" fill="${fit.config.bandColor}" fill-opacity="${fit.config.bandAlpha}" stroke="${fit.config.bandOutlineColor}" stroke-dasharray="${fit.config.bandOutlineStyle || 'none'}" stroke-opacity="${fit.config.bandOutlineAlpha}" stroke-width="${fit.config.bandOutlineWidth}" />`
          )
          .join('')
      : '';
  const summaryLines = [
    ...(fit.config.results
      ? fit.parameters.map(
          (parameter) =>
            `${parameter.name} = ${formatChartValue(parameter.value)} ± ${formatChartValue(parameter.error)}`
        )
      : []),
    ...(fit.config.quality
      ? [
          `${fit.quality.method === 'poisson' ? 'D' : fit.quality.weighted ? 'χ²' : 'RSS'} / ndf = ${formatChartValue(fit.quality.cost)} / ${fit.quality.degreesOfFreedom}`,
          `RMSE = ${formatChartValue(fit.quality.rmse)}`,
          ...(fit.config.pValue && Number.isFinite(fit.quality.pValue)
            ? [`p = ${formatChartValue(fit.quality.pValue)}`]
            : [])
        ]
      : [])
  ];
  const hasPosition = Number.isFinite(fit.config.labelX) && Number.isFinite(fit.config.labelY);
  // With disjoint fit ranges the final sampled point can be far outside every
  // fitted region. Anchor the automatic result label to a retained point so
  // `fit-results` and `fit-quality` remain visible without manual placement.
  const summaryPoint = points.filter(belongsToFitRegion).at(-1) ?? points.at(-1);
  const summaryLineHeight = 16;
  const summaryX = hasPosition
    ? plot.left + plot.width * fit.config.labelX
    : xFor(summaryPoint.x) - 8;
  const rawSummaryY = hasPosition
    ? plot.top + plot.height * fit.config.labelY
    : yFor(summaryPoint.y) - 10;
  const summaryY = hasPosition
    ? rawSummaryY
    : Math.max(
        plot.top + fit.config.labelSize,
        Math.min(plot.bottom - 6 - Math.max(0, summaryLines.length - 1) * summaryLineHeight, rawSummaryY)
      );
  const summaryAnchor = hasPosition
    ? { left: 'start', center: 'middle', right: 'end' }[fit.config.labelAlign]
    : 'end';
  const summary = summaryLines
    .map(
      (line, index) =>
        `<tspan x="${summaryX}" dy="${index === 0 ? 0 : summaryLineHeight}">${escapeSvgText(line)}</tspan>`
    )
    .join('');
  const animation =
    fit.config.animation === 'draw' && !fit.config.lineStyle
      ? 'stroke-dasharray:1;stroke-dashoffset:1;'
      : '';
  const dashedDraw = fit.config.animation === 'draw' && fit.config.lineStyle;
  const animationName = dashedDraw ? 'reveal-x' : fit.config.animation;
  const style = animationName
    ? `${dashedDraw ? 'clip-path:inset(0 100% 0 0);' : animation}animation:neopresent-chart-${animationName} ${fit.config.animationDuration} ${fit.config.animationEasing} ${fit.config.animationDelay} both;transform-box:fill-box;transform-origin:center`
    : '';
  const curve = fit.config.draw
    ? `<path ${fit.config.lineStyle ? '' : 'pathLength="1"'} style="${style}" d="${path}" fill="none" stroke="${fit.config.color}" stroke-dasharray="${fit.config.lineStyle || 'none'}" stroke-opacity="${fit.config.alpha}" stroke-width="${fit.config.width}" stroke-linecap="round" />`
    : '';
  return `${band}${curve}${summary ? `<text x="${summaryX}" y="${summaryY}" fill="${fit.config.labelColor}" font-family="${appearance.tickFont}" font-size="${fit.config.labelSize}" text-anchor="${summaryAnchor}">${summary}</text>` : ''}${createFitCorrelationMarkup(fit, plot, appearance)}`;
}

function createFitCorrelationMarkup(fit, plot, appearance) {
  if (
    !fit.config.correlation ||
    !fit.correlation ||
    fit.parameters.length < 2 ||
    fit.parameters.length > 8
  )
    return '';
  const size = fit.config.correlationSize;
  const cell = Math.max(30, size * 3.1);
  const labelWidth = Math.max(30, size * 2.6);
  const dimension = cell * fit.parameters.length + labelWidth + 10;
  const x = plot.left + plot.width * fit.config.correlationX;
  const y = plot.top + plot.height * fit.config.correlationY;
  const color = fit.config.correlationColor;
  const precision = fit.config.correlationPrecision;
  const columnLabels = fit.parameters
    .map(
      (parameter, index) =>
        `<text x="${labelWidth + cell * index + cell / 2}" y="${size + 5}" text-anchor="middle">${escapeSvgText(parameter.name)}</text>`
    )
    .join('');
  const rows = fit.parameters
    .map((parameter, row) => {
      const cells = fit.parameters
        .map((_, column) => {
          const value = fit.correlation[row][column];
          const alpha = Number.isFinite(value) ? 0.13 + Math.abs(value) * 0.38 : 0.06;
          const text = Number.isFinite(value) ? value.toFixed(precision) : '—';
          return `<rect x="${labelWidth + column * cell}" y="${size + 10 + row * cell}" width="${cell}" height="${cell}" fill="${color}" fill-opacity="${alpha}" /><text x="${labelWidth + column * cell + cell / 2}" y="${size + 10 + row * cell + cell * 0.64}" text-anchor="middle">${text}</text>`;
        })
        .join('');
      return `<text x="${labelWidth - 5}" y="${size + 10 + row * cell + cell * 0.64}" text-anchor="end">${escapeSvgText(parameter.name)}</text>${cells}`;
    })
    .join('');
  return `<g transform="translate(${x} ${y})" fill="${color}" font-family="${appearance.tickFont}" font-size="${size}" data-neopresent-fit-correlation="true"><rect x="0" y="0" width="${dimension}" height="${dimension}" rx="5" fill="#020617" fill-opacity=".76" stroke="${color}" stroke-opacity=".45" /><text x="8" y="${size + 4}" font-weight="700">Corr.</text>${columnLabels}${rows}</g>`;
}

function createFitDiagnostic(fits, plot, xFor, xTicks, xLog, appearance, xLabel) {
  const mode = appearance.fit.diagnostic;
  const points = fits.flatMap((fit) =>
    fit.diagnosticPoints.map((point) => ({
      ...point,
      color: fit.config.color
    }))
  );
  const usable = points.filter((point) =>
    Number.isFinite(mode === 'pull' ? point.pull : point.residual)
  );
  if (usable.length === 0) return '';
  const values = usable.map((point) => (mode === 'pull' ? point.pull : point.residual));
  const extent =
    Math.max(mode === 'pull' ? 3 : 0, ...values.map((value) => Math.abs(value)), 1e-6) * 1.1;
  const yFor = (value) => plot.top + ((extent - value) / (extent * 2)) * plot.height;
  const ticks = [-extent, 0, extent];
  const grid = ticks
    .map((value) => {
      const y = yFor(value);
      return `<path d="M ${plot.left} ${y} H ${plot.left + plot.width}" stroke="${value === 0 ? appearance.axisColor : appearance.gridColor}" stroke-width="${value === 0 ? appearance.axisWidth : appearance.gridWidth}" stroke-dasharray="${value === 0 ? 'none' : '4 6'}" opacity="${value === 0 ? appearance.axisAlpha : appearance.gridAlpha}" /><text x="${plot.left - 12}" y="${y + 4}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${Math.max(12, appearance.tickSize * 0.7)}" text-anchor="end">${formatChartValue(value)}</text>`;
    })
    .join('');
  const xLabels = xTicks
    .map(
      (value) =>
        `<text x="${xFor(value)}" y="${plot.bottom + 25}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${Math.max(12, appearance.tickSize * 0.7)}" text-anchor="middle">${formatScaleTick(value, xLog)}</text>`
    )
    .join('');
  const marks = usable
    .map((point, index) => {
      const value = mode === 'pull' ? point.pull : point.residual;
      return `<circle cx="${xFor(point.x)}" cy="${yFor(value)}" r="${Math.max(3, appearance.dataSize * 0.62)}" fill="${point.color}" style="${createDataAnimation(appearance, index, usable.length)}"><title>${mode === 'pull' ? 'Pull' : 'Residual'}: ${formatChartValue(value)}</title></circle>`;
    })
    .join('');
  const label = mode === 'pull' ? 'Pull' : 'Residual';
  return `<g data-neopresent-fit-diagnostic="${mode}">${grid}<path d="M ${plot.left} ${plot.top} V ${plot.bottom} H ${plot.left + plot.width}" fill="none" stroke="${appearance.axisColor}" stroke-width="${appearance.axisWidth}" opacity="${appearance.axisAlpha}" />${marks}${xLabels}<text x="${18}" y="${plot.top + plot.height / 2}" fill="${appearance.yLabelColor}" font-family="${appearance.yLabelFont}" font-size="${Math.max(12, appearance.yLabelSize * 0.7)}" text-anchor="middle" transform="rotate(-90 18 ${plot.top + plot.height / 2})">${label}</text>${xLabel ? `<text x="${plot.left + plot.width / 2}" y="${plot.bottom + 58}" fill="${appearance.xLabelColor}" font-family="${appearance.xLabelFont}" font-size="${appearance.xLabelSize}" text-anchor="middle">${renderSvgMath(xLabel)}</text>` : ''}</g>`;
}

function createPlotAnnotations(chart, plot, appearance, fits = []) {
  const annotations = chart.getAttribute?.('annotations');
  if (!Array.isArray(annotations)) return '';
  return annotations
    .map((item) => {
      const reveal = getPlotItemRevealState(chart, item.revealStage);
      if (!reveal.visible) return '';
      const x = Math.max(0, Math.min(1, Number(item.x))) * plot.width + plot.left;
      const y = Math.max(0, Math.min(1, Number(item.y))) * plot.height + plot.top;
      const color = safeColor(item.color, appearance.tickColor);
      const font = safeFont(item.font, appearance.tickFont);
      const fontSize = Math.max(
        10,
        safeNumber(item.fontSize, Math.max(12, appearance.tickSize * 0.7))
      );
      const fontWeight = /^(?:normal|bold|[1-9]00)$/i.test(String(item.fontWeight ?? ''))
        ? String(item.fontWeight)
        : 'normal';
      const lineHeight = Math.max(1, safeNumber(item.lineHeight, 1.2));
      const lineIndents = String(item.lineIndent ?? '')
        .split(',')
        .map((value) => safeNumber(value, 0));
      const anchor = ['left', 'center', 'right'].includes(String(item.align))
        ? { left: 'start', center: 'middle', right: 'end' }[item.align]
        : 'start';
      const requestedAnimation = String(reveal.animate ? item.animation ?? '' : '')
        .trim()
        .toLowerCase();
      const animation = ['fade', 'rise', 'grow'].includes(requestedAnimation)
        ? requestedAnimation
        : item.animationDelay || item.animationDuration
          ? 'fade'
          : '';
      const duration = safeCssTime(item.animationDuration, '500ms');
      const delay = safeCssTime(item.animationDelay, '0ms');
      const easing = safeEasing(item.animationEasing, 'cubic-bezier(.2,.8,.2,1)');
      const animationStyle = animation
        ? `animation:neopresent-chart-${animation} ${duration} ${easing} ${delay} both;transform-box:fill-box;transform-origin:center`
        : '';
      const text = resolveFitPlaceholders(String(item.text ?? ''), fits);
      const math = getDelimitedMath(text);
      if (math) {
        const left = anchor === 'end' ? x - 240 : anchor === 'middle' ? x - 120 : x;
        return `<foreignObject x="${left}" y="${y - 20}" width="240" height="32" style="${animationStyle}"><div xmlns="http://www.w3.org/1999/xhtml" data-katex-source="${escapeSvgText(math.source)}" data-katex-display="inline" style="color:${color};font-family:${font};font-size:${fontSize}px;font-weight:${fontWeight};text-align:${anchor === 'end' ? 'right' : anchor === 'middle' ? 'center' : 'left'};white-space:nowrap"></div></foreignObject>`;
      }
      const lines = text.split(/\\n|\r?\n|<br\s*\/?\s*>/i);
      return `<text x="${x}" y="${y}" fill="${color}" font-family="${font}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${anchor}" style="${animationStyle}">${lines.map((line, index) => `<tspan x="${x + (lineIndents[index] ?? 0)}" dy="${index === 0 ? 0 : fontSize * lineHeight}">${renderSvgMath(line)}</tspan>`).join('')}</text>`;
    })
    .join('');
}

function resolveFitPlaceholders(text, fits) {
  return text.replace(
    /\{\{\s*fit\.([a-zA-Z0-9_-]+)(?:\.([a-zA-Z_]\w*))?(?::(\d+))?\s*\}\}/g,
    (source, first, second, precision) => {
      const id = second ? first : null;
      const property = second ?? first;
      const fit = id ? fits.find((item) => item.id === id) : fits[0];
      if (!fit) return source;
      const parameter = fit.parameters.find((item) => item.name === property);
      const errorName = property.match(/^(.+)Error$/);
      const error = errorName
        ? fit.parameters.find((item) => item.name === errorName[1])?.error
        : undefined;
      const relation = property.match(/^(corr|cov)_([A-Za-z_]\w*)_([A-Za-z_]\w*)$/);
      const firstParameter = relation
        ? fit.parameters.findIndex((item) => item.name === relation[2])
        : -1;
      const secondParameter = relation
        ? fit.parameters.findIndex((item) => item.name === relation[3])
        : -1;
      const relationValue =
        relation && firstParameter >= 0 && secondParameter >= 0
          ? relation[1] === 'corr'
            ? fit.correlation?.[firstParameter]?.[secondParameter]
            : fit.covariance?.[firstParameter]?.[secondParameter]
          : undefined;
      const values = {
        chi2: fit.quality.cost,
        cost: fit.quality.cost,
        deviance: fit.quality.method === 'poisson' ? fit.quality.cost : Number.NaN,
        pvalue: fit.quality.pValue,
        ndof: fit.quality.degreesOfFreedom,
        reduced:
          fit.quality.degreesOfFreedom > 0
            ? fit.quality.cost / fit.quality.degreesOfFreedom
            : Number.NaN,
        rmse: fit.quality.rmse,
        rss:
          fit.quality.weighted || fit.quality.method === 'poisson' ? Number.NaN : fit.quality.cost
      };
      const value = parameter?.value ?? error ?? relationValue ?? values[property];
      if (!Number.isFinite(value)) return source;
      const digits = precision ? Math.max(0, Math.min(12, Number(precision))) : null;
      return digits === null ? formatChartValue(value) : value.toFixed(digits);
    }
  );
}

function safeFitIdentifier(value, fallback) {
  const identifier = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return identifier || fallback;
}

function createAxisLabels(xLabel, yLabel, width, height, plot, appearance) {
  return `${createSvgAxisLabel(xLabel, 'x', width, height, plot, appearance)}
    ${createSvgAxisLabel(yLabel, 'y', width, height, plot, appearance)}`;
}

function createRightAxisLabel(label, plot, appearance) {
  if (!label) return '';
  const x = plot.left + plot.width + 68;
  const y = plot.top + plot.height / 2;
  const math = getDelimitedMath(label);
  if (!math)
    return `<text x="${x}" y="${y}" fill="${appearance.rightYLabelColor}" font-family="${appearance.rightYLabelFont}" font-size="${appearance.rightYLabelSize}" text-anchor="middle" transform="rotate(90 ${x} ${y})">${renderSvgMath(label)}</text>`;
  return `<foreignObject x="${x - 100}" y="${y - 14}" width="200" height="28" transform="rotate(90 ${x} ${y})"><div xmlns="http://www.w3.org/1999/xhtml" data-katex-source="${escapeSvgText(math.source)}" data-katex-display="inline" style="color:${appearance.rightYLabelColor};font-family:${appearance.rightYLabelFont};font-size:${appearance.rightYLabelSize}px;text-align:center;white-space:nowrap"></div></foreignObject>`;
}

function createChartTitle(title, appearance, theme) {
  if (!title) return null;
  const math = getDelimitedMath(title);
  const style = {
    color: appearance.titleColor,
    fontFamily: appearance.titleFont,
    fontSize: appearance.titleSize,
    margin: '0 0 0.8rem',
    opacity: appearance.titleAlpha,
    transform: `translate(${appearance.titleOffsetX}px, ${appearance.titleOffsetY}px)`
  };
  return math
    ? {
        tag: 'div',
        data: {
          katexDisplay: math.display ? 'block' : 'inline',
          katexSource: math.source
        },
        style
      }
    : { tag: 'h3', cn: createInlineContent(title, theme), style };
}

function createReferenceLines({
  appearance,
  plot,
  xFor,
  xLog,
  xMaximum,
  xMinimum,
  yFor,
  yLog,
  yMaximum,
  yMinimum,
  supportsX
}) {
  const labels = appearance.referenceLabel
    .split('|')
    .map((label) => label.trim())
    .filter(Boolean);
  let labelIndex = 0;
  const nextLabel = () => labels[labelIndex++] ?? '';
  const line = (path, label, x, y, anchor) =>
    `<path d="${path}" fill="none" stroke="${appearance.referenceColor}" stroke-dasharray="${appearance.referenceDash}" stroke-width="${appearance.referenceWidth}" />${label ? `<text x="${x}" y="${y}" fill="${appearance.referenceLabelColor}" font-family="${appearance.tickFont}" font-size="${Math.max(11, appearance.tickSize * 0.65)}" text-anchor="${anchor}">${escapeSvgText(label)}</text>` : ''}`;
  const horizontal = appearance.referenceY
    .filter((value) => value >= yMinimum && value <= yMaximum && (!yLog || value > 0))
    .map((value) => {
      const y = yFor(value);
      return line(
        `M ${plot.left} ${y} H ${plot.left + plot.width}`,
        nextLabel(),
        plot.left + plot.width - 6,
        y - 7,
        'end'
      );
    });
  const vertical = supportsX
    ? appearance.referenceX
        .filter((value) => value >= xMinimum && value <= xMaximum && (!xLog || value > 0))
        .map((value) => {
          const x = xFor(value);
          return line(
            `M ${x} ${plot.top} V ${plot.bottom}`,
            nextLabel(),
            x + 6,
            plot.top + 14,
            'start'
          );
        })
    : [];
  const named = appearance.referenceLines.flatMap((reference) => {
    const entries = [
      ...reference.xValues.map((value) => ({ isVertical: true, value })),
      ...reference.yValues.map((value) => ({ isVertical: false, value }))
    ];
    return entries.flatMap(({ isVertical, value }) => {
      if (isVertical) {
        if (!supportsX || value < xMinimum || value > xMaximum || (xLog && value <= 0)) return [];
      } else if (value < yMinimum || value > yMaximum || (yLog && value <= 0)) return [];
      const coordinate = isVertical ? xFor(value) : yFor(value);
      const path = isVertical
        ? `M ${coordinate} ${plot.top} V ${plot.bottom}`
        : `M ${plot.left} ${coordinate} H ${plot.left + plot.width}`;
      const animation = createReferenceAnimation(reference, isVertical);
      const label = reference.labelVisible ? reference.label || reference.name : '';
      const labelX = isVertical ? coordinate + 6 : plot.left + plot.width - 6;
      const labelY = isVertical ? plot.top + 14 : coordinate - 7;
      const mathLabel = createHeatmapMathMarkup(label);
      const labelMarkup = label
        ? mathLabel
          ? `<foreignObject x="${isVertical ? labelX : labelX - 240}" y="${labelY - 18}" width="240" height="30"><div xmlns="http://www.w3.org/1999/xhtml" style="color:${reference.labelColor || appearance.referenceLabelColor};font-family:${appearance.tickFont};font-size:${reference.labelSize || Math.max(11, appearance.tickSize * 0.65)}px;line-height:1.2;text-align:${isVertical ? 'left' : 'right'};white-space:nowrap">${mathLabel}</div></foreignObject>`
          : `<text x="${labelX}" y="${labelY}" fill="${reference.labelColor || appearance.referenceLabelColor}" font-family="${appearance.tickFont}" font-size="${reference.labelSize || Math.max(11, appearance.tickSize * 0.65)}" text-anchor="${isVertical ? 'start' : 'end'}">${escapeSvgText(label)}</text>`
        : '';
      return [
        `<g data-neopresent-reference="${escapeSvgText(reference.name)}" style="${animation}"><path d="${path}" fill="none" stroke="${reference.color || appearance.referenceColor}" stroke-opacity="${reference.alpha}" stroke-dasharray="${reference.dash || appearance.referenceDash}" stroke-width="${reference.width || appearance.referenceWidth}" />${labelMarkup}</g>`
      ];
    });
  });
  return [...horizontal, ...vertical, ...named].join('');
}

function createReferenceAnimation(reference, vertical) {
  if (!reference.animation) return '';
  const name =
    reference.animation === 'draw' ? (vertical ? 'grow' : 'reveal-x') : reference.animation;
  const clip = name === 'reveal-x' ? 'clip-path:inset(0 100% 0 0);' : '';
  return `${clip}animation:neopresent-chart-${name} ${reference.animationDuration} ${reference.animationEasing} ${reference.animationDelay} both;transform-box:fill-box;transform-origin:center`;
}

function createSvgAxisLabel(label, axis, width, height, plot, appearance) {
  if (!label) return '';
  const inlineStyle = parseFullInlineStyle(String(label).trim());
  const labelText = inlineStyle?.text ?? String(label);
  const mathMarkup = createHeatmapMathMarkup(labelText);
  const isX = axis === 'x';
  const color = isX ? appearance.xLabelColor : appearance.yLabelColor;
  const alpha = isX ? appearance.xLabelAlpha : appearance.yLabelAlpha;
  const font = isX ? appearance.xLabelFont : appearance.yLabelFont;
  const fontSize = isX ? appearance.xLabelSize : appearance.yLabelSize;
  const offsetX = isX ? appearance.xLabelOffsetX : appearance.yLabelOffsetX;
  const offsetY = isX ? appearance.xLabelOffsetY : appearance.yLabelOffsetY;
  const centerY = plot.top + plot.height / 2 + offsetY;
  if (!inlineStyle && !mathMarkup) {
    return isX
      ? `<text x="${plot.left + plot.width / 2 + offsetX}" y="${height - 10 + offsetY}" fill="${color}" fill-opacity="${alpha}" font-family="${font}" font-size="${fontSize}" text-anchor="middle">${renderSvgMath(labelText)}</text>`
      : `<text x="${18 + offsetX}" y="${centerY}" fill="${color}" fill-opacity="${alpha}" font-family="${font}" font-size="${fontSize}" text-anchor="middle" transform="rotate(-90 ${18 + offsetX} ${centerY})">${renderSvgMath(labelText)}</text>`;
  }
  // foreignObject clips its contents to its own bounds. Give mixed math and
  // inline-styled labels the full usable axis span instead of a fixed box.
  const labelWidth = isX ? Math.max(280, plot.width + 24) : Math.max(220, plot.height + 24);
  const x = isX
    ? plot.left + plot.width / 2 + offsetX - labelWidth / 2
    : 18 + offsetX - labelWidth / 2;
  const y = isX ? height - 29 + offsetY : centerY - 14;
  const transform = isX ? '' : ` transform="rotate(-90 ${18 + offsetX} ${centerY})"`;
  const style = {
    color,
    fontFamily: font,
    fontSize: `${fontSize}px`,
    opacity: alpha,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    ...(inlineStyle ? createInlineStyle(inlineStyle.specification) : {})
  };
  const content = mathMarkup || escapeSvgText(labelText);
  return `<foreignObject x="${x}" y="${y}" width="${labelWidth}" height="${Math.max(32, fontSize * 1.7)}"${transform}>
    <div xmlns="http://www.w3.org/1999/xhtml" style="display:block;overflow:visible;${createInlineCssText(style)}">${content}</div>
  </foreignObject>`;
}

function createInlineCssText(style) {
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== '')
    .map(([property, value]) => {
      const cssProperty = property
        .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
        .replace(/^webkit-/, '-webkit-');
      return `${cssProperty}:${escapeSvgText(String(value))}`;
    })
    .join(';');
}

function getDelimitedMath(value) {
  const text = String(value).trim();
  const display = text.match(/^\$\$([\s\S]+)\$\$$/);
  if (display) return { display: true, source: display[1].trim() };
  const inline = text.match(/^\$([^$\n]+)\$$/);
  return inline ? { display: false, source: inline[1].trim() } : null;
}

function getPlotAppearance(chart, theme) {
  const values = chart.plotStyle ?? chart.getAttribute?.('plotStyle');
  const style = values && typeof values === 'object' ? values : {};
  const color = (key, fallback) => safeColor(style[key], fallback);
  const size = (key, fallback) => safeNumber(style[key], fallback);
  const alpha = (key) => safeAlpha(style[key]);
  const offset = (key) => safeNumber(style[key], 0);
  const font = (key, fallback = 'system-ui, sans-serif') => safeFont(style[key], fallback);
  const unit = (key, fallback) => {
    const value = safeUnitNumber(style[key]);
    return Number.isFinite(value) ? value : fallback;
  };
  const statsItemStyles = Object.fromEntries(
    ['entries', 'mean', 'stddev', 'rms', 'min', 'max', 'median'].map((key) => [
      key,
      {
        alpha: safeAlpha(style[`stats-${key}-alpha`]),
        color: color(`stats-${key}-color`, color('stats-color', theme.foreground)),
        font: font(`stats-${key}-font`, font('stats-font')),
        labelColor: color(
          `stats-${key}-label-color`,
          color(`stats-${key}-color`, color('stats-color', theme.foreground))
        ),
        size: size(`stats-${key}-size`, size('stats-size', 16)),
        valueColor: color(
          `stats-${key}-value-color`,
          color(`stats-${key}-color`, color('stats-color', theme.foreground))
        )
      }
    ])
  );
  return {
    axisColor: color('axis-color', theme.border),
    axisAlpha: alpha('axis-alpha'),
    axisWidth: size('axis-width', 2),
    frameTop: !['false', 'no', 'off', '0'].includes(
      String(style['frame-top'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    frameRight: !['false', 'no', 'off', '0'].includes(
      String(style['frame-right'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    ticksTop: isEnabled(style['ticks-top']),
    ticksRight: isEnabled(style['ticks-right']),
    ticksBottom: !['false', 'no', 'off', '0'].includes(
      String(style['ticks-bottom'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    ticksLeft: !['false', 'no', 'off', '0'].includes(
      String(style['ticks-left'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    minorTicks: !['false', 'no', 'off', '0'].includes(
      String(style['minor-ticks'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    tickDivisions: Math.max(2, Math.min(12, Math.trunc(size('tick-divisions', 5)))),
    tickLength: Math.max(1, size('tick-length', 8)),
    minorTickLength: Math.max(1, size('minor-tick-length', 4)),
    animation: ['fade', 'rise', 'grow', 'draw'].includes(
      String(style.animation ?? '')
        .trim()
        .toLowerCase()
    )
      ? String(style.animation).trim().toLowerCase()
      : '',
    animationDelay: safeCssTime(style['animation-delay'], '0ms'),
    animationDuration: safeCssTime(style['animation-duration'], '600ms'),
    animationEasing: safeEasing(style['animation-easing'], 'cubic-bezier(.2,.8,.2,1)'),
    dataColor: color('data-color', theme.accent),
    dataAlpha: alpha('data-alpha'),
    dataSize: size('data-size', 5),
    dataSymbol: safeSymbol(style.symbol ?? style['data-symbol']),
    bubbleSizes: String(style['bubble-size'] ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite),
    bubbleMin: Math.max(2, size('bubble-min', 5)),
    bubbleMax: Math.max(2, size('bubble-max', 18)),
    bubbleScale: ['linear', 'sqrt', 'log'].includes(String(style['bubble-scale'] ?? '').trim())
      ? String(style['bubble-scale']).trim()
      : 'sqrt',
    bubbleLegend: isEnabled(style['bubble-legend']),
    bubbleLegendLabel: String(style['bubble-legend-label'] ?? '').trim(),
    bubbleLabel: String(style['bubble-label'] ?? '').trim() || 'Bubble size',
    errorColor: color('error-color', color('data-color', theme.accent)),
    errorWidth: Math.max(0.5, size('error-width', Math.max(1, size('data-size', 5) / 3))),
    errorAlpha: alpha('error-alpha'),
    errorCapSize: Math.max(0, size('error-cap-size', 7)),
    errorBox: isEnabled(style['error-box']),
    errorBoxColor: color(
      'error-box-color',
      color('error-color', color('data-color', theme.accent))
    ),
    errorBoxAlpha: safeAlpha(style['error-box-alpha'] ?? '.16'),
    drawMode: String(style.draw ?? '').trim(),
    band: isEnabled(style.band),
    bandAlpha: safeAlpha(style['band-alpha'] ?? '.2'),
    bandColor: color('band-color', color('data-color', theme.accent)),
    bandLine: isEnabled(style['band-line']),
    lineStyle: safeLineStyle(style['line-style']),
    legend: !['false', 'no', 'off', '0'].includes(
      String(style.legend ?? '')
        .trim()
        .toLowerCase()
    ),
    legendExplicit: ['true', 'yes', 'on', '1'].includes(
      String(style.legend ?? '')
        .trim()
        .toLowerCase()
    ),
    legendAlpha: alpha('legend-alpha'),
    legendColor: color('legend-color', theme.foreground),
    legendColumns: Math.max(1, Math.floor(size('legend-columns', 1))),
    legendFont: font('legend-font'),
    legendLabels: String(style['legend-labels'] ?? '').trim(),
    legendOffsetX: offset('legend-offset-x'),
    legendOffsetY: offset('legend-offset-y'),
    legendPosition: [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'middle-left',
      'middle-center',
      'middle-right'
    ].includes(
      String(style['legend-position'] ?? '')
        .trim()
        .toLowerCase()
    )
      ? String(style['legend-position']).trim().toLowerCase()
      : 'top-right',
    legendSize: size('legend-size', 16),
    histogramFill: !['false', 'no', 'off', '0'].includes(
      String(style.fill ?? '')
        .trim()
        .toLowerCase()
    ),
    histogramBinGap: Math.max(0, size('bin-gap', 0)),
    histogramBinLines: ['true', 'yes', 'on', '1'].includes(
      String(style['bin-lines'] ?? style['bin-line'] ?? style['vertical-lines'] ?? '')
        .trim()
        .toLowerCase()
    ),
    fit: {
      color: color('fit-color', '#facc15'),
      expression: String(style.fit ?? '').trim(),
      method:
        String(style['fit-method'] ?? '')
          .trim()
          .toLowerCase() === 'poisson'
          ? 'poisson'
          : 'least-squares',
      alpha: alpha('fit-alpha'),
      band: isEnabled(style['fit-band']),
      bandKind:
        String(style['fit-band-kind'] ?? '')
          .trim()
          .toLowerCase() === 'prediction'
          ? 'prediction'
          : 'confidence',
      bandAlpha: safeAlpha(style['fit-band-alpha'] ?? '.18'),
      bandColor: color('fit-band-color', color('fit-color', '#facc15')),
      bandOutlineColor: color(
        'fit-band-outline-color',
        color('fit-band-color', color('fit-color', '#facc15'))
      ),
      bandOutlineAlpha: safeAlpha(style['fit-band-outline-alpha'] ?? '0'),
      bandOutlineStyle: safeLineStyle(style['fit-band-outline-style']),
      bandOutlineWidth: size('fit-band-outline-width', 1),
      bandSigma: Math.max(0.1, size('fit-band-sigma', 1)),
      bandLegend: ['true', 'yes', 'on'].includes(
        String(style['fit-band-legend'] ?? '')
          .trim()
          .toLowerCase()
      ),
      bandLegendLabel: String(style['fit-band-legend-label'] ?? '').trim(),
      bandAnimation: ['fade', 'rise', 'grow', 'draw'].includes(
        String(style['fit-band-animation'] ?? '')
          .trim()
          .toLowerCase()
      )
        ? String(style['fit-band-animation']).trim().toLowerCase()
        : '',
      bandAnimationDelay: safeCssTime(style['fit-band-animation-delay'], '0ms'),
      bandAnimationDuration: safeCssTime(style['fit-band-animation-duration'], '600ms'),
      bandAnimationEasing: safeEasing(
        style['fit-band-animation-easing'],
        'cubic-bezier(.2,.8,.2,1)'
      ),
      draw: !['false', 'no', 'off', '0'].includes(
        String(style['fit-draw'] ?? '')
          .trim()
          .toLowerCase()
      ),
      animation: ['fade', 'rise', 'grow', 'draw'].includes(
        String(style['fit-animation'] ?? style.animation ?? '')
          .trim()
          .toLowerCase()
      )
        ? String(style['fit-animation'] ?? style.animation)
            .trim()
            .toLowerCase()
        : '',
      animationDelay: safeCssTime(style['fit-animation-delay'] ?? style['animation-delay'], '0ms'),
      animationStagger: safeCssTime(style['fit-animation-stagger'], '0ms'),
      animationDuration: safeCssTime(
        style['fit-animation-duration'] ?? style['animation-duration'],
        '600ms'
      ),
      animationEasing: safeEasing(
        style['fit-animation-easing'] ?? style['animation-easing'],
        'cubic-bezier(.2,.8,.2,1)'
      ),
      all: ['true', 'yes', 'on'].includes(
        String(style['fit-all'] ?? '')
          .trim()
          .toLowerCase()
      ),
      id: safeFitIdentifier(style['fit-id'], 'fit'),
      xMin: parseFitRange(style)[0],
      xMax: parseFitRange(style)[1],
      ranges: parseFitIntervals(style['fit-ranges']),
      exclude: parseFitIntervals(style['fit-exclude']),
      drawExclude: isEnabled(style['fit-draw-exclude']),
      bounds: {
        ...parseFitBounds(style['fit-bounds']),
        ...parseFixedFitParameters(style['fit-fixed'])
      },
      params: String(style['fit-params'] ?? '').trim(),
      results: ['true', 'yes', 'on'].includes(
        String(style['fit-results'] ?? '')
          .trim()
          .toLowerCase()
      ),
      quality: ['true', 'yes', 'on'].includes(
        String(style['fit-quality'] ?? '')
          .trim()
          .toLowerCase()
      ),
      pValue: ['true', 'yes', 'on'].includes(
        String(style['fit-pvalue'] ?? '')
          .trim()
          .toLowerCase()
      ),
      correlation: ['true', 'yes', 'on'].includes(
        String(style['fit-correlation'] ?? '')
          .trim()
          .toLowerCase()
      ),
      correlationX: safeUnitNumber(style['fit-correlation-x']) ?? 0.04,
      correlationY: safeUnitNumber(style['fit-correlation-y']) ?? 0.08,
      correlationSize: Math.max(9, size('fit-correlation-size', 13)),
      correlationColor: color('fit-correlation-color', color('fit-color', '#facc15')),
      correlationPrecision: Math.max(
        0,
        Math.min(4, Math.floor(size('fit-correlation-precision', 2)))
      ),
      diagnostic: ['pull', 'residual'].includes(
        String(style['fit-diagnostic'] ?? '')
          .trim()
          .toLowerCase()
      )
        ? String(style['fit-diagnostic']).trim().toLowerCase()
        : '',
      diagnosticHeight: Math.max(86, size('fit-diagnostic-height', 150)),
      legend: ['true', 'yes', 'on'].includes(
        String(style['fit-legend'] ?? '')
          .trim()
          .toLowerCase()
      ),
      legendLabel: String(style['fit-legend-label'] ?? '').trim(),
      legendOrder: String(style['fit-legend-order'] ?? ''),
      labelX: safeUnitNumber(style['fit-label-x']),
      labelY: safeUnitNumber(style['fit-label-y']),
      labelAlign: ['left', 'center', 'right'].includes(
        String(style['fit-label-align'] ?? '')
          .trim()
          .toLowerCase()
      )
        ? String(style['fit-label-align']).trim().toLowerCase()
        : 'right',
      labelSize: Math.max(10, size('fit-label-size', Math.max(12, size('tick-size', 26) * 0.58))),
      labelColor: color('fit-label-color', color('fit-color', '#facc15')),
      series: String(style['fit-series'] ?? '').trim(),
      samples: Math.max(20, Math.min(500, size('fit-samples', 120))),
      useErrors: !['false', 'no', 'off', '0'].includes(
        String(style['fit-errors'] ?? '')
          .trim()
          .toLowerCase()
      ),
      lineStyle: safeLineStyle(style['fit-line-style']),
      width: size('fit-width', 3)
    },
    valueColor: color('value-color', theme.foreground),
    valueFont: font('value-font'),
    valueSize: size('value-size', 13),
    pointLabels: isEnabled(style['point-labels']),
    pointLabelValue: !['false', 'off', 'no', '0'].includes(
      String(style['point-label-value'] ?? '')
        .trim()
        .toLowerCase()
    ),
    pointLabelErrors: String(style['point-label-errors'] ?? '').trim(),
    pointLabelColor: color('point-label-color', color('value-color', theme.foreground)),
    pointLabelSize: size('point-label-size', size('value-size', 13)),
    pointLabelOffsetX: offset('point-label-offset-x'),
    pointLabelOffsetY: offset('point-label-offset-y'),
    gridColor: color('grid-color', theme.border),
    gridAlpha: alpha('grid-alpha'),
    gridWidth: size('grid-width', 1),
    plotOffsetX: offset('plot-offset-x'),
    plotOffsetY: offset('plot-offset-y'),
    plotAlpha: alpha('plot-alpha'),
    chartHeight: safeDimension(style['chart-height'], 'auto'),
    chartWidth: safeDimension(style['chart-width'], '100%'),
    plotHeight: safePlotDimension(style['plot-height'], 270),
    plotWidth: safePlotDimension(style['plot-width'], 720),
    referenceColor: color('reference-color', theme.foreground),
    referenceDash: safeDash(style['reference-dash'], '7 5'),
    referenceLabel: String(style['reference-label'] ?? '').trim(),
    referenceLabelColor: color('reference-label-color', theme.foreground),
    referenceWidth: size('reference-width', 2),
    referenceLines: normalizeReferenceLines(chart.getAttribute?.('referenceLines'), {
      color: color('reference-color', theme.foreground),
      dash: safeDash(style['reference-dash'], '7 5'),
      labelColor: color('reference-label-color', theme.foreground),
      width: size('reference-width', 2)
    }),
    referenceX: parseReferenceValues(style['reference-x']),
    referenceY: parseReferenceValues(style['reference-y']),
    tickColor: color('tick-color', theme.muted),
    tickAlpha: alpha('tick-alpha'),
    tickFont: font('tick-font'),
    tickOffsetX: offset('tick-offset-x'),
    tickOffsetY: offset('tick-offset-y'),
    tickSize: size('tick-size', 26),
    stats: getHistogramStats(style),
    statsValues: Object.fromEntries(
      ['entries', 'mean', 'rms', 'stddev', 'min', 'max', 'median'].flatMap((key) => {
        const value = safeOptionalNumber(style[`stats-${key}-value`]);
        return value === null ? [] : [[key, value]];
      })
    ),
    statsAlpha: alpha('stats-alpha'),
    statsColor: color('stats-color', theme.foreground),
    statsFont: font('stats-font'),
    statsSize: size('stats-size', 16),
    statsTitle: String(style['stats-title'] ?? 'Statistics').trim() || 'Statistics',
    statsAnimation: ['fade', 'rise', 'grow', 'reveal'].includes(
      String(style['stats-animation'] ?? '')
        .trim()
        .toLowerCase()
    )
      ? String(style['stats-animation']).trim().toLowerCase()
      : '',
    statsAnimationDelay: safeCssTime(style['stats-animation-delay'], '0ms'),
    statsAnimationDuration: safeCssTime(style['stats-animation-duration'], '600ms'),
    statsAnimationStagger: safeCssTime(style['stats-animation-stagger'], '140ms'),
    statsAnimationEasing: safeEasing(style['stats-animation-easing'], 'cubic-bezier(.2,.8,.2,1)'),
    statsFill: !['false', 'no', 'off', '0'].includes(
      String(style['stats-fill'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    statsFillColor: color('stats-fill-color', color('axis-color', theme.border)),
    statsFillAlpha: safeAlpha(style['stats-fill-alpha'] ?? '.82'),
    statsBorder: !['false', 'no', 'off', '0'].includes(
      String(style['stats-border'] ?? 'true')
        .trim()
        .toLowerCase()
    ),
    statsBorderColor: color('stats-border-color', color('stats-color', theme.foreground)),
    statsBorderAlpha: safeAlpha(style['stats-border-alpha'] ?? '.6'),
    statsBorderWidth: Math.max(0, size('stats-border-width', 1)),
    statsRadius: Math.max(0, size('stats-radius', 8)),
    statsWidth: Math.max(110, size('stats-width', 190)),
    statsX: unit('stats-x', 1),
    statsY: unit('stats-y', 0),
    statsItemStyles,
    trendlineLabel: ['true', 'equation', 'r2'].includes(
      String(style['trendline-label'] ?? '')
        .trim()
        .toLowerCase()
    ),
    titleColor: color('title-color', theme.foreground),
    titleAlpha: alpha('title-alpha'),
    titleFont: font('title-font'),
    titleOffsetX: offset('title-offset-x'),
    titleOffsetY: offset('title-offset-y'),
    titleSize: safeCssSize(style['title-size'], '1.5rem'),
    xLabelColor: color('x-label-color', theme.muted),
    xLabelAlpha: alpha('x-label-alpha'),
    xLabelFont: font('x-label-font'),
    xLabelOffsetX: offset('x-label-offset-x'),
    xLabelOffsetY: offset('x-label-offset-y'),
    xLabelSize: size('x-label-size', 26),
    xScale:
      String(style['x-scale'] ?? '')
        .trim()
        .toLowerCase() === 'log'
        ? 'log'
        : 'linear',
    xMin: safeOptionalNumber(style['x-min']),
    xMax: safeOptionalNumber(style['x-max']),
    yLabelColor: color('y-label-color', theme.muted),
    yLabelAlpha: alpha('y-label-alpha'),
    yLabelFont: font('y-label-font'),
    yLabelOffsetX: offset('y-label-offset-x'),
    yLabelOffsetY: offset('y-label-offset-y'),
    yLabelSize: size('y-label-size', 26),
    yScale:
      String(style['y-scale'] ?? '')
        .trim()
        .toLowerCase() === 'log'
        ? 'log'
        : 'linear',
    yMin: safeOptionalNumber(style['y-min']),
    yMax: safeOptionalNumber(style['y-max']),
    yAxisDigits: Math.max(0, Math.min(12, Math.floor(size('y-axis-digits', 0)))),
    rightYAxisDigits: Math.max(
      0,
      Math.min(12, Math.floor(size('right-y-axis-digits', size('y-axis-digits', 0))))
    ),
    rightAxisColor: color('right-axis-color', color('axis-color', theme.border)),
    rightTickColor: color('right-tick-color', color('tick-color', theme.muted)),
    rightTickFont: font('right-tick-font'),
    rightTickSize: size('right-tick-size', 26),
    rightYLabel: String(style['right-y-label'] ?? '').trim(),
    rightYLabelColor: color('right-y-label-color', color('y-label-color', theme.muted)),
    rightYLabelFont: font('right-y-label-font'),
    rightYLabelSize: size('right-y-label-size', 26),
    rightYScale:
      String(style['right-y-scale'] ?? '')
        .trim()
        .toLowerCase() === 'log'
        ? 'log'
        : 'linear',
    rightYMin: safeOptionalNumber(style['right-y-min']),
    rightYMax: safeOptionalNumber(style['right-y-max'])
  };
}

function safeColor(value, fallback) {
  const text = String(value ?? '').trim();
  return /^[#(),.%\sa-zA-Z0-9-]+$/.test(text) && text !== '' ? text : fallback;
}

function safeCssSize(value, fallback) {
  const text = String(value ?? '').trim();
  if (/^\d+(?:\.\d+)?(?:px|em|rem|pt|%)?$/.test(text))
    return /[a-z%]/i.test(text) ? text : `${text}px`;
  return fallback;
}

function safeCssTime(value, fallback) {
  const text = String(value ?? '').trim();
  return /^\d+(?:\.\d+)?(?:ms|s)$/.test(text) ? text : fallback;
}

function safeEasing(value, fallback) {
  const text = String(value ?? '').trim();
  return /^(?:linear|ease(?:-in|-out|-in-out)?|cubic-bezier\([\d.,\s-]+\))$/.test(text)
    ? text
    : fallback;
}

function getHistogramStats(style) {
  const mode = String(style.stats ?? '')
    .trim()
    .toLowerCase();
  const enabled =
    ['true', 'yes', 'on', 'all'].includes(mode) ||
    mode.includes(',') ||
    ['entries', 'mean', 'rms', 'stddev', 'min', 'max', 'median'].includes(mode) ||
    ['entries', 'mean', 'rms', 'stddev', 'min', 'max', 'median'].some(
      (key) => style[`stats-${key}`] !== undefined || style[`stats-${key}-value`] !== undefined
    );
  const requested = new Set(
    mode
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const selected = (key) => {
    const explicit = style[`stats-${key}`];
    if (explicit !== undefined)
      return ['true', 'yes', 'on', '1'].includes(String(explicit).trim().toLowerCase());
    if (safeOptionalNumber(style[`stats-${key}-value`]) !== null) return true;
    if (['true', 'yes', 'on', 'all'].includes(mode))
      return ['entries', 'mean', 'rms'].includes(key) || mode === 'all';
    return requested.has(key);
  };
  return {
    enabled,
    entries: selected('entries'),
    mean: selected('mean'),
    rms: selected('rms'),
    stddev: selected('stddev'),
    min: selected('min'),
    max: selected('max'),
    median: selected('median')
  };
}

function safeDimension(value, fallback) {
  const text = String(value ?? '').trim();
  return /^\d+(?:\.\d+)?(?:px|em|rem|vh|vw|%)?$/.test(text)
    ? /[a-z%]/i.test(text)
      ? text
      : `${text}px`
    : fallback;
}

function normalizeColumnTracks(value, count) {
  if (!Array.isArray(value) || value.length !== count || count < 1) return null;
  const tracks = value.map((entry) => {
    const text = String(entry ?? '').trim().toLowerCase();
    if (text === 'auto') return 'auto';
    const match = text.match(/^(\d+(?:\.\d+)?)(%|fr|px|rem|em)?$/);
    if (!match || Number(match[1]) <= 0) return null;
    const unit = match[2] ?? 'fr';
    return `${match[1]}${unit}`;
  });
  return tracks.some((track) => track === null) ? null : tracks;
}

function safePlotDimension(value, fallback) {
  const number = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(number) ? Math.max(120, Math.min(1600, number)) : fallback;
}

function safeFont(value, fallback) {
  const text = String(value ?? '').trim();
  return /^[a-zA-Z0-9 ,.\-_]+$/.test(text) && text !== '' ? text : fallback;
}

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-200, Math.min(200, number)) : fallback;
}

function safeOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeUnitNumber(value) {
  const text = String(value ?? '').trim();
  if (text === '') return Number.NaN;
  const number = Number(text);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : Number.NaN;
}

function parseFitRange(style) {
  const text = String(style['fit-range'] ?? '').trim();
  const supplied = text === '' ? [] : text.split(',').map((value) => Number(value.trim()));
  const minimum =
    safeOptionalNumber(style['fit-x-min']) ?? (Number.isFinite(supplied[0]) ? supplied[0] : null);
  const maximum =
    safeOptionalNumber(style['fit-x-max']) ?? (Number.isFinite(supplied[1]) ? supplied[1] : null);
  return [minimum, maximum];
}

function parseFitIntervals(value) {
  return String(value ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(/\s*(?:,|:)\s*/).map(Number))
    .filter(([minimum, maximum]) => Number.isFinite(minimum) && Number.isFinite(maximum))
    .map(([minimum, maximum]) => [Math.min(minimum, maximum), Math.max(minimum, maximum)]);
}

function parseReferenceValues(value) {
  const text = String(value ?? '').trim();
  if (text === '') return [];
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite);
}

function normalizeReferenceLines(value, defaults) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const axis = String(item.axis ?? '')
        .trim()
        .toLowerCase();
      const requestedValues = parseReferenceValues(item.value);
      const requestedXValues = parseReferenceValues(item.x);
      const requestedYValues = parseReferenceValues(item.y);
      const animation = String(item.animation ?? '')
        .trim()
        .toLowerCase();
      const requestedLabel = String(item.label ?? '').trim();
      const labelVisibility = String(item['label-visible'] ?? item.label ?? 'true')
        .trim()
        .toLowerCase();
      const requestedDash = String(item.dash ?? item['line-style'] ?? '').trim();
      return {
        name: String(item.name ?? 'Reference').trim() || 'Reference',
        xValues:
          requestedXValues.length > 0 ? requestedXValues : axis === 'x' ? requestedValues : [],
        yValues:
          requestedYValues.length > 0 ? requestedYValues : axis === 'y' ? requestedValues : [],
        color: safeColor(item.color, defaults.color),
        width: Math.max(0.5, safeNumber(item.width ?? item['line-width'], defaults.width)),
        alpha: safeAlpha(item.alpha),
        dash:
          requestedDash === ''
            ? defaults.dash
            : /^\d+(?:\s+\d+)*$/.test(requestedDash)
              ? requestedDash
              : // SVG needs an explicit non-empty value here. Otherwise ROOT's
                // `root-1` (solid) falls through to the chart's dashed default.
                safeLineStyle(requestedDash) || 'none',
        label: ['true', 'yes', 'on', '1'].includes(requestedLabel.toLowerCase())
          ? ''
          : requestedLabel,
        labelVisible: !['false', 'no', 'off', '0', 'none'].includes(labelVisibility),
        labelColor: safeColor(item['label-color'], defaults.labelColor),
        labelSize: Math.max(0, safeNumber(item['label-size'], 0)),
        legend: ['true', 'yes', 'on', '1'].includes(
          String(item.legend ?? '')
            .trim()
            .toLowerCase()
        ),
        legendOrder: String(item['legend-order'] ?? item.order ?? ''),
        animation: ['fade', 'rise', 'grow', 'draw'].includes(animation) ? animation : '',
        animationDelay: safeCssTime(item['animation-delay'], '0ms'),
        animationDuration: safeCssTime(item['animation-duration'], '600ms'),
        animationEasing: safeEasing(item['animation-easing'], 'cubic-bezier(.2,.8,.2,1)')
      };
    });
}

function safeDash(value, fallback) {
  const text = String(value ?? '').trim();
  return /^\d+(?:\s+\d+)*$/.test(text) ? text : fallback;
}

function safeAlpha(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 1;
}

function createHistogramView(chart, theme) {
  const appearance = getPlotAppearance(chart, theme);
  if (Array.isArray(chart.getAttribute?.('series')) && chart.getAttribute('series').length > 0)
    return createMultiHistogramView(chart, theme, appearance);
  const preBinned = getPreBinnedHistogram(chart);
  const plot = {
    height: appearance.plotHeight,
    left: 95,
    top: 30,
    width: appearance.plotWidth
  };
  plot.bottom = plot.top + plot.height;
  const width = plot.left + plot.width + 30;
  const height = plot.bottom + 70;
  const dataMinimum = preBinned ? preBinned.edges[0] : Math.min(...chart.values);
  const dataMaximum = preBinned ? preBinned.edges.at(-1) : Math.max(...chart.values);
  let minimum = appearance.xMin ?? dataMinimum;
  let maximum = appearance.xMax ?? dataMaximum;
  if (maximum <= minimum) [minimum, maximum] = [dataMinimum, dataMaximum];
  // Match ROOT TH1 binning: keep the requested number of bins independent of
  // the number of observations, use [xmin, xmax), and track flow bins instead
  // of folding out-of-range entries into the visible edge bins.
  const bins = preBinned ? preBinned.counts.length : chart.bins;
  const span = Math.max(maximum - minimum, 1);
  const binWidth = span / bins;
  const binEdges = preBinned
    ? preBinned.edges
    : Array.from({ length: bins + 1 }, (_, index) => minimum + index * binWidth);
  const counts = preBinned ? preBinned.counts : Array.from({ length: bins }, () => 0);
  let underflow = 0;
  let overflow = 0;
  const hasExplicitMaximum = appearance.xMax !== undefined;
  if (!preBinned) {
    chart.values.forEach((value) => {
      if (value < minimum) {
        underflow += 1;
        return;
      }
      if (value > maximum || (value === maximum && hasExplicitMaximum)) {
        overflow += 1;
        return;
      }
      const index = Math.min(bins - 1, Math.floor((value - minimum) / binWidth));
      counts[index] += 1;
    });
  }
  // Fit histograms at their bin centres, with ROOT-like sqrt(N) uncertainties
  // available whenever `fit-errors` is left enabled.
  const histogramFitSeries = {
    name: chart.title || 'Histogram',
    xValues: counts.map((_, index) => (binEdges[index] + binEdges[index + 1]) / 2),
    values: counts,
    errorValues: counts.map((count) => Math.sqrt(Math.max(0, count))),
    errorLowValues: [],
    errorHighValues: [],
    yAxis: 'left',
    fitAlpha: '',
    fitAnimation: '',
    fitAnimationDelay: '',
    fitAnimationDuration: '',
    fitAnimationEasing: '',
    fitColor: '',
    fitWidth: ''
  };
  const fits = getFitConfigs(chart, theme, appearance.fit).flatMap((config) =>
    createParametricFits(config, [histogramFitSeries])
  );
  const countDataMaximum = Math.max(...counts, 1);
  let countMinimum = appearance.yMin ?? 0;
  let countMaximum = appearance.yMax ?? countDataMaximum * 1.1;
  if (countMaximum <= countMinimum) [countMinimum, countMaximum] = [0, countDataMaximum];
  const countRange = countMaximum - countMinimum;
  const yFor = (value) => plot.bottom - ((value - countMinimum) / countRange) * plot.height;
  const yTicks = createScientificTicks(countMinimum, countMaximum, appearance.tickDivisions);
  const yAxisExponent = getAxisScaleExponent(
    Math.max(Math.abs(countMinimum), Math.abs(countMaximum)),
    appearance.yAxisDigits
  );
  const grid = yTicks
    .map((value) => {
      const y = yFor(value);
      return `<path d="M ${plot.left} ${y} H ${plot.left + plot.width}" stroke="${appearance.gridColor}" stroke-width="${appearance.gridWidth}" stroke-dasharray="4 6" opacity=".7" />
      <text x="${plot.left - 12 + appearance.tickOffsetX}" y="${y + 4 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="end">${formatChartValue(value / 10 ** yAxisExponent)}</text>`;
    })
    .join('');
  const bars = counts
    .map((count, index) => {
      const lower = binEdges[index];
      const upper = binEdges[index + 1];
      const slotWidth = ((upper - lower) / span) * plot.width;
      const gap = appearance.histogramFill
        ? Math.min(slotWidth - 1, appearance.histogramBinGap)
        : 0;
      const x = plot.left + ((lower - minimum) / span) * plot.width + gap / 2;
      const barWidth = slotWidth - gap;
      const y = yFor(count);
      const shape = appearance.histogramFill
        ? `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(2, plot.bottom - y)}" rx="${gap > 0 ? 3 : 0}" fill="${appearance.dataColor}" />`
        : `<path d="M ${x} ${y} H ${x + barWidth}" fill="none" stroke="${appearance.dataColor}" stroke-width="${Math.max(1, appearance.dataSize / 2)}" />`;
      return `<g data-neopresent-tooltip="${escapeSvgText(`${formatChartValue(lower)}–${formatChartValue(upper)}: ${count}`)}" data-neopresent-mark-kind="bar" style="${createDataAnimation(appearance, index, bins, 'center bottom')}">
      ${shape}
      <title>${escapeSvgText(`${formatChartValue(lower)}–${formatChartValue(upper)}: ${count}`)}</title>
    </g>`;
    })
    .join('');
  const outerEdges = !appearance.histogramFill
    ? `<path d="M ${plot.left + ((binEdges[0] - minimum) / span) * plot.width} ${plot.bottom} V ${yFor(counts[0])}" fill="none" stroke="${appearance.dataColor}" stroke-width="${Math.max(1, appearance.dataSize / 2)}" style="${createDataAnimation(appearance, 0, bins, 'center bottom')}" /><path d="M ${plot.left + ((binEdges.at(-1) - minimum) / span) * plot.width} ${yFor(counts.at(-1))} V ${plot.bottom}" fill="none" stroke="${appearance.dataColor}" stroke-width="${Math.max(1, appearance.dataSize / 2)}" style="${createDataAnimation(appearance, bins, bins, 'center bottom')}" />`
    : '';
  const profileConnectors = !appearance.histogramFill
    ? counts
        .slice(0, -1)
        .map((count, index) => {
          const x = plot.left + ((binEdges[index + 1] - minimum) / span) * plot.width;
          return `<path d="M ${x} ${yFor(count)} V ${yFor(counts[index + 1])}" fill="none" stroke="${appearance.dataColor}" stroke-width="${Math.max(1, appearance.dataSize / 2)}" style="${createDataAnimation(appearance, index + 1, bins, 'center bottom')}" />`;
        })
        .join('')
    : '';
  const binLines = appearance.histogramBinLines
    ? Array.from({ length: Math.max(0, bins - 1) }, (_, index) => {
        const x = plot.left + ((binEdges[index + 1] - minimum) / span) * plot.width;
        return `<path d="M ${x} ${plot.top} V ${plot.bottom}" stroke="${appearance.axisColor}" stroke-width="${Math.max(1, appearance.gridWidth)}" opacity=".8" pointer-events="none" />`;
      }).join('')
    : '';
  const xTicks = createScientificTicks(minimum, maximum, appearance.tickDivisions);
  const xLabels = xTicks
    .map(
      (value) =>
        `<text x="${plot.left + ((value - minimum) / span) * plot.width + appearance.tickOffsetX}" y="${plot.bottom + 28 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="middle">${formatScaleTick(value, false)}</text>`
    )
    .join('');
  const references = createReferenceLines({
    appearance,
    plot,
    xFor: (value) => plot.left + ((value - minimum) / span) * plot.width,
    xLog: false,
    xMaximum: maximum,
    xMinimum: minimum,
    yFor,
    yLog: false,
    yMaximum: countMaximum,
    yMinimum: countMinimum,
    supportsX: true
  });
  const referenceLegend = createChartLegend(
    appearance.referenceLines
      .filter((reference) => reference.legend)
      .map((reference) => ({
        name: reference.name,
        legendOrder: reference.legendOrder,
        appearance: {
          ...appearance,
          animation: reference.animation,
          animationDelay: reference.animationDelay,
          animationDuration: reference.animationDuration,
          animationEasing: reference.animationEasing,
          dataAlpha: reference.alpha,
          dataColor: reference.color || appearance.referenceColor,
          dataSize: reference.width || appearance.referenceWidth,
          drawMode: 'L',
          lineStyle: reference.dash || appearance.referenceDash
        }
      })),
    plot,
    appearance
  );
  const annotations = createPlotAnnotations(chart, plot, appearance);
  // Pre-binned histograms retain their original bin edges. Crop the rendered
  // step path and bars to the requested view range, just like ROOT's pad.
  const clipId = `neopresent-histogram-clip-${String(chart.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const scientificAxes = createScientificAxes({
    appearance,
    plot,
    xFor: (value) => plot.left + ((value - minimum) / span) * plot.width,
    xLog: false,
    xMaximum: maximum,
    xMinimum: minimum,
    xTicks,
    yFor,
    yLog: false,
    yMaximum: countMaximum,
    yMinimum: countMinimum,
    yTicks
  });
  const fitMarkup = fits
    .map((fit) =>
      createFitMarkup(
        fit,
        (value) => plot.left + ((value - minimum) / span) * plot.width,
        yFor,
        appearance,
        plot
      )
    )
    .join('');

  return {
    tag: 'div',
    style: { maxWidth: '100%', width: appearance.chartWidth },
    cn: [
      createChartTitle(chart.title, appearance, theme),
      {
        tag: 'div',
        html: `<svg aria-label="${escapeSvgText(chart.title || 'Histogram')}" data-neopresent-histogram-bins="${bins}" data-neopresent-histogram-underflow="${underflow}" data-neopresent-histogram-overflow="${overflow}" data-neopresent-histogram-y-max="${countMaximum}" data-neopresent-histogram-y-axis-exponent="${yAxisExponent}" viewBox="0 0 ${width} ${height}" style="height:${appearance.chartHeight};width:min(100%, ${width}px)" xmlns="http://www.w3.org/2000/svg">
          <defs><clipPath id="${clipId}"><rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" /></clipPath></defs>
          <g opacity="${appearance.gridAlpha}">${grid}</g>
          ${yAxisExponent > 0 ? `<text x="${plot.left + 4}" y="${plot.top - 6}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${Math.max(14, appearance.tickSize * 0.9)}">×10<tspan baseline-shift="super" font-size="70%">${yAxisExponent}</tspan></text>` : ''}
          ${scientificAxes}
          ${references}
          <g clip-path="url(#${clipId})" opacity="${appearance.dataAlpha}">${bars}${profileConnectors}${outerEdges}</g>
          <g clip-path="url(#${clipId})">${fitMarkup}</g>
          ${binLines}
          ${createHistogramStatistics(preBinned ? createBinnedHistogramStatistics(binEdges, counts) : createRawHistogramStatistics(chart.values), plot, appearance)}
          <g opacity="${appearance.tickAlpha}">${xLabels}</g>
          ${referenceLegend}
          ${annotations}
          ${createAxisLabels(chart.xLabel, chart.yLabel, width, height, plot, appearance)}
        </svg>`,
        style: createChartFrameStyle(appearance)
      }
    ].filter(Boolean)
  };
}

function createMultiHistogramView(chart, theme, appearance) {
  const input = getBaseRenderableSeries(chart).filter((item) => item.values.length > 0);
  const datasets = input.map((item, index) => {
    const counts = item.values.map(Number).filter(Number.isFinite);
    const lowerEdges =
      item.xValues.length === counts.length
        ? item.xValues.map(Number)
        : Array.from({ length: counts.length }, (_, position) => position);
    const finalStep = lowerEdges.length > 1 ? lowerEdges.at(-1) - lowerEdges.at(-2) : 1;
    return {
      ...item,
      color: safeColor(item.color, index === 0 ? appearance.dataColor : '#ef4444'),
      counts,
      edges:
        item.histogramEdges?.length === counts.length + 1
          ? item.histogramEdges
          : [...lowerEdges, lowerEdges.at(-1) + (finalStep > 0 ? finalStep : 1)],
      size: Math.max(1, safeNumber(item.dataSize, appearance.dataSize)),
      alpha: item.dataAlpha === '' ? appearance.dataAlpha : safeAlpha(item.dataAlpha),
      yAxis: item.yAxis === 'right' ? 'right' : 'left'
    };
  });
  if (datasets.length === 0) return { tag: 'div', text: 'No usable histogram series.' };

  const plot = { height: appearance.plotHeight, left: 95, top: 30, width: appearance.plotWidth };
  plot.bottom = plot.top + plot.height;
  const hasRightAxis = datasets.some((item) => item.yAxis === 'right');
  const width = plot.left + plot.width + (hasRightAxis ? 100 : 30);
  const height = plot.bottom + 70;
  const allEdges = datasets.flatMap((item) => item.edges);
  const dataMinimum = Math.min(...allEdges);
  const dataMaximum = Math.max(...allEdges);
  const minimum = appearance.xMin ?? dataMinimum;
  const maximum = appearance.xMax ?? dataMaximum;
  const span = Math.max(maximum - minimum, 1);
  const leftCounts = datasets
    .filter((item) => item.yAxis !== 'right')
    .flatMap((item) => item.counts);
  const rightCounts = datasets
    .filter((item) => item.yAxis === 'right')
    .flatMap((item) => item.counts);
  const leftMaximum = Math.max(...leftCounts, 1);
  const rightMaximum = Math.max(...rightCounts, 1);
  const leftMinimum = appearance.yMin ?? 0;
  const leftCeiling = appearance.yMax ?? leftMaximum * 1.1;
  const rightMinimum = appearance.rightYMin ?? 0;
  const rightCeiling = appearance.rightYMax ?? rightMaximum * 1.1;
  const leftRange = Math.max(leftCeiling - leftMinimum, 1);
  const rightRange = Math.max(rightCeiling - rightMinimum, 1);
  const leftAxisExponent = getAxisScaleExponent(
    Math.max(Math.abs(leftMinimum), Math.abs(leftCeiling)),
    appearance.yAxisDigits
  );
  const rightAxisExponent = getAxisScaleExponent(
    Math.max(Math.abs(rightMinimum), Math.abs(rightCeiling)),
    appearance.rightYAxisDigits
  );
  const xFor = (value) => plot.left + ((value - minimum) / span) * plot.width;
  const yFor = (value) => plot.bottom - ((value - leftMinimum) / leftRange) * plot.height;
  const rightYFor = (value) => plot.bottom - ((value - rightMinimum) / rightRange) * plot.height;
  const yTicks = createScientificTicks(leftMinimum, leftCeiling, appearance.tickDivisions);
  const grid = yTicks
    .map((value) => {
      const y = yFor(value);
      return `<path d="M ${plot.left} ${y} H ${plot.left + plot.width}" stroke="${appearance.gridColor}" stroke-width="${appearance.gridWidth}" stroke-dasharray="4 6" opacity=".7" /><text x="${plot.left - 12 + appearance.tickOffsetX}" y="${y + 4 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="end">${formatChartValue(value / 10 ** leftAxisExponent)}</text>`;
    })
    .join('');
  const rightTicks = hasRightAxis
    ? createScientificTicks(rightMinimum, rightCeiling, appearance.tickDivisions)
        .map((value) => {
          const y = rightYFor(value);
          return `<path d="M ${plot.left + plot.width} ${y} h ${appearance.tickLength}" stroke="${appearance.rightAxisColor}" stroke-width="${appearance.axisWidth}" /><text x="${plot.left + plot.width + 12}" y="${y + 4}" fill="${appearance.rightTickColor}" font-family="${appearance.rightTickFont}" font-size="${appearance.rightTickSize}">${formatChartValue(value / 10 ** rightAxisExponent)}</text>`;
        })
        .join('')
    : '';
  const bars = datasets
    .map((dataset, datasetIndex) => {
      const projectY = dataset.yAxis === 'right' ? rightYFor : yFor;
      const seriesAppearance = {
        ...appearance,
        animation: dataset.animation || appearance.animation,
        animationDelay: dataset.animationDelay || appearance.animationDelay,
        animationDuration: dataset.animationDuration || appearance.animationDuration,
        animationEasing: dataset.animationEasing || appearance.animationEasing
      };
      if (!appearance.histogramFill) {
        // Do not connect empty, cropped-away bins along y=0. Otherwise an
        // x-min cut leaves a distracting baseline from the original low edge.
        let previous = null;
        const path = dataset.counts
          .map((count, index) => {
            const lower = dataset.edges[index];
            const upper = dataset.edges[index + 1];
            if (count === 0 || upper <= minimum || lower >= maximum) {
              previous = null;
              return '';
            }
            const start = Math.max(plot.left, xFor(Math.max(lower, minimum)));
            const end = Math.min(plot.left + plot.width, xFor(Math.min(upper, maximum)));
            if (end <= start) {
              previous = null;
              return '';
            }
            const y = projectY(count);
            const connected = previous && Math.abs(previous.end - start) < 0.001;
            previous = { end, y };
            return connected ? ` V ${y} H ${end}` : `M ${start} ${y} H ${end}`;
          })
          .join('');
        const hitAreas = dataset.counts
          .map((count, index) => {
            const lower = dataset.edges[index];
            const upper = dataset.edges[index + 1];
            if (upper <= minimum || lower >= maximum) return '';
            const x = Math.max(plot.left, xFor(Math.max(lower, minimum)));
            const end = Math.min(plot.left + plot.width, xFor(Math.min(upper, maximum)));
            if (end <= x) return '';
            const tooltip = `${dataset.name}: ${formatChartValue(lower)}–${formatChartValue(upper)}: ${formatChartValue(count)}`;
            // Invisible, narrow hit targets preserve the outline-only look while
            // still allowing each step bin to provide its own tooltip.
            return `<rect x="${x}" y="${projectY(count) - 6}" width="${end - x}" height="12" fill="transparent" pointer-events="all" data-neopresent-tooltip="${escapeSvgText(tooltip)}" data-neopresent-mark-kind="bar"><title>${escapeSvgText(tooltip)}</title></rect>`;
          })
          .join('');
        return path
          ? `<g style="${createDataAnimation(seriesAppearance, datasetIndex, datasets.length, 'center bottom')}"><path d="${path}" fill="none" stroke="${dataset.color}" stroke-width="${Math.max(1, dataset.size / 2)}" stroke-linejoin="miter" opacity="${dataset.alpha}" />${hitAreas}</g>`
          : '';
      }
      return dataset.counts
        .map((count, index) => {
          const lower = dataset.edges[index];
          const upper = dataset.edges[index + 1];
          if (upper <= minimum || lower >= maximum) return '';
          const x = Math.max(plot.left, xFor(Math.max(lower, minimum)));
          const barWidth = Math.max(
            0,
            Math.min(plot.left + plot.width, xFor(Math.min(upper, maximum))) - x
          );
          const y = projectY(count);
          const tooltip = `${dataset.name}: ${formatChartValue(lower)}–${formatChartValue(upper)}: ${formatChartValue(count)}`;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(0, plot.bottom - y)}" fill="${dataset.color}" fill-opacity="${dataset.alpha}" data-neopresent-tooltip="${escapeSvgText(tooltip)}" data-neopresent-mark-kind="bar" style="${createDataAnimation(seriesAppearance, index, dataset.counts.length, 'center bottom')}"><title>${escapeSvgText(tooltip)}</title></rect>`;
        })
        .join('');
    })
    .join('');
  const xTicks = createScientificTicks(minimum, maximum, appearance.tickDivisions);
  const xLabels = xTicks
    .map(
      (value) =>
        `<text x="${xFor(value)}" y="${plot.bottom + 28}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="middle">${formatScaleTick(value, false)}</text>`
    )
    .join('');
  const scientificAxes = createScientificAxes({
    appearance,
    plot,
    xFor,
    xLog: false,
    xMaximum: maximum,
    xMinimum: minimum,
    xTicks,
    yFor,
    yLog: false,
    yMaximum: leftCeiling,
    yMinimum: leftMinimum,
    yTicks
  });
  const references = createReferenceLines({
    appearance,
    plot,
    xFor,
    xLog: false,
    xMaximum: maximum,
    xMinimum: minimum,
    yFor,
    yLog: false,
    yMaximum: leftCeiling,
    yMinimum: leftMinimum,
    supportsX: true
  });
  const clipId = `neopresent-multi-histogram-clip-${String(chart.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const legend = createChartLegend(
    [
      ...datasets.map((item) => ({
        ...item,
        appearance: {
          animation: '',
          dataAlpha: item.alpha,
          dataColor: item.color,
          dataSize: item.size,
          drawMode: 'L',
          lineStyle: ''
        }
      })),
      ...appearance.referenceLines
        .filter((reference) => reference.legend)
        .map((reference) => ({
          name: reference.name,
          legendOrder: reference.legendOrder,
          appearance: {
            ...appearance,
            animation: reference.animation,
            animationDelay: reference.animationDelay,
            animationDuration: reference.animationDuration,
            animationEasing: reference.animationEasing,
            dataAlpha: reference.alpha,
            dataColor: reference.color || appearance.referenceColor,
            dataSize: reference.width || appearance.referenceWidth,
            drawMode: 'L',
            lineStyle: reference.dash || appearance.referenceDash
          }
        }))
    ],
    plot,
    appearance
  );
  const statistics = datasets
    .map((dataset, index) => {
      const statsStyle = dataset.statsStyle;
      const configured = Object.keys(statsStyle).length > 0;
      // A slide-level stats setting describes the first histogram. Give later
      // series an independent box only when their own stats setting is present.
      if (index > 0 && !configured) return '';
      const statsAppearance = configured
        ? getPlotAppearance(
            {
              getAttribute: (name) =>
                name === 'plotStyle'
                  ? {
                      ...(chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {}),
                      ...statsStyle,
                      'stats-title': statsStyle['stats-title'] ?? dataset.name
                    }
                  : undefined,
              plotStyle: {
                ...(chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {}),
                ...statsStyle,
                'stats-title': statsStyle['stats-title'] ?? dataset.name
              }
            },
            theme
          )
        : appearance;
      return createHistogramStatistics(
        createBinnedHistogramStatistics(dataset.edges, dataset.counts),
        plot,
        statsAppearance
      );
    })
    .join('');
  const rightAxis = hasRightAxis
    ? `<path d="M ${plot.left + plot.width} ${plot.top} V ${plot.bottom}" fill="none" stroke="${appearance.rightAxisColor}" stroke-width="${appearance.axisWidth}" />`
    : '';
  return {
    tag: 'div',
    style: { maxWidth: '100%', width: appearance.chartWidth },
    cn: [
      createChartTitle(chart.title, appearance, theme),
      {
        tag: 'div',
        html: `<svg aria-label="${escapeSvgText(chart.title || 'Histogram')}" viewBox="0 0 ${width} ${height}" style="height:${appearance.chartHeight};width:min(100%, ${width}px)" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${clipId}"><rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height}" /></clipPath></defs><g opacity="${appearance.gridAlpha}">${grid}</g>${leftAxisExponent > 0 ? `<text x="${plot.left + 4}" y="${plot.top - 6}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${Math.max(14, appearance.tickSize * 0.9)}">×10<tspan baseline-shift="super" font-size="70%">${leftAxisExponent}</tspan></text>` : ''}${rightAxisExponent > 0 ? `<text x="${plot.left + plot.width - 4}" y="${plot.top - 6}" fill="${appearance.rightTickColor}" font-family="${appearance.rightTickFont}" font-size="${Math.max(14, appearance.rightTickSize * 0.9)}" text-anchor="end">×10<tspan baseline-shift="super" font-size="70%">${rightAxisExponent}</tspan></text>` : ''}${scientificAxes}<g clip-path="url(#${clipId})">${bars}</g>${references}${rightAxis}${rightTicks}${hasRightAxis ? createRightAxisLabel(appearance.rightYLabel, plot, appearance) : ''}${statistics}<g opacity="${appearance.tickAlpha}">${xLabels}</g>${legend}${createPlotAnnotations(chart, plot, appearance)}${createAxisLabels(chart.xLabel, chart.yLabel, width, height, plot, appearance)}</svg>`,
        style: createChartFrameStyle(appearance)
      }
    ].filter(Boolean)
  };
}

function createBoxPlotView(chart, theme) {
  const appearance = getPlotAppearance(chart, theme);
  const plot = {
    height: appearance.plotHeight,
    left: 95,
    top: 30,
    width: appearance.plotWidth
  };
  plot.bottom = plot.top + plot.height;
  const width = plot.left + plot.width + 30;
  const height = plot.bottom + 70;
  const sorted = [...chart.values].sort((left, right) => left - right);
  const dataMinimum = sorted[0];
  const dataMaximum = sorted.at(-1);
  let minimum = appearance.yMin ?? dataMinimum;
  let maximum = appearance.yMax ?? dataMaximum;
  if (maximum <= minimum) [minimum, maximum] = [dataMinimum, dataMaximum];
  const range = Math.max(maximum - minimum, 1);
  const yFor = (value) => plot.bottom - ((value - minimum) / range) * plot.height;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const center = plot.left + plot.width / 2;
  const boxWidth = Math.min(180, plot.width * 0.35);
  const grid = Array.from({ length: 5 }, (_, index) => minimum + (range * index) / 4)
    .map((value) => {
      const y = yFor(value);
      return `<path d="M ${plot.left} ${y} H ${plot.left + plot.width}" stroke="${appearance.gridColor}" stroke-width="${appearance.gridWidth}" stroke-dasharray="4 6" opacity=".7" />
      <text x="${plot.left - 12 + appearance.tickOffsetX}" y="${y + 4 + appearance.tickOffsetY}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${appearance.tickSize}" text-anchor="end">${formatChartValue(value)}</text>`;
    })
    .join('');
  const references = createReferenceLines({
    appearance,
    plot,
    xFor: () => center,
    xLog: false,
    xMaximum: 1,
    xMinimum: 0,
    yFor,
    yLog: false,
    yMaximum: maximum,
    yMinimum: minimum,
    supportsX: false
  });
  const annotations = createPlotAnnotations(chart, plot, appearance);
  const boxTooltip = `Min ${formatChartValue(dataMinimum)} · Q1 ${formatChartValue(q1)} · Median ${formatChartValue(median)} · Q3 ${formatChartValue(q3)} · Max ${formatChartValue(dataMaximum)}`;
  const box = `<g data-neopresent-tooltip="${escapeSvgText(boxTooltip)}" data-neopresent-mark-kind="box" style="${createDataAnimation(appearance, 0, 1)}"><path d="M ${center} ${yFor(dataMaximum)} V ${yFor(q3)} M ${center} ${yFor(q1)} V ${yFor(dataMinimum)} M ${center - boxWidth * 0.25} ${yFor(dataMaximum)} H ${center + boxWidth * 0.25} M ${center - boxWidth * 0.25} ${yFor(dataMinimum)} H ${center + boxWidth * 0.25}" fill="none" stroke="${appearance.dataColor}" stroke-width="${appearance.dataSize}" />
    <rect x="${center - boxWidth / 2}" y="${yFor(q3)}" width="${boxWidth}" height="${Math.max(1, yFor(q1) - yFor(q3))}" fill="${appearance.dataColor}" fill-opacity=".25" stroke="${appearance.dataColor}" stroke-width="${appearance.dataSize}">
      <title>${escapeSvgText(boxTooltip)}</title>
    </rect>
    <path d="M ${center - boxWidth / 2} ${yFor(median)} H ${center + boxWidth / 2}" stroke="${appearance.dataColor}" stroke-width="${appearance.dataSize}" /></g>`;
  return {
    tag: 'div',
    style: { maxWidth: '100%', width: appearance.chartWidth },
    cn: [
      createChartTitle(chart.title, appearance, theme),
      {
        tag: 'div',
        html: `<svg aria-label="${escapeSvgText(chart.title || 'Box plot')}" viewBox="0 0 ${width} ${height}" style="height:${appearance.chartHeight};width:min(100%, ${width}px)" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${appearance.gridAlpha}">${grid}</g>
        <path d="M ${plot.left} ${plot.top} V ${plot.bottom} H ${plot.left + plot.width}" fill="none" opacity="${appearance.axisAlpha}" stroke="${appearance.axisColor}" stroke-width="${appearance.axisWidth}" />
        ${references}
        <g opacity="${appearance.dataAlpha}">${box}</g>
        ${annotations}
        ${createAxisLabels(chart.xLabel, chart.yLabel, width, height, plot, appearance)}
      </svg>`,
        style: createChartFrameStyle(appearance)
      }
    ].filter(Boolean)
  };
}

function createChartFrameStyle(appearance) {
  return {
    lineHeight: 0,
    opacity: appearance.plotAlpha,
    transform: `translate(${appearance.plotOffsetX}px, ${appearance.plotOffsetY}px)`,
    transformOrigin: 'center',
    width: '100%'
  };
}

function createDataAnimation(appearance, index, total, origin = 'center') {
  if (
    !appearance.animation ||
    ['none', 'off', 'false'].includes(String(appearance.animation).toLowerCase())
  )
    return '';
  const duration = cssTimeToMilliseconds(appearance.animationDuration);
  const delay = cssTimeToMilliseconds(appearance.animationDelay);
  const stagger = Math.min(120, Math.max(45, (duration / Math.max(total, 1)) * 0.8));
  const name = appearance.animation === 'draw' ? 'fade' : appearance.animation;
  return `animation:neopresent-chart-${name} ${appearance.animationDuration} ${appearance.animationEasing} ${Math.round(delay + index * stagger)}ms both;transform-box:fill-box;transform-origin:${origin}`;
}

function cssTimeToMilliseconds(value) {
  const text = String(value ?? '0ms').trim();
  const number = Number.parseFloat(text);
  return Number.isFinite(number)
    ? text.endsWith('s') && !text.endsWith('ms')
      ? number * 1000
      : number
    : 0;
}

function getPreBinnedHistogram(chart) {
  const style = chart.plotStyle ?? chart.getAttribute?.('plotStyle') ?? {};
  const parse = (value) =>
    String(value ?? '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter(Number.isFinite);
  const edges = parse(style['bin-edges']);
  const counts = parse(style['bin-counts']);
  if (
    edges.length < 2 ||
    counts.length !== edges.length - 1 ||
    counts.some((count) => count < 0) ||
    edges.some((edge, index) => index > 0 && edge <= edges[index - 1])
  ) {
    return null;
  }
  return { edges, counts };
}

function createRawHistogramStatistics(values) {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const rms = Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
  const sorted = [...values].sort((left, right) => left - right);
  return {
    entries: values.length,
    mean,
    rms,
    stddev: Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length),
    min: sorted[0],
    max: sorted.at(-1),
    median: quantile(sorted, 0.5)
  };
}

function createBinnedHistogramStatistics(edges, counts) {
  const entries = counts.reduce((sum, count) => sum + count, 0);
  if (entries <= 0) return null;
  const centers = counts.map((_, index) => (edges[index] + edges[index + 1]) / 2);
  const mean = counts.reduce((sum, count, index) => sum + count * centers[index], 0) / entries;
  const rms = Math.sqrt(
    counts.reduce((sum, count, index) => sum + count * centers[index] ** 2, 0) / entries
  );
  const first = counts.findIndex((count) => count > 0);
  const last = counts.length - 1 - [...counts].reverse().findIndex((count) => count > 0);
  let cumulative = 0;
  const medianIndex = counts.findIndex((count) => {
    cumulative += count;
    return cumulative >= entries / 2;
  });
  return {
    entries,
    mean,
    rms,
    stddev: Math.sqrt(
      counts.reduce((sum, count, index) => sum + count * (centers[index] - mean) ** 2, 0) / entries
    ),
    min: edges[first],
    max: edges[last + 1],
    median: centers[Math.max(0, medianIndex)]
  };
}

function createHistogramStatistics(statistics, plot, appearance) {
  const settings = appearance.stats;
  const resolved = { ...statistics, ...appearance.statsValues };
  if (!settings.enabled || !statistics) return '';
  const rows = [
    settings.entries && ['entries', 'Entries', formatChartValue(resolved.entries)],
    settings.mean && ['mean', 'Mean', formatChartValue(resolved.mean)],
    settings.rms && ['rms', 'RMS', formatChartValue(resolved.rms)],
    settings.stddev && ['stddev', 'Std Dev', formatChartValue(resolved.stddev)],
    settings.min && ['min', 'Min', formatChartValue(resolved.min)],
    settings.max && ['max', 'Max', formatChartValue(resolved.max)],
    settings.median && ['median', 'Median', formatChartValue(resolved.median)]
  ].filter(Boolean);
  if (rows.length === 0) return '';
  const boxWidth = appearance.statsWidth;
  const lineHeight = Math.max(18, appearance.statsSize * 1.35);
  const height = lineHeight * (rows.length + 1) + 32;
  const padding = 12;
  const x =
    plot.left + padding + appearance.statsX * Math.max(0, plot.width - boxWidth - padding * 2);
  const y =
    plot.top + padding + appearance.statsY * Math.max(0, plot.height - height - padding * 2);
  const lines = rows
    .map(([key, label, value], index) => {
      const item = appearance.statsItemStyles[key];
      const reveal =
        appearance.statsAnimation === 'reveal'
          ? `animation:neopresent-chart-rise ${appearance.statsAnimationDuration} ${appearance.statsAnimationEasing} ${Math.round(cssTimeToMilliseconds(appearance.statsAnimationDelay) + (index + 1) * cssTimeToMilliseconds(appearance.statsAnimationStagger))}ms both;transform-box:fill-box;transform-origin:center;`
          : '';
      return `<text data-neopresent-stats-item="${key}" x="${x + 12}" y="${y + 25 + lineHeight * (index + 1)}" fill="${item.color}" fill-opacity="${item.alpha}" font-family="${item.font}" font-size="${item.size}" style="${reveal}"><tspan fill="${item.labelColor}">${escapeSvgText(label)}</tspan><tspan x="${x + boxWidth - 12}" fill="${item.valueColor}" text-anchor="end">${escapeSvgText(value)}</tspan></text>`;
    })
    .join('');
  const animation =
    appearance.statsAnimation && appearance.statsAnimation !== 'reveal'
      ? `animation:neopresent-chart-${appearance.statsAnimation} ${appearance.statsAnimationDuration} ${appearance.statsAnimationEasing} ${appearance.statsAnimationDelay} both;transform-box:fill-box;transform-origin:center;`
      : '';
  const titleAnimation =
    appearance.statsAnimation === 'reveal'
      ? `animation:neopresent-chart-fade ${appearance.statsAnimationDuration} ${appearance.statsAnimationEasing} ${appearance.statsAnimationDelay} both;transform-box:fill-box;transform-origin:center;`
      : '';
  return `<g opacity="${appearance.statsAlpha}"><g data-neopresent-histogram-stats="true" style="${animation}"><rect x="${x}" y="${y}" width="${boxWidth}" height="${height}" rx="${appearance.statsRadius}" fill="${appearance.statsFill ? appearance.statsFillColor : 'none'}" fill-opacity="${appearance.statsFillAlpha}" stroke="${appearance.statsBorder ? appearance.statsBorderColor : 'none'}" stroke-opacity="${appearance.statsBorderAlpha}" stroke-width="${appearance.statsBorderWidth}" />
    <text x="${x + 12}" y="${y + lineHeight}" fill="${appearance.statsColor}" font-family="${appearance.statsFont}" font-size="${appearance.statsSize}" font-weight="700" style="${titleAnimation}">${escapeSvgText(appearance.statsTitle)}</text>${lines}</g></g>`;
}

function createScatterMarkup(
  chart,
  points,
  errors,
  xErrors,
  yFor,
  xForValue,
  xValues,
  xMinimum,
  xMaximum,
  theme,
  appearance,
  plot
) {
  const mode = getDrawMode(appearance.drawMode, 'scatter');
  const lowerErrors = Array.isArray(errors) ? errors : errors.lower;
  const upperErrors = Array.isArray(errors) ? errors : errors.upper;
  const xLowerErrors =
    xErrors.lower.length === points.length
      ? xErrors.lower
      : xErrors.upper.length === points.length
        ? xErrors.upper
        : points.map(() => 0);
  const xUpperErrors =
    xErrors.upper.length === points.length
      ? xErrors.upper
      : xErrors.lower.length === points.length
        ? xErrors.lower
        : points.map(() => 0);
  const showErrors =
    mode.includes('E') ||
    (!appearance.drawMode && [...lowerErrors, ...upperErrors].some((error) => error > 0));
  const namedUncertainties = createNamedUncertaintyMarkup(
    chart,
    points,
    yFor,
    xForValue,
    xValues,
    appearance
  );
  const errorBars = points
    .map((point, index) => {
      const lower = lowerErrors[index] ?? 0;
      const upper = upperErrors[index] ?? 0;
      const xLower = xLowerErrors[index] ?? 0;
      const xUpper = xUpperErrors[index] ?? 0;
      if (!showErrors || (lower === 0 && upper === 0 && xLower === 0 && xUpper === 0)) return '';
      const top = yFor(chart.values[index] + upper);
      const bottom = yFor(chart.values[index] - lower);
      const left = xForValue(xValues[index] - xLower);
      const right = xForValue(xValues[index] + xUpper);
      const cap = appearance.errorCapSize;
      const box =
        appearance.errorBox && (lower || upper || xLower || xUpper)
          ? `<rect x="${left}" y="${top}" width="${Math.max(1, right - left)}" height="${Math.max(1, bottom - top)}" fill="${appearance.errorBoxColor}" fill-opacity="${appearance.errorBoxAlpha}" stroke="${appearance.errorBoxColor}" stroke-width="${Math.max(0.5, appearance.errorWidth * 0.5)}" stroke-opacity="${appearance.errorAlpha}" />`
          : '';
      const vertical =
        lower || upper
          ? `M ${point.x} ${top} V ${bottom} M ${point.x - cap} ${top} H ${point.x + cap} M ${point.x - cap} ${bottom} H ${point.x + cap}`
          : '';
      const horizontal =
        xLower || xUpper
          ? `M ${left} ${point.y} H ${right} M ${left} ${point.y - cap} V ${point.y + cap} M ${right} ${point.y - cap} V ${point.y + cap}`
          : '';
      return `<g style="${createDataAnimation(appearance, index, points.length)}">${box}<path d="${vertical} ${horizontal}" stroke="${appearance.errorColor}" stroke-width="${appearance.errorWidth}" opacity="${appearance.errorAlpha}" /></g>`;
    })
    .join('');
  const trendline = chart.trendline
    ? createTrendline(
        chart.values,
        xValues,
        xMinimum,
        xMaximum,
        points,
        yFor,
        theme,
        appearance,
        plot
      )
    : '';
  const line = mode.includes('L') ? createDataPath(points, chart.smooth, appearance) : '';
  const dots = mode.includes('P')
    ? points
        .map((point, index) => {
          const lower = lowerErrors[index] ?? 0;
          const upper = upperErrors[index] ?? 0;
          const xLower = xLowerErrors[index] ?? 0;
          const xUpper = xUpperErrors[index] ?? 0;
          const yUncertainty =
            lower === upper
              ? lower
                ? ` ± ${formatChartValue(lower)}`
                : ''
              : ` +${formatChartValue(upper)} / −${formatChartValue(lower)}`;
          const xUncertainty =
            xLower === xUpper
              ? xLower
                ? ` ± ${formatChartValue(xLower)}`
                : ''
              : ` +${formatChartValue(xUpper)} / −${formatChartValue(xLower)}`;
          const layerUncertainties = resolveUncertaintyLayers(
            chart.uncertaintyLayers,
            points.length
          )
            .filter(isUncertaintyLayerVisible)
            .map((layer) => {
              const sigma = getUncertaintySigma(layer);
              const symmetric =
                layer.errorValues.length === points.length ? (layer.errorValues[index] ?? 0) : 0;
              const low =
                (layer.errorLowValues.length === points.length
                  ? (layer.errorLowValues[index] ?? 0)
                  : symmetric) * sigma;
              const high =
                (layer.errorHighValues.length === points.length
                  ? (layer.errorHighValues[index] ?? 0)
                  : symmetric) * sigma;
              if (low === 0 && high === 0) return '';
              return low === high
                ? `±${formatChartValue(low)} (${layer.name})`
                : `+${formatChartValue(high)} / −${formatChartValue(low)} (${layer.name})`;
            })
            .filter(Boolean)
            .join(' ');
          const bubbleValues =
            Array.isArray(chart.bubbleSizes) && chart.bubbleSizes.length === points.length
              ? chart.bubbleSizes
              : appearance.bubbleSizes;
          const bubbleTooltip =
            bubbleValues.length === points.length
              ? `; ${appearance.bubbleLabel}=${formatChartValue(bubbleValues[index])}`
              : '';
          const tooltip = `${chart.labels[index]}: x=${formatChartValue(xValues[index])}${xUncertainty}; y=${formatChartValue(chart.values[index])}${yUncertainty}${layerUncertainties ? ` ${layerUncertainties}` : ''}${bubbleTooltip}`;
          const bubbleMinimum = Math.min(...bubbleValues);
          const bubbleMaximum = Math.max(...bubbleValues);
          const scaleBubble = (value) => {
            if (appearance.bubbleScale === 'sqrt') return Math.sqrt(Math.max(0, value));
            if (appearance.bubbleScale === 'log') return Math.log1p(Math.max(0, value));
            return value;
          };
          const scaledMinimum = scaleBubble(bubbleMinimum);
          const scaledMaximum = scaleBubble(bubbleMaximum);
          const bubbleRadius =
            bubbleValues.length === points.length
              ? appearance.bubbleMin +
                ((scaleBubble(bubbleValues[index]) - scaledMinimum) /
                  Math.max(1, scaledMaximum - scaledMinimum)) *
                  (appearance.bubbleMax - appearance.bubbleMin)
              : appearance.dataSize + 2;
          return createPointSymbol(
            point,
            { ...appearance, dataSize: Math.max(0.5, bubbleRadius - 2) },
            createDataAnimation(appearance, index, points.length),
            tooltip
          );
        })
        .join('')
    : '';
  const pointLabels = appearance.pointLabels
    ? points
        .map((point, index) => {
          const requested = appearance.pointLabelErrors.toLowerCase();
          const includeAll = ['all', 'true', 'yes'].includes(requested);
          const requestedNames = requested
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);
          const namedErrors = resolveUncertaintyLayers(chart.uncertaintyLayers, points.length)
            .filter(isUncertaintyLayerVisible)
            .filter((layer) => includeAll || requestedNames.includes(layer.name.toLowerCase()))
            .map((layer) => {
              const sigma = getUncertaintySigma(layer);
              const symmetric =
                layer.errorValues.length === points.length ? (layer.errorValues[index] ?? 0) : 0;
              const low =
                (layer.errorLowValues.length === points.length
                  ? (layer.errorLowValues[index] ?? 0)
                  : symmetric) * sigma;
              const high =
                (layer.errorHighValues.length === points.length
                  ? (layer.errorHighValues[index] ?? 0)
                  : symmetric) * sigma;
              if (low === 0 && high === 0) return '';
              return low === high
                ? `±${formatChartValue(low)} ${layer.name}`
                : `+${formatChartValue(high)}/−${formatChartValue(low)} ${layer.name}`;
            })
            .filter(Boolean);
          const upper = Math.max(
            upperErrors[index] ?? 0,
            ...resolveUncertaintyLayers(chart.uncertaintyLayers, points.length)
              .filter(isUncertaintyLayerVisible)
              .map((layer) => {
                const symmetric =
                  layer.errorValues.length === points.length ? (layer.errorValues[index] ?? 0) : 0;
                return (
                  (layer.errorHighValues.length === points.length
                    ? (layer.errorHighValues[index] ?? 0)
                    : symmetric) * getUncertaintySigma(layer)
                );
              })
          );
          const x = point.x + appearance.pointLabelOffsetX;
          const y = yFor(chart.values[index] + upper) - 8 + appearance.pointLabelOffsetY;
          const customLabel = Array.isArray(chart.pointLabelValues)
            ? String(chart.pointLabelValues[index] ?? '')
            : '';
          const text = [
            ...(customLabel ? [customLabel] : []),
            ...(appearance.pointLabelValue ? [formatChartValue(chart.values[index])] : []),
            ...namedErrors
          ];
          return `<text x="${x}" y="${y}" fill="${appearance.pointLabelColor}" font-family="${appearance.valueFont}" font-size="${appearance.pointLabelSize}" font-weight="700" text-anchor="middle" style="${createDataAnimation(appearance, index, points.length)}">${text.map((line, lineIndex) => `<tspan x="${x}" dy="${lineIndex === 0 ? 0 : appearance.pointLabelSize * 1.12}">${escapeSvgText(line)}</tspan>`).join('')}</text>`;
        })
        .join('')
    : '';
  const symmetricBand = lowerErrors.map((value, index) =>
    Math.max(value ?? 0, upperErrors[index] ?? 0)
  );
  const band =
    appearance.band && symmetricBand.some((error) => error > 0)
      ? createErrorBand(chart.values, symmetricBand, points, yFor, appearance)
      : '';
  return `${band}${namedUncertainties}${errorBars}${line}${trendline}${dots}${pointLabels}`;
}

function normalizeUncertaintyLayers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((layer) => layer && typeof layer === 'object')
    .map((layer) => ({
      name: String(layer.name ?? 'Uncertainty'),
      style:
        layer.style === 'box' || layer.style === 'ellipse' || layer.style === 'band'
          ? layer.style
          : 'bar',
      color: String(layer.color ?? ''),
      width: String(layer.width ?? ''),
      alpha: String(layer.alpha ?? ''),
      capSize: String(layer.capSize ?? ''),
      fillColor: String(layer.fillColor ?? ''),
      fillAlpha: String(layer.fillAlpha ?? ''),
      lineStyle: String(layer.lineStyle ?? ''),
      sigma: String(layer.sigma ?? ''),
      combine: String(layer.combine ?? ''),
      animation: String(layer.animation ?? ''),
      animationDuration: String(layer.animationDuration ?? ''),
      animationDelay: String(layer.animationDelay ?? ''),
      animationEasing: String(layer.animationEasing ?? ''),
      visible: String(layer.visible ?? ''),
      legend: String(layer.legend ?? ''),
      legendOrder: String(layer.legendOrder ?? ''),
      errorValues: Array.isArray(layer.errorValues)
        ? layer.errorValues.filter(Number.isFinite)
        : [],
      errorLowValues: Array.isArray(layer.errorLowValues)
        ? layer.errorLowValues.filter(Number.isFinite)
        : [],
      errorHighValues: Array.isArray(layer.errorHighValues)
        ? layer.errorHighValues.filter(Number.isFinite)
        : [],
      xErrorValues: Array.isArray(layer.xErrorValues)
        ? layer.xErrorValues.filter(Number.isFinite)
        : [],
      correlationValues: Array.isArray(layer.correlationValues)
        ? layer.correlationValues.filter(Number.isFinite)
        : []
    }));
}

function isUncertaintyLayerVisible(layer) {
  return !['false', 'off', 'no', '0'].includes(
    String(layer?.visible ?? '')
      .trim()
      .toLowerCase()
  );
}

function resolveUncertaintyLayers(value, pointCount) {
  const layers = normalizeUncertaintyLayers(value);
  const resolved = [];
  const byName = new Map();
  for (const layer of layers) {
    const names = layer.combine
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
    if (names.length === 0) {
      resolved.push(layer);
      byName.set(layer.name.trim().toLowerCase(), layer);
      continue;
    }
    const sources = names.map((name) => byName.get(name)).filter(Boolean);
    if (sources.length === 0 || pointCount === 0) {
      resolved.push(layer);
      byName.set(layer.name.trim().toLowerCase(), layer);
      continue;
    }
    const combine = (index, side) =>
      Math.sqrt(
        sources.reduce((sum, source) => {
          const symmetric =
            source.errorValues.length === pointCount ? (source.errorValues[index] ?? 0) : 0;
          const sourceValue =
            side === 'low'
              ? source.errorLowValues.length === pointCount
                ? (source.errorLowValues[index] ?? 0)
                : symmetric
              : source.errorHighValues.length === pointCount
                ? (source.errorHighValues[index] ?? 0)
                : symmetric;
          return sum + (sourceValue * getUncertaintySigma(source)) ** 2;
        }, 0)
      );
    const derived = {
      ...layer,
      errorValues: [],
      errorLowValues: Array.from({ length: pointCount }, (_, index) => combine(index, 'low')),
      errorHighValues: Array.from({ length: pointCount }, (_, index) => combine(index, 'high'))
    };
    resolved.push(derived);
    byName.set(layer.name.trim().toLowerCase(), derived);
  }
  return resolved;
}

function createNamedUncertaintyMarkup(chart, points, yFor, xForValue, xValues, appearance) {
  return resolveUncertaintyLayers(chart.uncertaintyLayers, points.length)
    .map((layer, layerIndex) => {
      if (!isUncertaintyLayerVisible(layer)) return '';
      const symmetric =
        layer.errorValues.length === points.length ? layer.errorValues : points.map(() => 0);
      const lower =
        layer.errorLowValues.length === points.length ? layer.errorLowValues : symmetric;
      const upper =
        layer.errorHighValues.length === points.length ? layer.errorHighValues : symmetric;
      const color = safeColor(layer.color, appearance.errorColor);
      const defaultWidth =
        layer.style === 'bar' || layer.style === 'ellipse' ? 2 : appearance.errorWidth;
      const defaultCap =
        layer.style === 'box' ? 8 : layer.style === 'bar' ? 5 : appearance.errorCapSize;
      const width = Math.max(
        0.5,
        layer.width === '' ? defaultWidth : safeNumber(layer.width, defaultWidth)
      );
      const alpha = layer.alpha === '' ? appearance.errorAlpha : safeAlpha(layer.alpha);
      const cap = Math.max(
        1,
        layer.capSize === '' ? defaultCap : safeNumber(layer.capSize, defaultCap)
      );
      const fill = safeColor(layer.fillColor, color);
      const fillAlpha = layer.fillAlpha === '' ? Math.min(0.22, alpha) : safeAlpha(layer.fillAlpha);
      const lineStyle = safeLineStyle(layer.lineStyle) || 'none';
      const sigma = getUncertaintySigma(layer);
      const layerAppearance = getUncertaintyLayerAppearance(layer, appearance);
      if (layer.style === 'band') {
        const envelope = points.map((point, index) => ({
          index,
          point,
          low: (lower[index] ?? 0) * sigma,
          high: (upper[index] ?? 0) * sigma
        }));
        if (!envelope.some(({ low, high }) => low > 0 || high > 0)) return '';
        const upperPath = envelope
          .map(
            ({ index, point, high }) =>
              `${index === 0 ? 'M' : 'L'} ${point.x} ${yFor(chart.values[index] + high)}`
          )
          .join(' ');
        const lowerPath = [...envelope]
          .reverse()
          .map(({ index, point, low }) => `L ${point.x} ${yFor(chart.values[index] - low)}`)
          .join(' ');
        return `<g data-neopresent-uncertainty="${escapeSvgText(layer.name)}" data-neopresent-uncertainty-style="band" style="${createDataAnimation(layerAppearance, layerIndex, 1)}"><path d="${upperPath} ${lowerPath} Z" fill="${fill}" fill-opacity="${fillAlpha}" stroke="${color}" stroke-width="${width}" stroke-opacity="${alpha}" stroke-dasharray="${lineStyle}" /><title>${escapeSvgText(`${layer.name} uncertainty band`)}</title></g>`;
      }
      return points
        .map((point, index) => {
          const low = (lower[index] ?? 0) * sigma;
          const high = (upper[index] ?? 0) * sigma;
          if (low === 0 && high === 0) return '';
          const top = yFor(chart.values[index] + high);
          const bottom = yFor(chart.values[index] - low);
          const tooltip = `${layer.name}: +${formatChartValue(high)} / −${formatChartValue(low)}`;
          const xError = (layer.xErrorValues[index] ?? 0) * sigma;
          const correlation = Math.max(-1, Math.min(1, layer.correlationValues[index] ?? 0));
          const mark =
            layer.style === 'ellipse' && xError > 0
              ? createCovarianceEllipse(
                  point,
                  xValues[index],
                  chart.values[index],
                  xError,
                  Math.max(low, high),
                  correlation,
                  xForValue,
                  yFor,
                  color,
                  width,
                  alpha,
                  fill,
                  fillAlpha,
                  lineStyle
                )
              : layer.style === 'box'
                ? `<rect x="${point.x - cap}" y="${top}" width="${cap * 2}" height="${Math.max(1, bottom - top)}" fill="${fill}" fill-opacity="${fillAlpha}" stroke="${color}" stroke-width="${width}" stroke-opacity="${alpha}" stroke-dasharray="${lineStyle}" />`
                : `<path d="M ${point.x} ${top} V ${bottom} M ${point.x - cap} ${top} H ${point.x + cap} M ${point.x - cap} ${bottom} H ${point.x + cap}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="${alpha}" stroke-dasharray="${lineStyle}" />`;
          return `<g data-neopresent-uncertainty="${escapeSvgText(layer.name)}" data-neopresent-uncertainty-style="${layer.style}" style="${createDataAnimation(layerAppearance, index + layerIndex, points.length)}">${mark}<title>${escapeSvgText(tooltip)}</title></g>`;
        })
        .join('');
    })
    .join('');
}

function getUncertaintyLayerAppearance(layer, appearance) {
  const requested = layer.animation.trim().toLowerCase();
  const animation = ['fade', 'rise', 'grow'].includes(requested)
    ? requested
    : ['off', 'false', 'none'].includes(requested)
      ? ''
      : appearance.animation;
  return {
    ...appearance,
    animation,
    animationDuration: layer.animationDuration
      ? safeCssTime(layer.animationDuration, appearance.animationDuration)
      : appearance.animationDuration,
    animationDelay: layer.animationDelay
      ? safeCssTime(layer.animationDelay, appearance.animationDelay)
      : appearance.animationDelay,
    animationEasing: layer.animationEasing
      ? safeEasing(layer.animationEasing, appearance.animationEasing)
      : appearance.animationEasing
  };
}

function getUncertaintySigma(layer) {
  return Math.max(0, layer.sigma === '' ? 1 : safeNumber(layer.sigma, 1));
}

function createCovarianceEllipse(
  point,
  xValue,
  yValue,
  xError,
  yError,
  correlation,
  xFor,
  yFor,
  color,
  width,
  alpha,
  fill,
  fillAlpha,
  lineStyle
) {
  const sx = Math.abs(xFor(xValue + xError) - point.x);
  const sy = Math.abs(yFor(yValue + yError) - point.y);
  const a = sx * sx;
  const d = sy * sy;
  const b = correlation * sx * sy;
  const root = Math.sqrt(Math.max(0, (a - d) ** 2 + 4 * b * b));
  const major = Math.sqrt(Math.max(0, (a + d + root) / 2));
  const minor = Math.sqrt(Math.max(0, (a + d - root) / 2));
  const angle = (Math.atan2(2 * b, a - d) * 90) / Math.PI;
  return `<ellipse cx="${point.x}" cy="${point.y}" rx="${major}" ry="${minor}" transform="rotate(${angle} ${point.x} ${point.y})" fill="${fill}" fill-opacity="${fillAlpha}" stroke="${color}" stroke-width="${width}" stroke-opacity="${alpha}" stroke-dasharray="${lineStyle}" />`;
}

function createTrendline(
  values,
  xValues,
  xMinimum,
  xMaximum,
  points,
  yFor,
  theme,
  appearance,
  plot
) {
  if (values.length < 2) return '';
  const meanX = xValues.reduce((total, value) => total + value, 0) / xValues.length;
  const meanY = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = xValues.reduce((total, value) => total + (value - meanX) ** 2, 0);
  if (variance === 0) return '';
  const covariance = values.reduce(
    (total, value, index) => total + (xValues[index] - meanX) * (value - meanY),
    0
  );
  const slope = covariance / variance;
  const intercept = meanY - slope * meanX;
  const leftX =
    points.length === 1
      ? points[0].x
      : points.reduce((lowest, point) => Math.min(lowest, point.x), Number.POSITIVE_INFINITY);
  const rightX =
    points.length === 1
      ? points[0].x
      : points.reduce((highest, point) => Math.max(highest, point.x), Number.NEGATIVE_INFINITY);
  const path = `<path style="${createSeriesAnimation(appearance)}" d="M ${leftX} ${yFor(slope * xMinimum + intercept)} L ${rightX} ${yFor(slope * xMaximum + intercept)}" fill="none" stroke="${appearance.dataColor}" stroke-dasharray="8 7" stroke-width="${Math.max(1, appearance.dataSize / 2)}" opacity=".78" />`;
  if (!appearance.trendlineLabel) return path;
  const residual = values.reduce(
    (total, value, index) => total + (value - (slope * xValues[index] + intercept)) ** 2,
    0
  );
  const variation = values.reduce((total, value) => total + (value - meanY) ** 2, 0);
  const rSquared = variation === 0 ? 1 : Math.max(0, 1 - residual / variation);
  const sign = intercept < 0 ? '−' : '+';
  const annotation = `y = ${formatChartValue(slope)}x ${sign} ${formatChartValue(Math.abs(intercept))}, R² = ${rSquared.toFixed(3)}`;
  return `${path}<text x="${plot.left + plot.width - 8}" y="${plot.top + 18}" fill="${appearance.tickColor}" font-family="${appearance.tickFont}" font-size="${Math.max(11, appearance.tickSize * 0.65)}" text-anchor="end">${annotation}</text>`;
}

function createLineMarkup(chart, points, errors, yFor, theme, appearance, plot) {
  const path =
    chart.smooth && points.length > 1
      ? points.slice(0, -1).reduce((result, point, index) => {
          const previous = points[Math.max(index - 1, 0)];
          const next = points[index + 1];
          const following = points[Math.min(index + 2, points.length - 1)];
          const control1 = {
            x: point.x + (next.x - previous.x) / 6,
            y: point.y + (next.y - previous.y) / 6
          };
          const control2 = {
            x: next.x - (following.x - point.x) / 6,
            y: next.y - (following.y - point.y) / 6
          };
          return `${result} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
        }, `M ${points[0].x} ${points[0].y}`)
      : points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const mode = getDrawMode(appearance.drawMode, chart.kind);
  const errorBars = mode.includes('E')
    ? points
        .map((point, index) => {
          const error = errors[index];
          if (!error) return '';
          const top = yFor(chart.values[index] + error);
          const bottom = yFor(chart.values[index] - error);
          return `<path style="${createDataAnimation(appearance, index, points.length)}" d="M ${point.x} ${top} V ${bottom} M ${point.x - 7} ${top} H ${point.x + 7} M ${point.x - 7} ${bottom} H ${point.x + 7}" fill="none" stroke="${appearance.dataColor}" stroke-width="${Math.max(1, appearance.dataSize / 3)}" opacity=".86" />`;
        })
        .join('')
    : '';
  const dots = mode.includes('P')
    ? points
        .map(
          (point, index) => `
    ${createPointSymbol(point, appearance, createDataAnimation(appearance, index, points.length), `${chart.labels[index]}: ${formatChartValue(chart.values[index])}`)}
    <text x="${point.x}" y="${point.y - 15}" fill="${appearance.valueColor}" font-family="${appearance.valueFont}" font-size="${appearance.valueSize}" font-weight="700" text-anchor="middle">${formatChartValue(chart.values[index])}</text>`
        )
        .join('')
    : '';

  const area =
    chart.kind === 'area'
      ? `<path style="${createSeriesAnimation(appearance)}" d="${path} L ${points.at(-1).x} ${plot.bottom} L ${points[0].x} ${plot.bottom} Z" fill="${appearance.dataColor}" opacity=".22" />`
      : '';
  const line = mode.includes('L')
    ? `<path pathLength="1" style="${createSeriesAnimation(appearance)}" d="${path}" fill="none" stroke="${appearance.dataColor}" stroke-dasharray="${appearance.lineStyle || 'none'}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${appearance.dataSize}" />`
    : '';
  const band =
    appearance.band && errors.some((error) => error > 0)
      ? createErrorBand(chart.values, errors, points, yFor, appearance)
      : '';
  return `${band}${area}${errorBars}${line}${dots}`;
}

function createDataPath(points, smooth, appearance) {
  const path =
    smooth && points.length > 1
      ? points.slice(0, -1).reduce((result, point, index) => {
          const previous = points[Math.max(index - 1, 0)];
          const next = points[index + 1];
          const following = points[Math.min(index + 2, points.length - 1)];
          return `${result} C ${point.x + (next.x - previous.x) / 6} ${point.y + (next.y - previous.y) / 6}, ${next.x - (following.x - point.x) / 6} ${next.y - (following.y - point.y) / 6}, ${next.x} ${next.y}`;
        }, `M ${points[0].x} ${points[0].y}`)
      : points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return `<path pathLength="1" style="${createSeriesAnimation(appearance)}" d="${path}" fill="none" stroke="${appearance.dataColor}" stroke-dasharray="${appearance.lineStyle || 'none'}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${appearance.dataSize}" />`;
}

function createErrorBand(values, errors, points, yFor, appearance) {
  const upper = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${yFor(values[index] + errors[index])}`
    )
    .join(' ');
  const lower = points
    .map((point, index) => `L ${point.x} ${yFor(values[index] - errors[index])}`)
    .reverse()
    .join(' ');
  const outline = appearance.bandLine
    ? `<path d="${upper} ${lower}" fill="none" stroke="${appearance.bandColor}" stroke-width="${Math.max(1, appearance.dataSize * 0.45)}" />`
    : '';
  return `<path d="${upper} ${lower} Z" fill="${appearance.bandColor}" fill-opacity="${appearance.bandAlpha}" stroke="none" />${outline}`;
}

function createPointSymbol(point, appearance, animation, tooltip) {
  const radius = appearance.dataSize + 2;
  const open = appearance.dataSymbol.startsWith('open-');
  const shape = appearance.dataSymbol.replace(/^open-/, '').replace(/^full-/, '');
  const common = `data-neopresent-tooltip="${escapeSvgText(tooltip)}" style="${animation}" fill="${open ? 'none' : appearance.dataColor}" stroke="${appearance.dataColor}" stroke-width="${open ? 3 : 0}"`;
  const title = `<title>${escapeSvgText(tooltip)}</title>`;
  if (shape === 'square' || shape === 'square-diagonal')
    return `<rect ${common} x="${point.x - radius}" y="${point.y - radius}" width="${radius * 2}" height="${radius * 2}" transform="rotate(${shape === 'square-diagonal' ? 45 : 0} ${point.x} ${point.y})">${title}</rect>`;
  if (shape === 'diamond' || shape === 'double-diamond')
    return `<path ${common} d="M ${point.x} ${point.y - radius} L ${point.x + radius} ${point.y} L ${point.x} ${point.y + radius} L ${point.x - radius} ${point.y} Z">${title}</path>`;
  if (shape === 'triangle-up' || shape === 'triangle')
    return `<path ${common} d="M ${point.x} ${point.y - radius} L ${point.x + radius} ${point.y + radius} L ${point.x - radius} ${point.y + radius} Z">${title}</path>`;
  if (shape === 'triangle-down')
    return `<path ${common} d="M ${point.x} ${point.y + radius} L ${point.x + radius} ${point.y - radius} L ${point.x - radius} ${point.y - radius} Z">${title}</path>`;
  if (shape === 'star')
    return `<path ${common} d="${starPath(point.x, point.y, radius)}">${title}</path>`;
  if (shape === 'octagon-cross')
    return `<path ${common} d="${octagonPath(point.x, point.y, radius)}">${title}</path>`;
  if (
    shape.includes('cross') ||
    shape === 'plus' ||
    shape.includes('triangles') ||
    shape.includes('squares')
  ) {
    const diagonal = shape.includes('cross') || shape.includes('x');
    const path = diagonal
      ? `M ${point.x - radius} ${point.y - radius} L ${point.x + radius} ${point.y + radius} M ${point.x + radius} ${point.y - radius} L ${point.x - radius} ${point.y + radius}`
      : `M ${point.x - radius} ${point.y} H ${point.x + radius} M ${point.x} ${point.y - radius} V ${point.x} ${point.y + radius}`;
    return `<path data-neopresent-tooltip="${escapeSvgText(tooltip)}" style="${animation}" d="${path}" fill="none" stroke="${appearance.dataColor}" stroke-width="${Math.max(2, appearance.dataSize / 2)}">${title}</path>`;
  }
  return `<circle ${common} cx="${point.x}" cy="${point.y}" r="${radius}">${title}</circle>`;
}

function starPath(x, y, radius) {
  return (
    Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const r = index % 2 === 0 ? radius : radius * 0.45;
      return `${index === 0 ? 'M' : 'L'} ${x + Math.cos(angle) * r} ${y + Math.sin(angle) * r}`;
    }).join(' ') + ' Z'
  );
}

function octagonPath(x, y, radius) {
  return (
    Array.from({ length: 8 }, (_, index) => {
      const angle = Math.PI / 8 + (index * Math.PI) / 4;
      return `${index === 0 ? 'M' : 'L'} ${x + Math.cos(angle) * radius} ${y + Math.sin(angle) * radius}`;
    }).join(' ') + ' Z'
  );
}

function createSeriesAnimation(appearance) {
  if (!appearance.animation) return '';
  const draw = appearance.animation === 'draw' ? 'stroke-dasharray:1;stroke-dashoffset:1;' : '';
  return `${draw}animation:neopresent-chart-${appearance.animation} ${appearance.animationDuration} ${appearance.animationEasing} ${appearance.animationDelay} both;transform-box:fill-box;transform-origin:center`;
}

function safeSymbol(value) {
  const aliases = {
    kfullcircle: 'full-circle',
    kfullsquare: 'full-square',
    kfulltriangleup: 'full-triangle-up',
    kfulltriangledown: 'full-triangle-down',
    kopencircle: 'open-circle',
    kopensquare: 'open-square',
    kopentriangleup: 'open-triangle-up',
    kopentriangledown: 'open-triangle-down',
    kopendiamond: 'open-diamond',
    kfulldiamond: 'full-diamond',
    kopencross: 'open-cross',
    kfullcross: 'full-cross',
    kfullstar: 'full-star',
    kopenstar: 'open-star',
    kopendiamondcross: 'open-diamond-cross',
    kopensquarediagonal: 'open-square-diagonal',
    kopenthreetriangles: 'open-three-triangles',
    kfullthreetriangles: 'full-three-triangles',
    koctagoncross: 'full-octagon-cross',
    kopenfourtrianglesx: 'open-four-triangles-x',
    kfullfourtrianglesx: 'full-four-triangles-x',
    kopendoublediamond: 'open-double-diamond',
    kfulldoublediamond: 'full-double-diamond',
    kopenfourtrianglesplus: 'open-four-triangles-plus',
    kfullfourtrianglesplus: 'full-four-triangles-plus',
    kopencrossx: 'open-cross-x',
    kfullcrossx: 'full-cross-x',
    kfoursquarex: 'full-four-squares-x',
    kfoursquaresplus: 'full-four-squares-plus'
  };
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[ _]/g, '-');
  const symbol = aliases[raw] ?? raw;
  return /^(?:open-|full-)?(?:circle|square|square-diagonal|diamond|double-diamond|triangle|triangle-up|triangle-down|cross|cross-x|plus|star|diamond-cross|three-triangles|four-triangles-x|four-triangles-plus|four-squares-x|four-squares-plus|octagon-cross)$/.test(
    symbol
  )
    ? symbol
    : 'circle';
}

function safeLineStyle(value) {
  const styles = {
    solid: '',
    dashed: '12 8',
    dotted: '2 7',
    'dash-dot': '12 6 2 6',
    'dash-dot-dot': '12 5 2 5 2 5',
    'root-1': '',
    'root-2': '12 8',
    'root-3': '2 7',
    'root-4': '12 6 2 6',
    'root-5': '12 5 2 5 2 5',
    'root-6': '20 8',
    'root-7': '20 6 2 6',
    'root-8': '20 5 2 5 2 5',
    'root-9': '8 5',
    'root-10': '4 4'
  };
  return (
    styles[
      String(value ?? '')
        .trim()
        .toLowerCase()
    ] ?? ''
  );
}

function isEnabled(value) {
  return ['true', 'yes', 'on', '1'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase()
  );
}

function getDrawMode(value, kind = 'line') {
  const mode = String(value ?? '')
    .toUpperCase()
    .replace(/[^PLE]/g, '');
  if (mode) return mode;
  return kind === 'scatter' ? 'P' : 'LP';
}

function createBarMarkup(chart, points, plot, baseline, theme, appearance) {
  const barWidth = Math.min(90, (plot.width / chart.values.length) * 0.68);
  return points
    .map((point, index) => {
      const y = point.y;
      const height = Math.abs(baseline - y);
      const top = Math.min(baseline, y);
      const color = chart.values[index] < 0 ? '#fb7185' : appearance.dataColor;
      return `<rect data-neopresent-tooltip="${escapeSvgText(`${chart.labels[index]}: ${formatChartValue(chart.values[index])}`)}" style="${createDataAnimation(appearance, index, points.length, 'center bottom')}" x="${point.x - barWidth / 2}" y="${top}" width="${barWidth}" height="${Math.max(height, 2)}" rx="5" fill="${color}">
      <title>${escapeSvgText(`${chart.labels[index]}: ${formatChartValue(chart.values[index])}`)}</title>
    </rect>
    <text x="${point.x}" y="${chart.values[index] < 0 ? y + 18 : y - 10}" fill="${appearance.valueColor}" font-family="${appearance.valueFont}" font-size="${appearance.valueSize}" font-weight="700" text-anchor="middle">${formatChartValue(chart.values[index])}</text>`;
    })
    .join('');
}

function formatChartValue(value) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function getAxisScaleExponent(maximum, digits) {
  if (!(maximum > 0) || digits <= 0) return 0;
  return Math.max(0, Math.floor(Math.log10(maximum)) - digits + 1);
}

function createLogTicks(minimum, maximum) {
  const start = Math.ceil(Math.log10(minimum));
  const end = Math.floor(Math.log10(maximum));
  const ticks = Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => 10 ** (start + index)
  );
  return ticks.length > 0 ? ticks : [minimum, maximum];
}

function createScientificTicks(minimum, maximum, requestedCount = 5) {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
    return [minimum, maximum].filter(Number.isFinite);
  if (maximum <= minimum) return [minimum];
  const roughStep = (maximum - minimum) / Math.max(1, requestedCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;
  const first = Math.ceil((minimum - step * 1e-10) / step) * step;
  const ticks = [];
  for (let value = first; value <= maximum + step * 1e-10; value += step) {
    ticks.push(Math.abs(value) < step * 1e-10 ? 0 : Number(value.toPrecision(14)));
    if (ticks.length > 100) break;
  }
  return ticks.length > 0 ? ticks : [minimum, maximum];
}

function createMinorScientificTicks(majorTicks, minimum, maximum, logarithmic) {
  if (logarithmic) {
    const ticks = [];
    const firstPower = Math.floor(Math.log10(minimum));
    const lastPower = Math.ceil(Math.log10(maximum));
    for (let power = firstPower; power <= lastPower; power += 1)
      for (let multiplier = 2; multiplier < 10; multiplier += 1) {
        const value = multiplier * 10 ** power;
        if (value > minimum && value < maximum) ticks.push(value);
      }
    return ticks;
  }
  const step = majorTicks.length > 1 ? majorTicks[1] - majorTicks[0] : maximum - minimum;
  if (!(step > 0)) return [];
  const minorStep = step / 5;
  const first = Math.ceil((minimum - minorStep * 1e-10) / minorStep) * minorStep;
  const majorTolerance = minorStep * 1e-6;
  const ticks = [];
  for (let value = first; value <= maximum + minorStep * 1e-10; value += minorStep) {
    if (!majorTicks.some((major) => Math.abs(major - value) < majorTolerance))
      ticks.push(Number(value.toPrecision(14)));
    if (ticks.length > 500) break;
  }
  return ticks;
}

function createScientificAxes({
  appearance,
  plot,
  xFor,
  xLog,
  xMaximum,
  xMinimum,
  xTicks,
  yFor,
  yLog,
  yMaximum,
  yMinimum,
  yTicks
}) {
  const frame = [
    `M ${plot.left} ${plot.top} V ${plot.bottom} H ${plot.left + plot.width}`,
    appearance.frameTop ? `M ${plot.left} ${plot.top} H ${plot.left + plot.width}` : '',
    appearance.frameRight ? `M ${plot.left + plot.width} ${plot.top} V ${plot.bottom}` : ''
  ]
    .filter(Boolean)
    .join(' ');
  const xMinor = appearance.minorTicks
    ? createMinorScientificTicks(xTicks, xMinimum, xMaximum, xLog)
    : [];
  const yMinor = appearance.minorTicks
    ? createMinorScientificTicks(yTicks, yMinimum, yMaximum, yLog)
    : [];
  const tickPath = [
    ...xTicks.flatMap((value) => {
      const x = xFor(value);
      return [
        appearance.ticksBottom
          ? `M ${x} ${plot.bottom} V ${plot.bottom - appearance.tickLength}`
          : '',
        appearance.ticksTop ? `M ${x} ${plot.top} V ${plot.top + appearance.tickLength}` : ''
      ];
    }),
    ...yTicks.flatMap((value) => {
      const y = yFor(value);
      return [
        appearance.ticksLeft ? `M ${plot.left} ${y} H ${plot.left + appearance.tickLength}` : '',
        appearance.ticksRight
          ? `M ${plot.left + plot.width} ${y} H ${plot.left + plot.width - appearance.tickLength}`
          : ''
      ];
    }),
    ...xMinor.flatMap((value) => {
      const x = xFor(value);
      return [
        appearance.ticksBottom
          ? `M ${x} ${plot.bottom} V ${plot.bottom - appearance.minorTickLength}`
          : '',
        appearance.ticksTop ? `M ${x} ${plot.top} V ${plot.top + appearance.minorTickLength}` : ''
      ];
    }),
    ...yMinor.flatMap((value) => {
      const y = yFor(value);
      return [
        appearance.ticksLeft
          ? `M ${plot.left} ${y} H ${plot.left + appearance.minorTickLength}`
          : '',
        appearance.ticksRight
          ? `M ${plot.left + plot.width} ${y} H ${plot.left + plot.width - appearance.minorTickLength}`
          : ''
      ];
    })
  ]
    .filter(Boolean)
    .join(' ');
  return `<g data-neopresent-scientific-axes="true" fill="none" opacity="${appearance.axisAlpha}" stroke="${appearance.axisColor}" stroke-width="${appearance.axisWidth}"><path data-neopresent-frame="true" d="${frame}" />${tickPath ? `<path data-neopresent-ticks="true" d="${tickPath}" />` : ''}</g>`;
}

function quantile(sortedValues, fraction) {
  const position = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const interpolation = position - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * interpolation;
}

function formatScaleTick(value, logarithmic) {
  if (!logarithmic) {
    if (value === 0) return '0';
    const magnitude = Math.abs(value);
    if (magnitude >= 1e4 || magnitude < 1e-3) {
      const exponent = Math.floor(Math.log10(magnitude));
      const coefficient = Number((value / 10 ** exponent).toPrecision(4));
      return `${coefficient}×10<tspan baseline-shift="super" font-size="70%">${exponent}</tspan>`;
    }
    return Number(value.toPrecision(8)).toString();
  }
  const exponent = Math.round(Math.log10(value));
  if (exponent === 0) return '1';
  if (exponent === 1) return '10';
  return `10<tspan baseline-shift="super" font-size="70%">${exponent}</tspan>`;
}

function renderSvgMath(value) {
  const source = String(value);
  const pattern = /([_^])(?:\{([^}]+)\}|([^\s]))/g;
  let result = '';
  let cursor = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    result += escapeSvgText(source.slice(cursor, match.index));
    const content = escapeSvgText(match[2] ?? match[3] ?? '');
    const position = match[1] === '^' ? 'super' : 'sub';
    result += `<tspan baseline-shift="${position}" font-size="70%">${content}</tspan>`;
    cursor = match.index + match[0].length;
  }
  return result + escapeSvgText(source.slice(cursor));
}

function escapeSvgText(value) {
  return resolveDatePlaceholders(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
  );
}
