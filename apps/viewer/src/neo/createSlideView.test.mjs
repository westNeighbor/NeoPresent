import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '@neopresent/markdown';

import { createScientificChartMarkup, createSlideVdom } from './createSlideView.mjs';

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
    expect(markup).toContain('>8.04</text>');
    expect(markup).toContain('>11.96</text>');
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
    expect(markup).toContain('data-neopresent-surface-vertices=');
    expect(markup).toContain('data-neopresent-surface-edge=');
    expect(markup).toContain('data-neopresent-tooltip="x=0–1; y=0–1; value=1"');
    expect(markup).toContain('neopresent-surface-scale-surface-demo');
    expect(markup).toContain('data-katex-source="z"');
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
    const liveStage = JSON.stringify(
      createSlideVdom(slide, theme, false, false, 1, false)
    );
    const exportState = JSON.stringify(
      createSlideVdom(slide, theme, false, false, 1, false, {}, '', null, '0,0', null, '', true)
    );

    expect(liveStage).toContain('filter:drop-shadow(0 0 9px');
    expect(exportState).not.toContain('filter:drop-shadow(0 0 9px');
  });
});
