import { createNodeId, type NodeAttributes, Node } from './node.js';

export interface CodeBlockOptions {
  id?: string;
  code: string;
  language?: string;
  attributes?: NodeAttributes;
}

/** A fenced source-code block with an optional language identifier. */
export class CodeBlock extends Node<'code'> {
  public readonly code: string;
  public readonly language: string;

  private constructor(options: Required<CodeBlockOptions>) {
    super({
      id: options.id,
      type: 'code',
      attributes: options.attributes
    });
    this.code = options.code;
    this.language = options.language;
    Object.freeze(this);
  }

  public static create(options: CodeBlockOptions): CodeBlock {
    return new CodeBlock({
      id: options.id ?? createNodeId(),
      code: options.code,
      language: options.language ?? '',
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<CodeBlockOptions, 'id'>>): CodeBlock {
    return CodeBlock.create({
      id: this.id,
      code: changes.code ?? this.code,
      language: changes.language ?? this.language,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
