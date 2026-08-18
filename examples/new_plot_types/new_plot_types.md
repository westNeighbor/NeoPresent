@theme fyma-green
@fyma-gradient-direction to top
@aspect 16:10
@heading-position top
@heading-align center
@heading-offset 0px,-10px
@footer-left My Laboratory
@footer-right {{today}}
@page-number on
@page-total on

# Measurement overview

A short explanation with inline math $J/\psi$.

---
# Coordinate function plots

```plot
type: polar-function
title: Five-petal rose
function: 3*cos(5*theta)
theta-min: 0
theta-max: 2*pi
theta-samples: 720
polar-grid-levels: 5
animation: draw
```

---
# cylindrical function plots

```plot
type: surface
title: Cylindrical wave
surface-coordinates: cylindrical
surface-function: sin(r)*cos(3*theta)
r-min: 0
r-max: 6
r-samples: 36
theta-min: 0
theta-max: 2*pi
theta-samples: 72
surface-palette: kBird
surface-animation: wave
plot-width: 600px
plot-height: 520px
surface-background: transparent
```

---
# spherical function plots

```plot
type: surface
title: Deformed sphere
surface-coordinates: spherical
surface-function: 1 + .18*sin(5*theta)*sin(3*phi)
theta-min: 0
theta-max: 2*pi
theta-samples: 72
phi-min: 0
phi-max: pi
phi-samples: 36
surface-palette: kBlackBody
surface-animation: wave
plot-width: 600px
plot-height: 520px
surface-background: transparent
```

---
# parametric function plots

```plot
type: surface
title: Parametric torus
surface-coordinates: parametric
x-function: (2 + .7*cos(v))*cos(u)
y-function: (2 + .7*cos(v))*sin(u)
z-function: .7*sin(v)
u-min: 0
u-max: 2*pi
u-samples: 72
v-min: 0
v-max: 2*pi
v-samples: 36
surface-palette: kWaterMelon
surface-animation: wave
plot-width: 600px
plot-height: 520px
surface-background: transparent
```

---
# geojson

```plot
type: geographic
title: Regional event rate
source: data/regions2.geojson
geo-name-field: title
geo-value-field: event_rate
geo-palette: kViridis
geo-color-label: Event rate
legend: true
animation: grow
legend: true
legend-position: bottom-right
legend-offset-x: 40
legend-offset-y: -40
geo-colorbar-x: 750
geo-colorbar-y: 230
geo-colorbar-width: 18
geo-colorbar-height: 140
x-label-offset-x: 0
x-label-offset-y: -25
y-label-offset-x: 22
y-label-offset-y: 0
plot-width: 600px
plot-height: 520px
```

---
# geojson

```plot
type: geographic
title: Experimental sites and regions
source: data/regions.geojson
geo-name-field: title
legend: true
animation: draw
```

---
# external source

```plot
type: survival
title: Kaplan–Meier survival
source: data/survival.csv
value: time
survival-event-field: observed
survival-confidence: true
survival-confidence-level: 95
survival-confidence-color: #3b82f6
survival-confidence-alpha: .18
ecdf-points: true
ecdf-point-size: 4
x-label: Time
y-label: Survival probability
animation: draw
animation-duration: 1200ms
```

---
# QQ plot

```plot
type: qq
title: Normal QQ diagnostic
values: -1.7,-1.1,-0.8,-0.4,-0.1,0.2,0.5,0.9,1.3,1.9
x-label: Theoretical normal quantile
y-label: Observed value
animation: draw
animation-duration: 2s
```

---
# Probability-plot alias

```plot
type: probability-plot
title: Probability diagnostic
values: 2.1,2.4,2.8,3.0,3.2,3.5,3.9,4.3,4.8
animation: draw
```

---
# ECDF

```plot
type: ecdf
title: Empirical cumulative distribution
values: 1.2,1.5,1.8,2.0,2.1,2.4,2.8,3.1,3.7
x-label: Measurement
y-label: Cumulative probability
animation: draw
```

---
# Survival curve

```plot
type: survival
title: Survival probability
values: 2,3,5,6,8,9,12,15,18
x-label: Time
y-label: Survival probability
animation: draw
```

---
# Precision–recall curves

```plot
type: precision-recall
title: Classifier performance
series: Classifier A | x: 0,.15,.35,.55,.75,.9,1 | y: 1,.97,.91,.82,.68,.46,.22 | color: #3b82f6
series: Classifier B | x: 0,.15,.35,.55,.75,.9,1 | y: 1,.91,.82,.7,.55,.36,.18 | color: #ef4444
x-label: Recall
y-label: Precision
animation: draw
```

---
# Volcano plot

```plot
type: volcano
title: Differential response
x: -2.6,-1.8,-1.2,-.7,-.2,.3,.8,1.1,1.7,2.5
y: 4.8,2.7,1.8,.7,.3,.6,1.1,2.3,3.5,5.2
labels: Gene A,Gene B,Gene C,Gene D,Gene E,Gene F,Gene G,Gene H,Gene I,Gene J
x-label: $log_2$ fold change
y-label: $-log_{10}(p)$
volcano-fold-threshold: 1
volcano-significance-threshold: 1.30103
animation: draw
```

---
# Waterfall plot

```plot
type: waterfall
title: Sequential contributions
labels: Baseline,Calibration,Selection,Background,Systematic
values: 100,14,-22,-9,6
x-label: Contribution
y-label: Cumulative yield
animation: draw
```

---
# Sankey diagram

```plot
type: sankey
title: Event-selection flow
series: Generated -> Reconstructed | values: 850 | color: #3b82f6
series: Reconstructed -> Selected | values: 620 | color: #22c55e
series: Reconstructed -> Rejected | values: 230 | color: #ef4444
series: Selected -> Signal region | values: 410 | color: #a78bfa
series: Selected -> Control region | values: 210 | color: #f59e0b
animation: draw
```

---
# Alluvial alias

```plot
type: alluvial
title: Sample migration
series: Initial A -> Final X | values: 55 | color: #3b82f6
series: Initial A -> Final Y | values: 25 | color: #60a5fa
series: Initial B -> Final X | values: 20 | color: #ef4444
series: Initial B -> Final Y | values: 48 | color: #f87171
animation: draw
```

---
# Time series with uncertainty band

```plot
type: time-series
title: Monthly detector response
labels: 2026-01,2026-02,2026-03,2026-04,2026-05,2026-06
values: 10.2,11.1,10.8,12.0,11.7,12.6
error: .4,.5,.3,.6,.4,.5
x-label: Month
y-label: Response
time-window: 6
animation: draw
```

---
# Geographic point plot

```plot
type: geographic
title: Collaboration sites
x: -87.63,-74.01,2.35,7.42,139.69
y: 41.88,40.71,48.86,46.95,35.68
labels: Chicago,New York,Paris,Geneva,Tokyo
x-label: Longitude
y-label: Latitude
animation: draw
```

---
# Geographic region polygons

```plot
type: geographic
title: Supplied geographic regions
series: Northern region | x: -15,12,18,-8 | y: 38,40,57,55 | color: #3b82f6
series: Southern region | x: 25,48,42,20 | y: -30,-25,-8,-12 | color: #f59e0b
animation: draw
```
---
# Contour plot

```plot
type: contour
title: Likelihood scan
x: 0,1,2,3,4
y: 0,1,2,3
values: 0.2,0.7,1.1,0.6,0.1, 0.5,1.8,3.2,1.7,0.4, 0.3,1.5,2.7,1.4,0.3, 0.1,0.5,0.9,0.4,0.1
x-label: Mass
y-label: Width
heatmap-color-label: Likelihood
heatmap-palette: kBird
contour-levels: 8
contour-fill: true
contour-line-color: #ffffff
contour-line-width: 1.5
animation: draw
```

---
# 2D density plot

```plot
type: density2d
title: Event density
x: 0.08,0.12,0.18,0.22,0.28,0.31,0.38,0.42,0.47,0.52,0.58,0.63,0.68,0.72,0.78,0.84,0.89,0.94
y: 0.15,0.22,0.18,0.31,0.26,0.39,0.34,0.48,0.43,0.57,0.52,0.66,0.61,0.74,0.69,0.82,0.77,0.91
x-label: Observable A
y-label: Observable B
density-grid-size: 32
density-bandwidth: 0.09
density-palette: kViridis
heatmap-color-label: Density
animation: draw
```

---
# Stacked bars

```plot
type: stacked-bar
labels: 2022, 2023, 2024
series: Signal | values: 42,58,71 | color: #3b82f6
series: Background | values: 31,27,22 | color: #ef4444
animation: draw
```

---
# Ternary plot

`x`, `y`, and `values` are the A, B, and C components:

```plot
type: ternary
labels: Sample 1, Sample 2, Sample 3
x: 20,50,25
y: 30,20,50
values: 50,30,25
ternary-a-label: Solid
ternary-b-label: Liquid
ternary-c-label: Gas
animation: draw
```

---
# Forest plot

```plot
type: forest
labels: Study A, Study B, Study C
values: 1.2,.85,1.05
error-low: .2,.12,.18
error-high: .25,.15,.2
forest-zero: 1
animation: draw
```

---
# Corner plot

Each series represents one variable. Diagonal cells show marginal histograms
and lower-triangle cells show pairwise samples:

```plot
type: corner
series: Mass | values: 3.08,3.11,3.09,3.13,3.10
series: Width | values: .08,.07,.09,.08,.10
series: Yield | values: 92,105,98,111,101
animation: draw
```
---
# Polar plot

```plot
type: polar
labels: 0°, 60°, 120°, 180°, 240°, 300°
values: 4,7,5,8,6,3
y-label: Response
polar-max: 10
polar-grid-levels: 5
polar-label-size: 18
polar-label-color: #153d31
polar-grid-color: #79b998
animation: draw
```

---
# ROC curve

```plot
type: roc
series: Classifier A | x: 0,.05,.15,.35,1 | y: 0,.55,.78,.92,1 | color: #3b82f6
series: Classifier B | x: 0,.08,.22,.45,1 | y: 0,.48,.71,.88,1 | color: #ef4444
animation: draw
```
---
# efficiency with binomial errors
```plot
type: efficiency
labels: Trigger, Tracking, Selection
values: 920,810,640
efficiency-total: 1000,920,810
efficiency-confidence: 95%
animation: grow
```

---
# ratio and pull panels

```plot
type: ratio
labels: Bin 1, Bin 2, Bin 3
series: Data | values: 102,87,64 | error: 10,9,8
series: Model | values: 98,91,61
ratio-reference: 1
animation: draw
animation-duration: 1900ms
```

---
# radar plot
```plot
type: radar
title: Model comparison
labels: Accuracy, Speed, Stability, Coverage, Efficiency
radar-min: 0
radar-max: 100
radar-grid-levels: 5
legend: true
animation: draw
animation-duration: 900ms

series: Model A | values: 82,74,91,68,79 | color: #3b82f6 | legend: true
series: Model B | values: 71,89,76,84,73 | color: #ef4444 | legend: true
```

---
# group bar plot

```plot
type: bar
title: County population by year
labels: 2022, 2023, 2024
x-label: Year
y-label: Population
legend: true
animation: grow
animation-duration: 900ms

series: Cook | values: 42,58,71 | color: #ef4444 | legend: true
series: DuPage | values: 31,37,44 | color: #3b82f6 | legend: true
series: Lake | values: 22,29,35 | color: #22c55e | legend: true
```

---

# Data and model

```plot
type: donut
title: Event composition
labels: Signal, Background, Other
values: 52,33,15
pie-colors: #ef4444,#3b82f6,#22c55e
pie-inner-radius: 45
animation: draw
animation-duration: 1900ms
```
