/** Public extension points for NeoPresent plugins. */
export const packageName = '@neopresent/plugin-api';

export interface FencedBlockContext {
  /** Lowercase fence name, such as `plot` or `mermaid`. */
  language: string;
}

export type FencedBlockFactory<TNode = unknown> = (
  source: string,
  context: FencedBlockContext
) => TNode;

export interface NeoPresentPlugin {
  name: string;
  register(registry: PluginRegistry): void;
}

/**
 * Registry shared by the Markdown compiler and renderer integration layer.
 * Plugins register handlers instead of patching a global parser switch.
 */
export class PluginRegistry {
  private readonly fencedBlocks = new Map<string, FencedBlockFactory>();

  public registerFencedBlock<TNode>(language: string, factory: FencedBlockFactory<TNode>): void {
    const normalizedLanguage = language.trim().toLowerCase();
    if (normalizedLanguage === '') throw new TypeError('A fenced block name is required.');
    if (this.fencedBlocks.has(normalizedLanguage)) {
      throw new TypeError(
        `A fenced block handler is already registered for "${normalizedLanguage}".`
      );
    }
    this.fencedBlocks.set(normalizedLanguage, factory as FencedBlockFactory);
  }

  public createFencedBlock<TNode>(language: string, source: string): TNode | undefined {
    const normalizedLanguage = language.trim().toLowerCase();
    const factory = this.fencedBlocks.get(normalizedLanguage);
    return factory?.(source, { language: normalizedLanguage }) as TNode | undefined;
  }

  public hasFencedBlock(language: string): boolean {
    return this.fencedBlocks.has(language.trim().toLowerCase());
  }

  public use(plugin: NeoPresentPlugin): this {
    plugin.register(this);
    return this;
  }
}

export function createPluginRegistry(...plugins: NeoPresentPlugin[]): PluginRegistry {
  const registry = new PluginRegistry();
  plugins.forEach((plugin) => registry.use(plugin));
  return registry;
}
