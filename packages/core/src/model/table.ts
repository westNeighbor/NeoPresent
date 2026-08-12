import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface TableOptions {
  id?: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  source?: string;
  refreshMs?: number;
  attributes?: NodeAttributes;
}

/** A simple, immutable data table compiled from a Markdown table. */
export class Table extends Node<'table'> {
  public readonly headers: readonly string[];
  public readonly rows: readonly (readonly string[])[];
  public readonly source: string;
  public readonly refreshMs: number;

  private constructor(options: Required<TableOptions>) {
    super({ id: options.id, type: 'table', attributes: options.attributes });
    this.headers = Object.freeze([...options.headers]);
    this.rows = Object.freeze(options.rows.map((row) => Object.freeze([...row])));
    this.source = options.source;
    this.refreshMs = options.refreshMs;
    Object.freeze(this);
  }

  public static create(options: TableOptions): Table {
    const source = options.source?.trim() ?? '';
    if (options.headers.length === 0 && source === '')
      throw new TypeError('A table requires at least one column or a data source.');

    const headers = options.headers.map((header) => header.trim());
    const rows = options.rows.map((row) => headers.map((_, index) => (row[index] ?? '').trim()));

    return new Table({
      id: options.id ?? createNodeId(),
      headers,
      rows,
      source,
      refreshMs: Math.max(0, Math.trunc(options.refreshMs ?? 0)),
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<TableOptions, 'id'>>): Table {
    return Table.create({
      id: this.id,
      headers: changes.headers ?? this.headers,
      rows: changes.rows ?? this.rows,
      source: changes.source ?? this.source,
      refreshMs: changes.refreshMs ?? this.refreshMs,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
