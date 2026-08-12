<div align="center">

# NeoPresent - The ultimate academic/scientific presentation framework

</div>

NeoPresent is a Markdown-first presentation framework for academic and scientific talks. It combines a themeable 
audience viewer, a presenter dashboard, staged animation, scientific plots and diagrams, annotations, and vector-
oriented PDF export.

It was developed specifically for my Ph.D defense presentation two weeks before the defense date. Since I am 
majoring in nuclear physics, it is specifically optimized for the data plotting and influenced by the 
[CERN ROOT](https://root.cern/) plot style, like **marker symbols, line styles, color palettes**. Specially, I add 
the **Standard Model**, **Feynman Diagram** and **Periodic Table** plot with fancy animations.

The motivation is to make the timing perfect with the flow of your expression aligned with the data/plot 
information reveal. Thus, the neopresent is an animation-rich framework with built-in supporting data plotting and 
fitting, almost every element in the slides is animatable.

You don't even need to write the markdown, just make it as your AI skill or just let your AI go into the folder 
to analyze the framework and ask it to make slides for you based on your papers/thesis.

If you like the project, please give me a star! ⭐

## Highlights

- **Markdown-first authoring** — Create complete presentations using readable Markdown and split large decks across multiple included files.
- **Presenter and viewer modes** — Control the presentation from a dedicated presenter window with notes, timers, previews, and synchronized navigation.
- **Live view for editting** — Live update slides when editting the markdown slide's contents.
- **Scientific plotting** — Built-in scatter plots, histograms, uncertainties, fits, dual axes, statistics boxes, annotations, legends, and ROOT-inspired styling.
- **Rich scientific notation** — Render inline and display mathematics with LaTeX syntax throughout headings, tables, captions, labels, and notes.
- **Staged animations** — Reveal content, replace blocks, animate plot components, and control multi-stage scientific diagrams step by step.
- **Interactive overview modes** — Navigate slides using filmstrip, grid, helix, and animated 3D gallery views.
- **Native PDF support** — Embed PDF figures, inspect them in viewer mode, and preserve vector content during PDF export where possible.
- **High-quality export** — Export complete presentations to PDF, optionally including speaker notes, animation steps, and annotations.
- **Presentation annotations** — Draw directly on slides using multiple stroke styles, including a chalk-style pen, and export the results.
- **Tables and external data** — Load CSV tables and JSON plot data, with styling, highlighting, mathematics, and animation controls.
- **Scientific diagram blocks** — Create Feynman diagrams, Standard Model charts, periodic tables, and other structured visualizations directly in Markdown.
- **Flexible layouts** — Arrange content using columns, groups, offsets, scaling, alignment, captions, and configurable slide dimensions.
- **Theme system** — Customize colors, typography, backgrounds, footers, page numbers, frames, and other presentation-wide styles.
- **Keyboard-driven presenting** — Navigate slides, pause animations, enter overview or fullscreen modes, annotate, and open contextual help using shortcuts.
- **Responsive rendering** — Slide contents scale proportionally with the slide canvas across viewer, presenter, windowed, and fullscreen modes.
- **Local-first workflow** — Run presentations locally with a fast development server and use external assets without uploading the deck to a third-party service.
- **Hover data value tips** — Hover data value tips for built-in plots.

## Limitations
- **Export annotations do not support storke styles due to PDF vector drawing limits, so the chalk stroke will be a solid line for export PDF annotations**

## Quick start

Requirements: Node.js 22 or later and pnpm 11 or later.
For example, in macOS you can just do `brew install node pnpm`

```sh
git clone https://github.com/westNeighbor/NeoPresent
cd NeoPresent
```

```sh
pnpm install
pnpm setup:cli
neopresent new my-talk
neopresent serve presentations/my-talk/presentation.md
```
Or if you are eager to check my example slides, change the markdown to see live updates!
```sh
neopresent serve examples/defense_slides/presentation.md
```

Open the viewer at `http://localhost:9090` and the presenter dashboard at `http://localhost:9090/presenter.html` 
and press `H` to check and try the shortcuts. With/without Presenter side openning, the shortcuts in Viewer side 
will be different.

Useful commands:

```sh
neopresent check presentations/my-talk/presentation.md
neopresent outline presentations/my-talk/presentation.md
neopresent build
neopresent export presentations/my-talk/presentation.md --format pdf
```

Use `neopresent help` for the command list or `neopresent help export` for command-specific options.

## Minimal presentation

````markdown
@theme paper
@aspect 16:9
@footer-left My Laboratory
@footer-right {{today}}
@page-number on
@page-total on

# Measurement overview

A short explanation with inline math $J/\psi$.

---

## Data and model

```plot
type: scatter
x: -2,-1,0,1,2
y: 1.2,2.7,4.1,2.8,1.1
draw: PE
error: 0.2,0.3,0.25,0.3,0.2
animation: draw
```
````

Separate slides with `---`. Put deck-wide directives before the first slide, slide directives after a separator, and block directives immediately before the content they affect.

For a large talk, keep the main file short:

```markdown
@theme paper
@include sections/opening.md
@include sections/motivation.md
@include sections/results.md
@include sections/conclusion.md
```

Included paths are relative to the file containing `@include`; asset and data paths continue to resolve from the main presentation directory.

## Documentation

The documentation is split into task-focused guides so settings are easier to find:

| Guide                                                     | Covers                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Documentation index](docs/README.md)                     | Guide map and recommended reading order                                                            |
| [Authoring](docs/authoring.md)                            | Deck structure, Markdown, math, tables, notes, references, blocks, and includes                    |
| [Layout and themes](docs/layout-and-themes.md)            | Alignment, columns, groups, size, offsets, footers, page numbers, TOC, and themes                  |
| [Media and diagrams](docs/media-and-diagrams.md)          | Image, PDF, video, audio, Mermaid, Feynman, Standard Model, and periodic-table blocks              |
| [Plotting](docs/plotting.md)                              | Scientific plots, histograms, axes, fits, legends, annotations, and external data                  |
| [Complete plot settings](docs/plot-settings-reference.md) | Every accepted plot type, marker, ROOT alias, line style, entry field, and plot-level key          |
| [Complete settings reference](docs/settings-reference.md) | Every deck, slide, block, layout, table, media, code, and Feynman control                          |
| [Animation](docs/animations.md)                           | Reveals, fragments, replacement blocks, staged scientific graphics, and synchronization            |
| [Presenting and controls](docs/presenting.md)             | Viewer and presenter controls, PDF inspection, overview modes, help, laser, and annotations        |
| [Exporting](docs/exporting.md)                            | PDF/PNG export, notes, backup slides, steps, internal stages, annotations, jobs, and vector output |

## Common workflows

Start on another port:

```sh
neopresent serve presentations/my-talk/presentation.md --port 9091
```

The same viewer is available on the displayed local-network IPv4 address. Keep the server running and allow the selected port through the host firewall when opening it from another device.

Export the completed state of each slide:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf
```

Export replacement and internal reveal states as separate pages:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf --steps
```

Inside a staged `plot` or `feynman` block, use `export-stages: false` to retain staged presentation behavior while exporting only that block's completed state.

Add notes or saved annotations:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf --notes
neopresent export presentations/my-talk/presentation.md --format pdf \
  --annotations presenter-annotations.json
```

## Controls at a glance

Press `H` or `?` in either window for theme-aware help. Viewer help changes automatically when a presenter is connected, because the presenter owns presentation tools in that mode.

| Key                              | Main action                               |
| -------------------------------- | ----------------------------------------- |
| Arrow keys / Page Up / Page Down | Navigate slides and reveal steps          |
| Space                            | Pause or resume animation                 |
| O                                | Cycle overview modes                      |
| 0                                | Exit overview                             |
| N / T / V / C                    | Notes / TOC / filmstrip / viewer controls |
| P                                | Toggle audience PDF inspection            |
| H or ?                           | Toggle shortcut help                      |

The presenter additionally owns laser (`L`), spotlight (`S`), annotation (`A`), eraser (`E`), blank screen (`B`), search (`F`), and bookmarks (`M`). See [Presenting and controls](docs/presenting.md) for the complete context-sensitive tables and PDF inspection controls.

## Workspace

- `packages/core` — presentation document model
- `packages/markdown` — Markdown compiler
- `packages/renderer` — renderer contracts and Neo.mjs renderer
- `packages/plugin-api` — extension API
- `packages/cli` — command-line tools
- `apps/viewer` — audience viewer and presenter dashboard
- `apps/editor` — early authoring workspace

`@neopresent/plugin-api` provides typed custom fenced-block and renderer registration. The viewer and exporter consume the same compiled presentation model.

## Future plans

- [ ] Add more math plot types 
- [ ] Support more disciplines other than physics/math
- [ ] Add UI live editting

## Supports

Please consider supporting the project if you like it and want to see it grow ❤️
