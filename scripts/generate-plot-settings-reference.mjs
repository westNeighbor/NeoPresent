import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const parser = await readFile(resolve(root, 'packages/markdown/src/index.ts'), 'utf8');
const match = parser.match(/const styleKeys = new Set\(\[([\s\S]*?)\n\s*\]\);/);
if (!match) throw new Error('Could not find the plot style-key registry.');
const keys = [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
const statisticItems = ['entries', 'mean', 'stddev', 'rms', 'min', 'max', 'median'];
const statisticItemStyles = ['color', 'label-color', 'value-color', 'font', 'size', 'alpha'];
const dynamicStatisticKeys = statisticItems.flatMap((item) =>
  statisticItemStyles.map((style) => `stats-${item}-${style}`)
);

const categories = [
  ['Title, caption, and canvas', /^(?:title-|caption|plot-|chart-)/],
  ['Axes, grid, ticks, and labels', /^(?:axis-|grid-|tick-|x-|y-|right-|frame-|minor-tick)/],
  [
    'Data, markers, lines, bubbles, and values',
    /^(?:data-|symbol$|line-style$|draw$|smooth$|trendline|value-|point-|bubble-)/
  ],
  ['Errors, bands, and uncertainty defaults', /^(?:error-|band)/],
  ['Legend', /^legend/],
  [
    'References, highlighting, and animation',
    /^(?:reference-|highlight-|animation|export-stages|reveal-|fit-reveal|stats-reveal)/
  ],
  ['Histogram and stacking', /^(?:fill$|bin-|vertical-lines|stack-|ridgeline-|profile-|violin-)/],
  ['Fit and fit band', /^fit/],
  ['Statistics box', /^stats/],
  ['Heatmap and color map', /^(?:heatmap-|density-|contour-|hexbin-)/],
  ['3D surface', /^surface-/],
  ['Vector-field plots', /^(?:quiver-|streamline-)/],
  ['Covariance plot', /^covariance-/],
  ['Scientific diagrams', /^(?:diagram-|standard-model-|periodic-table-)/],
  ['Functions and general data', /^(?:function|samples$|variables$)/]
];

const assigned = new Set();
const sections = categories.map(([title, pattern]) => {
  const selected = keys.filter((key) => pattern.test(key) && !assigned.has(key));
  selected.forEach((key) => assigned.add(key));
  return `### ${title}\n\n${selected.map((key) => `\`${key}\``).join(', ')}\n`;
});
const remaining = keys.filter((key) => !assigned.has(key));
if (remaining.length)
  sections.push(
    `### Other registered keys\n\n${remaining.map((key) => `\`${key}\``).join(', ')}\n`
  );

const output = `# Complete plot settings reference

This page is generated from the plot key registry in \`packages/markdown/src/index.ts\`. Every exact plot-level key accepted by the Markdown compiler appears below, making the reference searchable and preventing implementation options from disappearing from the documentation.

For examples and explanations, start with the [plotting guide](plotting.md). This page is the exhaustive companion.

## Plot types and aliases

| Canonical type | Accepted \`type\` values |
| --- | --- |
| Line | \`line\` (also the fallback when a type is unknown) |
| Scatter | \`scatter\` |
| Area | \`area\` |
| Bar | \`bar\` |
| Pie / donut | \`pie\`, \`donut\`, \`doughnut\` |
| Radar | \`radar\`, \`spider\`, \`spider-chart\` |
| Ratio / pull | \`ratio\`, \`pull\`, \`ratio-panel\`, \`pull-panel\` |
| Efficiency | \`efficiency\`, \`acceptance\` |
| ROC | \`roc\`, \`roc-curve\` |
| Polar | \`polar\`, \`radial\` |
| Stacked bar | \`stacked-bar\`, \`normalized-stacked-bar\` |
| Ternary | \`ternary\`, \`triangle\` |
| Forest | \`forest\`, \`forest-plot\` |
| Corner | \`corner\`, \`pair\`, \`pair-plot\` |
| Histogram | \`histogram\`, \`hist\` |
| Stacked histogram | \`stacked-histogram\`, \`stacked-hist\` |
| Normalized histogram | \`normalized-histogram\`, \`normalized-hist\` |
| Box plot | \`box\`, \`boxplot\` |
| Heatmap | \`heatmap\`, \`correlation\` |
| Contour | \`contour\` |
| Covariance ellipse | \`covariance\`, \`error-ellipse\`, \`ellipse\` |
| 2D density | \`density2d\`, \`density-2d\`, \`kde2d\` |
| Hexbin | \`hexbin\` |
| Quiver | \`quiver\`, \`vector\` |
| Streamline | \`streamline\`, \`streamlines\` |
| Profile histogram | \`profile\`, \`profile-histogram\` |
| Ridgeline | \`ridgeline\`, \`ridge\` |
| Violin | \`violin\` |
| Surface | \`surface\`, \`surface3d\` |
| Function | \`function\`, \`function2d\`, \`curve\` |
| Standard Model | \`standard-model\`, \`particle-model\` |
| Periodic table | \`periodic-table\`, \`periodic\` |

## Core data fields

These are parsed as chart data/model fields rather than style-registry keys:

| Setting | Purpose |
| --- | --- |
| \`type\` | Plot type from the table above |
| \`title\` | Plot title; supports inline math/style rendering |
| \`source\` | JSON or CSV source relative to the deck root |
| \`x\`, \`y\`, \`values\`, \`value\`, \`labels\` | Inline values or external field names, depending on source |
| \`x-label\`, \`xlabel\`, \`y-label\`, \`ylabel\` | Axis labels; an empty value suppresses the title |
| \`error\`, \`error-low\`, \`error-high\` | Symmetric/asymmetric y errors or source fields |
| \`x-error\`, \`x-error-low\`, \`x-error-high\` | Symmetric/asymmetric x errors or source fields |
| \`bins\` | Histogram bin count for raw values |
| \`u\`, \`v\` | Quiver/streamline vector components |
| \`rho\`, \`correlation\` | Covariance correlations |
| \`formula\`, \`expression\` | Function/surface expression aliases |
| \`refresh\` | External data refresh duration |

## Marker symbols

Use \`symbol\` or \`data-symbol\`. Names are case-insensitive; spaces and underscores are normalized to hyphens.

### Generic symbol names

Each base name accepts an optional \`open-\` or \`full-\` prefix:

\`circle\`, \`square\`, \`square-diagonal\`, \`diamond\`, \`double-diamond\`, \`triangle\`, \`triangle-up\`, \`triangle-down\`, \`cross\`, \`cross-x\`, \`plus\`, \`star\`, \`diamond-cross\`, \`three-triangles\`, \`four-triangles-x\`, \`four-triangles-plus\`, \`four-squares-x\`, \`four-squares-plus\`, \`octagon-cross\`.

An unknown name falls back to \`circle\`.

### CERN ROOT marker aliases

\`kFullCircle\`, \`kFullSquare\`, \`kFullTriangleUp\`, \`kFullTriangleDown\`, \`kOpenCircle\`, \`kOpenSquare\`, \`kOpenTriangleUp\`, \`kOpenTriangleDown\`, \`kOpenDiamond\`, \`kFullDiamond\`, \`kOpenCross\`, \`kFullCross\`, \`kFullStar\`, \`kOpenStar\`, \`kOpenDiamondCross\`, \`kOpenSquareDiagonal\`, \`kOpenThreeTriangles\`, \`kFullThreeTriangles\`, \`kOctagonCross\`, \`kOpenFourTrianglesX\`, \`kFullFourTrianglesX\`, \`kOpenDoubleDiamond\`, \`kFullDoubleDiamond\`, \`kOpenFourTrianglesPlus\`, \`kFullFourTrianglesPlus\`, \`kOpenCrossX\`, \`kFullCrossX\`, \`kFourSquareX\`, and \`kFourSquaresPlus\`.

## Line styles

Use \`line-style\` on data, series, functions, uncertainties, shapes, fits, and fit-band outlines. Reference entries accept \`line-style\`; the older plot-level alias is \`reference-dash\`.

| Name | SVG dash pattern | ROOT equivalent |
| --- | --- | --- |
| \`solid\` | solid | \`root-1\` |
| \`dashed\` | \`12 8\` | \`root-2\` |
| \`dotted\` | \`2 7\` | \`root-3\` |
| \`dash-dot\` | \`12 6 2 6\` | \`root-4\` |
| \`dash-dot-dot\` | \`12 5 2 5 2 5\` | \`root-5\` |
| — | \`20 8\` | \`root-6\` |
| — | \`20 6 2 6\` | \`root-7\` |
| — | \`20 5 2 5 2 5\` | \`root-8\` |
| — | \`8 5\` | \`root-9\` |
| — | \`4 4\` | \`root-10\` |

Unknown line styles become solid.

## Draw modes

\`draw\` uses ROOT-like tokens. \`P\` draws markers, \`L\` draws a connecting line, \`E\` draws error marks, and \`B\` draws an error band/box where supported. Combine tokens, for example \`PE\`, \`PL\`, \`PLE\`, or \`LB\`.

## Other enumerated values

| Setting | Accepted values |
| --- | --- |
| \`x-scale\`, \`y-scale\`, \`right-y-scale\` | \`linear\` or \`log\` |
| \`bubble-scale\` | \`linear\`, \`sqrt\` (default), or \`log\` |
| \`legend-position\` | \`top-left\`, \`top-center\`, \`top-right\`, \`middle-left\`, \`middle-center\`, \`middle-right\`, \`bottom-left\`, \`bottom-center\`, \`bottom-right\` |
| \`animation\`, layer animations | \`fade\`, \`rise\`, \`grow\`, or \`draw\`; surfaces also accept \`wave\` |
| \`animation-trigger\` | automatic/default behavior or \`reveal\` for internal navigation stages |
| \`highlight-effect\` | \`glow\` or \`flow\`; diagram highlights also accept \`outline\` |
| \`fit-method\` | \`least-squares\` (default) or \`poisson\` |
| \`fit-band-kind\` | \`confidence\` (default) or \`prediction\` |
| \`fit-diagnostic\` | \`pull\` or \`residual\` |
| \`fit-label-align\` | \`left\`, \`center\`, or \`right\` |
| \`stats\` | comma-separated \`entries\`, \`mean\`, \`stddev\`, \`rms\`, \`min\`, \`max\`, \`median\`, or \`all\` |
| \`stats-animation\` | \`fade\`, \`rise\`, \`grow\`, or item-by-item \`reveal\` |
| \`periodic-table-color-mode\` | \`category\` (default) or \`theme\` |
| \`surface-interactive\` | boolean |
| \`surface-animation\` | \`fade\`, \`rise\`, \`grow\`, \`draw\`, or \`wave\` |

## Entry-specific fields

### \`series: Name | ...\` and \`series-loop: Name {i} | ...\`

\`source\`, \`x\`, \`y\`, \`values\`, \`labels\`, \`error\`, \`error-low\`, \`error-high\`, \`x-error\`, \`x-error-low\`, \`x-error-high\`, \`point-label-field\`, \`bubble-size\`, \`color\`, \`data-size\`, \`data-alpha\`, \`symbol\`, \`data-symbol\`, \`line-style\`, \`draw\`, \`band\`, \`band-color\`, \`band-alpha\`, \`band-line\`, \`y-axis\` (\`left\` or \`right\`), \`animation\`, \`animation-delay\`, \`animation-duration\`, \`animation-easing\`, \`reveal-stage\`, \`highlight-effect\`, \`highlight-color\`, \`highlight-duration\`, \`highlight-delay\`, \`highlight-index\`, \`visible\`, \`legend\`, \`legend-order\`, every \`stats-*\` key, \`fit-color\`, \`fit-width\`, \`fit-alpha\`, \`fit-animation\`, \`fit-animation-delay\`, \`fit-animation-duration\`, and \`fit-animation-easing\`. Series loops additionally use \`from\` and \`to\`.

### \`uncertainty: Name | ...\`

\`style\` (\`bar\`, \`box\`, \`ellipse\`, or \`band\`), \`error\`, \`error-low\`, \`error-high\`, \`x-error\`, \`correlation\`, \`color\`, \`width\`, \`alpha\`, \`cap-size\`, \`fill-color\`, \`fill-alpha\`, \`line-style\`, \`sigma\`, \`combine\`, \`animation\`, \`animation-duration\`, \`animation-delay\`, \`animation-easing\`, \`reveal-stage\`, \`visible\`, \`legend\`, and \`legend-order\`.

### \`function: expression | ...\`

\`label\`, \`name\`, \`x-min\`, \`x-max\`, \`samples\`, \`function-samples\`, \`color\`, \`line-width\`, \`data-size\`, \`alpha\`, \`data-alpha\`, \`line-style\`, \`draw\`, \`animation\`, \`animation-duration\`, \`animation-delay\`, \`animation-easing\`, highlight fields, \`legend\`, and \`legend-order\`. Surface functions additionally accept \`palette\`, \`mesh-color\`, and \`mesh-width\`.

### \`reference: Name | ...\`

\`axis\`, \`value\`, \`x\`, \`y\`, \`color\`, \`width\`, \`line-style\`, \`label\`, \`label-color\`, \`legend\`, \`legend-order\`, \`animation\`, \`animation-duration\`, \`animation-delay\`, \`animation-easing\`, and \`reveal-stage\`.

### \`shape: kind | ...\`

Kinds: \`line\`, \`arrow\`, \`box\`, \`rect\`, \`rectangle\`, \`circle\`, \`ellipse\`. Coordinates: \`x\`, \`y\`, \`x1\`, \`y1\`, \`x2\`, \`y2\`, \`width\`, \`height\`, \`r\`, \`radius\`, \`rx\`, \`ry\`. Style: \`color\`, \`line-color\`, \`line-width\`, \`line-style\`, \`alpha\`, \`fill\`, \`fill-color\`, \`fill-alpha\`. Arrows add \`head-size\`, \`head-angle\`, and \`head-style\` (\`filled\`, \`open\`, \`line\`, or \`none\`). All shapes accept animation timing and \`reveal-stage\`.

### \`annotation: text | ...\`

\`x\`, \`y\` (normalized plot coordinates), \`align\` (\`left\`, \`center\`, \`right\`), \`color\`, \`font\`, \`font-size\`, \`font-weight\`, \`line-height\`, \`line-indent\` (comma-separated offsets per line), \`animation\` (\`fade\`, \`rise\`, \`grow\`), timing fields, and \`reveal-stage\`.

### \`legend-item: Name | ...\`

\`color\`, \`line-width\`, \`data-size\`, \`symbol\`, \`data-symbol\`, \`line-style\`, \`draw\`, \`legend-order\`, or \`order\`.

### \`diagram-highlight: target | ...\`

\`label\`, \`color\`, \`effect\` (\`glow\`, \`flow\`, or \`outline\`), \`duration\`, \`delay\`, \`dim-alpha\`, and \`stage\`. A negative duration means the highlight persists. \`diagram-reveal: target | stage: N\` assigns elements to an internal reveal stage.

Standard Model targets may be a particle symbol/name, \`quark(s)\`, \`lepton(s)\`, \`fermion(s)\`/\`matter\`, \`boson(s)\`, \`force-carrier(s)\`, \`force-boson(s)\`, \`interaction-boson(s)\`, \`gauge-boson(s)\`, \`vector-boson(s)\`, \`scalar-boson(s)\`/\`higgs\`, \`gravity\`/\`graviton\`/\`hypothetical\`, \`tensor-boson(s)\`, \`generation-1\`/\`generation-I\` through III, \`coupling-constants\`, or a coupling row such as \`strong\`, \`electromagnetic\`, \`weak\`, and \`gravity\`.

Periodic-table targets may be an element symbol, atomic number, element name, category (\`alkali\`, \`alkaline\`, \`transition\`, \`post-transition\`, \`metalloid\`, \`nonmetal\`, \`halogen\`, \`noble\`, \`lanthanide\`, \`actinide\`), \`metal(s)\`, \`nonmetal(s)\`, \`noble-gas(es)\`, \`transition-metal(s)\`, \`period-N\`, or \`group-N\`.

## Accepted expressions

Function and surface expressions accept arithmetic, parentheses, \`pi\`, \`e\`, and: \`sin\`, \`cos\`, \`tan\`, \`asin\`, \`acos\`, \`atan\`, \`atan2\`, \`sinh\`, \`cosh\`, \`tanh\`, \`exp\`, \`log\`, \`log10\`, \`sqrt\`, \`cbrt\`, \`abs\`, \`pow\`, \`min\`, \`max\`, \`floor\`, \`ceil\`, \`round\`, and \`sign\`. Fits support \`sin\`, \`cos\`, \`tan\`, \`exp\`, \`log\`, \`sqrt\`, \`abs\`, \`pow\`, \`min\`, and \`max\`.

## Every registered plot-level key

The following inventory is generated directly from the parser. Exact names are grouped for scanning; every name is searchable.

${sections.join('\n')}

### Per-statistic item style keys

These keys are accepted dynamically for each statistics item:

${dynamicStatisticKeys.map((key) => `\`${key}\``).join(', ')}
`;

await writeFile(resolve(root, 'docs/plot-settings-reference.md'), output);
console.log(
  `Wrote docs/plot-settings-reference.md with ${keys.length} registered plot keys and ${dynamicStatisticKeys.length} dynamic statistic-style keys.`
);
