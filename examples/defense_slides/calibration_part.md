---
@section Detector Calibration and Data Quality Assurance
:::notes
[Section transition: about 0:10]

This section summarizes the detector calibration and quality assurance that establish stable charged-particle tagging and invariant-mass reconstruction.
:::

---
# Calibration Method

@body-align left
::columns widths: 50%, 50%
::column
### FPS / FPOST

@scale 140%
@list-symbol ★︎
- Inspect ADC spectra channel by channel
- Locate the minimum-ionizing-particle response
- Monitor the fitted peak across fills and runs
::column
### FMS

@scale 140%
@list-symbol ★︎
- Correct trigger ADC bit shifts
- identify dead, hot, and unstable cells
- Tune gains with the $\pi^0\rightarrow\gamma\gamma$ mass
::end

@scale 140%
{{style:size=29px;color=#8b1a1a|The analysis needs both energy scale and charged-particle tagging to be stable.}}

:::notes
[Timing: about 1:20]

There are two linked calibration tasks. For FPS and FPOST, I inspect each ADC spectrum, locate the minimum-ionizing-particle response, and monitor its stability. This produces consistent charged-particle and shower-response thresholds.

For the FMS, I first correct trigger-ADC bit shifts, then identify dead, hot, and unstable cells, and finally tune channel gains with the reconstructed pi-zero mass. These checks protect both ingredients of the dielectron measurement: particle identification and energy scale.

Transition: I will show representative FPS and FPOST quality checks first.
:::

---
# FPS/FPOST QA and MIP Finding

@block-transition-trigger reveal
@block-exit replace
@block-enter grow
```pdf
src: ./assets/calibration/bad6sigma_FPS_ch2.pdf
page: 1
width: 90%
caption: QA to check the ADC spectrum and exclude the outlier and problematic ones
caption-size: 32px
```

@block-enter grow
@block-exit replace
```pdf
src: ./assets/calibration/fpostFitExampleCh1.pdf
page: 1
width: 90%
caption: FPOST MIP fit for a representative channel, a staged fitting to stabilize the peak.
caption-size: 32px
```

@block-enter grow
@block-exit replace
```pdf
src: ./assets/calibration/fpostMipStabilityCh1.pdf
page: 1
width: 60%
caption: Fitted FPOST MIP response remains stable across fills.
caption-size: 32px
```
{{style:size=32px;color=#8b1a1a| Result: stable channel thresholds for identifying charged candidates.}}

:::notes
[Timing: about 1:45]

This slide advances through three stages. First, the channel-by-channel ADC quality check identifies outliers and problematic spectra. Second, the representative FPOST spectrum illustrates the staged MIP fit. The sequence isolates the pedestal and stabilizes the Landau-like MIP peak rather than relying on one unconstrained fit. Third, the stability plot follows the fitted MIP position across fills.

The important output is not the appearance of one fit; it is a stable channel threshold that can be applied throughout the dataset. Channels or periods that fail these checks are excluded or treated appropriately.

Transition: The FMS calorimeter needs an additional correction for the trigger readout.
:::

---
# FMS QA and calibration

@block-transition-trigger reveal
@block-exit replace
@block-enter grow

```pdf
src: ./assets/calibration/bitshift_data_logic2.pdf
width: 70%
page: 1
caption: A flaw of the loop-up table (LUT), the raw ADC need to be corrected by bit shift for after use
caption-size: 32px
```

@block-exit replace
@block-enter grow
@offset 0, 30px
```pdf
src: ./assets/calibration/bsQaMap_FmsBsMap_y2017_run18139063.pdf
width: 70%
page: 1
caption: Final bitshift map example for a run 
caption-offset-y: -20px
caption-size: 32px
```

{{style:size=32px;color=#8b1a1a|Result: corrupted readout and localized defects do not enter physics reconstruction.}}

:::notes
[Timing: about 1:20]

The first view illustrates the lookup-table bit-shift problem: some raw trigger ADC values are encoded at the wrong bit position and cannot be used directly. I identify the shift and correct the ADC before reconstruction.

The second view is an example run-level bit-shift map. It shows where corrections are required across the detector. Applying these maps prevents corrupted readout or localized electronics behavior from appearing as false energy structure.

Transition: After correcting the readout logic, I classify individual FMS channels from their ADC spectra.
:::

---
# FMS QA and calibration
::columns widths: 40%, 40%, 40%
::column
```pdf
src: ./assets/calibration/badCell.pdf
page: 1
```
::column
```pdf
src: ./assets/calibration/checkChsADC_dset1.pdf
page: 1
```
::column
```pdf
src: ./assets/calibration/deadCell.pdf
page: 1
```
::end

@body-align left
@scale 140%
@list-symbol ✍︎
- Use ADC spectrum to exclude bad/dead/hot channels
- Left/middle/right: example of bad/good/dead channels

:::notes
[Timing: about 1:05]

These three examples show how the ADC spectrum distinguishes channel states. The left spectrum is problematic, the middle is a healthy channel, and the right is a dead channel with little or no physical response.

The classification also identifies unusually hot or unstable channels. Removing or masking these channels prevents isolated detector defects from biasing clustering, energy sums, and reconstructed pair masses.

Transition: The classifications can then be summarized spatially over the full FMS.
:::
---
# FMS QA and calibration
@offset 0, 30px
```pdf
src: ./assets/calibration/FmsCellStatMap15.pdf
width: 75%
page: 1
caption: Channel status map after QA, crossed cells are dead, gray are bad, red are hot.
caption-size: 32px
caption-offset-y: -20px
```

:::notes
[Timing: about 0:55]

This is the channel-status map after the quality-assurance procedure. Crossed cells are dead, gray cells are bad, and red cells are hot. The map is useful because localized patterns can reveal hardware or readout problems that are less obvious in a list of channel numbers.

Only channels passing the defined quality criteria contribute normally to the physics reconstruction.

Transition: With the readout corrected and bad channels identified, I set the calorimeter energy scale using pi-zero decays.
:::
---
# FMS QA and calibration

@scale 88%
```pdf
src: ./assets/calibration/calibProg.pdf
page: 1
```
- Use abundant $\pi^0$ 
- $20 < \mathrm{pairEnergy (Gev)} < 40$
- mass $< 0.5$ GeV
- $Z_{gg}(=\frac{|e_1-e_2|}{e_1+e_2})<0.7$
- $f(x) = f_{sig}(x) + f_{bg}(x)$ where $f_{sig}(x)=p_0\times\exp(-\frac{(x-p)^2}{2p^2})$ and $f_{bg}(x)=(x-p_0^{b})]\times(P_1+p_2 x)+p_3 x^2$
- $\mathrm{gainCorr}_{next} = \frac{\mathrm{mass}_{\pi^0}}{\mathrm{mass}_{fit}\times \mathrm{gainCorr}_{current}}$
- iterate the above procedure until stable convergence to norminal $\pi^0$ mass


:::notes
[Timing: about 1:45]

The calibration uses the abundant pi-zero decay into two photons. I select pairs with total energy between 20 and 40 GeV, mass below 0.5 GeV, and energy-sharing variable Z less than 0.7. These requirements give a usable pi-zero peak over a smooth combinatorial background.

The mass distribution is fit with a signal-plus-background model. The fitted peak position is compared with the nominal pi-zero mass, and the cell gain correction is updated. I repeat the procedure until the reconstructed peak converges and the gains are stable.

The exact formula on the slide describes the iterative update; the physics point is that a known two-photon resonance anchors the FMS energy scale.

Transition: The final cross-check is whether that reconstructed mass response stays stable over time.
:::

---
# The reconstructed mass remains stable across data periods

@scale 45%
```pdf
src: ./assets/calibration/massDistByGroup_DiBSFinal.pdf
page: 1
```

@body-align left
@list-symbol ⚛︎ 
@scale 120%
- Different data groups overlap in peak position and overall shape.
- No large time-dependent mass-scale drift remains after calibration.
- Stable mass response is the prerequisite for binning the Drell–Yan continuum.

:::notes
[Timing: about 1:10]

The overlaid mass distributions correspond to different data groups. Their peak positions and overall shapes agree after calibration. I do not observe a large time-dependent drift remaining in the reconstructed mass scale.

This matters directly for Drell–Yan: a drifting energy scale would move events between invariant-mass bins and could produce fill-dependent acceptance changes. The stable response supports using common mass bins across the dataset.

Transition: Detector calibration alone is not enough; I next validate the full forward dielectron reconstruction with J/psi decays.
:::
