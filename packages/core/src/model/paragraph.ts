import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface ParagraphOptions {
  id?: string;
  text: string;
  attributes?: NodeAttributes;
}

/** Plain text content on a slide. */
export class Paragraph extends Node<'paragraph'> {
  public readonly text: string;

  private constructor(options: Required<ParagraphOptions>) {
    super({
      id: options.id,
      type: 'paragraph',
      attributes: options.attributes
    });
    this.text = options.text;
    Object.freeze(this);
  }

  public static create(options: ParagraphOptions): Paragraph {
    return new Paragraph({
      id: options.id ?? createNodeId(),
      text: options.text,
      attributes: options.attributes ?? {}
    });
  }

  /** Returns a replacement paragraph; the original node is never mutated. */
  public with(changes: Partial<Omit<ParagraphOptions, 'id'>>): Paragraph {
    return Paragraph.create({
      id: this.id,
      text: changes.text ?? this.text,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
