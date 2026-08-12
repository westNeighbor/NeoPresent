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
