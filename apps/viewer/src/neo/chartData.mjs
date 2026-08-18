/** Loads external CSV or JSON data into the immutable chart and table nodes used by the viewer. */
export async function hydratePresentationCharts(deck, deckUrl) {
  const slides = await Promise.all(
    deck.children.map(async (slide) =>
      hydrateSlideAssets(await hydrateSlideChartData(slide, deckUrl), deckUrl)
    )
  );
  return deck.with({ children: slides });
}

/** Keeps existing root-relative asset paths while allowing explicit deck-relative paths. */
function hydrateSlideAssets(slide, deckUrl) {
  const background = slide.getAttribute?.('background');
  const attributes = isImagePath(background)
    ? { ...slide.attributes, background: resolveAsset(background, deckUrl) }
    : slide.attributes;
  const hydrateNodeAssets = (node) => {
    if (node.type === 'columns') {
      const columns = node.columns.map((column) =>
        column.constructor.create({
          id: column.id,
          attributes: column.attributes,
          children: column.children.map(hydrateNodeAssets)
        })
      );
      return node.constructor.create({ id: node.id, attributes: node.attributes, columns });
    }
    if (node.type === 'image' || node.type === 'pdf')
      return node.with({ src: resolveAsset(node.src, deckUrl) });
    if (node.type === 'audio' || node.type === 'video') {
      return node.with({
        poster: node.poster ? resolveAsset(node.poster, deckUrl) : '',
        src: resolveAsset(node.src, deckUrl)
      });
    }
    return node;
  };
  const children = slide.children.map(hydrateNodeAssets);
  return slide.with({ attributes, children });
}

function isImagePath(value) {
  return (
    typeof value === 'string' && /\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(value.trim())
  );
}

function resolveAsset(value, deckUrl) {
  return value.startsWith('./') || value.startsWith('../') ? new URL(value, deckUrl).href : value;
}

export async function hydrateSlideChartData(slide, deckUrl, liveOnly = false) {
  const hydrateNode = async (node) => {
    if (node.type === 'columns') {
      const columns = await Promise.all(
        node.columns.map(async (column) =>
          column.constructor.create({
            id: column.id,
            attributes: column.attributes,
            children: await Promise.all(column.children.map(hydrateNode))
          })
        )
      );
      return node.constructor.create({ id: node.id, attributes: node.attributes, columns });
    }
    if (node.type === 'chart' && getChartSeries(node).length > 0)
      return hydrateChartSeries(node, deckUrl, liveOnly);
    if (
      !['chart', 'table'].includes(node.type) ||
      node.source === '' ||
      (liveOnly && node.refreshMs === 0)
    )
      return node;
    if (isWebSocketSource(node.source)) {
      return node.type === 'chart' && node.values.length === 0
        ? node.with({ labels: ['Waiting'], values: [0] })
        : node;
    }

    try {
      const response = await fetch(new URL(node.source, deckUrl), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const source = await response.text();
      return hydrateDataNode(node, source, node.source, response.headers.get('content-type'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`NeoPresent could not load ${node.type} data from ${node.source}: ${message}`);
      if (node.type === 'table') {
        return node.with({
          attributes: { ...node.attributes, error: `Could not load ${node.source}: ${message}` },
          headers: ['Data unavailable'],
          rows: []
        });
      }

      return node.with({
        attributes: { ...node.attributes, error: `Could not load ${node.source}: ${message}` },
        labels: ['Unavailable'],
        values: [0]
      });
    }
  };
  const children = await Promise.all(slide.children.map(hydrateNode));

  return slide.with({ children });
}

async function hydrateChartSeries(chart, deckUrl, liveOnly) {
  if (liveOnly && chart.refreshMs === 0) return chart;
  const series = await Promise.all(
    getChartSeries(chart).map(async (item) => {
      if (!item.source || isWebSocketSource(item.source)) return item;
      try {
        const response = await fetch(new URL(item.source, deckUrl), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { headers, rows } = parseExternalData(
          await response.text(),
          item.source,
          response.headers.get('content-type')
        );
        const xIndex = getColumnIndex(headers, item.xField, 0);
        const yIndex = getColumnIndex(headers, item.yField, 1);
        const pointLabelIndex = item.pointLabelField
          ? getColumnIndex(headers, item.pointLabelField, -1)
          : -1;
        const bubbleSizeIndex = item.bubbleSizeField
          ? getColumnIndex(headers, item.bubbleSizeField, -1)
          : -1;
        const errorIndex =
          item.errorField === '' ? -1 : getColumnIndex(headers, item.errorField, -1);
        const errorLowIndex =
          item.errorLowField === '' ? -1 : getColumnIndex(headers, item.errorLowField, -1);
        const errorHighIndex =
          item.errorHighField === '' ? -1 : getColumnIndex(headers, item.errorHighField, -1);
        const xErrorIndex =
          item.xErrorField === '' ? -1 : getColumnIndex(headers, item.xErrorField, -1);
        const xErrorLowIndex =
          item.xErrorLowField === '' ? -1 : getColumnIndex(headers, item.xErrorLowField, -1);
        const xErrorHighIndex =
          item.xErrorHighField === '' ? -1 : getColumnIndex(headers, item.xErrorHighField, -1);
        const hydratedUncertaintyLayers = hydrateUncertaintyLayers(
          item.uncertaintyLayers,
          headers,
          rows
        );
        const histogramEdges = chart.kind === 'histogram' ? readNumericColumn(rows, xIndex) : [];
        const histogramCounts = chart.kind === 'histogram' ? readNumericColumn(rows, yIndex) : [];
        const data = rows
          .map((row) => ({
            error: errorIndex < 0 ? 0 : Number(row[errorIndex]),
            errorLow: errorLowIndex < 0 ? 0 : Number(row[errorLowIndex]),
            errorHigh: errorHighIndex < 0 ? 0 : Number(row[errorHighIndex]),
            xError: xErrorIndex < 0 ? 0 : Number(row[xErrorIndex]),
            xErrorLow: xErrorLowIndex < 0 ? 0 : Number(row[xErrorLowIndex]),
            xErrorHigh: xErrorHighIndex < 0 ? 0 : Number(row[xErrorHighIndex]),
            label: row[xIndex] ?? '',
            pointLabel: pointLabelIndex < 0 ? '' : String(row[pointLabelIndex] ?? ''),
            bubbleSize: bubbleSizeIndex < 0 ? 0 : Number(row[bubbleSizeIndex]),
            value: Number(row[yIndex]),
            x: Number(row[xIndex])
          }))
          .filter(
            (entry) =>
              entry.label !== '' &&
              Number.isFinite(entry.value) &&
              (errorIndex < 0 || (Number.isFinite(entry.error) && entry.error >= 0)) &&
              (errorLowIndex < 0 || (Number.isFinite(entry.errorLow) && entry.errorLow >= 0)) &&
              (errorHighIndex < 0 || (Number.isFinite(entry.errorHigh) && entry.errorHigh >= 0))
          );
        if (data.length === 0) throw new Error('No usable rows found');
        return {
          ...item,
          labels: data.map((entry) => entry.label),
          values: data.map((entry) => entry.value),
          xValues: data.every((entry) => Number.isFinite(entry.x))
            ? data.map((entry) => entry.x)
            : [],
          errorValues: errorIndex < 0 ? [] : data.map((entry) => entry.error),
          errorLowValues: errorLowIndex < 0 ? [] : data.map((entry) => entry.errorLow),
          errorHighValues: errorHighIndex < 0 ? [] : data.map((entry) => entry.errorHigh),
          xErrorValues: xErrorIndex < 0 ? [] : data.map((entry) => entry.xError),
          xErrorLowValues: xErrorLowIndex < 0 ? [] : data.map((entry) => entry.xErrorLow),
          xErrorHighValues: xErrorHighIndex < 0 ? [] : data.map((entry) => entry.xErrorHigh),
          pointLabelValues: pointLabelIndex < 0 ? [] : data.map((entry) => entry.pointLabel),
          bubbleSizes: bubbleSizeIndex < 0 ? [] : data.map((entry) => entry.bubbleSize),
          uncertaintyLayers: hydratedUncertaintyLayers,
          // JSON histogram records conventionally provide N+1 edges and N
          // counts. Preserve the terminal edge for true variable-width bins.
          ...(histogramEdges.length === histogramCounts.length + 1
            ? {
                histogramEdges,
                values: histogramCounts,
                xValues: histogramEdges.slice(0, -1)
              }
            : {})
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`NeoPresent could not load chart series ${item.name}: ${message}`);
        return { ...item, labels: ['Unavailable'], values: [0], xValues: [], errorValues: [] };
      }
    })
  );
  return chart.with({ attributes: { ...chart.attributes, series } });
}

function getChartSeries(chart) {
  const value = chart.getAttribute?.('series');
  return Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          color: String(item.color ?? ''),
          dataAlpha: String(item.dataAlpha ?? ''),
          dataSize: String(item.dataSize ?? ''),
          symbol: String(item.symbol ?? ''),
          lineStyle: String(item.lineStyle ?? ''),
          draw: String(item.draw ?? ''),
          band: String(item.band ?? ''),
          bandColor: String(item.bandColor ?? ''),
          bandAlpha: String(item.bandAlpha ?? ''),
          bandLine: String(item.bandLine ?? ''),
          yAxis: item.yAxis === 'right' ? 'right' : 'left',
          animation: String(item.animation ?? ''),
          animationDelay: String(item.animationDelay ?? ''),
          animationDuration: String(item.animationDuration ?? ''),
          animationEasing: String(item.animationEasing ?? ''),
          revealStage: String(item.revealStage ?? ''),
          highlightEffect: String(item.highlightEffect ?? ''),
          highlightColor: String(item.highlightColor ?? ''),
          highlightDuration: String(item.highlightDuration ?? ''),
          highlightDelay: String(item.highlightDelay ?? ''),
          highlightIndex: String(item.highlightIndex ?? ''),
          legend: String(item.legend ?? ''),
          legendOrder: String(item.legendOrder ?? ''),
          stats: String(item.stats ?? ''),
          statsTitle: String(item.statsTitle ?? ''),
          statsX: String(item.statsX ?? ''),
          statsY: String(item.statsY ?? ''),
          statsStyle: item.statsStyle && typeof item.statsStyle === 'object' ? item.statsStyle : {},
          visible: item.visible !== false,
          fitAlpha: String(item.fitAlpha ?? ''),
          fitAnimation: String(item.fitAnimation ?? ''),
          fitAnimationDelay: String(item.fitAnimationDelay ?? ''),
          fitAnimationDuration: String(item.fitAnimationDuration ?? ''),
          fitAnimationEasing: String(item.fitAnimationEasing ?? ''),
          fitColor: String(item.fitColor ?? ''),
          fitWidth: String(item.fitWidth ?? ''),
          errorField: String(item.errorField ?? ''),
          errorLowField: String(item.errorLowField ?? ''),
          errorHighField: String(item.errorHighField ?? ''),
          xErrorField: String(item.xErrorField ?? ''),
          xErrorLowField: String(item.xErrorLowField ?? ''),
          xErrorHighField: String(item.xErrorHighField ?? ''),
          errorValues: Array.isArray(item.errorValues) ? item.errorValues : [],
          errorLowValues: Array.isArray(item.errorLowValues) ? item.errorLowValues : [],
          errorHighValues: Array.isArray(item.errorHighValues) ? item.errorHighValues : [],
          xErrorValues: Array.isArray(item.xErrorValues) ? item.xErrorValues : [],
          xErrorLowValues: Array.isArray(item.xErrorLowValues) ? item.xErrorLowValues : [],
          xErrorHighValues: Array.isArray(item.xErrorHighValues) ? item.xErrorHighValues : [],
          uncertaintyLayers: Array.isArray(item.uncertaintyLayers) ? item.uncertaintyLayers : [],
          histogramEdges: Array.isArray(item.histogramEdges) ? item.histogramEdges : [],
          labels: Array.isArray(item.labels) ? item.labels : [],
          name: String(item.name ?? 'Series'),
          pointLabelField: String(item.pointLabelField ?? ''),
          bubbleSizeField: String(item.bubbleSizeField ?? ''),
          source: String(item.source ?? ''),
          smooth: item.smooth === true,
          trendline: item.trendline === true,
          values: Array.isArray(item.values) ? item.values : [],
          xField: String(item.xField ?? ''),
          xValues: Array.isArray(item.xValues) ? item.xValues : [],
          yField: String(item.yField ?? '')
        }))
    : [];
}

/** Applies one CSV or JSON payload to a chart or table node. Used by fetch and WebSocket sources. */
export function hydrateDataNode(
  node,
  source,
  location = node.source,
  contentType = 'application/json'
) {
  if (node.type === 'chart' && node.kind === 'geographic' && isJsonSource(location, contentType)) {
    const value = JSON.parse(source);
    if (value?.type === 'FeatureCollection') return hydrateGeoJson(node, value);
  }
  const { headers, rows } = parseExternalData(source, location, contentType);
  if (node.type === 'table') {
    if (headers.length === 0) throw new Error('No column headers found');
    return node.with({ headers, rows });
  }

  if (node.kind === 'histogram' && hasPreBinnedFieldSource(node)) {
    return hydratePreBinnedHistogram(node, headers, rows);
  }

  if (node.kind === 'histogram' || node.kind === 'boxplot') {
    const valueIndex = getColumnIndex(headers, node.valueField, 0);
    const values = rows.map((row) => Number(row[valueIndex])).filter(Number.isFinite);
    if (values.length === 0) throw new Error('No usable numeric measurements found');
    return node.with({
      labels: values.map((_, index) => String(index + 1)),
      values,
      ...(node.kind === 'histogram'
        ? { attributes: withHydratedHistogramStatistics(node, headers, rows) }
        : {})
    });
  }
  if (['qq', 'ecdf'].includes(node.kind)) return hydrateSamplePlot(node, headers, rows);
  if (node.kind === 'contour') return hydrateContour(node, headers, rows);
  if (node.kind === 'ternary') return hydrateTernary(node, headers, rows);
  if (node.kind === 'efficiency' && getPlotStyle(node)['efficiency-total-field'])
    return hydrateEfficiency(node, headers, rows);
  if (node.kind === 'sankey') return hydrateSankey(node, headers, rows);
  if (node.kind === 'time-series') return hydrateTimeSeries(node, headers, rows);
  if (
    node.kind === 'forest' &&
    (getPlotStyle(node)['forest-lower-field'] || getPlotStyle(node)['forest-upper-field'])
  )
    return hydrateForest(node, headers, rows);
  if (node.kind === 'waterfall' && getPlotStyle(node)['waterfall-total-field'])
    return hydrateWaterfall(node, headers, rows);
  if (node.kind === 'geographic' && getPlotStyle(node)['geo-region-field'])
    return hydrateGeographicRegions(node, headers, rows);
  if (node.kind === 'surface') {
    const xIndex = getColumnIndex(headers, node.xField, 0);
    const yIndex = getColumnIndex(headers, node.yField, 1);
    const valueIndex = getColumnIndex(headers, node.valueField, 2);
    const points = rows
      .map((row) => ({
        x: Number(row[xIndex]),
        y: Number(row[yIndex]),
        value: Number(row[valueIndex])
      }))
      .filter(
        (point) =>
          Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.value)
      );
    if (points.length === 0) throw new Error('No usable surface points found');
    return node.with({
      labels: points.map((_, index) => String(index + 1)),
      xValues: points.map((point) => point.x),
      values: points.map((point) => point.value),
      attributes: { ...node.attributes, heatmapYValues: points.map((point) => point.y) }
    });
  }
  const variables = String(node.getAttribute?.('plotStyle')?.variables ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (node.kind === 'heatmap' && variables.length > 1) {
    const columns = variables.map((name) => getColumnIndex(headers, name, -1));
    if (columns.some((index) => index < 0)) throw new Error('Correlation variable not found');
    const samples = columns.map((index) => rows.map((row) => Number(row[index])));
    const corr = (a, b) => {
      const pairs = a
        .map((x, i) => [x, b[i]])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      const ax = pairs.reduce((s, [x]) => s + x, 0) / pairs.length;
      const by = pairs.reduce((s, [, y]) => s + y, 0) / pairs.length;
      const n = pairs.reduce((s, [x, y]) => s + (x - ax) * (y - by), 0);
      const d = Math.sqrt(
        pairs.reduce((s, [x]) => s + (x - ax) ** 2, 0) *
          pairs.reduce((s, [, y]) => s + (y - by) ** 2, 0)
      );
      return d ? n / d : 0;
    };
    const count = variables.length;
    return node.with({
      labels: Array.from({ length: count * count }, (_, i) => String(i + 1)),
      xValues: Array.from({ length: count * count }, (_, i) => (i % count) + 1),
      values: Array.from({ length: count * count }, (_, i) =>
        corr(samples[i % count], samples[Math.floor(i / count)])
      ),
      attributes: {
        ...node.attributes,
        heatmapYValues: Array.from({ length: count * count }, (_, i) => Math.floor(i / count) + 1),
        plotStyle: {
          ...node.getAttribute('plotStyle'),
          'heatmap-x-labels': variables.join(','),
          'heatmap-y-labels': variables.join(',')
        }
      }
    });
  }

  const xIndex = getColumnIndex(headers, node.xField, 0);
  const yIndex = getColumnIndex(headers, node.yField, 1);
  const pointLabelField = String(node.getAttribute?.('plotStyle')?.['point-label-field'] ?? '');
  const pointLabelIndex = pointLabelField ? getColumnIndex(headers, pointLabelField, -1) : -1;
  const bubbleSizeField = String(node.getAttribute?.('plotStyle')?.['bubble-size'] ?? '');
  const bubbleSizeIndex = bubbleSizeField ? getColumnIndex(headers, bubbleSizeField, -1) : -1;
  const errorIndex = node.errorField === '' ? -1 : getColumnIndex(headers, node.errorField, -1);
  const asymmetricFields = node.getAttribute?.('asymmetricErrorFields') ?? {};
  const errorLowIndex = asymmetricFields.lower
    ? getColumnIndex(headers, asymmetricFields.lower, -1)
    : -1;
  const errorHighIndex = asymmetricFields.upper
    ? getColumnIndex(headers, asymmetricFields.upper, -1)
    : -1;
  const xErrorIndex = node.getAttribute?.('xErrorField')
    ? getColumnIndex(headers, node.getAttribute('xErrorField'), -1)
    : -1;
  const asymmetricXFields = node.getAttribute?.('asymmetricXErrorFields') ?? {};
  const xErrorLowIndex = asymmetricXFields.lower
    ? getColumnIndex(headers, asymmetricXFields.lower, -1)
    : -1;
  const xErrorHighIndex = asymmetricXFields.upper
    ? getColumnIndex(headers, asymmetricXFields.upper, -1)
    : -1;
  const uncertaintyLayers = hydrateUncertaintyLayers(
    node.getAttribute?.('uncertaintyLayers'),
    headers,
    rows
  );
  const data = rows
    .map((row) => ({
      error: errorIndex < 0 ? 0 : Number(row[errorIndex]),
      errorLow: errorLowIndex < 0 ? 0 : Number(row[errorLowIndex]),
      errorHigh: errorHighIndex < 0 ? 0 : Number(row[errorHighIndex]),
      xError: xErrorIndex < 0 ? 0 : Number(row[xErrorIndex]),
      xErrorLow: xErrorLowIndex < 0 ? 0 : Number(row[xErrorLowIndex]),
      xErrorHigh: xErrorHighIndex < 0 ? 0 : Number(row[xErrorHighIndex]),
      label: row[xIndex] ?? '',
      pointLabel: pointLabelIndex < 0 ? '' : String(row[pointLabelIndex] ?? ''),
      bubbleSize: bubbleSizeIndex < 0 ? 0 : Number(row[bubbleSizeIndex]),
      value: Number(row[yIndex]),
      x: Number(row[xIndex])
    }))
    .filter(
      (item) =>
        item.label !== '' &&
        Number.isFinite(item.value) &&
        (!numericXKinds.has(node.kind) || Number.isFinite(item.x)) &&
        (errorIndex < 0 || (Number.isFinite(item.error) && item.error >= 0)) &&
        (errorLowIndex < 0 || (Number.isFinite(item.errorLow) && item.errorLow >= 0)) &&
        (errorHighIndex < 0 || (Number.isFinite(item.errorHigh) && item.errorHigh >= 0))
    );
  if (data.length === 0) throw new Error('No usable rows found');
  const attributes =
    errorLowIndex >= 0 || errorHighIndex >= 0
      ? {
          ...node.attributes,
          asymmetricErrors: {
            lower: errorLowIndex < 0 ? [] : data.map((item) => item.errorLow),
            upper: errorHighIndex < 0 ? [] : data.map((item) => item.errorHigh)
          }
        }
      : node.attributes;
  const withUncertaintyLayers =
    uncertaintyLayers.length > 0 ? { ...attributes, uncertaintyLayers } : attributes;
  const withPointLabels =
    pointLabelIndex >= 0
      ? { ...withUncertaintyLayers, pointLabelValues: data.map((item) => item.pointLabel) }
      : withUncertaintyLayers;
  const withBubbleSizes =
    bubbleSizeIndex >= 0
      ? { ...withPointLabels, bubbleSizes: data.map((item) => item.bubbleSize) }
      : withPointLabels;
  const withXErrors =
    xErrorLowIndex >= 0 || xErrorHighIndex >= 0
      ? {
          ...withBubbleSizes,
          asymmetricXErrors: {
            lower: xErrorLowIndex < 0 ? [] : data.map((item) => item.xErrorLow),
            upper: xErrorHighIndex < 0 ? [] : data.map((item) => item.xErrorHigh)
          }
        }
      : withBubbleSizes;
  return node.with({
    attributes: withXErrors,
    labels: data.map((item) => (pointLabelIndex >= 0 ? item.pointLabel : item.label)),
    values: data.map((item) => item.value),
    ...(numericXKinds.has(node.kind) ? { xValues: data.map((item) => item.x) } : {}),
    ...(errorIndex >= 0 ? { errorValues: data.map((item) => item.error) } : {}),
    ...(xErrorIndex >= 0
      ? { attributes: { ...withXErrors, xErrorValues: data.map((item) => item.xError) } }
      : {})
  });
}

const numericXKinds = new Set(['scatter', 'volcano', 'density2d', 'geographic']);

function getPlotStyle(node) {
  return node.getAttribute?.('plotStyle') ?? {};
}

function getPointLabelIndex(node, headers) {
  const field = String(getPlotStyle(node)['point-label-field'] ?? '').trim();
  return field ? getColumnIndex(headers, field, -1) : -1;
}

function hydrateSamplePlot(node, headers, rows) {
  const style = getPlotStyle(node);
  const valueIndex = getColumnIndex(headers, node.valueField, 0);
  const values = readNumericColumn(rows, valueIndex);
  if (values.length === 0) throw new Error('No usable numeric samples found');
  const eventField = String(style['survival-event-field'] ?? '').trim();
  if (!eventField) {
    return node.with({ labels: values.map((_, index) => String(index + 1)), values });
  }
  const eventIndex = getColumnIndex(headers, eventField, -1);
  const events = rows.map((row) => Number(row[eventIndex]));
  if (events.length !== values.length || events.some((event) => event !== 0 && event !== 1))
    throw new Error('Survival event status must contain one 0 or 1 value for every time');
  return node.with({
    labels: values.map((_, index) => String(index + 1)),
    values,
    attributes: {
      ...node.attributes,
      plotStyle: { ...style, 'survival-events': events.join(',') }
    }
  });
}

function hydrateContour(node, headers, rows) {
  const xIndex = getColumnIndex(headers, node.xField, 0);
  const yIndex = getColumnIndex(headers, node.yField, 1);
  const valueIndex = getColumnIndex(headers, node.valueField, 2);
  const points = numericPoints(rows, xIndex, yIndex, valueIndex);
  if (points.length === 0) throw new Error('No usable contour points found');
  const xValues = [...new Set(points.map((point) => point.x))].sort((a, b) => a - b);
  const yValues = [...new Set(points.map((point) => point.y))].sort((a, b) => a - b);
  const grid = new Map(points.map((point) => [`${point.x}\0${point.y}`, point.value]));
  if (grid.size !== xValues.length * yValues.length)
    throw new Error('Contour data must provide exactly one value for every x/y grid position');
  const values = yValues.flatMap((y) =>
    xValues.map((x) => {
      const value = grid.get(`${x}\0${y}`);
      if (!Number.isFinite(value)) throw new Error('Contour data grid is incomplete');
      return value;
    })
  );
  return node.with({
    labels: values.map((_, index) => String(index + 1)),
    xValues,
    values,
    attributes: { ...node.attributes, heatmapYValues: yValues }
  });
}

function hydrateTernary(node, headers, rows) {
  const xIndex = getColumnIndex(headers, node.xField, 0);
  const yIndex = getColumnIndex(headers, node.yField, 1);
  const valueIndex = getColumnIndex(headers, node.valueField, 2);
  const labelIndex = getPointLabelIndex(node, headers);
  const points = numericPoints(rows, xIndex, yIndex, valueIndex, labelIndex);
  if (points.length === 0) throw new Error('No usable ternary points found');
  if (points.some((point) => point.x < 0 || point.y < 0 || point.value < 0))
    throw new Error('Ternary components cannot be negative');
  return node.with({
    labels: points.map((point, index) => point.label || String(index + 1)),
    xValues: points.map((point) => point.x),
    values: points.map((point) => point.value),
    attributes: {
      ...node.attributes,
      heatmapYValues: points.map((point) => point.y),
      ...(labelIndex >= 0 ? { pointLabelValues: points.map((point) => point.label) } : {})
    }
  });
}

function hydrateEfficiency(node, headers, rows) {
  const style = getPlotStyle(node);
  const labelIndex = getColumnIndex(headers, node.xField, 0);
  const passedIndex = getColumnIndex(headers, node.yField, 1);
  const totalIndex = getColumnIndex(headers, String(style['efficiency-total-field']), -1);
  const data = rows
    .map((row) => ({
      label: String(row[labelIndex] ?? ''),
      passed: Number(row[passedIndex]),
      total: Number(row[totalIndex])
    }))
    .filter(
      (item) =>
        item.label &&
        Number.isFinite(item.passed) &&
        Number.isFinite(item.total) &&
        item.total > 0 &&
        item.passed >= 0 &&
        item.passed <= item.total
    );
  if (data.length === 0) throw new Error('No usable efficiency numerator/denominator rows found');
  return node.with({
    labels: data.map((item) => item.label),
    values: data.map((item) => item.passed),
    attributes: {
      ...node.attributes,
      plotStyle: { ...style, 'efficiency-total': data.map((item) => item.total).join(',') }
    }
  });
}

function hydrateSankey(node, headers, rows) {
  const style = getPlotStyle(node);
  const sourceIndex = getColumnIndex(headers, String(style['sankey-source-field'] ?? ''), 0);
  const targetIndex = getColumnIndex(headers, String(style['sankey-target-field'] ?? ''), 1);
  const valueIndex = getColumnIndex(headers, String(style['sankey-value-field'] ?? ''), 2);
  const links = rows
    .map((row) => ({
      source: String(row[sourceIndex] ?? '').trim(),
      target: String(row[targetIndex] ?? '').trim(),
      value: Number(row[valueIndex])
    }))
    .filter((link) => link.source && link.target && Number.isFinite(link.value) && link.value >= 0);
  if (links.length === 0) throw new Error('No usable Sankey links found');
  return node.with({
    attributes: {
      ...node.attributes,
      series: links.map((link) => ({
        name: `${link.source} -> ${link.target}`,
        labels: [],
        values: [link.value],
        xValues: []
      }))
    }
  });
}

function hydrateTimeSeries(node, headers, rows) {
  const style = getPlotStyle(node);
  const labelIndex = getColumnIndex(headers, node.xField, 0);
  const valueIndex = getColumnIndex(headers, node.yField, 1);
  const errorIndex = node.errorField ? getColumnIndex(headers, node.errorField, -1) : -1;
  const data = rows
    .map((row) => ({
      label: String(row[labelIndex] ?? '').trim(),
      valueText: String(row[valueIndex] ?? '').trim(),
      errorText: errorIndex < 0 ? '' : String(row[errorIndex] ?? '').trim()
    }))
    .filter((item) => item.label);
  if (data.length === 0) throw new Error('No usable time-series rows found');
  const missing = [];
  const values = data.map((item, index) => {
    if (item.valueText === '') {
      missing.push(index);
      return 0;
    }
    const value = Number(item.valueText);
    if (!Number.isFinite(value)) throw new Error(`Invalid time-series value at ${item.label}`);
    return value;
  });
  const errorValues = data.map((item) => {
    if (item.errorText === '') return 0;
    const error = Number(item.errorText);
    if (!Number.isFinite(error) || error < 0)
      throw new Error(`Invalid time-series uncertainty at ${item.label}`);
    return error;
  });
  if (missing.length === data.length) throw new Error('Time series contains no measurements');
  return node.with({
    labels: data.map((item) => item.label),
    values,
    ...(errorIndex >= 0 ? { errorValues } : {}),
    attributes: {
      ...node.attributes,
      plotStyle: { ...style, 'time-missing': missing.join(',') }
    }
  });
}

function hydrateForest(node, headers, rows) {
  const style = getPlotStyle(node);
  if (!style['forest-lower-field'] || !style['forest-upper-field'])
    throw new Error('Forest external data requires both forest-lower-field and forest-upper-field');
  const labelIndex = getColumnIndex(headers, node.xField, 0);
  const valueIndex = getColumnIndex(headers, node.yField, 1);
  const lowerIndex = getColumnIndex(headers, String(style['forest-lower-field'] ?? ''), -1);
  const upperIndex = getColumnIndex(headers, String(style['forest-upper-field'] ?? ''), -1);
  const data = rows
    .map((row) => ({
      label: String(row[labelIndex] ?? '').trim(),
      value: Number(row[valueIndex]),
      lower: Number(row[lowerIndex]),
      upper: Number(row[upperIndex])
    }))
    .filter(
      (item) =>
        item.label &&
        Number.isFinite(item.value) &&
        Number.isFinite(item.lower) &&
        Number.isFinite(item.upper) &&
        item.lower <= item.value &&
        item.value <= item.upper
    );
  if (data.length === 0) throw new Error('No usable forest estimates and confidence limits found');
  return node.with({
    labels: data.map((item) => item.label),
    values: data.map((item) => item.value),
    attributes: {
      ...node.attributes,
      asymmetricErrors: {
        lower: data.map((item) => item.value - item.lower),
        upper: data.map((item) => item.upper - item.value)
      }
    }
  });
}

function hydrateWaterfall(node, headers, rows) {
  const style = getPlotStyle(node);
  const labelIndex = getColumnIndex(headers, node.xField, 0);
  const valueIndex = getColumnIndex(headers, node.yField, 1);
  const totalIndex = getColumnIndex(headers, String(style['waterfall-total-field']), -1);
  const data = rows
    .map((row) => ({
      label: String(row[labelIndex] ?? '').trim(),
      value: Number(row[valueIndex]),
      total: /^(?:1|true|yes|total)$/i.test(String(row[totalIndex] ?? '').trim())
    }))
    .filter((item) => item.label && Number.isFinite(item.value));
  if (data.length === 0) throw new Error('No usable waterfall rows found');
  return node.with({
    labels: data.map((item) => item.label),
    values: data.map((item) => item.value),
    attributes: {
      ...node.attributes,
      plotStyle: {
        ...style,
        'waterfall-total-indices': data
          .flatMap((item, index) => (item.total ? [index] : []))
          .join(',')
      }
    }
  });
}

function hydrateGeographicRegions(node, headers, rows) {
  const style = getPlotStyle(node);
  const regionIndex = getColumnIndex(headers, String(style['geo-region-field']), -1);
  const xIndex = getColumnIndex(headers, node.xField, 0);
  const yIndex = getColumnIndex(headers, node.yField, 1);
  const regions = new Map();
  for (const row of rows) {
    const name = String(row[regionIndex] ?? '').trim();
    const x = Number(row[xIndex]);
    const y = Number(row[yIndex]);
    if (!name || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    const region = regions.get(name) ?? { name, labels: [], xValues: [], values: [] };
    region.xValues.push(x);
    region.values.push(y);
    regions.set(name, region);
  }
  if (regions.size === 0) throw new Error('No usable geographic regions found');
  return node.with({
    labels: [],
    values: [],
    attributes: { ...node.attributes, series: [...regions.values()] }
  });
}

function hydrateGeoJson(node, collection) {
  const style = getPlotStyle(node);
  const nameField = String(style['geo-name-field'] ?? 'name').trim();
  const valueField = String(style['geo-value-field'] ?? '').trim();
  const points = [];
  const regions = [];
  const featureName = (feature, index) =>
    String(feature?.properties?.[nameField] ?? feature?.id ?? `Feature ${index + 1}`);
  const featureValue = (feature) => {
    if (!valueField) return null;
    const value = Number(feature?.properties?.[valueField]);
    return Number.isFinite(value) ? value : null;
  };
  const addPolygon = (coordinates, name, geoValue) => {
    const exterior = Array.isArray(coordinates?.[0]) ? coordinates[0] : [];
    const valid = exterior
      .map((coordinate) => ({ x: Number(coordinate?.[0]), y: Number(coordinate?.[1]) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (valid.length >= 3)
      regions.push({
        name,
        geoValue,
        labels: [],
        xValues: valid.map((point) => point.x),
        values: valid.map((point) => point.y)
      });
  };
  for (const [index, feature] of (collection.features ?? []).entries()) {
    const geometry = feature?.geometry;
    const name = featureName(feature, index);
    const geoValue = featureValue(feature);
    if (geometry?.type === 'Point') {
      const x = Number(geometry.coordinates?.[0]);
      const y = Number(geometry.coordinates?.[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ name, x, y, geoValue });
    } else if (geometry?.type === 'Polygon') {
      addPolygon(geometry.coordinates, name, geoValue);
    } else if (geometry?.type === 'MultiPolygon') {
      geometry.coordinates?.forEach((polygon, polygonIndex) =>
        addPolygon(
          polygon,
          geometry.coordinates.length > 1 ? `${name} ${polygonIndex + 1}` : name,
          geoValue
        )
      );
    }
  }
  if (points.length === 0 && regions.length === 0)
    throw new Error('GeoJSON contains no usable Point, Polygon, or MultiPolygon features');
  if (
    valueField &&
    ![...points.map((point) => point.geoValue), ...regions.map((region) => region.geoValue)].some(
      Number.isFinite
    )
  )
    throw new Error(`GeoJSON property "${valueField}" has no usable numeric feature values`);
  return node.with({
    labels: points.map((point) => point.name),
    xValues: points.map((point) => point.x),
    values: points.map((point) => point.y),
    attributes: {
      ...node.attributes,
      series: regions,
      geoPointValues: points.map((point) => point.geoValue)
    }
  });
}

function numericPoints(rows, xIndex, yIndex, valueIndex, labelIndex = -1) {
  return rows
    .map((row) => ({
      x: Number(row[xIndex]),
      y: Number(row[yIndex]),
      value: Number(row[valueIndex]),
      label: labelIndex < 0 ? '' : String(row[labelIndex] ?? '')
    }))
    .filter(
      (point) =>
        Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.value)
    );
}

function hasPreBinnedFieldSource(node) {
  const style = node.getAttribute?.('plotStyle') ?? {};
  return Boolean(style['bin-edges-field'] || style['bin-counts-field']);
}

function hydratePreBinnedHistogram(node, headers, rows) {
  const style = node.getAttribute?.('plotStyle') ?? {};
  const edgeField = String(style['bin-edges-field'] ?? '').trim();
  const countField = String(style['bin-counts-field'] ?? '').trim();
  if (!edgeField || !countField) {
    throw new Error('Pre-binned histograms require both bin-edges-field and bin-counts-field');
  }
  const edges = readNumericColumn(rows, getColumnIndex(headers, edgeField, -1));
  const counts = readNumericColumn(rows, getColumnIndex(headers, countField, -1));
  if (
    edges.length < 2 ||
    counts.length !== edges.length - 1 ||
    counts.some((count) => count < 0) ||
    edges.some((edge, index) => index > 0 && edge <= edges[index - 1])
  ) {
    throw new Error('Pre-binned histogram edges/counts are invalid or have incompatible lengths');
  }
  return node.with({
    attributes: withHydratedHistogramStatistics(node, headers, rows, {
      'bin-edges': edges.join(','),
      'bin-counts': counts.join(',')
    })
  });
}

function withHydratedHistogramStatistics(node, headers, rows, additions = {}) {
  const style = node.getAttribute?.('plotStyle') ?? {};
  const stats = Object.fromEntries(
    ['entries', 'mean', 'rms', 'stddev', 'min', 'max', 'median'].flatMap((key) => {
      const field = String(style[`stats-${key}-field`] ?? '').trim();
      if (!field) return [];
      const values = readNumericColumn(rows, getColumnIndex(headers, field, -1));
      if (values.length === 0)
        throw new Error(`Statistic field "${field}" has no usable numeric value`);
      return [[`stats-${key}-value`, String(values[0])]];
    })
  );
  return {
    ...node.attributes,
    plotStyle: { ...style, ...additions, ...stats }
  };
}

function readNumericColumn(rows, index) {
  const cells = rows
    .map((row) => row[index])
    .filter((value) => value !== undefined && value !== '');
  if (cells.length === 1) {
    const list = parseNumericList(cells[0]);
    if (list) return list;
  }
  const values = cells.map(Number);
  if (!values.every(Number.isFinite))
    throw new Error('External histogram data contains a non-numeric value');
  return values;
}

function parseNumericList(value) {
  const text = String(value ?? '').trim();
  if (text === '') return null;
  try {
    const decoded = JSON.parse(text);
    if (Array.isArray(decoded) && decoded.every(Number.isFinite)) return decoded.map(Number);
  } catch {
    // CSV list values use a simple comma-separated form.
  }
  const values = text.split(',').map((item) => Number(item.trim()));
  return values.every(Number.isFinite) ? values : null;
}

function hydrateUncertaintyLayers(value, headers, rows) {
  if (!Array.isArray(value)) return [];
  return value.map((layer) => {
    const symmetricIndex = layer.errorField ? getColumnIndex(headers, layer.errorField, -1) : -1;
    const lowerIndex = layer.errorLowField ? getColumnIndex(headers, layer.errorLowField, -1) : -1;
    const upperIndex = layer.errorHighField
      ? getColumnIndex(headers, layer.errorHighField, -1)
      : -1;
    const xErrorIndex = layer.xErrorField ? getColumnIndex(headers, layer.xErrorField, -1) : -1;
    const correlationIndex = layer.correlationField
      ? getColumnIndex(headers, layer.correlationField, -1)
      : -1;
    const read = (index) => (index < 0 ? [] : rows.map((row) => Number(row[index])));
    const errorValues = symmetricIndex < 0 ? (layer.errorValues ?? []) : read(symmetricIndex);
    const errorLowValues = lowerIndex < 0 ? (layer.errorLowValues ?? []) : read(lowerIndex);
    const errorHighValues = upperIndex < 0 ? (layer.errorHighValues ?? []) : read(upperIndex);
    const xErrorValues = xErrorIndex < 0 ? (layer.xErrorValues ?? []) : read(xErrorIndex);
    const correlationValues =
      correlationIndex < 0 ? (layer.correlationValues ?? []) : read(correlationIndex);
    if (
      ![...errorValues, ...errorLowValues, ...errorHighValues, ...xErrorValues].every(
        (item) => Number.isFinite(item) && item >= 0
      )
    ) {
      throw new Error(`Uncertainty layer "${layer.name || 'unnamed'}" contains an invalid value`);
    }
    if (!correlationValues.every((item) => Number.isFinite(item) && item >= -1 && item <= 1)) {
      throw new Error(
        `Uncertainty layer "${layer.name || 'unnamed'}" has correlation outside -1..1`
      );
    }
    return {
      ...layer,
      errorValues,
      errorLowValues,
      errorHighValues,
      xErrorValues,
      correlationValues
    };
  });
}

function isWebSocketSource(source) {
  return /^wss?:\/\//i.test(source);
}

function getColumnIndex(headers, requested, fallback) {
  const index =
    requested === ''
      ? fallback
      : headers.findIndex((header) => header.toLowerCase() === requested.toLowerCase());
  if (index < 0) throw new Error(`Column "${requested}" was not found`);
  return index;
}

function parseCsv(source) {
  const rows = source.trim().split(/\r?\n/).filter(Boolean).map(parseCsvRow);
  const [headers = [], ...data] = rows;
  return { headers, rows: data };
}

function parseCsvRow(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function parseExternalData(source, location, contentType) {
  const isJson = isJsonSource(location, contentType);
  return isJson ? parseJson(source) : parseCsv(source);
}

function isJsonSource(location, contentType) {
  return (
    /(?:application|text)\/(?:geo\+)?json/i.test(contentType ?? '') ||
    /\.(?:geo)?json(?:$|[?#])/i.test(location)
  );
}

function parseJson(source) {
  const value = JSON.parse(source);
  if (
    !Array.isArray(value) &&
    value &&
    typeof value === 'object' &&
    Object.values(value).some(Array.isArray)
  ) {
    const headers = Object.keys(value);
    const arrayHeaders = headers.filter((header) => Array.isArray(value[header]));
    const length = Math.max(0, ...arrayHeaders.map((header) => value[header].length));
    return {
      headers,
      rows: Array.from({ length }, (_, index) =>
        headers.map((header) =>
          formatJsonCell(
            Array.isArray(value[header]) ? value[header][index] : index === 0 ? value[header] : ''
          )
        )
      )
    };
  }
  const records = Array.isArray(value) ? value : value?.rows;
  const suppliedHeaders = Array.isArray(value?.headers) ? value.headers.map(String) : [];
  if (!Array.isArray(records))
    throw new TypeError('JSON data must be an array, or an object with a rows array.');

  if (records.length === 0) return { headers: suppliedHeaders, rows: [] };
  if (Array.isArray(records[0])) {
    const headers =
      suppliedHeaders.length > 0
        ? suppliedHeaders
        : records[0].map((_, index) => `Column ${index + 1}`);
    return { headers, rows: records.map((row) => row.map(formatJsonCell)) };
  }

  if (typeof records[0] !== 'object' || records[0] === null) {
    return {
      headers: suppliedHeaders.length > 0 ? suppliedHeaders : ['Value'],
      rows: records.map((value) => [formatJsonCell(value)])
    };
  }

  const headers =
    suppliedHeaders.length > 0
      ? suppliedHeaders
      : [...new Set(records.flatMap((record) => Object.keys(record ?? {})))];
  return {
    headers,
    rows: records.map((record) => headers.map((header) => formatJsonCell(record?.[header])))
  };
}

function formatJsonCell(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
