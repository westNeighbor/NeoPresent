import { describe, expect, it } from 'vitest';

import { createExportFrames } from './export-steps.js';

describe('diagram highlight export steps', () => {
  it('exports each standalone staged diagram highlight without a blank initial page', () => {
    const chart = {
      type: 'chart',
      getAttribute(name: string) {
        if (name === 'plotStyle')
          return { 'animation-trigger': 'reveal', 'reveal-stages': 4 };
        if (name === 'diagramHighlights')
          return [1, 2, 3, 4].map((stage) => ({ stage, target: `stage-${stage}` }));
        return undefined;
      }
    };
    const slide = {
      children: [chart],
      getAttribute(name: string) {
        return name === 'reveal' ? 'true' : undefined;
      }
    };

    expect(createExportFrames([slide], [0], true)).toEqual([
      { revealIndex: 1, slideIndex: 0 },
      { revealIndex: 2, slideIndex: 0 },
      { revealIndex: 3, slideIndex: 0 },
      { revealIndex: 4, slideIndex: 0 }
    ]);
    expect(createExportFrames([slide], [0], false)).toEqual([
      { revealIndex: Number.POSITIVE_INFINITY, slideIndex: 0 }
    ]);
  });

  it('collapses internal diagram stages when export-stages is false', () => {
    const chart = {
      type: 'chart',
      getAttribute(name: string) {
        if (name === 'plotStyle')
          return {
            'animation-trigger': 'reveal',
            'export-stages': 'false',
            'reveal-stages': 4
          };
        if (name === 'diagramHighlights')
          return [1, 2, 3, 4].map((stage) => ({ stage, target: `stage-${stage}` }));
        return undefined;
      }
    };
    const slide = {
      children: [chart],
      getAttribute(name: string) {
        return name === 'reveal' ? 'true' : undefined;
      }
    };

    expect(createExportFrames([slide], [0], true)).toEqual([
      { revealIndex: 0, slideIndex: 0 }
    ]);
  });
});
