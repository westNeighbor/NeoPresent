# NeoPresent documentation

Use this page as the documentation map. Each guide is intentionally focused so you do not need to search one very long reference page.

## Start here

1. [Root README](../README.md) — install NeoPresent and run a minimal deck.
2. [Authoring](authoring.md) — learn the Markdown structure and content blocks.
3. [Layout and themes](layout-and-themes.md) — arrange and style a slide.
4. [Presenting and controls](presenting.md) — run the viewer and presenter dashboard.
5. [Exporting](exporting.md) — create PDF or PNG output.

## Guide index

| Guide                                                | Use it for                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Authoring](authoring.md)                            | Slides, includes, headings, lists, tables, math, inline styles, notes, references, and utility blocks                      |
| [Layout and themes](layout-and-themes.md)            | Alignment, columns, groups, sizing, offsets, aspect ratio, backgrounds, TOC, page numbers, footers, logos, and themes      |
| [Media and diagrams](media-and-diagrams.md)          | Images, PDF pages, PDF inspection, video, audio, web embeds, Mermaid, Feynman, Standard Model, and periodic table          |
| [Plotting](plotting.md)                              | Scatter, line, histogram, bar, pie, radar, heatmap, surface, series, axes, errors, fits, legends, and external data        |
| [Complete plot settings](plot-settings-reference.md) | Source-generated inventory of every plot key plus all marker, ROOT symbol, line-style, draw-mode, and entry choices        |
| [Complete non-plot settings](settings-reference.md)  | Deck/slide directives, visual effects, layouts, tables, media, code, Feynman, annotation, and CLI controls                 |
| [Animation](animations.md)                           | Slide motion, list and fragment reveals, block replacement, table and plot animation, internal stages, and synchronization |
| [Presenting and controls](presenting.md)             | Viewer/presenter shortcuts, help, overview, notes, filmstrip, PDF inspection, laser, spotlight, blanking, and ink          |
| [Exporting](exporting.md)                            | PDF/PNG, notes, backup slides, step pages, `export-stages`, annotations, renderer selection, jobs, and vector assets       |

## Settings by scope

NeoPresent settings appear in three places:

| Scope        | Syntax                            | Example        |
| ------------ | --------------------------------- | -------------- |
| Deck         | Before the first slide            | `@theme paper` |
| Slide        | After `---`, before slide content | `@align left`  |
| Block        | Immediately before a block        | `@scale 80%`   |
| Fenced block | Inside the fence                  | `width: 80%`   |

Durations accept `ms` or `s`. Common booleans accept `true`/`false`; display toggles often also accept `on`/`off`.

## Find a setting quickly

Search the documentation directory rather than the source code:

```sh
rg "footer-offset|caption-offset|export-stages" docs
```

For command options, use the built-in help because it matches the installed CLI:

```sh
neopresent help
neopresent help serve
neopresent help export
```

For live keyboard controls, press `H` or `?` in the viewer or presenter. The viewer list changes when a presenter connects.

## Completeness checks

The complete plot reference is generated from the Markdown compiler's accepted
key registry. Run this after adding a plot setting:

```sh
pnpm docs:generate
pnpm docs:check
```

This keeps every accepted plot key searchable while the shorter plotting guide
remains example-oriented. The check also verifies ROOT marker aliases, line
styles, dynamic per-statistic keys, audited non-plot controls, local links, and
that documented plot examples use accepted top-level keys.

## Recommended authoring workflow

1. Keep `presentation.md` as a short index and use `@include` for sections.
2. Validate with `neopresent check`.
3. Inspect slide order with `neopresent outline`.
4. Present with both the audience viewer and presenter dashboard.
5. Export after external images, data, fonts, and PDF assets have loaded correctly in the live view.
