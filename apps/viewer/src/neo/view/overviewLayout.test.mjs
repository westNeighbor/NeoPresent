import { describe, expect, it } from 'vitest';
import { getGalleryLayout, getHelixLayout } from './overviewLayout.mjs';

describe('overview layouts', () => {
  it('lays gallery slides out in a three-row serpentine path', () => {
    expect(getGalleryLayout(0, 0, 8)).toMatchObject({ columnCount: 3, row: 0, column: 0 });
    expect(getGalleryLayout(3, 0, 8)).toMatchObject({ row: 1, column: 2 });
    expect(getGalleryLayout(5, 0, 8)).toMatchObject({ row: 1, column: 0 });
  });

  it('centers the selected helix slide and retains the preceding animation state', () => {
    const selected = getHelixLayout(4, 4, 1);
    expect(selected).toMatchObject({ angle: 0, opacity: 0.8, x: 0, y: 0, z: 0 });
    expect(selected.transform).toContain('rotateY(0deg)');
    expect(selected.previous.angle).toBe(32);
  });

  it('places neighboring helix slides on opposite sides of the selected slide', () => {
    expect(getHelixLayout(3, 4).x).toBeLessThan(0);
    expect(getHelixLayout(5, 4).x).toBeGreaterThan(0);
  });
});
