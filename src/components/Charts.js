import React from 'react';
import Plot from 'react-plotly.js';

export function StockPie({ data }) {
  const values = data.map((row) => row['AllocationPercent']);
  const labels = data.map((row) => row['Ticker']);

  return (
    <Plot
      data={[
        {
          type: 'pie',
          values,
          labels,
          textinfo: 'label+percent',
          hole: 0,
        },
      ]}
      layout={{ title: 'Stock Allocation' }}
      style={{ width: '100%', maxWidth: 600 }}
    />
  );
}

export function SectorPie({ data }) {
  const sectorTotals = {};
  for (const row of data) {
    const sector = row['Sector'] || 'Other';
    const val = row['Current Value'] || 0;
    sectorTotals[sector] = (sectorTotals[sector] || 0) + val;
  }

  return (
    <Plot
      data={[
        {
          type: 'pie',
          labels: Object.keys(sectorTotals),
          values: Object.values(sectorTotals),
          textinfo: 'label+percent',
        },
      ]}
      layout={{ title: 'Sector Allocation' }}
      style={{ width: '100%', maxWidth: 600 }}
    />
  );
}

export function GainBar({ data }) {
  const sorted = [...data].sort((a, b) => a['Gain/Loss'] - b['Gain/Loss']);
  return (
    <Plot
      data={[
        {
          type: 'bar',
          x: sorted.map((row) => row['Gain/Loss']),
          y: sorted.map((row) => row['Ticker']),
          orientation: 'h',
          marker: {
            color: sorted.map((row) =>
              row['Gain/Loss'] >= 0 ? 'green' : 'red'
            ),
          },
        },
      ]}
      layout={{
        title: 'Gain/Loss',
        yaxis: { autorange: 'reversed' },
      }}
      style={{ width: '100%', maxWidth: 800 }}
    />
  );
}

export function TreemapChart({ data }) {
  return (
    <Plot
      data={[
        {
          type: 'treemap',
          labels: data.map(
            (row) =>
              `${row['Ticker']} ($${(row['Current Value'] / 1000).toFixed(1)}k)`
          ),
          parents: Array(data.length).fill(''),
          values: data.map((row) => row['Current Value']),
          textinfo: 'label+value',
        },
      ]}
      layout={{ title: 'Treemap' }}
      style={{ width: '100%', maxWidth: 1000 }}
    />
  );
}
