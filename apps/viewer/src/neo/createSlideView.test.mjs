import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '@neopresent/markdown';

import { createScientificChartMarkup, createSlideVdom } from './createSlideView.mjs';

describe('code block alignment', () => {
  it('preserves source indentation on center-aligned slides', () => {
    const deck = parseMarkdown(`@align center

\`\`\`rust linenums
fn main() {
    println!("Hello from Rust");
}
\`\`\``);
    const theme = {
      accent: '#1a734d',
      background: '#ffffff',
      border: '#3db373',
      codeComment: '#64748b',
      codeKeyword: '#1d4ed8',
      codeNumber: '#ff0000',
      codeString: '#9f1239',
      foreground: '#1a734d',
      muted: '#4b5563',
      panel: '#ffffff',
      surface: '#e0ffe6'
    };
    const vdom = createSlideVdom(deck.children[0], theme, false, false, Infinity, false);
    const block = vdom.cn.find((child) => child?.tag === 'pre');
    const code = block?.cn?.find((child) => child?.tag === 'code');

    expect(block?.style?.textAlign).toBe('left');
    expect(code?.style?.textAlign).toBe('left');
    expect(code?.style?.whiteSpace).toBe('pre');
  });
});

describe('styled inline footer content', () => {
  it('renders LaTeX inside an inline style span', () => {
    const theme = {
      accent: '#38bdf8',
      background: '#ffffff',
      border: '#cbd5e1',
      foreground: '#0f172a',
      muted: '#64748b',
      panel: '#f8fafc',
      surface: '#f1f5f9'
    };
    const slide = { children: [], getAttribute: () => undefined };
    const vdom = createSlideVdom(slide, theme, false, false, Infinity, false, {
      center: '{{style:size=16px|Drell-Yan $A_N$ measurement at STAR}}'
    });

    expect(JSON.stringify(vdom)).toContain('"katexSource":"A_N"');
  });
});

describe('slide transitions', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#ffffff',
    border: '#cbd5e1',
    foreground: '#0f172a',
    muted: '#64748b',
    panel: '#f8fafc',
    surface: '#f1f5f9'
  };

  it('does not animate a slide unless a transition is selected', () => {
    const slide = { children: [], getAttribute: () => undefined };
    const vdom = createSlideVdom(slide, theme, false, false, Infinity, true);

    expect(vdom.style.animation).toBeUndefined();
  });

  it('keeps explicitly selected slide transitions', () => {
    const slide = {
      children: [],
      getAttribute: (name) => (name === 'transition' ? 'fade' : undefined)
    };
    const vdom = createSlideVdom(slide, theme, false, false, Infinity, true);

    expect(vdom.style.animation).toContain('neopresent-fade-in');
  });

  it.each(['fade', 'grow', 'rise', 'zoom', 'morph'])(
    'overlays %s replacement plots in one centered grid cell',
    (enterEffect) => {
      const deck = parseMarkdown(`@block-transition-trigger reveal
@block-exit replace

\`\`\`plot
type: bar
x: A, B
y: 1, 2
\`\`\`

@block-enter ${enterEffect}

\`\`\`plot
type: line
x: A, B
y: 2, 1
\`\`\``);
      const vdom = createSlideVdom(deck.children[0], theme, false, false, 1, true);
      const replacementHost = vdom.cn.find(
        (child) => child?.data?.neopresentReplacementHost === 'true'
      );

      expect(replacementHost?.style?.display).toBe('grid');
      expect(replacementHost?.cn).toHaveLength(2);
      expect(replacementHost?.cn?.[0]?.style?.gridArea).toBe('1 / 1');
      expect(replacementHost?.cn?.[1]?.style?.gridArea).toBe('1 / 1');
      expect(replacementHost?.cn?.[0]?.style?.justifySelf).toBe('center');
      expect(replacementHost?.cn?.[1]?.style?.justifySelf).toBe('center');
    }
  );

  it('interpolates only line marks for compatible morph plots', () => {
    const deck = parseMarkdown(`@block-transition-trigger reveal
@block-exit replace

\`\`\`plot
type: line
x: A, B, C
y: 12, 20, 16
draw: LP
y-min: 10
y-max: 30
\`\`\`

@block-enter morph
@block-transition-duration 900ms

\`\`\`plot
type: line
x: A, B, C
y: 16, 14, 24
draw: LP
y-min: 10
y-max: 30
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, 1, true);
    const replacementHost = vdom.cn.find(
      (child) => child?.data?.neopresentReplacementHost === 'true'
    );
    const [outgoing, incoming] = replacementHost.cn;

    expect(outgoing.style.opacity).toBe(0);
    expect(outgoing.style.animation).toBeUndefined();
    expect(incoming.style.opacity).toBe(1);
    expect(incoming.style.animation).toBeUndefined();
    const incomingMarkup = JSON.stringify(incoming);
    expect(incomingMarkup).toContain('data-neopresent-morph-id=');
    expect(incomingMarkup).toContain('@keyframes np-line-morph-');
    expect(incomingMarkup).toContain('data-neopresent-series-point');
    expect(incomingMarkup).toContain('-point-0-0');
    expect(incomingMarkup).toMatch(/transform:translate\(-?\d+(?:\.\d+)?px,-?\d+(?:\.\d+)?px\)/);
    expect(incomingMarkup).toContain('900ms cubic-bezier(.2,.8,.2,1)');
  });

  it('reverses compatible line morph geometry on a backward reveal step', () => {
    const deck = parseMarkdown(`@block-transition-trigger reveal
@block-exit replace
\`\`\`plot
type: line
x: A, B, C
y: 12, 20, 16
y-min: 10
y-max: 30
\`\`\`
@block-enter morph
@block-transition-duration 900ms
\`\`\`plot
type: line
x: A, B, C
y: 16, 14, 24
y-min: 10
y-max: 30
\`\`\``);
    const vdom = createSlideVdom(
      deck.children[0],
      theme,
      false,
      false,
      0,
      true,
      {},
      '',
      null,
      '0,0',
      null,
      '',
      false,
      'backward'
    );
    const replacementHost = vdom.cn.find(
      (child) => child?.data?.neopresentReplacementHost === 'true'
    );
    const [earlier, later] = replacementHost.cn;

    expect(earlier.style.opacity).toBe(1);
    expect(later.style.opacity).toBe(0);
    expect(JSON.stringify(earlier)).toContain('@keyframes np-line-morph-');
  });

  it('semantically morphs numeric ticks into categorical ticks by index', () => {
    const deck = parseMarkdown(`@block-transition-trigger reveal
@block-exit replace
\`\`\`plot
type: line
x: 1, 2, 3
y: 12, 20, 16
y-min: 10
y-max: 30
\`\`\`
@block-enter morph
@block-transition-duration 900ms
\`\`\`plot
type: line
x: A, B, C
y: 16, 14, 24
y-min: 10
y-max: 30
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, 1, true);
    const replacementHost = vdom.cn.find(
      (child) => child?.data?.neopresentReplacementHost === 'true'
    );
    const markup = JSON.stringify(replacementHost);

    expect(markup).toContain('from{d:path');
    expect(markup).toContain('data-neopresent-morph-source-tick');
    expect(markup).toContain('-tick-in');
    expect(markup).toContain('-tick-out');
  });

  it.each([
    ['bar', 'y-min: 0\ny-max: 4', 'attributeName=\\"height'],
    ['pie', 'labels: A, B, C', 'attributeName=\\"d'],
    ['radar', 'labels: A, B, C\nradar-max: 100', 'attributeName=\\"points']
  ])('morphs compatible %s mark geometry', (type, settings, expected) => {
    const deck = parseMarkdown(`@block-transition-trigger reveal
@block-exit replace
\`\`\`plot
type: ${type}
values: 1, 2, 3
${settings}
\`\`\`
@block-enter morph
\`\`\`plot
type: ${type}
values: 3, 1, 2
${settings}
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, 1, true);
    const replacementHost = vdom.cn.find(
      (child) => child?.data?.neopresentReplacementHost === 'true'
    );

    expect(JSON.stringify(replacementHost)).toContain(expected);
    expect(replacementHost.cn[0].style.animation).toBeUndefined();
    expect(replacementHost.cn[1].style.animation).toBeUndefined();
  });

  it('morphs sampled functions and fitted curves while crossfading fit text', () => {
    const deck = parseMarkdown(`@block-transition-trigger reveal
@block-exit replace
\`\`\`plot
type: line
x: 1, 2, 3, 4
y: 2, 4, 7, 11
y-min: 0
y-max: 20
function: x*x | label: Model
fit: a + b*x
fit-id: trend
fit-params: a=0, b=1
fit-results: true
\`\`\`
@block-enter morph
\`\`\`plot
type: line
x: 1, 2, 3, 4
y: 3, 6, 10, 15
y-min: 0
y-max: 20
function: x*x + 2 | label: Model
fit: a + b*x
fit-id: trend
fit-params: a=0, b=1
fit-results: true
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, 1, true);
    const replacementHost = vdom.cn.find(
      (child) => child?.data?.neopresentReplacementHost === 'true'
    );
    const markup = JSON.stringify(replacementHost);

    expect(markup).toContain('data-neopresent-series-line=\\\"function:Model');
    expect(markup).toContain('data-neopresent-series-line=\\\"fit:trend');
    expect(markup).toContain('data-neopresent-morph-source-fit-text');
    expect(markup).toContain('-fit-text-in');
  });
});

describe('named uncertainty rendering', () => {
  it('renders selected named errors beside scatter points', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'point-labels',
        kind: 'scatter',
        title: '',
        labels: ['1'],
        values: [10],
        xValues: [1],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: { 'point-labels': 'true', 'point-label-errors': 'Statistical' },
        series: [],
        shapes: [],
        trendline: false,
        xLabel: '',
        yLabel: '',
        uncertaintyLayers: [{ name: 'Statistical', style: 'bar', errorValues: [0.5] }]
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );
    expect(markup).toContain('±0.5 Statistical');
  });

  it('renders independent bar and box layers in audience-equivalent presenter markup', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'uncertainty-demo',
        kind: 'scatter',
        title: '',
        labels: ['1', '2'],
        values: [10, 12],
        xValues: [1, 2],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: {},
        series: [],
        shapes: [],
        uncertaintyLayers: [
          {
            name: 'Statistical',
            style: 'bar',
            color: '#ffffff',
            width: '2',
            capSize: '7',
            errorValues: [0.5, 0.6]
          },
          {
            name: 'Systematic',
            style: 'box',
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillAlpha: '.2',
            errorLowValues: [0.8, 0.9],
            errorHighValues: [1, 1.1]
          },
          {
            name: 'Covariance',
            style: 'ellipse',
            color: '#a78bfa',
            fillColor: '#a78bfa',
            errorValues: [0.5, 0.6],
            xErrorValues: [0.1, 0.2],
            correlationValues: [0.4, -0.3]
          },
          {
            name: 'Confidence',
            style: 'band',
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillAlpha: '.14',
            lineStyle: 'dashed',
            errorValues: [0.7, 0.8]
          },
          {
            name: 'Hidden calibration',
            style: 'box',
            visible: 'false',
            legend: 'false',
            errorValues: [1, 1]
          }
        ],
        trendline: false,
        xLabel: '',
        yLabel: ''
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toContain('data-neopresent-uncertainty="Statistical"');
    expect(markup).toContain('data-neopresent-uncertainty-style="bar"');
    expect(markup).toContain('stroke="#ffffff"');
    expect(markup).toContain('data-neopresent-uncertainty="Systematic"');
    expect(markup).toContain('data-neopresent-uncertainty-style="box"');
    expect(markup).toContain('fill="#f59e0b"');
    expect(markup).toContain('data-neopresent-uncertainty="Covariance"');
    expect(markup).toContain('data-neopresent-uncertainty-style="ellipse"');
    expect(markup).toContain('<ellipse');
    expect(markup).toContain('data-neopresent-uncertainty="Confidence"');
    expect(markup).toContain('data-neopresent-uncertainty-style="band"');
    expect(markup).toContain('Confidence uncertainty band');
    expect(markup).toContain('stroke-dasharray="12 8"');
    expect(markup).not.toContain('Hidden calibration');
  });

  it('uses scientific defaults for unnamed layer dimensions', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'uncertainty-defaults',
        kind: 'scatter',
        title: '',
        labels: ['1'],
        values: [10],
        xValues: [1],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: {},
        series: [],
        shapes: [],
        uncertaintyLayers: [
          { name: 'Bar', style: 'bar', errorValues: [1] },
          { name: 'Box', style: 'box', errorValues: [1] },
          { name: 'Ellipse', style: 'ellipse', errorValues: [1], xErrorValues: [0.1] }
        ],
        trendline: false,
        xLabel: '',
        yLabel: ''
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toMatch(/data-neopresent-uncertainty="Bar"[\s\S]*?stroke-width="2"/);
    expect(markup).toMatch(/data-neopresent-uncertainty="Bar"[\s\S]*?M 162 30 H 172/);
    expect(markup).toMatch(/data-neopresent-uncertainty="Box"[\s\S]*?width="16"/);
    expect(markup).toMatch(/data-neopresent-uncertainty="Ellipse"[\s\S]*?stroke-width="2"/);
  });

  it('allows a layer to override or disable chart animation', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'uncertainty-animation',
        kind: 'scatter',
        title: '',
        labels: ['1', '2'],
        values: [10, 12],
        xValues: [1, 2],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: { animation: 'fade', 'animation-duration': '400ms' },
        series: [],
        shapes: [],
        uncertaintyLayers: [
          {
            name: 'Statistical',
            style: 'bar',
            errorValues: [0.5, 0.5],
            animation: 'rise',
            animationDuration: '750ms',
            animationDelay: '200ms'
          },
          { name: 'Systematic', style: 'box', errorValues: [0.8, 0.8], animation: 'off' }
        ],
        trendline: false,
        xLabel: '',
        yLabel: ''
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toMatch(
      /data-neopresent-uncertainty="Statistical"[\s\S]*?neopresent-chart-rise 750ms [^;]+ 200ms/
    );
    expect(markup).toMatch(/data-neopresent-uncertainty="Systematic"[^>]*style=""/);
  });

  it('keeps named tooltip uncertainties in one y expression', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'uncertainty-tooltip',
        kind: 'scatter',
        title: '',
        labels: ['1'],
        values: [10],
        xValues: [1],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: {},
        series: [],
        shapes: [],
        uncertaintyLayers: [
          { name: 'Statistical', style: 'bar', errorValues: [0.4] },
          { name: 'Systematic', style: 'box', errorValues: [0.25] }
        ],
        trendline: false,
        xLabel: '',
        yLabel: ''
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toContain('y=10 ±0.4 (Statistical) ±0.25 (Systematic)');
    expect(markup).not.toContain('(Statistical);');
  });

  it('renders a named quadrature total from earlier layers', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'uncertainty-total',
        kind: 'scatter',
        title: '',
        labels: ['1'],
        values: [10],
        xValues: [1],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: {},
        series: [],
        shapes: [],
        uncertaintyLayers: [
          { name: 'Statistical', style: 'bar', errorValues: [3] },
          { name: 'Systematic', style: 'box', errorValues: [4] },
          { name: 'Total', style: 'bar', combine: 'Statistical, Systematic' }
        ],
        trendline: false,
        xLabel: '',
        yLabel: ''
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toContain('Total: +5 / −5');
    expect(markup).toContain('y=10 ±3 (Statistical) ±4 (Systematic) ±5 (Total)');
  });

  it('scales named uncertainty layers with sigma and expands axis bounds', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'uncertainty-sigma',
        kind: 'scatter',
        title: '',
        labels: ['1'],
        values: [10],
        xValues: [1],
        errorValues: [],
        asymmetricErrors: null,
        asymmetricXErrors: null,
        xErrorValues: [],
        annotations: [],
        legendItems: [],
        plotStyle: {},
        series: [],
        shapes: [],
        uncertaintyLayers: [{ name: '95 percent', style: 'bar', errorValues: [1], sigma: '1.96' }],
        trendline: false,
        xLabel: '',
        yLabel: ''
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toContain('95 percent: +1.96 / −1.96');
    expect(markup).toContain('1: x=1; y=10 ±1.96 (95 percent)');
    // The automatic ticks are intentionally rounded, so verify the scaled
    // uncertainty reaches both plot bounds instead of coupling this test to
    // a particular tick-label strategy.
    expect(markup).toContain('M 95 30 V 300');
  });
});

describe('pie charts', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };

  it('renders labelled donut slices, percentages, tooltips, and staggered draw animation', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'composition',
        kind: 'pie',
        title: 'Event composition',
        labels: ['Signal', 'Background', 'Other'],
        values: [50, 30, 20],
        plotStyle: {
          animation: 'draw',
          'animation-delay': '100ms',
          'animation-duration': '800ms',
          'pie-colors': '#ef4444,#3b82f6,#22c55e',
          'pie-inner-radius': '45',
          legend: 'true',
          'legend-x': '',
          'legend-y': ''
        }
      },
      theme
    );

    expect(markup).toContain('aria-label="Pie chart"');
    expect(markup.match(/data-neopresent-pie-slice=/g)).toHaveLength(3);
    expect(markup).toContain('Signal: 50 (50%)');
    expect(markup).toContain('data-neopresent-tooltip="Signal: 50 (50%)"');
    expect(markup).toContain('data-neopresent-mark-kind="pie"');
    expect(markup).toContain('Signal · 50%');
    expect(markup).toContain('fill="#ef4444"');
    expect(markup).toContain('neopresent-chart-grow 800ms');
    expect(markup).toContain('100ms both');
    expect(markup).toContain('280ms both');
    expect(markup).toContain('data-neopresent-special-legend="true"');
    expect(markup).toContain('M 615 67 H 637');
  });
});

describe('grouped bar charts', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };

  it('places each series side by side within a shared category slot', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'county-population',
        kind: 'bar',
        labels: ['2022', '2023'],
        values: [],
        xLabel: 'Year',
        yLabel: 'Population',
        plotStyle: { animation: 'grow', legend: 'true' },
        series: [
          { name: 'Cook', values: [10, 12], color: '#ef4444', legend: 'true' },
          { name: 'DuPage', values: [7, 8], color: '#3b82f6', legend: 'true' },
          { name: 'Lake', values: [5, 6], color: '#22c55e', legend: 'true' }
        ]
      },
      theme
    );

    expect(markup.match(/data-neopresent-bar-series=/g)).toHaveLength(6);
    expect(markup).toContain('data-neopresent-tooltip="Cook · 2022: 10"');
    expect(markup).toContain('data-neopresent-tooltip="DuPage · 2022: 7"');
    expect(markup).toContain('data-neopresent-tooltip="Lake · 2022: 5"');
    expect(markup).toContain('data-neopresent-bar-series="0" data-neopresent-bar-category="0"');
    expect(markup).toContain('data-neopresent-bar-series="2" data-neopresent-bar-category="0"');
    expect(markup).toContain('>2022</text>');
    expect(markup).toContain('neopresent-chart-grow');
  });

  it('wraps the default chart width instead of stretching block effects across the slide', () => {
    const deck = parseMarkdown(`@block-glass on

\`\`\`plot
type: bar
labels: 2022, 2023
series: A | values: 10,12
series: B | values: 7,8
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, Infinity, false);
    const chartNode = vdom.cn.find(
      (child) => child?.tag === 'div' && JSON.stringify(child).includes('aria-label')
    );

    expect(chartNode?.style?.width).toBe('min(100%, 845px)');
    expect(chartNode?.style?.background).toContain('linear-gradient');
  });

  it('keeps an explicit full chart width', () => {
    const deck = parseMarkdown(`\`\`\`plot
type: bar
labels: 2022
values: 10
chart-width: 100%
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, Infinity, false);
    const chartNode = vdom.cn.find(
      (child) => child?.tag === 'div' && JSON.stringify(child).includes('aria-label')
    );

    expect(chartNode?.style?.width).toBe('100%');
  });

  it('adds ten percent automatic headroom while respecting an explicit y maximum', () => {
    const chart = {
      id: 'headroom',
      kind: 'bar',
      labels: ['2024'],
      values: [100],
      xLabel: '',
      yLabel: '',
      plotStyle: {}
    };
    const automatic = createScientificChartMarkup(chart, theme);
    const explicit = createScientificChartMarkup(
      { ...chart, plotStyle: { 'y-max': '100' } },
      theme
    );
    const automaticY = Number(
      automatic.match(/data-neopresent-tooltip="2024: 100"[^>]* y="([^"]+)"/)?.[1]
    );
    const explicitY = Number(
      explicit.match(/data-neopresent-tooltip="2024: 100"[^>]* y="([^"]+)"/)?.[1]
    );

    expect(automaticY).toBeGreaterThan(30);
    expect(explicitY).toBe(30);
  });
});

describe('radar charts', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };

  it('trims unused horizontal canvas and keeps the outer block tight', () => {
    const deck = parseMarkdown(`@block-glass on

\`\`\`plot
type: radar
labels: A, B, C
values: 2, 3, 4
chart-padding: 10px 16px
chart-trim: 0 80 0 80
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, Infinity, false);
    const chartNode = vdom.cn.find(
      (child) => child?.tag === 'div' && JSON.stringify(child).includes('aria-label')
    );
    const serialized = JSON.stringify(chartNode);

    expect(chartNode?.style?.width).toBe('min(100%, 685px)');
    expect(chartNode?.style?.padding).toBe('10px 16px');
    expect(serialized).toContain('viewBox=\"80 0 685 500\"');
  });

  it('trims the root wrapper used by polar-function plots', () => {
    const deck = parseMarkdown(`@block-glass on

\`\`\`plot
type: polar-function
title: Five-petal rose
function: 3*cos(5*theta)
theta-min: 0
theta-max: 2*pi
theta-samples: 720
chart-trim: 0 180 0 180
chart-padding: 8px
\`\`\``);
    const vdom = createSlideVdom(deck.children[0], theme, false, false, Infinity, false);
    const chartNode = vdom.cn.find(
      (child) => child?.tag === undefined && typeof child?.html === 'string'
    );

    expect(chartNode?.style?.width).toBe('min(100%, 485px)');
    expect(chartNode?.style?.padding).toBe('8px');
    expect(chartNode?.html).toContain('viewBox="180 0 485 500"');
  });

  it('renders multiple animated polygons with labels, legends, and point tooltips', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'model-comparison',
        kind: 'radar',
        title: 'Model comparison',
        labels: ['Accuracy', 'Speed', 'Stability', 'Coverage'],
        values: [],
        plotStyle: {
          animation: 'draw',
          'animation-duration': '900ms',
          'radar-grid-levels': '4',
          'radar-max': '100',
          'legend-x': '',
          'legend-y': ''
        },
        series: [
          { name: 'Model A', values: [82, 74, 91, 68], color: '#3b82f6', legend: 'true' },
          { name: 'Model B', values: [71, 89, 76, 84], color: '#ef4444', legend: 'true' }
        ]
      },
      theme
    );

    expect(markup).toContain('aria-label="Radar chart"');
    expect(markup.match(/data-neopresent-radar-series=/g)).toHaveLength(2);
    expect(markup.match(/data-neopresent-mark-kind="radar"/g)).toHaveLength(8);
    expect(markup).toContain('data-neopresent-tooltip="Model A · Accuracy: 82"');
    expect(markup).toContain('>Accuracy</text>');
    expect(markup).toContain('>Model B</text>');
    expect(markup).toContain('neopresent-chart-grow 900ms');
    expect(markup).toContain('M 615 67 H 637');
  });
});

describe('extended scientific plot families', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };
  const plots = [
    {
      kind: 'stacked-bar',
      aria: 'Stacked bar chart',
      chart: {
        labels: ['A', 'B'],
        values: [],
        series: [
          { name: 'S1', values: [2, 3] },
          { name: 'S2', values: [1, 2] }
        ]
      }
    },
    {
      kind: 'efficiency',
      aria: 'Efficiency plot',
      chart: { labels: ['A', 'B'], values: [8, 6], plotStyle: { 'efficiency-total': '10,10' } }
    },
    { kind: 'polar', aria: 'Polar plot', chart: { labels: ['A', 'B', 'C'], values: [2, 4, 3] } },
    {
      kind: 'ternary',
      aria: 'Ternary plot',
      chart: { labels: ['P'], xValues: [2], heatmapYValues: [3], values: [5] }
    },
    {
      kind: 'forest',
      aria: 'Forest plot',
      chart: { labels: ['Study'], values: [1.2], errorValues: [0.2] }
    },
    {
      kind: 'ratio',
      aria: 'Ratio panel',
      chart: {
        labels: ['A'],
        values: [],
        series: [
          { name: 'Data', values: [10] },
          { name: 'Model', values: [8] }
        ]
      }
    },
    {
      kind: 'roc',
      aria: 'ROC curve',
      chart: {
        values: [],
        series: [{ name: 'Classifier', xValues: [0, 0.5, 1], values: [0, 0.8, 1] }]
      }
    },
    {
      kind: 'corner',
      aria: 'Corner plot',
      chart: {
        values: [],
        series: [
          { name: 'x', values: [1, 2, 3] },
          { name: 'y', values: [3, 2, 4] }
        ]
      }
    }
  ];

  it.each(plots)('renders $kind as export-safe SVG', ({ kind, aria, chart }) => {
    const markup = createScientificChartMarkup(
      { id: `test-${kind}`, kind, title: '', plotStyle: {}, ...chart },
      theme
    );
    expect(markup).toContain(`aria-label="${aria}"`);
    expect(markup).toContain('<svg');
  });
});

describe('ratio and pull panels', () => {
  const theme = {
    accent: '#187c59',
    background: '#f3fff8',
    border: '#79b998',
    foreground: '#153d31',
    muted: '#527567',
    panel: '#ffffff',
    surface: '#effaf4'
  };

  it('renders scientific axes, category labels, propagated errors, and the unity reference', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'documented-ratio',
        kind: 'ratio',
        labels: ['Bin 1', 'Bin 2', 'Bin 3'],
        values: [],
        xLabel: '',
        yLabel: '',
        plotStyle: { 'ratio-reference': '1' },
        series: [
          { name: 'Data', values: [102, 87, 64], errorValues: [10, 9, 8] },
          { name: 'Model', values: [98, 91, 61] }
        ]
      },
      theme
    );

    expect(markup).toContain('aria-label="Ratio panel"');
    expect(markup).toContain('>Data / Model</text>');
    expect(markup).toContain('>Bin 1</text>');
    expect(markup).toContain('>Bin 2</text>');
    expect(markup).toContain('>Bin 3</text>');
    expect(markup).toContain('data-neopresent-ratio-reference="1"');
    expect(markup.match(/data-neopresent-mark-kind="ratio"/g)).toHaveLength(3);
    expect(markup).toContain('Bin 1: 1.04 ± 0.1');
    expect(markup).toContain('M 105 48 V 398 H 785 V 48 Z');
  });
});

describe('efficiency plots', () => {
  const theme = {
    accent: '#187c59',
    background: '#f3fff8',
    border: '#79b998',
    foreground: '#153d31',
    muted: '#527567',
    panel: '#ffffff',
    surface: '#effaf4'
  };

  it('renders a labelled zero-to-one axis and confidence-aware Wilson intervals', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'selection-efficiency',
        kind: 'efficiency',
        labels: ['Trigger', 'Tracking', 'Selection'],
        values: [920, 810, 640],
        xLabel: '',
        yLabel: '',
        plotStyle: {
          'efficiency-confidence': '95%',
          'efficiency-total': '1000,920,810'
        }
      },
      theme
    );

    expect(markup).toContain('aria-label="Efficiency plot"');
    expect(markup).toContain('>Efficiency</text>');
    expect(markup).toContain('>0</text>');
    expect(markup).toContain('>1</text>');
    expect(markup).toContain('>Trigger</text>');
    expect(markup).toContain('95% Wilson interval');
    expect(markup).toContain('Trigger: 92% (920/1000)');
    expect(markup.match(/data-neopresent-mark-kind="efficiency"/g)).toHaveLength(3);
    expect(markup).toContain('M 105 45 V 395 H 755 V 45 Z');
  });
});

describe('ROC curves', () => {
  const theme = {
    accent: '#187c59',
    background: '#f3fff8',
    border: '#79b998',
    foreground: '#153d31',
    muted: '#527567',
    panel: '#ffffff',
    surface: '#effaf4'
  };

  it('renders axes, points, chance baseline, tooltips, legends, and AUC', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'classifiers',
        kind: 'roc',
        values: [],
        xLabel: '',
        yLabel: '',
        plotStyle: {},
        series: [
          {
            name: 'Classifier A',
            xValues: [0, 0.05, 0.15, 0.35, 1],
            values: [0, 0.55, 0.78, 0.92, 1],
            color: '#3b82f6'
          },
          {
            name: 'Classifier B',
            xValues: [0, 0.08, 0.22, 0.45, 1],
            values: [0, 0.48, 0.71, 0.88, 1],
            color: '#ef4444'
          }
        ]
      },
      theme
    );

    expect(markup).toContain('aria-label="ROC curve"');
    expect(markup).toContain('>False Positive Rate</text>');
    expect(markup).toContain('>True Positive Rate</text>');
    expect(markup).toContain('data-neopresent-roc-chance="true"');
    expect(markup.match(/data-neopresent-mark-kind="roc"/g)).toHaveLength(10);
    expect(markup).toContain('Classifier A · point 2: FPR 0.05, TPR 0.55');
    expect(markup).toContain('Classifier A · AUC');
    expect(markup).toContain('M 105 48 V 398 H 755 V 48 Z');
  });
});

describe('polar plots', () => {
  const theme = {
    accent: '#187c59',
    background: '#f3fff8',
    border: '#79b998',
    foreground: '#153d31',
    muted: '#527567',
    panel: '#ffffff',
    surface: '#effaf4'
  };

  it('renders radial axes, numeric ticks, category labels, points, and tooltips', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'angular-response',
        kind: 'polar',
        labels: ['0°', '60°', '120°', '180°', '240°', '300°'],
        values: [4, 7, 5, 8, 6, 3],
        xLabel: '',
        yLabel: 'Response',
        plotStyle: { 'polar-grid-levels': '5', 'polar-max': '10' }
      },
      theme
    );

    expect(markup).toContain('aria-label="Polar plot"');
    expect(markup.match(/data-neopresent-polar-axis=/g)).toHaveLength(6);
    expect(markup.match(/data-neopresent-polar-tick=/g)).toHaveLength(5);
    expect(markup.match(/data-neopresent-polar-label=/g)).toHaveLength(6);
    expect(markup.match(/data-neopresent-mark-kind="polar"/g)).toHaveLength(6);
    expect(markup).toContain('>0°</text>');
    expect(markup).toContain('>300°</text>');
    expect(markup).toContain('>10</text>');
    expect(markup).toContain('>Response</text>');
    expect(markup).toContain('data-neopresent-tooltip="60°: 7"');
  });
});

describe('scientific plot axis completeness', () => {
  const theme = {
    accent: '#187c59',
    background: '#f3fff8',
    border: '#79b998',
    foreground: '#153d31',
    muted: '#527567',
    panel: '#ffffff',
    surface: '#effaf4'
  };

  it('gives stacked bars a numeric axis, grid, category labels, title, and legend', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'stacked',
        kind: 'stacked-bar',
        labels: ['2022', '2023', '2024'],
        values: [],
        xLabel: '',
        yLabel: 'Events',
        plotStyle: {},
        series: [
          { name: 'Signal', values: [42, 58, 71], color: '#3b82f6' },
          { name: 'Background', values: [31, 27, 22], color: '#ef4444' }
        ]
      },
      theme
    );
    expect(markup).toContain('>Events</text>');
    expect(markup).toContain('>2022</text>');
    expect(markup).toContain('>Signal</text>');
    expect(markup).toContain('stroke-dasharray="4 6"');
    expect(markup).toContain('M 95 45 V 405 H 745 V 45 Z');
  });

  it('gives ternary plots composition grids, percentage ticks, and three axis labels', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'ternary',
        kind: 'ternary',
        labels: ['Sample'],
        xValues: [20],
        heatmapYValues: [30],
        values: [50],
        plotStyle: {
          'ternary-a-label': 'Solid',
          'ternary-b-label': 'Liquid',
          'ternary-c-label': 'Gas',
          'ternary-grid-levels': '5',
          animation: 'grow',
          'animation-duration': '900ms'
        }
      },
      theme
    );
    expect(markup.match(/data-neopresent-ternary-grid=/g)).toHaveLength(4);
    expect(markup.match(/data-neopresent-ternary-label=/g)).toHaveLength(3);
    expect(markup).toContain('>20%</text>');
    expect(markup).toContain('>Solid</text>');
    expect(markup).toContain('Sample: 20% A, 30% B, 50% C');
    expect(markup).toContain('neopresent-chart-grow 900ms');
  });

  it('draws the ternary frame when draw animation is requested', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'ternary-draw',
        kind: 'ternary',
        labels: ['P'],
        xValues: [2],
        heatmapYValues: [3],
        values: [5],
        plotStyle: { animation: 'draw', 'animation-duration': '1s' }
      },
      theme
    );
    expect(markup).toContain('neopresent-chart-draw 1s');
    expect(markup).toContain('pathLength="1"');
  });

  it('gives forest plots complete axes, close axis titles, study labels, and interval tooltips', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'forest',
        kind: 'forest',
        labels: ['Study A', 'Study B'],
        values: [1.2, 0.85],
        errorValues: [0.2, 0.12],
        xLabel: '',
        plotStyle: { 'forest-zero': '1' }
      },
      theme
    );
    expect(markup).toContain('>Estimate</text>');
    expect(markup).toContain('>Study</text>');
    expect(markup).toContain('data-neopresent-forest-y-axis="true"');
    expect(markup).toContain('data-neopresent-forest-y-tick="0"');
    expect(markup).toContain('data-neopresent-forest-x-label="true"');
    expect(markup).toContain('>Study A</text>');
    expect(markup).toContain('data-neopresent-forest-reference="1"');
    expect(markup).toContain('Study A: 1.2 [1, 1.4]');
  });

  it('gives corner plots framed cells, row and column labels, endpoint ticks, and tooltips', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'corner',
        kind: 'corner',
        values: [],
        plotStyle: {},
        series: [
          { name: 'Mass', values: [3.08, 3.11, 3.09] },
          { name: 'Width', values: [0.08, 0.07, 0.09] },
          { name: 'Yield', values: [92, 105, 98] }
        ]
      },
      theme
    );
    expect(markup.match(/data-neopresent-corner-cell=/g)).toHaveLength(6);
    expect(markup.match(/data-neopresent-corner-column=/g)).toHaveLength(3);
    expect(markup.match(/data-neopresent-corner-row=/g)).toHaveLength(3);
    expect(markup).toContain('data-neopresent-mark-kind="corner-point"');
    expect(markup).toContain('Mass: 3.08; Width: 0.08');
    const massMaximum = Number(
      markup.match(
        /data-neopresent-corner-cell="0,0"[^>]*data-neopresent-corner-x-max="([^"]+)"/
      )?.[1]
    );
    const widthMaximum = Number(
      markup.match(
        /data-neopresent-corner-cell="1,0"[^>]*data-neopresent-corner-y-max="([^"]+)"/
      )?.[1]
    );
    expect(massMaximum).toBeCloseTo(3.11 * 1.1);
    expect(widthMaximum).toBeCloseTo(0.09 * 1.1);
    const histogramXMaximum = Number(
      markup.match(
        /data-neopresent-mark-kind="corner-histogram"[^>]*data-neopresent-corner-histogram-x-max="([^"]+)"/
      )?.[1]
    );
    const histogramYMaximum = Number(
      markup.match(
        /data-neopresent-mark-kind="corner-histogram"[^>]*data-neopresent-corner-histogram-y-max="([^"]+)"/
      )?.[1]
    );
    expect(histogramXMaximum).toBeCloseTo(3.11 * 1.1);
    expect(histogramYMaximum).toBeCloseTo(2.2);
  });
});

describe('scalar field plots', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };

  it('renders contour fills, isolines, complete numeric axes, a color scale, and tooltips', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'contour-complete',
        kind: 'contour',
        values: [0, 1, 0, 1, 3, 1, 0, 1, 0],
        xValues: [0, 1, 2],
        heatmapYValues: [0, 1, 2],
        xLabel: 'Mass',
        yLabel: 'Width',
        plotStyle: { 'contour-levels': '5', 'heatmap-color-label': 'Likelihood' }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-field-axes="true"');
    expect(markup).toContain('data-neopresent-field-colorbar="true"');
    expect(markup).toContain('data-neopresent-contour-level=');
    expect(markup).toContain('data-neopresent-mark-kind="contour-cell"');
    expect(markup).toContain('x: 1; y: 1; value: 3');
    expect(markup).toContain('>Likelihood</text>');
  });

  it('renders 2D density with numeric axes, a density scale, and hover values', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'density-complete',
        kind: 'density2d',
        values: [0, 0.2, 0.8, 1],
        xValues: [0, 0.25, 0.75, 1],
        xLabel: 'x',
        yLabel: 'y',
        plotStyle: { 'density-grid-size': '12' }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-field-axes="true"');
    expect(markup).toContain('data-neopresent-field-x-tick=');
    expect(markup).toContain('data-neopresent-field-y-tick=');
    expect(markup).toContain('data-neopresent-field-colorbar="true"');
    expect(markup).toContain('data-neopresent-mark-kind="density2d-cell"');
    expect(markup).toContain('>Density</text>');
    expect(markup).toContain('data-neopresent-field-x-tick="0.2"');
    const firstDensityCellY = Number(
      markup.match(/data-neopresent-density-row="0"[^>]* y="([^"]+)"/)?.[1]
    );
    expect(firstDensityCellY).toBeGreaterThan(300);
    expect(markup).toContain('x:');
    expect(markup).toContain('; y:');
  });
});

describe('extended statistical, flow, temporal, and geographic plots', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };
  const cases = [
    ['qq', { values: [1, 2, 2.5, 4] }, 'data-neopresent-mark-kind="qq"'],
    ['ecdf', { values: [3, 1, 2] }, 'data-neopresent-mark-kind="ecdf"'],
    [
      'precision-recall',
      { values: [], series: [{ name: 'A', xValues: [0, 0.5, 1], values: [1, 0.8, 0.3] }] },
      'data-neopresent-pr-series="0"'
    ],
    [
      'volcano',
      { xValues: [-2, 0, 2], values: [3, 0.2, 4], labels: ['A', 'B', 'C'] },
      'data-neopresent-mark-kind="volcano"'
    ],
    [
      'waterfall',
      { values: [10, -3, 5], labels: ['Start', 'Loss', 'Gain'] },
      'data-neopresent-mark-kind="waterfall"'
    ],
    [
      'sankey',
      { values: [], series: [{ name: 'Input -> Selected', values: [80] }] },
      'data-neopresent-mark-kind="sankey-link"'
    ],
    [
      'time-series',
      {
        values: [2, 3, 2.5],
        errorValues: [0.2, 0.3, 0.2],
        labels: ['2026-01', '2026-02', '2026-03']
      },
      'data-neopresent-mark-kind="time-series"'
    ],
    [
      'geographic',
      {
        xValues: [-87.6, 2.35],
        values: [41.8, 48.9],
        labels: ['Chicago', 'Paris'],
        series: [{ name: 'Test region', xValues: [-10, 10, 0], values: [40, 40, 55] }]
      },
      'data-neopresent-mark-kind="geographic-point"'
    ]
  ];

  it.each(cases)('renders %s with its semantic marks', (kind, fields, marker) => {
    const markup = createScientificChartMarkup(
      { id: `new-${kind}`, kind, title: '', plotStyle: {}, ...fields },
      theme
    );
    expect(markup).toContain(marker);
    expect(markup).toContain('<svg');
  });

  it('renders the survival complement as a descending step curve', () => {
    const markup = createScientificChartMarkup(
      { id: 'survival', kind: 'ecdf', values: [1, 2, 3], plotStyle: { 'ecdf-complement': 'true' } },
      theme
    );
    expect(markup).toContain('aria-label="Survival curve"');
    expect(markup).toContain('data-neopresent-mark-kind="survival"');
    expect(markup).toContain('data-neopresent-hover-target="true"');
    expect(markup).toContain('data-neopresent-mark-kind="survival-segment"');
    expect(markup).toContain('stroke-width="16" pointer-events="stroke"');
    expect(markup).toContain('fill-opacity="0.001"');
  });

  it('uses Kaplan-Meier event status and marks censored observations', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'kaplan-meier',
        kind: 'ecdf',
        values: [2, 4, 7],
        plotStyle: { 'ecdf-complement': 'true', 'survival-events': '1,0,1' }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-mark-kind="survival-censored"');
    expect(markup).toContain('Censored · 4; survival 0.67');
  });

  it('renders a Greenwood confidence band for Kaplan-Meier estimates', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'kaplan-meier-confidence',
        kind: 'ecdf',
        values: [2, 4, 7, 9, 12],
        plotStyle: {
          'ecdf-complement': 'true',
          'survival-events': '1,0,1,0,1',
          'survival-confidence': 'true',
          'survival-confidence-level': '95',
          'survival-confidence-color': '#f59e0b',
          'survival-confidence-alpha': '.25'
        }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-mark-kind="survival-confidence"');
    expect(markup).toContain('fill="#f59e0b" opacity="0.25"');
    expect(markup).not.toContain('NaN');
  });

  it('shows ECDF point markers only when explicitly requested', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'ecdf-points',
        kind: 'ecdf',
        values: [1, 2],
        plotStyle: { 'ecdf-points': 'true', 'ecdf-point-size': '4' }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-mark-kind="ecdf-point"');
    expect(markup).toContain('r="4" fill="#38bdf8"');
  });

  it('renders time-series uncertainty bands and supplied geographic regions', () => {
    const timeMarkup = createScientificChartMarkup(
      {
        id: 'time-band',
        kind: 'time-series',
        values: [2, 3],
        errorValues: [0.2, 0.3],
        labels: ['A', 'B'],
        plotStyle: {}
      },
      theme
    );
    const geoMarkup = createScientificChartMarkup(
      {
        id: 'geo-region',
        kind: 'geographic',
        values: [],
        plotStyle: {},
        series: [{ name: 'Region', xValues: [-10, 10, 0], values: [40, 40, 55] }]
      },
      theme
    );
    expect(timeMarkup).toContain('data-neopresent-mark-kind="time-series-band"');
    expect(geoMarkup).toContain('data-neopresent-mark-kind="geographic-region"');
  });

  it('renders quantitative geographic regions with a color scale', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'geo-choropleth',
        kind: 'geographic',
        values: [],
        plotStyle: {
          'geo-palette': 'kViridis',
          'geo-color-label': 'Event rate',
          'geo-colorbar-x': '650',
          'geo-colorbar-y': '250',
          'geo-colorbar-width': '20',
          'geo-colorbar-height': '120'
        },
        series: [
          { name: 'Low', geoValue: 10, xValues: [-10, 0, -5], values: [40, 40, 50] },
          { name: 'High', geoValue: 30, xValues: [0, 10, 5], values: [40, 40, 50] }
        ]
      },
      theme
    );
    expect(markup).toContain('data-neopresent-geographic-colorbar="true"');
    expect(markup).toContain('x="650" y="250" width="20" height="120"');
    expect(markup).toContain('Event rate');
    expect(markup).toContain('Low: 10');
    expect(markup).toContain('High: 30');
  });

  it('positions specialized legends using presets, offsets, and coordinates', () => {
    const preset = createScientificChartMarkup(
      {
        id: 'geo-legend-position',
        kind: 'geographic',
        values: [],
        plotStyle: {
          legend: 'true',
          'legend-position': 'bottom-left',
          'legend-offset-x': '12',
          'legend-offset-y': '-8'
        },
        series: [{ name: 'Region', xValues: [-10, 10, 0], values: [40, 40, 55] }]
      },
      theme
    );
    expect(preset).toContain('M 117 407 H 139');

    const precise = createScientificChartMarkup(
      {
        id: 'geo-legend-coordinates',
        kind: 'geographic',
        values: [],
        plotStyle: {
          legend: 'true',
          'legend-x': '.2',
          'legend-y': '.3',
          'legend-columns': '2',
          'legend-font': 'Georgia'
        },
        series: [
          { name: 'Region A', xValues: [-10, 10, 0], values: [40, 40, 55] },
          { name: 'Region B', xValues: [20, 30, 25], values: [30, 30, 40] }
        ]
      },
      theme
    );
    expect(precise).toContain('M 169 145 H 191');
    expect(precise).toContain('M 379 145 H 401');
    expect(precise).toContain('font-family="Georgia"');
  });

  it('applies shared axis-title offsets to specialized Cartesian plots', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'geo-axis-label-offsets',
        kind: 'geographic',
        values: [41.8],
        xValues: [-87.6],
        labels: ['Site'],
        plotStyle: {
          'x-label-offset-x': '20',
          'x-label-offset-y': '-12',
          'y-label-offset-x': '14',
          'y-label-offset-y': '18'
        }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-cartesian-x-label="true" x="452" y="466"');
    expect(markup).toContain('data-neopresent-cartesian-y-label="true" x="38" y="241"');
    expect(markup).toContain('transform="rotate(-90 38 241)"');
  });

  it('applies specialized title and complete axis-title styling', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'styled-special-labels',
        kind: 'geographic',
        title: 'Styled map',
        values: [41.8],
        xValues: [-87.6],
        labels: ['Site'],
        plotStyle: {
          'title-color': '#ef4444',
          'title-size': '30',
          'title-offset-x': '12',
          'title-offset-y': '7',
          'x-label-color': '#3b82f6',
          'x-label-size': '24',
          'x-label-alpha': '.7',
          'y-label-color': '#22c55e',
          'y-label-size': '26'
        }
      },
      theme
    );
    expect(markup).toContain(
      'data-neopresent-special-title="true" x="434.5" y="35" fill="#ef4444"'
    );
    expect(markup).toContain('font-size="30" font-weight="700"');
    expect(markup).toContain('fill="#3b82f6" fill-opacity="0.7"');
    expect(markup).toContain('fill="#22c55e" fill-opacity="1"');
  });

  it('applies axis-title and color-bar controls to scalar fields', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'styled-contour-controls',
        kind: 'contour',
        title: 'Scan',
        xLabel: 'Mass',
        yLabel: 'Width',
        xValues: [0, 1],
        values: [1, 2, 3, 4],
        heatmapYValues: [0, 1],
        plotStyle: {
          'x-label-offset-x': '10',
          'x-label-offset-y': '-8',
          'x-label-color': '#3b82f6',
          'y-label-offset-x': '12',
          'y-label-color': '#22c55e',
          'heatmap-colorbar-width': '24',
          'heatmap-colorbar-height': '260',
          'heatmap-colorbar-offset-x': '-20',
          'heatmap-colorbar-offset-y': '14'
        }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-field-x-label="true" x="352" y="410"');
    expect(markup).toContain('data-neopresent-field-y-label="true" x="34" y="193"');
    expect(markup).toContain(
      'data-neopresent-field-colorbar="true" x="605" y="42" width="24" height="260"'
    );
  });

  it('breaks external time-series lines at missing measurements', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'time-gaps',
        kind: 'time-series',
        values: [10, 0, 12, 13],
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        errorValues: [],
        plotStyle: { 'time-missing': '1' }
      },
      theme
    );
    expect(markup.match(/data-neopresent-mark-kind="time-series"/g)).toHaveLength(2);
    expect(markup).not.toContain('Feb: 0');
  });

  it('renders explicit and automatically appended waterfall totals', () => {
    const explicit = createScientificChartMarkup(
      {
        id: 'waterfall-explicit-total',
        kind: 'waterfall',
        values: [100, 12, -18, 94],
        labels: ['Baseline', 'Calibration', 'Selection', 'Final'],
        plotStyle: { 'waterfall-total-indices': '0,3' }
      },
      theme
    );
    expect(explicit.match(/data-neopresent-mark-kind="waterfall-total"/g)).toHaveLength(2);
    expect(explicit).toContain('Final: total 94');

    const automatic = createScientificChartMarkup(
      {
        id: 'waterfall-auto-total',
        kind: 'waterfall',
        values: [100, 12, -18],
        labels: ['Baseline', 'Calibration', 'Selection'],
        plotStyle: { 'waterfall-total': 'true' }
      },
      theme
    );
    expect(automatic).toContain('Total: total 94');
  });

  it('uses category and date labels without duplicate numeric x ticks', () => {
    const waterfall = createScientificChartMarkup(
      {
        id: 'waterfall-categories',
        kind: 'waterfall',
        values: [10, -2],
        labels: ['Baseline', 'Selection'],
        plotStyle: {}
      },
      theme
    );
    const timeSeries = createScientificChartMarkup(
      {
        id: 'time-categories',
        kind: 'time-series',
        values: [2, 3],
        labels: ['2026-01', '2026-02'],
        plotStyle: {}
      },
      theme
    );
    expect(waterfall).not.toContain('data-neopresent-cartesian-x-tick=');
    expect(timeSeries).not.toContain('data-neopresent-cartesian-x-tick=');
    expect(waterfall).toContain('>Baseline</text>');
    expect(timeSeries).toContain('>2026-01</text>');
  });

  it('uses complete frames and interactive tooltips across the new mark families', () => {
    const charts = [
      { kind: 'ecdf', values: [1, 2, 3], marker: 'ecdf-point' },
      {
        kind: 'precision-recall',
        values: [],
        series: [{ name: 'A', xValues: [0, 1], values: [1, 0.4] }],
        marker: 'precision-recall-point'
      },
      { kind: 'waterfall', values: [10, -2], labels: ['Start', 'Loss'], marker: 'waterfall' },
      { kind: 'time-series', values: [2, 3], labels: ['A', 'B'], marker: 'time-series-point' },
      {
        kind: 'geographic',
        xValues: [-87],
        values: [42],
        labels: ['Site'],
        marker: 'geographic-point'
      }
    ];
    for (const chart of charts) {
      const markup = createScientificChartMarkup(
        { id: `tooltip-${chart.kind}`, title: '', plotStyle: {}, ...chart },
        theme
      );
      expect(markup).toContain('data-neopresent-cartesian-frame="true"');
      expect(markup).toContain(`data-neopresent-mark-kind="${chart.marker}"`);
      expect(markup).toContain('data-neopresent-tooltip=');
    }
    const sankey = createScientificChartMarkup(
      {
        id: 'tooltip-sankey',
        kind: 'sankey',
        title: '',
        values: [],
        plotStyle: {},
        series: [{ name: 'A -> B', values: [5] }]
      },
      theme
    );
    expect(sankey).toContain('data-neopresent-mark-kind="sankey-link" data-neopresent-tooltip=');
  });

  it('renders delimited math consistently in special-plot titles and axis labels', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'math-volcano',
        kind: 'volcano',
        title: 'Test $H_0$',
        xValues: [-1, 1],
        values: [2, 3],
        xLabel: '$\\log_2$ fold change',
        yLabel: '$-\\log_{10}(p)$',
        plotStyle: {}
      },
      theme
    );
    expect(markup).not.toContain('$');
    expect(markup).toContain('Test H<tspan baseline-shift="sub" font-size="70%">0</tspan>');
    expect(markup).toContain(
      'log<tspan baseline-shift="sub" font-size="70%">2</tspan> fold change'
    );
    expect(markup).toContain('-log<tspan baseline-shift="sub" font-size="70%">10</tspan>(p)');
  });

  it.each([
    ['qq', { values: [1, 2] }],
    ['ecdf', { values: [1, 2] }],
    [
      'precision-recall',
      { values: [], series: [{ name: 'A', xValues: [0, 1], values: [1, 0.5] }] }
    ],
    ['waterfall', { values: [1], labels: ['A'] }],
    ['time-series', { values: [1, 2], labels: ['A', 'B'] }],
    ['geographic', { xValues: [0], values: [0] }]
  ])('supports math titles and labels for %s', (kind, fields) => {
    const markup = createScientificChartMarkup(
      {
        id: `math-${kind}`,
        kind,
        title: '$\\alpha_1$',
        xLabel: '$x_0$',
        yLabel: '$y^2$',
        plotStyle: {},
        ...fields
      },
      theme
    );
    expect(markup).not.toContain('$');
    expect(markup).toContain('α<tspan baseline-shift="sub" font-size="70%">1</tspan>');
    expect(markup).toContain('x<tspan baseline-shift="sub" font-size="70%">0</tspan>');
    expect(markup).toContain('y<tspan baseline-shift="super" font-size="70%">2</tspan>');
  });

  it('provides semantic legends and configurable volcano labels', () => {
    const volcano = createScientificChartMarkup(
      {
        id: 'volcano-legend',
        kind: 'volcano',
        xValues: [-2, 0, 2],
        values: [3, 0.2, 4],
        labels: ['Down gene', 'Neutral gene', 'Up gene'],
        plotStyle: { 'volcano-labels': 'true' }
      },
      theme
    );
    expect(volcano).toContain('data-neopresent-special-legend="true"');
    expect(volcano).toContain('>Decreased</text>');
    expect(volcano).toContain('>Not significant</text>');
    expect(volcano).toContain('>Increased</text>');
    expect(volcano).toContain('>Down gene</text>');
    expect(volcano).toContain('>Up gene</text>');
    expect(volcano).not.toContain('>Neutral gene</text>');
  });

  it('adds legends to multi-series and explicitly requested single-series plots', () => {
    const precisionRecall = createScientificChartMarkup(
      {
        id: 'pr-legend',
        kind: 'precision-recall',
        values: [],
        plotStyle: {},
        series: [
          { name: 'Classifier A', xValues: [0, 1], values: [1, 0.4] },
          { name: 'Classifier B', xValues: [0, 1], values: [0.9, 0.3] }
        ]
      },
      theme
    );
    const waterfall = createScientificChartMarkup(
      {
        id: 'waterfall-legend',
        kind: 'waterfall',
        values: [2, -1],
        labels: ['A', 'B'],
        plotStyle: { legend: 'true' }
      },
      theme
    );
    const ecdf = createScientificChartMarkup(
      {
        id: 'ecdf-legend',
        kind: 'ecdf',
        values: [1, 2],
        plotStyle: { legend: 'true', 'legend-labels': 'Observed sample' }
      },
      theme
    );
    expect(precisionRecall).toContain('>Classifier A</text>');
    expect(precisionRecall).toContain('>Classifier B</text>');
    expect(waterfall).toContain('>Increase</text>');
    expect(waterfall).toContain('>Decrease</text>');
    expect(ecdf).toContain('>Observed sample</text>');
  });
});

describe('special plot animation coverage', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };
  const cases = [
    ['qq', { values: [1, 2, 3] }],
    ['ecdf', { values: [1, 2, 3] }],
    [
      'precision-recall',
      { values: [], series: [{ name: 'A', xValues: [0, 1], values: [1, 0.4] }] }
    ],
    ['volcano', { xValues: [-2, 2], values: [3, 4], labels: ['A', 'B'] }],
    ['waterfall', { values: [10, -2], labels: ['A', 'B'] }],
    ['sankey', { values: [], series: [{ name: 'A -> B', values: [5] }] }],
    ['time-series', { values: [2, 3], labels: ['A', 'B'] }],
    ['geographic', { xValues: [0], values: [0], labels: ['Site'] }],
    ['stacked-bar', { values: [], labels: ['A'], series: [{ name: 'S', values: [2] }] }],
    ['ternary', { xValues: [2], heatmapYValues: [3], values: [5], labels: ['P'] }],
    ['forest', { values: [1], errorValues: [0.1], labels: ['Study'] }],
    [
      'corner',
      {
        values: [],
        series: [
          { name: 'x', values: [1, 2] },
          { name: 'y', values: [2, 3] }
        ]
      }
    ],
    ['polar', { values: [2, 3], labels: ['A', 'B'] }],
    ['roc', { values: [], series: [{ name: 'A', xValues: [0, 1], values: [0, 1] }] }],
    ['efficiency', { values: [8], labels: ['A'], plotStyle: { 'efficiency-total': '10' } }]
  ];

  it.each(cases)('gives %s an observable draw animation', (kind, fields) => {
    const markup = createScientificChartMarkup(
      {
        id: `animation-${kind}`,
        kind,
        title: '',
        ...fields,
        plotStyle: { ...(fields.plotStyle ?? {}), animation: 'draw', 'animation-duration': '900ms' }
      },
      theme
    );
    expect(markup).toContain('data-neopresent-special-animation="draw"');
    expect(markup).toContain('neopresent-chart-reveal-x 900ms');
  });

  it.each(cases)('applies plot-width and plot-height to %s', (kind, fields) => {
    const markup = createScientificChartMarkup(
      {
        id: `dimensions-${kind}`,
        kind,
        title: '',
        ...fields,
        plotStyle: {
          ...(fields.plotStyle ?? {}),
          'plot-width': '610',
          'plot-height': '360'
        }
      },
      theme
    );
    expect(markup).toContain('width:min(100%, 610px)!important');
    expect(markup).toContain('height:360px!important');
  });

  it.each([
    ['pie', { values: [2, 3], labels: ['A', 'B'] }],
    ['radar', { values: [2, 3, 4], labels: ['A', 'B', 'C'] }],
    [
      'polar-function',
      {
        xValues: [1, 0, -1],
        values: [0, 1, 0],
        plotStyle: {
          'polar-theta-values': `0,${Math.PI / 2},${Math.PI}`,
          'polar-radius-values': '1,1,1'
        }
      }
    ],
    [
      'ratio',
      {
        labels: ['A', 'B'],
        series: [
          { name: 'Data', values: [4, 6] },
          { name: 'Model', values: [5, 5] }
        ]
      }
    ],
    ['contour', { xValues: [0, 1, 0, 1], heatmapYValues: [0, 0, 1, 1], values: [0, 1, 1, 0] }],
    [
      'surface',
      {
        xValues: [0, 1, 0, 1],
        heatmapYValues: [0, 0, 1, 1],
        values: [0, 1, 1, 2]
      }
    ]
  ])('applies shared dimensions to the %s renderer family', (kind, fields) => {
    const markup = createScientificChartMarkup(
      {
        id: `renderer-dimensions-${kind}`,
        kind,
        title: '',
        ...fields,
        plotStyle: {
          ...(fields.plotStyle ?? {}),
          'plot-width': '620px',
          'plot-height': '370px'
        }
      },
      theme
    );
    expect(markup).toContain('width:min(100%, 620px)!important');
    expect(markup).toContain('height:370px!important');
  });

  it('maps radar draw requests to an observable series growth animation', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'animation-radar',
        kind: 'radar',
        title: '',
        values: [],
        labels: ['A', 'B', 'C'],
        series: [{ name: 'S', values: [2, 3, 4] }],
        plotStyle: { animation: 'draw', 'animation-duration': '900ms' }
      },
      theme
    );
    expect(markup).toContain('neopresent-chart-grow 900ms');
  });

  it.each([
    ['contour', { xValues: [0, 1], heatmapYValues: [0, 1], values: [0, 1, 1, 0] }],
    ['density2d', { xValues: [0, 1], values: [0, 1] }]
  ])('gives %s scalar fields an observable draw animation', (kind, fields) => {
    const markup = createScientificChartMarkup(
      {
        id: `animation-${kind}`,
        kind,
        title: '',
        plotStyle: { animation: 'draw', 'animation-duration': '900ms' },
        ...fields
      },
      theme
    );
    expect(markup).toContain('data-neopresent-special-animation="draw"');
    expect(markup).toContain('neopresent-chart-reveal-x 900ms');
  });
});

describe('special plots in nested slide layouts', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#ffffff',
    border: '#cbd5e1',
    foreground: '#0f172a',
    muted: '#64748b',
    panel: '#f8fafc',
    surface: '#f1f5f9'
  };

  it('renders specialized plots inside columns, groups, and grids', () => {
    const deck = parseMarkdown(`::columns widths: 1fr, 1fr
::column
\`\`\`plot
type: pie
labels: A, B
values: 2, 3
plot-width: 100%
plot-height: 240px
\`\`\`
::column
\`\`\`plot
type: radar
labels: A, B, C
values: 2, 3, 4
plot-width: 100%
plot-height: 240px
\`\`\`
::end

---

::group
\`\`\`plot
type: volcano
x: -2, 0, 2
values: 4, 1, 5
plot-width: 620px
plot-height: 320px
\`\`\`
::end

---

::grid 2
::cell
\`\`\`plot
type: waterfall
labels: Start, Change
values: 10, -2
plot-width: 100%
plot-height: 240px
\`\`\`
::cell
\`\`\`plot
type: polar
labels: A, B, C
values: 2, 3, 4
plot-width: 100%
plot-height: 240px
\`\`\`
::end`);

    const columnMarkup = JSON.stringify(
      createSlideVdom(deck.children[0], theme, false, false, Infinity, false)
    );
    const groupMarkup = JSON.stringify(
      createSlideVdom(deck.children[1], theme, false, false, Infinity, false)
    );
    const gridMarkup = JSON.stringify(
      createSlideVdom(deck.children[2], theme, false, false, Infinity, false)
    );

    expect(columnMarkup).toContain('data-neopresent-mark-kind=\\"pie\\"');
    expect(columnMarkup).toContain('data-neopresent-radar-series');
    expect(columnMarkup).toContain('width:min(100%, 100%)!important');
    expect(columnMarkup).toContain('height:240px!important');
    expect(groupMarkup).toContain('data-neopresent-mark-kind=\\"volcano\\"');
    expect(groupMarkup).toContain('width:min(100%, 620px)!important');
    expect(gridMarkup).toContain('data-neopresent-mark-kind=\\"waterfall\\"');
    expect(gridMarkup).toContain('data-neopresent-mark-kind=\\"polar\\"');
    expect(`${columnMarkup}${groupMarkup}${gridMarkup}`).not.toContain(
      'NeoPresent could not reload'
    );
  });
});

describe('heatmap labels', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };

  it('uses configured tick labels in cell tooltips', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'labelled-heatmap',
        kind: 'heatmap',
        values: [0.75],
        xValues: [10],
        heatmapYValues: [20],
        plotStyle: { 'heatmap-x-labels': 'Electron', 'heatmap-y-labels': 'Muon' },
        xLabel: '',
        yLabel: ''
      },
      theme
    );

    expect(markup).toContain('data-neopresent-tooltip="x=Electron; y=Muon; value=0.75"');
  });

  it('renders LaTeX axis, tick, and color-bar labels through KaTeX', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'math-heatmap',
        kind: 'heatmap',
        values: [0.5],
        xValues: [1],
        heatmapYValues: [2],
        plotStyle: {
          'heatmap-x-labels': 'Particle $\\alpha$',
          'heatmap-y-labels': '$\\beta$',
          'heatmap-color-label': '$\\rho_{ij}$',
          'heatmap-min-label': '$-\\infty$',
          'heatmap-max-label': '$+\\infty$'
        },
        xLabel: '$p_T$',
        yLabel: '$\\eta$'
      },
      theme
    );

    expect(markup).toContain('Particle <span data-katex-source="\\alpha"');
    for (const source of [
      '\\alpha',
      '\\beta',
      '\\rho_{ij}',
      '-\\infty',
      '+\\infty',
      'p_T',
      '\\eta'
    ]) {
      expect(markup).toContain(`data-katex-source="${source}"`);
    }
  });
});

describe('3D surface plots', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#020617',
    border: '#334155',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    panel: '#0f172a',
    surface: '#1e293b'
  };

  it('renders a palette-colored mesh with interactive faces', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'surface-demo',
        kind: 'surface',
        values: [0, 1, 1, 2],
        xValues: [0, 1, 0, 1],
        heatmapYValues: [0, 0, 1, 1],
        plotStyle: {
          'surface-palette': 'plasma',
          'surface-background': '#f8fafc',
          'surface-z-label': '$z$',
          'surface-azimuth': '60',
          'surface-elevation': '35'
        },
        xLabel: '$x$',
        yLabel: '$y$'
      },
      {
        accent: '#38bdf8',
        background: '#020617',
        border: '#334155',
        foreground: '#f8fafc',
        muted: '#94a3b8',
        panel: '#0f172a',
        surface: '#1e293b'
      }
    );

    expect(markup).toContain('<polygon');
    expect(markup).toContain('data-neopresent-surface="true"');
    expect(markup).toContain('data-surface-id="surface-demo"');
    expect(markup).toContain('data-surface-azimuth="60"');
    expect(markup).toContain(
      'data-neopresent-surface-background="true" width="100%" height="100%" fill="#f8fafc"'
    );
    expect(markup).toContain('data-neopresent-surface-vertices=');
    expect(markup).toContain('data-neopresent-surface-edge=');
    expect(markup).toContain('data-neopresent-tooltip="x=0–1; y=0–1; value=1"');
    expect(markup).toContain('neopresent-surface-scale-surface-demo');
    expect(markup).toContain('data-katex-source="z"');
  });

  it('renders transformed structured surface grids', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'spherical-demo',
        kind: 'surface',
        values: [1, 1, 1, 1, 1, 1],
        xValues: [0, 1, 2, 0, 1, 2],
        heatmapYValues: [0, 0, 0, 1, 1, 1],
        surfaceGridShape: { columns: 3, rows: 2 },
        surfaceCoordinateSystem: 'spherical',
        plotStyle: {}
      },
      theme
    );

    expect(markup).toContain('data-neopresent-surface="true"');
    expect(markup.match(/<polygon/g)).toHaveLength(2);
    expect(markup).not.toContain('NaN');
  });
});

describe('polar function plots', () => {
  const theme = {
    accent: '#38bdf8',
    background: '#ffffff',
    border: '#cbd5e1',
    foreground: '#0f172a',
    muted: '#64748b',
    panel: '#f8fafc',
    surface: '#f1f5f9'
  };

  it('renders a sampled radial function with grid and hover targets', () => {
    const markup = createScientificChartMarkup(
      {
        id: 'polar-function-demo',
        kind: 'polar-function',
        title: 'Rose curve',
        values: [0, 1, 0, -1, 0],
        xValues: [1, 0, -1, 0, 1],
        plotStyle: {
          'polar-radius-values': '1,1,1,1,1',
          'polar-theta-values': `0,${Math.PI / 2},${Math.PI},${(3 * Math.PI) / 2},${2 * Math.PI}`
        }
      },
      theme
    );

    expect(markup).toContain('data-neopresent-mark-kind="polar-function"');
    expect(markup).toContain('<path d="M 422 255 L');
    expect(markup.match(/data-neopresent-mark-kind="polar-function-point"/g)).toHaveLength(5);
    expect(markup).toContain('Rose curve');
  });
});

describe('staged scientific diagrams', () => {
  it('renders the selected Standard Model highlight as a static export state', () => {
    const markup = createScientificChartMarkup(
      {
        activeRevealIndex: 1,
        diagramHighlights: [
          { target: 'generation-I', stage: 1, 'dim-alpha': 0.5, effect: 'glow' },
          { target: 'generation-II', stage: 2, 'dim-alpha': 0.5, effect: 'glow' }
        ],
        id: 'standard-model-export',
        kind: 'standard-model',
        plotStyle: { 'animation-trigger': 'reveal', 'reveal-stages': 2 },
        revealAnimate: false,
        title: ''
      },
      {
        accent: '#38bdf8',
        background: '#ffffff',
        border: '#cbd5e1',
        foreground: '#0f172a',
        muted: '#64748b',
        panel: '#f8fafc',
        surface: '#f1f5f9'
      }
    );

    expect(markup).toContain('filter:drop-shadow(0 0 9px');
    expect(markup).toContain('opacity:0.5');
    expect(markup).not.toContain('animation:neopresent-plot-glow');
  });

  it('keeps live stages but collapses an opted-out block in export snapshots', () => {
    const deck = parseMarkdown(`# test
@reveal
\`\`\`plot
type: standard-model
animation-trigger: reveal
reveal-stages: 2
export-stages: false
diagram-highlight: generation-I | stage: 1 | dim-alpha: 0.5
diagram-highlight: generation-II | stage: 2 | dim-alpha: 0.5
\`\`\``);
    const theme = {
      accent: '#38bdf8',
      background: '#ffffff',
      border: '#cbd5e1',
      foreground: '#0f172a',
      muted: '#64748b',
      panel: '#f8fafc',
      surface: '#f1f5f9'
    };
    const slide = deck.children[0];
    const liveStage = JSON.stringify(createSlideVdom(slide, theme, false, false, 1, false));
    const exportState = JSON.stringify(
      createSlideVdom(slide, theme, false, false, 1, false, {}, '', null, '0,0', null, '', true)
    );

    expect(liveStage).toContain('filter:drop-shadow(0 0 9px');
    expect(exportState).not.toContain('filter:drop-shadow(0 0 9px');
  });
});
