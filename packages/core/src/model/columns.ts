import { createNodeId, type NodeAttributes, Node } from './node.js';
import type { SlideChild } from './slide.js';

export interface ColumnOptions {
  id?: string;
  children?: readonly SlideChild[];
  attributes?: NodeAttributes;
}

export interface ColumnsOptions {
  id?: string;
  columns: readonly Column[];
  attributes?: NodeAttributes;
}

/** One cell inside a responsive columns layout. */
export class Column extends Node<'column'> {
  declare public readonly children: readonly SlideChild[];

  private constructor(options: Required<ColumnOptions>) {
    super({
      id: options.id,
      type: 'column',
      attributes: options.attributes,
      children: options.children
    });
    Object.freeze(this);
  }

  public static create(options: ColumnOptions = {}): Column {
    return new Column({
      id: options.id ?? createNodeId(),
      children: options.children ?? [],
      attributes: options.attributes ?? {}
    });
  }
}

/** A responsive group of two or more columns. */
export class Columns extends Node<'columns'> {
  declare public readonly children: readonly Column[];
  public readonly columns: readonly Column[];

  private constructor(options: Required<ColumnsOptions>) {
    super({
      id: options.id,
      type: 'columns',
      attributes: options.attributes,
      children: options.columns
    });
    this.columns = this.children;
    Object.freeze(this);
  }

  public static create(options: ColumnsOptions): Columns {
    if (options.columns.length < 2)
      throw new TypeError('A columns layout requires at least two columns.');
    return new Columns({
      id: options.id ?? createNodeId(),
      columns: options.columns,
      attributes: options.attributes ?? {}
    });
  }
}
