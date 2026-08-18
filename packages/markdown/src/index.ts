import {
  createPluginRegistry,
  type NeoPresentPlugin,
  type PluginRegistry
} from '../../plugin-api/dist/index.js';
import {
  Chart,
  CodeBlock,
  Column,
  Columns,
  Heading,
  ImageNode,
  List,
  MediaNode,
  Paragraph,
  PdfNode,
  Presentation,
  Quote,
  Slide,
  type SlideChild,
  Table
} from '../../core/dist/index.js';

export interface ParseMarkdownOptions {
  plugins?: readonly NeoPresentPlugin[];
  registry?: PluginRegistry;
}

/** Compiles the intentionally small Markdown dialect supported by the first release. */
export function parseMarkdown(source: string, options: ParseMarkdownOptions = {}): Presentation {
  const {
    sourceWithoutDirectives,
    theme,
    controls,
    autoplayMs,
    author,
    footer,
    footerLeft,
    footerRight,
    footerFont,
    footerLeftFont,
    footerCenterFont,
    footerRightFont,
    footerSize,
    footerOffset,
    footerShadow,
    footerShadowColor,
    footerShadowOpacity,
    footerShadowAngle,
    footerShadowDistance,
    footerShadowOffset,
    footerShadowBlur,
    logo,
    logoOffset,
    pageNumber,
    pageTotal,
    pageTotalNotoc,
    pageNumberPosition,
    pageNumberOffset,
    pageNumberSize,
    progress,
    subtitle,
    aspect,
    themeOptions,
    fonts,
    headingDefaults
  } = extractPresentationDirectives(source);
  const registry = options.registry ?? createPluginRegistry(...(options.plugins ?? []));
  const sourceSlides = splitSlides(sourceWithoutDirectives);
  const parsedSlides = sourceSlides.map((slide) => parseSlide(slide, registry));
  const titleSlideSourceIndex = parsedSlides.findIndex(
    (slide) =>
      !slide.getAttribute('toc') &&
      !slide.getAttribute('agenda') &&
      slide.children.some((node) => node instanceof Heading && node.level === 1)
  );
  const agendaItems = parsedSlides
    .map((slide) => getSlideTitle(slide))
    .filter((title): title is string => title !== '');
  let tocSectionStarted = false;
  const tocItems = parsedSlides.flatMap((slide, index) => {
    if (
      index === titleSlideSourceIndex ||
      slide.getAttribute('toc') ||
      slide.getAttribute('agenda') ||
      slide.getAttribute('tocEntry') === false
    )
      return [];
    const title = getSlideTitle(slide);
    if (!title) return [];
    const label = sanitizeTocLabel(title);
    if (slide.getAttribute('section')) {
      tocSectionStarted = true;
      return [`[**${label}**](#slide=${index + 1})`];
    }
    return [`[${tocSectionStarted ? '\u2003' : ''}${label}](#slide=${index + 1})`];
  });
  let slides = parsedSlides.map((slide, slideIndex) => {
    const localFont = slide.getAttribute<string>('font') ?? '';
    const inheritedFonts = {
      ...(localFont || fonts.font ? { font: localFont || fonts.font } : {}),
      ...(slide.getAttribute('bodyFont') || localFont || fonts.bodyFont || fonts.font
        ? { bodyFont: slide.getAttribute('bodyFont') || localFont || fonts.bodyFont || fonts.font }
        : {}),
      ...(slide.getAttribute('headingFont') || localFont || fonts.headingFont || fonts.font
        ? {
            headingFont:
              slide.getAttribute('headingFont') || localFont || fonts.headingFont || fonts.font
          }
        : {}),
      ...(slide.getAttribute('listFont') ||
      localFont ||
      fonts.listFont ||
      fonts.bodyFont ||
      fonts.font
        ? {
            listFont:
              slide.getAttribute('listFont') ||
              localFont ||
              fonts.listFont ||
              fonts.bodyFont ||
              fonts.font
          }
        : {}),
      ...(slide.getAttribute('quoteFont') ||
      localFont ||
      fonts.quoteFont ||
      fonts.bodyFont ||
      fonts.font
        ? {
            quoteFont:
              slide.getAttribute('quoteFont') ||
              localFont ||
              fonts.quoteFont ||
              fonts.bodyFont ||
              fonts.font
          }
        : {})
    };
    const withDeckAspect = slide.with({
      attributes: {
        ...slide.attributes,
        ...inheritedFonts,
        ...(slide.getAttribute('headingPosition') || headingDefaults.position
          ? { headingPosition: slide.getAttribute('headingPosition') || headingDefaults.position }
          : {}),
        ...(slide.getAttribute('headingAlign') || headingDefaults.align
          ? { headingAlign: slide.getAttribute('headingAlign') || headingDefaults.align }
          : {}),
        ...(slide.getAttribute('headingOffset') || headingDefaults.offset
          ? { headingOffset: slide.getAttribute('headingOffset') || headingDefaults.offset }
          : {}),
        ...(aspect && !slide.getAttribute('aspect') ? { aspect } : {}),
        ...(slideIndex === titleSlideSourceIndex ? { titleSlide: true } : {})
      }
    });
    const agendaTitle = withDeckAspect.getAttribute<string>('agenda');
    if (agendaTitle)
      return withDeckAspect.with({
        children: [
          Heading.create({ level: 1, text: agendaTitle }),
          List.create({ items: agendaItems, ordered: true })
        ]
      });
    const tocTitle = withDeckAspect.getAttribute<string>('toc');
    if (tocTitle)
      return withDeckAspect.with({
        attributes: {
          ...withDeckAspect.attributes,
          align: withDeckAspect.getAttribute('align') || 'left',
          tocColumns:
            withDeckAspect.getAttribute('tocColumns') ??
            Math.max(1, Math.min(5, Math.ceil(tocItems.length / 10))),
          tocGenerated: true
        },
        children: [
          Heading.create({ level: 1, text: tocTitle }),
          List.create({ items: tocItems, ordered: true })
        ]
      });
    return withDeckAspect;
  });
  const titleSlideIndex = slides.findIndex((slide) => slide.getAttribute('titleSlide') === true);
  if (titleSlideIndex >= 0 && (subtitle || author)) {
    const metadata = [
      ...(subtitle
        ? [Paragraph.create({ attributes: { titleMeta: 'subtitle' }, text: subtitle })]
        : []),
      ...(author ? [Paragraph.create({ attributes: { titleMeta: 'author' }, text: author })] : [])
    ];
    slides = slides.map((slide, index) =>
      index === titleSlideIndex ? slide.with({ children: [...slide.children, ...metadata] }) : slide
    );
  }
  const title = (
    slides[titleSlideIndex]?.children.find(
      (node): node is Heading => node instanceof Heading && node.level === 1
    ) ??
    slides
      .flatMap((slide) => slide.children)
      .find((node): node is Heading => node instanceof Heading && node.level === 1)
  )?.text;

  return Presentation.create({
    attributes: {
      autoplayMs,
      controls,
      footer,
      footerLeft,
      footerRight,
      footerFont,
      footerLeftFont,
      footerCenterFont,
      footerRightFont,
      footerSize,
      footerOffset,
      footerShadow,
      footerShadowColor,
      footerShadowOpacity,
      footerShadowAngle,
      footerShadowDistance,
      footerShadowOffset,
      footerShadowBlur,
      logo,
      logoOffset,
      pageNumber,
      pageTotal,
      pageTotalNotoc,
      pageNumberPosition,
      pageNumberOffset,
      pageNumberSize,
      progress,
      ...themeOptions
    },
    children: slides,
    theme,
    title: title ?? ''
  });
}

function getSlideTitle(slide: Slide): string {
  const heading = slide.children.find(
    (node): node is Heading => node instanceof Heading && node.level <= 2
  );
  return (
    heading?.getAttribute<string>('tocLabel') ??
    heading?.text ??
    slide.getAttribute<string>('section') ??
    ''
  );
}

function sanitizeTocLabel(value: string): string {
  return value.replaceAll('[', '').replaceAll(']', '').trim();
}

function extractPresentationDirectives(source: string): {
  sourceWithoutDirectives: string;
  theme: string;
  controls: 'hidden' | 'visible';
  autoplayMs: number;
  author: string;
  footer: string;
  footerLeft: string;
  footerRight: string;
  footerFont: string;
  footerLeftFont: string;
  footerCenterFont: string;
  footerRightFont: string;
  footerSize: string;
  footerOffset: string;
  footerShadow: string;
  footerShadowColor: string;
  footerShadowOpacity: string;
  footerShadowAngle: string;
  footerShadowDistance: string;
  footerShadowOffset: string;
  footerShadowBlur: string;
  logo: string;
  logoOffset: string;
  pageNumber: boolean;
  pageTotal: boolean;
  pageTotalNotoc: boolean;
  pageNumberPosition: string;
  pageNumberOffset: string;
  pageNumberSize: string;
  progress: boolean;
  subtitle: string;
  aspect: string;
  themeOptions: {
    fymaPalette: string;
    fymaGradientDirection: string;
    cimentHatchColor: string;
    cimentHatchAlpha: string;
    cimentHatchDensity: string;
  };
  fonts: {
    font: string;
    bodyFont: string;
    headingFont: string;
    listFont: string;
    quoteFont: string;
  };
  headingDefaults: { position: string; align: string; offset: string };
} {
  let theme = 'default';
  let controls: 'hidden' | 'visible' = 'hidden';
  let autoplayMs = 0;
  let author = '';
  let footer = '';
  let footerLeft = '';
  let footerRight = '';
  let footerFont = '';
  let footerLeftFont = '';
  let footerCenterFont = '';
  let footerRightFont = '';
  let footerSize = '.85rem';
  let footerOffset = '0,0';
  let footerShadow = '';
  let footerShadowColor = '';
  let footerShadowOpacity = '';
  let footerShadowAngle = '';
  let footerShadowDistance = '';
  let footerShadowOffset = '';
  let footerShadowBlur = '';
  let logo = '';
  let logoOffset = '';
  let pageNumber = false;
  let pageTotal = false;
  let pageTotalNotoc = false;
  let pageNumberPosition = 'bottom-right';
  let pageNumberOffset = '0,0';
  let pageNumberSize = '.85rem';
  let progress = false;
  let subtitle = '';
  let aspect = '';
  const themeOptions = {
    fymaPalette: 'blue',
    fymaGradientDirection: 'right',
    cimentHatchColor: '#bfbfbf',
    cimentHatchAlpha: '72%',
    cimentHatchDensity: '12'
  };
  const fonts = { font: '', bodyFont: '', headingFont: '', listFont: '', quoteFont: '' };
  const headingDefaults = { position: '', align: '', offset: '' };
  const lines = source.split(/\r?\n/);
  let inDeckPreamble = true;
  for (let index = 0; index < lines.length && inDeckPreamble; index += 1) {
    const line = lines[index]!;
    if (/^\s*$/.test(line)) continue;
    const aspectDirective = line.match(/^@aspect\s+(\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?)\s*$/i);
    if (aspectDirective) {
      aspect = aspectDirective[1]!.replace(/\s+/g, '');
      lines[index] = '';
      continue;
    }
    const fontDirective = line.match(
      /^@(font|body-font|heading-font|list-font|quote-font)\s+(.+?)\s*$/i
    );
    if (fontDirective) {
      const key = fontDirective[1]!
        .toLowerCase()
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) as keyof typeof fonts;
      fonts[key] = fontDirective[2]!.trim();
      lines[index] = '';
      continue;
    }
    const headingDirective = line.match(
      /^@(heading-position|heading-align|heading-offset)\s+(.+?)\s*$/i
    );
    if (headingDirective) {
      const key = headingDirective[1]!
        .toLowerCase()
        .replace('heading-', '') as keyof typeof headingDefaults;
      headingDefaults[key] = headingDirective[2]!.trim().toLowerCase();
      lines[index] = '';
      continue;
    }
    if (/^@[a-z-]+\s+/i.test(line)) continue;
    inDeckPreamble = false;
  }
  const sourceWithoutDirectives = lines
    .join('\n')
    .replace(
      /^@(theme|fyma-(?:palette|gradient-direction)|ciment-hatch-(?:color|alpha|density)|controls|autoplay|author|footer-shadow(?:-(?:color|opacity|angle|distance|offset|blur))?|footer-(?:left|center|right)-font|footer-font|footer-size|footer-offset|footer(?:-(?:left|center|right))?|logo-offset|logo|page-number-position|page-number-offset|page-number-size|page-number|page-total-notoc|page-total|progress|subtitle)\s+(.+?)\s*$/gim,
      (_match, directive: string, value: string) => {
        if (directive.toLowerCase() === 'theme') theme = value;
        if (directive.toLowerCase() === 'fyma-palette') themeOptions.fymaPalette = value;
        if (directive.toLowerCase() === 'fyma-gradient-direction')
          themeOptions.fymaGradientDirection = value;
        if (directive.toLowerCase() === 'ciment-hatch-color') themeOptions.cimentHatchColor = value;
        if (directive.toLowerCase() === 'ciment-hatch-alpha') themeOptions.cimentHatchAlpha = value;
        if (directive.toLowerCase() === 'ciment-hatch-density')
          themeOptions.cimentHatchDensity = value;
        if (
          directive.toLowerCase() === 'controls' &&
          (value.toLowerCase() === 'hidden' || value.toLowerCase() === 'visible')
        )
          controls = value.toLowerCase() as 'hidden' | 'visible';
        if (directive.toLowerCase() === 'autoplay')
          autoplayMs = value.toLowerCase() === 'off' ? 0 : parseDuration(value);
        if (directive.toLowerCase() === 'author') author = value;
        if (directive.toLowerCase() === 'footer') footer = value;
        if (directive.toLowerCase() === 'footer-center') footer = value;
        if (directive.toLowerCase() === 'footer-left') footerLeft = value;
        if (directive.toLowerCase() === 'footer-right') footerRight = value;
        if (directive.toLowerCase() === 'footer-font') footerFont = value;
        if (directive.toLowerCase() === 'footer-left-font') footerLeftFont = value;
        if (directive.toLowerCase() === 'footer-center-font') footerCenterFont = value;
        if (directive.toLowerCase() === 'footer-right-font') footerRightFont = value;
        if (directive.toLowerCase() === 'footer-size') footerSize = value;
        if (directive.toLowerCase() === 'footer-offset') footerOffset = value;
        if (directive.toLowerCase() === 'footer-shadow') footerShadow = value;
        if (directive.toLowerCase() === 'footer-shadow-color') footerShadowColor = value;
        if (directive.toLowerCase() === 'footer-shadow-opacity') footerShadowOpacity = value;
        if (directive.toLowerCase() === 'footer-shadow-angle') footerShadowAngle = value;
        if (directive.toLowerCase() === 'footer-shadow-distance') footerShadowDistance = value;
        if (directive.toLowerCase() === 'footer-shadow-offset') footerShadowOffset = value;
        if (directive.toLowerCase() === 'footer-shadow-blur') footerShadowBlur = value;
        if (directive.toLowerCase() === 'logo') logo = value;
        if (directive.toLowerCase() === 'logo-offset') logoOffset = value;
        if (directive.toLowerCase() === 'page-number')
          pageNumber = !['off', 'false', 'hidden'].includes(value.toLowerCase());
        if (directive.toLowerCase() === 'page-total')
          pageTotal = !['off', 'false', 'hidden'].includes(value.toLowerCase());
        if (directive.toLowerCase() === 'page-total-notoc')
          pageTotalNotoc = ['on', 'true', 'include', 'yes'].includes(value.toLowerCase());
        if (directive.toLowerCase() === 'page-number-position')
          pageNumberPosition = value.toLowerCase();
        if (directive.toLowerCase() === 'page-number-offset') pageNumberOffset = value;
        if (directive.toLowerCase() === 'page-number-size') pageNumberSize = value;
        if (directive.toLowerCase() === 'progress')
          progress = !['off', 'false', 'hidden'].includes(value.toLowerCase());
        if (directive.toLowerCase() === 'subtitle') subtitle = value;
        return '';
      }
    );

  return {
    sourceWithoutDirectives,
    theme,
    controls,
    autoplayMs,
    author,
    footer,
    footerLeft,
    footerRight,
    footerFont,
    footerLeftFont,
    footerCenterFont,
    footerRightFont,
    footerSize,
    footerOffset,
    footerShadow,
    footerShadowColor,
    footerShadowOpacity,
    footerShadowAngle,
    footerShadowDistance,
    footerShadowOffset,
    footerShadowBlur,
    logo,
    logoOffset,
    pageNumber,
    pageTotal,
    pageTotalNotoc,
    pageNumberPosition,
    pageNumberOffset,
    pageNumberSize,
    progress,
    subtitle,
    aspect,
    themeOptions,
    fonts,
    headingDefaults
  };
}

function splitSlides(source: string): string[] {
  const normalized = source.replace(/\r\n?/g, '\n').trim();
  if (normalized === '') return [];

  const slides: string[] = [];
  const lines: string[] = [];
  let inCodeBlock = false;

  for (const line of normalized.split('\n')) {
    if (/^```/.test(line)) inCodeBlock = !inCodeBlock;

    if (!inCodeBlock && /^---\s*$/.test(line)) {
      slides.push(lines.join('\n'));
      lines.length = 0;
    } else {
      lines.push(line);
    }
  }

  slides.push(lines.join('\n'));
  return slides;
}

function parseSlide(source: string, registry: PluginRegistry): Slide {
  const lines = source.trim().split('\n');
  const children: Array<
    | Chart
    | Columns
    | Heading
    | List
    | Paragraph
    | Quote
    | CodeBlock
    | ImageNode
    | MediaNode
    | PdfNode
    | Table
  > = [];
  const paragraphLines: string[] = [];
  const codeLines: string[] = [];
  const notes: string[] = [];
  const attributes: Record<string, unknown> = {};
  const footnotes: Array<{ id: string; text: string }> = [];
  let inNotes = false;
  let codeLanguage: string | null = null;
  let pendingBlockStyle: Record<string, string> = {};
  let pendingTableAnimation: Record<string, string> = {};
  let pendingTextAnimation: Record<string, string> = {};
  let pendingBlockTransition: Record<string, string> = {};
  let pendingListMarkers: Record<string, string | string[]> = {};
  const pushBlock = (child: SlideChild): void => {
    const listConfigured =
      child instanceof List && Object.keys(pendingListMarkers).length > 0
        ? child.with({ attributes: { ...child.attributes, ...pendingListMarkers } })
        : child;
    const tableConfigured =
      listConfigured instanceof Table && Object.keys(pendingTableAnimation).length > 0
        ? listConfigured.with({
            attributes: { ...listConfigured.attributes, ...pendingTableAnimation }
          })
        : listConfigured;
    const configured =
      ['heading', 'paragraph', 'quote', 'list'].includes(tableConfigured.type) &&
      Object.keys(pendingTextAnimation).length > 0
        ? (
            tableConfigured as SlideChild & {
              with(changes: { attributes: Record<string, unknown> }): SlideChild;
            }
          ).with({ attributes: { ...tableConfigured.attributes, ...pendingTextAnimation } })
        : tableConfigured;
    const transitioned =
      Object.keys(pendingBlockTransition).length > 0
        ? configured instanceof Columns
          ? Columns.create({
              id: configured.id,
              columns: configured.columns,
              attributes: { ...configured.attributes, ...pendingBlockTransition }
            })
          : (
              configured as SlideChild & {
                with(changes: { attributes: Record<string, unknown> }): SlideChild;
              }
            ).with({ attributes: { ...configured.attributes, ...pendingBlockTransition } })
        : configured;
    const styled =
      Object.keys(pendingBlockStyle).length > 0
        ? transitioned instanceof Columns
          ? Columns.create({
              id: transitioned.id,
              columns: transitioned.columns,
              attributes: { ...transitioned.attributes, blockStyle: pendingBlockStyle }
            })
          : (
              transitioned as SlideChild & {
                with(changes: { attributes: Record<string, unknown> }): SlideChild;
              }
            ).with({ attributes: { ...transitioned.attributes, blockStyle: pendingBlockStyle } })
        : transitioned;
    children.push(styled as SlideChild);
    pendingBlockStyle = {};
    pendingTableAnimation = {};
    pendingTextAnimation = {};
    pendingBlockTransition = {};
    pendingListMarkers = {};
  };

  const flushParagraph = (): void => {
    const text = paragraphLines.join(' ').trim();
    if (text !== '') pushBlock(Paragraph.create({ text }));
    paragraphLines.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const fence = line.match(/^```([^`]*)\s*$/);

    if (fence) {
      flushParagraph();

      if (codeLanguage === null) {
        codeLanguage = (fence[1] ?? '').trim();
      } else {
        pushBlock(createFencedNode(codeLines.join('\n'), codeLanguage, registry));
        codeLines.length = 0;
        codeLanguage = null;
      }

      continue;
    }

    if (codeLanguage !== null) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === ':::notes') {
      flushParagraph();
      inNotes = true;
      continue;
    }

    if (inNotes && line.trim() === ':::') {
      inNotes = false;
      continue;
    }

    if (inNotes) {
      notes.push(line);
      continue;
    }

    const inlineDisplayMath = line.trim().match(/^\$\$(.+?)\$\$$/);
    if (inlineDisplayMath) {
      flushParagraph();
      pushBlock(
        Paragraph.create({ attributes: { math: true }, text: inlineDisplayMath[1]!.trim() })
      );
      continue;
    }

    if (line.trim() === '$$') {
      flushParagraph();
      const mathLines: string[] = [];
      let closed = false;
      for (index += 1; index < lines.length; index += 1) {
        if (lines[index]!.trim() === '$$') {
          closed = true;
          break;
        }
        mathLines.push(lines[index]!);
      }
      if (!closed) throw new TypeError('A $$ display-math block must end with $$.');
      pushBlock(
        Paragraph.create({ attributes: { math: true }, text: mathLines.join('\n').trim() })
      );
      continue;
    }

    const footnote = line.match(/^\[\^([^\]]+)]\s*:\s*(.+?)\s*$/);
    if (footnote) {
      flushParagraph();
      footnotes.push({ id: footnote[1] ?? '', text: footnote[2] ?? '' });
      continue;
    }

    const fragment = line
      .trim()
      .match(/^:::fragment(?:\s+(fade|zoom|slide-left|slide-right|slide-up|slide-down))?\s*$/i);
    if (fragment) {
      flushParagraph();
      const fragmentLines: string[] = [];
      let closed = false;
      for (index += 1; index < lines.length; index += 1) {
        if (lines[index]!.trim() === ':::') {
          closed = true;
          break;
        }
        fragmentLines.push(lines[index]!);
      }
      if (!closed) throw new TypeError('A :::fragment block must end with :::.');
      const fragmentAnimation = (fragment[1] ?? 'fade').toLowerCase();
      const fragmentSource = fragmentLines.join('\n').trim();
      const fragmentHeading = fragmentSource.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (fragmentHeading) {
        const rawText = fragmentHeading[2] ?? '';
        const tocHeading = rawText.match(/^\[([^\]]+)]\s+(.+)$/);
        pushBlock(
          Heading.create({
            level: fragmentHeading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6,
            text: tocHeading?.[2] ?? rawText,
            attributes: {
              fragment: true,
              fragmentAnimation,
              ...(tocHeading ? { tocLabel: tocHeading[1]!.trim() } : {})
            }
          })
        );
      } else {
        pushBlock(
          Paragraph.create({
            attributes: { fragment: true, fragmentAnimation },
            text: fragmentLines.join(' ').trim()
          })
        );
      }
      continue;
    }

    const callout = line
      .trim()
      .match(/^:::(note|tip|warning|references|stat|timeline|cards|poll|stickybox)\s*$/i);
    if (callout) {
      flushParagraph();
      const calloutLines: string[] = [];
      let closed = false;
      for (index += 1; index < lines.length; index += 1) {
        if (lines[index]!.trim() === ':::') {
          closed = true;
          break;
        }
        calloutLines.push(lines[index]!);
      }
      if (!closed) throw new TypeError(`A :::${callout[1]} block must end with :::.`);
      const kind = callout[1]!.toLowerCase();
      pushBlock(
        Paragraph.create({
          attributes:
            kind === 'references'
              ? { references: true }
              : kind === 'stat'
                ? { stat: true }
                : kind === 'timeline'
                  ? { timeline: true }
                  : kind === 'cards'
                    ? { cards: true }
                    : kind === 'stickybox'
                      ? { stickybox: true }
                      : kind === 'poll'
                        ? { poll: true }
                        : { callout: kind },
          text: (kind === 'references' ||
          kind === 'stat' ||
          kind === 'timeline' ||
          kind === 'cards' ||
          kind === 'stickybox' ||
          kind === 'poll'
            ? calloutLines.join('\n')
            : calloutLines.join(' ')
          ).trim()
        })
      );
      continue;
    }

    if (line.trim() === '@reveal') {
      flushParagraph();
      attributes.reveal = 'true';
      continue;
    }

    const tableAnimationDirective = line.match(
      /^@table-(animation|animation-duration|animation-delay|animation-stagger|animation-easing|highlight-row|highlight-column|highlight-cell|highlight-effect|highlight-color|highlight-duration|highlight-delay)\s+(.+?)\s*$/i
    );
    if (tableAnimationDirective) {
      flushParagraph();
      const attributes = {
        animation: 'animation',
        'animation-duration': 'animationDuration',
        'animation-delay': 'animationDelay',
        'animation-stagger': 'animationStagger',
        'animation-easing': 'animationEasing',
        'highlight-row': 'highlightRow',
        'highlight-column': 'highlightColumn',
        'highlight-cell': 'highlightCell',
        'highlight-effect': 'highlightEffect',
        'highlight-color': 'highlightColor',
        'highlight-duration': 'highlightDuration',
        'highlight-delay': 'highlightDelay'
      } as const;
      const name = tableAnimationDirective[1]!.toLowerCase() as keyof typeof attributes;
      pendingTableAnimation[attributes[name]] = tableAnimationDirective[2]!.trim();
      continue;
    }

    const textAnimationDirective = line.match(
      /^@text-(animation|animation-duration|animation-delay|animation-cursor-color)\s+(.+?)\s*$/i
    );
    if (textAnimationDirective) {
      flushParagraph();
      const attributes = {
        animation: 'textAnimation',
        'animation-duration': 'textAnimationDuration',
        'animation-delay': 'textAnimationDelay',
        'animation-cursor-color': 'textAnimationCursorColor'
      } as const;
      const name = textAnimationDirective[1]!.toLowerCase() as keyof typeof attributes;
      pendingTextAnimation[attributes[name]] = textAnimationDirective[2]!.trim();
      continue;
    }

    const blockEnterDirective = line.match(/^@block-enter(?:\s+(fade|grow|rise|zoom))?\s*$/i);
    if (blockEnterDirective) {
      flushParagraph();
      pendingBlockTransition.blockEnter = (blockEnterDirective[1] ?? 'fade').toLowerCase();
      continue;
    }

    const blockExitDirective = line.match(
      /^@block-exit\s+(shrink|replace)(?:\s+(\d+(?:\.\d+)?%))?\s*$/i
    );
    if (blockExitDirective) {
      flushParagraph();
      pendingBlockTransition.blockExit = blockExitDirective[1]!.toLowerCase();
      if (blockExitDirective[1]!.toLowerCase() === 'shrink')
        pendingBlockTransition.blockShrinkScale = blockExitDirective[2] ?? '35%';
      continue;
    }

    const blockTransitionTrigger = line.match(/^@block-transition-trigger\s+(auto|reveal)\s*$/i);
    if (blockTransitionTrigger) {
      flushParagraph();
      const trigger = blockTransitionTrigger[1]!.toLowerCase();
      attributes.blockTransitionTrigger = trigger;
      if (trigger === 'reveal') attributes.reveal = 'true';
      continue;
    }

    const blockTransitionTiming = line.match(
      /^@block-transition-(duration|delay)\s+(\d+(?:\.\d+)?(?:ms|s))\s*$/i
    );
    if (blockTransitionTiming) {
      flushParagraph();
      pendingBlockTransition[
        blockTransitionTiming[1]!.toLowerCase() === 'duration'
          ? 'blockTransitionDuration'
          : 'blockTransitionDelay'
      ] = blockTransitionTiming[2]!;
      continue;
    }

    const blockStyleDirective = line.match(
      /^@(scale|offset|fill|fill-alpha|frame-color|glass|glass-color|glass-alpha|glass-transparency|glass-blur|glass-saturation|glass-thickness|glass-edge-color|glass-edge-alpha|glass-depth|glass-depth-alpha|glass-radius|border|border-style|border-color|border-alpha|border-size|border-radius|border-padding|frame-inner-color|frame-scale|shadow|shadow-color|shadow-opacity|shadow-angle|shadow-distance|shadow-offset|shadow-blur|shadow-curve|shadow-size|reflection|sticky-width|sticky-rotation|sticky-fill|sticky-alpha|sticky-tape|sticky-tape-alpha|sticky-position)\s+(.+?)\s*$/i
    );
    if (blockStyleDirective) {
      flushParagraph();
      pendingBlockStyle[blockStyleDirective[1]!.toLowerCase()] = blockStyleDirective[2]!.trim();
      continue;
    }

    const button = line.match(/^@button\s+(.+?)\s*\|\s*(\S+)\s*$/i);
    if (button) {
      flushParagraph();
      const label = button[1] ?? '';
      const href = button[2] ?? '';
      if (!/^(?:https?:|mailto:|\/|\.\/?|#slide=\d+$)/i.test(href))
        throw new TypeError('@button requires a safe link target.');
      children.push(Paragraph.create({ attributes: { buttonHref: href }, text: label }));
      continue;
    }

    if (line.trim() === '@hide-footer') {
      flushParagraph();
      attributes.hideFooter = true;
      continue;
    }

    if (line.trim() === '***') {
      flushParagraph();
      children.push(Paragraph.create({ attributes: { divider: true }, text: '' }));
      continue;
    }

    const agenda = line.match(/^@agenda(?:\s+(.+?))?\s*$/i);
    if (agenda) {
      flushParagraph();
      attributes.agenda = agenda[1]?.trim() || 'Agenda';
      continue;
    }

    const toc = line.match(/^@toc(?:\s+(.+?))?\s*$/i);
    if (toc) {
      flushParagraph();
      attributes.toc = toc[1]?.trim() || 'Contents';
      continue;
    }

    const tocEntry = line.match(/^@toc-entry\s+(on|off|true|false|include|exclude|yes|no)\s*$/i);
    if (tocEntry) {
      flushParagraph();
      attributes.tocEntry = ['on', 'true', 'include', 'yes'].includes(tocEntry[1]!.toLowerCase());
      continue;
    }

    const tocColumns = line.match(/^@toc-columns\s+([1-5])\s*$/i);
    if (tocColumns) {
      flushParagraph();
      attributes.tocColumns = Number(tocColumns[1]);
      continue;
    }

    if (/^@toc-include\s*$/i.test(line)) {
      flushParagraph();
      attributes.tocEntry = true;
      continue;
    }

    if (/^@toc-exclude\s*$/i.test(line)) {
      flushParagraph();
      attributes.tocEntry = false;
      continue;
    }

    if (line.trim() === '::group') {
      flushParagraph();
      const groupLines: string[] = [];
      let closed = false;
      let nestedDepth = 0;
      for (index += 1; index < lines.length; index += 1) {
        const groupLine = lines[index]!;
        const trimmedGroupLine = groupLine.trim();
        if (/^::(?:group|columns(?:\s|$)|grid(?:\s|$)|place(?:\s|$))/i.test(trimmedGroupLine)) {
          nestedDepth += 1;
          groupLines.push(groupLine);
        } else if (trimmedGroupLine === '::end') {
          if (nestedDepth === 0) {
            closed = true;
            break;
          }
          nestedDepth -= 1;
          groupLines.push(groupLine);
        } else {
          groupLines.push(groupLine);
        }
      }
      if (!closed) throw new TypeError('A ::group block must end with ::end.');
      const groupSlide = parseSlide(groupLines.join('\n'), registry);
      const groupStyleAttributes = Object.fromEntries(
        [
          'align',
          'bodyAlign',
          'bodyFont',
          'font',
          'headingAlign',
          'headingFont',
          'listFont',
          'quoteFont'
        ].flatMap((name) =>
          groupSlide.getAttribute(name) === undefined ? [] : [[name, groupSlide.getAttribute(name)]]
        )
      );
      pushBlock(
        Columns.create({
          attributes: { layout: 'group', ...groupStyleAttributes },
          columns: [
            Column.create({ children: groupSlide.children }),
            Column.create({ children: [] })
          ]
        })
      );
      continue;
    }

    const columnsBlock = line.trim().match(/^::columns(?:\s+widths:\s*(.+))?$/i);
    if (columnsBlock) {
      flushParagraph();
      const columnWidths = String(columnsBlock[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (columnWidths.some((value) => !/^(?:auto|\d+(?:\.\d+)?(?:%|fr|px|rem|em)?)$/i.test(value)))
        throw new TypeError(
          'Column widths must use ratios, percentages, fr, px, rem, em, or auto.'
        );
      const sourceColumns: string[] = [];
      let columnLines: string[] | null = null;
      let closed = false;
      let nestedDepth = 0;

      for (index += 1; index < lines.length; index += 1) {
        const columnLine = lines[index]!;
        const trimmedColumnLine = columnLine.trim();
        if (/^::(?:group|columns(?:\s|$)|grid(?:\s|$)|place(?:\s|$))/i.test(trimmedColumnLine)) {
          nestedDepth += 1;
          if (columnLines !== null) columnLines.push(columnLine);
        } else if (trimmedColumnLine === '::column' && nestedDepth === 0) {
          if (columnLines !== null) sourceColumns.push(columnLines.join('\n'));
          columnLines = [];
        } else if (trimmedColumnLine === '::end' && nestedDepth > 0) {
          nestedDepth -= 1;
          if (columnLines !== null) columnLines.push(columnLine);
        } else if (trimmedColumnLine === '::end') {
          if (columnLines !== null) sourceColumns.push(columnLines.join('\n'));
          closed = true;
          break;
        } else if (columnLines !== null) {
          columnLines.push(columnLine);
        }
      }

      if (!closed) throw new TypeError('A ::columns block must end with ::end.');
      if (columnWidths.length > 0 && columnWidths.length !== sourceColumns.length)
        throw new TypeError('The number of column widths must match the number of columns.');
      const parsedColumns = sourceColumns.map((columnSource) => parseSlide(columnSource, registry));
      const nestedBlockTrigger = parsedColumns
        .map((column) => String(column.getAttribute('blockTransitionTrigger') ?? ''))
        .find(Boolean);
      if (nestedBlockTrigger === 'reveal') {
        attributes.blockTransitionTrigger = 'reveal';
        attributes.reveal = 'true';
      }
      pushBlock(
        Columns.create({
          attributes: {
            ...(nestedBlockTrigger === 'reveal'
              ? { blockTransitionTrigger: 'reveal', reveal: 'true' }
              : {}),
            ...(columnWidths.length > 0 ? { columnWidths } : {})
          },
          columns: parsedColumns.map((column) =>
            Column.create({
              attributes: Object.fromEntries(
                [
                  'align',
                  'bodyAlign',
                  'bodyFont',
                  'font',
                  'headingAlign',
                  'headingFont',
                  'listFont',
                  'quoteFont'
                ].flatMap((name) =>
                  column.getAttribute(name) === undefined ? [] : [[name, column.getAttribute(name)]]
                )
              ),
              children: column.children
            })
          )
        })
      );
      continue;
    }

    const place = line.trim().match(/^::place\s+(.+)$/);
    if (place) {
      flushParagraph();
      const position = Object.fromEntries(
        [...place[1]!.matchAll(/(x|y|width|height|z)\s*:\s*([^\s]+)/gi)].map((match) => [
          match[1]!.toLowerCase(),
          match[2]!
        ])
      );
      if (!position.x || !position.y)
        throw new TypeError('A ::place layout requires x: and y: values.');
      const content: string[] = [];
      let closed = false;
      for (index += 1; index < lines.length; index += 1) {
        if (lines[index]!.trim() === '::end') {
          closed = true;
          break;
        }
        content.push(lines[index]!);
      }
      if (!closed) throw new TypeError('A ::place layout must end with ::end.');
      pushBlock(
        Columns.create({
          attributes: { layout: 'place', position },
          columns: [
            Column.create({ children: parseSlide(content.join('\n'), registry).children }),
            Column.create({ children: [] })
          ]
        })
      );
      continue;
    }

    const grid = line.trim().match(/^::grid(?:\s+(\d+))?$/);
    if (grid) {
      flushParagraph();
      const columnsPerRow = Number(grid[1] ?? 2);
      if (!Number.isInteger(columnsPerRow) || columnsPerRow < 2 || columnsPerRow > 6) {
        throw new TypeError('A ::grid layout must use between 2 and 6 columns.');
      }
      const sourceCells: string[] = [];
      let cellLines: string[] | null = null;
      let closed = false;

      for (index += 1; index < lines.length; index += 1) {
        const gridLine = lines[index]!;
        if (gridLine.trim() === '::cell') {
          if (cellLines !== null) sourceCells.push(cellLines.join('\n'));
          cellLines = [];
        } else if (gridLine.trim() === '::end') {
          if (cellLines !== null) sourceCells.push(cellLines.join('\n'));
          closed = true;
          break;
        } else if (cellLines !== null) {
          cellLines.push(gridLine);
        }
      }

      if (!closed) throw new TypeError('A ::grid block must end with ::end.');
      if (sourceCells.length < 2)
        throw new TypeError('A ::grid layout requires at least two ::cell blocks.');
      pushBlock(
        Columns.create({
          attributes: { columnsPerRow, layout: 'grid' },
          columns: sourceCells.map((cellSource) =>
            Column.create({ children: parseSlide(cellSource, registry).children })
          )
        })
      );
      continue;
    }

    if (isTableHeader(line, lines[index + 1])) {
      flushParagraph();
      const headers = splitTableRow(line);
      const alignments = getTableAlignments(lines[index + 1]!);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && isTableRow(lines[index]!)) {
        rows.push(splitTableRow(lines[index]!));
        index += 1;
      }

      index -= 1;
      pushBlock(Table.create({ attributes: { alignments }, headers, rows }));
      continue;
    }

    const quoteLine = line.match(/^>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      const quoteLines = [quoteLine[1] ?? ''];
      index += 1;
      while (index < lines.length) {
        const nextQuoteLine = lines[index]!.match(/^>\s?(.*)$/);
        if (!nextQuoteLine) break;
        quoteLines.push(nextQuoteLine[1] ?? '');
        index += 1;
      }
      index -= 1;
      children.push(Quote.create({ text: quoteLines.join('\n') }));
      continue;
    }

    const listMarkerDirective = line.match(/^@(list-symbol|list-symbols)\s+(.+?)\s*$/i);
    if (listMarkerDirective) {
      flushParagraph();
      if (listMarkerDirective[1]!.toLowerCase() === 'list-symbol') {
        pendingListMarkers = { listSymbol: listMarkerDirective[2]!.trim() };
      } else {
        const symbols = listMarkerDirective[2]!
          .split(',')
          .map((symbol) => symbol.trim())
          .filter(Boolean);
        if (symbols.length === 0)
          throw new TypeError('@list-symbols requires at least one marker.');
        pendingListMarkers = { listSymbols: symbols };
      }
      continue;
    }

    const listItem = line.match(/^\s*([-*+]|\d+[.)])\s+(.+?)\s*$/);
    if (listItem) {
      flushParagraph();
      const ordered = /^\d/.test(listItem[1] ?? '');
      const items = [listItem[2] ?? ''];
      index += 1;

      while (index < lines.length) {
        const nextItem = lines[index]!.match(/^\s*([-*+]|\d+[.)])\s+(.+?)\s*$/);
        if (!nextItem || /^\d/.test(nextItem[1] ?? '') !== ordered) break;
        items.push(nextItem[2] ?? '');
        index += 1;
      }

      index -= 1;
      pushBlock(List.create({ items, ordered }));
      continue;
    }

    const directive = line.match(
      /^@(align|body-align|aspect|background|background-overlay|background-position|background-size|section|slide-theme|transition|transition-duration|duration|valign|font|body-font|heading-font|heading-position|heading-align|heading-offset|list-font|quote-font)\s+(.+?)\s*$/i
    );
    if (directive) {
      flushParagraph();
      const name = (directive[1] ?? '').toLowerCase();
      const value = directive[2] ?? '';
      const attributeName =
        name === 'background-overlay'
          ? 'backgroundOverlay'
          : name === 'background-position'
            ? 'backgroundPosition'
            : name === 'background-size'
              ? 'backgroundSize'
              : name === 'slide-theme'
                ? 'slideTheme'
                : name === 'transition-duration'
                  ? 'transitionDurationMs'
                  : name === 'duration'
                    ? 'durationMs'
                    : name === 'body-font'
                      ? 'bodyFont'
                      : name === 'body-align'
                        ? 'bodyAlign'
                        : name === 'heading-font'
                          ? 'headingFont'
                          : name === 'heading-position'
                            ? 'headingPosition'
                            : name === 'heading-align'
                              ? 'headingAlign'
                              : name === 'heading-offset'
                                ? 'headingOffset'
                                : name === 'list-font'
                                  ? 'listFont'
                                  : name === 'quote-font'
                                    ? 'quoteFont'
                                    : name;
      if (name === 'align' && !['left', 'center', 'right'].includes(value.toLowerCase())) {
        throw new TypeError('@align must be left, center, or right.');
      }
      if (name === 'body-align' && !['left', 'center', 'right'].includes(value.toLowerCase())) {
        throw new TypeError('@body-align must be left, center, or right.');
      }
      if (name === 'valign' && !['top', 'center', 'bottom'].includes(value.toLowerCase())) {
        throw new TypeError('@valign must be top, center, or bottom.');
      }
      if (
        name === 'heading-position' &&
        !['flow', 'top', 'center', 'bottom'].includes(value.toLowerCase())
      ) {
        throw new TypeError('@heading-position must be flow, top, center, or bottom.');
      }
      if (name === 'heading-align' && !['left', 'center', 'right'].includes(value.toLowerCase())) {
        throw new TypeError('@heading-align must be left, center, or right.');
      }
      if (
        name === 'heading-offset' &&
        !/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vw|vh)\s*,\s*-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vw|vh)$/.test(
          value
        )
      ) {
        throw new TypeError('@heading-offset must use x,y values such as "12px,-6px".');
      }
      if (name === 'aspect' && !/^\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?$/.test(value)) {
        throw new TypeError('@aspect must use a ratio such as "16:9" or "5:4".');
      }
      attributes[attributeName] =
        name === 'duration' || name === 'transition-duration'
          ? value.toLowerCase() === 'off'
            ? 0
            : parseDuration(value)
          : name === 'align' ||
              name === 'body-align' ||
              name === 'valign' ||
              name === 'heading-position' ||
              name === 'heading-align'
            ? value.toLowerCase()
            : value;
      continue;
    }

    const inlineNote = line.match(/^<!--\s*notes:\s*(.*?)\s*-->$/i);
    if (inlineNote) {
      flushParagraph();
      notes.push(inlineNote[1] ?? '');
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\((.+?)\)\s*$/);
    if (image) {
      flushParagraph();
      pushBlock(ImageNode.create({ alt: image[1] ?? '', src: image[2] ?? '' }));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    const marker = heading?.[1];
    const rawHeadingText = heading?.[2];
    const tocHeading = rawHeadingText?.match(/^\[([^\]]+)]\s+(.+)$/);
    const text = tocHeading?.[2] ?? rawHeadingText;
    if (marker && text) {
      flushParagraph();
      pushBlock(
        Heading.create({
          level: marker.length as 1 | 2 | 3 | 4 | 5 | 6,
          text,
          ...(tocHeading ? { attributes: { tocLabel: tocHeading[1]!.trim() } } : {})
        })
      );
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraphLines.push(line.trim());
    }
  }

  flushParagraph();
  if (codeLanguage !== null) {
    pushBlock(createFencedNode(codeLines.join('\n'), codeLanguage, registry));
  }
  if (footnotes.length > 0) attributes.footnotes = footnotes;
  const hasStagedReveal = (node: SlideChild): boolean => {
    if (
      node instanceof Chart &&
      String(
        (node.getAttribute<Record<string, unknown>>('plotStyle') ?? {})['animation-trigger']
      ).toLowerCase() === 'reveal'
    )
      return true;
    if (
      node instanceof Paragraph &&
      node.getAttribute('feynman') &&
      /^\s*animation-trigger\s*:\s*reveal\s*$/im.test(node.text)
    )
      return true;
    return (
      node instanceof Columns &&
      node.columns.some((column) => column.children.some(hasStagedReveal))
    );
  };
  if (children.some(hasStagedReveal)) {
    attributes.reveal = 'true';
    attributes.stagedRevealOnly = true;
  }
  return Slide.create({ attributes, children, notes: notes.join('\n').trim() });
}

function createFencedNode(code: string, language: string, registry: PluginRegistry): SlideChild {
  const [rawLanguage = '', ...flags] = language.trim().split(/\s+/);
  const pluginNode = registry.createFencedBlock<SlideChild>(rawLanguage, code);
  if (pluginNode) return pluginNode;
  const normalizedLanguage = rawLanguage.toLowerCase();
  if (normalizedLanguage === 'plot' || normalizedLanguage === 'chart') return createChart(code);
  if (normalizedLanguage === 'table') return createDataTable(code);
  if (normalizedLanguage === 'image' || normalizedLanguage === 'img') return createImage(code);
  if (normalizedLanguage === 'video' || normalizedLanguage === 'audio')
    return createMedia(code, normalizedLanguage);
  if (normalizedLanguage === 'mermaid')
    return Paragraph.create({ attributes: { mermaid: true }, text: code });
  if (normalizedLanguage === 'feynman')
    return Paragraph.create({ attributes: { feynman: true }, text: code });
  if (normalizedLanguage === 'math' || normalizedLanguage === 'latex')
    return Paragraph.create({ attributes: { math: true }, text: code });
  if (normalizedLanguage === 'iframe' || normalizedLanguage === 'embed') return createEmbed(code);
  if (normalizedLanguage !== 'pdf') {
    const runnableLanguage =
      normalizedLanguage === 'js' || normalizedLanguage === 'javascript'
        ? 'javascript'
        : normalizedLanguage === 'py' || normalizedLanguage === 'python'
          ? 'python'
          : normalizedLanguage === 'html'
            ? 'html'
            : '';
    const packagesFlag = flags.find((flag) => flag.toLowerCase().startsWith('packages='));
    const lineNumberStartFlag = flags.find((flag) => /^(?:linenums|line-start)=\d+$/i.test(flag));
    const lineNumberStart = lineNumberStartFlag
      ? Number.parseInt(lineNumberStartFlag.slice(lineNumberStartFlag.indexOf('=') + 1), 10)
      : 1;
    const pythonPackages =
      runnableLanguage === 'python' && packagesFlag
        ? packagesFlag
            .slice('packages='.length)
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
        : [];
    return CodeBlock.create({
      attributes: {
        lineNumbers: flags.includes('linenums') || Boolean(lineNumberStartFlag),
        lineNumberStart,
        runnable: runnableLanguage !== '' && flags.includes('runnable'),
        runnableLanguage,
        pythonPackages
      },
      code,
      language: rawLanguage
    });
  }

  const values = Object.fromEntries(
    code
      .split('\n')
      .map((line) => line.match(/^\s*([a-zA-Z-]+)\s*:\s*(.+?)\s*$/))
      .filter((entry): entry is RegExpMatchArray => entry !== null)
      .map(([, key, value]) => [key!.toLowerCase(), value!])
  );

  const page = Number(values.page);
  return PdfNode.create({
    attributes: {
      caption: values.caption ?? '',
      captionAlign: values['caption-align'] ?? 'center',
      captionAlpha: values['caption-alpha'] ?? '1',
      captionColor: values['caption-color'] ?? '',
      captionFont: values['caption-font'] ?? '',
      captionGap: values['caption-gap'] ?? '.65rem',
      captionOffsetX: values['caption-offset-x'] ?? '0px',
      captionOffsetY: values['caption-offset-y'] ?? '0px',
      captionPosition: values['caption-position'] ?? 'bottom',
      captionSize: values['caption-size'] ?? '1.1rem',
      height: values.height ?? '',
      width: values.width ?? ''
    },
    mode: values.mode?.toLowerCase() === 'viewer' ? 'viewer' : 'canvas',
    src: values.src ?? '',
    page: Number.isFinite(page) ? page : 1
  });
}

function createImage(source: string): ImageNode {
  const values = Object.fromEntries(
    source
      .split('\n')
      .map((line) => line.match(/^\s*([a-zA-Z-]+)\s*:\s*(.*?)\s*$/))
      .filter((entry): entry is RegExpMatchArray => entry !== null)
      .map(([, key, value]) => [key!.toLowerCase(), value!])
  );
  const fit = ['contain', 'cover', 'fill', 'none', 'scale-down'].includes(
    String(values.fit ?? '').toLowerCase()
  )
    ? values.fit!.toLowerCase()
    : 'contain';
  const align = ['left', 'center', 'right'].includes(String(values.align ?? '').toLowerCase())
    ? values.align!.toLowerCase()
    : 'center';
  return ImageNode.create({
    alt: values.alt ?? values.caption ?? '',
    src: values.src ?? '',
    attributes: {
      align,
      caption: values.caption ?? '',
      fit,
      height: values.height ?? '',
      maxHeight: values['max-height'] ?? '',
      maxWidth: values['max-width'] ?? '',
      width: values.width ?? ''
    }
  });
}

function createChart(source: string): Chart {
  const values = Object.fromEntries(
    source
      .split('\n')
      .flatMap((line) => (/^\s*animation\s*:/i.test(line) ? line.split('|') : [line]))
      .map((line) => line.match(/^\s*([a-zA-Z-]+)\s*:\s*(.*?)\s*$/))
      .filter((entry): entry is RegExpMatchArray => entry !== null)
      .map(([, key, value]) => [key!.toLowerCase(), value!])
  );
  let numbers = (values.values ?? '')
    .split(',')
    .filter((value) => value.trim() !== '')
    .map((value) => Number(value.trim()))
    .filter((value) => !Number.isNaN(value));
  const labels = values.labels
    ?.split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  let xValues = parseNumberList(values.x);
  let yValues = parseNumberList(values.y);
  const errorValues = parseNumberList(values.error);
  const errorLowValues = parseNumberList(values['error-low']);
  const errorHighValues = parseNumberList(values['error-high']);
  const xErrorValues = parseNumberList(values['x-error']);
  const xErrorLowValues = parseNumberList(values['x-error-low']);
  const xErrorHighValues = parseNumberList(values['x-error-high']);
  const uncertaintyLayers = parseChartUncertaintyLayers(source).primary;
  const series = parseChartSeries(source);
  const annotations = parseChartAnnotations(source);
  const shapes = parseChartShapes(source);
  const legendItems = parseChartLegendItems(source);
  const referenceLines = parseChartReferenceLines(source);
  const functionDefinitions = parseFunctionDefinitions(source);
  const fitDefinitions = parseFitDefinitions(source);
  const diagramHighlights = parseDiagramHighlights(source);
  const diagramReveals = parseDiagramReveals(source);
  const styleKeys = new Set([
    'title-color',
    'title-size',
    'title-font',
    'title-offset-x',
    'title-offset-y',
    'title-alpha',
    'caption',
    'caption-size',
    'caption-color',
    'caption-align',
    'caption-font',
    'caption-offset-x',
    'caption-offset-y',
    'plot-alpha',
    'plot-offset-x',
    'plot-offset-y',
    'plot-width',
    'plot-height',
    'chart-width',
    'chart-height',
    'axis-color',
    'axis-width',
    'axis-alpha',
    'grid-color',
    'grid-width',
    'grid-alpha',
    'tick-color',
    'tick-size',
    'tick-font',
    'tick-offset-x',
    'tick-offset-y',
    'tick-alpha',
    'data-color',
    'data-size',
    'data-alpha',
    'function',
    'function-samples',
    'samples',
    'bubble-size',
    'bubble-min',
    'bubble-max',
    'bubble-scale',
    'bubble-legend',
    'bubble-legend-label',
    'bubble-label',
    'contour-levels',
    'contour-fill',
    'contour-line-color',
    'contour-line-width',
    'covariance-fill-color',
    'covariance-fill-alpha',
    'covariance-line-color',
    'covariance-sigma',
    'density-bandwidth',
    'density-grid-size',
    'density-palette',
    'ecdf-complement',
    'ecdf-points',
    'ecdf-point-size',
    'survival-events',
    'survival-event-field',
    'survival-confidence',
    'survival-confidence-level',
    'survival-confidence-color',
    'survival-confidence-alpha',
    'volcano-fold-threshold',
    'volcano-significance-threshold',
    'volcano-labels',
    'volcano-label-significant-only',
    'volcano-label-size',
    'waterfall-total',
    'waterfall-total-field',
    'waterfall-total-indices',
    'sankey-node-width',
    'sankey-node-gap',
    'sankey-source-field',
    'sankey-target-field',
    'sankey-value-field',
    'time-window',
    'time-missing',
    'geo-projection',
    'geo-show-grid',
    'geo-region-field',
    'geo-name-field',
    'geo-value-field',
    'geo-palette',
    'geo-color-label',
    'geo-colorbar-x',
    'geo-colorbar-y',
    'geo-colorbar-width',
    'geo-colorbar-height',
    'profile-error',
    'profile-min-count',
    'corner-bins',
    'corner-label-size',
    'efficiency-confidence',
    'efficiency-total',
    'efficiency-total-field',
    'forest-line-color',
    'forest-zero',
    'forest-lower-field',
    'forest-upper-field',
    'polar-grid-levels',
    'polar-grid-color',
    'polar-label-color',
    'polar-label-size',
    'polar-max',
    'polar-start-angle',
    'ratio-denominator',
    'ratio-mode',
    'ratio-reference',
    'stack-bar-gap',
    'stack-bar-normalized',
    'ternary-a-label',
    'ternary-b-label',
    'ternary-c-label',
    'ternary-grid-levels',
    'pie-colors',
    'pie-inner-radius',
    'pie-label-color',
    'pie-label-position',
    'pie-label-size',
    'pie-labels',
    'pie-start-angle',
    'pie-stroke-color',
    'pie-stroke-width',
    'diagram-background',
    'diagram-border-color',
    'diagram-label-color',
    'diagram-show-names',
    'diagram-show-details',
    'diagram-tooltips',
    'standard-model-quark-color',
    'standard-model-quark-red',
    'standard-model-quark-green',
    'standard-model-quark-blue',
    'standard-model-lepton-color',
    'standard-model-boson-color',
    'standard-model-higgs-color',
    'standard-model-gravity-color',
    'standard-model-coupling-color',
    'standard-model-coupling-frame-width',
    'standard-model-coupling-width',
    'standard-model-highlight',
    'standard-model-highlight-color',
    'standard-model-highlight-effect',
    'standard-model-highlight-duration',
    'standard-model-highlight-delay',
    'standard-model-dim-alpha',
    'periodic-table-color-mode',
    'periodic-table-highlight',
    'periodic-table-highlight-color',
    'periodic-table-highlight-effect',
    'periodic-table-highlight-duration',
    'periodic-table-highlight-delay',
    'periodic-table-dim-alpha',
    'periodic-table-show-lanthanides',
    'periodic-table-show-actinides',
    'ridgeline-fill-alpha',
    'ridgeline-overlap',
    'ridgeline-palette',
    'stack-normalized',
    'stack-palette',
    'hexbin-radius',
    'hexbin-palette',
    'quiver-scale',
    'quiver-color',
    'quiver-width',
    'radar-fill-alpha',
    'radar-grid-color',
    'radar-grid-levels',
    'radar-label-color',
    'radar-label-size',
    'radar-max',
    'radar-min',
    'radar-point-size',
    'radar-stroke-width',
    'streamline-color',
    'streamline-width',
    'streamline-step',
    'streamline-steps',
    'violin-bandwidth',
    'violin-fill-color',
    'violin-fill-alpha',
    'heatmap-palette',
    'heatmap-palette-stops',
    'heatmap-palette-colors',
    'heatmap-palette-red',
    'heatmap-palette-green',
    'heatmap-palette-blue',
    'heatmap-palette-alpha',
    'heatmap-min',
    'heatmap-max',
    'heatmap-cell-labels',
    'heatmap-cell-label-size',
    'heatmap-x-labels',
    'heatmap-y-labels',
    'heatmap-color-label',
    'heatmap-cell-border-color',
    'heatmap-cell-border-width',
    'heatmap-title-size',
    'heatmap-title-color',
    'heatmap-title-offset-x',
    'heatmap-title-offset-y',
    'heatmap-tick-size',
    'heatmap-tick-color',
    'heatmap-tick-offset-x',
    'heatmap-tick-offset-y',
    'heatmap-colorbar-width',
    'heatmap-colorbar-height',
    'heatmap-colorbar-offset-x',
    'heatmap-colorbar-offset-y',
    'heatmap-colorbar-alpha',
    'heatmap-range-label-size',
    'heatmap-range-label-color',
    'heatmap-range-label-offset-x',
    'heatmap-range-label-offset-y',
    'heatmap-min-label',
    'heatmap-max-label',
    'heatmap-color-label-size',
    'heatmap-color-label-color',
    'heatmap-color-label-offset-x',
    'heatmap-color-label-offset-y',
    'heatmap-cell-alpha',
    'heatmap-cell-label-color',
    'heatmap-cell-label-offset-x',
    'heatmap-cell-label-offset-y',
    'heatmap-x-tick-rotate',
    'heatmap-y-tick-rotate',
    'surface-palette',
    'surface-palette-stops',
    'surface-palette-colors',
    'surface-palette-red',
    'surface-palette-green',
    'surface-palette-blue',
    'surface-palette-alpha',
    'surface-function',
    'coordinates',
    'surface-coordinates',
    'theta-min',
    'theta-max',
    'theta-samples',
    'phi-min',
    'phi-max',
    'phi-samples',
    'r-min',
    'r-max',
    'r-samples',
    'u-min',
    'u-max',
    'u-samples',
    'v-min',
    'v-max',
    'v-samples',
    'x-function',
    'y-function',
    'z-function',
    'surface-samples',
    'surface-x-samples',
    'surface-y-samples',
    'surface-mesh-color',
    'surface-mesh-width',
    'surface-alpha',
    'surface-background',
    'surface-z-label',
    'surface-azimuth',
    'surface-elevation',
    'surface-zoom',
    'surface-interactive',
    'surface-animation',
    'surface-animation-duration',
    'surface-animation-delay',
    'surface-animation-easing',
    'surface-animation-stagger',
    'surface-axis-color',
    'surface-axis-width',
    'surface-tick-color',
    'surface-tick-size',
    'surface-tick-offset-x',
    'surface-tick-offset-y',
    'surface-tick-count',
    'surface-x-tick-count',
    'surface-y-tick-count',
    'surface-x-label-color',
    'surface-x-label-size',
    'surface-x-label-offset-x',
    'surface-x-label-offset-y',
    'surface-y-label-color',
    'surface-y-label-size',
    'surface-y-label-offset-x',
    'surface-y-label-offset-y',
    'surface-z-label-color',
    'surface-z-label-size',
    'surface-z-label-offset-x',
    'surface-z-label-offset-y',
    'surface-colorbar-width',
    'surface-colorbar-height',
    'surface-colorbar-offset-x',
    'surface-colorbar-offset-y',
    'surface-colorbar-alpha',
    'surface-range-label-size',
    'surface-range-label-color',
    'surface-range-label-offset-x',
    'surface-range-label-offset-y',
    'surface-color-label',
    'surface-color-label-size',
    'surface-color-label-color',
    'surface-color-label-offset-x',
    'surface-color-label-offset-y',
    'variables',
    'symbol',
    'data-symbol',
    'line-style',
    'draw',
    'error-color',
    'error-width',
    'error-alpha',
    'error-cap-size',
    'error-box',
    'error-box-color',
    'error-box-alpha',
    'band',
    'band-color',
    'band-alpha',
    'band-line',
    'legend',
    'legend-position',
    'legend-x',
    'legend-y',
    'legend-offset-x',
    'legend-offset-y',
    'legend-columns',
    'legend-labels',
    'legend-color',
    'legend-size',
    'legend-font',
    'legend-alpha',
    'value-color',
    'value-size',
    'point-labels',
    'point-label-field',
    'point-label-value',
    'point-label-errors',
    'point-label-color',
    'point-label-size',
    'point-label-offset-x',
    'point-label-offset-y',
    'value-font',
    'x-scale',
    'y-scale',
    'x-min',
    'x-max',
    'y-min',
    'y-max',
    'y-axis-digits',
    'reference-x',
    'reference-y',
    'reference-color',
    'reference-width',
    'reference-dash',
    'reference-label',
    'reference-label-color',
    'trendline-label',
    'animation',
    'animation-trigger',
    'export-stages',
    'reveal-stages',
    'reveal-stage-default',
    'fit-reveal-stage',
    'stats-reveal-stage',
    'animation-duration',
    'animation-delay',
    'animation-easing',
    'highlight-effect',
    'highlight-color',
    'highlight-duration',
    'highlight-delay',
    'highlight-index',
    'fill',
    'bin-edges',
    'bin-counts',
    'bin-edges-field',
    'bin-counts-field',
    'bin-gap',
    'bin-line',
    'bin-lines',
    'vertical-lines',
    'fit',
    'fit-id',
    'fit-method',
    'fit-params',
    'fit-bounds',
    'fit-fixed',
    'fit-series',
    'fit-all',
    'fit-errors',
    'fit-color',
    'fit-width',
    'fit-alpha',
    'fit-line-style',
    'fit-samples',
    'fit-results',
    'fit-quality',
    'fit-pvalue',
    'fit-correlation',
    'fit-correlation-x',
    'fit-correlation-y',
    'fit-correlation-size',
    'fit-correlation-color',
    'fit-correlation-precision',
    'fit-diagnostic',
    'fit-diagnostic-height',
    'fit-legend',
    'fit-legend-label',
    'fit-legend-order',
    'fit-label-x',
    'fit-label-y',
    'fit-label-align',
    'fit-label-size',
    'fit-label-color',
    'fit-draw',
    'fit-band',
    'fit-band-kind',
    'fit-band-color',
    'fit-band-alpha',
    'fit-band-sigma',
    'fit-band-outline-color',
    'fit-band-outline-alpha',
    'fit-band-outline-width',
    'fit-band-outline-style',
    'fit-band-legend',
    'fit-band-legend-label',
    'fit-band-animation',
    'fit-band-animation-duration',
    'fit-band-animation-delay',
    'fit-band-animation-easing',
    'fit-x-min',
    'fit-x-max',
    'fit-range',
    'fit-ranges',
    'fit-exclude',
    'fit-draw-exclude',
    'fit-animation',
    'fit-animation-duration',
    'fit-animation-delay',
    'fit-animation-stagger',
    'fit-animation-easing',
    'stats',
    'stats-title',
    'stats-animation',
    'stats-animation-delay',
    'stats-animation-duration',
    'stats-animation-easing',
    'stats-animation-stagger',
    'stats-entries',
    'stats-mean',
    'stats-rms',
    'stats-stddev',
    'stats-min',
    'stats-max',
    'stats-median',
    'stats-entries-value',
    'stats-mean-value',
    'stats-rms-value',
    'stats-stddev-value',
    'stats-min-value',
    'stats-max-value',
    'stats-median-value',
    'stats-entries-field',
    'stats-mean-field',
    'stats-rms-field',
    'stats-stddev-field',
    'stats-min-field',
    'stats-max-field',
    'stats-median-field',
    'stats-color',
    'stats-size',
    'stats-font',
    'stats-alpha',
    'stats-fill',
    'stats-fill-color',
    'stats-fill-alpha',
    'stats-border',
    'stats-border-color',
    'stats-border-alpha',
    'stats-border-width',
    'stats-radius',
    'stats-width',
    'stats-x',
    'stats-y',
    'frame-top',
    'frame-right',
    'ticks-top',
    'ticks-right',
    'ticks-bottom',
    'ticks-left',
    'minor-ticks',
    'tick-divisions',
    'tick-length',
    'minor-tick-length',
    'x-label-color',
    'x-label-size',
    'x-label-font',
    'x-label-offset-x',
    'x-label-offset-y',
    'x-label-alpha',
    'y-label-color',
    'y-label-size',
    'y-label-font',
    'y-label-offset-x',
    'y-label-offset-y',
    'y-label-alpha',
    'right-y-label',
    'right-y-min',
    'right-y-max',
    'right-y-scale',
    'right-y-axis-digits',
    'right-axis-color',
    'right-tick-color',
    'right-tick-size',
    'right-tick-font',
    'right-y-label-color',
    'right-y-label-size',
    'right-y-label-font'
  ]);
  const plotStyle = Object.fromEntries(
    Object.entries(values).filter(
      ([key]) =>
        styleKeys.has(key) ||
        /^stats-(?:entries|mean|stddev|rms|min|max|median)-(?:color|label-color|value-color|font|size|alpha)$/.test(
          key
        )
    )
  );
  if (values.type?.toLowerCase() === 'correlation') {
    plotStyle['heatmap-palette'] ??= 'correlation';
    plotStyle['heatmap-cell-labels'] ??= 'true';
    plotStyle['heatmap-color-label'] ??= 'Correlation coefficient';
  }
  const kind =
    values.type?.toLowerCase() === 'bar'
      ? 'bar'
      : ['qq', 'qq-plot', 'probability', 'probability-plot'].includes(
            values.type?.toLowerCase() ?? ''
          )
        ? 'qq'
        : ['ecdf', 'cdf', 'survival', 'survival-curve'].includes(values.type?.toLowerCase() ?? '')
          ? 'ecdf'
          : ['precision-recall', 'pr', 'pr-curve'].includes(values.type?.toLowerCase() ?? '')
            ? 'precision-recall'
            : values.type?.toLowerCase() === 'volcano'
              ? 'volcano'
              : values.type?.toLowerCase() === 'waterfall'
                ? 'waterfall'
                : ['sankey', 'alluvial'].includes(values.type?.toLowerCase() ?? '')
                  ? 'sankey'
                  : ['time-series', 'timeseries'].includes(values.type?.toLowerCase() ?? '')
                    ? 'time-series'
                    : ['geographic', 'geo', 'map'].includes(values.type?.toLowerCase() ?? '')
                      ? 'geographic'
                      : ['stacked-bar', 'normalized-stacked-bar'].includes(
                            values.type?.toLowerCase() ?? ''
                          )
                        ? 'stacked-bar'
                        : ['ratio', 'pull', 'ratio-panel', 'pull-panel'].includes(
                              values.type?.toLowerCase() ?? ''
                            )
                          ? 'ratio'
                          : ['efficiency', 'acceptance'].includes(values.type?.toLowerCase() ?? '')
                            ? 'efficiency'
                            : ['roc', 'roc-curve'].includes(values.type?.toLowerCase() ?? '')
                              ? 'roc'
                              : ['polar', 'radial'].includes(values.type?.toLowerCase() ?? '')
                                ? 'polar'
                                : ['polar-function', 'polar-curve'].includes(
                                      values.type?.toLowerCase() ?? ''
                                    )
                                  ? 'polar-function'
                                  : ['ternary', 'triangle'].includes(
                                        values.type?.toLowerCase() ?? ''
                                      )
                                    ? 'ternary'
                                    : ['forest', 'forest-plot'].includes(
                                          values.type?.toLowerCase() ?? ''
                                        )
                                      ? 'forest'
                                      : ['corner', 'pair', 'pair-plot'].includes(
                                            values.type?.toLowerCase() ?? ''
                                          )
                                        ? 'corner'
                                        : ['pie', 'donut', 'doughnut'].includes(
                                              values.type?.toLowerCase() ?? ''
                                            )
                                          ? 'pie'
                                          : values.type?.toLowerCase() === 'area'
                                            ? 'area'
                                            : ['histogram', 'hist'].includes(
                                                  values.type?.toLowerCase() ?? ''
                                                )
                                              ? 'histogram'
                                              : ['box', 'boxplot'].includes(
                                                    values.type?.toLowerCase() ?? ''
                                                  )
                                                ? 'boxplot'
                                                : values.type?.toLowerCase() === 'scatter'
                                                  ? 'scatter'
                                                  : values.type?.toLowerCase() === 'heatmap'
                                                    ? 'heatmap'
                                                    : values.type?.toLowerCase() === 'contour'
                                                      ? 'contour'
                                                      : [
                                                            'covariance',
                                                            'error-ellipse',
                                                            'ellipse'
                                                          ].includes(
                                                            values.type?.toLowerCase() ?? ''
                                                          )
                                                        ? 'covariance'
                                                        : [
                                                              'density2d',
                                                              'density-2d',
                                                              'kde2d'
                                                            ].includes(
                                                              values.type?.toLowerCase() ?? ''
                                                            )
                                                          ? 'density2d'
                                                          : values.type?.toLowerCase() === 'hexbin'
                                                            ? 'hexbin'
                                                            : ['quiver', 'vector'].includes(
                                                                  values.type?.toLowerCase() ?? ''
                                                                )
                                                              ? 'quiver'
                                                              : [
                                                                    'radar',
                                                                    'spider',
                                                                    'spider-chart'
                                                                  ].includes(
                                                                    values.type?.toLowerCase() ?? ''
                                                                  )
                                                                ? 'radar'
                                                                : [
                                                                      'streamline',
                                                                      'streamlines'
                                                                    ].includes(
                                                                      values.type?.toLowerCase() ??
                                                                        ''
                                                                    )
                                                                  ? 'streamline'
                                                                  : [
                                                                        'profile',
                                                                        'profile-histogram'
                                                                      ].includes(
                                                                        values.type?.toLowerCase() ??
                                                                          ''
                                                                      )
                                                                    ? 'profile'
                                                                    : [
                                                                          'periodic-table',
                                                                          'periodic'
                                                                        ].includes(
                                                                          values.type?.toLowerCase() ??
                                                                            ''
                                                                        )
                                                                      ? 'periodic-table'
                                                                      : [
                                                                            'standard-model',
                                                                            'particle-model'
                                                                          ].includes(
                                                                            values.type?.toLowerCase() ??
                                                                              ''
                                                                          )
                                                                        ? 'standard-model'
                                                                        : [
                                                                              'ridgeline',
                                                                              'ridge'
                                                                            ].includes(
                                                                              values.type?.toLowerCase() ??
                                                                                ''
                                                                            )
                                                                          ? 'ridgeline'
                                                                          : [
                                                                                'stacked-histogram',
                                                                                'stacked-hist',
                                                                                'normalized-histogram',
                                                                                'normalized-hist'
                                                                              ].includes(
                                                                                values.type?.toLowerCase() ??
                                                                                  ''
                                                                              )
                                                                            ? 'stacked-histogram'
                                                                            : values.type?.toLowerCase() ===
                                                                                'violin'
                                                                              ? 'violin'
                                                                              : [
                                                                                    'surface',
                                                                                    'surface3d'
                                                                                  ].includes(
                                                                                    values.type?.toLowerCase() ??
                                                                                      ''
                                                                                  )
                                                                                ? 'surface'
                                                                                : values.type?.toLowerCase() ===
                                                                                    'correlation'
                                                                                  ? 'heatmap'
                                                                                  : 'line';

  if (kind === 'ternary') {
    if (!xValues && values.x?.trim() && Number.isFinite(Number(values.x.trim())))
      xValues = [Number(values.x.trim())];
    if (!yValues && values.y?.trim() && Number.isFinite(Number(values.y.trim())))
      yValues = [Number(values.y.trim())];
  }

  if (!['heatmap', 'contour', 'surface'].includes(kind) && numbers.length === 0 && yValues) {
    numbers = yValues;
  }
  if (['periodic-table', 'standard-model'].includes(kind) && numbers.length === 0) numbers = [1];
  if (['normalized-histogram', 'normalized-hist'].includes(values.type?.toLowerCase() ?? '')) {
    plotStyle['stack-normalized'] = 'true';
  }
  if (values.type?.toLowerCase() === 'normalized-stacked-bar') {
    plotStyle['stack-bar-normalized'] = 'true';
  }
  if (['pull', 'pull-panel'].includes(values.type?.toLowerCase() ?? '')) {
    plotStyle['ratio-mode'] = 'pull';
  }
  if (['survival', 'survival-curve'].includes(values.type?.toLowerCase() ?? '')) {
    plotStyle['ecdf-complement'] = 'true';
  }

  const surfaceExpression =
    values['surface-function'] ??
    functionDefinitions[0]?.expression ??
    values['z-function'] ??
    values.formula ??
    values.expression;
  const hasPrimaryData = numbers.length > 0 || Boolean(values.source) || series.length > 0;
  let surfaceGridMetadata:
    | {
        surfaceGridShape: { columns: number; rows: number };
        surfaceParameterUValues: number[];
        surfaceParameterVValues: number[];
        surfaceCoordinateSystem: string;
      }
    | undefined;
  if (kind === 'surface' && surfaceExpression && !hasPrimaryData) {
    const grid = createSurfaceFunctionGrid(surfaceExpression, values);
    xValues = grid.xValues;
    yValues = grid.yValues;
    numbers = grid.values;
    surfaceGridMetadata = {
      surfaceGridShape: { columns: grid.columns, rows: grid.rows },
      surfaceParameterUValues: grid.uValues,
      surfaceParameterVValues: grid.vValues,
      surfaceCoordinateSystem: grid.coordinateSystem
    };
    plotStyle['surface-function'] = surfaceExpression;
  }
  const functionPlot = ['function', 'function2d', 'curve'].includes(
    values.type?.toLowerCase() ?? ''
  );
  if (functionPlot && surfaceExpression && !values.source) {
    const sampled = createFunctionSamples(surfaceExpression, values);
    xValues = sampled.xValues;
    numbers = sampled.values;
    plotStyle.function = surfaceExpression;
  }
  if (kind === 'polar-function' && surfaceExpression && !values.source) {
    const sampled = createPolarFunctionSamples(surfaceExpression, values);
    xValues = sampled.xValues;
    numbers = sampled.values;
    plotStyle.function = surfaceExpression;
    plotStyle['polar-theta-values'] = sampled.thetaValues.join(',');
    plotStyle['polar-radius-values'] = sampled.radiusValues.join(',');
  }
  const overlayDefinitions = hasPrimaryData ? functionDefinitions : functionDefinitions.slice(1);
  const functionOverlays = overlayDefinitions.map(({ expression, fields }, index) => {
    const overlayOptions = { ...values, ...fields };
    if (kind === 'surface') {
      const grid = createSurfaceFunctionGrid(expression, overlayOptions);
      return {
        dimension: 3,
        expression,
        name: fields.label ?? fields.name ?? `Function ${index + 1}`,
        color: fields.color ?? '',
        palette: fields.palette ?? '',
        alpha: fields.alpha ?? '',
        meshColor: fields['mesh-color'] ?? fields.color ?? '',
        meshWidth: fields['mesh-width'] ?? fields['line-width'] ?? '',
        highlightEffect: fields['highlight-effect'] ?? '',
        highlightColor: fields['highlight-color'] ?? '',
        highlightDuration: fields['highlight-duration'] ?? '',
        highlightDelay: fields['highlight-delay'] ?? '',
        highlightIndex: fields['highlight-index'] ?? '',
        ...grid
      };
    }
    const sampled = createFunctionSamples(expression, overlayOptions);
    return {
      dimension: 2,
      expression,
      name: fields.label ?? fields.name ?? `Function ${index + 1}`,
      color: fields.color ?? '',
      dataSize: fields['line-width'] ?? fields['data-size'] ?? '',
      dataAlpha: fields.alpha ?? fields['data-alpha'] ?? '',
      lineStyle: fields['line-style'] ?? '',
      draw: fields.draw ?? 'L',
      animation: fields.animation ?? '',
      animationDuration: fields['animation-duration'] ?? '',
      animationDelay: fields['animation-delay'] ?? '',
      animationEasing: fields['animation-easing'] ?? '',
      highlightEffect: fields['highlight-effect'] ?? '',
      highlightColor: fields['highlight-color'] ?? '',
      highlightDuration: fields['highlight-duration'] ?? '',
      highlightDelay: fields['highlight-delay'] ?? '',
      highlightIndex: fields['highlight-index'] ?? '',
      legend: fields.legend ?? '',
      legendOrder: fields['legend-order'] ?? '',
      labels: sampled.values.map((_, pointIndex) => String(pointIndex + 1)),
      ...sampled
    };
  });

  return Chart.create({
    kind,
    smooth: values.smooth?.toLowerCase() === 'true',
    trendline: ['true', 'linear', 'ols'].includes(values.trendline?.toLowerCase() ?? ''),
    title: values.title ?? '',
    values: numbers,
    ...(labels ? { labels } : {}),
    ...(values.source ? { source: values.source } : {}),
    ...(values.x && !xValues ? { xField: values.x } : {}),
    ...(values.y ? { yField: values.y } : {}),
    ...((values.xlabel ?? values['x-label']) ? { xLabel: values.xlabel ?? values['x-label'] } : {}),
    ...((values.ylabel ?? values['y-label']) ? { yLabel: values.ylabel ?? values['y-label'] } : {}),
    ...(values.error && !errorValues ? { errorField: values.error } : {}),
    ...(values.value ? { valueField: values.value } : {}),
    ...(values.bins ? { bins: Number(values.bins) } : {}),
    ...(xValues ? { xValues } : {}),
    ...(errorValues ? { errorValues } : {}),
    ...(Object.keys(plotStyle).length > 0 ||
    series.length > 0 ||
    uncertaintyLayers.length > 0 ||
    annotations.length > 0 ||
    shapes.length > 0 ||
    legendItems.length > 0 ||
    referenceLines.length > 0 ||
    errorLowValues ||
    errorHighValues ||
    xErrorValues ||
    xErrorLowValues ||
    xErrorHighValues ||
    (kind === 'ternary' && yValues) ||
    values['error-low'] ||
    values['error-high'] ||
    values['x-error'] ||
    values['x-error-low'] ||
    values['x-error-high'] ||
    diagramHighlights.length > 0 ||
    diagramReveals.length > 0
      ? {
          attributes: {
            ...(Object.keys(plotStyle).length > 0 ? { plotStyle } : {}),
            ...(series.length > 0 ? { series } : {}),
            ...(uncertaintyLayers.length > 0 ? { uncertaintyLayers } : {}),
            ...(errorLowValues || errorHighValues
              ? { asymmetricErrors: { lower: errorLowValues ?? [], upper: errorHighValues ?? [] } }
              : {}),
            ...(xErrorLowValues || xErrorHighValues
              ? {
                  asymmetricXErrors: { lower: xErrorLowValues ?? [], upper: xErrorHighValues ?? [] }
                }
              : {}),
            ...(xErrorValues ? { xErrorValues } : {}),
            ...(values['x-error'] && !xErrorValues ? { xErrorField: values['x-error'] } : {}),
            ...((values['error-low'] || values['error-high']) && !errorLowValues && !errorHighValues
              ? {
                  asymmetricErrorFields: {
                    lower: values['error-low'] ?? '',
                    upper: values['error-high'] ?? ''
                  }
                }
              : {}),
            ...((values['x-error-low'] || values['x-error-high']) &&
            !xErrorLowValues &&
            !xErrorHighValues
              ? {
                  asymmetricXErrorFields: {
                    lower: values['x-error-low'] ?? '',
                    upper: values['x-error-high'] ?? ''
                  }
                }
              : {}),
            ...(annotations.length > 0 ? { annotations } : {}),
            ...(shapes.length > 0 ? { shapes } : {}),
            ...(legendItems.length > 0 ? { legendItems } : {}),
            ...(referenceLines.length > 0 ? { referenceLines } : {}),
            ...(['quiver', 'streamline'].includes(kind)
              ? {
                  vectorU: parseNumberList(values.u) ?? [],
                  vectorV: parseNumberList(values.v) ?? []
                }
              : {}),
            ...(kind === 'covariance'
              ? { covarianceCorrelation: parseNumberList(values.rho ?? values.correlation) ?? [] }
              : {}),
            ...(functionOverlays.length > 0 ? { functionOverlays } : {}),
            ...(surfaceGridMetadata ?? {}),
            ...(fitDefinitions.length > 0 ? { fitDefinitions } : {}),
            ...(diagramHighlights.length > 0 ? { diagramHighlights } : {}),
            ...(diagramReveals.length > 0 ? { diagramReveals } : {}),
            ...(['heatmap', 'contour', 'surface', 'ternary'].includes(kind) && yValues
              ? { heatmapYValues: yValues }
              : {})
          }
        }
      : {}),
    ...(values.refresh ? { refreshMs: parseDuration(values.refresh) } : {})
  });
}

function parseDiagramHighlights(source: string): Array<Record<string, string>> {
  return source.split('\n').flatMap((line) => {
    const match = line.match(/^\s*diagram-highlight\s*:\s*(.*?)\s*$/i);
    if (!match) return [];
    const [target = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    if (!target) return [];
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    return [{ target, ...fields }];
  });
}

function parseDiagramReveals(source: string): Array<Record<string, string>> {
  return source.split('\n').flatMap((line) => {
    const match = line.match(/^\s*diagram-reveal\s*:\s*(.*?)\s*$/i);
    if (!match) return [];
    const [target = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    if (!target) return [];
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    return [{ target, ...fields }];
  });
}

function parseFitDefinitions(
  source: string
): Array<{ expression: string; fields: Record<string, string> }> {
  const definitions: Array<{ expression: string; fields: Record<string, string> }> = [];
  let current: { expression: string; fields: Record<string, string> } | undefined;
  for (const line of source.split('\n')) {
    const fit = line.match(/^\s*fit\s*:\s*(.*?)\s*$/i);
    if (fit) {
      const expression = fit[1]!.trim();
      if (expression) {
        current = { expression, fields: { fit: expression } };
        definitions.push(current);
      }
      continue;
    }
    if (/^\s*(?:series|series-loop|function|surface-function)\s*:/i.test(line)) {
      current = undefined;
      continue;
    }
    if (!current) continue;
    const field = line.match(/^\s*(fit-[a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
    if (field) current.fields[field[1]!.toLowerCase()] = field[2]!.trim();
  }
  return definitions;
}

function parseFunctionDefinitions(
  source: string
): Array<{ expression: string; fields: Record<string, string> }> {
  return source.split('\n').flatMap((line) => {
    const match = line.match(/^\s*function\s*:\s*(.*?)\s*$/i);
    if (!match) return [];
    const [expression = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    if (!expression) return [];
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    return [{ expression, fields }];
  });
}

function createFunctionSamples(
  expression: string,
  options: Record<string, string>
): { xValues: number[]; values: number[] } {
  const evaluate = compileFunction(expression);
  if (!evaluate) throw new TypeError(`Invalid function plot expression: ${expression}`);
  const requestedMinimum = Number(options['x-min']);
  const requestedMaximum = Number(options['x-max']);
  const minimum = Number.isFinite(requestedMinimum) ? requestedMinimum : -5;
  const maximum =
    Number.isFinite(requestedMaximum) && requestedMaximum > minimum ? requestedMaximum : 5;
  const requestedSamples = Number(options['function-samples'] ?? options.samples);
  const sampleCount = Number.isFinite(requestedSamples)
    ? Math.max(2, Math.min(2000, Math.trunc(requestedSamples)))
    : 200;
  const xValues = Array.from(
    { length: sampleCount },
    (_, index) => minimum + ((maximum - minimum) * index) / (sampleCount - 1)
  );
  const generatedValues = xValues.map((x) => evaluate(x));
  const invalidIndex = generatedValues.findIndex((value) => !Number.isFinite(value));
  if (invalidIndex >= 0)
    throw new TypeError(`Function plot returned a non-finite value at x=${xValues[invalidIndex]}.`);
  return { xValues, values: generatedValues };
}

function compileFunction(expression: string): ((x: number) => number) | null {
  const compiled = compileMathExpression(expression, ['x']);
  return compiled ? (x) => Number(compiled(x)) : null;
}

function createPolarFunctionSamples(
  expression: string,
  options: Record<string, string>
): { thetaValues: number[]; radiusValues: number[]; xValues: number[]; values: number[] } {
  const compiled = compileMathExpression(expression, ['theta', 't']);
  if (!compiled) throw new TypeError(`Invalid polar function expression: ${expression}`);
  const minimum = readExpressionNumber(options['theta-min'], 0);
  const requestedMaximum = readExpressionNumber(options['theta-max'], Math.PI * 2);
  const maximum = requestedMaximum > minimum ? requestedMaximum : Math.PI * 2;
  const requestedSamples = Number(
    options['theta-samples'] ?? options['function-samples'] ?? options.samples
  );
  const sampleCount = Number.isFinite(requestedSamples)
    ? Math.max(3, Math.min(4000, Math.trunc(requestedSamples)))
    : 360;
  const thetaValues = Array.from(
    { length: sampleCount },
    (_, index) => minimum + ((maximum - minimum) * index) / (sampleCount - 1)
  );
  const radiusValues = thetaValues.map((theta) => Number(compiled(theta, theta)));
  const invalidIndex = radiusValues.findIndex((value) => !Number.isFinite(value));
  if (invalidIndex >= 0)
    throw new TypeError(
      `Polar function returned a non-finite radius at theta=${thetaValues[invalidIndex]}.`
    );
  return {
    thetaValues,
    radiusValues,
    xValues: thetaValues.map((theta, index) => radiusValues[index]! * Math.cos(theta)),
    values: thetaValues.map((theta, index) => radiusValues[index]! * Math.sin(theta))
  };
}

function readExpressionNumber(value: string | undefined, fallback: number): number {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const compiled = compileMathExpression(text, []);
  const result = compiled?.();
  return Number.isFinite(result) ? Number(result) : fallback;
}

function createSurfaceFunctionGrid(
  expression: string,
  options: Record<string, string>
): {
  xValues: number[];
  yValues: number[];
  values: number[];
  columns: number;
  rows: number;
  uValues: number[];
  vValues: number[];
  coordinateSystem: string;
} {
  const coordinateSystem = String(
    options['surface-coordinates'] ?? options.coordinates ?? 'cartesian'
  )
    .trim()
    .toLowerCase();
  const supported = ['cartesian', 'cylindrical', 'spherical', 'parametric'];
  if (!supported.includes(coordinateSystem))
    throw new TypeError(`Unsupported surface coordinate system: ${coordinateSystem}`);
  const range = (
    minimumKey: string,
    maximumKey: string,
    fallbackMinimum: number,
    fallbackMaximum: number
  ): [number, number] => {
    const minimum = readExpressionNumber(options[minimumKey], fallbackMinimum);
    const maximum = readExpressionNumber(options[maximumKey], fallbackMaximum);
    return maximum > minimum ? [minimum, maximum] : [fallbackMinimum, fallbackMaximum];
  };
  const samples = (key: string) => {
    const requested = Number(options[key] ?? options['surface-samples'] ?? options.samples);
    return Number.isFinite(requested) ? Math.max(2, Math.min(100, Math.trunc(requested))) : 25;
  };
  const ranges =
    coordinateSystem === 'cylindrical'
      ? [range('r-min', 'r-max', 0, 5), range('theta-min', 'theta-max', 0, Math.PI * 2)]
      : coordinateSystem === 'spherical'
        ? [range('theta-min', 'theta-max', 0, Math.PI * 2), range('phi-min', 'phi-max', 0, Math.PI)]
        : coordinateSystem === 'parametric'
          ? [range('u-min', 'u-max', 0, Math.PI * 2), range('v-min', 'v-max', 0, Math.PI * 2)]
          : [range('x-min', 'x-max', -5, 5), range('y-min', 'y-max', -5, 5)];
  const sampleKeys =
    coordinateSystem === 'cylindrical'
      ? ['r-samples', 'theta-samples']
      : coordinateSystem === 'spherical'
        ? ['theta-samples', 'phi-samples']
        : coordinateSystem === 'parametric'
          ? ['u-samples', 'v-samples']
          : ['surface-x-samples', 'surface-y-samples'];
  const xSamples = samples(sampleKeys[0]!);
  const ySamples = samples(sampleKeys[1]!);
  const scalarVariables =
    coordinateSystem === 'cylindrical'
      ? ['r', 'theta']
      : coordinateSystem === 'spherical'
        ? ['theta', 'phi']
        : coordinateSystem === 'parametric'
          ? ['u', 'v']
          : ['x', 'y'];
  const scalar = compileMathExpression(expression, scalarVariables);
  const xFunction =
    coordinateSystem === 'parametric'
      ? compileMathExpression(String(options['x-function'] ?? ''), ['u', 'v'])
      : null;
  const yFunction =
    coordinateSystem === 'parametric'
      ? compileMathExpression(String(options['y-function'] ?? ''), ['u', 'v'])
      : null;
  if (!scalar || (coordinateSystem === 'parametric' && (!xFunction || !yFunction)))
    throw new TypeError(`Invalid ${coordinateSystem} surface function definition.`);
  const xValues: number[] = [];
  const yValues: number[] = [];
  const generatedValues: number[] = [];
  const uValues: number[] = [];
  const vValues: number[] = [];
  for (let row = 0; row < ySamples; row += 1) {
    const v = ranges[1]![0] + ((ranges[1]![1] - ranges[1]![0]) * row) / (ySamples - 1);
    for (let column = 0; column < xSamples; column += 1) {
      const u = ranges[0]![0] + ((ranges[0]![1] - ranges[0]![0]) * column) / (xSamples - 1);
      const scalarValue = Number(scalar(u, v));
      let x = u;
      let y = v;
      let z = scalarValue;
      if (coordinateSystem === 'cylindrical') {
        x = u * Math.cos(v);
        y = u * Math.sin(v);
      } else if (coordinateSystem === 'spherical') {
        x = scalarValue * Math.sin(v) * Math.cos(u);
        y = scalarValue * Math.sin(v) * Math.sin(u);
        z = scalarValue * Math.cos(v);
      } else if (coordinateSystem === 'parametric') {
        x = Number(xFunction!(u, v));
        y = Number(yFunction!(u, v));
      }
      if (![x, y, z].every(Number.isFinite))
        throw new TypeError(
          `${coordinateSystem} surface returned a non-finite coordinate at ${scalarVariables[0]}=${u}, ${scalarVariables[1]}=${v}.`
        );
      xValues.push(x);
      yValues.push(y);
      generatedValues.push(z);
      uValues.push(u);
      vValues.push(v);
    }
  }
  return {
    xValues,
    yValues,
    values: generatedValues,
    columns: xSamples,
    rows: ySamples,
    uValues,
    vValues,
    coordinateSystem
  };
}

function compileMathExpression(
  expression: string,
  variables: string[]
): ((...values: number[]) => number) | null {
  const normalized = expression
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E');
  if (!/^[\d\s+\-*/%().,A-Za-z_]+$/.test(normalized)) return null;
  const allowed = new Set([
    ...variables,
    'Math',
    'PI',
    'E',
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'atan2',
    'sinh',
    'cosh',
    'tanh',
    'exp',
    'log',
    'log10',
    'sqrt',
    'cbrt',
    'abs',
    'pow',
    'min',
    'max',
    'floor',
    'ceil',
    'round',
    'sign'
  ]);
  if ([...normalized.matchAll(/[A-Za-z_]\w*/g)].some((match) => !allowed.has(match[0])))
    return null;
  try {
    const fn = Function(
      ...variables,
      `"use strict"; const {sin,cos,tan,asin,acos,atan,atan2,sinh,cosh,tanh,exp,log,log10,sqrt,cbrt,abs,pow,min,max,floor,ceil,round,sign} = Math; return (${normalized});`
    ) as (...values: number[]) => number;
    return (...values) => Number(fn(...values));
  } catch {
    return null;
  }
}

function parseChartLegendItems(source: string): Array<Record<string, string>> {
  return source.split('\n').flatMap((line) => {
    const match = line.match(/^\s*legend-item\s*:\s*(.*?)\s*$/i);
    if (!match) return [];
    const [name = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    if (!name) return [];
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    return [{ ...fields, name }];
  });
}

function parseChartReferenceLines(source: string): Array<Record<string, string>> {
  return source.split('\n').flatMap((line) => {
    const match = line.match(/^\s*reference\s*:\s*(.*?)\s*$/i);
    if (!match) return [];
    const [name = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    if (!name) return [];
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    if (!fields.x && !fields.y && !fields.value) return [];
    return [{ ...fields, name }];
  });
}

function parseChartShapes(source: string): Array<Record<string, string>> {
  const shapes: Array<Record<string, string>> = [];
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*shape\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const [kind = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z0-9-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    const normalized = kind.toLowerCase();
    if (['box', 'rect', 'rectangle', 'circle', 'ellipse', 'arrow', 'line'].includes(normalized))
      shapes.push({ ...fields, kind: normalized });
  }
  return shapes;
}

function parseChartAnnotations(source: string): Array<Record<string, unknown>> {
  const annotations: Array<{ fields: Record<string, string>; text: string }> = [];
  let current: { fields: Record<string, string>; text: string } | undefined;
  for (const line of source.split('\n')) {
    const match = line.match(/^\s*annotation\s*:\s*(.*?)\s*$/i);
    if (match) {
      const [text = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
      const fields = Object.fromEntries(
        parts.flatMap((part) => {
          const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
          return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
        })
      );
      if (text) {
        current = { fields, text };
        annotations.push(current);
      }
      continue;
    }
    if (
      current &&
      /^\s*(?:animation|animation-duration|animation-delay|animation-easing|reveal-stage)\s*:/i.test(
        line
      )
    )
      for (const part of line.split('|')) {
        const field = part.match(
          /^\s*(animation|animation-duration|animation-delay|animation-easing|reveal-stage)\s*:\s*(.*?)\s*$/i
        );
        if (field) current.fields[field[1]!.toLowerCase()] = field[2]!.trim();
      }
    else current = undefined;
  }
  return annotations.map(({ text, fields }) => ({
    text,
    x: Number(fields.x),
    y: Number(fields.y),
    align: fields.align ?? 'left',
    color: fields.color ?? '',
    font: fields.font ?? '',
    fontSize: fields['font-size'] ?? '',
    fontWeight: fields['font-weight'] ?? '',
    lineHeight: fields['line-height'] ?? '',
    lineIndent: fields['line-indent'] ?? '',
    animation: fields.animation ?? '',
    animationDelay: fields['animation-delay'] ?? '',
    animationDuration: fields['animation-duration'] ?? '',
    animationEasing: fields['animation-easing'] ?? '',
    revealStage: fields['reveal-stage'] ?? ''
  }));
}

function parseChartSeries(source: string): Array<Record<string, unknown>> {
  const namedUncertainties = parseChartUncertaintyLayers(source).bySeriesLine;
  const entries: Array<{ fields: Record<string, string>; index: number; name: string }> = [];
  let current: { fields: Record<string, string>; index: number; name: string } | undefined;
  for (const [index, line] of source.split('\n').entries()) {
    const loop = line.match(/^\s*series-loop\s*:\s*(.*?)\s*$/i);
    if (loop) {
      const [template = '', ...parts] = loop[1]!.split('|').map((value) => value.trim());
      const fields = Object.fromEntries(
        parts.flatMap((part) => {
          const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
          return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
        })
      );
      const from = Number(fields.from ?? 0);
      const to = Number(fields.to ?? from);
      const step = Math.max(1, Math.trunc(Math.abs(Number(fields.step ?? 1))));
      if (Number.isInteger(from) && Number.isInteger(to) && to >= from && to - from <= 1000) {
        for (let value = from; value <= to; value += step) {
          const replace = (text: string) =>
            text.replace(/\{(i(?:\s*[+\-*]\s*\d+(?:\.\d+)?)?)\}/g, (_match, expression: string) => {
              const normalized = expression.replace(/\s+/g, '');
              const calculation = normalized.match(/^i(?:([+\-*])(\d+(?:\.\d+)?))?$/);
              if (!calculation) return _match;
              const operand = calculation[1] ? Number(calculation[2]) : 0;
              const result =
                calculation[1] === '+'
                  ? value + operand
                  : calculation[1] === '-'
                    ? value - operand
                    : calculation[1] === '*'
                      ? value * operand
                      : value;
              return String(result);
            });
          entries.push({
            fields: Object.fromEntries(
              Object.entries(fields).map(([key, field]) => [key, replace(field)])
            ),
            index,
            name: replace(template)
          });
        }
      }
      current = undefined;
      continue;
    }
    const match = line.match(/^\s*series\s*:\s*(.*?)\s*$/i);
    if (match) {
      const [name = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
      const fields = Object.fromEntries(
        parts.flatMap((part) => {
          const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
          return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
        })
      );
      current = { fields, index, name };
      entries.push(current);
      continue;
    }
    // Named uncertainty declarations belong to the separate layer parser.
    // Their `error:` fields must not leak into the preceding series as its
    // legacy error bar configuration.
    if (/^\s*uncertainty\s*:/i.test(line)) continue;
    if (
      current &&
      /^\s*(?:animation|animation-duration|animation-delay|animation-easing|reveal-stage|highlight-effect|highlight-color|highlight-duration|highlight-delay|highlight-index|smooth|trendline|visible|legend|legend-order|symbol|data-symbol|data-size|data-alpha|line-style|draw|band|band-color|band-alpha|band-line|error|error-low|error-high|x-error|x-error-low|x-error-high|y-axis|stats(?:-[a-z-]+)?|fit-color|fit-width|fit-alpha|fit-animation|fit-animation-delay|fit-animation-duration|fit-animation-easing)\s*:/i.test(
        line
      )
    ) {
      for (const part of line.split('|')) {
        const continuation = part.match(
          /^\s*(animation|animation-duration|animation-delay|animation-easing|reveal-stage|highlight-effect|highlight-color|highlight-duration|highlight-delay|highlight-index|smooth|trendline|visible|legend|legend-order|symbol|data-symbol|data-size|data-alpha|line-style|draw|band|band-color|band-alpha|band-line|error|error-low|error-high|x-error|x-error-low|x-error-high|y-axis|stats(?:-[a-z-]+)?|fit-color|fit-width|fit-alpha|fit-animation|fit-animation-delay|fit-animation-duration|fit-animation-easing)\s*:\s*(.*?)\s*$/i
        );
        if (continuation) current.fields[continuation[1]!.toLowerCase()] = continuation[2]!.trim();
      }
    } else if (!/^\s*uncertainty\s*:/i.test(line)) current = undefined;
  }

  return entries.flatMap(({ fields, index, name }) => {
    const scalarValue = fields.values?.trim();
    const values =
      parseNumberList(fields.values ?? fields.y) ??
      (scalarValue && Number.isFinite(Number(scalarValue)) ? [Number(scalarValue)] : undefined);
    const xValues = parseNumberList(fields.x);
    const errors = parseNumberList(fields.error);
    const errorLow = parseNumberList(fields['error-low']);
    const errorHigh = parseNumberList(fields['error-high']);
    const xErrors = parseNumberList(fields['x-error']);
    const xErrorLow = parseNumberList(fields['x-error-low']);
    const xErrorHigh = parseNumberList(fields['x-error-high']);
    const labels = fields.labels
      ?.split(',')
      .map((label) => label.trim())
      .filter(Boolean);
    if (!fields.source && !values) return [];
    return [
      {
        name: name || `Series ${index + 1}`,
        source: fields.source ?? '',
        xField: values && !xValues ? '' : (fields.x ?? ''),
        yField: values ? '' : (fields.y ?? ''),
        errorField: errors ? '' : (fields.error ?? ''),
        errorLowField: errorLow ? '' : (fields['error-low'] ?? ''),
        errorHighField: errorHigh ? '' : (fields['error-high'] ?? ''),
        xErrorField: xErrors ? '' : (fields['x-error'] ?? ''),
        xErrorLowField: xErrorLow ? '' : (fields['x-error-low'] ?? ''),
        xErrorHighField: xErrorHigh ? '' : (fields['x-error-high'] ?? ''),
        pointLabelField: fields['point-label-field'] ?? '',
        bubbleSizeField: fields['bubble-size'] ?? '',
        color: fields.color ?? '',
        dataSize: fields['data-size'] ?? '',
        dataAlpha: fields['data-alpha'] ?? '',
        symbol: fields.symbol ?? fields['data-symbol'] ?? '',
        lineStyle: fields['line-style'] ?? '',
        draw: fields.draw ?? '',
        band: fields.band ?? '',
        bandColor: fields['band-color'] ?? '',
        bandAlpha: fields['band-alpha'] ?? '',
        bandLine: fields['band-line'] ?? '',
        yAxis: fields['y-axis']?.toLowerCase() === 'right' ? 'right' : 'left',
        animation: fields.animation ?? '',
        animationDelay: fields['animation-delay'] ?? '',
        animationDuration: fields['animation-duration'] ?? '',
        animationEasing: fields['animation-easing'] ?? '',
        revealStage: fields['reveal-stage'] ?? '',
        highlightEffect: fields['highlight-effect'] ?? '',
        highlightColor: fields['highlight-color'] ?? '',
        highlightDuration: fields['highlight-duration'] ?? '',
        highlightDelay: fields['highlight-delay'] ?? '',
        highlightIndex: fields['highlight-index'] ?? '',
        stats: fields.stats ?? '',
        statsTitle: fields['stats-title'] ?? '',
        statsX: fields['stats-x'] ?? '',
        statsY: fields['stats-y'] ?? '',
        statsStyle: Object.fromEntries(
          Object.entries(fields).filter(([key]) => key === 'stats' || key.startsWith('stats-'))
        ),
        visible: !['false', 'no', 'off', '0'].includes(fields.visible?.toLowerCase() ?? ''),
        legend: fields.legend ?? '',
        legendOrder: fields['legend-order'] ?? '',
        fitColor: fields['fit-color'] ?? '',
        fitWidth: fields['fit-width'] ?? '',
        fitAlpha: fields['fit-alpha'] ?? '',
        fitAnimation: fields['fit-animation'] ?? '',
        fitAnimationDelay: fields['fit-animation-delay'] ?? '',
        fitAnimationDuration: fields['fit-animation-duration'] ?? '',
        fitAnimationEasing: fields['fit-animation-easing'] ?? '',
        // Keep omitted series labels empty so the renderer can inherit the
        // chart-level category labels. Ordinal labels remain the final
        // fallback when neither scope defines them.
        labels: labels ?? [],
        values: values ?? [],
        xValues: xValues ?? [],
        errorValues: errors ?? [],
        errorLowValues: errorLow ?? [],
        errorHighValues: errorHigh ?? [],
        xErrorValues: xErrors ?? [],
        xErrorLowValues: xErrorLow ?? [],
        xErrorHighValues: xErrorHigh ?? [],
        uncertaintyLayers: namedUncertainties.get(index) ?? [],
        smooth: fields.smooth?.toLowerCase() === 'true',
        trendline: ['true', 'linear', 'ols'].includes(fields.trendline?.toLowerCase() ?? '')
      }
    ];
  });
}

function parseChartUncertaintyLayers(source: string): {
  primary: Array<Record<string, unknown>>;
  bySeriesLine: Map<number, Array<Record<string, unknown>>>;
} {
  const primary: Array<Record<string, unknown>> = [];
  const bySeriesLine = new Map<number, Array<Record<string, unknown>>>();
  let currentSeriesLine: number | undefined;
  for (const [index, line] of source.split('\n').entries()) {
    if (/^\s*series(?:-loop)?\s*:/i.test(line)) {
      currentSeriesLine = /^\s*series\s*:/i.test(line) ? index : undefined;
      continue;
    }
    const match = line.match(/^\s*uncertainty\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const [name = '', ...parts] = match[1]!.split('|').map((value) => value.trim());
    if (!name) continue;
    const fields = Object.fromEntries(
      parts.flatMap((part) => {
        const field = part.match(/^([a-zA-Z-]+)\s*:\s*(.*?)\s*$/);
        return field ? [[field[1]!.toLowerCase(), field[2]!.trim()]] : [];
      })
    );
    const values = parseNumberList(fields.error);
    const lower = parseNumberList(fields['error-low']);
    const upper = parseNumberList(fields['error-high']);
    const xValues = parseNumberList(fields['x-error']);
    const correlations = parseNumberList(fields.correlation);
    const requestedStyle = fields.style?.toLowerCase();
    const layer = {
      name,
      style:
        requestedStyle === 'box' || requestedStyle === 'ellipse' || requestedStyle === 'band'
          ? requestedStyle
          : 'bar',
      color: fields.color ?? '',
      width: fields.width ?? '',
      alpha: fields.alpha ?? '',
      capSize: fields['cap-size'] ?? '',
      fillColor: fields['fill-color'] ?? fields.color ?? '',
      fillAlpha: fields['fill-alpha'] ?? '',
      lineStyle: fields['line-style'] ?? '',
      sigma: fields.sigma ?? '',
      combine: fields.combine ?? '',
      animation: fields.animation ?? '',
      animationDuration: fields['animation-duration'] ?? '',
      animationDelay: fields['animation-delay'] ?? '',
      animationEasing: fields['animation-easing'] ?? '',
      revealStage: fields['reveal-stage'] ?? '',
      visible: fields.visible ?? '',
      legend: fields.legend ?? '',
      legendOrder: fields['legend-order'] ?? '',
      errorField: values ? '' : (fields.error ?? ''),
      errorLowField: lower ? '' : (fields['error-low'] ?? ''),
      errorHighField: upper ? '' : (fields['error-high'] ?? ''),
      xErrorField: xValues ? '' : (fields['x-error'] ?? ''),
      correlationField: correlations ? '' : (fields.correlation ?? ''),
      errorValues: values ?? [],
      errorLowValues: lower ?? [],
      errorHighValues: upper ?? [],
      xErrorValues: xValues ?? [],
      correlationValues: correlations ?? []
    };
    const target =
      currentSeriesLine === undefined ? primary : (bySeriesLine.get(currentSeriesLine) ?? []);
    target.push(layer);
    if (currentSeriesLine !== undefined) bySeriesLine.set(currentSeriesLine, target);
  }
  return { primary, bySeriesLine };
}

function parseNumberList(value: string | undefined): number[] | undefined {
  if (!value?.includes(',')) return undefined;
  const values = value.split(',').map((item) => Number(item.trim()));
  return values.every(Number.isFinite) ? values : undefined;
}

function parseDuration(value: string): number {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)$/i);
  if (!match)
    throw new TypeError(`Invalid refresh duration "${value}". Use values such as "2s" or "500ms".`);

  const amount = Number(match[1]);
  return Math.max(250, Math.round(amount * (match[2]?.toLowerCase() === 's' ? 1000 : 1)));
}

function createDataTable(source: string): Table {
  const values = Object.fromEntries(
    source
      .split('\n')
      .map((line) => line.match(/^\s*([a-zA-Z][a-zA-Z-]*)\s*:\s*(.*?)\s*$/))
      .filter((entry): entry is RegExpMatchArray => entry !== null)
      .map(([, key, value]) => [key!.toLowerCase(), value!])
  );

  return Table.create({
    headers: [],
    rows: [],
    attributes: {
      animation: values.animation ?? '',
      animationDuration: values['animation-duration'] ?? '',
      animationDelay: values['animation-delay'] ?? '',
      animationStagger: values['animation-stagger'] ?? '',
      animationEasing: values['animation-easing'] ?? '',
      highlightRow: values['highlight-row'] ?? '',
      highlightColumn: values['highlight-column'] ?? '',
      highlightCell: values['highlight-cell'] ?? '',
      highlightEffect: values['highlight-effect'] ?? '',
      highlightColor: values['highlight-color'] ?? '',
      highlightDuration: values['highlight-duration'] ?? '',
      highlightDelay: values['highlight-delay'] ?? ''
    },
    ...(values.source ? { source: values.source } : {}),
    ...(values.refresh ? { refreshMs: parseDuration(values.refresh) } : {})
  });
}

function createMedia(source: string, kind: 'audio' | 'video'): MediaNode {
  const values = Object.fromEntries(
    source
      .split('\n')
      .map((line) => line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*?)\s*$/))
      .filter((entry): entry is RegExpMatchArray => entry !== null)
      .map(([, key, value]) => [key!.toLowerCase(), value!])
  );
  const enabled = (name: string, fallback: boolean) =>
    values[name] === undefined ? fallback : values[name]!.toLowerCase() === 'true';

  return MediaNode.create({
    kind,
    src: values.src ?? '',
    autoplay: enabled('autoplay', false),
    controls: enabled('controls', true),
    loop: enabled('loop', false),
    muted: enabled('muted', false),
    ...(values.poster ? { poster: values.poster } : {})
  });
}

function createEmbed(source: string): Paragraph {
  const values = Object.fromEntries(
    source
      .split('\n')
      .map((line) => line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*?)\s*$/))
      .filter((entry): entry is RegExpMatchArray => entry !== null)
      .map(([, key, value]) => [key!.toLowerCase(), value!])
  );
  const src = values.src ?? '';
  if (!/^(?:https?:|\/|\.\.?\/)/i.test(src)) {
    throw new TypeError('An iframe block requires an http(s) or relative src value.');
  }
  return Paragraph.create({
    attributes: { embedSrc: src, embedTitle: values.title ?? 'Embedded content' },
    text: ''
  });
}

function isTableHeader(line: string, divider: string | undefined): boolean {
  return isTableRow(line) && divider !== undefined && isTableDivider(divider);
}

function isTableRow(line: string): boolean {
  return line.includes('|') && splitTableRow(line).length > 0;
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function getTableAlignments(divider: string): Array<'left' | 'center' | 'right'> {
  return splitTableRow(divider).map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    return trimmed.endsWith(':') ? 'right' : 'left';
  });
}

function splitTableRow(line: string): string[] {
  const source = line.trim().replace(/^\||\|$/g, '');
  const cells: string[] = [];
  let cell = '';
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\\' && source[index + 1] === '|') {
      cell += '|';
      index += 1;
    } else if (source[index] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else cell += source[index];
  }
  cells.push(cell.trim());
  return cells;
}
