import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface ImageOptions {
  id?: string;
  src: string;
  alt?: string;
  attributes?: NodeAttributes;
}

/** An image referenced by a Markdown slide. */
export class ImageNode extends Node<'image'> {
  public readonly src: string;
  public readonly alt: string;

  private constructor(options: Required<ImageOptions>) {
    super({
      id: options.id,
      type: 'image',
      attributes: options.attributes
    });
    this.src = options.src;
    this.alt = options.alt;
    Object.freeze(this);
  }

  public static create(options: ImageOptions): ImageNode {
    return new ImageNode({
      id: options.id ?? createNodeId(),
      src: options.src,
      alt: options.alt ?? '',
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<ImageOptions, 'id'>>): ImageNode {
    return ImageNode.create({
      id: this.id,
      src: changes.src ?? this.src,
      alt: changes.alt ?? this.alt,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
