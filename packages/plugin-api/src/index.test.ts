import { describe, expect, it } from 'vitest';

import { createPluginRegistry } from './index.js';

describe('PluginRegistry', () => {
  it('registers a custom fenced block through a plugin', () => {
    const registry = createPluginRegistry({
      name: 'demo-plugin',
      register(api) {
        api.registerFencedBlock('demo', (source, context) => ({ context, source }));
      }
    });

    expect(registry.hasFencedBlock('DEMO')).toBe(true);
    expect(registry.createFencedBlock('demo', 'Hello')).toEqual({
      context: { language: 'demo' },
      source: 'Hello'
    });
  });
});
