# Animation guide

NeoPresent has several animation systems because a slide transition, staged reveal, chart stroke, table build, and persistent highlight serve different presentation purposes. This guide explains when each system runs and how they compose.

## Animation model

| System               | Trigger                  | Typical purpose                                          |
| -------------------- | ------------------------ | -------------------------------------------------------- |
| Slide transition     | Entering a slide         | Establish a visual scene change                          |
| Reveal / fragment    | Navigation step          | Build an argument interactively                          |
| Text animation       | Slide render             | Type a heading or sentence                               |
| Block enter/exit     | Automatic or reveal step | Make space, shrink old content, replace content          |
| Table animation      | Slide render             | Introduce rows, columns, or cells                        |
| Plot-layer animation | Slide render             | Draw data, errors, fits, references, shapes, or surfaces |
| Highlight animation  | Persistent loop          | Keep attention on selected data                          |

Final-state PDF and PNG export disables motion and resolves reveals to completion. Exported documents therefore contain all final content without partially drawn plots or hidden fragments.

## Timing values

Durations and delays accept `ms` and `s`:

```text
animation-duration: 850ms
animation-delay: 1.4s
animation-easing: ease-out
```

CSS easing values are accepted where an `*-easing` field is available. Useful choices include `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, and `cubic-bezier(.2,.8,.2,1)`.

## Slide transitions

Put transition directives on a slide:

```markdown
@transition slide-up
@transition-duration 700ms

## New result
```

Supported transitions:

| Name          | Default duration | Effect                             |
| ------------- | ---------------: | ---------------------------------- |
| `none`        |                — | Immediate slide change (default)   |
| `fade`        |           300 ms | Opacity fade                       |
| `slide-left`  |           360 ms | Enters from the right, moving left |
| `slide-right` |           360 ms | Enters from the left, moving right |
| `slide-up`    |           360 ms | Enters from below                  |
| `slide-down`  |           360 ms | Enters from above                  |
| `zoom`        |           340 ms | Scale and fade                     |
| `flip`        |           420 ms | Short 3D turn                      |

Slides use `none` when `@transition` is absent. For an animated scientific
talk, `fade` and `slide-up` tend to preserve visual continuity.

## Staged list reveals

Place `@reveal` before a list:

```markdown
@reveal

- State the question
- Show the measurement
- Compare with the model
```

Space, Right Arrow, Down Arrow, Page Down, or Next reveals one item before advancing the slide. Reverse navigation hides the most recently revealed item first.

## Fragment reveals

Fragments stage arbitrary paragraphs or blocks:

```markdown
@reveal

:::fragment
First, establish the baseline.
:::

:::fragment zoom
Then reveal the deviation.
:::
```

Fragment effects are `fade`, `zoom`, `slide-left`, `slide-right`, `slide-up`, and `slide-down`.

## Text typing

Text animation directives apply to the next heading, paragraph, quote, or list:

```markdown
@text-animation typing
@text-animation-duration 2.2s
@text-animation-delay 400ms
@text-animation-cursor-color #38bdf8

## Building the signal model
```

The cursor remains visible while typing. Choose duration based on reading speed; 35–60 ms per character is usually comfortable.

## Block enter, shrink, and replace

Block transitions apply to plots, images, code, tables, cards, and other rendered blocks.

### Shrink an old block and grow a new block

````markdown
@block-exit shrink 35%
@block-transition-duration 900ms

```plot
type: scatter
x: 1,2,3,4,5
y: 2,5,3,8,6
draw: P
```

@block-enter grow
@block-transition-duration 700ms

```plot
type: histogram
values: 4,8,12,7,3
```
````

### Replace and release layout space

````markdown
@block-exit replace
@block-transition-duration 800ms

```plot
type: scatter
x: 1,2,3
y: 2,5,3
```

@block-enter fade
@block-transition-duration 650ms

![Replacement figure](assets/final-result.png)
````

`replace` collapses the old block’s layout height as it disappears. `shrink 35%` preserves the block but scales it to the requested percentage.

Block transitions run automatically by default. To make them wait for a navigation step, add this slide-level directive:

```markdown
@block-transition-trigger reveal
```

Enter effects are `fade`, `grow`, `zoom`, and `rise`. Exit effects are `shrink <percentage>` and `replace`. Use `@block-transition-delay` for an intentional pause.

### Replace complete multi-column states

When a plot and table should change together, apply the transition to each
complete `::columns` block, not independently inside its columns:

````markdown
@block-transition-trigger reveal
@block-exit replace
::columns widths: 55%, 45%
::column

```plot
type: histogram
source: data/first.json
bin-edges-field: edges
bin-counts-field: contents
```

::column

```table
source: data/first.csv
```

::end

@block-enter grow
@block-exit replace
::columns widths: 55%, 45%
::column

```plot
type: histogram
source: data/second.json
bin-edges-field: edges
bin-counts-field: contents
```

::column

```table
source: data/second.csv
```

::end
````

One Next press replaces the complete pair. A sequence may contain any number of
states. The final state should omit `@block-exit replace` unless it really must
exit again; otherwise that unused exit creates an extra navigation step before
the next slide. Likewise, use one top-level replacement sequence instead of two
parallel per-column sequences, which would otherwise consume separate reveal
counts.

## Table animations

Place table directives immediately before a Markdown table:

```markdown
@table-animation rows
@table-animation-duration 900ms
@table-animation-delay 300ms
@table-animation-stagger 120ms
@table-animation-easing cubic-bezier(.2,.8,.2,1)

| Energy | Events | Efficiency |
| -----: | -----: | ---------: |
|    200 |   1420 |       0.82 |
|    510 |   2380 |       0.89 |
|  13000 |   9100 |       0.94 |
```

| Animation | Behavior                                |
| --------- | --------------------------------------- |
| `fade`    | Fade the complete table                 |
| `grow`    | Grow the complete table                 |
| `rows`    | Reveal the header and rows with stagger |
| `columns` | Reveal cells by column                  |
| `cells`   | Grow individual cells in reading order  |

Multiple tables are independent: repeat the directives before each table.

### Animated table emphasis

```markdown
@table-highlight-row 2
@table-highlight-column Efficiency
@table-highlight-cell 3,Events
@table-highlight-effect flow
@table-highlight-color #fbbf24
@table-highlight-duration 1.8s
@table-highlight-delay 900ms

| Energy | Events | Efficiency |
| -----: | -----: | ---------: |
|    200 |   1420 |       0.82 |
|    510 |   2380 |       0.89 |
|  13000 |   9100 |       0.94 |
```

Rows and columns are one-based; a column can also be selected by header name. Effects are `glow` and `flow`.

## Plot animations

The common plot timing fields are:

```text
animation: draw
animation-duration: 1.2s
animation-delay: 500ms
animation-easing: ease-out
```

### Reveal-triggered internal stages

Use internal stages when one plot or scientific diagram should consume a fixed
number of Next presses without applying `@reveal` to neighboring text:

````markdown
```plot
type: scatter
animation-trigger: reveal
reveal-stages: 4
reveal-stage-default: 4

series: Data | x: 1,2,3 | y: 2,4,6 | draw: P | reveal-stage: 1
shape: line | x: 1 | y: 0 | x2: 1 | y2: 6 | reveal-stage: 2
fit: a + b*x
fit-params: a=0,b=2
fit-reveal-stage: 3
annotation: Final result | x: .75 | y: .20 | reveal-stage: 4
```
````

Stage 1 is visible when the slide first appears. Each Next press adds the next
stage; a previous stage remains at its completed state and does not replay.
Series, uncertainties, shapes, references, annotations, fits, and fit groups
can each declare a stage. `series-loop` entries obey the same stage setting.

Do not put a block-level `@reveal` before the fence unless the whole plot should
also be a separate outer reveal item. Keeping the trigger inside the fence
prevents unrelated lists or fragments from consuming the plot's stage count.

Feynman vertices and edges use `reveal-stage`. Standard Model and periodic-table
highlights use `stage` on each `diagram-highlight` entry:

````markdown
```plot
type: standard-model
animation-trigger: reveal
reveal-stages: 4
reveal-stage-default: 4
diagram-highlight: generation-I | label: First generation | stage: 1
diagram-highlight: generation-II | label: Second generation | stage: 2
diagram-highlight: generation-III | label: Third generation | stage: 3
diagram-highlight: force-bosons | label: Force bosons | stage: 4
```
````

With `--steps`, internal stages normally become separate export pages. Add
`export-stages: false` inside a `plot` or `feynman` fence to keep all live stages
but export that block once at its completed state.

| Animation | Best for                              | Behavior                                         |
| --------- | ------------------------------------- | ------------------------------------------------ |
| `draw`    | Lines, fits, references, error marks  | Reveals the geometry along its natural direction |
| `fade`    | Any plot layer                        | Fades the layer in                               |
| `grow`    | Points, bars, errors, shapes          | Scales marks from their origin                   |
| `rise`    | Bars, points, heatmap cells, surfaces | Moves/scales upward into place                   |

For pie and donut charts, all four animation names reveal slices in source
order. `draw` and `grow` expand each wedge from the chart center; `fade`
fades slices in; and `rise` moves them into place. NeoPresent automatically
staggers the slices within the configured duration.

Radar charts animate each series polygon independently. `draw` and `grow`
expand the polygon from the chart center, while `fade` and `rise` use their
standard plot-layer motion. Put timing fields inside a `series:` entry to
sequence comparisons.

Ratio, efficiency, ROC, polar, stacked-bar, ternary, forest, and corner plots
use the same `animation`, `animation-duration`, `animation-delay`, and
`animation-easing` fields. Multi-series plot families also accept those
fields inside each `series:` entry.

### Data, uncertainty, and fit timeline

````markdown
```plot
type: scatter
series: Measured | source: data/results.json | x: x | y: value | draw: P | color: #111827 | legend: true | legend-order: 1 | animation: draw | animation-duration: 1s
uncertainty: Statistical | error: estat | style: bar | color: #dc2626 | legend: true | legend-order: 2 | animation: grow | animation-delay: 1s | animation-duration: 800ms
uncertainty: Systematic | error: esys | style: box | fill-color: #9ca3af | fill-alpha: .2 | legend: true | legend-order: 3 | animation: grow | animation-delay: 1.8s | animation-duration: 800ms
fit: a * exp(-0.5*((x-b)/c)^2)
fit-params: a=75,b=0,c=1.5
fit-series: Measured
fit-draw: true
fit-color: #ef4444
fit-legend: true
fit-legend-label: Gaussian fit
fit-legend-order: 4
fit-animation: draw
fit-animation-delay: 2.6s
fit-animation-duration: 1.5s
```
````

Legend entries synchronize with their corresponding layer. The example creates this sequence:

1. `0.0s`: measured points and their legend entry begin.
2. `1.0s`: statistical bars and legend entry begin.
3. `1.8s`: systematic boxes and legend entry begin.
4. `2.6s`: fit curve and legend entry begin.

### Multiple series

Put animation fields inside each `series:` line to control them independently:

````markdown
```plot
series: Data A | x: 1,2,3 | y: 2,4,6 | draw: PL | animation: draw | animation-duration: 1s
series: Data B | x: 1,2,3 | y: 1,3,5 | draw: PL | animation: draw | animation-delay: 1s | animation-duration: 1s
```
````

### Functions, references, and shapes

Function, `reference:`, and `shape:` entries accept their own animation, duration, delay, and easing. This is preferable to plot-global timing when layers must enter in a narrative order.

## Heatmap animations

Heatmaps support `fade`, `grow`, `rise`, and `draw`:

````markdown
```plot
type: heatmap
x: 0,1,2,0,1,2
y: 0,0,0,1,1,1
values: 2,4,6,3,8,5
animation: grow
animation-duration: 900ms
animation-delay: 300ms
animation-easing: ease-out
```
````

Cells are staggered automatically. Cell values fade after the cell geometry begins, keeping labels readable during the build.

## 3D surface animations

````markdown
```plot
type: surface
surface-function: sin(sqrt(x*x+y*y))
x-min: -6
x-max: 6
y-min: -6
y-max: 6
surface-animation: wave
surface-animation-duration: 2s
surface-animation-delay: 400ms
surface-animation-easing: cubic-bezier(.2,.8,.2,1)
surface-animation-stagger: 24
```
````

| Animation | Behavior                                    |
| --------- | ------------------------------------------- |
| `fade`    | Fade the complete surface scene             |
| `grow`    | Scale the complete surface scene            |
| `rise`    | Raise the complete surface scene into place |
| `draw`    | Reveal faces progressively                  |
| `wave`    | Reveal faces with a rising wave             |

`surface-animation-stagger` is measured in milliseconds between faces. If omitted, NeoPresent computes a stagger that fits the requested total duration.

The initial animation state is independent from the interactive camera state. Rotating or zooming a surface does not replay its draw animation.

## Feynman diagram animation

Feynman settings and individual edges or vertices accept `animation`, `animation-duration`, `animation-delay`, `animation-stagger`, and `animation-easing`. `draw` traces propagator paths; other supported chart motions fade, grow, or rise diagram elements.

## Persistent highlights

Highlights loop after their delay and are separate from one-time entrance animation:

````markdown
```plot
type: scatter
x: 1,2,3,4,5
y: 2,5,3,8,6
draw: P
animation: draw
animation-duration: 900ms
highlight-index: 2,4
highlight-effect: glow
highlight-color: #fbbf24
highlight-duration: 1.6s
highlight-delay: 1s
```
````

Use `glow` for pulsing emphasis and `flow` for a moving light effect. Highlights can target plots, table cells, rows, and columns.

## Overview behavior

Overview thumbnails are mounted at their completed state and cached. Moving
between cards or cycling Grid, Gallery, and Helix changes focus and camera state
without replaying in-slide animations or rebuilding plot/media contents.

## Presenter and viewer synchronization

- Presenter navigation controls the audience slide and reveal state.
- Presenter interaction with a 3D surface updates the viewer camera.
- Viewer-only 3D interaction remains local until the presenter changes the camera again.
- Viewer zoom does not restart chart or surface animation.

## Designing a smooth sequence

For a readable scientific build:

1. Keep slide transitions between 300 and 700 ms.
2. Introduce the primary data first.
3. Add uncertainty layers 500–1000 ms apart.
4. Draw the fit after the data is established.
5. Start persistent highlights only after entrance animation completes.
6. Avoid animating every decorative element; preserve motion for information structure.

## Troubleshooting

### Animation only runs after refresh

Check that the animation fields belong to the intended block or plot layer. Automatic block transitions do not need `@reveal`; manual transitions require `@block-transition-trigger reveal`.

### Animation replays during interaction

Use current builds where surface draw state and camera state are independent. Rebuild after copying viewer changes.

### A later fit controls an earlier fit

Keep each fit’s settings together immediately after its target series group. Fit configuration is scoped in declaration order.

### Export contains hidden content

Use the CLI final-state exporter. Browser screenshots taken during a live animation can capture intermediate frames; NeoPresent export explicitly disables motion and resolves all reveals. Use `--steps` for separate replacement/internal-stage pages, or `export-stages: false` inside one staged scientific block when only its completed state should be printed.
