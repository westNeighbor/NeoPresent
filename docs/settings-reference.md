# Complete non-plot settings reference

This is the searchable reference for deck directives, slide directives, layout syntax, content styling, fenced media blocks, tables, and code blocks. For the exhaustive scientific-plot registry, see [Complete plot settings](plot-settings-reference.md).

## Value conventions

- Durations use `ms` or `s`, for example `450ms` or `1.2s`.
- CSS lengths commonly accept `px`, `rem`, `em`, `%`, `vw`, and `vh`; block image sizing also accepts `cqw` and `cqh` where noted.
- Boolean plot/block fields generally accept `true`/`false`; some display toggles also accept `on`/`off`, `yes`/`no`, or `1`/`0`.
- Colors accept CSS colors such as `#ff0000`, `rgb(...)`, `hsl(...)`, or named colors.
- Offsets are `x, y`; positive values move right and down.

## Deck directives

Put these before the first slide.

| Directive                                                        | Accepted value / purpose                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `@theme`                                                         | Theme name                                                                               |
| `@slide-theme`                                                   | Per-slide theme override when used inside a slide                                        |
| `@aspect`                                                        | Ratio such as `16:9` or `5:4`; may also be overridden per slide                          |
| `@controls`                                                      | `visible` or `hidden`                                                                    |
| `@autoplay`                                                      | Duration or `off`                                                                        |
| `@subtitle`                                                      | Title-slide subtitle                                                                     |
| `@author`                                                        | Title-slide author                                                                       |
| `@font`                                                          | Default font family                                                                      |
| `@body-font`                                                     | Body font                                                                                |
| `@heading-font`                                                  | Heading font                                                                             |
| `@list-font`                                                     | List font                                                                                |
| `@quote-font`                                                    | Quote font                                                                               |
| `@heading-position`                                              | `flow`, `top`, `center`, or `bottom`                                                     |
| `@heading-align`                                                 | `left`, `center`, or `right`                                                             |
| `@heading-offset`                                                | Two lengths, for example `12px, -6px`                                                    |
| `@heading-panel-width`                                           | CSS width, for example `fit-content` or `72%`                                            |
| `@heading-panel-max-width`                                       | CSS maximum width, for example `92%`                                                     |
| `@heading-panel-padding`                                         | CSS padding, for example `.10em .28em .12em`                                             |
| `@block-shadow` and its suffixes                                 | Shadow defaults for all content blocks; see the shadow controls below                    |
| `@heading-shadow`, `@plot-shadow`, `@image-shadow`, `@pdf-shadow`, `@table-shadow`, `@code-shadow`, `@quote-shadow` | Targeted deck-wide shadow defaults |
| `@block-glass` and its suffixes                                  | Deck-wide glass defaults for all blocks                                                   |
| `@heading-glass`, `@plot-glass`, `@image-glass`, `@pdf-glass`, `@table-glass`, `@code-glass`, `@quote-glass`, `@footer-glass` | Targeted deck-wide glass defaults |
| `@footer` / `@footer-center`                                     | Center footer text                                                                       |
| `@footer-left`, `@footer-right`                                  | Left/right footer text                                                                   |
| `@footer-font`                                                   | Font for all footer slots                                                                |
| `@footer-left-font`, `@footer-center-font`, `@footer-right-font` | Slot-specific font                                                                       |
| `@footer-size`                                                   | Global footer font size                                                                  |
| `@footer-offset`                                                 | Global footer `x, y` offset                                                              |
| `@footer-shadow`                                                 | `drop`, `box`, `box-shadow`, `contact`, or `curved`                                      |
| `@footer-shadow-color`                                           | Shadow color                                                                             |
| `@footer-shadow-opacity`                                         | Alpha or percentage                                                                      |
| `@footer-shadow-angle`                                           | Angle in degrees                                                                         |
| `@footer-shadow-distance`                                        | CSS length                                                                               |
| `@footer-shadow-offset`                                          | Direct `x, y` offset instead of angle/distance                                           |
| `@footer-shadow-blur`                                            | CSS length                                                                               |
| `@footer-shadow-curve`, `@footer-shadow-size`                    | Curved-shadow shape and spread                                                           |
| `@footer-shadow-perspective`                                    | Contact-shadow perspective from `-100` to `100`                                          |
| `@logo`                                                          | Local/remote logo source                                                                 |
| `@logo-offset`                                                   | Logo `x, y` offset                                                                       |
| `@page-number`                                                   | `on`/`off` and boolean equivalents                                                       |
| `@page-total`                                                    | Show total with page number                                                              |
| `@page-total-notoc`                                              | `include`/`on`/`true`/`yes` to count backup slides                                       |
| `@page-number-position`                                          | `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, or `bottom-right` |
| `@page-number-offset`                                            | Page-number `x, y` offset                                                                |
| `@page-number-size`                                              | Page-number font size                                                                    |
| `@progress`                                                      | `bar`/`on` or `off`                                                                      |
| `@fyma-palette`                                                  | Fyma theme palette name                                                                  |
| `@fyma-gradient-direction`                                       | Fyma gradient direction                                                                  |
| `@ciment-hatch-color`                                            | Ciment hatch color                                                                       |
| `@ciment-hatch-alpha`                                            | Ciment hatch alpha                                                                       |
| `@ciment-hatch-density`                                          | Ciment hatch density                                                                     |
| `@include`                                                       | Markdown file path; may be nested                                                        |

Footer/title/TOC text supports inline math and style spans.

## Slide directives

Put these after `---` and before the affected slide content.

| Directive                                                           | Accepted value / purpose                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@align`                                                            | `left`, `center`, or `right` overall placement                                                           |
| `@body-align`                                                       | `left`, `center`, or `right` body alignment, including groups/columns                                    |
| `@valign`                                                           | `top`, `center`, or `bottom`                                                                             |
| `@aspect`                                                           | Per-slide aspect ratio                                                                                   |
| `@background`                                                       | CSS background or image source                                                                           |
| `@background-overlay`                                               | CSS overlay color                                                                                        |
| `@background-position`                                              | CSS background position                                                                                  |
| `@background-size`                                                  | CSS background size, normally `cover` or `contain`                                                       |
| `@section`                                                          | Section label                                                                                            |
| `@slide-theme`                                                      | Per-slide theme                                                                                          |
| `@transition`                                                       | `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `zoom`, `flip`, `none`, `off`, or `false` |
| `@transition-duration`                                              | Duration                                                                                                 |
| `@duration`                                                         | Autoplay duration for this slide or `off`                                                                |
| `@font`, `@body-font`, `@heading-font`, `@list-font`, `@quote-font` | Per-slide font overrides                                                                                 |
| `@heading-position`                                                 | `flow`, `top`, `center`, or `bottom`                                                                     |
| `@heading-align`                                                    | `left`, `center`, or `right`                                                                             |
| `@heading-offset`                                                   | Two CSS lengths                                                                                          |
| `@heading-panel-width`                                              | CSS width for the primary heading panel                                                                  |
| `@heading-panel-max-width`                                          | CSS maximum width for the primary heading panel                                                          |
| `@heading-panel-padding`                                            | CSS padding for the primary heading panel                                                                |
| `@hide-footer`                                                      | Hide footer on this slide                                                                                |
| `@toc`                                                              | Generate a TOC slide; optional title follows                                                             |
| `@toc-columns`                                                      | `1` through `5`                                                                                          |
| `@toc-entry`                                                        | `on`, `off`, `true`, `false`, `include`, `exclude`, `yes`, or `no`                                       |
| `@toc-include`, `@toc-exclude`                                      | Shorthand inclusion/exclusion                                                                            |
| `@agenda`                                                           | Legacy agenda placeholder; optional title                                                                |
| `@reveal`                                                           | Enable list/fragment reveal navigation                                                                   |
| `@list-symbol`                                                      | One custom marker                                                                                        |
| `@list-symbols`                                                     | Comma-separated per-item markers                                                                         |

## Block transition directives

These affect the next compatible block or block sequence.

| Directive                    | Values                                                              |
| ---------------------------- | ------------------------------------------------------------------- |
| `@block-enter`               | `fade`, `grow`, `rise`, `zoom`, or `morph`; omitted value defaults to `fade` |
| `@block-exit`                | `replace` or `shrink`; `shrink` may include a percentage            |
| `@block-transition-trigger`  | `auto` or `reveal`                                                  |
| `@block-transition-duration` | Duration                                                            |
| `@block-transition-delay`    | Duration                                                            |

Plot blocks used with `@block-enter morph` also accept `morph-match` (`auto`,
`index`, `x`, or `key`), `morph-axis` (boolean), and `morph-text` (`crossfade`
or `none`). Semantic mark morphing is available for line, area, scatter, bar,
grouped-bar, histogram, pie/donut, radar, and polar-function plots.
Sampled `function:` overlays and fitted curves/bands are also matched
semantically; fits use `fit-id`, and changed fit-result text crossfades.

## Block and inline visual effects

Block directives use `@name value`. Inline spans use `{{style:name=value;...|text}}`. The same effect engine accepts:

`scale`, `offset`, `fill`, `fill-alpha`, `frame-color`, `color`, `color-alpha`, `size`, `font`, `alpha`, `glass`, `glass-color`, `glass-alpha`, `glass-transparency`, `glass-blur`, `glass-saturation`, `glass-thickness`, `glass-edge-color`, `glass-edge-alpha`, `glass-depth`, `glass-depth-alpha`, `glass-radius`, `border`, `border-style`, `border-color`, `border-alpha`, `border-size`, `border-radius`, `border-padding`, `frame-inner-color`, `frame-scale`, `shadow`, `shadow-color`, `shadow-opacity`, `shadow-angle`, `shadow-distance`, `shadow-offset`, `shadow-blur`, `shadow-curve`, `shadow-size`, `shadow-perspective`, and `reflection`.

Block-only sticky-note controls are `sticky-width`, `sticky-rotation`, `sticky-fill`, `sticky-alpha`, `sticky-tape`, `sticky-tape-alpha`, and `sticky-position`.

Accepted enumerations:

- `border`: `line`, `picture`, or `picture-frame`.
- `border-style`: `solid`, `dashed`, `dotted`, or `double`.
- `shadow`: `drop`, `box`, `box-shadow`, `contact`, or `curved`.
- `shadow-perspective`: `-100` to `100`; controls the horizontal footprint of a contact shadow.
- `shadow-curve`: `inward`, `outward`, or a numeric amount.
- `glass`: `on`, `true`, `yes`, `glass`, or `1`.

Short inline forms also work: `{{color:#ff0000|text}}`, `{{size:42px|text}}`, `{{font:Inter|text}}`, and `{{offset:10px,-4px|text}}`.

## Text and fragment animation

| Setting                        | Values                                                                   |
| ------------------------------ | ------------------------------------------------------------------------ |
| `:::fragment effect`           | `fade`, `zoom`, `slide-left`, `slide-right`, `slide-up`, or `slide-down` |
| `@text-animation`              | Text animation name, including `typing`                                  |
| `@text-animation-duration`     | Duration                                                                 |
| `@text-animation-delay`        | Duration                                                                 |
| `@text-animation-cursor-color` | CSS color                                                                |

## Structured content blocks

Accepted `:::kind` blocks are `fragment`, `note`, `tip`, `warning`,
`references`, `stat`, `timeline`, `cards`, `poll`, `stickybox`, and `notes`.
Their exact line formats and examples are in [Authoring](authoring.md#groups-and-utility-blocks).

`@button label | target` creates an interactive link button. Targets may be
HTTP(S), `mailto:`, root-relative, relative, or `#slide=N`.

## Table settings

Markdown tables support alignment markers and inline math/styles. The directives below apply to the next Markdown table; the same unprefixed keys work inside a fenced `table` block.

| Markdown directive          | Fenced-table key                                         |
| --------------------------- | -------------------------------------------------------- |
| `@table-animation`          | `animation` (`fade`, `grow`, `rows`, `columns`, `cells`) |
| `@table-animation-duration` | `animation-duration`                                     |
| `@table-animation-delay`    | `animation-delay`                                        |
| `@table-animation-stagger`  | `animation-stagger`                                      |
| `@table-animation-easing`   | `animation-easing`                                       |
| `@table-highlight-row`      | `highlight-row` (one-based)                              |
| `@table-highlight-column`   | `highlight-column` (one-based or header name)            |
| `@table-highlight-cell`     | `highlight-cell`                                         |
| `@table-highlight-effect`   | `highlight-effect`: `glow` or `flow`                     |
| `@table-highlight-color`    | `highlight-color`                                        |
| `@table-highlight-duration` | `highlight-duration`                                     |
| `@table-highlight-delay`    | `highlight-delay`                                        |

Fenced tables additionally accept `source` and `refresh`.

## Layout blocks

### Columns

```markdown
::columns widths: 60%, 40%
::column
...
::column
...
::end
```

Widths accept ratios/numbers, `%`, `fr`, `px`, `rem`, `em`, or `auto`. The number of widths must match the number of columns.

### Grid

`::grid 2` through `::grid 6` defines columns per row. Separate cells with `::cell` and close with `::end`.

### Group

`::group` ... `::end` treats related content as one layout/animation block. Alignment and font directives inside the group are preserved.

### Absolute placement

`::place x:VALUE y:VALUE width:VALUE height:VALUE z:VALUE` ... `::end`. `x` and `y` are required; width, height, and z-index are optional.

## Image block

Fence names: `image` or `img`.

| Key                       | Values / purpose                                                        |
| ------------------------- | ----------------------------------------------------------------------- |
| `src`                     | Required source                                                         |
| `alt`                     | Alternative text                                                        |
| `caption`                 | Simple caption below the image; also used as fallback alt text          |
| `width`, `height`         | `auto` or length using `px`, `rem`, `em`, `%`, `vw`, `vh`, `cqw`, `cqh` |
| `max-width`, `max-height` | Same length forms                                                       |
| `fit`                     | `contain`, `cover`, `fill`, `none`, or `scale-down`                     |
| `align`                   | `left`, `center`, or `right`                                            |

## PDF block

| Key                                                              | Values / purpose                     |
| ---------------------------------------------------------------- | ------------------------------------ |
| `src`                                                            | Required PDF source                  |
| `page`                                                           | One-based page number; default `1`   |
| `mode`                                                           | `canvas` (default) or `viewer`       |
| `width`, `height`                                                | CSS dimension                        |
| `caption`                                                        | Caption text with inline styles/math |
| `caption-position`                                               | `top` or `bottom`                    |
| `caption-align`                                                  | `left`, `center`, or `right`         |
| `caption-size`, `caption-font`, `caption-color`, `caption-alpha` | Caption typography                   |
| `caption-gap`                                                    | Gap between page and caption         |
| `caption-offset-x`, `caption-offset-y`                           | Caption offset                       |

## Video and audio blocks

Fence names: `video`, `audio`. Keys: `src`, `autoplay`, `controls`, `loop`, and `muted`; video also accepts `poster`. These booleans use `true` or `false`.

## Embed block

Fence names: `iframe`, `embed`. Keys: `src` and `title`. `src` must be HTTP(S), root-relative, or a relative path.

## Code blocks

Any unrecognized fence is displayed as code. Supported flags after the language:

Built-in syntax highlighting covers 28 language families:

- JavaScript (`js`, `javascript`, `jsx`) and TypeScript (`typescript`, `ts`, `tsx`)
- Python (`python`, `py`), R (`r`), Julia (`julia`, `jl`), and MATLAB/Octave (`matlab`, `octave`)
- C/C++ (`cpp`, `c++`, `cc`, `cxx`, `h`, `hpp`), C# (`csharp`, `cs`, `c#`), Java, Go (`go`, `golang`), Rust (`rust`, `rs`), Swift, and Kotlin (`kotlin`, `kt`, `kts`)
- Visual Basic (`vb`, `visual-basic`, `visualbasic`, `vbnet`, `vb.net`), Delphi/Object Pascal (`pascal`, `delphi`, `object-pascal`, `objectpascal`), Ada (`ada`, `adb`, `ads`), Fortran (`fortran`, `f77`, `f90`, `f95`, `f03`), and COBOL (`cobol`, `cob`)
- Shell (`shell`, `sh`, `bash`, `zsh`), PowerShell (`powershell`, `ps1`, `pwsh`), Perl (`perl`, `pl`), Ruby (`ruby`, `rb`), PHP, Lua, SQL (`sql`, `mysql`, `postgres`, `postgresql`, `sqlite`), SAS, and Assembly (`assembly`, `asm`, `nasm`, `gas`)
- Textual LabVIEW/G snippets (`labview`, `lv`, `g`); graphical or binary `.vi` files are not source text and cannot be highlighted in a code fence

- `linenums` — show line numbers from 1.
- `linenums=N` or `line-start=N` — line numbers from N.
- `runnable` — enable execution for `js`/`javascript`, `py`/`python`, or `html`.
- `packages=a,b,c` — Python package list for runnable Python.

## Other fenced blocks

- `mermaid` — Mermaid source.
- `math` or `latex` — display mathematics.
- `feynman` — see [Feynman settings](#feynman-settings).
- `plot` or `chart` — see [Complete plot settings](plot-settings-reference.md).

## Feynman settings

### Diagram-level keys

`width`, `height`, `background`, `color`, `line-width`, `font-size`, `animation`, `animation-duration`, `animation-delay`, `animation-stagger`, `animation-easing`, `animation-order`, `animation-trigger`, `reveal-stages`, `reveal-stage-default`, and `export-stages`.

`animation` accepts `fade`, `rise`, `grow`, or `draw`. `animation-order` accepts source order/`edges-first`, `left-to-right`, or `right-to-left`. `animation-trigger: reveal` enables manual internal stages.

### Vertex fields

`vertex: name | x: ... | y: ...` accepts `x`, `y` (normalized 0–1 coordinates), `size`, `color`, `visible`, `label`, `label-color`, `label-font`, `label-size`, `label-offset-x`, `label-offset-y`, `animation`, animation timing/easing/stagger, and `reveal-stage`.

### Edge fields

`edge: from -> to | ...` accepts:

- Geometry/style: `type`, `color`, `line-width`, `bend`, `loop`, `loop-size`, `curl-size`, `curl-count`.
- `type`: `fermion`, `photon`/`wavy`, `gluon`/`curly`, `scalar`, or `ghost`.
- Arrow: `arrow`, `arrow-position`, `arrow-size`.
- Label: `label`, `label-color`, `label-font`, `label-size`, `label-position`, `label-offset-x`, `label-offset-y`.
- Momentum: `momentum`, `momentum-color`, `momentum-font`, `momentum-size`, `momentum-position`, `momentum-direction` (`forward` or `reverse`), `momentum-offset`, `momentum-length`, `momentum-width`, `momentum-arrow-size`, and `momentum-label-offset`.
- Animation: `animation`, `animation-duration`, `animation-delay`, `animation-stagger`, `animation-easing`, and `reveal-stage`.

## Presenter annotation controls

Annotation styles are `chalk` (default), `pen`, `marker`, `dashed`, and `dotted`. Color and thickness are controlled in the presenter. Keyboard controls and PDF inspection are listed in [Presenting and controls](presenting.md); export uses `--annotations` as described in [Exporting](exporting.md).

## CLI controls

Use `neopresent help <command>` for the installed executable. Export options are exhaustively listed in [Exporting](exporting.md): `--format`, `--output`, `--port`, `--jobs`, `--browser`, `--annotations`, `--notes`, `--steps`, and `--notoc`.
