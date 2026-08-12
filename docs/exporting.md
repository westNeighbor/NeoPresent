# Exporting

NeoPresent exports the live slide canvas to PDF or PNG after resolving data, fonts, images, PDF figures, reveals, and animations.

## Basic commands

```sh
neopresent export presentations/my-talk/presentation.md --format pdf
neopresent export presentations/my-talk/presentation.md --format png
```

Choose an output path:

```sh
neopresent export presentations/my-talk/presentation.md \
  --format pdf \
  --output exports/talk.pdf
```

The available options are:

| Option                 | Meaning                                            |
| ---------------------- | -------------------------------------------------- |
| `--format pdf          | png`                                               | Output type; PDF is the default      |
| `--output <path>`      | PDF file or PNG directory                          |
| `--port <number>`      | Temporary render server port; default `9090`       |
| `--jobs <1-8>`         | Parallel browser workers; default `3`              |
| `--browser edge        | chrome`                                            | Export renderer; Edge is the default |
| `--notes`              | Put speaker notes beside PDF slides                |
| `--steps`              | Export reveal/replacement states as separate pages |
| `--notoc`              | Include slides marked `@toc-entry false`           |
| `--annotations <file>` | Include ink saved from the presenter               |

Use `neopresent help export` to confirm options for the installed build.

## Page geometry

Without notes, each PDF page uses the slide's exact aspect ratio. With `--notes`, slide height is unchanged and the PDF page grows wider to place notes beside it. The audience viewer's letterbox canvas is not exported.

The export keeps the live theme, background, footer, footnotes, logo, progress bar, and page number.

## Backup slides and numbering

Slides marked `@toc-entry false` are treated as backup slides and skipped by export by default. Include them with:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf --notoc
```

This is independent of displayed page totals. `@page-total-notoc include` controls whether backup slides count in the live footer total.

## Final state and step export

Without `--steps`, NeoPresent exports each slide once at its completed state. Replacement blocks and internal scientific stages are resolved to their final visible content.

Use `--steps` to create a separate page for each reveal/replacement state:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf --steps
```

Pages generated from one source slide keep the same displayed slide number and notes. Top-level `@block-exit replace` states and supported internal staged plots, Feynman diagrams, Standard Model highlights, and periodic-table highlights follow the same live reveal timeline.

### Keep live stages but collapse export stages

Inside a staged `plot` or `feynman` fence:

```text
animation-trigger: reveal
reveal-stages: 5
export-stages: false
```

`export-stages: false` affects only `--steps` export. The live viewer still navigates through the internal stages, while export emits one completed block state. The default is `export-stages: true`.

Use this when detailed live buildup is useful during a talk but would create too many static PDF pages.

## Speaker notes

```sh
neopresent export presentations/my-talk/presentation.md --format pdf --notes
```

Notes support text, inline/display math, and inline styles. With `--steps`, the same source-slide notes accompany each step page.

## Saved annotations

Use **Save ink** in the presenter to create an annotation JSON file, then export it:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf \
  --annotations presenter-annotations.json
```

Annotations are normalized SVG vector paths and appear on every exported state of their source slide. Color, thickness, and Pen/Marker/Chalk/Dashed/Dotted style metadata are retained. The exporter rejects a file whose saved slide count does not match the current deck.

## Parallel rendering

NeoPresent uses three independent browser processes by default. Each worker renders assigned slides sequentially while workers run in parallel.

```sh
neopresent export presentations/my-talk/presentation.md --format pdf --jobs 4
```

Increase jobs only when the machine has enough memory for the deck's plots, PDF figures, and images. Use `--jobs 1` when diagnosing a resource-heavy or timing-sensitive slide. The maximum is 8.

Changing the port does not make export faster; it only avoids a conflict with an existing server:

```sh
neopresent export presentations/my-talk/presentation.md \
  --format pdf --port 9092 --jobs 3
```

## Browser selection

Microsoft Edge is the default. Select Chrome when it is more stable on the current machine:

```sh
neopresent export presentations/my-talk/presentation.md \
  --format pdf --browser chrome
```

Safari is not supported because NeoPresent relies on headless Chromium debugging and vector PDF printing interfaces.

## Vector and bitmap content

PDF export prints HTML text and SVG plots as vector content. Local embedded PDF pages are converted with Poppler's `pdftocairo` and inserted as namespaced SVG, preserving vector paths when the source permits it. Bitmap images keep their source resolution.

Install Poppler on macOS when needed:

```sh
brew install poppler
```

NeoPresent uses `pdfunite` to combine vector pages. Each embedded SVG receives unique glyph, clip, mask, gradient, and filter identifiers so several PDF figures and hidden replacement states cannot collide.

## Readiness and animation handling

Before printing, export waits for:

- slide canvas mount and scale;
- web-font readiness;
- image decoding;
- external data and plot completion;
- embedded PDF canvas or vector preparation;
- the requested reveal/final state.

It then commits CSS/SVG animation appearance and removes transition compositing from the detached print snapshot. This prevents partially transparent entrances, stale statistics layers, ghosted replacement content, and shifted layouts.

## Troubleshooting

### Timed out waiting for a slide

Try the slide in the live viewer first, verify all local sources exist, then retry with `--jobs 1` and an unused port. A missing or stalled image/PDF/data source can prevent readiness.

### Black or blank pages

Use the current built CLI (`pnpm setup:cli` after source changes), confirm the audience viewer renders the deck, and avoid reusing a port already occupied by an unrelated server.

### PDF figure has the wrong ratio

Check the PDF block's `width`, `height: auto`, `max-height`, and `fit: contain`. Export uses the live slide canvas, not PDF inspection mode.

### A live internal stage creates too many pages

Add `export-stages: false` inside that `plot` or `feynman` fence and keep `--steps` for the slide's top-level replacement states.
