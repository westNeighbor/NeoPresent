import { describe, expect, it, beforeEach } from 'vitest';
import {
  Chart,
  CodeBlock,
  Columns,
  Heading,
  ImageNode,
  List,
  MediaNode,
  Paragraph,
  PdfNode,
  Quote,
  resetNodeIdSequence,
  Table
} from '@neopresent/core';

import { parseMarkdown } from './index.js';

describe('parseMarkdown', () => {
  beforeEach(() => resetNodeIdSequence());

  it('compiles slides, headings, and paragraphs into core nodes', () => {
    const deck = parseMarkdown(`# NeoPresent

A Markdown-first presentation.

---

## Second slide

More content.`);

    expect(deck.title).toBe('NeoPresent');
    expect(deck.children).toHaveLength(2);
    expect(deck.children[0]!.children[0]).toBeInstanceOf(Heading);
    expect(deck.children[0]!.children[1]).toBeInstanceOf(Paragraph);
    expect((deck.children[1]!.children[0] as Heading).level).toBe(2);
  });

  it('captures block and inline speaker notes without rendering them as content', () => {
    const deck = parseMarkdown(`# Demo

<!-- notes: Welcome the audience. -->

:::notes
Explain the architecture.
Then show the demo.
:::`);

    expect(deck.children[0]!.notes).toBe(
      'Welcome the audience.\nExplain the architecture.\nThen show the demo.'
    );
    expect(deck.children[0]!.children).toHaveLength(1);
  });

  it('stores Markdown footnote definitions on their slide', () => {
    const deck = parseMarkdown(`A measured result.[^1]

[^1]: Example Research, 2026.`);

    expect(deck.children[0]!.children).toHaveLength(1);
    expect(
      deck.children[0]!.getAttribute<Array<{ id: string; text: string }>>('footnotes')
    ).toEqual([{ id: '1', text: 'Example Research, 2026.' }]);
  });

  it('compiles note, tip, and warning callouts as styled paragraphs', () => {
    const deck = parseMarkdown(`:::tip
Use **Markdown** first.
:::`);

    const callout = deck.children[0]!.children[0] as Paragraph;
    expect(callout).toBeInstanceOf(Paragraph);
    expect(callout.getAttribute<string>('callout')).toBe('tip');
    expect(callout.text).toBe('Use **Markdown** first.');
  });

  it('compiles a timeline block without turning its entries into a paragraph', () => {
    const deck = parseMarkdown(`:::timeline
2025 | Design
2026 | Release
:::`);

    const timeline = deck.children[0]!.children[0] as Paragraph;
    expect(timeline.getAttribute<boolean>('timeline')).toBe(true);
    expect(timeline.text).toBe('2025 | Design\n2026 | Release');
  });

  it('compiles a card grid block', () => {
    const deck = parseMarkdown(`:::cards
⚡ | Fast | Instant updates
🧩 | Extensible | Plugin blocks
:::`);

    const cards = deck.children[0]!.children[0] as Paragraph;
    expect(cards.getAttribute<boolean>('cards')).toBe(true);
    expect(cards.text).toContain('⚡ | Fast | Instant updates');
  });

  it('compiles a fragment block for staged reveal', () => {
    const deck = parseMarkdown(`@reveal

:::fragment
One point at a time.
:::`);

    const fragment = deck.children[0]!.children[0] as Paragraph;
    expect(deck.children[0]!.getAttribute<string>('reveal')).toBe('true');
    expect(fragment.getAttribute<boolean>('fragment')).toBe(true);
    expect(fragment.text).toBe('One point at a time.');
  });

  it('reads an animation from a fragment block', () => {
    const deck = parseMarkdown(':::fragment zoom\nOne point at a time.\n:::');
    const fragment = deck.children[0]!.children[0] as Paragraph;

    expect(fragment.getAttribute<string>('fragmentAnimation')).toBe('zoom');
  });

  it('compiles Mermaid fences as diagram paragraphs', () => {
    const deck = parseMarkdown('```mermaid\nflowchart LR\n  Markdown --> Viewer\n```');
    const diagram = deck.children[0]!.children[0] as Paragraph;

    expect(diagram.getAttribute<boolean>('mermaid')).toBe(true);
    expect(diagram.text).toBe('flowchart LR\n  Markdown --> Viewer');
  });

  it('compiles math fences as display equations', () => {
    const deck = parseMarkdown('```math\nE = mc^2\n```');
    const equation = deck.children[0]!.children[0] as Paragraph;

    expect(equation.getAttribute<boolean>('math')).toBe(true);
    expect(equation.text).toBe('E = mc^2');
  });

  it('compiles standard $$ display-math blocks', () => {
    const deck = parseMarkdown('$$\n\\frac{a}{b} = c\n$$');
    const equation = deck.children[0]!.children[0] as Paragraph;

    expect(equation.getAttribute<boolean>('math')).toBe(true);
    expect(equation.text).toBe('\\frac{a}{b} = c');
  });

  it('compiles safe iframe blocks', () => {
    const deck = parseMarkdown('```iframe\nsrc: https://example.com/demo\ntitle: Live demo\n```');
    const embed = deck.children[0]!.children[0] as Paragraph;

    expect(embed.getAttribute<string>('embedSrc')).toBe('https://example.com/demo');
    expect(embed.getAttribute<string>('embedTitle')).toBe('Live demo');
  });

  it('compiles a live poll block', () => {
    const deck = parseMarkdown(':::poll\nWhich option?\n- First\n- Second\n:::');
    const poll = deck.children[0]!.children[0] as Paragraph;

    expect(poll.getAttribute<boolean>('poll')).toBe(true);
    expect(poll.text).toBe('Which option?\n- First\n- Second');
  });

  it('marks JavaScript runnable fences for the viewer', () => {
    const deck = parseMarkdown('```js runnable\nconsole.log(42);\n```');
    const code = deck.children[0]!.children[0] as CodeBlock;

    expect(code.getAttribute<boolean>('runnable')).toBe(true);
  });

  it('marks Python runnable fences for the viewer', () => {
    const deck = parseMarkdown('```python runnable\nprint(42)\n```');
    const code = deck.children[0]!.children[0] as CodeBlock;

    expect(code.getAttribute<boolean>('runnable')).toBe(true);
    expect(code.getAttribute<string>('runnableLanguage')).toBe('python');
  });

  it('marks HTML runnable fences for the viewer', () => {
    const deck = parseMarkdown('```html runnable\n<h1>Hello</h1>\n```');
    const code = deck.children[0]!.children[0] as CodeBlock;

    expect(code.getAttribute<boolean>('runnable')).toBe(true);
    expect(code.getAttribute<string>('runnableLanguage')).toBe('html');
  });

  it('reads requested Pyodide packages from runnable Python fences', () => {
    const deck = parseMarkdown('```python runnable packages=numpy,pandas\nprint(42)\n```');
    const code = deck.children[0]!.children[0] as CodeBlock;

    expect(code.getAttribute<string[]>('pythonPackages')).toEqual(['numpy', 'pandas']);
  });

  it('preserves separate lines in a references block', () => {
    const deck = parseMarkdown(`:::references
[1] Neo.mjs documentation
[2] Presentation data report
:::`);

    const references = deck.children[0]!.children[0] as Paragraph;
    expect(references.getAttribute<boolean>('references')).toBe(true);
    expect(references.text).toBe('[1] Neo.mjs documentation\n[2] Presentation data report');
  });

  it('preserves value and label lines in a stat block', () => {
    const deck = parseMarkdown(`:::stat
42%
Faster analysis
:::`);

    const stat = deck.children[0]!.children[0] as Paragraph;
    expect(stat.getAttribute<boolean>('stat')).toBe(true);
    expect(stat.text).toBe('42%\nFaster analysis');
  });

  it('compiles an interactive link button', () => {
    const deck = parseMarkdown('@button Open dashboard | https://example.com/dashboard');

    const button = deck.children[0]!.children[0] as Paragraph;
    expect(button.text).toBe('Open dashboard');
    expect(button.getAttribute<string>('buttonHref')).toBe('https://example.com/dashboard');
  });

  it('allows an interactive button to target a slide inside the deck', () => {
    const deck = parseMarkdown('@button See results | #slide=5');

    const button = deck.children[0]!.children[0] as Paragraph;
    expect(button.text).toBe('See results');
    expect(button.getAttribute<string>('buttonHref')).toBe('#slide=5');
  });

  it('lets plugins compile custom fenced blocks into slide nodes', () => {
    const deck = parseMarkdown(
      `\`\`\`badge
Experimental
\`\`\``,
      {
        plugins: [
          {
            name: 'badge-plugin',
            register(registry) {
              registry.registerFencedBlock('badge', (source) =>
                Paragraph.create({ text: `Badge: ${source}` })
              );
            }
          }
        ]
      }
    );

    expect((deck.children[0]!.children[0] as Paragraph).text).toBe('Badge: Experimental');
  });

  it('extracts theme and per-slide directives without rendering them as paragraphs', () => {
    const deck = parseMarkdown(`@theme midnight
@controls hidden

@background #101522
@transition fade
# Styled slide`);

    expect(deck.theme).toBe('midnight');
    expect(deck.getAttribute<string>('controls')).toBe('hidden');
    expect(deck.children[0]!.getAttribute<string>('background')).toBe('#101522');
    expect(deck.children[0]!.getAttribute<string>('transition')).toBe('fade');
    expect(deck.children[0]!.children).toHaveLength(1);
  });

  it('keeps a per-slide theme override on the matching slide', () => {
    const deck = parseMarkdown(`@theme default

# Dark interlude
@slide-theme midnight

---

# Paper close
@slide-theme paper`);

    expect(deck.theme).toBe('default');
    expect(deck.children[0]!.getAttribute<string>('slideTheme')).toBe('midnight');
    expect(deck.children[1]!.getAttribute<string>('slideTheme')).toBe('paper');
  });

  it('extracts a presentation autoplay interval', () => {
    const deck = parseMarkdown(`@autoplay 8s

# Kiosk deck`);

    expect(deck.getAttribute<number>('autoplayMs')).toBe(8000);
  });

  it('extracts the optional presentation progress indicator directive', () => {
    expect(parseMarkdown('@progress bar\n\n# Deck').getAttribute<boolean>('progress')).toBe(true);
    expect(parseMarkdown('@progress off\n\n# Deck').getAttribute<boolean>('progress')).toBe(false);
  });

  it('extracts a per-slide autoplay duration', () => {
    const deck = parseMarkdown(`@duration 12s

# Detailed slide`);

    expect(deck.children[0]!.getAttribute<number>('durationMs')).toBe(12000);
  });

  it('extracts a background overlay color', () => {
    const deck = parseMarkdown(`@background hero.jpg
@background-overlay rgba(0, 0, 0, .48)

# Readable text`);

    expect(deck.children[0]!.getAttribute<string>('backgroundOverlay')).toBe('rgba(0, 0, 0, .48)');
  });

  it('extracts an image background position', () => {
    const deck = parseMarkdown(`@background hero.jpg
@background-position left top

# Focus on the subject`);

    expect(deck.children[0]!.getAttribute<string>('backgroundPosition')).toBe('left top');
  });

  it('extracts an image background size', () => {
    const deck = parseMarkdown(`@background hero.jpg
@background-size contain

# Show the entire photo`);

    expect(deck.children[0]!.getAttribute<string>('backgroundSize')).toBe('contain');
  });

  it('extracts a per-slide transition duration', () => {
    const deck = parseMarkdown(`@transition zoom
@transition-duration 850ms

# Deliberate movement`);

    expect(deck.children[0]!.getAttribute<number>('transitionDurationMs')).toBe(850);
  });

  it('keeps extended transition names on a slide', () => {
    const deck = parseMarkdown('@transition flip\n\n# A new perspective');

    expect(deck.children[0]!.getAttribute<string>('transition')).toBe('flip');
  });

  it('keeps a code language while recognizing the linenums fence flag', () => {
    const deck = parseMarkdown(`\`\`\`ts linenums
const answer = 42;
\`\`\``);

    const code = deck.children[0]!.children[0] as CodeBlock;
    expect(code.language).toBe('ts');
    expect(code.getAttribute<boolean>('lineNumbers')).toBe(true);
  });

  it('compiles an area plot type', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: area
labels: Jan, Feb
values: 12, 28
\`\`\``);

    expect((deck.children[0]!.children[0] as Chart).kind).toBe('area');
  });

  it('compiles pie aliases and animation settings', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: donut
title: Event composition
labels: Signal, Background, Other
values: 52, 33, 15
pie-inner-radius: 45
animation: draw
animation-duration: 900ms
\`\`\``);
    const chart = deck.children[0]!.children[0] as Chart;

    expect(chart.kind).toBe('pie');
    expect(chart.labels).toEqual(['Signal', 'Background', 'Other']);
    expect(chart.values).toEqual([52, 33, 15]);
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'pie-inner-radius': '45',
      animation: 'draw',
      'animation-duration': '900ms'
    });
  });

  it('accepts shared category labels for a grouped bar chart backed by series', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: bar
labels: 2022, 2023, 2024
legend: true
series: Cook | values: 42,58,71 | color: #ef4444 | legend: true
series: DuPage | values: 31,37,44 | color: #3b82f6 | legend: true
series: Lake | values: 22,29,35 | color: #22c55e | legend: true
\`\`\``);
    const chart = deck.children[0]!.children[0] as Chart;

    expect(chart.kind).toBe('bar');
    expect(chart.values).toEqual([]);
    expect(chart.labels).toEqual(['2022', '2023', '2024']);
    const series = chart.getAttribute<Array<{ labels: string[] }>>('series')!;
    expect(series).toHaveLength(3);
    expect(series.every((item) => item.labels.length === 0)).toBe(true);
  });

  it('compiles radar aliases and radar-specific settings', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: spider
labels: Accuracy, Speed, Stability, Coverage
radar-max: 100
radar-grid-levels: 4
series: Model A | values: 82,74,91,68 | color: #3b82f6
series: Model B | values: 71,89,76,84 | color: #ef4444
animation: draw
\`\`\``);
    const chart = deck.children[0]!.children[0] as Chart;

    expect(chart.kind).toBe('radar');
    expect(chart.labels).toEqual(['Accuracy', 'Speed', 'Stability', 'Coverage']);
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'radar-max': '100',
      'radar-grid-levels': '4',
      animation: 'draw'
    });
  });

  it('accepts outer chart padding and SVG canvas trimming', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: radar
labels: A, B, C
values: 2, 3, 4
chart-padding: 12px 20px
chart-trim: 0 80 0 80
\`\`\``);

    expect(deck.children[0]!.children[0]!.getAttribute('plotStyle')).toMatchObject({
      'chart-padding': '12px 20px',
      'chart-trim': '0 80 0 80'
    });
  });

  it.each([
    ['ratio-panel', 'ratio'],
    ['efficiency', 'efficiency'],
    ['roc-curve', 'roc'],
    ['polar', 'polar'],
    ['stacked-bar', 'stacked-bar'],
    ['ternary', 'ternary'],
    ['forest-plot', 'forest'],
    ['corner', 'corner']
  ] as const)('compiles the %s scientific plot family', (type, expected) => {
    const deck = parseMarkdown(`\`\`\`plot
type: ${type}
labels: A, B, C
values: 1,2,3
\`\`\``);
    expect((deck.children[0]!.children[0] as Chart).kind).toBe(expected);
  });

  it('compiles inline x/y series for a ROC curve', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: roc
series: Classifier A | x: 0,.05,.15,.35,1 | y: 0,.55,.78,.92,1 | color: #3b82f6
series: Classifier B | x: 0,.08,.22,.45,1 | y: 0,.48,.71,.88,1 | color: #ef4444
\`\`\``);
    const chart = deck.children[0]!.children[0] as Chart;
    const series =
      chart.getAttribute<
        Array<{ name: string; values: number[]; xValues: number[]; yField: string }>
      >('series')!;

    expect(chart.kind).toBe('roc');
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      name: 'Classifier A',
      values: [0, 0.55, 0.78, 0.92, 1],
      xValues: [0, 0.05, 0.15, 0.35, 1],
      yField: ''
    });
  });

  it('extracts horizontal and vertical slide alignment directives', () => {
    const deck = parseMarkdown(`@align left
@valign bottom

# A deliberate composition`);

    expect(deck.children[0]!.getAttribute<string>('align')).toBe('left');
    expect(deck.children[0]!.getAttribute<string>('valign')).toBe('bottom');
  });

  it('compiles a section-divider directive without a regular paragraph node', () => {
    const deck = parseMarkdown('@section Part II · Live data');

    expect(deck.children[0]!.getAttribute<string>('section')).toBe('Part II · Live data');
    expect(deck.children[0]!.children).toHaveLength(0);
  });

  it('compiles a responsive grid into a layout-marked columns node', () => {
    const deck = parseMarkdown(`::grid 3
::cell
One
::cell
Two
::cell
Three
::end`);

    const grid = deck.children[0]!.children[0] as Columns;
    expect(grid).toBeInstanceOf(Columns);
    expect(grid.getAttribute<string>('layout')).toBe('grid');
    expect(grid.getAttribute<number>('columnsPerRow')).toBe(3);
    expect(grid.columns).toHaveLength(3);
  });

  it('builds an agenda slide from the other slide titles', () => {
    const deck = parseMarkdown(`# Opening

---

@agenda Today’s route

---

## Results

---

@section Next steps`);

    const agenda = deck.children[1]!;
    expect((agenda.children[0] as Heading).text).toBe('Today’s route');
    expect((agenda.children[1] as List).items).toEqual(['Opening', 'Results', 'Next steps']);
  });

  it('adds subtitle and author metadata to the title slide', () => {
    const deck = parseMarkdown(`@subtitle Presentations for live ideas
@author M. H. Zhao

# NeoPresent`);

    const titleSlide = deck.children[0]!;
    expect((titleSlide.children[1] as Paragraph).getAttribute<string>('titleMeta')).toBe(
      'subtitle'
    );
    expect((titleSlide.children[2] as Paragraph).getAttribute<string>('titleMeta')).toBe('author');
  });

  it('extracts a deck-wide footer without creating slide content', () => {
    const deck = parseMarkdown(`@footer NeoPresent · Internal

# Demo`);

    expect(deck.getAttribute<string>('footer')).toBe('NeoPresent · Internal');
    expect(deck.children[0]!.children).toHaveLength(1);
  });

  it('extracts independent left, center, and right footer slots', () => {
    const deck = parseMarkdown(`@footer-left NeoPresent
@footer-center Conference 2026
@footer-right Confidential

# Demo`);

    expect(deck.getAttribute<string>('footerLeft')).toBe('NeoPresent');
    expect(deck.getAttribute<string>('footer')).toBe('Conference 2026');
    expect(deck.getAttribute<string>('footerRight')).toBe('Confidential');
  });

  it('extracts deck-wide footer shadow controls', () => {
    const deck = parseMarkdown(`@footer-left NeoPresent
@footer-shadow drop
@footer-shadow-color #102030
@footer-shadow-opacity 45%
@footer-shadow-angle 35
@footer-shadow-distance 6px
@footer-shadow-blur 8px

# Demo`);

    expect(deck.getAttribute<string>('footerShadow')).toBe('drop');
    expect(deck.getAttribute<string>('footerShadowColor')).toBe('#102030');
    expect(deck.getAttribute<string>('footerShadowOpacity')).toBe('45%');
    expect(deck.getAttribute<string>('footerShadowAngle')).toBe('35');
    expect(deck.getAttribute<string>('footerShadowDistance')).toBe('6px');
    expect(deck.getAttribute<string>('footerShadowBlur')).toBe('8px');
    expect(deck.children[0]!.children).toHaveLength(1);
  });

  it('compiles three asterisks as an in-slide divider', () => {
    const deck = parseMarkdown(`## Before

***

## After`);

    const divider = deck.children[0]!.children[1] as Paragraph;
    expect(divider.getAttribute<boolean>('divider')).toBe(true);
  });

  it('preserves standard Markdown table alignment markers', () => {
    const deck = parseMarkdown(`| Label | Score | Status |
| :---- | ----: | :----: |
| Alpha | 42 | Ready |`);

    const table = deck.children[0]!.children[0] as Table;
    expect(table.getAttribute<readonly string[]>('alignments')).toEqual([
      'left',
      'right',
      'center'
    ]);
  });

  it('marks a slide that opts out of the deck footer', () => {
    const deck = parseMarkdown(`@hide-footer

# Title slide`);

    expect(deck.children[0]!.getAttribute<boolean>('hideFooter')).toBe(true);
  });

  it('extracts a deck-wide logo path', () => {
    const deck = parseMarkdown(`@logo assets/neopresent.svg

# Demo`);

    expect(deck.getAttribute<string>('logo')).toBe('assets/neopresent.svg');
  });

  it('compiles fenced code and keeps slide separators inside code blocks', () => {
    const deck = parseMarkdown(`## Example

\`\`\`ts
const divider = '---';
\`\`\`

---

## Next`);

    const code = deck.children[0]!.children[1];
    expect(deck.children).toHaveLength(2);
    expect(code).toBeInstanceOf(CodeBlock);
    expect((code as CodeBlock).language).toBe('ts');
    expect((code as CodeBlock).code).toBe("const divider = '---';");
  });

  it('compiles standard Markdown images into image nodes', () => {
    const deck = parseMarkdown(`## Architecture

![NeoPresent logo](assets/neopresent.svg)`);

    const image = deck.children[0]!.children[1];
    expect(image).toBeInstanceOf(ImageNode);
    expect((image as ImageNode).alt).toBe('NeoPresent logo');
    expect((image as ImageNode).src).toBe('assets/neopresent.svg');
  });

  it('compiles multi-line Markdown block quotes into quote nodes', () => {
    const deck = parseMarkdown(`> The best way to predict the future is to create it.
> — Peter Drucker`);

    const quote = deck.children[0]!.children[0];
    expect(quote).toBeInstanceOf(Quote);
    expect((quote as Quote).text).toBe(
      'The best way to predict the future is to create it.\n— Peter Drucker'
    );
  });

  it('compiles PDF fences into PDF nodes', () => {
    const deck = parseMarkdown(`## Report

\`\`\`pdf
src: assets/report.pdf
page: 3
\`\`\``);

    const pdf = deck.children[0]!.children[1];
    expect(pdf).toBeInstanceOf(PdfNode);
    expect((pdf as PdfNode).src).toBe('assets/report.pdf');
    expect((pdf as PdfNode).page).toBe(3);
    expect((pdf as PdfNode).mode).toBe('canvas');
  });

  it('uses the native PDF viewer when requested', () => {
    const deck = parseMarkdown(`\`\`\`pdf
src: assets/report.pdf
mode: viewer
\`\`\``);

    expect((deck.children[0]!.children[0] as PdfNode).mode).toBe('viewer');
  });

  it('compiles standard Markdown tables into table nodes', () => {
    const deck = parseMarkdown(`## Results

| Method | Accuracy |
| --- | ---: |
| NeoPresent | 100% |
| Markdown | 95% |`);

    const table = deck.children[0]!.children[1];
    expect(table).toBeInstanceOf(Table);
    expect((table as Table).headers).toEqual(['Method', 'Accuracy']);
    expect((table as Table).rows).toEqual([
      ['NeoPresent', '100%'],
      ['Markdown', '95%']
    ]);
  });

  it('compiles plot fences into a chart specification', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: bar
smooth: true
title: Build progress
labels: Core, Markdown, Viewer
values: 25, 60, 90
\`\`\``);

    const chart = deck.children[0]!.children[0];
    expect(chart).toBeInstanceOf(Chart);
    expect((chart as Chart).kind).toBe('bar');
    expect((chart as Chart).smooth).toBe(true);
    expect((chart as Chart).labels).toEqual(['Core', 'Markdown', 'Viewer']);
    expect((chart as Chart).values).toEqual([25, 60, 90]);
  });

  it('compiles scientific scatter plot values, error bars, and a trend line', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: scatter
title: Calibration
x: 1, 2, 3
values: 2.1, 4.2, 6.0
error: 0.2, 0.3, 0.25
trendline: linear
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.kind).toBe('scatter');
    expect(chart.xValues).toEqual([1, 2, 3]);
    expect(chart.errorValues).toEqual([0.2, 0.3, 0.25]);
    expect(chart.trendline).toBe(true);
  });

  it('uses nonnumeric inline x values as categorical tick labels', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: line
x: A, B, C
y: 12, 20, 16
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.labels).toEqual(['A', 'B', 'C']);
    expect(chart.xValues).toEqual([]);
    expect(chart.getAttribute('xField')).toBeUndefined();
  });

  it('compiles scientific axis labels including units', () => {
    const deck = parseMarkdown(`\`\`\`plot
values: 1, 2, 3
x-label: Time (s)
ylabel: Signal (a.u.)
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.xLabel).toBe('Time (s)');
    expect(chart.yLabel).toBe('Signal (a.u.)');
  });

  it('keeps shared scientific plot styling attributes', () => {
    const deck = parseMarkdown(`\`\`\`plot
values: 1, 2, 3
title-size: 28px
title-color: #f8fafc
axis-width: 3
data-color: #22c55e
x-label-offset-y: 12
\`\`\``);

    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style).toMatchObject({
      'axis-width': '3',
      'data-color': '#22c55e',
      'title-size': '28px',
      'x-label-offset-y': '12'
    });
  });

  it('keeps per-part alpha values for all plot styles', () => {
    const deck = parseMarkdown(
      '```plot\nvalues: 1, 2, 3\nplot-alpha: .9\ndata-alpha: .6\ngrid-alpha: .25\n```'
    );
    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style).toMatchObject({ 'data-alpha': '.6', 'grid-alpha': '.25', 'plot-alpha': '.9' });
  });

  it('keeps plot dimensions for responsive grid layouts', () => {
    const deck = parseMarkdown(
      '```plot\nvalues: 1, 2, 3\nplot-width: 32%\nplot-height: 240px\n```'
    );
    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style).toMatchObject({ 'plot-height': '240px', 'plot-width': '32%' });
  });

  it('keeps logarithmic axis settings for positive scientific plots', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 10, 100\nvalues: 0.1, 1, 10\nx-scale: log\ny-scale: log\n```'
    );
    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style).toMatchObject({ 'x-scale': 'log', 'y-scale': 'log' });
  });

  it('keeps explicit scientific axis limits', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 2, 3\nvalues: 3, 5, 7\nx-min: 0\nx-max: 4\ny-min: 0\ny-max: 10\n```'
    );
    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style).toMatchObject({ 'x-max': '4', 'x-min': '0', 'y-max': '10', 'y-min': '0' });
  });

  it('keeps scientific reference-line settings', () => {
    const deck = parseMarkdown(
      '```plot\nvalues: 1, 2, 3\nreference-y: 2.5\nreference-label: Detection limit\nreference-color: #facc15\n```'
    );
    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style).toMatchObject({
      'reference-color': '#facc15',
      'reference-label': 'Detection limit',
      'reference-y': '2.5'
    });
  });

  it('keeps point-label settings for named uncertainty layers', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 2\nvalues: 3, 4\npoint-labels: true\npoint-label-errors: Statistical, Systematic\npoint-label-color: #facc15\npoint-label-size: 12\npoint-label-offset-y: -4\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'point-labels': 'true',
      'point-label-errors': 'Statistical, Systematic',
      'point-label-color': '#facc15',
      'point-label-size': '12',
      'point-label-offset-y': '-4'
    });
  });

  it('keeps a request to annotate the regression equation', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 2, 3\nvalues: 2, 4, 6\ntrendline: linear\ntrendline-label: true\n```'
    );
    const style = (deck.children[0]!.children[0] as Chart).getAttribute<Record<string, string>>(
      'plotStyle'
    );
    expect(style?.['trendline-label']).toBe('true');
  });

  it('compiles histograms with a measurement field and bin count', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: histogram
title: Particle diameter
value: diameter_nm
bins: 12
source: data/particles.csv
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.kind).toBe('histogram');
    expect(chart.valueField).toBe('diameter_nm');
    expect(chart.bins).toBe(12);
  });

  it('compiles box plots for raw scientific measurements', () => {
    const deck = parseMarkdown(
      '```plot\ntype: boxplot\ntitle: Replicate distribution\nvalues: 8.1, 8.4, 8.7, 9.0, 9.8\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.kind).toBe('boxplot');
    expect(chart.values).toEqual([8.1, 8.4, 8.7, 9, 9.8]);
  });

  it('keeps histogram statistics and chart animation options', () => {
    const deck = parseMarkdown(
      '```plot\ntype: histogram\nvalues: 2, 4, 6, 8\nstats: entries, mean, rms, median\nstats-title: Detector summary\nanimation: rise\nanimation-duration: 900ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      stats: 'entries, mean, rms, median',
      'stats-title': 'Detector summary',
      animation: 'rise',
      'animation-duration': '900ms'
    });
  });

  it('compiles multiple named chart series with separate data sources', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\ntitle: Calibration comparison\nseries: Reference | source: data/reference.csv | x: concentration | y: response | color: #38bdf8 | animation: rise | animation-delay: 250ms\nseries: Sample | source: data/sample.csv | x: concentration | y: response | color: #f472b6 | animation: fade | animation-delay: 900ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.values).toEqual([]);
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({
        name: 'Reference',
        source: 'data/reference.csv',
        xField: 'concentration',
        yField: 'response',
        color: '#38bdf8',
        animation: 'rise',
        animationDelay: '250ms'
      }),
      expect.objectContaining({
        name: 'Sample',
        source: 'data/sample.csv',
        xField: 'concentration',
        yField: 'response',
        color: '#f472b6',
        animation: 'fade',
        animationDelay: '900ms'
      })
    ]);
  });

  it('keeps histogram fill and inner-bin-line options', () => {
    const deck = parseMarkdown(
      '```plot\ntype: histogram\nvalues: 1, 2, 3, 4\nfill: false\nbin-gap: 4\nbin-lines: true\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      fill: 'false',
      'bin-gap': '4',
      'bin-lines': 'true'
    });
  });

  it('accepts compact animation controls on one ordinary plot line', () => {
    const deck = parseMarkdown(
      '```plot\nvalues: 1, 2, 3\nanimation: rise | animation-duration: 500ms | animation-delay: 250ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      animation: 'rise',
      'animation-duration': '500ms',
      'animation-delay': '250ms'
    });
  });

  it('attaches animation continuation lines to their preceding series', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nseries: Control | x: 1, 2 | values: 3, 4 | color: #38bdf8 |\nanimation: rise | animation-duration: 500ms | animation-delay: 0ms\nseries: Treated | x: 1, 2 | values: 5, 6 | color: #f472b6 |\nanimation: grow | animation-duration: 650ms | animation-delay: 800ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({
        name: 'Control',
        animation: 'rise',
        animationDuration: '500ms',
        animationDelay: '0ms'
      }),
      expect.objectContaining({
        name: 'Treated',
        animation: 'grow',
        animationDuration: '650ms',
        animationDelay: '800ms'
      })
    ]);
  });

  it('keeps parametric-fit and positioned annotation definitions', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 2, 3\nvalues: 2.1, 4.0, 6.2\nfit: a * x + b\nfit-params: a=1, b=0\nfit-results: true\nannotation: $y = ax + b$ | x: .95 | y: .08 | align: right\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      fit: 'a * x + b',
      'fit-params': 'a=1, b=0',
      'fit-results': 'true'
    });
    expect(chart.getAttribute('annotations')).toEqual([
      expect.objectContaining({ text: '$y = ax + b$', x: 0.95, y: 0.08, align: 'right' })
    ]);
  });

  it('keeps hidden fitting-series and animated annotation options', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nseries: Calibration | source: data/calibration.csv | x: dose | y: response | visible: false\nfit: a * x + b\nfit-params: a=1, b=0\nfit-series: Calibration\nannotation: Fit only | x: .5 | y: .1 | animation: fade | animation-delay: 800ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({ name: 'Calibration', visible: false })
    ]);
    expect(chart.getAttribute('annotations')).toEqual([
      expect.objectContaining({ animation: 'fade', animationDelay: '800ms' })
    ]);
  });

  it('attaches delayed annotation continuation controls and fit drawing options', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 2\nvalues: 2, 4\nfit: a * x\nfit-params: a=1\nfit-draw: false\nannotation: Delayed note | x: .9 | y: .1 |\nanimation-duration: 450ms | animation-delay: 1200ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-draw': 'false' });
    expect(chart.getAttribute('annotations')).toEqual([
      expect.objectContaining({ animationDuration: '450ms', animationDelay: '1200ms' })
    ]);
  });

  it('expands a numbered series loop for columnar scientific data', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nseries-loop: Dataset {i} | source: data/results.json | x: x | y: y_{i} | error: error_{i} | from: 0 | to: 3 | visible: false\nfit: a * x + b\nfit-params: a=1, b=0\nfit-all: true\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    const series = chart.getAttribute('series') as Array<Record<string, unknown>>;
    expect(series).toHaveLength(4);
    expect(series[0]).toMatchObject({
      name: 'Dataset 0',
      yField: 'y_0',
      errorField: 'error_0',
      visible: false
    });
    expect(series[3]).toMatchObject({
      name: 'Dataset 3',
      yField: 'y_3',
      errorField: 'error_3',
      visible: false
    });
  });

  it('keeps independent parametric fitting limits', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-params: a=1, b=0\nfit-range: .5, 1.5\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-range': '.5, 1.5' });
  });

  it('keeps fitted-curve visual and stagger controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x\nfit-params: a=1\nfit-color: #facc15\nfit-width: 4\nfit-alpha: .6\nfit-animation-stagger: 150ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-color': '#facc15',
      'fit-width': '4',
      'fit-alpha': '.6',
      'fit-animation-stagger': '150ms'
    });
  });

  it('keeps fitted-curve confidence-band controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-params: a=1, b=0\nfit-band: true\nfit-band-sigma: 2\nfit-band-color: #facc15\nfit-band-alpha: .18\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-band': 'true',
      'fit-band-sigma': '2',
      'fit-band-color': '#facc15',
      'fit-band-alpha': '.18'
    });
  });

  it('keeps fit-quality reporting control', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-params: a=1, b=0\nfit-quality: true\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-quality': 'true' });
  });

  it('keeps the automatic fit-label position controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-params: a=1, b=0\nfit-results: true\nfit-label-x: .96\nfit-label-y: .12\nfit-label-align: right\nfit-label-size: 20\nfit-label-color: #ffffff\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-label-x': '.96',
      'fit-label-y': '.12',
      'fit-label-align': 'right',
      'fit-label-size': '20',
      'fit-label-color': '#ffffff'
    });
  });

  it('keeps a named fit identifier for result placeholders', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-id: calibration\nfit-params: a=1, b=0\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-id': 'calibration' });
  });

  it('keeps parameter bounds for nonlinear fitting', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * exp(-x / tau) + c\nfit-params: a=1, tau=1, c=0\nfit-bounds: a=0:, tau=.01:10, c=-2:2\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-bounds': 'a=0:, tau=.01:10, c=-2:2'
    });
  });

  it('keeps fixed fit parameter controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x + c\nfit-params: a=1, c=0\nfit-fixed: c=0\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-fixed': 'c=0' });
  });

  it('keeps automatic fitted-curve legend controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x + b\nfit-params: a=1, b=0\nfit-legend: true\nfit-legend-label: Linear calibration\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-legend': 'true',
      'fit-legend-label': 'Linear calibration'
    });
  });

  it('keeps fit uncertainty-band legend controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x + b\nfit-params: a=1, b=0\nfit-band: true\nfit-band-legend: true\nfit-band-legend-label: 68% confidence band\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-band-legend': 'true',
      'fit-band-legend-label': '68% confidence band'
    });
  });

  it('keeps independent confidence-band animation controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x + b\nfit-params: a=1, b=0\nfit-band: true\nfit-band-animation: fade\nfit-band-animation-duration: 350ms\nfit-band-animation-delay: 700ms\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-band-animation': 'fade',
      'fit-band-animation-duration': '350ms',
      'fit-band-animation-delay': '700ms'
    });
  });

  it('keeps the confidence or prediction-band choice', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x + b\nfit-params: a=1, b=0\nfit-band: true\nfit-band-kind: prediction\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-band-kind': 'prediction' });
  });

  it('keeps a Poisson likelihood fit method', () => {
    const deck = parseMarkdown(
      '```plot\ntype: histogram\nvalues: 1, 2, 4\nfit: a * exp(-x / tau)\nfit-method: poisson\nfit-params: a=4, tau=2\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-method': 'poisson' });
  });

  it('keeps fit p-value display controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-params: a=1, b=0\nfit-pvalue: true\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'fit-pvalue': 'true' });
  });

  it('keeps fitted-parameter correlation matrix controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1, 2\nvalues: 1, 2, 3\nfit: a * x + b\nfit-params: a=1, b=0\nfit-correlation: true\nfit-correlation-x: .06\nfit-correlation-y: .12\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-correlation': 'true',
      'fit-correlation-x': '.06',
      'fit-correlation-y': '.12'
    });
  });

  it('keeps residual and pull diagnostic controls', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 1, 2\nfit: a * x + b\nfit-params: a=1, b=0\nfit-diagnostic: pull\nfit-diagnostic-height: 130\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({
      'fit-diagnostic': 'pull',
      'fit-diagnostic-height': '130'
    });
  });

  it('keeps asymmetric inline and per-series uncertainty arrays', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 0, 1\nvalues: 4, 6\nerror-low: .2, .4\nerror-high: .5, .7\nseries: Secondary | x: 0, 1 | values: 3, 5 | error-low: .1, .2 | error-high: .3, .4\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('asymmetricErrors')).toEqual({
      lower: [0.2, 0.4],
      upper: [0.5, 0.7]
    });
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({ errorLowValues: [0.1, 0.2], errorHighValues: [0.3, 0.4] })
    ]);
  });

  it('keeps symmetric and asymmetric horizontal uncertainty arrays', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nx: 1, 2\nvalues: 4, 6\nx-error: .1, .2\nx-error-low: .08, .12\nx-error-high: .14, .24\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('xErrorValues')).toEqual([0.1, 0.2]);
    expect(chart.getAttribute('asymmetricXErrors')).toEqual({
      lower: [0.08, 0.12],
      upper: [0.14, 0.24]
    });
  });

  it('keeps asymmetric external uncertainty column names', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nsource: data.csv\nx: energy\ny: rate\nerror-low: down\nerror-high: up\nx-error-low: x_down\nx-error-high: x_up\nseries: Other | source: data.csv | x: energy | y: control | error-low: down2 | error-high: up2 | x-error: x_uncertainty\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('asymmetricErrorFields')).toEqual({ lower: 'down', upper: 'up' });
    expect(chart.getAttribute('asymmetricXErrorFields')).toEqual({
      lower: 'x_down',
      upper: 'x_up'
    });
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({
        errorLowField: 'down2',
        errorHighField: 'up2',
        xErrorField: 'x_uncertainty'
      })
    ]);
  });

  it('keeps per-series data and fitted-curve overrides in loops', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nseries-loop: Dataset {i} | source: data.json | x: x | y: y_{i} | from: 0 | to: 1 | color: hsl({i*90}deg 80% 60%) | data-size: {i+3} | fit-color: hsl({i*90}deg 80% 70%) | fit-width: {i+2} | fit-alpha: .6 | fit-animation: draw | fit-animation-delay: {i*200}ms\n```'
    );
    const series = (deck.children[0]!.children[0] as Chart).getAttribute('series') as Array<
      Record<string, unknown>
    >;
    expect(series[1]).toMatchObject({
      color: 'hsl(90deg 80% 60%)',
      dataSize: '4',
      fitColor: 'hsl(90deg 80% 70%)',
      fitWidth: '3',
      fitAnimationDelay: '200ms'
    });
  });

  it('keeps global and per-series point symbol choices', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\ndata-symbol: diamond\nseries: A | x: 1, 2 | values: 3, 4 | symbol: square\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute('plotStyle')).toMatchObject({ 'data-symbol': 'diamond' });
    expect(chart.getAttribute('series')).toEqual([expect.objectContaining({ symbol: 'square' })]);
  });

  it('attaches marker and ROOT-line options from a series continuation line', () => {
    const deck = parseMarkdown(
      '```plot\ntype: scatter\nseries: A | x: 1, 2 | values: 3, 4 |\nanimation: fade | symbol: kFullTriangleDown | line-style: root-4\n```'
    );
    const series = (deck.children[0]!.children[0] as Chart).getAttribute('series') as Array<
      Record<string, unknown>
    >;
    expect(series[0]).toMatchObject({ symbol: 'kFullTriangleDown', lineStyle: 'root-4' });
  });

  it('compiles fixed-aspect slides and absolute placement blocks', () => {
    const deck = parseMarkdown(
      '@aspect 5:4\n\n::place x:10% y:20% width:40% z:2\n## Positioned plot\n::end'
    );
    expect(deck.children[0]!.getAttribute('aspect')).toBe('5:4');
    const placed = deck.children[0]!.children[0] as Columns;
    expect(placed.getAttribute('layout')).toBe('place');
    expect(placed.getAttribute('position')).toMatchObject({
      x: '10%',
      y: '20%',
      width: '40%',
      z: '2'
    });
  });

  it('applies a preamble aspect ratio to every slide while allowing later overrides', () => {
    const deck = parseMarkdown(
      '@aspect 16:9\n\n# Title\n\n---\n\n## Standard\n\n---\n\n@aspect 5:4\n\n## Poster'
    );
    expect(deck.children.map((slide) => slide.getAttribute('aspect'))).toEqual([
      '16:9',
      '16:9',
      '5:4'
    ]);
  });

  it('keeps a series assignment to the right y axis', () => {
    const deck = parseMarkdown(
      '```plot\ntype: line\nseries: Rate | x: 1, 2 | values: 5, 7\nseries: Temperature | x: 1, 2 | values: 290, 310 | y-axis: right\nright-y-label: Temperature (K)\n```'
    );
    const chart = deck.children[0]!.children[0] as Chart;
    const series = chart.getAttribute<Array<Record<string, unknown>>>('series');
    expect(series?.[0]?.yAxis).toBe('left');
    expect(series?.[1]?.yAxis).toBe('right');
    expect(chart.getAttribute<Record<string, string>>('plotStyle')?.['right-y-label']).toBe(
      'Temperature (K)'
    );
  });

  it('compiles a Feynman fence into a renderable diagram paragraph', () => {
    const deck = parseMarkdown(
      '```feynman\nvertex: a | x: .1 | y: .5\nvertex: b | x: .9 | y: .5\nedge: a -> b | type: photon | label: γ\n```'
    );
    const diagram = deck.children[0]!.children[0] as Paragraph;
    expect(diagram.getAttribute('feynman')).toBe(true);
    expect(diagram.text).toContain('edge: a -> b');
  });

  it('keeps a CSV source and its selected columns on a chart', () => {
    const deck = parseMarkdown(`\`\`\`plot
source: data/progress.csv
x: Month
y: Completion
refresh: 2s
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.source).toBe('data/progress.csv');
    expect(chart.xField).toBe('Month');
    expect(chart.yField).toBe('Completion');
    expect(chart.refreshMs).toBe(2000);
    expect(chart.values).toEqual([]);
  });

  it('compiles table fences with an external CSV source', () => {
    const deck = parseMarkdown(`\`\`\`table
source: data/metrics.csv
refresh: 500ms
\`\`\``);

    const table = deck.children[0]!.children[0] as Table;
    expect(table.source).toBe('data/metrics.csv');
    expect(table.refreshMs).toBe(500);
    expect(table.headers).toEqual([]);
  });

  it('compiles media fences with native playback settings', () => {
    const deck = parseMarkdown(`\`\`\`video
src: assets/demo.mp4
autoplay: true
muted: true
loop: true
controls: false
poster: assets/cover.png
\`\`\``);

    const media = deck.children[0]!.children[0] as MediaNode;
    expect(media).toBeInstanceOf(MediaNode);
    expect(media.type).toBe('video');
    expect(media.autoplay).toBe(true);
    expect(media.muted).toBe(true);
    expect(media.controls).toBe(false);
    expect(media.poster).toBe('assets/cover.png');
  });

  it('compiles columns with independently parsed content', () => {
    const deck = parseMarkdown(`::columns
::column
## Left

Text on the left.
::column
## Right

Text on the right.
::end`);

    const columns = deck.children[0]!.children[0] as Columns;
    expect(columns).toBeInstanceOf(Columns);
    expect(columns.columns).toHaveLength(2);
    expect(columns.columns[0]!.children[0]).toBeInstanceOf(Heading);
    expect(columns.columns[1]!.children[1]).toBeInstanceOf(Paragraph);
  });

  it('compiles Markdown lists and marks a slide for staged reveal', () => {
    const deck = parseMarkdown(`@reveal

- First point
- Second point
- Third point`);

    const list = deck.children[0]!.children[0] as List;
    expect(deck.children[0]!.getAttribute('reveal')).toBe('true');
    expect(list).toBeInstanceOf(List);
    expect(list.items).toEqual(['First point', 'Second point', 'Third point']);
  });

  it('compiles configurable legends and axis-coordinate plot shapes', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: scatter
values: 1, 2
symbol: kFullSquare
legend: true
legend-position: bottom-center
legend-columns: 2
legend-labels: Measured | Simulated
shape: box | x: 0.5 | y: 0.5 | width: 1 | height: 1 | color: #facc15 | fill: false
shape: arrow | x: 1 | y: 1 | x2: 2 | y2: 2 | color: #38bdf8
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute<Record<string, string>>('plotStyle')?.['legend-position']).toBe(
      'bottom-center'
    );
    expect(chart.getAttribute<Record<string, string>>('plotStyle')?.symbol).toBe('kFullSquare');
    expect(chart.getAttribute<Record<string, unknown>[]>('shapes')).toEqual([
      expect.objectContaining({ kind: 'box', x: '0.5', fill: 'false' }),
      expect.objectContaining({ kind: 'arrow', x2: '2', y2: '2' })
    ]);
  });

  it('compiles independently styled named uncertainty layers for primary and named series data', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: scatter
source: data/results.csv
x: energy
y: rate
uncertainty: Statistical | error: stat | style: bar | color: #f8fafc | width: 2 | cap-size: 8
uncertainty: Systematic | error-low: syst_down | error-high: syst_up | style: box | fill-color: #f59e0b | fill-alpha: .2
uncertainty: Covariance | error: y_sigma | x-error: x_sigma | correlation: rho | style: ellipse | color: #a78bfa
uncertainty: Confidence | error: stat | style: band | fill-color: #38bdf8 | fill-alpha: .14 | line-style: dashed
uncertainty: Hidden calibration | error: calibration | style: box | visible: false | legend: false
uncertainty: Calibration | error: .2, .3 | style: bar | animation: rise | animation-duration: 750ms | animation-delay: 200ms | animation-easing: ease-out
uncertainty: 95 percent | error: .1, .2 | style: bar | sigma: 1.96
uncertainty: Total | combine: Statistical, Systematic | style: bar | color: #22c55e
series: Control | source: data/control.json | x: energy | y: rate
uncertainty: Calibration | error: 0.1, 0.2 | style: box | color: #38bdf8
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    expect(chart.getAttribute<Array<Record<string, unknown>>>('uncertaintyLayers')).toEqual([
      expect.objectContaining({
        name: 'Statistical',
        style: 'bar',
        errorField: 'stat',
        color: '#f8fafc',
        width: '2',
        capSize: '8'
      }),
      expect.objectContaining({
        name: 'Systematic',
        style: 'box',
        errorLowField: 'syst_down',
        errorHighField: 'syst_up',
        fillColor: '#f59e0b',
        fillAlpha: '.2'
      }),
      expect.objectContaining({
        name: 'Covariance',
        style: 'ellipse',
        errorField: 'y_sigma',
        xErrorField: 'x_sigma',
        correlationField: 'rho'
      }),
      expect.objectContaining({
        name: 'Confidence',
        style: 'band',
        errorField: 'stat',
        lineStyle: 'dashed'
      }),
      expect.objectContaining({ name: 'Hidden calibration', visible: 'false', legend: 'false' }),
      expect.objectContaining({
        name: 'Calibration',
        animation: 'rise',
        animationDuration: '750ms',
        animationDelay: '200ms',
        animationEasing: 'ease-out'
      }),
      expect.objectContaining({ name: '95 percent', sigma: '1.96' }),
      expect.objectContaining({ name: 'Total', combine: 'Statistical, Systematic' })
    ]);
    expect(
      chart.getAttribute<Array<Record<string, unknown>>>('series')?.[0]?.uncertaintyLayers
    ).toEqual([
      expect.objectContaining({ name: 'Calibration', style: 'box', errorValues: [0.1, 0.2] })
    ]);
  });

  it('does not turn named series uncertainty fields into a legacy series error', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: scatter
series: Treated | source: data/treated.json | x: energy | y: response
uncertainty: Treated statistical | error: stat | style: bar
uncertainty: Treated systematic | error: syst | style: box
\`\`\``);

    const chart = deck.children[0]!.children[0] as Chart;
    const series = chart.getAttribute<Array<Record<string, unknown>>>('series')?.[0];
    expect(series?.errorField).toBe('');
    expect(series?.uncertaintyLayers).toEqual([
      expect.objectContaining({ errorField: 'stat', name: 'Treated statistical' }),
      expect.objectContaining({ errorField: 'syst', name: 'Treated systematic' })
    ]);
  });
});

describe('surface plots', () => {
  it('parses a 3D surface grid and palette options', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: surface
x: 0, 1, 0, 1
y: 0, 0, 1, 1
values: 0, 1, 1, 2
surface-palette: plasma
surface-z-label: $z$
surface-azimuth: 60
surface-elevation: 35
surface-zoom: 1.2
surface-interactive: true
\`\`\``);
    const chart = deck.children[0]?.children[0];

    expect(chart?.type).toBe('chart');
    expect((chart as Chart).kind).toBe('surface');
    expect(chart?.getAttribute('heatmapYValues')).toEqual([0, 0, 1, 1]);
    expect(chart?.getAttribute<Record<string, string>>('plotStyle')).toMatchObject({
      'surface-palette': 'plasma',
      'surface-z-label': '$z$',
      'surface-azimuth': '60',
      'surface-elevation': '35',
      'surface-zoom': '1.2',
      'surface-interactive': 'true'
    });
  });

  it('samples polar functions in radians and preserves polar coordinates', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: polar-function
function: 2 + cos(3*theta)
theta-min: 0
theta-max: 2*pi
theta-samples: 5
\`\`\``);
    const chart = deck.children[0]?.children[0] as Chart;

    expect(chart.kind).toBe('polar-function');
    expect(chart.xValues).toHaveLength(5);
    expect(chart.values).toHaveLength(5);
    expect(chart.xValues[0]).toBeCloseTo(3);
    expect(chart.values[0]).toBeCloseTo(0);
    const style = chart.getAttribute<Record<string, string>>('plotStyle');
    expect(style?.['polar-theta-values']?.split(',').map(Number)).toEqual([
      0,
      Math.PI / 2,
      Math.PI,
      (3 * Math.PI) / 2,
      2 * Math.PI
    ]);
    const radii = style?.['polar-radius-values']?.split(',').map(Number) ?? [];
    expect(radii).toHaveLength(5);
    expect(radii[0]).toBeCloseTo(3);
    expect(radii[1]).toBeCloseTo(2);
    expect(radii[2]).toBeCloseTo(1);
  });

  it.each([
    {
      coordinates: 'cylindrical',
      fields: `surface-function: r\nr-min: 0\nr-max: 2\nr-samples: 3\ntheta-samples: 5`,
      shape: { columns: 3, rows: 5 },
      first: [0, 0, 0]
    },
    {
      coordinates: 'spherical',
      fields: `surface-function: 1\ntheta-samples: 5\nphi-samples: 3`,
      shape: { columns: 5, rows: 3 },
      first: [0, 0, 1]
    },
    {
      coordinates: 'parametric',
      fields: `x-function: (2 + cos(v))*cos(u)\ny-function: (2 + cos(v))*sin(u)\nz-function: sin(v)\nu-samples: 5\nv-samples: 5`,
      shape: { columns: 5, rows: 5 },
      first: [3, 0, 0]
    }
  ])(
    'samples $coordinates surface functions as a structured grid',
    ({ coordinates, fields, shape, first }) => {
      const deck = parseMarkdown(`\`\`\`plot
type: surface
surface-coordinates: ${coordinates}
${fields}
\`\`\``);
      const chart = deck.children[0]?.children[0] as Chart;

      expect(chart.kind).toBe('surface');
      expect(chart.getAttribute('surfaceCoordinateSystem')).toBe(coordinates);
      expect(chart.getAttribute('surfaceGridShape')).toEqual(shape);
      expect(chart.xValues).toHaveLength(shape.columns * shape.rows);
      expect(chart.getAttribute<number[]>('heatmapYValues')).toHaveLength(
        shape.columns * shape.rows
      );
      expect(chart.values).toHaveLength(shape.columns * shape.rows);
      expect(chart.xValues[0]).toBeCloseTo(first[0] ?? 0);
      expect(chart.getAttribute<number[]>('heatmapYValues')?.[0]).toBeCloseTo(first[1] ?? 0);
      expect(chart.values[0]).toBeCloseTo(first[2] ?? 0);
    }
  );
});

describe('extended statistical and flow plot types', () => {
  it.each([
    ['qq', 'qq'],
    ['probability-plot', 'qq'],
    ['ecdf', 'ecdf'],
    ['survival', 'ecdf'],
    ['precision-recall', 'precision-recall'],
    ['volcano', 'volcano'],
    ['waterfall', 'waterfall'],
    ['sankey', 'sankey'],
    ['alluvial', 'sankey'],
    ['time-series', 'time-series'],
    ['geographic', 'geographic']
  ] as const)('maps %s to %s', (type, expected) => {
    const deck = parseMarkdown(`\`\`\`plot\ntype: ${type}\nvalues: 1,2\nlabels: A,B\n\`\`\``);
    expect((deck.children[0]?.children[0] as Chart).kind).toBe(expected);
  });

  it('turns the survival alias into a complementary ECDF', () => {
    const deck = parseMarkdown(`\`\`\`plot\ntype: survival\nvalues: 1,2,3\n\`\`\``);
    expect(
      (deck.children[0]?.children[0] as Chart).getAttribute<Record<string, string>>('plotStyle')
    ).toMatchObject({ 'ecdf-complement': 'true' });
  });

  it('accepts scalar inline series values for Sankey links', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: sankey
series: Generated -> Selected | values: 850
\`\`\``);
    const chart = deck.children[0]?.children[0] as Chart;
    expect(chart.kind).toBe('sankey');
    expect(chart.getAttribute<Array<Record<string, unknown>>>('series')).toEqual([
      expect.objectContaining({ name: 'Generated -> Selected', values: [850] })
    ]);
  });

  it('preserves structured external-data field names', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: sankey
source: data/flow.csv
sankey-source-field: from
sankey-target-field: to
sankey-value-field: events
geo-region-field: region
efficiency-total-field: total
survival-event-field: observed
time-missing: 2
forest-lower-field: lower
forest-upper-field: upper
waterfall-total-field: kind
survival-confidence: true
survival-confidence-level: 95
survival-confidence-color: #f59e0b
survival-confidence-alpha: .2
geo-name-field: title
geo-value-field: rate
geo-palette: kBird
geo-color-label: Event rate
geo-colorbar-x: 650
geo-colorbar-y: 250
geo-colorbar-width: 20
geo-colorbar-height: 120
legend-x: .2
legend-y: .3
\`\`\``);
    expect(
      (deck.children[0]?.children[0] as Chart).getAttribute<Record<string, string>>('plotStyle')
    ).toMatchObject({
      'sankey-source-field': 'from',
      'sankey-target-field': 'to',
      'sankey-value-field': 'events',
      'geo-region-field': 'region',
      'efficiency-total-field': 'total',
      'survival-event-field': 'observed',
      'time-missing': '2',
      'forest-lower-field': 'lower',
      'forest-upper-field': 'upper',
      'waterfall-total-field': 'kind',
      'survival-confidence': 'true',
      'survival-confidence-level': '95',
      'survival-confidence-color': '#f59e0b',
      'survival-confidence-alpha': '.2',
      'geo-name-field': 'title',
      'geo-value-field': 'rate',
      'geo-palette': 'kBird',
      'geo-color-label': 'Event rate',
      'geo-colorbar-x': '650',
      'geo-colorbar-y': '250',
      'geo-colorbar-width': '20',
      'geo-colorbar-height': '120',
      'legend-x': '.2',
      'legend-y': '.3'
    });
  });

  it('parses volcano label controls', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: volcano
x: -2,0,2
y: 3,.2,4
labels: Down,Neutral,Up
legend: true
volcano-labels: true
volcano-label-significant-only: false
volcano-label-size: 13
\`\`\``);
    expect(
      (deck.children[0]?.children[0] as Chart).getAttribute<Record<string, string>>('plotStyle')
    ).toMatchObject({
      legend: 'true',
      'volcano-labels': 'true',
      'volcano-label-significant-only': 'false',
      'volcano-label-size': '13'
    });
  });
});

describe('ternary plot components', () => {
  it('preserves all three documented component arrays', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: ternary
labels: Sample 1, Sample 2, Sample 3
x: 20,50,25
y: 30,20,50
values: 50,30,25
\`\`\``);
    const chart = deck.children[0]?.children[0] as Chart;
    expect(chart.xValues).toEqual([20, 50, 25]);
    expect(chart.getAttribute('heatmapYValues')).toEqual([30, 20, 50]);
    expect(chart.values).toEqual([50, 30, 25]);
  });

  it('accepts a single ternary sample', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: ternary
labels: Sample
x: 2
y: 3
values: 5
\`\`\``);
    const chart = deck.children[0]?.children[0] as Chart;
    expect(chart.xValues).toEqual([2]);
    expect(chart.getAttribute('heatmapYValues')).toEqual([3]);
    expect(chart.values).toEqual([5]);
  });
});

describe('heading panel directives', () => {
  it('inherits deck defaults and permits a slide-level override', () => {
    const deck = parseMarkdown(`@heading-panel-width fit-content
@heading-panel-max-width 92%
@heading-panel-padding .10em .28em .12em

# First

---
@heading-panel-width 70%

# Second`);

    expect(deck.children[0]?.getAttribute('headingPanelWidth')).toBe('fit-content');
    expect(deck.children[0]?.getAttribute('headingPanelMaxWidth')).toBe('92%');
    expect(deck.children[0]?.getAttribute('headingPanelPadding')).toBe('.10em .28em .12em');
    expect(deck.children[1]?.getAttribute('headingPanelWidth')).toBe('70%');
    expect(deck.children[1]?.getAttribute('headingPanelMaxWidth')).toBe('92%');
  });
});

describe('deck-wide shadow directives', () => {
  it('keeps an ordinary local @shadow directive out of deck-wide defaults', () => {
    const deck = parseMarkdown(`@plot-shadow drop
@plot-shadow-blur 7px

# Shadow scope

@shadow contact
@shadow-blur 3px
@shadow-perspective 65
Local paragraph`);
    const defaults = deck.children[0]?.getAttribute<Record<string, Record<string, string>>>(
      'deckShadowDefaults'
    );
    const paragraph = deck.children[0]?.children.find((node) => node.type === 'paragraph');

    expect(defaults?.plot).toEqual({ shadow: 'drop', 'shadow-blur': '7px' });
    expect(defaults?.block).toEqual({});
    expect(paragraph?.getAttribute<Record<string, string>>('blockStyle')).toEqual({
      shadow: 'contact',
      'shadow-blur': '3px',
      'shadow-perspective': '65'
    });
  });

  it('parses deck-wide and footer contact-shadow perspective', () => {
    const deck = parseMarkdown(`@plot-shadow contact
@plot-shadow-perspective -45
@footer-shadow contact
@footer-shadow-perspective 70

# Perspective`);

    expect(deck.children[0]?.getAttribute('deckShadowDefaults')).toMatchObject({
      plot: { shadow: 'contact', 'shadow-perspective': '-45' }
    });
    expect(deck.getAttribute('footerShadowPerspective')).toBe('70');
  });
});

describe('deck-wide glass directives', () => {
  it('keeps ordinary @glass local while inheriting targeted glass defaults', () => {
    const deck = parseMarkdown(`@block-glass on
@block-glass-blur 18px
@plot-glass-alpha 10%

# Glass scope

@glass off
Local paragraph`);
    const defaults = deck.children[0]?.getAttribute<Record<string, Record<string, string>>>(
      'deckGlassDefaults'
    );
    const paragraph = deck.children[0]?.children.find((node) => node.type === 'paragraph');

    expect(defaults?.block).toEqual({ glass: 'on', 'glass-blur': '18px' });
    expect(defaults?.plot).toEqual({ 'glass-alpha': '10%' });
    expect(paragraph?.getAttribute<Record<string, string>>('blockStyle')).toEqual({ glass: 'off' });
  });
});
