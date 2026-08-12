import { createNodeId, type NodeAttributes, Node } from './node.js';

export type ChartKind =
  | 'area'
  | 'bar'
  | 'boxplot'
  | 'contour'
  | 'covariance'
  | 'density2d'
  | 'heatmap'
  | 'hexbin'
  | 'histogram'
  | 'line'
  | 'periodic-table'
  | 'profile'
  | 'quiver'
  | 'ridgeline'
  | 'scatter'
  | 'streamline'
  | 'stacked-histogram'
  | 'standard-model'
  | 'surface'
  | 'violin';

export interface ChartOptions {
  id?: string;
  kind?: ChartKind;
  smooth?: boolean;
  title?: string;
  source?: string;
  xField?: string;
  yField?: string;
  xLabel?: string;
  yLabel?: string;
  errorField?: string;
  valueField?: string;
  refreshMs?: number;
  bins?: number;
  labels?: readonly string[];
  xValues?: readonly number[];
  errorValues?: readonly number[];
  trendline?: boolean;
  values: readonly number[];
  attributes?: NodeAttributes;
}

/** An immutable chart specification, independent of any charting library. */
export class Chart extends Node<'chart'> {
  public readonly kind: ChartKind;
  public readonly smooth: boolean;
  public readonly title: string;
  public readonly source: string;
  public readonly xField: string;
  public readonly yField: string;
  public readonly xLabel: string;
  public readonly yLabel: string;
  public readonly errorField: string;
  public readonly valueField: string;
  public readonly refreshMs: number;
  public readonly bins: number;
  public readonly labels: readonly string[];
  public readonly xValues: readonly number[];
  public readonly errorValues: readonly number[];
  public readonly trendline: boolean;
  public readonly values: readonly number[];

  private constructor(options: Required<ChartOptions>) {
    super({ id: options.id, type: 'chart', attributes: options.attributes });
    this.kind = options.kind;
    this.smooth = options.smooth;
    this.title = options.title;
    this.source = options.source;
    this.xField = options.xField;
    this.yField = options.yField;
    this.xLabel = options.xLabel;
    this.yLabel = options.yLabel;
    this.errorField = options.errorField;
    this.valueField = options.valueField;
    this.refreshMs = options.refreshMs;
    this.bins = options.bins;
    this.labels = Object.freeze([...options.labels]);
    this.xValues = Object.freeze([...options.xValues]);
    this.errorValues = Object.freeze([...options.errorValues]);
    this.trendline = options.trendline;
    this.values = Object.freeze([...options.values]);
    Object.freeze(this);
  }

  public static create(options: ChartOptions): Chart {
    const source = options.source?.trim() ?? '';
    const bins = Number.isFinite(options.bins)
      ? Math.max(1, Math.min(100, Math.trunc(options.bins!)))
      : 10;
    const series = options.attributes?.series;
    const hasSeries =
      Array.isArray(series) &&
      series.some(
        (item) =>
          item &&
          typeof item === 'object' &&
          (typeof (item as { source?: unknown }).source === 'string' ||
            Array.isArray((item as { values?: unknown }).values))
      );
    if (options.values.length === 0 && source === '' && !hasSeries)
      throw new TypeError('A chart requires at least one value, data source, or series.');
    if (!options.values.every(Number.isFinite))
      throw new TypeError('Chart values must be finite numbers.');
    // Plot sources can arrive asynchronously and authors often edit x/y
    // lists while the viewer is live. Keep an incomplete list harmless: the
    // renderer falls back to ordinal x positions until the arrays align.
    if (options.xValues && !options.xValues.every(Number.isFinite)) {
      throw new TypeError('Chart x values must be finite numbers.');
    }
    if (
      options.errorValues &&
      !options.errorValues.every((value) => Number.isFinite(value) && value >= 0)
    ) {
      throw new TypeError('Chart error values must be non-negative numbers.');
    }

    const labels =
      options.labels?.map((label) => label.trim()) ??
      options.values.map((_, index) => String(index + 1));
    if (labels.length !== options.values.length) {
      throw new TypeError('A chart requires one label for every value.');
    }

    return new Chart({
      id: options.id ?? createNodeId(),
      kind:
        options.kind === 'bar' ||
        options.kind === 'area' ||
        options.kind === 'boxplot' ||
        options.kind === 'contour' ||
        options.kind === 'covariance' ||
        options.kind === 'density2d' ||
        options.kind === 'heatmap' ||
        options.kind === 'hexbin' ||
        options.kind === 'histogram' ||
        options.kind === 'periodic-table' ||
        options.kind === 'profile' ||
        options.kind === 'ridgeline' ||
        options.kind === 'scatter' ||
        options.kind === 'surface' ||
        options.kind === 'streamline' ||
        options.kind === 'stacked-histogram' ||
        options.kind === 'standard-model' ||
        options.kind === 'quiver' ||
        options.kind === 'violin'
          ? options.kind
          : 'line',
      smooth: options.smooth ?? false,
      title: options.title?.trim() ?? '',
      source,
      xField: options.xField?.trim() ?? '',
      yField: options.yField?.trim() ?? '',
      xLabel: options.xLabel?.trim() ?? '',
      yLabel: options.yLabel?.trim() ?? '',
      errorField: options.errorField?.trim() ?? '',
      valueField: options.valueField?.trim() ?? '',
      refreshMs: Math.max(0, Math.trunc(options.refreshMs ?? 0)),
      bins,
      labels,
      xValues: options.xValues ?? [],
      errorValues: options.errorValues ?? [],
      trendline: options.trendline ?? false,
      values: options.values,
      attributes: options.attributes ?? {}
    });
  }

  public with(changes: Partial<Omit<ChartOptions, 'id'>>): Chart {
    return Chart.create({
      id: this.id,
      kind: changes.kind ?? this.kind,
      smooth: changes.smooth ?? this.smooth,
      title: changes.title ?? this.title,
      source: changes.source ?? this.source,
      xField: changes.xField ?? this.xField,
      yField: changes.yField ?? this.yField,
      xLabel: changes.xLabel ?? this.xLabel,
      yLabel: changes.yLabel ?? this.yLabel,
      errorField: changes.errorField ?? this.errorField,
      valueField: changes.valueField ?? this.valueField,
      refreshMs: changes.refreshMs ?? this.refreshMs,
      bins: changes.bins ?? this.bins,
      labels: changes.labels ?? this.labels,
      xValues: changes.xValues ?? this.xValues,
      errorValues: changes.errorValues ?? this.errorValues,
      trendline: changes.trendline ?? this.trendline,
      values: changes.values ?? this.values,
      attributes: changes.attributes ?? this.attributes
    });
  }
}
