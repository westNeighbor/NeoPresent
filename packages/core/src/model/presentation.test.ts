import { describe, expect, it, beforeEach } from 'vitest';

import { Heading, Paragraph, Presentation, resetNodeIdSequence, Slide } from '../index.js';

describe('presentation model', () => {
  beforeEach(() => {
    resetNodeIdSequence();
  });

  it('builds a typed presentation tree without mutation', () => {
    const heading = Heading.create({ level: 1, text: 'Hello NeoPresent' });
    const paragraph = Paragraph.create({ text: 'The first slide.' });
    const emptySlide = Slide.create({ notes: 'Opening remarks.' });
    const slide = emptySlide.append(heading, paragraph);
    const deck = Presentation.create({ title: 'Demo' }).append(slide);

    expect(emptySlide.children).toEqual([]);
    expect(slide.children).toEqual([heading, paragraph]);
    expect(deck.children).toEqual([slide]);
    expect(deck.type).toBe('presentation');
    expect(slide.type).toBe('slide');
    expect(heading.id).toBe('node_1');
    expect(deck.id).toBe('node_4');
  });

  it('returns a new node when updating its data', () => {
    const original = Heading.create({
      id: 'heading-1',
      level: 1,
      text: 'Original',
      attributes: { color: '#ffffff' }
    });
    const changed = original.with({ text: 'Updated', attributes: { color: '#ff00ff' } });

    expect(changed).not.toBe(original);
    expect(changed.id).toBe(original.id);
    expect(original.text).toBe('Original');
    expect(changed.text).toBe('Updated');
    expect(original.getAttribute<string>('color')).toBe('#ffffff');
    expect(changed.getAttribute<string>('color')).toBe('#ff00ff');
  });

  it('does not allow node collections or attributes to be changed', () => {
    const paragraph = Paragraph.create({ text: 'Immutable.' });
    const slide = Slide.create({ children: [paragraph], attributes: { visible: true } });

    expect(Object.isFrozen(slide)).toBe(true);
    expect(Object.isFrozen(slide.children)).toBe(true);
    expect(Object.isFrozen(slide.attributes)).toBe(true);
  });
});
