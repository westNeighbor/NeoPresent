import { createNodeId, type NodeAttributes, Node } from './node.js';
import { Heading } from './heading.js';
import { Paragraph } from './paragraph.js';
import { Quote } from './quote.js';
import { CodeBlock } from './code-block.js';
import { ImageNode } from './image.js';
import { PdfNode } from './pdf.js';
import { Table } from './table.js';
import { Chart } from './chart.js';
import { MediaNode } from './media.js';
import { Columns } from './columns.js';
import { List } from './list.js';

/** Content nodes supported by the initial slide model. */
export type SlideChild =
  | Heading
  | Paragraph
  | Quote
  | CodeBlock
  | ImageNode
  | PdfNode
  | Table
  | Chart
  | MediaNode
  | Columns
  | List;

export interface SlideOptions {
  id?: string;
  notes?: string;
  attributes?: NodeAttributes;
  children?: readonly SlideChild[];
}

/** A single presentation slide. */
export class Slide extends Node<'slide'> {
  declare public readonly children: readonly SlideChild[];
  public readonly notes: string;

  private constructor(options: Required<SlideOptions>) {
    super({
      id: options.id,
      type: 'slide',
      attributes: options.attributes,
      children: options.children
    });
    this.notes = options.notes;
    Object.freeze(this);
  }

  public static create(options: SlideOptions = {}): Slide {
    return new Slide({
      id: options.id ?? createNodeId(),
      notes: options.notes ?? '',
      attributes: options.attributes ?? {},
      children: options.children ?? []
    });
  }

  public append(...children: SlideChild[]): Slide {
    return Slide.create({
      id: this.id,
      notes: this.notes,
      attributes: this.attributes,
      children: [...this.children, ...children]
    });
  }

  public with(changes: Partial<Omit<SlideOptions, 'id'>>): Slide {
    return Slide.create({
      id: this.id,
      notes: changes.notes ?? this.notes,
      attributes: changes.attributes ?? this.attributes,
      children: changes.children ?? this.children
    });
  }
}
