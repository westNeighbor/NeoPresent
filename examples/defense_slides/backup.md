---
@section Backup slides
@toc-entry false
:::notes
[Backup section]

These slides are not part of the timed main presentation. Use them only in response to questions.
:::

---
@toc-entry false
# Backup · Physics is about scale
```pdf
src: ./assets/motivation/scale_order.pdf
width: 80%
```

:::notes
Use this slide if asked how the relevant physics changes with distance or momentum scale. Walk from large-distance hadronic structure toward short-distance partonic interactions, and connect the Drell–Yan invariant mass to the hard scale that enables a factorized QCD interpretation.
:::
---
@toc-entry false
# Backup · Run conditions and analysis scope

@scale 140%
| Quantity | Value used in thesis |
|---|---:|
| Collision system | $p+p^{\uparrow}$ |
| $\sqrt{s}$ | 510 GeV |
| Integrated luminosity | $350\ \mathrm{pb}^{-1}$ |
| Forward acceptance | $2.5<\eta<4.0$ |
| Beam polarization | $0.557\pm0.002$ |
| Drell–Yan mass window | 4–9 GeV |
| Final $A_N$ bins | 4–5, 5–6, 6–7 GeV |

:::notes
Use this table to restate the fixed analysis scope. Emphasize the 2017 proton–proton dataset, 510 GeV collision energy, 350 inverse picobarns, forward acceptance, and average polarization. Clarify that the analysis begins with a 4-to-9 GeV Drell–Yan window but reports A_N only in the three lower mass bins because of the final yield and purity.
:::

---
@toc-entry false
# Backup · Detailed optimized cut values

@scale 140%
| Feature | Cut | DY eff. | QCD eff. |
|---|---:|---:|---:|
| track1E | $>25.0$ | 0.851 | 0.743 |
| track2E | $>20.0$ | 0.769 | 0.508 |
| pairERatio | $>0.780$ | 0.785 | 0.258 |
| fpsL1Multi | $\le19$ | 0.522 | 0.224 |
| track1FpsL1E | $<2.8$ | 0.652 | 0.423 |
| track2FpsL1E | $<2.9$ | 0.651 | 0.465 |
| track1FpsL2E | $<2.7$ | 0.601 | 0.365 |
| track2FpsL2E | $<2.9$ | 0.610 | 0.405 |

:::notes
Use this slide if asked for the exact numerical cuts. Explain that each line gives the requirement and the separate simulated efficiencies for Drell–Yan and QCD. The combined efficiencies are shown on the main slide; they are not obtained by treating these variables as statistically independent.
:::

---
@toc-entry false
# Backup · Example energy-cut optimization

::columns widths: 45%, 55%
::column
```pdf
src: ./assets/dy/track1E.pdf
page: 1
```
::column
```pdf
src: ./assets/dy/cuts_decision.pdf
page: 1
```
::end

@body-align left
@list-symbol ★︎
- Evaluate Punzi FOM for cut values
- Require $\varepsilon_S\ge50\%$ for an individual cut, if Punzi FOM max value satisfies this, select it as the optimized cut value
- Choose the tightest useful point near the efficiency/FOM plateau

:::notes
Use this example to explain the threshold-selection procedure. The left plot shows the signal and background behavior of the leading-track energy. The right plot summarizes the cut decision. The chosen point balances Punzi sensitivity against the requirement that an individual cut retain at least 50 percent of signal, and it is selected near a stable efficiency or figure-of-merit plateau rather than from a visually attractive fluctuation.
:::

---
@toc-entry false
# Backup · Why drell yan
@offset 0, 20px
```pdf
src: ./assets/motivation/drell-yan-slides.pdf
page: 1
height: 90%
```

@toc-entry false

:::notes
Use this slide if asked why Drell–Yan is theoretically clean. Explain that the final state is colorless and experimentally reconstructable from a lepton pair, while the initial quark–antiquark annihilation provides access to parton distributions. Then connect the process dependence of its initial-state color interaction to the Sivers sign-change prediction.
:::
---
@toc-entry false
# Backup · Correlations between proton spin and its quark partons

::columns widths: 60%, 60%
::column
```pdf
src: ./assets/motivation/TMD_spinCorr.pdf
page: 1
```
::column
##### spin-dependent part of the cross section
@scale 50%
$$
\begin{aligned}
\frac{d\sigma}{dq^{4}\,d\Omega}
&\propto
\left(F_U^{1}+F_U^{2}\right)
\left(1+A_U^{\cos^2}\theta_{CS}\right)
\\[0.4em]
&\quad\times
\Bigg\{
1+S_T\Big[
D_1 A_T^{\sin\phi_S}\sin\phi_S
\\
&\quad
+D_2\left(
A_T^{\sin(2\phi_{CS}+\phi_S)}\sin(2\phi_{CS}-\phi_S) + A_T^{\sin(2\phi_{CS}-\phi_S)}\sin(2\phi_{CS}-\phi_S)
\right)
\\
&\quad
+D_3\left(
A_T^{\sin(\phi_{CS}+\phi_S)}\sin(\phi_{CS}+\phi_S) 
+A_T^{\sin(\phi_{CS}-\phi_S)}\sin(\phi_{CS}-\phi_S)
\right)
\Big]
\Bigg\}.
\end{aligned}
$$
where $A_T^{\sin\phi_S}$ is related to Sivers ($f_{1T}^{\perp}$)
::end

@body-align left
@scale 130%
- Several correlations between proton spin and its quark partons
- This dissertation: correlation between the transverse spin of the proton and the intrinsic transverse momentum of an unpolarized quark which is the Sivers effect

:::notes
Use this slide for a detailed TMD-formalism question. The cross section contains several angular modulations involving the proton transverse spin and the Collins–Soper lepton angles. The dissertation focuses on the term connected with the Sivers function: a correlation between the proton transverse spin and the intrinsic transverse momentum of an unpolarized quark. Do not attempt to derive the full equation unless specifically requested; identify the relevant term and its physical meaning.
:::

---
@toc-entry false
# Backup · $A_N$ reveals a transverse spin–momentum correlation

@offset 0, 100px
$$f_{q/p^{\uparrow}}(x,\mathbf{k}_T)=f_1^q(x,k_T^2)-\frac{\epsilon^{ij}k_T^iS_T^j}{M_p}\,f_{1T}^{\perp q}(x,k_T^2)$$

@offset 0, 20px
@scale 48%
```pdf
src: ./assets/motivation/TMD_Sivers_DY.pdf
page: 1
```

{{style:size=24px|SIDIS: final-state color interaction · Drell–Yan: initial-state color interaction}}

{{style:size=27px;color=#8b1a1a|Reversing the color flow reverses the predicted Sivers asymmetry.}}

@offset 0, 50px
### QCD predicts the Sivers sign reversal

$$\left.f_{1T}^{\perp q}\right|_{\mathrm{DY}}=-\left.f_{1T}^{\perp q}\right|_{\mathrm{SIDIS}}$$

:::notes
Use this slide to explain the Sivers correlation and sign reversal. The distribution contains an antisymmetric contraction of transverse parton momentum and proton spin. The process-dependent gauge link represents final-state color interactions in SIDIS and initial-state color interactions in Drell–Yan. QCD predicts that reversing that color flow reverses the sign of the Sivers function between the two processes.
:::


---
@toc-entry false
# Backup · Why only eight azimuthal points are independent

$$A_N^{raw}(\phi+\pi)=-A_N^{raw}(\phi)$$

@body-align left
@scale 130%
- The full range is divided into 16 bins
- Cross-ratio pairs bins at $\phi$ and $\phi+\pi$
- Each pair uses the same four underlying spin-sorted counts
- Fit only eight independent points in $0\le\phi<\pi$

:::notes
Use this slide if asked why the fit has eight rather than sixteen points. The detector is divided into 16 azimuthal bins, but the cross ratio pairs phi with phi plus pi. Each opposite-bin pair uses the same four underlying spin-sorted counts, and the raw asymmetry changes sign under a pi rotation. Therefore only eight points in the interval from zero to pi are independent.
:::

---
@toc-entry false
# Backup · Signal fractions used in dilution estimates

@scale 140%
| Mass (GeV) | $R_{S/B}$ | $f=R/(1+R)$ |
|---|---:|---:|
| 4–5 | 0.6660 | 0.3998 |
| 5–6 | 0.4854 | 0.3268 |
| 6–7 | 0.5326 | 0.3475 |
| 7–9 | 1.3451 | 0.5736 |

:::notes
Use this table to show how the dilution factors were computed. Convert the simulated signal-to-background ratio R into signal fraction f using R divided by one plus R. The fractions are approximately 0.40, 0.33, and 0.35 in the three reported bins. The 7-to-9 GeV fraction appears larger, but its uncertainty and low observed yield make that interval unsuitable for the final fit.
:::

---
@toc-entry false
# Backup · Key limitations and robustness checks

@body-align left
@scale 130%
- Cross ratio cancels first-order relative luminosity and acceptance
- Polarization uncertainty is small compared with counting uncertainty
- Mass-bin choice is fixed by yield and simulated purity
- Dominant unresolved issue: residual-background asymmetry
- A direct control-region measurement would replace the current envelope assumption

:::notes
Use this slide to distinguish controlled and unresolved uncertainties. The cross ratio suppresses first-order luminosity and acceptance effects, and polarization uncertainty is small relative to counting statistics. The dominant unresolved issue is the asymmetry of the residual background. A direct control-region measurement of that quantity would replace the present envelope assumption and materially strengthen the result.
:::

