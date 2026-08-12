import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface QuoteOptions {
  id?: string;
  text: string;
  attributes?: NodeAttributes;
}

/** A quoted passage or callout written with Markdown's > prefix. */
export class Quote extends Node<'quote'> {
  public readonly text: string;

  private constructor(options: Required<QuoteOptions>) {
    super({ id: options.id, type: 'quote', attributes: options.attributes });
    this.text = options.text;
    Object.freeze(this);
  }

  public static create(options: QuoteOptions): Quote {
    return new Quote({
      id: options.id ?? createNodeId(),
      text: options.text.trim(),
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<QuoteOptions, 'id'>>): Quote {
    return Quote.create({
      id: this.id,
      text: changes.text ?? this.text,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
