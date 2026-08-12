# Authoring guide

This guide covers presentation structure and ordinary content. See [Layout and themes](layout-and-themes.md) for placement and [Animation](animations.md) for staged content.

## Deck structure

Separate slides with a line containing `---`:

```markdown
@theme paper
@aspect 16:9

# Opening slide

---

## First result

Slide content.
```

Deck directives go before the first slide. Slide directives go after a separator and before the content they control. A block directive affects the next compatible block.

## Split a deck into files

Use `@include` on a line by itself:

```markdown
@theme paper
@include sections/opening.md
@include sections/motivation.md
@include sections/results.md
@include sections/conclusion.md
```

Includes can be nested and reload when saved. The include path is relative to the file containing the directive. Image and data paths remain relative to the main presentation directory.

A practical layout is:

```text
presentations/my-talk/
├── presentation.md
├── sections/
│   ├── opening.md
│   └── results.md
├── assets/
└── data/
```

## Headings and text

Standard Markdown headings, paragraphs, emphasis, links, lists, task lists, quotes, and horizontal dividers are supported. Headings and ordinary text support inline math.

```markdown
## Measured $J/\psi$ yield

The **combined result** agrees with [the benchmark](https://example.com).
```

Use `@heading-align left|center|right` for headings and `@body-align left|center|right` for body content. These directives also apply inside columns and groups.

## Inline styles

Use a NeoPresent style span when Markdown emphasis is not enough:

```markdown
{{style:size=42px;color=#0055cc|Important $J/\psi$ result}}
```

Common properties include `size`, `color`, `font`, `offset`, `fill`, glass,
border, shadow, and reflection controls. Use ordinary Markdown emphasis beside
styled spans; for bold math inside a span, use LaTeX `\mathbf{...}` or
`\boldsymbol{...}`. Inline styles work in
paragraphs, headings, lists, notes, PDF/plot captions, and table cells. Image
blocks have a simple plain-text caption; use a separate styled text block when
an image caption needs rich formatting.

Inside a Markdown table, escape the style delimiter as `\|` so it does not start another cell:

```markdown
| Result   |                                           Efficiency |
| -------- | ---------------------------------------------------: |
| Combined | {{style:color=#d00000\|$\mathbf{4.2\times10^{-2}}$}} |
```

## Mathematics

Use `$...$` for inline math and `$$...$$` for display math:

```markdown
The fitted mass is $m_{J/\psi}=3.0969\,\mathrm{GeV}$.

$$
A_N(\phi)=\frac{1}{P}
\frac{\sqrt{N^\uparrow(\phi)N^\downarrow(\phi+\pi)}-
      \sqrt{N^\downarrow(\phi)N^\uparrow(\phi+\pi)}}
     {\sqrt{N^\uparrow(\phi)N^\downarrow(\phi+\pi)}+
      \sqrt{N^\downarrow(\phi)N^\uparrow(\phi+\pi)}}
$$
```

For several aligned lines, put an `aligned` environment inside display math:

```markdown
$$
\begin{aligned}
f(\phi) &= A_N\sin\phi, \\
A_N &= \frac{1}{P}\frac{U-D}{U+D}.
\end{aligned}
$$
```

Do not use a bare LaTeX environment outside `$$...$$`.

## Lists

Use ordinary ordered or unordered Markdown lists. Wrapped lines use hanging indentation and align with the item text.

Set a custom marker before the list:

```markdown
@list-symbol ★︎

- First point
- Second point
```

The marker inherits the item font size. A text-presentation Unicode symbol such as `✍︎` avoids the platform color-emoji form.

Use `@reveal` to reveal list items one at a time. See [Animation](animations.md) for fragments and stage ordering.

## Tables

Markdown pipe tables support alignment, inline math, and inline styles:

```markdown
| Feature      |         Requirement |                                           Efficiency |
| ------------ | ------------------: | ---------------------------------------------------: |
| Pair energy  | $>25\,\mathrm{GeV}$ |                                                0.851 |
| **Combined** |                   — | {{style:color=#d00000\|$\mathbf{4.2\times10^{-2}}$}} |
```

Use a fenced table block for CSV data and table-specific controls:

````markdown
```table
source: data/results.csv
animation: rows
animation-duration: 1.5s
animation-stagger: 180ms
highlight-row: 5
highlight-effect: glow
highlight-color: #ff0000
highlight-delay: 5.5s
```
````

A CSV file uses the first row as headers:

```csv
Feature,Requirement,DY efficiency,QCD efficiency
Pair energy fraction,>0.780,0.785,0.258
Combined,—,0.042,0.00063
```

CSV cells support inline math and style syntax after loading.

## Speaker notes

Add notes to a slide with:

```markdown
:::notes
Emphasize the $J/\psi$ peak before discussing
$$R_{AA}=\frac{Y_{AA}}{N_{coll}Y_{pp}}.$$
:::
```

Notes support inline/display math and inline styles. The viewer note popup also renders the previous- and next-slide titles with their math and styles.

## References

Use a references block for slide citations:

```markdown
:::references
[1] J. J. Aubert et al., Phys. Rev. Lett. 33, 1404 (1974).
[2] Collaboration, Journal 12, 34 (2026).
:::
```

Footnotes use standard Markdown notation:

```markdown
The experiment improved accuracy.[^1]

[^1]: Internal benchmark, July 2026.
```

## Groups and utility blocks

Wrap related content in a group when it should be positioned or replaced as one unit:

```markdown
::group

### A local heading

- One result
- Another result
  ::end
```

A heading inside a group remains a normal heading; it does not become the slide title or receive the slide-title separator.

NeoPresent also supports the following structured blocks. Each closes with
`:::` and accepts the normal block-style directives immediately before it.

### Callouts

```markdown
:::note
Context for the audience.
:::

:::tip
A useful shortcut.
:::

:::warning
A condition that must be checked.
:::
```

The accepted callout kinds are `note`, `tip`, and `warning`.

### Statistic card

The first non-empty line is the value; remaining lines are the label:

```markdown
:::stat
92%
Signal efficiency
:::
```

### Timeline

Use `|`, `—`, or `--` between date and description:

```markdown
:::timeline
2024 | Detector calibration
2025 | Final reconstruction
2026 | Physics result
:::
```

### Card grid

Each line is `icon | title | description`; up to three columns are used:

```markdown
:::cards
⚛︎ | Physics | Scientific diagrams and plots
▦ | Data | JSON and CSV sources
✦ | Delivery | Viewer, presenter, and export
:::
```

### Sticky box

```markdown
@sticky-position right
@sticky-width 24rem
@sticky-rotation -2deg
@sticky-fill #fff1a8
@sticky-alpha 95%
@sticky-tape center
@sticky-tape-alpha 18%
:::stickybox
Remember to state the systematic uncertainty.
:::
```

`sticky-position` is `left`, `center`, or `right`; `sticky-tape` is `left`,
`center`, `right`, or an off value. The full sticky and visual-effect key list
is in the [complete settings reference](settings-reference.md#block-and-inline-visual-effects).

### Live poll

The first line is the question and later lines are options:

```markdown
:::poll
Which model best describes the data?

- Model A
- Model B
- Undecided
  :::
```

Votes synchronize between mounted viewer/presenter poll instances through the
presentation channel; they are session-local rather than an external survey.

### Interactive button

```markdown
@button Open analysis note | https://example.com/note
```

Safe targets are HTTP(S), email, root/relative links, or `#slide=N`.

Prefer ordinary Markdown first, then use a structured block when its layout or
behavior adds value.

## Validation

Check syntax and list the compiled slide order before presenting:

```sh
neopresent check presentations/my-talk/presentation.md
neopresent outline presentations/my-talk/presentation.md
```

Related guides: [Layout and themes](layout-and-themes.md), [Media and diagrams](media-and-diagrams.md), [Plotting](plotting.md), and [Animation](animations.md).
