---
@section The $J/\psi$ analysis validation
:::notes
[Section transition: about 0:10]

The J/psi analysis tests the complete dielectron chain in data before applying it to the rarer Drell–Yan continuum.
:::

---
# Why $J/\psi$ is the right validation channel

::columns widths: 60%, 60%
::column
::group
#### Same reconstructed final state
- $J/\psi\rightarrow e^+e^-$
- $\gamma^*/Z\rightarrow e^+e^-$
- Two forward electromagnetic candidates
- FPS charge signatures
- FMS energy and invariant mass
::end
::column

@block-transition-trigger reveal
@block-exit replace
```image
src: ./assets/jpsi/jpsi_discovery_mass_spectrum.png
alt: Original 1974 dielectron mass spectrum showing the J peak
width: 100%
height: auto
max-height: 59vh
fit: contain
align: center
caption: Original 1974 dielectron mass spectrum showing the J peak
```

@block-enter grow
@block-exit replace
::group
#### A stronger experimental handle
- Known narrow mass peak at $3.0969$ GeV/$c^2$
- Immediately below the Drell–Yan window, $4<M_{e^+e^-}<9$ GeV/$c^2$
- Much larger yield than the continuum signal
- Published PHENIX cross section for comparison
::end
::end

{{style:size=28px;color=#8b1a1a|If the analysis recovers the neighboring $J/\psi$ peak, the detector and dielectron reconstruction are ready for Drell–Yan.}}

:::notes
[Timing: about 1:35]

J/psi is the most useful validation channel because it decays to exactly the same reconstructed final state as Drell–Yan: two forward electromagnetic candidates with FPS charge signatures, FMS energies, and a common invariant mass.

It also provides a stronger experimental handle. Its known mass is 3.0969 GeV per c squared, immediately below the 4-to-9 GeV Drell–Yan window, so it tests a nearby energy regime. Its narrow peak and larger yield allow us to evaluate the energy scale, resolution, selection, and background subtraction in data.

The historical spectrum emphasizes the essential feature: a resonance produces a visible enhancement over a smooth continuum.

Transition: I first evaluate how efficiently the proposed topology cuts retain simulated J/psi events.

[Sources]
- J/psi mass value: Particle Data Group.
- Historical discovery spectrum shown in `assets/jpsi/jpsi_discovery_mass_spectrum.png`.
:::

---
# Feature cuts retain 65% of simulated $J/\psi$ signal
@scale 78%
::columns
::column
```pdf
src: ./assets/jpsi/jpsi_recoSimuMass_afterCuts1_linear.pdf
page: 1
```
::column
```pdf
src: ./assets/jpsi/jpsi_recoSimuMass_afterCuts2_linear.pdf
page: 1
```
::end

::columns
::column
### Preselection

- One FMS cluster per candidate
- $p_T>1.3$ GeV
- Charged-track signature in FPS
::column
### Event topology

- Pair carries most of the FMS energy
- Balanced candidate energies
- Low FMS/FPS multiplicity
::end

{{style:size=30px;color=#8b1a1a|The cuts favor a clean two-body electromagnetic topology.}}

:::notes
[Timing: about 1:25]

The two mass spectra show the simulated J/psi sample before and after the successive feature selections. The retained signal efficiency is approximately 65 percent.

The preselection requires one FMS cluster per candidate, transverse momentum above 1.3 GeV, and a charged signature in the FPS. The topology cuts then favor events in which the pair carries most of the FMS energy, the two candidates are reasonably balanced, and the surrounding FMS and FPS multiplicities are low.

These choices target a clean two-body electromagnetic final state while retaining most of the simulated resonance.

Transition: Applying these selections to data allows a direct test of whether the resonance can be recovered above background.
:::

---
# A clear $J/\psi$ signal emerges after background subtraction

@block-transition-trigger reveal
@block-exit replace
@block-enter grow
@offset 0, 20px
::columns widths: 40%, 40%, 40%
::column
```pdf
src: ./assets/jpsi/jpsiData_bgfit_cuts1_1_nopars.pdf
page: 1
```
::column
```pdf
src: ./assets/jpsi/jpsiData_bgfit_cuts1_2_nopars.pdf
page: 1
```
::column
```pdf
src: ./assets/jpsi/jpsiData_sgfit_cuts1.pdf
page: 1
```
::end

@block-enter grow
@block-exit replace
@offset 0, 10px
::columns widths: 40%, 40%, 40%
::column
```pdf
src: ./assets/jpsi/jpsiData_bgfit_cuts2_1_nopars.pdf
page: 1
```
::column
```pdf
src: ./assets/jpsi/jpsiData_bgfit_cuts2_2_nopars.pdf
page: 1
```
::column
```pdf
src: ./assets/jpsi/jpsiData_sgfit_cuts2.pdf
page: 1
```
::end

@body-align left
::group
@scale 130%
- **Left/middle:** fit the sidebands and interpolate the smooth background through the excluded signal region.
- **Right:** subtract that background; the remaining enhancement is the reconstructed $J/\psi$.
- The peak confirms that calibrated forward clusters recover a known $e^+e^-$ state.
::end

:::notes
[Timing: about 1:50]

This slide shows two stages of the J/psi background-subtraction study. In each row, the left and middle panels establish the smooth background using sidebands around the excluded signal region. The fitted background is interpolated through the J/psi mass region. The right panel shows the residual after subtraction.

A clear enhancement remains near the expected resonance region for both cut configurations. The reconstructed peak is around 2.9 GeV rather than the world-average 3.097 GeV. Because the same downward shift appears in simulation and data, it primarily indicates a common reconstruction or energy-scale bias rather than a data-only detector failure. It does mean the absolute mass scale is biased by roughly six percent and must not be interpreted as a precision mass measurement.

For this validation, the key result is that calibrated forward clusters and the selection recover a known dielectron state with consistent data–simulation behavior.

Transition: I next ask whether the observed yield is also reasonable in order of magnitude.
:::

---
# The observed $J/\psi$ yield is compatible with an external benchmark


@block-transition-trigger reveal

@block-enter grow
@block-exit replace
@reveal
@offset 0, 50px
```plot
type: scatter
animation-trigger: reveal
reveal-stages: 5
title: PHENIX $J/\psi$ measurement at $\sqrt{s}=510$ GeV
title-offset-y: 40.0
series: Measured | source: ./data/jpsi/phenix_jpsi_y510.json | x: rapidity | y: cs | draw: P | symbol: circle| data-size: 3 | color: #000000  | animation: draw | animation-duration: 1.0s | legend-order: 1 | reveal-stage: 1
uncertainty: Statistical | error: estat | style: bar | color: #ff0000 | width: 2.0 | legend: true | animation: grow | animation-duration: 1.0s | legend-order: 2 | reveal-stage: 1
uncertainty: Systematic | error: esys | style: box | color: #808080 | fill-color: #808080 | fill-alpha: .16 | animation: grow | animation-duration: 1.0s | visible: true | legend: true | legend-order: 3 | reveal-stage: 1

series: Sampled | source: ./data/jpsi/phenix_jpsi_y510.json | x: rapidity | y: y_0 | draw: P | symbol: circle | data-size: 3 | color: #ff0000 | animation: draw | animation-duration: 1.0s | legend-order: 4 | reveal-stage: 3

fit: a * exp(-0.5*((x -b) / c)^2)
fit-params: a=75.0, b=0.0, c=1.5
fit-errors: true
fit-series: Sampled
fit-draw: true
fit-x-min: -4.0
fit-x-max: 4.0
fit-results: false
fit-animation: draw
fit-animation-duration: 2.0s
fit-color: #ff0000
fit-width: 1
fit-alpha: 0.65
fit-legend: true
fit-legend-label: Gaussian fit
fit-reveal-stage: 4

series-loop: Dataset {i} | source: ./data/jpsi/phenix_jpsi_y510.json | x: rapidity | y: y_{i} | error: error_{i} | from: 1 | to: 99 | visible: false | draw: PE | data-size: 2.0 | data-alpha: 0.5 | animation: rise | animation-duration: 450ms | animation-delay: {0+i*1}s | fit-color: #ff0000 | fit-width: 1 | fit-alpha: 0.15 
fit: a * exp(-0.5*((x -b) / c)^2) 
fit-params: a=75.0, b=0.0, c=1.5 
fit-errors: true 
fit-all: true
fit-results: false
fit-draw: true 
fit-x-min: -4.0 
fit-x-max: 4.0
fit-animation: draw
fit-animation-duration: 1.0s
fit-animation-stagger: 180ms
fit-color: #ff0000
fit-width: 1
fit-alpha: 0.05
fit-legend: false
fit-reveal-stage: 5

x-min: -5.0 
x-max: 5.0
y-min: 0.0
y-max: 90
x-label: Rapidity
y-label: d$\sigma$/dy (nb)
x-label-offset-x: 250.0
x-label-offset-y: -10.0
shape: line | x: 2.8 | y: 0 | x2: 2.8 | y2: 20 | color: #0000ff | line-style: root-5 | animation: draw | animation-duration: 1.0s | label: $2.8<y<3.7$ | reveal-stage: 2
shape: line | x: 3.7 | y: 0 | x2: 3.7 | y2: 20 | color: #0000ff | line-style: root-5 | animation: draw | animation-duration: 1.0s | reveal-stage: 2
#reference: Rapidity Range: | x: 2.8, 3.7 | line-style: root-5 | legend: true | color: #0000ff | animation: draw | animation-duration: 1.0s | label: false
annotation: $2.8<y<3.7$ | x: 0.85 | y: 0.75 | align: center | color: #0000ff | animation: draw | animation-duration: 1.0s | reveal-stage: 2

legend-position: top-right
legend-offset-x: 80 
plot-width: 900px
plot-height: 540px
caption: Phys. Rev. D 101, 052006
caption-size: 32px
```

@block-enter grow
@block-exit replace
::group
::columns
::column
```pdf
src: ./assets/jpsi/phenix_jpsi_y510.pdf
page: 1
```
::column
```plot
type: histogram
title: Integral d$\sigma$/dy in $2.8<y<3.7$ (nb)
title-offset-y: 40.0
source: ./data/jpsi/phenix_jpsi_y510_cs_integral.json
values: cs_integral
bins: 30
data-color: #0000ff
x-min: 0
x-max: 15
y-max: 192
x-label: Extrapolated $J/\psi$ cross section ($2.8<y<3.7$) [nb]
y-label: Counts
x-label-offset-x: 0.0
x-label-offset-y: -10.0
fill: false
frame-top: true
frame-right: true
ticks-top: true
ticks-right: true
ticks-bottom: true
ticks-left: true
minor-ticks: true
tick-divisions: 5
tick-length: 8
minor-tick-length: 4
stats: entries, mean, stddev 
stats-fill: false
stats-title: PHENIX Extrapolation
stats-mean-color: #ff0000
stats-stddev-color: #ff0000
animation: draw
animation-duration: 0.0s
animation-delay: 1.0s
stats-animation: reveal
stats-animation-delay: 1s
stats-animation-stagger: 300ms
stats-animation-duration: 1500ms
stats-animation-easing: ease-out
plot-width: 600px
plot-height: 320px
```

::end

{{style: size=48px | $N_{J/\psi}^{\mathrm{estimate}} = \sigma \cdot \mathcal{L} \cdot \varepsilon$}}
::end

@block-enter grow
@block-exit replace
@offset 0, 50px
::group
::columns widths: 52%, 48%
::column
```pdf
src: ./assets/jpsi/phenix_jpsi_y510.pdf
page: 2
```
::column
```pdf
src: ./assets/jpsi/yield_to_campare_with_PHENIX.pdf
page: 1
```
::end

::columns
::column
### PHENIX-based projection
$N_{J/\psi}\sim(4.0\pm1.2)\times10^5$
::column
### STAR reconstruction
$N_{J/\psi}\approx(1.84\pm0.034)\times10^5$
::end

{{style:size=32px|The forward extrapolation has a large uncertainty, but the yields agree in scale.}}

{{style:size=32px|This validates the order of magnitude of the efficiency; it is not a precision cross-section result.}}
::end


:::notes
[Timing: about 2:10]

This comparison starts from the published PHENIX J/psi differential cross section at 510 GeV. The first view shows the measured rapidity points and the forward interval from 2.8 to 3.7. Because PHENIX does not directly measure the entire STAR interval, I sample the uncertainties and fit a rapidity shape to extrapolate into the forward region.

The histogram summarizes the resulting spread of integrated cross-section estimates. Multiplying the extrapolated cross section by luminosity and reconstruction efficiency gives an expected yield of about 4.0 plus or minus 1.2 times ten to the fifth.

STAR reconstructs approximately 1.84 plus or minus 0.034 times ten to the fifth candidates. Given the substantial extrapolation, acceptance, and efficiency uncertainties, the two numbers agree in scale. This is an order-of-magnitude validation of efficiency—not a new precision cross-section measurement.

Transition: Having validated the detector response and dielectron reconstruction, I now move to the more difficult Drell–Yan continuum.

[Sources]
- PHENIX, Phys. Rev. D 101, 052006, as displayed on the slide.
:::
