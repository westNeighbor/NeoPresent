import { describe, expect, it } from 'vitest';

import { Chart } from '../../../../packages/core/dist/index.js';
import { hydrateDataNode } from './chartData.mjs';

const layers = [
  {
    name: 'Statistical',
    style: 'bar',
    errorField: 'stat',
    errorLowField: '',
    errorHighField: '',
    errorValues: [],
    errorLowValues: [],
    errorHighValues: []
  },
  {
    name: 'Covariance',
    style: 'ellipse',
    errorField: 'stat',
    xErrorField: 'x_stat',
    correlationField: 'rho',
    errorValues: [],
    errorLowValues: [],
    errorHighValues: []
  },
  {
    name: 'Systematic',
    style: 'box',
    errorField: '',
    errorLowField: 'syst_down',
    errorHighField: 'syst_up',
    errorValues: [],
    errorLowValues: [],
    errorHighValues: []
  }
];

function sourceChart() {
  return Chart.create({
    kind: 'scatter',
    source: 'measurements.csv',
    xField: 'energy',
    yField: 'rate',
    values: [],
    attributes: { uncertaintyLayers: layers }
  });
}

describe('named uncertainty data hydration', () => {
  it('loads symmetric and asymmetric layer columns from CSV', () => {
    const chart = hydrateDataNode(
      sourceChart(),
      'energy,rate,stat,syst_down,syst_up,x_stat,rho\n1,10,0.5,0.8,1.0,0.1,0.4\n2,12,0.6,0.9,1.1,0.2,-0.3',
      'measurements.csv',
      'text/csv'
    );
    expect(chart.getAttribute('uncertaintyLayers')).toEqual([
      expect.objectContaining({ errorValues: [0.5, 0.6] }),
      expect.objectContaining({ xErrorValues: [0.1, 0.2], correlationValues: [0.4, -0.3] }),
      expect.objectContaining({ errorLowValues: [0.8, 0.9], errorHighValues: [1, 1.1] })
    ]);
  });

  it('loads the same layer columns from JSON records', () => {
    const json = JSON.stringify([
      { energy: 1, rate: 10, stat: 0.5, syst_down: 0.8, syst_up: 1, x_stat: 0.1, rho: 0.4 },
      { energy: 2, rate: 12, stat: 0.6, syst_down: 0.9, syst_up: 1.1, x_stat: 0.2, rho: -0.3 }
    ]);
    const chart = hydrateDataNode(sourceChart(), json, 'measurements.json', 'application/json');
    expect(chart.getAttribute('uncertaintyLayers')?.[0].errorValues).toEqual([0.5, 0.6]);
    expect(chart.getAttribute('uncertaintyLayers')?.[1].correlationValues).toEqual([0.4, -0.3]);
    expect(chart.getAttribute('uncertaintyLayers')?.[2].errorHighValues).toEqual([1, 1.1]);
  });
});

function externalChart(kind, fields = {}, plotStyle = {}) {
  return Chart.create({
    kind,
    source: 'data.csv',
    xField: fields.x ?? 'x',
    yField: fields.y ?? 'y',
    valueField: fields.value ?? 'value',
    values: [],
    attributes: { plotStyle }
  });
}

describe('scientific plot external data hydration', () => {
  it('loads one-column QQ/ECDF samples and censored survival records', () => {
    const qq = hydrateDataNode(
      externalChart('qq', { value: 'measurement' }),
      'measurement\n1.2\n1.8\n2.4',
      'sample.csv',
      'text/csv'
    );
    expect(qq.values).toEqual([1.2, 1.8, 2.4]);

    const survival = hydrateDataNode(
      externalChart('ecdf', { value: 'time' }, { 'survival-event-field': 'observed' }),
      JSON.stringify([
        { time: 2, observed: 1 },
        { time: 4, observed: 0 },
        { time: 7, observed: 1 }
      ]),
      'survival.json',
      'application/json'
    );
    expect(survival.values).toEqual([2, 4, 7]);
    expect(survival.getAttribute('plotStyle')['survival-events']).toBe('1,0,1');
  });

  it('preserves missing external time-series measurements as gaps', () => {
    const chart = hydrateDataNode(
      externalChart('time-series', { x: 'date', y: 'rate' }),
      'date,rate\n2026-01,10.2\n2026-02,\n2026-03,11.4',
      'rates.csv',
      'text/csv'
    );
    expect(chart.labels).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(chart.values).toEqual([10.2, 0, 11.4]);
    expect(chart.getAttribute('plotStyle')['time-missing']).toBe('1');
  });

  it('converts absolute forest limits into asymmetric errors', () => {
    const chart = hydrateDataNode(
      externalChart(
        'forest',
        { x: 'study', y: 'estimate' },
        {
          'forest-lower-field': 'lower',
          'forest-upper-field': 'upper'
        }
      ),
      JSON.stringify([
        { study: 'A', estimate: 1.2, lower: 1, upper: 1.45 },
        { study: 'B', estimate: 0.85, lower: 0.73, upper: 1 }
      ]),
      'forest.json',
      'application/json'
    );
    expect(chart.labels).toEqual(['A', 'B']);
    expect(chart.values).toEqual([1.2, 0.85]);
    const errors = chart.getAttribute('asymmetricErrors');
    expect(errors.lower[0]).toBeCloseTo(0.2);
    expect(errors.lower[1]).toBeCloseTo(0.12);
    expect(errors.upper[0]).toBeCloseTo(0.25);
    expect(errors.upper[1]).toBeCloseTo(0.15);
  });

  it('marks explicit total rows in external waterfall data', () => {
    const chart = hydrateDataNode(
      externalChart('waterfall', { x: 'step', y: 'amount' }, { 'waterfall-total-field': 'kind' }),
      'step,amount,kind\nBaseline,100,total\nCalibration,12,change\nSelection,-18,change\nFinal,94,total',
      'waterfall.csv',
      'text/csv'
    );
    expect(chart.values).toEqual([100, 12, -18, 94]);
    expect(chart.getAttribute('plotStyle')['waterfall-total-indices']).toBe('0,3');
  });

  it('loads volcano and density point coordinates from CSV and JSON', () => {
    const volcano = hydrateDataNode(
      externalChart('volcano', {}, { 'point-label-field': 'gene' }),
      'x,y,gene\n-2,4.5,TP53\n1.2,2.4,EGFR',
      'volcano.csv',
      'text/csv'
    );
    expect(volcano.xValues).toEqual([-2, 1.2]);
    expect(volcano.values).toEqual([4.5, 2.4]);
    expect(volcano.labels).toEqual(['TP53', 'EGFR']);

    const density = hydrateDataNode(
      externalChart('density2d'),
      JSON.stringify([
        { x: 0.1, y: 0.8 },
        { x: 0.3, y: 0.6 }
      ]),
      'density.json',
      'application/json'
    );
    expect(density.xValues).toEqual([0.1, 0.3]);
    expect(density.values).toEqual([0.8, 0.6]);
  });

  it('hydrates a complete contour grid in sorted row-major order', () => {
    const chart = hydrateDataNode(
      externalChart('contour', { value: 'z' }),
      JSON.stringify([
        { x: 1, y: 1, z: 4 },
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 2 },
        { x: 0, y: 1, z: 3 }
      ]),
      'contour.json',
      'application/json'
    );
    expect(chart.xValues).toEqual([0, 1]);
    expect(chart.getAttribute('heatmapYValues')).toEqual([0, 1]);
    expect(chart.values).toEqual([1, 2, 3, 4]);
  });

  it('loads labelled ternary components from CSV', () => {
    const chart = hydrateDataNode(
      externalChart(
        'ternary',
        { x: 'solid', y: 'liquid', value: 'gas' },
        { 'point-label-field': 'sample' }
      ),
      'sample,solid,liquid,gas\nA,50,30,20\nB,20,60,20',
      'ternary.csv',
      'text/csv'
    );
    expect(chart.xValues).toEqual([50, 20]);
    expect(chart.getAttribute('heatmapYValues')).toEqual([30, 60]);
    expect(chart.values).toEqual([20, 20]);
    expect(chart.labels).toEqual(['A', 'B']);
  });

  it('loads efficiency numerator and denominator columns from JSON', () => {
    const chart = hydrateDataNode(
      externalChart(
        'efficiency',
        { x: 'stage', y: 'passed' },
        { 'efficiency-total-field': 'total' }
      ),
      JSON.stringify([
        { stage: 'Trigger', passed: 92, total: 100 },
        { stage: 'Selection', passed: 73, total: 90 }
      ]),
      'efficiency.json',
      'application/json'
    );
    expect(chart.labels).toEqual(['Trigger', 'Selection']);
    expect(chart.values).toEqual([92, 73]);
    expect(chart.getAttribute('plotStyle')['efficiency-total']).toBe('100,90');
  });

  it('loads a Sankey edge table from CSV', () => {
    const chart = hydrateDataNode(
      externalChart(
        'sankey',
        {},
        {
          'sankey-source-field': 'from',
          'sankey-target-field': 'to',
          'sankey-value-field': 'events'
        }
      ),
      'from,to,events\nGenerated,Selected,80\nSelected,Signal,55',
      'flow.csv',
      'text/csv'
    );
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({ name: 'Generated -> Selected', values: [80] }),
      expect.objectContaining({ name: 'Selected -> Signal', values: [55] })
    ]);
  });

  it('loads geographic points and grouped region polygons', () => {
    const points = hydrateDataNode(
      externalChart(
        'geographic',
        { x: 'longitude', y: 'latitude' },
        {
          'point-label-field': 'site'
        }
      ),
      JSON.stringify([{ site: 'Lab', longitude: -87.6, latitude: 41.8 }]),
      'sites.json',
      'application/json'
    );
    expect(points.xValues).toEqual([-87.6]);
    expect(points.values).toEqual([41.8]);
    expect(points.labels).toEqual(['Lab']);

    const regions = hydrateDataNode(
      externalChart('geographic', { x: 'lon', y: 'lat' }, { 'geo-region-field': 'region' }),
      'region,lon,lat\nNorth,0,1\nNorth,1,1\nSouth,0,0\nSouth,1,0',
      'regions.csv',
      'text/csv'
    );
    expect(regions.getAttribute('series')).toEqual([
      expect.objectContaining({ name: 'North', xValues: [0, 1], values: [1, 1] }),
      expect.objectContaining({ name: 'South', xValues: [0, 1], values: [0, 0] })
    ]);
  });

  it('loads GeoJSON points, polygons, and multipolygons', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { title: 'Detector', rate: 12 },
          geometry: { type: 'Point', coordinates: [-87.6, 41.8] }
        },
        {
          type: 'Feature',
          properties: { title: 'Region A', rate: 35 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-2, 40],
                [2, 40],
                [0, 44],
                [-2, 40]
              ]
            ]
          }
        },
        {
          type: 'Feature',
          properties: { title: 'Islands', rate: 20 },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [10, 10],
                  [11, 10],
                  [10, 11],
                  [10, 10]
                ]
              ],
              [
                [
                  [12, 12],
                  [13, 12],
                  [12, 13],
                  [12, 12]
                ]
              ]
            ]
          }
        }
      ]
    };
    const chart = hydrateDataNode(
      externalChart('geographic', {}, { 'geo-name-field': 'title', 'geo-value-field': 'rate' }),
      JSON.stringify(geojson),
      'map.geojson',
      'application/geo+json'
    );
    expect(chart.labels).toEqual(['Detector']);
    expect(chart.xValues).toEqual([-87.6]);
    expect(chart.values).toEqual([41.8]);
    expect(chart.getAttribute('geoPointValues')).toEqual([12]);
    expect(chart.getAttribute('series')).toEqual([
      expect.objectContaining({ name: 'Region A', geoValue: 35, xValues: [-2, 2, 0, -2] }),
      expect.objectContaining({ name: 'Islands 1', geoValue: 20 }),
      expect.objectContaining({ name: 'Islands 2', geoValue: 20 })
    ]);
  });

  it('reports a missing quantitative GeoJSON property instead of hiding the color scale', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { title: 'Region without value' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [0, 1],
                [0, 0]
              ]
            ]
          }
        }
      ]
    };
    expect(() =>
      hydrateDataNode(
        externalChart(
          'geographic',
          {},
          {
            'geo-name-field': 'title',
            'geo-value-field': 'event_rate'
          }
        ),
        JSON.stringify(geojson),
        'map.geojson',
        'application/geo+json'
      )
    ).toThrow('GeoJSON property "event_rate" has no usable numeric feature values');
  });
});
