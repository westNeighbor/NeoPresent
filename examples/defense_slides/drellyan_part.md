---
@section Drell–Yan analysis · From rare pairs to $A_N$
:::notes
[Section transition: about 0:10]

This section follows the Drell–Yan analysis from the initial background problem through optimized selection and the final asymmetry.
:::

---
# $J/\psi$ cuts leave Drell–Yan buried under QCD

@scale 50%
```pdf
src: ./assets/dy/dy_AN_with_jpsiCuts.pdf
page: 1
```

@body-align left
@list-symbol ✍︎
@scale 120%
- Blue is the simulated Drell–Yan continuum; red is weighted QCD background.
- With $J/\psi$ cuts, QCD : Drell–Yan $\approx85:1$—an asymmetry extraction is not viable.

:::notes
[Timing: about 1:00]

The blue distribution is simulated Drell–Yan and the red distribution is weighted QCD background after applying the J/psi-oriented cuts. In the Drell–Yan mass region, the background is still approximately 85 times larger than the signal.

This demonstrates that successful J/psi reconstruction is necessary validation but its cuts are not sufficient for the continuum. An asymmetry extracted from this sample would be dominated by background.

Transition: To design a Drell–Yan-specific selection, I compare weighted signal and background simulations.
:::

---
# Weighted simulation models signal and QCD background

@body-align left
::columns
::column
### Signal

- PYTHIA 6: $q\bar q\rightarrow\gamma^*/Z\rightarrow e^+e^-$
- Perugia 2012 tune
- Acceptance $2.5<\eta<4.0$
::column
### Background

- Generic QCD processes
- Perugia 2012 tune
- Acceptance $2.5<\eta<4.0$
- Require forward electromagnetic content
- Event weights scale to the full dataset
::end

### Detector response

GEANT 3 transports both samples through the STAR forward geometry.

:::notes
[Timing: about 1:10]

The signal sample is generated with PYTHIA 6 using the Perugia 2012 tune for quark–antiquark annihilation into a virtual photon or Z and then an electron–positron pair. The background sample contains generic QCD processes with forward electromagnetic content and is weighted to the full dataset.

Both samples are passed through GEANT 3 using the STAR forward geometry. This is essential: selection variables must include detector response, acceptance, and reconstruction effects rather than generator-level kinematics alone.

Transition: I first define plausible dielectron pairs with a loose preselection.
:::

---
# Preselection defines pairs; feature cuts create purity

::columns
::column
### Candidate definition

- Two single-cluster tracks
- Both $p_T>1.3$ GeV
- Charged signatures in FPS
- $4<M_{e^+e^-}<9$ GeV
::column
### Remaining challenge

```pdf
src: ./assets/dy/dyAfterPreCuts.pdf
page: 1
```
::end

{{style:size=32px;color=#8b1a1a|After preselection, QCD : Drell–Yan $\approx140:1$.}}

{{style:size=32px|Preselection defines plausible pairs, but topology and shower-response cuts must create purity.}}

:::notes
[Timing: about 1:10]

The candidate definition requires two single-cluster tracks, transverse momentum above 1.3 GeV for each, charged signatures in the FPS, and pair mass between 4 and 9 GeV.

The mass distribution on the right shows that this preselection is not a purity selection. QCD exceeds Drell–Yan by approximately 140 to one. The ratio is even worse than for the J/psi-cut sample because these requirements intentionally retain broad signal acceptance.

The remaining discrimination must come from energy, event topology, shower response, and multiplicity.

Transition: I will show the feature distributions that provide that discrimination.
:::

---
# Event topology features separate Drell–Yan from QCD

@block-transition-trigger reveal
@block-exit replace
@block-enter grow
@scale 90%
@offset 0, 30px
```pdf
src: ./assets/dy/feature_distribution.pdf
page: 1
caption: There are many featuers to select, but we only selected the most powerful set of features
caption-size: 32px
```

@block-enter grow
@block-exit replace
::group
@scale 79%
```pdf
src: ./assets/dy/selected_feature_distribution2.pdf
page: 1
caption: c2): Second track energy of the pair; d2): The pair energy ratio; i1): FPS Layer one multiplicity
caption-size: 32px
```
### Examples of selected features as good separation

@body-align left
@list-symbol ★︎
- **Kinematics:** signal candidates are harder in energy, left figure
- **Topology:** the pair carries most energy of the event, middle figure 
- **Topology:** DY event tends to have lower-multiplicity events, right figure
::end

:::notes
[Timing: about 1:35]

The first view summarizes the candidate feature distributions considered for signal and background. I look for variables with visibly different shapes and with a detector interpretation.

The selected examples illustrate three useful categories. The second-track energy is generally harder for Drell–Yan. The pair-energy ratio is larger when the two candidates carry most of the event energy. FPS layer-one multiplicity is lower for the cleaner Drell–Yan topology than for generic QCD activity.

No single feature solves the problem, so the analysis combines several moderately discriminating requirements.

Transition: Before combining them, I check that they are not simply repeated versions of the same information.
:::

---
# Correlation checks keep the feature set complementary

::columns widths: 60%, 60%
::column
```pdf
src: ./assets/dy/final_used_feature_correlation_DY.pdf
page: 1
```
::column
```pdf
src: ./assets/dy/final_used_feature_correlation_QCD.pdf
page: 1
```
::end

@body-align left
@list-symbol ★︎
@scale 140%
- Strong off-diagonal structure would signal redundancy 
- The retained variables contribute complementary information

:::notes
[Timing: about 1:00]

These matrices show correlations among the final candidate features for simulated Drell–Yan on the left and QCD on the right. Strong off-diagonal values would indicate that multiple cuts are acting on essentially the same information.

The retained variables are not perfectly independent, but they provide complementary sensitivity across kinematics, global event topology, multiplicity, and FPS response. This makes the combined rejection more robust than repeatedly cutting one underlying quantity.

Transition: I then choose numerical thresholds with an optimization designed for a rare signal.
:::

---
# Optimization protects signal efficiency while suppressing QCD

@block-transition-trigger reveal
@block-exit replace
@block-enter grow

@offset 0, 50px
::group
::columns widths: 45%, 55%
::column
```pdf
src: ./assets/dy/track2E.pdf
page: 1
```
::column
```pdf
src: ./assets/dy/optimize_cut_track2E.pdf
page: 1
```
::end

$\mathrm{Punzi\ FOM}=\frac{\varepsilon_S}{a/2+\sqrt{B}},\ a=3$, 
{{style: size=32px | where $\varepsilon_S$ is the signal efficiency, $B$ is the background events, and $a$ is the desired sensitivity in units of standard deviations.}}

@body-align left
@list-symbol ★︎
@offset 0, 10px
@scale 130%
- Use Punzi FOM metrics to optimize event selection cuts, which favor rare signal events
- Require $\varepsilon_S\ge50\%$ for an individual cut, if Punzi FOM max value satisfies this, select it as the optimized cut value
::end

@block-enter grow
@block-exit replace
::group
::columns widths: 40%, 40%, 40%
::column
```pdf
src: ./assets/dy/pairERatio_afterPreCuts.pdf
page: 1
```
::column
```pdf
src: ./assets/dy/optimize_cut_pairERatio1.pdf
page: 1
```
::column
```pdf
src: ./assets/dy/optimize_cut_pairERatio2.pdf
page: 1
```
::end

@offset 0, 30px
@body-align left
@list-symbol ★︎
- Evaluate Punzi FOM for cut values
- Require $\varepsilon_S\ge50\%$ for an individual cut, if Punzi FOM fail, check $J=\max(\varepsilon_{s}-\varepsilon_{bkg})$
- Check again if $J$ value satisfies $\varepsilon_S\ge50\%$, if so, use it as the cut value, otherwise use the first point that satisfies $\varepsilon_S\ge50\%$
::end

:::notes
[Timing: about 2:00]

The first example shows the second-track energy distribution and the Punzi figure of merit as the lower threshold is scanned. The Punzi metric divides signal efficiency by a term containing the square root of the expected background; with a equal to three, it rewards sensitivity to a rare signal without requiring a known signal yield.

For an individual cut, I also require at least 50 percent signal efficiency. If the Punzi maximum satisfies that requirement, I use the corresponding threshold.

The second example shows the fallback logic for the pair-energy ratio. When the preferred Punzi point does not satisfy the efficiency condition, I examine the separation measure J, defined from signal and background efficiencies. If needed, I choose the first threshold that preserves 50 percent signal efficiency.

This procedure prevents an apparently strong background rejection from eliminating nearly all signal.

Transition: Applying the independently chosen requirements gives the combined efficiencies summarized next.
:::

---
# The combined selection rejects QCD by four orders of magnitude

@scale 130%
| Feature | Requirement | DY efficiency | QCD efficiency |
|---|---:|---:|---:|
| Leading / subleading energy | $>25 / >20$ GeV | 0.851 / 0.769 | 0.743 / 0.508 |
| Pair energy fraction | $>0.780$ | 0.785 | 0.258 |
| FPS layer-1 multiplicity | $\le19$ | 0.522 | 0.224 |
| Four FPS energy cuts | $<2.7$–$2.9$ GeV | 0.601–0.652 | 0.365–0.465 |
| **Combined** | — | {{style:color=#ff0000;font-weight=700\|$4.2\times10^{-2}$}} | {{style:color=#ff0000;font-weight=700\|$6.3\times10^{-4}$}} |

:::notes
[Timing: about 1:20]

The table lists the principal requirements and their individual efficiencies. Energy thresholds provide moderate rejection. Pair-energy fraction and FPS multiplicity are stronger topology discriminants, while the four FPS energy cuts suppress hadron-like shower responses.

The important line is the combined result: approximately 4.2 percent of simulated Drell–Yan survives, compared with 6.3 times ten to the minus four of the QCD sample. That is about four orders of magnitude of QCD rejection, obtained at the cost of low signal efficiency.

These efficiencies are correlated, so the combined row cannot be obtained by interpreting each line independently.

Transition: The resulting mass spectrum shows how much the signal-to-background ratio improves.
:::

---
# Optimization improves $S/B$ from $1:85$ to about $1:1.6$

@offset 0, 30px
::columns
::column
```pdf
src: ./assets/dy/sim_mass_after_cuts.pdf
page: 1
```
::column
@scale 130%
| Mass (GeV) | $R_{S/B}$ |
|---|---:|
| 4–5 | $0.666\pm0.298$ |
| 5–6 | $0.485\pm0.298$ |
| 6–7 | $0.533\pm0.307$ |
| 7–9 | $1.345\pm1.343$ |
::end

@body-align left
@scale 120%
@offset 0, 40px
- Expected yields: 1,451 Drell–Yan and 2,335 QCD events.
- Purity improves from $S/B\approx1/85$ to $S/B\approx1/1.6$.
- The selected sample is measurable statistically, but still requires a background-dilution treatment.

:::notes
[Timing: about 1:20]

After all cuts, the expected sample contains about 1,451 Drell–Yan events and 2,335 QCD events. The overall signal-to-background ratio improves from approximately one to 85 to about one to 1.6.

The table shows that purity varies with mass and becomes very uncertain in the 7-to-9 GeV interval. Even after four orders of magnitude of QCD rejection, the selected sample is not background free. Therefore the measured asymmetry is a mixture of signal and residual-background asymmetries.

Transition: The observed data yield determines which mass intervals can support an asymmetry fit.
:::

---
# Data support three usable mass bins

```pdf
src: ./assets/dy/dy_yield_afterCuts.pdf
page: 1
height: 70%
```

{{style:size=32px;color=#8b1a1a|The 7–9 GeV bin is excluded from $A_N$: too few events and poorly known purity.}}

{{style:size=32px|The three retained bins balance mass resolution, event yield, and simulated signal fraction.}}

:::notes
[Timing: about 0:55]

This is the selected data mass spectrum. The available statistics support three usable bins: 4 to 5, 5 to 6, and 6 to 7 GeV.

The 7-to-9 GeV interval is excluded from the asymmetry measurement because it has too few events and a poorly constrained simulated purity. Keeping it would add an unstable point rather than useful sensitivity.

Transition: I will now explain how spin-sorted yields in each retained mass bin are converted into the raw asymmetry.
:::

---
# Measured single-spin asymmetry $A_N$
$
A_N\sin\phi
=
\frac{1}{P}
\frac{
\sqrt{N_L^{\uparrow}N_R^{\downarrow}}
-
\sqrt{N_L^{\downarrow}N_R^{\uparrow}}
}{
\sqrt{N_L^{\uparrow}N_R^{\downarrow}}
+
\sqrt{N_L^{\downarrow}N_R^{\uparrow}}
}
=
\frac{1}{P}
\frac{
\sqrt{N^{\uparrow}(\phi)N^{\downarrow}(\phi+\pi)}
-
\sqrt{N^{\downarrow}(\phi)N^{\uparrow}(\phi+\pi)}
}{
\sqrt{N^{\uparrow}(\phi)N^{\downarrow}(\phi+\pi)}
+
\sqrt{N^{\downarrow}(\phi)N^{\uparrow}(\phi+\pi)}
}
$
where $P=0.557\pm0.002$

::columns widths: 100%, 40%
::column
```pdf
src: ./assets/dy/an_plane2.pdf
page: 1
```
::column
@offset -100px, 0
@body-align left
@list-symbol ✍︎
- Group two spatial bins information into a single asymmetry value.
- Only **8 independent data points** spanning from $\phi=0$ to $\pi$
- This pairing method effectively cancels systematic uncertainties related to luminosity differences between spin states and detector efficiency asymmetries
::end

:::notes
[Timing: about 1:50]

The equation is the square-root cross ratio. For each azimuth phi, it combines spin-up and spin-down yields at phi with the corresponding yields in the opposite bin, phi plus pi. The difference of square roots forms the numerator, the sum normalizes it, and division by the average polarization of 0.557 converts the raw modulation to the physical scale.

The diagram shows 16 azimuthal bins paired across the detector. Because a pair at phi and phi plus pi uses the same four spin-sorted counts, only eight asymmetry values are statistically independent.

The cross ratio cancels first-order relative-luminosity differences and factorized detector-efficiency asymmetries. It does not remove physics background, which is treated separately.

Transition: The eight independent values should follow a sine modulation whose amplitude is A_N.
:::

---
# A sine fit extracts one $A_N$ amplitude per mass bin

::columns widths: 60%, 40%
::column
```pdf
src: ./assets/dy/AN_fit.pdf
page: 1
```
::column
$$f(\phi)=A_N\sin\phi$$

@body-align left
- Black points: eight independent cross-ratio values.
- Red curve: the expected $\sin\phi$ modulation.
- Fitted amplitude: the physical $A_N$ for that mass bin.
::end

:::notes
[Timing: about 1:05]

For each mass bin, the black points are the eight independent cross-ratio values as a function of azimuth. I fit them with A_N times sine phi, shown by the red curve.

The modulation shape is fixed by the transverse-spin geometry; the single fitted amplitude is the measured asymmetry for that mass interval. The scatter of the points and their uncertainties determine the statistical precision.

Transition: Repeating the fit in the three mass bins gives the measured values shown next.
:::

---
# The measured asymmetry is statistically limited

::columns widths: 60%, 60%
::column
```pdf
src: ./assets/dy/AN_final.pdf
page: 1
width: 85%
```
::column
@scale 130%
| Mass (GeV) | $A_N^{meas}$ |
|---|---:|
| 4–5 | $-0.2145\pm0.2231$ |
| 5–6 | $+0.1406\pm0.2693$ |
| 6–7 | $+0.7152\pm0.4272$ |
::end

{{style:size=32px|The first two bins are consistent with zero; the positive 6–7 GeV point also has the largest statistical error.}}

:::notes
[Timing: about 1:05]

The measured asymmetries are minus 0.2145 plus or minus 0.2231, plus 0.1406 plus or minus 0.2693, and plus 0.7152 plus or minus 0.4272 for increasing mass.

The first two bins are clearly consistent with zero. The highest-mass point has a positive central value, but it also has the largest statistical uncertainty because the event count is smaller. These are asymmetries of the selected mixture before assigning the residual-background uncertainty.

Transition: The dominant systematic issue is therefore how that mixture relates to the true Drell–Yan asymmetry.
:::

---
# Residual background dominates the systematic uncertainty

$$A_N^{meas}=fA_N^{DY}+(1-f)A_N^{bkg},\qquad f=\frac{R_{S/B}}{1+R_{S/B}}$$

{{style: size=32px | Assumption used for the conservative envelope:}}

$$A_N^{bkg}=0\quad\Rightarrow\quad A_N^{max}=\frac{A_N^{meas}}{f}$$

{{style:size=32px|Systematic assignment: $\left|A_N^{max}-A_N^{meas}\right|$.}}

:::notes
[Timing: about 1:20]

The measured asymmetry is written as a signal-fraction-weighted sum of the Drell–Yan and background asymmetries. The signal fraction f is obtained from the simulated signal-to-background ratio.

For the conservative envelope used here, I set the background asymmetry to zero. Under that assumption, the largest inferred signal asymmetry is the measured value divided by f. I assign the magnitude of the difference between that value and the measured asymmetry as the systematic uncertainty.

This procedure quantifies dilution, but it does not directly measure the background asymmetry. That limitation is why the systematic uncertainty becomes large when f is small or poorly known.

Transition: Applying this prescription produces the final values and uncertainty boxes.
:::

---
# Final $A_N^{DY}$ values are consistent with zero
@shadow drop
@shadow-angle 45
@shadow-distance 8px
@shadow-blur 7px
@shadow-opacity 35%
::columns
::column
```pdf
src: ./assets/dy/AN_final_corrected.pdf
page: 1
```
::column
@scale 120%
| Mass (GeV) | $A_N^{DY}$ | stat. | syst. |
|---|---:|---:|---:|
| 4–5 | $-0.2145$ | 0.2231 | 0.3220 |
| 5–6 | $+0.1406$ | 0.2693 | 0.2897 |
| 6–7 | $+0.7152$ | 0.4272 | 1.3430 |
::end

@body-align left
@scale 120%
- Statistical bars are large because only $4.2\%$ of simulated signal survives.
- Systematic boxes grow as the signal fraction decreases or becomes uncertain.
- All three bins remain compatible with zero after both uncertainties are included.

{{style:size=32px;color=#8b1a1a|This dataset does not provide a statistically significant measured $A_N$ value.}}

:::notes
[Timing: about 1:20]

The table gives the final Drell–Yan asymmetries with statistical and systematic uncertainties. The plot shows the same result: statistical bars are large because only 4.2 percent of simulated signal survives, and the systematic boxes are enlarged by the uncertain signal fraction.

The 6-to-7 GeV bin is the clearest example. Its central value is positive, but the systematic uncertainty is 1.343, much larger than the central value. Once both uncertainty components are considered, all three points are compatible with zero.

The correct interpretation is therefore not that the asymmetry is exactly zero, but that this dataset does not establish a statistically significant nonzero Drell–Yan A_N or a conclusive Sivers sign-change test.

Transition: I will close by summarizing what the analysis achieved and what limits the conclusion.
:::


---
# Conclusion: our measurement is not conclusive

@body-align left
@scale 130%
@list-symbol ⚛︎ 
- STAR 2017 Dataset was calibrated, reconstructed and validated for forward dielectron production 
- Optimized cuts improved $S/B$ to about $1:1.6$
- The three measured $A_N^{DY}$ points are consistent with zero
- Background dilution and limited particle identification dominate the significance

:::notes
[Timing: about 1:10]

The 2017 STAR dataset was calibrated, reconstructed, and validated for forward dielectron production. The J/psi study demonstrated recovery of a known neighboring resonance, and the Drell–Yan-specific optimization improved the signal-to-background ratio to about one to 1.6.

The three final Drell–Yan asymmetry points are all consistent with zero. The measurement is limited by low signal efficiency, residual QCD background, and the absence of stronger forward particle identification. Consequently, it does not provide a conclusive test of the predicted Sivers sign change.

The analysis nevertheless establishes the full experimental chain and identifies the improvements needed for a future measurement: greater statistics, stronger electron identification, and a direct constraint on the background asymmetry.

Transition: Thank you. I am happy to take questions.
:::

---
@heading-align center
# Questions

{{style:size=44px|Thank you}}

{{style:size=27px|Forward Drell–Yan $A_N$ at STAR · $p+\vec{p}$ at $\sqrt{s}=510$ GeV}}

:::notes
[Timing: questions]

Thank the committee and pause. Keep this slide visible during questions.

For technical questions, use the backup slides on the run conditions, optimized cuts, TMD/Sivers formalism, azimuthal-bin independence, signal fractions, and robustness checks.
:::
