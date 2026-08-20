# Layout and themes

This guide covers deck-, slide-, and block-level visual controls.

## Alignment

Set the general slide alignment with:

```markdown
@align center
@heading-align left
@body-align left
```

`@align` controls the overall content region. `@heading-align` and `@body-align` control headings and body content independently, including content inside groups and columns. A common outline layout is a centered content region whose list text is left aligned:

```markdown
@align center
@body-align left

# Outline

1. Motivation
2. Detector and reconstruction
3. Results
```

## Heading panels

Themes may define `headingOffset`, `headingPanelWidth`, `headingPanelMaxWidth`, and `headingPadding`. These apply to every slide using that theme. For example, add the following to a theme in `apps/viewer/src/neo/theme.mjs`:

```js
headingOffset: '0, -18px',
headingPanelWidth: 'fit-content',
headingPanelMaxWidth: '92%',
headingPadding: '.10em .28em .12em',
```

Use the corresponding directives to override one slide without changing the theme:

```markdown
@heading-offset 0, -18px
@heading-panel-width fit-content
@heading-panel-max-width 92%
@heading-panel-padding .10em .28em .12em

# A compact heading panel
```

`@heading-offset` moves the heading and its background together. `fit-content` narrows the panel to the title, while `@heading-panel-max-width` keeps long titles from exceeding the content area.

## Columns

Create columns with `::columns`, separate them with `::column`, and close with `::end`:

```markdown
::columns widths: 60%, 40%
::column
Left content
::column
Right content
::end
```

Widths are relative weights. They do not need to add to 100%; `60%, 60%` creates two equal expanded columns. Content is still constrained by the slide canvas.

Use nested `::group` blocks when a complete column section should animate or move as one item.

## Grid

Use grid blocks for more than two regularly arranged regions. Keep the number of cells modest on a presentation slide and prefer explicit columns when their widths differ.

## Size and position controls

Apply these directives immediately before the content block they should affect:

```markdown
@scale 80%
@offset 20px, -10px
```

`@scale` changes the block's visual size. `@offset x, y` moves it horizontally and vertically; positive values move right and down. Offsets apply to formulas, groups, media, plots, tables, and ordinary block content.

For predictable spacing between text and media, group the content and offset or scale the group:

````markdown
@offset 0, 24px
::group
$$f(\phi)=A_N\sin\phi$$

```pdf
src: ./assets/result.pdf
page: 1
```

::end
````

Prefer the relevant fenced block's own controls when only that element should
change: image blocks have `width`, `height`, `max-width`, `max-height`, and
`fit`; PDF blocks have `width`, `height`, and caption offsets; plot blocks have
plot size/offset and caption offsets.

## Slide aspect ratio

Set the deck ratio before the first slide:

```markdown
@aspect 16:9
```

Override it on a slide with the same directive. The viewer uniformly scales the fixed 1600-unit design canvas, so a resized window preserves the slide composition instead of independently reflowing plots and labels.

## Backgrounds and transitions

Set a slide background with the background directives or a full-slide image. Slide transitions and timing are described in [Animation](animations.md).

```markdown
@transition fade
@transition-duration 700ms
```

## Themes

Set a deck theme before the first slide:

```markdown
@theme paper
```

Override it on an individual slide:

```markdown
---

@theme midnight

# Midnight interlude
```

Theme-aware viewer and presenter overlays—including shortcut help, key badges, filmstrip page badges, and popup panels—derive their surface, border, and text colors from the active slide.

NeoPresent includes the following built-in themes:

| Theme | Character |
|---|---|
| `default` | Dark, modern, and high contrast. |
| `light` | Crisp neutral white for general presentations. |
| `paper` | Warm off-white, suitable for papers and lectures. |
| `midnight` | Deep indigo dark mode. |
| `alpine` | Layered mountain-paper texture and a green left-rule heading. |
| `gallery` | Framed editorial layout with ivory paper, bronze, and navy details. |
| `blueprint` | Technical navy grid with a double cyan heading rule. |
| `aurora` | Deep night sky, luminous color sweeps, and a glowing framed heading. |
| `orchid` | Decorative concentric rings with a lavender double-rule heading. |
| `chalkboard` | Textured dark board with chalk-like rules and warm highlights. |
| `neon` | Dark night-sky gradients with cyan and magenta light. |
| `risograph` | Warm print-paper texture with blue and coral ink. |
| `botanical` | Soft paper with layered leaf-green and gold washes. |
| `glass-aurora` | Frosted midnight glass over cyan and violet light. |
| `glass-citrus` | Bright translucent glass over citrus, mint, and sky light. |
| `glass-rose` | Frosted rose glass over pink, lavender, and peach light. |
| `glass-sunset` | Warm frosted plum glass over coral, gold, and violet light. |
| `glass-arctic` | Bright ice-glass panels over white, cyan, and sky-blue light. |
| `glass-forest` | Deep translucent jade glass with soft green and gold light. |
| `glass-cosmic` | Amethyst glass over violet, blue, and pink star-like light. |
| `fyma`, `fyma-*` | Powerdot-inspired presentation palettes. |
| `ciment` | White technical paper with a configurable hatch. |

For example:

```markdown
@theme aurora
```

Fyma and Ciment retain their theme-specific palette controls:

```markdown
@theme fyma
@fyma-palette green
@fyma-gradient-direction right
```

```markdown
@theme ciment
@ciment-hatch-color #325f4b
@ciment-hatch-alpha 0.18
@ciment-hatch-density 14
```

## Title metadata

Add title-slide metadata before the first slide:

```markdown
@subtitle A forward-physics measurement
@author M. H. Zhao

# Presentation title
```

## Table of contents

Generate a linked contents slide with:

```markdown
@toc Contents
```

Exclude a backup slide with `@toc-entry off` or `@toc-exclude`; explicitly include one with `@toc-entry on` or `@toc-include`.

For a shorter TOC label, put it in square brackets at the start of the heading:

```markdown
# [Detector overview] A detailed overview of the forward detector subsystems
```

TOC labels support inline math. Long TOCs automatically balance across columns; override the choice on the TOC slide with `@toc-columns 1` through `@toc-columns 5`.

## Page numbers

Configure page numbers globally:

```markdown
@page-number on
@page-total on
@page-number-position bottom-right
@page-number-offset -12px, -8px
@page-number-size 24px
```

`@page-number-position` accepts `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, or `bottom-right`. Offset values are horizontal and vertical; positive values move right and down. Size accepts CSS units such as `px`, `em`, `rem`, `vh`, `vw`, and `%`.

The title and generated TOC are not numbered. Slides excluded from the TOC are also excluded from the displayed total by default. Count backup slides too with:

```markdown
@page-total-notoc include
```

Navigation still uses the actual deck position.

## Footer

Use one center footer or three independent slots:

```markdown
@footer NeoPresent · Internal
```

```markdown
@footer-left M. H. Zhao · Iowa State University
@footer-center Drell–Yan $A_N$ measurement
@footer-right Ph.D. Defense · 2026
```

Global footer controls:

```markdown
@footer-size 20px
@footer-offset 0px, -10px
@footer-font Inter, sans-serif
@footer-left-font IBM Plex Mono, monospace
@footer-center-font Inter, sans-serif
@footer-right-font Inter, sans-serif
```

The two offset values are horizontal and vertical. Footer text supports inline styles and math. Hide the footer on one slide with `@hide-footer`.

Footer shadows use the same model as content shadows:

```markdown
@footer-shadow drop
@footer-shadow-color #000000
@footer-shadow-angle 45
@footer-shadow-distance 5px
@footer-shadow-blur 6px
@footer-shadow-opacity 35%
```

Use `@footer-shadow-offset 3px, 5px` instead of angle/distance for a direct offset. `box`, `contact`, and `curved` are also accepted shadow styles. Contact shadows accept `@footer-shadow-perspective` from `-100` to `100`; curved footer shadows accept `@footer-shadow-curve` and `@footer-shadow-size`.

The styles follow Keynote's visual roles: `drop` casts a directional shadow from
the rendered object so it appears to hover; `contact` compresses the shadow at
the object's base so it appears to stand on the slide; and `curved` emphasizes
the lower corners so a card or image appears curled. `box` remains the ordinary
rectangular CSS-style shadow. For contact shadows, `shadow-perspective: 0` is
symmetric, while positive and negative values skew the footprint in opposite
directions. On unfilled text, contact uses glyph-level rendering rather than a
rectangular panel shadow. Curved shadows use one smoothly displaced alpha mask;
its lower blur tail fades gradually so multiline text retains the internal
curved-shadow treatment without producing a redundant readable copy beneath
its final line. `box` always follows the rectangular block bounds.

## Deck-wide content shadows

Use preamble shadow defaults when the same treatment should apply throughout a deck. `@block-shadow` is the shared baseline; targeted directives override it for their block type. The available targets are `heading`, `plot`, `image`, `pdf`, `table`, `code`, and `quote`.

```markdown
@block-shadow drop
@block-shadow-color #000000
@block-shadow-opacity 28%
@block-shadow-offset 4px, 6px
@block-shadow-blur 9px

@heading-shadow contact
@heading-shadow-opacity 18%

@plot-shadow curved
@plot-shadow-color #18324a
@plot-shadow-blur 12px
```

Every target supports the same suffixes: `-color`, `-opacity`, `-angle`, `-distance`, `-offset`, `-blur`, `-curve`, `-size`, and `-perspective`. A local block directive such as `@shadow none` or `@shadow-opacity 12%` takes precedence over its deck-wide default. `@block-shadow…` also supplies the baseline for footers; `@footer-shadow…` overrides it only for the footer.

## Deck-wide glass

Glass uses the same inheritance model. `@block-glass` supplies the baseline for every block and the footer; targeted settings override it for `heading`, `plot`, `image`, `pdf`, `table`, `code`, `quote`, or `footer`. Footer glass is drawn independently behind each populated left, center, or right slot; empty footer slots never create glass panels.

```markdown
@block-glass on
@block-glass-color #ffffff
@block-glass-alpha 16%
@block-glass-blur 18px
@block-glass-edge-color #ffffff
@block-glass-edge-alpha 38%
@block-glass-radius .8rem

@plot-glass-alpha 10%
@footer-glass off
```

Available suffixes are `-color`, `-alpha`, `-transparency`, `-blur`, `-saturation`, `-thickness`, `-edge-color`, `-edge-alpha`, `-depth`, `-depth-alpha`, and `-radius`. Ordinary `@glass…` directives remain local and override the deck-wide value for their following block.

## Logo and progress

Set a deck logo and adjust its position:

```markdown
@logo ./assets/logo.svg
@logo-offset -12px, 10px
```

Enable slide progress:

```markdown
@progress bar
```

Disable it with `@progress off`.

## Captions

PDF and plot blocks support styled captions. Use the block's own controls:

```text
caption: Detector acceptance
caption-size: 28px
caption-color: #244a3a
caption-align: center
caption-offset-x: 0px
caption-offset-y: 12px
```

See [Media and diagrams](media-and-diagrams.md) and [Plotting](plotting.md) for full block examples.

Image blocks support a simple `caption:` below the image. Use a separate styled
text block when an image caption needs custom color, math, size, or offset.
