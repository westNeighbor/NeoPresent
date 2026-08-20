# Complete plot settings reference

This page is generated from the plot key registry in `packages/markdown/src/index.ts`. Every exact plot-level key accepted by the Markdown compiler appears below, making the reference searchable and preventing implementation options from disappearing from the documentation.

For examples and explanations, start with the [plotting guide](plotting.md). This page is the exhaustive companion.

## Plot types and aliases

| Canonical type       | Accepted `type` values                             |
| -------------------- | -------------------------------------------------- |
| Line                 | `line` (also the fallback when a type is unknown)  |
| Scatter              | `scatter`                                          |
| Area                 | `area`                                             |
| Bar                  | `bar`                                              |
| Pie / donut          | `pie`, `donut`, `doughnut`                         |
| Radar                | `radar`, `spider`, `spider-chart`                  |
| Ratio / pull         | `ratio`, `pull`, `ratio-panel`, `pull-panel`       |
| Efficiency           | `efficiency`, `acceptance`                         |
| ROC                  | `roc`, `roc-curve`                                 |
| Polar                | `polar`, `radial`                                  |
| Stacked bar          | `stacked-bar`, `normalized-stacked-bar`            |
| Ternary              | `ternary`, `triangle`                              |
| Forest               | `forest`, `forest-plot`                            |
| Corner               | `corner`, `pair`, `pair-plot`                      |
| QQ / probability     | `qq`, `qq-plot`, `probability`, `probability-plot` |
| ECDF / survival      | `ecdf`, `cdf`, `survival`, `survival-curve`        |
| Precision–recall     | `precision-recall`, `pr`, `pr-curve`               |
| Volcano              | `volcano`                                          |
| Waterfall            | `waterfall`                                        |
| Sankey / alluvial    | `sankey`, `alluvial`                               |
| Time series          | `time-series`, `timeseries`                        |
| Geographic           | `geographic`, `geo`, `map`                         |
| Histogram            | `histogram`, `hist`                                |
| Stacked histogram    | `stacked-histogram`, `stacked-hist`                |
| Normalized histogram | `normalized-histogram`, `normalized-hist`          |
| Box plot             | `box`, `boxplot`                                   |
| Heatmap              | `heatmap`, `correlation`                           |
| Contour              | `contour`                                          |
| Covariance ellipse   | `covariance`, `error-ellipse`, `ellipse`           |
| 2D density           | `density2d`, `density-2d`, `kde2d`                 |
| Hexbin               | `hexbin`                                           |
| Quiver               | `quiver`, `vector`                                 |
| Streamline           | `streamline`, `streamlines`                        |
| Profile histogram    | `profile`, `profile-histogram`                     |
| Ridgeline            | `ridgeline`, `ridge`                               |
| Violin               | `violin`                                           |
| Surface              | `surface`, `surface3d`                             |
| Function             | `function`, `function2d`, `curve`                  |
| Standard Model       | `standard-model`, `particle-model`                 |
| Periodic table       | `periodic-table`, `periodic`                       |

## Core data fields

These are parsed as chart data/model fields rather than style-registry keys:

| Setting                                  | Purpose                                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| `type`                                   | Plot type from the table above                             |
| `title`                                  | Plot title; supports inline math/style rendering           |
| `source`                                 | JSON or CSV source relative to the deck root               |
| `x`, `y`, `values`, `value`, `labels`    | Inline values or external field names, depending on source |
| `x-label`, `xlabel`, `y-label`, `ylabel` | Axis labels; an empty value suppresses the title           |
| `error`, `error-low`, `error-high`       | Symmetric/asymmetric y errors or source fields             |
| `x-error`, `x-error-low`, `x-error-high` | Symmetric/asymmetric x errors or source fields             |
| `bins`                                   | Histogram bin count for raw values                         |
| `u`, `v`                                 | Quiver/streamline vector components                        |
| `rho`, `correlation`                     | Covariance correlations                                    |
| `formula`, `expression`                  | Function/surface expression aliases                        |
| `refresh`                                | External data refresh duration                             |

## Marker symbols

Use `symbol` or `data-symbol`. Names are case-insensitive; spaces and underscores are normalized to hyphens.

### Generic symbol names

Each base name accepts an optional `open-` or `full-` prefix:

`circle`, `square`, `square-diagonal`, `diamond`, `double-diamond`, `triangle`, `triangle-up`, `triangle-down`, `cross`, `cross-x`, `plus`, `star`, `diamond-cross`, `three-triangles`, `four-triangles-x`, `four-triangles-plus`, `four-squares-x`, `four-squares-plus`, `octagon-cross`.

An unknown name falls back to `circle`.

### CERN ROOT marker aliases

`kFullCircle`, `kFullSquare`, `kFullTriangleUp`, `kFullTriangleDown`, `kOpenCircle`, `kOpenSquare`, `kOpenTriangleUp`, `kOpenTriangleDown`, `kOpenDiamond`, `kFullDiamond`, `kOpenCross`, `kFullCross`, `kFullStar`, `kOpenStar`, `kOpenDiamondCross`, `kOpenSquareDiagonal`, `kOpenThreeTriangles`, `kFullThreeTriangles`, `kOctagonCross`, `kOpenFourTrianglesX`, `kFullFourTrianglesX`, `kOpenDoubleDiamond`, `kFullDoubleDiamond`, `kOpenFourTrianglesPlus`, `kFullFourTrianglesPlus`, `kOpenCrossX`, `kFullCrossX`, `kFourSquareX`, and `kFourSquaresPlus`.

## Line styles

Use `line-style` on data, series, functions, uncertainties, shapes, fits, and fit-band outlines. Reference entries accept `line-style`; the older plot-level alias is `reference-dash`.

| Name           | SVG dash pattern | ROOT equivalent |
| -------------- | ---------------- | --------------- |
| `solid`        | solid            | `root-1`        |
| `dashed`       | `12 8`           | `root-2`        |
| `dotted`       | `2 7`            | `root-3`        |
| `dash-dot`     | `12 6 2 6`       | `root-4`        |
| `dash-dot-dot` | `12 5 2 5 2 5`   | `root-5`        |
| —              | `20 8`           | `root-6`        |
| —              | `20 6 2 6`       | `root-7`        |
| —              | `20 5 2 5 2 5`   | `root-8`        |
| —              | `8 5`            | `root-9`        |
| —              | `4 4`            | `root-10`       |

Unknown line styles become solid.

## Draw modes

`draw` uses ROOT-like tokens. `P` draws markers, `L` draws a connecting line, `E` draws error marks, and `B` draws an error band/box where supported. Combine tokens, for example `PE`, `PL`, `PLE`, or `LB`.

## Other enumerated values

| Setting                               | Accepted values                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `x-scale`, `y-scale`, `right-y-scale` | `linear` or `log`                                                                                                                     |
| `bubble-scale`                        | `linear`, `sqrt` (default), or `log`                                                                                                  |
| `legend-position`                     | `top-left`, `top-center`, `top-right`, `middle-left`, `middle-center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right` |
| `animation`, layer animations         | `fade`, `rise`, `grow`, or `draw`; surfaces also accept `wave`                                                                        |
| `animation-trigger`                   | automatic/default behavior or `reveal` for internal navigation stages                                                                 |
| `highlight-effect`                    | `glow` or `flow`; diagram highlights also accept `outline`                                                                            |
| `fit-method`                          | `least-squares` (default) or `poisson`                                                                                                |
| `fit-band-kind`                       | `confidence` (default) or `prediction`                                                                                                |
| `fit-diagnostic`                      | `pull` or `residual`                                                                                                                  |
| `fit-label-align`                     | `left`, `center`, or `right`                                                                                                          |
| `stats`                               | comma-separated `entries`, `mean`, `stddev`, `rms`, `min`, `max`, `median`, or `all`                                                  |
| `stats-animation`                     | `fade`, `rise`, `grow`, or item-by-item `reveal`                                                                                      |
| `periodic-table-color-mode`           | `category` (default) or `theme`                                                                                                       |
| `surface-interactive`                 | boolean                                                                                                                               |
| `surface-animation`                   | `fade`, `rise`, `grow`, `draw`, or `wave`                                                                                             |

## Entry-specific fields

### `series: Name | ...` and `series-loop: Name {i} | ...`

`source`, `x`, `y`, `values`, `labels`, `error`, `error-low`, `error-high`, `x-error`, `x-error-low`, `x-error-high`, `point-label-field`, `bubble-size`, `color`, `data-size`, `data-alpha`, `symbol`, `data-symbol`, `line-style`, `draw`, `band`, `band-color`, `band-alpha`, `band-line`, `y-axis` (`left` or `right`), `animation`, `animation-delay`, `animation-duration`, `animation-easing`, `reveal-stage`, `highlight-effect`, `highlight-color`, `highlight-duration`, `highlight-delay`, `highlight-index`, `visible`, `legend`, `legend-order`, every `stats-*` key, `fit-color`, `fit-width`, `fit-alpha`, `fit-animation`, `fit-animation-delay`, `fit-animation-duration`, and `fit-animation-easing`. Series loops additionally use `from` and `to`.

### `uncertainty: Name | ...`

`style` (`bar`, `box`, `ellipse`, or `band`), `error`, `error-low`, `error-high`, `x-error`, `correlation`, `color`, `width`, `alpha`, `cap-size`, `fill-color`, `fill-alpha`, `line-style`, `sigma`, `combine`, `animation`, `animation-duration`, `animation-delay`, `animation-easing`, `reveal-stage`, `visible`, `legend`, and `legend-order`.

### `function: expression | ...`

`label`, `name`, `x-min`, `x-max`, `samples`, `function-samples`, `color`, `line-width`, `data-size`, `alpha`, `data-alpha`, `line-style`, `draw`, `animation`, `animation-duration`, `animation-delay`, `animation-easing`, highlight fields, `legend`, and `legend-order`. Surface functions additionally accept `palette`, `mesh-color`, and `mesh-width`.

### `reference: Name | ...`

`axis`, `value`, `x`, `y`, `color`, `width`, `line-style`, `label`, `label-color`, `legend`, `legend-order`, `animation`, `animation-duration`, `animation-delay`, `animation-easing`, and `reveal-stage`.

### `shape: kind | ...`

Kinds: `line`, `arrow`, `box`, `rect`, `rectangle`, `circle`, `ellipse`. Coordinates: `x`, `y`, `x1`, `y1`, `x2`, `y2`, `width`, `height`, `r`, `radius`, `rx`, `ry`. Style: `color`, `line-color`, `line-width`, `line-style`, `alpha`, `fill`, `fill-color`, `fill-alpha`. Arrows add `head-size`, `head-angle`, and `head-style` (`filled`, `open`, `line`, or `none`). All shapes accept animation timing and `reveal-stage`.

### `annotation: text | ...`

`x`, `y` (normalized plot coordinates), `align` (`left`, `center`, `right`), `color`, `font`, `font-size`, `font-weight`, `line-height`, `line-indent` (comma-separated offsets per line), `animation` (`fade`, `rise`, `grow`), timing fields, and `reveal-stage`.

### `legend-item: Name | ...`

`color`, `line-width`, `data-size`, `symbol`, `data-symbol`, `line-style`, `draw`, `legend-order`, or `order`.

### `diagram-highlight: target | ...`

`label`, `color`, `effect` (`glow`, `flow`, or `outline`), `duration`, `delay`, `dim-alpha`, and `stage`. A negative duration means the highlight persists. `diagram-reveal: target | stage: N` assigns elements to an internal reveal stage.

Standard Model targets may be a particle symbol/name, `quark(s)`, `lepton(s)`, `fermion(s)`/`matter`, `boson(s)`, `force-carrier(s)`, `force-boson(s)`, `interaction-boson(s)`, `gauge-boson(s)`, `vector-boson(s)`, `scalar-boson(s)`/`higgs`, `gravity`/`graviton`/`hypothetical`, `tensor-boson(s)`, `generation-1`/`generation-I` through III, `coupling-constants`, or a coupling row such as `strong`, `electromagnetic`, `weak`, and `gravity`.

Periodic-table targets may be an element symbol, atomic number, element name, category (`alkali`, `alkaline`, `transition`, `post-transition`, `metalloid`, `nonmetal`, `halogen`, `noble`, `lanthanide`, `actinide`), `metal(s)`, `nonmetal(s)`, `noble-gas(es)`, `transition-metal(s)`, `period-N`, or `group-N`.

## Accepted expressions

Function and surface expressions accept arithmetic, parentheses, `pi`, `e`, and: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `exp`, `log`, `log10`, `sqrt`, `cbrt`, `abs`, `pow`, `min`, `max`, `floor`, `ceil`, `round`, and `sign`. Fits support `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `abs`, `pow`, `min`, and `max`.

## Every registered plot-level key

The following inventory is generated directly from the parser. Exact names are grouped for scanning; every name is searchable.

### Title, caption, and canvas

`title-color`, `title-size`, `title-font`, `title-offset-x`, `title-offset-y`, `title-alpha`, `caption`, `caption-size`, `caption-color`, `caption-align`, `caption-font`, `caption-offset-x`, `caption-offset-y`, `plot-alpha`, `plot-offset-x`, `plot-offset-y`, `plot-width`, `plot-height`, `chart-width`, `chart-height`, `chart-padding`, `chart-trim`

`plot-width` and `plot-height` also size the specialized scientific renderers, including
ratio, efficiency, ROC, polar, ternary, forest, corner, ECDF/survival, volcano,
waterfall, Sankey, time-series, geographic, scalar-field, and 3D surface plots.
Use the same CSS-length syntax as the original renderers, for example
`plot-width: 620px` and `plot-height: 370px`. Unitless numbers remain supported
and are interpreted as pixels.

`chart-padding` adds space around the complete plot block using normal CSS
one-to-four-value order. `chart-trim` removes unused space from the SVG canvas
in `top right bottom left` order using SVG pixels. For example,
`chart-trim: 0 80 0 80` tightens circular plots horizontally, while
`chart-trim: 0 0 90 0` removes excess space below a sparse alluvial plot.
The sizing remains responsive inside `::group`, `::columns`, and `::grid` blocks;
`plot-width: 100%` fills the available group, column, or grid cell.

### Axes, grid, ticks, and labels

`axis-color`, `axis-width`, `axis-alpha`, `grid-color`, `grid-width`, `grid-alpha`, `tick-color`, `tick-size`, `tick-font`, `tick-offset-x`, `tick-offset-y`, `tick-alpha`, `x-scale`, `y-scale`, `x-min`, `x-max`, `y-min`, `y-max`, `y-axis-digits`, `frame-top`, `frame-right`, `minor-ticks`, `tick-divisions`, `tick-length`, `minor-tick-length`, `x-label-color`, `x-label-size`, `x-label-font`, `x-label-offset-x`, `x-label-offset-y`, `x-label-alpha`, `y-label-color`, `y-label-size`, `y-label-font`, `y-label-offset-x`, `y-label-offset-y`, `y-label-alpha`, `right-y-label`, `right-y-min`, `right-y-max`, `right-y-scale`, `right-y-axis-digits`, `right-axis-color`, `right-tick-color`, `right-tick-size`, `right-tick-font`, `right-y-label-color`, `right-y-label-size`, `right-y-label-font`

### Data, markers, lines, bubbles, and values

`data-color`, `data-size`, `data-alpha`, `bubble-size`, `bubble-min`, `bubble-max`, `bubble-scale`, `bubble-legend`, `bubble-legend-label`, `bubble-label`, `symbol`, `data-symbol`, `line-style`, `draw`, `value-color`, `value-size`, `point-labels`, `point-label-field`, `point-label-value`, `point-label-errors`, `point-label-color`, `point-label-size`, `point-label-offset-x`, `point-label-offset-y`, `value-font`, `trendline-label`

### Errors, bands, and uncertainty defaults

`error-color`, `error-width`, `error-alpha`, `error-cap-size`, `error-box`, `error-box-color`, `error-box-alpha`, `band`, `band-color`, `band-alpha`, `band-line`

### Legend

`legend`, `legend-position`, `legend-offset-x`, `legend-offset-y`, `legend-columns`, `legend-labels`, `legend-color`, `legend-size`, `legend-font`, `legend-alpha`

### References, highlighting, and animation

`reference-x`, `reference-y`, `reference-color`, `reference-width`, `reference-dash`, `reference-label`, `reference-label-color`, `animation`, `animation-trigger`, `export-stages`, `reveal-stages`, `reveal-stage-default`, `fit-reveal-stage`, `stats-reveal-stage`, `animation-duration`, `animation-delay`, `animation-easing`, `highlight-effect`, `highlight-color`, `highlight-duration`, `highlight-delay`, `highlight-index`

### Histogram and stacking

`profile-error`, `profile-min-count`, `stack-bar-gap`, `stack-bar-normalized`, `ridgeline-fill-alpha`, `ridgeline-overlap`, `ridgeline-palette`, `stack-normalized`, `stack-palette`, `violin-bandwidth`, `violin-fill-color`, `violin-fill-alpha`, `fill`, `bin-edges`, `bin-counts`, `bin-edges-field`, `bin-counts-field`, `bin-gap`, `bin-line`, `bin-lines`, `vertical-lines`

### Fit and fit band

`fit`, `fit-id`, `fit-method`, `fit-params`, `fit-bounds`, `fit-fixed`, `fit-series`, `fit-all`, `fit-errors`, `fit-color`, `fit-width`, `fit-alpha`, `fit-line-style`, `fit-samples`, `fit-results`, `fit-quality`, `fit-pvalue`, `fit-correlation`, `fit-correlation-x`, `fit-correlation-y`, `fit-correlation-size`, `fit-correlation-color`, `fit-correlation-precision`, `fit-diagnostic`, `fit-diagnostic-height`, `fit-legend`, `fit-legend-label`, `fit-legend-order`, `fit-label-x`, `fit-label-y`, `fit-label-align`, `fit-label-size`, `fit-label-color`, `fit-draw`, `fit-band`, `fit-band-kind`, `fit-band-color`, `fit-band-alpha`, `fit-band-sigma`, `fit-band-outline-color`, `fit-band-outline-alpha`, `fit-band-outline-width`, `fit-band-outline-style`, `fit-band-legend`, `fit-band-legend-label`, `fit-band-animation`, `fit-band-animation-duration`, `fit-band-animation-delay`, `fit-band-animation-easing`, `fit-x-min`, `fit-x-max`, `fit-range`, `fit-ranges`, `fit-exclude`, `fit-draw-exclude`, `fit-animation`, `fit-animation-duration`, `fit-animation-delay`, `fit-animation-stagger`, `fit-animation-easing`

### Statistics box

`stats`, `stats-title`, `stats-animation`, `stats-animation-delay`, `stats-animation-duration`, `stats-animation-easing`, `stats-animation-stagger`, `stats-entries`, `stats-mean`, `stats-rms`, `stats-stddev`, `stats-min`, `stats-max`, `stats-median`, `stats-entries-value`, `stats-mean-value`, `stats-rms-value`, `stats-stddev-value`, `stats-min-value`, `stats-max-value`, `stats-median-value`, `stats-entries-field`, `stats-mean-field`, `stats-rms-field`, `stats-stddev-field`, `stats-min-field`, `stats-max-field`, `stats-median-field`, `stats-color`, `stats-size`, `stats-font`, `stats-alpha`, `stats-fill`, `stats-fill-color`, `stats-fill-alpha`, `stats-border`, `stats-border-color`, `stats-border-alpha`, `stats-border-width`, `stats-radius`, `stats-width`, `stats-x`, `stats-y`

### Heatmap and color map

`contour-levels`, `contour-fill`, `contour-line-color`, `contour-line-width`, `density-bandwidth`, `density-grid-size`, `density-palette`, `hexbin-radius`, `hexbin-palette`, `heatmap-palette`, `heatmap-palette-stops`, `heatmap-palette-colors`, `heatmap-palette-red`, `heatmap-palette-green`, `heatmap-palette-blue`, `heatmap-palette-alpha`, `heatmap-min`, `heatmap-max`, `heatmap-cell-labels`, `heatmap-cell-label-size`, `heatmap-x-labels`, `heatmap-y-labels`, `heatmap-color-label`, `heatmap-cell-border-color`, `heatmap-cell-border-width`, `heatmap-title-size`, `heatmap-title-color`, `heatmap-title-offset-x`, `heatmap-title-offset-y`, `heatmap-tick-size`, `heatmap-tick-color`, `heatmap-tick-offset-x`, `heatmap-tick-offset-y`, `heatmap-colorbar-width`, `heatmap-colorbar-height`, `heatmap-colorbar-offset-x`, `heatmap-colorbar-offset-y`, `heatmap-colorbar-alpha`, `heatmap-range-label-size`, `heatmap-range-label-color`, `heatmap-range-label-offset-x`, `heatmap-range-label-offset-y`, `heatmap-min-label`, `heatmap-max-label`, `heatmap-color-label-size`, `heatmap-color-label-color`, `heatmap-color-label-offset-x`, `heatmap-color-label-offset-y`, `heatmap-cell-alpha`, `heatmap-cell-label-color`, `heatmap-cell-label-offset-x`, `heatmap-cell-label-offset-y`, `heatmap-x-tick-rotate`, `heatmap-y-tick-rotate`

### 3D surface

`surface-palette`, `surface-palette-stops`, `surface-palette-colors`, `surface-palette-red`, `surface-palette-green`, `surface-palette-blue`, `surface-palette-alpha`, `surface-function`, `surface-samples`, `surface-x-samples`, `surface-y-samples`, `surface-mesh-color`, `surface-mesh-width`, `surface-alpha`, `surface-z-label`, `surface-azimuth`, `surface-elevation`, `surface-zoom`, `surface-interactive`, `surface-animation`, `surface-animation-duration`, `surface-animation-delay`, `surface-animation-easing`, `surface-animation-stagger`, `surface-axis-color`, `surface-axis-width`, `surface-tick-color`, `surface-tick-size`, `surface-tick-offset-x`, `surface-tick-offset-y`, `surface-tick-count`, `surface-x-tick-count`, `surface-y-tick-count`, `surface-x-label-color`, `surface-x-label-size`, `surface-x-label-offset-x`, `surface-x-label-offset-y`, `surface-y-label-color`, `surface-y-label-size`, `surface-y-label-offset-x`, `surface-y-label-offset-y`, `surface-z-label-color`, `surface-z-label-size`, `surface-z-label-offset-x`, `surface-z-label-offset-y`, `surface-colorbar-width`, `surface-colorbar-height`, `surface-colorbar-offset-x`, `surface-colorbar-offset-y`, `surface-colorbar-alpha`, `surface-range-label-size`, `surface-range-label-color`, `surface-range-label-offset-x`, `surface-range-label-offset-y`, `surface-color-label`, `surface-color-label-size`, `surface-color-label-color`, `surface-color-label-offset-x`, `surface-color-label-offset-y`

### Vector-field plots

`quiver-scale`, `quiver-color`, `quiver-width`, `streamline-color`, `streamline-width`, `streamline-step`, `streamline-steps`

### Covariance plot

`covariance-fill-color`, `covariance-fill-alpha`, `covariance-line-color`, `covariance-sigma`

### Scientific diagrams

`diagram-background`, `diagram-border-color`, `diagram-label-color`, `diagram-show-names`, `diagram-show-details`, `diagram-tooltips`, `standard-model-quark-color`, `standard-model-quark-red`, `standard-model-quark-green`, `standard-model-quark-blue`, `standard-model-lepton-color`, `standard-model-boson-color`, `standard-model-higgs-color`, `standard-model-gravity-color`, `standard-model-coupling-color`, `standard-model-coupling-frame-width`, `standard-model-coupling-width`, `standard-model-highlight`, `standard-model-highlight-color`, `standard-model-highlight-effect`, `standard-model-highlight-duration`, `standard-model-highlight-delay`, `standard-model-dim-alpha`, `periodic-table-color-mode`, `periodic-table-highlight`, `periodic-table-highlight-color`, `periodic-table-highlight-effect`, `periodic-table-highlight-duration`, `periodic-table-highlight-delay`, `periodic-table-dim-alpha`, `periodic-table-show-lanthanides`, `periodic-table-show-actinides`

### Functions and general data

`function`, `function-samples`, `samples`, `variables`

### Other registered keys

`corner-bins`, `corner-label-size`, `efficiency-confidence`, `efficiency-total`, `forest-line-color`, `forest-zero`, `polar-grid-levels`, `polar-max`, `polar-start-angle`, `ratio-denominator`, `ratio-mode`, `ratio-reference`, `ternary-a-label`, `ternary-b-label`, `ternary-c-label`, `ternary-grid-levels`, `pie-colors`, `pie-inner-radius`, `pie-label-color`, `pie-label-position`, `pie-label-size`, `pie-labels`, `pie-start-angle`, `pie-stroke-color`, `pie-stroke-width`, `radar-fill-alpha`, `radar-grid-color`, `radar-grid-levels`, `radar-label-color`, `radar-label-size`, `radar-max`, `radar-min`, `radar-point-size`, `radar-stroke-width`, `ticks-top`, `ticks-right`, `ticks-bottom`, `ticks-left`

### Per-statistic item style keys

These keys are accepted dynamically for each statistics item:

`stats-entries-color`, `stats-entries-label-color`, `stats-entries-value-color`, `stats-entries-font`, `stats-entries-size`, `stats-entries-alpha`, `stats-mean-color`, `stats-mean-label-color`, `stats-mean-value-color`, `stats-mean-font`, `stats-mean-size`, `stats-mean-alpha`, `stats-stddev-color`, `stats-stddev-label-color`, `stats-stddev-value-color`, `stats-stddev-font`, `stats-stddev-size`, `stats-stddev-alpha`, `stats-rms-color`, `stats-rms-label-color`, `stats-rms-value-color`, `stats-rms-font`, `stats-rms-size`, `stats-rms-alpha`, `stats-min-color`, `stats-min-label-color`, `stats-min-value-color`, `stats-min-font`, `stats-min-size`, `stats-min-alpha`, `stats-max-color`, `stats-max-label-color`, `stats-max-value-color`, `stats-max-font`, `stats-max-size`, `stats-max-alpha`, `stats-median-color`, `stats-median-label-color`, `stats-median-value-color`, `stats-median-font`, `stats-median-size`, `stats-median-alpha`
