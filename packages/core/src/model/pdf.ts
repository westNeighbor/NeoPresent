import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface PdfOptions {
  id?: string;
  src: string;
  page?: number;
  mode?: PdfDisplayMode;
  attributes?: NodeAttributes;
}

export type PdfDisplayMode = 'canvas' | 'viewer';

/** A PDF document embedded into a slide at a selected page. */
export class PdfNode extends Node<'pdf'> {
  public readonly src: string;
  public readonly page: number;
  public readonly mode: PdfDisplayMode;

  private constructor(options: Required<PdfOptions>) {
    super({
      id: options.id,
      type: 'pdf',
      attributes: options.attributes
    });
    this.src = options.src;
    this.page = options.page;
    this.mode = options.mode;
    Object.freeze(this);
  }

  public static create(options: PdfOptions): PdfNode {
    if (options.src.trim() === '') throw new TypeError('A PDF node requires a source path.');

    return new PdfNode({
      id: options.id ?? createNodeId(),
      src: options.src,
      page: Math.max(1, Math.trunc(options.page ?? 1)),
      mode: options.mode === 'viewer' ? 'viewer' : 'canvas',
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<PdfOptions, 'id'>>): PdfNode {
    return PdfNode.create({
      id: this.id,
      src: changes.src ?? this.src,
      page: changes.page ?? this.page,
      mode: changes.mode ?? this.mode,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
