import Component from '../../../node_modules/neo.mjs/src/controller/Component.mjs';

class ViewportController extends Component {
  static config = { className: 'NeoPresent.viewer.ViewportController' };

  onNextSlide() {
    if (this.getStateProvider().data.overview) {
      this.onSelectOverviewFocus();
      return;
    }
    if (this.component.advanceReveal()) return;
    this.goToSlide(this.getStateProvider().data.activeIndex + 1);
  }

  onPreviousSlide() {
    if (this.getStateProvider().data.overview) {
      this.moveOverviewFocus(-1);
      return;
    }
    if (this.component.reverseReveal()) return;
    this.component.goToPreviousSlideAtFinalReveal();
  }

  onFirstSlide() {
    if (this.getStateProvider().data.overview) {
      this.setOverviewFocus(0);
      return;
    }
    this.goToSlide(0);
  }

  onLastSlide() {
    if (this.getStateProvider().data.overview) {
      this.setOverviewFocus(this.getStateProvider().data.maxIndex);
      return;
    }
    this.goToSlide(this.getStateProvider().data.maxIndex);
  }

  onCycleOverview() {
    const state = this.getStateProvider().data;
    if (!state.overview) {
      state.overview = true;
      state.overviewMode = 0;
      state.overviewIndex = state.activeIndex;
      // Card-layout children may be mounted on the following worker turn.
      // Build the overview once after it becomes visible; the old immediate
      // plus deferred pair allocated two complete preview trees.
      setTimeout(() => {
        if (this.getStateProvider().data.overview) {
          this.component.focusOverviewCard(this.getStateProvider().data.overviewIndex, true);
        }
      }, 0);
    } else {
      state.overviewMode = (state.overviewMode + 1) % 3;
      this.component.focusOverviewCard(state.overviewIndex, true);
    }
    this.component.publishPresenterState();
  }

  onCloseOverview() {
    this.getStateProvider().data.overview = false;
    this.component.publishPresenterState();
  }

  onToggleNotes() {
    const state = this.getStateProvider().data;
    state.notesOpen = !state.notesOpen;
  }

  onToggleToc() {
    const state = this.getStateProvider().data;
    state.tocOpen = !state.tocOpen;
  }

  onToggleFilmstrip() {
    const state = this.getStateProvider().data;
    state.filmstripOpen = !state.filmstripOpen;
  }

  onToggleControls() {
    const state = this.getStateProvider().data;
    state.controlsVisible = !state.controlsVisible;
    this.component.publishPresenterState();
  }

  onTogglePdfMode() {
    this.component.togglePdfMode();
  }

  onDismissPanels() {
    const state = this.getStateProvider().data;
    state.notesOpen = false;
    state.tocOpen = false;
    state.filmstripOpen = false;
    state.overview = false;
  }

  onSelectSlide(index) {
    this.goToSlide(index);
    this.onCloseOverview();
  }

  onSelectOverviewFocus() {
    const state = this.getStateProvider().data;
    if (!state.overview) return;
    this.onSelectSlide(state.overviewIndex);
  }

  moveOverviewFocus(delta) {
    const state = this.getStateProvider().data;
    if (!state.overview) return;
    this.setOverviewFocus(state.overviewIndex + delta);
  }

  moveOverviewFocusByRow(direction) {
    const state = this.getStateProvider().data;
    if (!state.overview) return;
    this.setOverviewFocus(
      state.overviewIndex + direction * this.component.getOverviewColumnCount()
    );
  }

  setOverviewFocus(index) {
    const state = this.getStateProvider().data;
    state.overviewIndex = Math.max(0, Math.min(index, state.maxIndex));
    this.component.focusOverviewCard(state.overviewIndex);
  }

  goToSlide(index) {
    const state = this.getStateProvider().data;
    state.activeIndex = Math.max(0, Math.min(index, state.maxIndex));
    this.component.resetReveal(state.activeIndex);
    this.component.syncSlideHash();
    this.component.publishPresenterState();
  }
}

export default Neo.setupClass(ViewportController);
