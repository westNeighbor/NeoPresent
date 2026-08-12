import { createNodeId, type NodeAttributes, Node } from './node.js';
import { Slide } from './slide.js';

export interface PresentationOptions {
  id?: string;
  title?: string;
  author?: string;
  theme?: string;
  attributes?: NodeAttributes;
  children?: readonly Slide[];
}

/** The root of a complete NeoPresent document. */
export class Presentation extends Node<'presentation'> {
  declare public readonly children: readonly Slide[];
  public readonly title: string;
  public readonly author: string;
  public readonly theme: string;

  private constructor(options: Required<PresentationOptions>) {
    super({
      id: options.id,
      type: 'presentation',
      attributes: options.attributes,
      children: options.children
    });
    this.title = options.title;
    this.author = options.author;
    this.theme = options.theme;
    Object.freeze(this);
  }

  public static create(options: PresentationOptions = {}): Presentation {
    return new Presentation({
      id: options.id ?? createNodeId(),
      title: options.title ?? '',
      author: options.author ?? '',
      theme: options.theme ?? 'default',
      attributes: options.attributes ?? {},
      children: options.children ?? []
    });
  }

  public append(...slides: Slide[]): Presentation {
    return Presentation.create({
      id: this.id,
      title: this.title,
      author: this.author,
      theme: this.theme,
      attributes: this.attributes,
      children: [...this.children, ...slides]
    });
  }

  public with(changes: Partial<Omit<PresentationOptions, 'id'>>): Presentation {
    return Presentation.create({
      id: this.id,
      title: changes.title ?? this.title,
      author: changes.author ?? this.author,
      theme: changes.theme ?? this.theme,
      attributes: changes.attributes ?? this.attributes,
      children: changes.children ?? this.children
    });
  }
}
