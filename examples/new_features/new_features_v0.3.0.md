@theme fyma-green
@fyma-gradient-direction to top
@aspect 16:10
@heading-position top
@heading-align center
@footer-left My Laboratory
@footer-right {{today}}
@page-number on
@page-total on

# Measurement overview

A short explanation with inline math $J/\psi$.

---
# Drop versus contact shadow

::columns widths: 40%, 40%

::column
### Drop shadow

@fill #ffffff
@border line
@border-size 0px
@shadow drop
@shadow-color #000000
@shadow-opacity 50%
@shadow-angle 45
@shadow-distance 14px
@shadow-blur 8px
@border-padding 0px
::group
## Floating

Drop shadow follows the complete shape.

It makes the object appear suspended above the slide.
::end

::column
### Contact shadow

@fill #ffffff
@border line
@border-size 0px
@shadow contact
@shadow-color #000000
@shadow-opacity 65%
@shadow-distance 1px
@shadow-blur 5px
@shadow-size 12px
@shadow-perspective 0
@border-padding 0px
::group
## Standing

Contact shadow is concentrated underneath the object.

It makes the object appear to rest directly on the slide.
::end

::end

---
# Contact-shadow perspective

::columns widths: 30%, 30%, 30%

::column
### Lean left

@fill #ffffff
@shadow contact
@shadow-opacity 55%
@shadow-distance 2px
@shadow-blur 6px
@shadow-size 10px
@shadow-perspective -100
@border-padding 24px
::group
## Left

Perspective −100
::end

::column
### Centered

@fill #ffffff
@shadow contact
@shadow-opacity 55%
@shadow-distance 2px
@shadow-blur 6px
@shadow-size 10px
@shadow-perspective 0
@border-padding 24px
::group
## Center

Perspective 0
::end

::column
### Lean right

@fill #ffffff
@shadow contact
@shadow-opacity 55%
@shadow-distance 2px
@shadow-blur 6px
@shadow-size 10px
@shadow-perspective 100
@border-padding 24px
::group
## Right

Perspective +100
::end

::end

---
# Shadow style comparison

::columns widths: 33%, 33%, 33%

::column
### Drop

@shadow drop
@shadow-opacity 45%
@shadow-angle 45
@shadow-distance 12px
@shadow-blur 4px
@border-padding 25px
::group
## Hovering

The shadow follows the rendered object and is displaced from it.
::end

::column
### Contact

@shadow contact
@shadow-opacity 45%
@shadow-distance 5px
@shadow-blur 4px
@shadow-size 5px
@shadow-perspective 85
@border-padding 25px
::group
## Standing

The shadow is compressed beneath the object like a contact footprint.
::end

::column
### Curved

@shadow curved
@shadow-opacity 45%
@shadow-distance 18px
@shadow-blur 2px
@shadow-size 18px
@shadow-curve 90
@border-padding 25px
::group
## Curled

The lower corners cast separated 
::end

::end

---
# Curved shadow comparison

::columns widths: 30%, 30%

::column
### Outward curl

@fill #ffffff
@border line
@border-size 0px
@shadow curved
@shadow-color #000000
@shadow-opacity 60%
@shadow-offset 0px, 8px
@shadow-blur 6px
@shadow-size 2px
@shadow-curve 100
::group
## Outward

The two lower corners cast a deeper shadow.

This suggests that the center remains close to the slide while the corners curl upward.
::end

::column
### Inward curl

@fill #ffffff
@border line
@border-size 0px
@shadow curved
@shadow-color #000000
@shadow-opacity 60%
@shadow-offset 0px, 8px
@shadow-blur 6px
@shadow-size 2px
@shadow-curve -100
::group
## Inward

The center casts the deeper shadow.

This suggests that the center lifts while the corners remain closer to the slide.
::end

::end

---
# Function and fitting morph test

@block-transition-trigger reveal
@block-exit replace

```plot
type: scatter
title: Function and linear fit
x: 1, 2, 3, 4, 5
y: 3, 5, 7, 9, 11
draw: LP
symbol: circle
data-color: #2563eb
x-min: 0
x-max: 6
y-min: 0
y-max: 20
x-label: $x$
y-label: $y$

function: 2*x + 1 | label: Model | color: #16a34a | width: 3 | legend: true

fit: a + b*x
fit-id: linear-fit
fit-params: a=0, b=1
fit-draw: true
fit-color: #ef4444
fit-width: 3
fit-results: true
fit-quality: true
fit-legend: true
fit-legend-label: Linear fit

legend: true
```

@block-enter morph
@block-exit replace
@block-transition-duration 2900ms

```plot
type: scatter
title: Function and linear fit
x: 1, 2, 3, 4, 5
y: 5, 8, 10, 14, 17
draw: LP
symbol: circle
data-color: #2563eb
x-min: 0
x-max: 6
y-min: 0
y-max: 20
x-label: $x$
y-label: $y$

function: 3*x + 2 | label: Model | color: #16a34a | width: 3 | legend: true

fit: a + b*x
fit-id: linear-fit
fit-params: a=0, b=1
fit-draw: true
fit-color: #ef4444
fit-width: 3
fit-results: true
fit-quality: true
fit-legend: true
fit-legend-label: Linear fit

legend: true
```
---
# morph anim for built-in plots
@glass off
@block-transition-trigger reveal

@shadow curved
@block-exit replace
@block-enter morph
```plot
type: line
x: 1, 2, 3
y: 12, 20, 16
y-min: 10
y-max: 30
```

@glass off
@block-enter morph
@block-exit replace
@block-transition-duration 2900ms
```plot
type: line
x: A, B, C
y: 16, 14, 24
y-min: 10
y-max: 30
```
---
# new programming languages support

```rust linenums
fn main() {
    println!("Hello from Rust");
}
```
---
# Coordinate function plots
@shadow drop
@shadow-angle 45
@shadow-distance 8px
@shadow-blur 7px
@shadow-opacity 35%
```plot
type: polar-function
title: Five-petal rose
function: 3*cos(5*theta)
theta-min: 0
theta-max: 2*pi
theta-samples: 720
polar-grid-levels: 5
animation: draw
chart-trim: 0 120
chart-padding: 8px
```

