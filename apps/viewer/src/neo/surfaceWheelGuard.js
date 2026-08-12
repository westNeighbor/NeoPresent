(() => {
  const surfaceFromEvent = (event) =>
    event
      .composedPath()
      .find(
        (target) =>
          target instanceof Element &&
          target.matches?.('[data-neopresent-surface][data-surface-interactive="true"]')
      );
  window.addEventListener(
    'wheel',
    (event) => {
      const surface = surfaceFromEvent(event);
      if (!surface) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.dispatchEvent(
        new CustomEvent('neopresent-surface-wheel', {
          detail: { deltaY: event.deltaY, surface }
        })
      );
    },
    { capture: true, passive: false }
  );
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    window.addEventListener(
      type,
      (event) => {
        if (surfaceFromEvent(event)) event.preventDefault();
      },
      { capture: true, passive: false }
    );
  }
})();
