# Plotting guide

NeoPresent plots are native slide content: they inherit themes, scale with the slide, render in presenter previews and overview thumbnails, support interaction in the viewer, and export through the same final-state renderer.

This guide explains common workflows. For every accepted type, marker symbol,
ROOT alias, line style, series/uncertainty/reference/shape field, and all 424
registered plot-level keys, use the [complete plot settings reference](plot-settings-reference.md).

## Contents

1. [Plot anatomy](#plot-anatomy)
2. [Basic 2D plots](#basic-2d-plots)
3. [Series and external data](#series-and-external-data)
4. [Functions and mixed plots](#functions-and-mixed-plots)
5. [Errors and uncertainty layers](#errors-and-uncertainty-layers)
6. [Fits and fit bands](#fits-and-fit-bands)
7. [Legends and ordering](#legends-and-ordering)
8. [Reference lines and shapes](#reference-lines-and-shapes)
9. [Axes, scales, labels, and LaTeX](#axes-scales-labels-and-latex)
10. [Highlights](#highlights)
11. [Heatmaps](#heatmaps)
12. [3D surfaces](#3d-surfaces)
13. [Palettes](#palettes)
14. [Plot animation](#plot-animation)
15. [Captions](#captions)

## Plot anatomy

Use a fenced block whose language is `plot`:

````markdown
```plot
type: scatter
title: Example measurement
x: 1,2,3,4
y: 2.1,3.8,3.2,5.4
x-label: $x$
y-label: $f(x)$
draw: PL
```
````

The plot-level fields establish defaults. A `series:` line can override those defaults for one dataset. Uncertainty, fit, function, reference, and shape entries attach additional independently styled layers.

## Basic 2D plots

### Scatter and line

````markdown
```plot
type: scatter
x: 1,2,3,4,5
y: 2,5,3,8,6
draw: PL
symbol: circle
data-color: #0284c7
data-size: 3
```
````

`draw` uses a compact ROOT-inspired vocabulary:

| Token                                  | Meaning                              |
| -------------------------------------- | ------------------------------------ |
| `P`                                    | Point markers                        |
| `L`                                    | Connecting line                      |
| `E`                                    | Error bars                           |
| `B`                                    | Error boxes or band where applicable |
| combinations such as `PE`, `PL`, `PLE` | Draw multiple representations        |

Use `symbol` or `data-symbol` for markers. Common values include `circle`, `square`, `triangle-up`, `triangle-down`, `diamond`, `cross`, `plus`, `star`, and their open variants.

The full set also includes compound ROOT-style markers and aliases such as
`kFullCircle`, `kOpenSquare`, and `kFullFourTrianglesX`. See
[Marker symbols](plot-settings-reference.md#marker-symbols).

Line styles are `solid`, `dashed`, `dotted`, `dash-dot`, `dash-dot-dot`, and
ROOT-compatible `root-1` through `root-10`. See
[Line styles](plot-settings-reference.md#line-styles) for the exact dash patterns.

### Histogram

````markdown
```plot
type: histogram
values: 4,8,12,7,3,9,11,5
bins: 6
fill: true
data-color: #38bdf8
data-alpha: 0.72
bin-gap: 2
bin-lines: true
x-label: Energy
y-label: Events
```
````

For raw measurements, `bins` may be a count, or use a ROOT-style fixed range:

```text
bins: 30
x-min: 0
x-max: 15
```

The default histogram `y-max` is 1.1 times the largest visible bin. Explicit
`x-min` and `x-max` clip filled bars, outline steps, hover targets, and fitted
curves to the visible frame.

#### Pre-binned histogram data

For large samples, pre-binned edges and counts are faster and exactly
reproducible. A single JSON object works without an extra array:

```json
{
  "edges": [0, 1, 2, 3, 5, 8],
  "contents": [12, 35, 81, 42, 9],
  "entries": 179,
  "mean": 2.76,
  "stddev": 1.31
}
```

````markdown
```plot
type: histogram
source: data/measurement.json
bin-edges-field: edges
bin-counts-field: contents
stats: entries, mean, stddev
stats-entries-field: entries
stats-mean-field: mean
stats-stddev-field: stddev
fill: false
```
````

Edges must contain one more value than counts and be strictly increasing.
Explicit statistics may also use `stats-entries-value`, `stats-mean-value`, and
`stats-stddev-value`.

#### Histogram series and a right y axis

Multiple pre-binned histograms can share a frame. The left and right axes
calculate their ranges independently:

````markdown
```plot
type: histogram
x-label: Invariant Mass (GeV)
y-label: Reconstructed counts
right-y-label: Primary counts
fill: false
legend: true
y-axis-digits: 1
right-y-axis-digits: 1

series: Reconstructed | source: data/reco.json | x: edges | y: contents | color: #0000ff | legend: true | legend-order: 1 | stats: entries, mean, stddev | stats-x: .70 | stats-y: .08 | stats-fill: false
series: Primary | source: data/primary.json | x: edges | y: contents | color: #ff0000 | y-axis: right | legend: true | legend-order: 2 | stats: entries, mean, stddev | stats-x: .70 | stats-y: .42 | stats-fill: false
```
````

Every series accepts the complete `stats-*` family, so boxes can have separate
positions, colors, fills, borders, alpha, width, fonts, sizes, item colors, and
animation. Useful controls include:

```text
stats-title: Reconstructed
stats-x: .70
stats-y: .08
stats-width: 150
stats-fill: false
stats-fill-color: #ffffff
stats-fill-alpha: .75
stats-border: true
stats-border-color: #0000ff
stats-color: #0000ff
stats-mean-color: #cc0000
stats-stddev-color: #cc0000
```

`stats-x` and `stats-y` use normalized plot-box coordinates. A smaller
`stats-width` reduces the label/value gap. Set `x-label:` or `y-label:` to an
empty value when that axis should have no title.

### Bar plot

````markdown
```plot
type: bar
labels: 200 GeV, 510 GeV, 13 TeV
values: 1420,2380,9100
data-color: #8b5cf6
```
````

## Series and external data

### Multiple inline series

Each `series:` line is independent. Use `|` between its fields:

````markdown
```plot
type: scatter
series: Data A | x: 1,2,3,4 | y: 2,3,5,7 | draw: PE | error: .2,.3,.3,.4 | color: #dc2626 | legend: true | legend-order: 1
series: Data B | x: 1,2,3,4 | y: 1,4,4,6 | draw: PL | symbol: square | color: #2563eb | legend: true | legend-order: 2
x-label: $x$
y-label: Yield
legend-position: top-right
```
````

### JSON and CSV data

`source` resolves relative to the Markdown deck. Select named columns with `x`, `y`, and error fields:

````markdown
```plot
type: scatter
series: Measured | source: data/jpsi/results.json | x: rapidity | y: cross_section | error: statistical | draw: PE | color: #111827
x-label: Rapidity
y-label: Cross section [nb]
```
````

For a CSV file, the first row supplies column names:

```csv
rapidity,cross_section,statistical
-2.0,18.2,1.4
-1.0,31.5,1.8
0.0,39.8,2.1
```

### Generated series loops

Use placeholders to expand similarly named fields:

````markdown
```plot
type: scatter
series-loop: Trial {i} | source: data/ensemble.json | x: rapidity | y: y_{i} | error: error_{i} | from: 1 | to: 20 | draw: PE | visible: false | color: #ef4444 | data-alpha: .18
```
````

## Functions and mixed plots

### Standalone 2D function

````markdown
```plot
type: function
function: sin(x) * exp(-0.1 * abs(x))
x-min: -10
x-max: 10
samples: 300
x-label: $x$
y-label: $f(x)$
data-color: #38bdf8
data-size: 3
draw: L
```
````

### Data and functions together

Function and data entries can coexist in one graph:

````markdown
```plot
type: scatter
series: Measurement | x: -2,-1,0,1,2 | y: 1.1,2.5,4.0,2.7,1.2 | error: .2,.25,.3,.25,.2 | draw: PE | color: #111827 | legend: true | legend-order: 1
function: 4 * exp(-0.5 * (x / 1.1)^2) | label: Gaussian model | x-min: -3 | x-max: 3 | samples: 240 | draw: L | color: #ef4444 | legend: true | legend-order: 2
x-label: $x$
y-label: Counts
```
````

Expressions support normal arithmetic and common functions such as `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `abs`, `pow`, `min`, and `max`.

## Errors and uncertainty layers

### Direct symmetric and asymmetric errors

````markdown
```plot
type: scatter
x: 1,2,3,4
y: 4,6,5,8
error: .4,.5,.35,.6
x-error: .1,.1,.15,.12
draw: PE
```
````

Use `error-low` and `error-high`, or `x-error-low` and `x-error-high`, for asymmetric errors.

### Named uncertainty layers

Uncertainty entries receive their own legend, style, visibility, animation, and order:

````markdown
```plot
type: scatter
series: Measured | source: data/results.json | x: x | y: value | draw: P | color: #111827 | legend: true | legend-order: 1
uncertainty: Statistical | error: estat | style: bar | color: #dc2626 | width: 2 | legend: true | legend-order: 2 | animation: grow | animation-delay: 1s
uncertainty: Systematic | error: esys | style: box | color: #6b7280 | fill-color: #9ca3af | fill-alpha: .18 | legend: true | legend-order: 3 | animation: grow | animation-delay: 2s
```
````

Typical styles are `bar`, `box`, and `band`. A layer can be hidden with `visible: false` and omitted from the legend with `legend: false`.

## Fits and fit bands

Fits are scoped in declaration order. Place fit settings immediately after the data or series group they describe. This allows multiple fits to have separate legends and animation settings.

````markdown
```plot
type: scatter
series: Sampled | source: data/results.json | x: rapidity | y: y_0 | draw: P | color: #ef4444 | legend: true | legend-order: 1

fit: a * exp(-0.5*((x-b)/c)^2)
fit-params: a=75, b=0, c=1.5
fit-series: Sampled
fit-errors: true
fit-x-min: -4
fit-x-max: 4
fit-color: #ef4444
fit-width: 2
fit-alpha: .8
fit-legend: true
fit-legend-label: Gaussian fit
fit-legend-order: 2
fit-animation: draw
fit-animation-duration: 1.5s
fit-animation-delay: 1s
```
````

Useful fit controls:

| Group      | Fields                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Selection  | `fit-series`, `fit-all`, `fit-range`, `fit-x-min`, `fit-x-max`                                                    |
| Parameters | `fit-params`, `fit-bounds`, `fit-fixed`, `fit-method`                                                             |
| Appearance | `fit-color`, `fit-width`, `fit-alpha`, `fit-line-style`, `fit-samples`                                            |
| Results    | `fit-results`, `fit-quality`, `fit-pvalue`, `fit-errors`, `fit-correlation`                                       |
| Legend     | `fit-legend`, `fit-legend-label`, `fit-legend-order`                                                              |
| Animation  | `fit-animation`, `fit-animation-duration`, `fit-animation-delay`, `fit-animation-stagger`, `fit-animation-easing` |

Enable a confidence band with `fit-band: true`. Control it with `fit-band-kind`, `fit-band-sigma`, `fit-band-color`, `fit-band-alpha`, outline options, legend options, and the `fit-band-animation-*` family.

## Legends and ordering

````markdown
```plot
legend: true
legend-position: top-right
legend-offset-x: -12
legend-offset-y: 8
legend-columns: 1
legend-size: 18
legend-color: #1f2937
legend-alpha: .95
```
````

Legend entries sort numerically by `legend-order`, regardless of whether the entry comes from a series, uncertainty, fit, fit band, function, or reference line. Entries without an explicit order follow ordered entries in declaration order.

Animated legend entries appear with the visual layer they describe. Give the layer and legend one source of timing by putting animation fields on that series, uncertainty, fit, or reference entry.

## Reference lines and shapes

### Multiple reference values

````markdown
```plot
type: scatter
x: 1,2,3,4,5
y: 2,5,3,8,6
reference-x: 2.8,3.7
reference-color: #7c3aed
reference-width: 2
reference-dash: 6 4
reference-label: false
```
````

For individually named and animated references, use independent `reference:` entries:

````markdown
```plot
reference: Signal window | axis: x | value: 2.8 | color: #2563eb | label: true | legend: true | legend-order: 3 | animation: draw | animation-delay: 1.5s
reference: Control boundary | axis: x | value: 3.7 | color: #dc2626 | label: false | legend: true | legend-order: 4 | animation: draw | animation-delay: 2s
```
````

Shapes use axis coordinates and can be highlighted or animated:

````markdown
```plot
shape: rect | label: region | x1: 1.5 | x2: 2.5 | y1: 0 | y2: 8 | fill: #fbbf24 | fill-alpha: .16 | color: #d97706 | animation: grow | animation-duration: 700ms
```
````

## Axes, scales, labels, and LaTeX

Use `x-scale` or `y-scale` with `linear` or `log`. Fix visible ranges with `x-min`, `x-max`, `y-min`, and `y-max`. A second vertical axis uses `y-axis: right` on its series plus the `right-*` fields.

````markdown
```plot
x-label: $p_{T}$ [GeV/$c$]
y-label: $dN/dp_{T}$
x-label-size: 30
x-label-color: #0f172a
x-label-offset-x: 0
x-label-offset-y: 12
y-label-size: 30
tick-size: 22
tick-color: #334155
axis-color: #475569
axis-width: 2
```
````

Math wrapped in `$...$` is supported in plot titles, axis titles, tick labels, heatmap labels, surface labels, color-bar values and titles, legends, and chart annotations where those fields accept text.

ROOT-like frame and tick controls are available independently:

```text
frame-top: true
frame-right: true
ticks-top: true
ticks-right: true
ticks-bottom: true
ticks-left: true
minor-ticks: true
tick-divisions: 5
tick-length: 8
minor-tick-length: 4
```

Use `y-axis-digits` to limit the digits shown on y ticks and move a common
power-of-ten multiplier above the frame. The right axis has its own setting:

```text
y-axis-digits: 2
right-y-axis-digits: 2
```

For example, values around several hundred display compact tick values with
`×10²` above the corresponding axis.

## Captions

All plots accept a caption below the plot canvas:

```text
caption: Phys. Rev. D 101, 052006
caption-size: 28px
caption-color: #244a3a
caption-align: center
caption-offset-x: 0px
caption-offset-y: 10px
```

Caption text supports inline styles and math. Offsets are CSS lengths; positive
x moves right and positive y moves down.

## Highlights

Highlights work on data points and corresponding plot marks:

````markdown
```plot
type: scatter
x: 1,2,3,4,5
y: 2,5,3,8,6
draw: P
highlight-index: 2,4
highlight-effect: glow
highlight-color: #fbbf24
highlight-duration: 1.6s
highlight-delay: 400ms
```
````

Supported effects are `glow` and `flow`. Indexes are one-based. Put highlight fields inside a `series:` entry to target only that series.

## Heatmaps

````markdown
```plot
type: heatmap
x: 0,1,2,0,1,2,0,1,2
y: 0,0,0,1,1,1,2,2,2
values: 1,2,3,2,5,4,3,4,8
heatmap-x-labels: Low,Medium,High
heatmap-y-labels: A,B,C
x-label: Selection
y-label: Category
heatmap-color-label: $N_{events}$
heatmap-palette: viridis
heatmap-cell-labels: true
heatmap-cell-alpha: .95
heatmap-cell-border-color: #ffffff
heatmap-cell-border-width: 2
animation: grow
animation-duration: 900ms
```
````

Heatmap tooltips use the displayed tick labels rather than only numeric coordinates. Customize:

- Titles: `heatmap-title-size`, `heatmap-title-color`, and title offsets.
- Ticks: `heatmap-tick-size`, `heatmap-tick-color`, offsets, and x/y rotation.
- Cells: alpha, labels, label size/color/offset, and border color/width.
- Color bar: width, height, alpha, offsets, min/max labels, range-label style, and color-label style.
- Palette: preset name or custom stops/colors/RGBA channels.

## 3D surfaces

### Function surface

````markdown
```plot
type: surface
surface-function: sin(sqrt(x*x + y*y))
x-min: -6
x-max: 6
y-min: -6
y-max: 6
surface-x-samples: 36
surface-y-samples: 36
x-label: $x$
y-label: $y$
surface-z-label: $f(x,y)$
surface-palette: kBird
surface-mesh-color: rgba(15,23,42,.55)
surface-mesh-width: 1
surface-alpha: .92
surface-interactive: true
surface-animation: wave
surface-animation-duration: 1.8s
```
````

### External grid data

````markdown
```plot
type: surface
source: data/surface.json
x: x
y: y
value: z
surface-palette: kViridis
surface-azimuth: 45
surface-elevation: 28
surface-zoom: 1
```
````

The data must form a grid containing at least two unique x values and two unique y values. Drag to rotate and use the wheel or trackpad inside the 3D region to zoom the camera. Presenter interactions synchronize to the viewer; local viewer interaction keeps its own camera until the presenter next changes it.

### Multiple data and function surfaces

Use `series:` and `function:` entries in a surface plot. Each overlay can control color or palette, alpha, mesh appearance, visibility, legend, and animation independently.

### Surface controls

| Area        | Fields                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| Camera      | `surface-azimuth`, `surface-elevation`, `surface-zoom`, `surface-interactive`     |
| Mesh        | `surface-mesh-color`, `surface-mesh-width`, `surface-alpha`                       |
| Axes        | `surface-axis-color`, `surface-axis-width`                                        |
| Ticks       | `surface-tick-color`, `surface-tick-size`, offsets, total/x/y tick counts         |
| Axis labels | per-axis color, size, x offset, and y offset                                      |
| Color bar   | width, height, alpha, offsets, range-label style, color-label text/style          |
| Animation   | `fade`, `grow`, `rise`, `draw`, `wave`, plus duration, delay, easing, and stagger |

## Palettes

Palette names are case-insensitive and may use the ROOT-style `k` prefix. Available ROOT-compatible presets include:

`kDeepSea`, `kGreyScale`, `kDarkBodyRadiator`, `kBlueYellow`, `kRainBow`, `kInvertedDarkBodyRadiator`, `kBird`, `kCubehelix`, `kGreenRedViolet`, `kBlueRedYellow`, `kOcean`, `kColorPrintableOnGrey`, `kAlpine`, `kAquamarine`, `kArmy`, `kAtlantic`, `kAurora`, `kAvocado`, `kBeach`, `kBlackBody`, `kBlueGreenYellow`, `kBrownCyan`, `kCMYK`, `kCandy`, `kCherry`, `kCoffee`, `kDarkRainBow`, `kDarkTerrain`, `kFall`, `kFruitPunch`, `kFuchsia`, `kGreyYellow`, `kGreenBrownTerrain`, `kGreenPink`, `kIsland`, `kLake`, `kLightTemperature`, `kLightTerrain`, `kMint`, `kNeon`, `kPastel`, `kPearl`, `kPigeon`, `kPlum`, `kRedBlue`, `kRose`, `kRust`, `kSandyTerrain`, `kSienna`, `kSolar`, `kSouthWest`, `kStarryNight`, `kSunset`, `kTemperatureMap`, `kThermometer`, `kValentine`, `kVisibleSpectrum`, `kWaterMelon`, `kCool`, `kCopper`, `kGistEarth`, `kViridis`, and `kCividis`.

### Custom palette

Define normalized stops and CSS colors:

````markdown
```plot
surface-palette: custom
surface-palette-stops: 0,.35,.7,1
surface-palette-colors: rgba(15,23,42,0),#2563eb,#facc15,#dc2626
surface-colorbar-alpha: .9
```
````

Or define ROOT-style channels:

````markdown
```plot
surface-palette-stops: 0,.5,1
surface-palette-red: 0,.2,1
surface-palette-green: 0,.8,.2
surface-palette-blue: .3,1,0
surface-palette-alpha: 0,.75,1
```
````

The color-bar alpha defaults to the surface alpha unless explicitly overridden.

## Plot animation

Plot layers share four timing fields:

```text
animation: draw
animation-duration: 1.2s
animation-delay: 500ms
animation-easing: cubic-bezier(.2,.8,.2,1)
```

Common plot animations are `draw`, `fade`, `grow`, and `rise`. Surfaces additionally support `wave`. Apply timing inside an individual `series:`, `uncertainty:`, `fit`, `reference:`, `shape:`, or function entry for independent sequencing. See the [animation guide](animations.md) for complete behavior and synchronized examples.
