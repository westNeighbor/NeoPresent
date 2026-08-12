import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const [parser, viewer, plotReference, settingsReference] = await Promise.all([
  readFile(resolve(root, 'packages/markdown/src/index.ts'), 'utf8'),
  readFile(resolve(root, 'apps/viewer/src/neo/createSlideView.mjs'), 'utf8'),
  readFile(resolve(root, 'docs/plot-settings-reference.md'), 'utf8'),
  readFile(resolve(root, 'docs/settings-reference.md'), 'utf8')
]);

const styleRegistry = parser.match(/const styleKeys = new Set\(\[([\s\S]*?)\n\s*\]\);/);
if (!styleRegistry) throw new Error('Could not find the plot style-key registry.');
const plotKeys = [...styleRegistry[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
const statisticItems = ['entries', 'mean', 'stddev', 'rms', 'min', 'max', 'median'];
const statisticItemStyles = ['color', 'label-color', 'value-color', 'font', 'size', 'alpha'];
const dynamicStatisticKeys = statisticItems.flatMap((item) =>
  statisticItemStyles.map((style) => `stats-${item}-${style}`)
);

const symbolFunction = viewer.match(/function safeSymbol\(value\) \{([\s\S]*?)\n\}/);
const lineFunction = viewer.match(/function safeLineStyle\(value\) \{([\s\S]*?)\n\}/);
if (!symbolFunction || !lineFunction)
  throw new Error('Could not find marker/line style registries.');
const rootSymbols = [...symbolFunction[1].matchAll(/^\s{4}(k[a-z0-9]+):/gm)].map(
  (entry) => entry[1]
);
const lineStyles = [...lineFunction[1].matchAll(/^\s{4}'?([a-z0-9-]+)'?:/gm)].map(
  (entry) => entry[1]
);

const plotText = plotReference.toLowerCase();
const missingPlot = [...plotKeys, ...dynamicStatisticKeys, ...rootSymbols, ...lineStyles].filter(
  (key) => !plotText.includes(key.toLowerCase())
);
if (missingPlot.length) throw new Error(`Plot documentation is missing: ${missingPlot.join(', ')}`);

const nonPlotControls = [
  'theme',
  'controls',
  'autoplay',
  'author',
  'subtitle',
  'aspect',
  'font',
  'body-font',
  'heading-font',
  'list-font',
  'quote-font',
  'heading-position',
  'heading-align',
  'heading-offset',
  'footer',
  'footer-left',
  'footer-center',
  'footer-right',
  'footer-font',
  'footer-left-font',
  'footer-center-font',
  'footer-right-font',
  'footer-size',
  'footer-offset',
  'footer-shadow',
  'footer-shadow-color',
  'footer-shadow-opacity',
  'footer-shadow-angle',
  'footer-shadow-distance',
  'footer-shadow-offset',
  'footer-shadow-blur',
  'logo',
  'logo-offset',
  'page-number',
  'page-total',
  'page-total-notoc',
  'page-number-position',
  'page-number-offset',
  'page-number-size',
  'progress',
  'align',
  'body-align',
  'valign',
  'background',
  'background-overlay',
  'background-position',
  'background-size',
  'section',
  'slide-theme',
  'transition',
  'transition-duration',
  'duration',
  'hide-footer',
  'toc',
  'toc-columns',
  'toc-entry',
  'toc-include',
  'toc-exclude',
  'agenda',
  'reveal',
  'list-symbol',
  'list-symbols',
  'button',
  'fragment',
  'note',
  'tip',
  'warning',
  'references',
  'stat',
  'timeline',
  'cards',
  'poll',
  'stickybox',
  'notes',
  'block-enter',
  'block-exit',
  'block-transition-trigger',
  'block-transition-duration',
  'block-transition-delay',
  'scale',
  'offset',
  'fill',
  'fill-alpha',
  'frame-color',
  'glass',
  'glass-color',
  'glass-alpha',
  'glass-transparency',
  'glass-blur',
  'glass-saturation',
  'glass-thickness',
  'glass-edge-color',
  'glass-edge-alpha',
  'glass-depth',
  'glass-depth-alpha',
  'glass-radius',
  'border',
  'border-style',
  'border-color',
  'border-alpha',
  'border-size',
  'border-radius',
  'border-padding',
  'frame-inner-color',
  'frame-scale',
  'shadow',
  'shadow-color',
  'shadow-opacity',
  'shadow-angle',
  'shadow-distance',
  'shadow-offset',
  'shadow-blur',
  'shadow-curve',
  'shadow-size',
  'reflection',
  'sticky-width',
  'sticky-rotation',
  'sticky-fill',
  'sticky-alpha',
  'sticky-tape',
  'sticky-tape-alpha',
  'sticky-position',
  'text-animation',
  'text-animation-duration',
  'text-animation-delay',
  'text-animation-cursor-color',
  'table-animation',
  'table-animation-duration',
  'table-animation-delay',
  'table-animation-stagger',
  'table-animation-easing',
  'table-highlight-row',
  'table-highlight-column',
  'table-highlight-cell',
  'table-highlight-effect',
  'table-highlight-color',
  'table-highlight-duration',
  'table-highlight-delay',
  'caption-position',
  'caption-align',
  'caption-size',
  'caption-font',
  'caption-color',
  'caption-alpha',
  'caption-gap',
  'caption-offset-x',
  'caption-offset-y',
  'max-width',
  'max-height',
  'fit',
  'animation-order',
  'animation-trigger',
  'reveal-stages',
  'reveal-stage-default',
  'export-stages',
  'momentum-direction',
  'momentum-position',
  'momentum-offset',
  'momentum-length',
  'momentum-width',
  'momentum-arrow-size',
  'momentum-label-offset'
];
const settingsText = settingsReference.toLowerCase();
const missingNonPlot = nonPlotControls.filter((key) => !settingsText.includes(key));
if (missingNonPlot.length)
  throw new Error(`Non-plot documentation is missing: ${missingNonPlot.join(', ')}`);

const plotCoreKeys = new Set([
  ...plotKeys,
  'type',
  'title',
  'source',
  'x',
  'y',
  'values',
  'value',
  'labels',
  'xlabel',
  'ylabel',
  'x-label',
  'y-label',
  'error',
  'error-low',
  'error-high',
  'x-error',
  'x-error-low',
  'x-error-high',
  'bins',
  'u',
  'v',
  'rho',
  'correlation',
  'formula',
  'expression',
  'refresh',
  'smooth',
  'trendline',
  'series',
  'series-loop',
  'uncertainty',
  'function',
  'reference',
  'shape',
  'annotation',
  'legend-item',
  'diagram-highlight',
  'diagram-reveal'
]);
const documentationFiles = (await readdir(resolve(root, 'docs'))).filter((file) =>
  file.endsWith('.md')
);
const invalidExamples = [];
for (const file of documentationFiles) {
  const source = await readFile(resolve(root, 'docs', file), 'utf8');
  for (const fence of source.matchAll(/```(?:plot|chart)\n([\s\S]*?)```/g)) {
    for (const line of fence[1].split('\n')) {
      const field = line.match(/^\s*([a-zA-Z][a-zA-Z0-9-]*)\s*:/);
      if (field && !plotCoreKeys.has(field[1].toLowerCase()))
        invalidExamples.push(`${file}: ${field[1]}`);
    }
  }
}
if (invalidExamples.length)
  throw new Error(
    `Plot examples contain unsupported top-level keys: ${invalidExamples.join(', ')}`
  );

const markdownFiles = ['README.md', ...documentationFiles.map((file) => `docs/${file}`)];
const brokenLinks = [];
for (const file of markdownFiles) {
  const source = await readFile(resolve(root, file), 'utf8');
  for (const link of source.matchAll(/\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/g)) {
    const target = resolve(root, dirname(file), link[1]);
    try {
      await access(target);
    } catch {
      brokenLinks.push(`${file} -> ${link[1]}`);
    }
  }
}
if (brokenLinks.length) throw new Error(`Broken documentation links: ${brokenLinks.join(', ')}`);

console.log(
  `Documentation covers ${plotKeys.length} plot keys, ${dynamicStatisticKeys.length} dynamic statistic keys, ${rootSymbols.length} ROOT marker aliases, ${lineStyles.length} line styles, and ${nonPlotControls.length} audited non-plot controls.`
);
