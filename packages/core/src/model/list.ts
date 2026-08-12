import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface ListOptions {
  id?: string;
  items: readonly string[];
  ordered?: boolean;
  attributes?: NodeAttributes;
}

/** A one-level Markdown list. */
export class List extends Node<'list'> {
  public readonly items: readonly string[];
  public readonly ordered: boolean;

  private constructor(options: Required<ListOptions>) {
    super({ id: options.id, type: 'list', attributes: options.attributes });
    this.items = Object.freeze(options.items.map((item) => item.trim()));
    this.ordered = options.ordered;
    Object.freeze(this);
  }

  public static create(options: ListOptions): List {
    if (options.items.length === 0) throw new TypeError('A list requires at least one item.');
    return new List({
      id: options.id ?? createNodeId(),
      items: options.items,
      ordered: options.ordered ?? false,
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<ListOptions, 'id'>>): List {
    return List.create({
      id: this.id,
      items: changes.items ?? this.items,
      ordered: changes.ordered ?? this.ordered,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
