/** All node types built into the initial NeoPresent document model. */
export type NodeType =
  | 'presentation'
  | 'slide'
  | 'heading'
  | 'paragraph'
  | 'quote'
  | 'code'
  | 'image'
  | 'pdf'
  | 'table'
  | 'chart'
  | 'video'
  | 'audio'
  | 'columns'
  | 'column'
  | 'list';

/** Extensible data attached to a node without coupling core to a renderer. */
export type NodeAttributes = Readonly<Record<string, unknown>>;

/** The shared, immutable shape of every presentation node. */
export abstract class Node<TType extends NodeType = NodeType> {
  public readonly id: string;
  public readonly type: TType;
  public readonly attributes: NodeAttributes;
  public readonly children: readonly Node[];

  protected constructor({
    id,
    type,
    attributes = {},
    children = []
  }: {
    id: string;
    type: TType;
    attributes?: NodeAttributes;
    children?: readonly Node[];
  }) {
    this.id = id;
    this.type = type;
    this.attributes = Object.freeze({ ...attributes });
    this.children = Object.freeze([...children]);
  }

  /** Gets a renderer- or plugin-defined attribute with an optional type hint. */
  public getAttribute<T>(name: string): T | undefined {
    return this.attributes[name] as T | undefined;
  }
}

let nextNodeId = 1;

/** Creates a local ID when callers do not supply a stable ID themselves. */
export function createNodeId(): string {
  const id = `node_${nextNodeId}`;
  nextNodeId += 1;
  return id;
}

/** Resets automatic IDs; useful for deterministic tests and importers. */
export function resetNodeIdSequence(nextId = 1): void {
  if (!Number.isInteger(nextId) || nextId < 1) {
    throw new RangeError('The next node ID must be a positive integer.');
  }

  nextNodeId = nextId;
}
