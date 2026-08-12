import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface HeadingOptions {
  id?: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  attributes?: NodeAttributes;
}

/** A block heading on a slide. */
export class Heading extends Node<'heading'> {
  public readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  public readonly text: string;

  private constructor(options: Required<HeadingOptions>) {
    super({
      id: options.id,
      type: 'heading',
      attributes: options.attributes
    });
    this.level = options.level;
    this.text = options.text;
    Object.freeze(this);
  }

  public static create(options: HeadingOptions): Heading {
    return new Heading({
      id: options.id ?? createNodeId(),
      level: options.level,
      text: options.text,
      attributes: options.attributes ?? {}
    });
  }

  /** Returns a replacement heading; the original node is never mutated. */
  public with(changes: Partial<Omit<HeadingOptions, 'id'>>): Heading {
    return Heading.create({
      id: this.id,
      level: changes.level ?? this.level,
      text: changes.text ?? this.text,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
