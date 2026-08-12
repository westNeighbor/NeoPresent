import { createNodeId, type NodeAttributes, Node } from './node.js';

export type MediaKind = 'audio' | 'video';

export interface MediaOptions {
  id?: string;
  kind: MediaKind;
  src: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  attributes?: NodeAttributes;
}

/** A native audio or video item hosted by the browser media element. */
export class MediaNode extends Node<MediaKind> {
  public readonly src: string;
  public readonly controls: boolean;
  public readonly autoplay: boolean;
  public readonly loop: boolean;
  public readonly muted: boolean;
  public readonly poster: string;

  private constructor(options: Required<MediaOptions>) {
    super({ id: options.id, type: options.kind, attributes: options.attributes });
    this.src = options.src;
    this.controls = options.controls;
    this.autoplay = options.autoplay;
    this.loop = options.loop;
    this.muted = options.muted;
    this.poster = options.poster;
    Object.freeze(this);
  }

  public static create(options: MediaOptions): MediaNode {
    if (options.src.trim() === '') throw new TypeError('A media node requires a source path.');

    return new MediaNode({
      id: options.id ?? createNodeId(),
      kind: options.kind,
      src: options.src,
      controls: options.controls ?? true,
      autoplay: options.autoplay ?? false,
      loop: options.loop ?? false,
      muted: options.muted ?? false,
      poster: options.poster ?? '',
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<MediaOptions, 'id'>>): MediaNode {
    return MediaNode.create({
      id: this.id,
      kind: changes.kind ?? this.type,
      src: changes.src ?? this.src,
      controls: changes.controls ?? this.controls,
      autoplay: changes.autoplay ?? this.autoplay,
      loop: changes.loop ?? this.loop,
      muted: changes.muted ?? this.muted,
      poster: changes.poster ?? this.poster,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
