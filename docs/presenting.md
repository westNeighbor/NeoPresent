# Presenting and controls

NeoPresent separates the audience viewer from the presenter dashboard. Both consume the same deck and synchronize slide, reveal, animation, overview, notes, TOC, filmstrip, PDF inspection, and presentation-tool state.

## Open the two windows

Start the server:

```sh
neopresent serve presentations/my-talk/presentation.md
```

- Audience viewer: `http://localhost:9090/`
- Presenter dashboard: `http://localhost:9090/presenter.html`

Use `--port 9091` to choose another port. The server prints a local-network IPv4 URL when the viewer should be opened from another device.

Deck-level viewer controls can be enabled or disabled before the first slide:

```markdown
@controls visible
```

Use `@controls hidden` for a kiosk-style deck; keyboard and presenter navigation remain available.

## Automatic advance

Set a deck-wide interval with:

```markdown
@autoplay 8s
```

Autoplay advances reveal steps before advancing the slide. Manual navigation
pauses autoplay. Override one slide with `@duration 20s`, or require manual
advance there with `@duration off`.

## Built-in help

Press `H` or `?` in either window, or use the viewer **Help** / presenter **Shortcuts** control. Help follows the current slide theme and uses a translucent blurred panel over a dimmed presentation.

Close help with `H`, `?`, `Escape`, or a click outside the card. There is no separate Close button.

Viewer help is context-aware:

- In standalone mode it includes local animation, laser, spotlight, annotation, eraser, blank-screen, TOC, and filmstrip controls.
- With a presenter connected it explains that those presentation tools are owned by the presenter.

## Audience viewer shortcuts

| Shortcut                     | Action                                          |
| ---------------------------- | ----------------------------------------------- |
| `Right`, `Down`, `Page Down` | Advance a reveal or move to the next slide      |
| `Left`, `Up`, `Page Up`      | Reverse a reveal or move to the previous slide  |
| `Home` / `End`               | First / last slide                              |
| `O`                          | Open or cycle Grid, Gallery, and Helix overview |
| `Enter`                      | Select the focused overview slide               |
| `0`                          | Exit overview                                   |
| `Escape`                     | Close notes, TOC, filmstrip, or help            |
| `N`                          | Toggle speaker notes                            |
| `T`                          | Toggle table of contents                        |
| `V`                          | Toggle filmstrip                                |
| `C`                          | Toggle the viewer control bar                   |
| `P`                          | Toggle PDF inspection                           |
| `F`                          | Toggle fullscreen                               |
| `H` / `?`                    | Toggle context-aware help                       |

When no presenter is connected, the viewer also owns:

| Shortcut | Standalone action                |
| -------- | -------------------------------- |
| `Space`  | Pause or resume slide animations |
| `L`      | Toggle laser                     |
| `S`      | Toggle spotlight                 |
| `A`      | Toggle annotation                |
| `E`      | Toggle annotation eraser         |
| `B`      | Blank or resume the screen       |

With a presenter connected, viewer-side `Space`, `T`, `V`, `A`, `E`, `B`, `L`, and `S` are disabled so the two windows cannot create conflicting state.

## Presenter shortcuts

| Shortcut                     | Action                                               |
| ---------------------------- | ---------------------------------------------------- |
| `Right`, `Down`, `Page Down` | Advance the audience reveal or slide                 |
| `Left`, `Up`, `Page Up`      | Reverse the audience reveal or slide                 |
| `Home` / `End`               | First / last slide                                   |
| `Space`                      | Pause or resume animations in both windows           |
| `O`                          | Open or cycle audience overview                      |
| `Enter`                      | Select the focused overview slide                    |
| `0`                          | Exit audience overview                               |
| `F`                          | Find and jump to a slide                             |
| `M`                          | Bookmark the current slide                           |
| `L`                          | Toggle laser                                         |
| `S`                          | Toggle spotlight                                     |
| `A`                          | Toggle annotation                                    |
| `E`                          | Toggle annotation eraser                             |
| `B`                          | Blank or resume the audience screen                  |
| `N`                          | Toggle audience notes                                |
| `T`                          | Toggle TOC in current-slide preview and viewer       |
| `V`                          | Toggle filmstrip in current-slide preview and viewer |
| `C`                          | Toggle audience controls                             |
| `P`                          | Toggle audience PDF inspection                       |
| `Cmd/Ctrl+Z`                 | Undo annotation                                      |
| `Cmd/Ctrl+Shift+Z`           | Redo annotation                                      |
| `H` / `?`                    | Toggle presenter shortcut help                       |
| `Escape`                     | Close the active presenter dialog                    |

## PDF inspection controls

When audience PDF inspection is active, the presenter shows a floating toolbar above the current slide. It controls the viewer's full-size PDF inspection surface.

| Shortcut                  | PDF action                       |
| ------------------------- | -------------------------------- |
| `+` / `-`                 | Zoom in / out                    |
| `=` or `R`                | Fit to viewer width              |
| Arrow keys                | Scroll                           |
| `Shift+Up` / `Shift+Down` | Previous / next PDF on the slide |
| `Page Up` / `Page Down`   | Previous / next PDF on the slide |
| `P`                       | Exit PDF inspection              |

Each audience PDF uses viewer dimensions rather than presenter-preview dimensions. The original document remains available at readable size with vertical and horizontal scrolling as needed.

## Animation synchronization

Every newly selected slide starts automatically. The first press of `Space` pauses it; the next resumes from the same state. The presenter's current-slide preview waits for the scaled audience canvas before both begin, reducing visible drift.

Refreshing either viewer or presenter refreshes the paired window once so both restart the current slide together. A paused presenter preview displays an `Animation paused · Space to resume` tip; it is hidden while running. The red per-slide timer pauses with animation, while the overall timer continues to represent presentation elapsed time.

## Overview modes

Press `O` to cycle:

- Grid — compact slide sorter.
- Gallery — perspective 3D cards with focused depth.
- Helix — spiral 3D arrangement.

Use `Enter` to select the focused slide and `0` to exit overview. `Escape` is reserved for popup panels; `F` controls browser fullscreen.

Overview thumbnails are cached and held at their completed animation state. Navigation changes focus/camera state rather than rebuilding slide contents. Grid avoids content-tree updates, while Gallery and Helix retain their true 3D camera movement.

## TOC and filmstrip

The TOC supports sections, direct slide navigation, inline styles, and math. In a standalone viewer, hovered entries use a uniform-outline highlight distinct from the active slide's left accent.

The filmstrip supports clickable previews, horizontal scrolling, and trackpad gestures. Viewer and presenter thumbnails show a compact theme-aware page badge at the lower right.

## Laser and spotlight

The laser appears immediately when enabled at its last known position and disappears immediately when disabled or when the pointer leaves the current preview. Spotlight size, ring, and color are controlled from the presenter dashboard.

## Annotations

Press `A` to toggle the pen and `E` to toggle the eraser. If both are active, the eraser takes priority. The pointer symbol is rendered as monochrome text rather than a color emoji; its tip aligns with the annotation point in viewer and presenter.

New strokes default to red chalk. The presenter also offers Pen, Marker, Dashed, and Dotted styles plus color and thickness controls. Chalk uses a textured vector stroke in live view. Tool settings, undo, redo, and completed paths synchronize to the audience slide and stay attached to slide coordinates while the window resizes.

Use **Save ink** in presenter annotation controls to download a `*-annotations.json` file. It contains normalized vector paths for non-empty slides, including color, thickness, stroke style, and slide index.

Export saved ink with:

```sh
neopresent export presentations/my-talk/presentation.md --format pdf \
  --annotations presenter-annotations.json
```

The exporter verifies the deck slide count so annotations cannot silently move to a different presentation. See [Exporting](exporting.md).

## Timers and adjacent slides

The presenter top row contains:

- Overall elapsed time — hover text: presentation elapsed time.
- Red per-slide time — animation-reference time for the current slide; pauses with `Space`.

Previous and next previews remain vertically centered as the presenter window changes size. Their titles and speaker notes support inline styles and math.
