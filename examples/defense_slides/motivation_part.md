---
@section Physics motivation · From spin to Drell-Yan measurement
:::notes
[Section transition: about 0:10]

This first section develops the physics question from elementary particles to the observable measured in this dissertation.
:::

---
# Standard model of particle physics 
@scale 140%
@reveal
```plot
type: standard-model
animation-trigger: reveal
reveal-stages: 4
export-stages: false
reveal-stage-default: 4
diagram-highlight-legend: true
diagram-highlight-legend-x: 78
diagram-highlight-legend-y: 420
diagram-highlight-legend-size: 9

diagram-highlight: generation-I | label: First generation | duration: 2s | dim-alpha: 0.50 | stage: 1
diagram-highlight: generation-II | label: Second generation | duration: 2s | dim-alpha: 0.50 | stage: 2
diagram-highlight: generation-III | label: Third generation | duration: 2s | dim-alpha: 0.50 | stage: 3
diagram-highlight: force-bosons | label: Force Bosons | duration: 2s | dim-alpha: 0.50 | stage: 4
diagram-tooltips: true
```

@body-align left
@scale 130%
@list-symbol ⚛︎ 
- Three generations of quarks and leptons
- Intrinsic properties: mass, charge, spin
- Interactions through exchanging gluons, photons and bosons

:::notes
[Timing: about 1:00]

The Standard Model organizes matter into three generations of quarks and leptons and describes their interactions through force-carrying bosons. For this analysis the central sector is quantum chromodynamics: quarks interact by exchanging gluons.

The diagram reveals the particle generations and then the force bosons. The proton is not elementary; its observable properties emerge from interacting quarks and gluons. Spin is one of those intrinsic properties, but explaining how the proton obtains its total spin requires understanding the internal QCD dynamics.

Transition: I will now focus on the proton and the decomposition of its spin.
:::

---
# Proton and its spin
```image
src: ./assets/motivation/proton_spin.jpg
alt: Proton spin
width: 30%
height: auto
fit: contain
align: center
```

@body-align left
@list-symbol ★︎
@scale 130%
- composed of two ups and one down quarks, 
- charge: $+1$, mass: $938.27\ \mathrm{MeV}/c^2$ and spin: ${\frac{1}{2}\hbar}$

@scale 130%
@reveal
:::fragment zoom
spin-$1/2 = \Delta\Sigma/2 + \Delta G + L_q + L_g $
:::

@scale 130%
:::fragment slide-up
Experimental contraint: $\Delta\Sigma/2 \sim 30\%$, $\Delta G \sim 50\%$
:::

@scale 130%
:::fragment slide-up
I use the Drell-Yan production to probe the spin of proton
:::

:::notes
[Timing: about 1:30]

The proton has charge plus one, mass 938.27 MeV per c squared, and spin one half. The familiar two-up-one-down picture gives its valence-quark content, but it is not a complete picture of its spin.

The decomposition shown here separates quark and antiquark helicity, gluon helicity, quark orbital angular momentum, and gluon orbital angular momentum. Experiments indicate that quark helicity contributes only about 30 percent in this convention, while gluon polarization provides a substantial but still incomplete contribution. Orbital motion and transverse parton dynamics therefore matter.

My analysis uses Drell–Yan production to probe a correlation between proton transverse spin and parton transverse momentum.

Transition: The Drell–Yan hard process gives a clean way to carry partonic information into a measurable lepton pair.
:::


---
# Proton spin flow in Drell-Yan process
@shadow drop
@shadow-angle 45
@shadow-distance 8px
@shadow-blur 7px
@shadow-opacity 35%
{{style:size=48px;offset=0px, 20px | $q+\bar q\rightarrow\gamma^*/Z\rightarrow e^-+e^+$}}

@shadow drop
@shadow-angle 45
@shadow-distance 8px
@shadow-blur 7px
@shadow-opacity 35%
@reveal
```feynman
width: 1200
height: 420
background: transparent
color: #111111
line-width: 3
font-size: 28
animation: draw
animation-trigger: reveal
animation-order: right-to-left
animation-duration: 900ms
animation-stagger: 100ms
reveal-stages: 3
reveal-stage-default: 3

# Polarization arrows and labels
vertex: spin-top-start | x: .018 | y: .27 | visible: false
vertex: spin-top-end | x: .125 | y: .27 | visible: false
vertex: spin-top-label | x: .055 | y: .105 | label: $\vec{S}_p$ | label-size: 34 | visible: false
vertex: spin-bottom-start | x: .018 | y: .73 | visible: false
vertex: spin-bottom-end | x: .125 | y: .73 | visible: false
vertex: spin-bottom-label | x: .055 | y: .565 | label: $\vec{S}_p$ | label-size: 34 | visible: false

# Proton discs, followed by constituent dots so they paint on top
vertex: proton-top | x: .205 | y: .27 | size: 65 | color: #b9dcf7
vertex: proton-bottom | x: .205 | y: .73 | size: 65 | color: #fac7c3
vertex: top-red | x: .220 | y: .205 | size: 14 | color: #ef1717
vertex: top-green | x: .180 | y: .285 | size: 14 | color: #169b35
vertex: top-blue | x: .222 | y: .305 | size: 14 | color: #0878be
vertex: bottom-red | x: .220 | y: .665 | size: 14 | color: #ef1717
vertex: bottom-green | x: .180 | y: .745 | size: 14 | color: #169b35
vertex: bottom-blue | x: .222 | y: .765 | size: 14 | color: #0878be

# Decorative collinear parton lines leaving each proton
vertex: top-line-a | x: .205 | y: .225 | visible: false
vertex: top-line-b | x: .205 | y: .270 | visible: false
vertex: top-line-c | x: .205 | y: .315 | visible: false
vertex: top-line-a-end | x: .350 | y: .225 | visible: false
vertex: top-line-b-end | x: .350 | y: .270 | visible: false
vertex: top-line-c-end | x: .350 | y: .315 | visible: false
vertex: bottom-line-a | x: .205 | y: .685 | visible: false
vertex: bottom-line-b | x: .205 | y: .730 | visible: false
vertex: bottom-line-c | x: .205 | y: .775 | visible: false
vertex: bottom-line-a-end | x: .350 | y: .685 | visible: false
vertex: bottom-line-b-end | x: .350 | y: .730 | visible: false
vertex: bottom-line-c-end | x: .350 | y: .775 | visible: false

# Hard-scattering vertices and outgoing leptons
vertex: annihilation | x: .525 | y: .500 | size: 10 | color: #111111 | reveal-stage: 2
vertex: decay | x: .745 | y: .500 | size: 10 | color: #111111 | reveal-stage: 1
vertex: lepton-plus | x: .940 | y: .185 | label: $\ell^+$ | label-offset-x: 28 | label-offset-y: -8 | label-size: 34 | visible: false | reveal-stage: 1
vertex: lepton-minus | x: .940 | y: .815 | label: $\ell^-$ | label-offset-x: 28 | label-offset-y: 20 | label-size: 34 | visible: false | reveal-stage: 1

edge: spin-top-start -> spin-top-end | type: fermion | color: #1e64b7 | line-width: 10 | arrow-size: 26 | arrow-position: .82
edge: spin-bottom-start -> spin-bottom-end | type: fermion | color: #d8322a | line-width: 10 | arrow-size: 26 | arrow-position: .82

edge: top-line-a -> top-line-a-end | type: fermion | arrow: false | color: #2767a8 | line-width: 3
edge: top-line-b -> top-line-b-end | type: fermion | arrow: false | color: #2767a8 | line-width: 3
edge: top-line-c -> top-line-c-end | type: fermion | arrow: false | color: #2767a8 | line-width: 3
edge: bottom-line-a -> bottom-line-a-end | type: fermion | arrow: false | color: #df3d35 | line-width: 3
edge: bottom-line-b -> bottom-line-b-end | type: fermion | arrow: false | color: #df3d35 | line-width: 3
edge: bottom-line-c -> bottom-line-c-end | type: fermion | arrow: false | color: #df3d35 | line-width: 3

edge: top-line-b-end -> annihilation | type: fermion | label: $q$ | label-position: .18 | label-offset-y: -28 | arrow-position: .56 | arrow-size: 15
edge: annihilation -> bottom-line-b-end | type: fermion | label: $\bar q$ | label-position: .82 | label-offset-y: 34 | arrow-position: .44 | arrow-size: 15
edge: annihilation -> decay | type: photon | color: #0000ee | label: $\gamma^*(Z)$ | label-offset-y: -32 | label-size: 31 | reveal-stage: 2
edge: lepton-plus -> decay | type: fermion | color: #00dd00 | arrow-position: .58 | arrow-size: 15 | reveal-stage: 1
edge: decay -> lepton-minus | type: fermion | color: #00de00 | arrow-position: .58 | arrow-size: 15 | reveal-stage: 1
```

@body-align left
@list-symbol  ✍︎
@scale 140%
- Quark's helicity is conserved in the hard subprocess
- The helicity of the quark $\rightarrow$ polarization of $\gamma^*$ $\rightarrow$ angular distribution of $\ell^+\ell^-$ 
- Pair mass and azimuth reconstruct the hard scale and spin modulation.

:::notes
[Timing: about 1:35]

The hard subprocess is quark–antiquark annihilation into a virtual photon or Z boson, followed by decay into an electron–positron pair. Read the diagram from the incoming polarized protons toward the final leptons.

Because the electromagnetic hard scattering is well understood, the pair kinematics retain information about the annihilating partons. The dilepton invariant mass sets the hard scale, while the pair azimuth provides access to spin-dependent modulations. The statement about helicity flow motivates why the final-state angular distribution can analyze the initial partonic state.

For this dissertation I do not attempt to reconstruct every spin-dependent structure. I extract the transverse single-spin asymmetry associated with the pair azimuth.

Transition: The next slide defines that measurable asymmetry.
:::
---
# $A_N$ is a measurable quantity

{{style: size=48px | $A_N=\frac{d\sigma^{\uparrow}-d\sigma^{\downarrow}}{d\sigma^{\uparrow}+d\sigma^{\downarrow}}$}}

@scale 110%
::columns widths: 60%, 60%
::column
{{style:size=30px|Spin up}}

$d\sigma^{\uparrow}$: yield to one side of the polarized beam
::column
{{style:size=30px|Spin down}}

$d\sigma^{\downarrow}$: the corresponding yield after reversing the spin
::end

@scale 200%
{{style:size=24px;color=#8b1a1a|A nonzero $A_N$ requires an azimuthal correlation, not simply a rate difference.}}

:::notes
[Timing: about 1:15]

The transverse single-spin asymmetry compares cross sections for opposite orientations of one polarized beam. The numerator is the spin-dependent difference; the denominator normalizes it by the spin-averaged rate.

The labels “one side” and “corresponding side after reversing spin” are important: a physical transverse asymmetry is an azimuthal left–right correlation. It is not simply a difference in the total number of spin-up and spin-down events, which could be produced by luminosity changes.

Experimentally I use opposite azimuthal bins and a cross-ratio construction to suppress first-order luminosity and acceptance effects. I will return to that method during the asymmetry extraction.

Transition: Before the STAR result, it is useful to see the scale of an existing Drell–Yan measurement.
:::

---
# Recent Drell-Yan $A_N$ measurement

@scale 48%
```pdf
src: ./assets/motivation/COMPASS_DY_result.pdf
page: 1
```
@body-align left
@list-symbol  ✍︎
@scale 130%
- Measurement: $\langle A_N\rangle=0.070\pm0.037\,(stat.)\pm0.031\,(syst.)$ in $4<M<9$ GeV.
- The central value favors a positive asymmetry, but differs from zero by only about $1.5\sigma$.
- A complementary measurement with polarized $p+p$ collisions is therefore valuable.

:::notes
[Timing: about 1:10]

This plot shows the recent COMPASS Drell–Yan transverse-spin result in the 4-to-9 GeV mass range. The reported average is 0.070 with statistical uncertainty 0.037 and systematic uncertainty 0.031.

The central value is positive, but the total significance relative to zero is limited—roughly one and a half standard deviations. The result is therefore suggestive rather than decisive. STAR provides a complementary collision system and kinematic reach using polarized proton–proton collisions.

Transition: I will now introduce how RHIC polarization and STAR forward acceptance make that measurement possible.

[Sources]
- COMPASS Drell–Yan result shown in `assets/motivation/COMPASS_DY_result.pdf`.
:::

---
# Polarized RHIC beams meet STAR forward detection

@scale 130%
::columns
::column
```pdf
src: ./assets/motivation/RHIC_setup.pdf
page: 1
```
::column
```pdf
src: ./assets/motivation/STAR_layout.pdf
page: 1
```
::end

{{style:size=40px;color=#8b1a1a|RHIC supplies polarized beams; STAR supplies the forward dielectron acceptance.}}

:::notes
[Timing: about 1:10]

The left figure shows the RHIC accelerator complex, which delivers polarized proton beams to the interaction regions. The right figure shows STAR surrounding one of those collision points.

For this analysis the essential combination is polarized beam capability plus forward electromagnetic detection. The polarized beam supplies the controlled transverse-spin state; STAR measures the energetic forward electron and positron candidates needed to reconstruct the pair mass and azimuth.

Transition: These capabilities define the specific 2017 dataset and physics phase space.
:::

---
# STAR probes the sign change in forward $p+p$

@body-align left
::columns
::column
### 2017 polarized run
***

@list-symbol ★︎
- $p+p^{\uparrow}$ at $\sqrt{s}=510$ GeV
- Integrated luminosity used: $350\ \mathrm{pb}^{-1}$
- Average beam polarization: $P\approx55.7\%$
::column
### Physics target
***

@list-symbol ★︎
- Forward acceptance: $2.5<\eta<4.0$
- $Z/\gamma^*\rightarrow e^+e^-$
- $4<M_{e^+e^-}<9$ GeV
- Measure the single spin asymmetry $A_N$
::end

:::notes
[Timing: about 1:10]

The dataset is the 2017 transversely polarized proton–proton run at 510 GeV. The integrated luminosity used is 350 inverse picobarns, and the average beam polarization is approximately 55.7 percent.

The measurement targets forward electron–positron pairs in pseudorapidity 2.5 to 4.0 and invariant mass from 4 to 9 GeV. This forward configuration samples an asymmetric partonic momentum region and provides sensitivity to a transverse single-spin asymmetry.

These numbers define the scope of every later efficiency, yield, and uncertainty estimate.

Transition: I will next show the detector layers that provide the required charged-particle and energy information.
:::

---
# Layered forward detectors

@scale 60%
@offset 0, 30px
```pdf
src: ./assets/motivation/detector_system.pdf
page: 1
```

@body-align left
@list-symbol ⦿
- Three layers of scintillators: detect and measure ionizing radiation, located in front, as Preshower layers (FPS)
- A lead converter is located in from the FPS layer three, 0.635cm thickness, $\sim 1$ radiation length, designed to initiate electromagnetic shower for high energy electrons, photons and positrons
- An electromagnetic calorimeter (FMS): measure the energy via the electromagnetic interaction, located in the middle
- Three layers of scintillators located in back (FPOST)

:::notes
[Timing: about 1:35]

This diagram shows the layered forward detector system along a particle’s path from the interaction point. The front scintillator layers form the forward preshower detector. They register ionizing charged particles and therefore help distinguish electrons and positrons from neutral photons.

A lead converter of approximately one radiation length initiates electromagnetic showering. The Forward Meson Spectrometer then measures the shower energy. Three postshower scintillator layers behind the calorimeter add information about the longitudinal development of the shower.

No single layer provides complete particle identification. The analysis combines the FPS charge signature, FMS energy and clustering, and event topology.

Transition: That combined response gives the practical electron-candidate definition.
:::

---
# Identify electron candidates

@offset 0, 30px
@scale 70%
```pdf
src: ./assets/motivation/detector_response.pdf
page: 1
```

@body-align left
@offset 0, 20px
- $e^\pm$: charged signal in FPS followed by an electromagnetic shower in FMS.
- $\gamma$: usually neutral in FPS, but conversions can mimic charged candidates.
- Hadrons: variable preshower and calorimeter response creates misidentification background.

:::notes
[Timing: about 1:15]

The figure compares the expected detector response for electrons or positrons, photons, and hadrons. An electron candidate should leave a charged signal in the FPS and then develop an electromagnetic shower in the FMS.

A photon is neutral before conversion, although detector material can convert it and create a charged-like signature. Hadrons can also fluctuate and deposit substantial energy. Those two effects explain why the forward electron sample is not intrinsically pure.

This is the central experimental challenge: identify a rare dielectron topology without a dedicated forward tracking detector.

Transition: Before selecting physics pairs, the ADC response, channel status, and energy scale must be calibrated.
:::
