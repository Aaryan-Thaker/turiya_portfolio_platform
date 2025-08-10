import React from 'react';
import Plot from 'react-plotly.js';

export function StockPie({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData.map((row) => Number(row['AllocationPercent']) || 0);
  const labels = safeData.map((row) => row['Ticker'] || '');

  // if all zeros or no labels, show empty message
  const hasValues = values.some(v => v > 0) && labels.length > 0;

  return (
    <div>
      {!hasValues ? (
        <div style={{ padding: 20 }}>No allocation data available.</div>
      ) : (
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
      )}
    </div>
  );
}

export function SectorPie({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const sectorTotals = {};
  for (const row of safeData) {
    const sector = row['Sector'] || 'Other';
    const val = Number(row['Current Value']) || 0;
    sectorTotals[sector] = (sectorTotals[sector] || 0) + val;
  }

  const labels = Object.keys(sectorTotals);
  const values = Object.values(sectorTotals);
  const hasValues = values.some(v => v > 0) && labels.length > 0;

  return (
    <div>
      {!hasValues ? (
        <div style={{ padding: 20 }}>No sector data available.</div>
      ) : (
        <Plot
          data={[
            {
              type: 'pie',
              labels,
              values,
              textinfo: 'label+percent',
            },
          ]}
          layout={{ title: 'Sector Allocation' }}
          style={{ width: '100%', maxWidth: 600 }}
        />
      )}
    </div>
  );
}

export function GainBar({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const sorted = [...safeData].sort((a, b) => (Number(a['Gain/Loss']) || 0) - (Number(b['Gain/Loss']) || 0));
  const x = sorted.map((row) => Number(row['Gain/Loss']) || 0);
  const y = sorted.map((row) => row['Ticker'] || '');

  if (x.length === 0) {
    return <div style={{ padding: 20 }}>No gain/loss data available.</div>;
  }

  return (
    <Plot
      data={[
        {
          type: 'bar',
          x,
          y,
          orientation: 'h',
          marker: {
            color: x.map(val => (val >= 0 ? 'green' : 'red')),
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

export function TreemapChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData.map(row => Number(row['Current Value']) || 0);
  const labels = safeData.map(row => row['Ticker'] || '');

  if (!values.length || values.every(v => v === 0)) {
    return <div style={{ padding: 20 }}>No treemap data available.</div>;
  }

  return (
    <Plot
      data={[
        {
          type: 'treemap',
          labels: labels.map((t, i) => `${t} ($${(values[i] / 1000).toFixed(1)}k)`),
          parents: Array(labels.length).fill(''),
          values,
          textinfo: 'label+value',
        },
      ]}
      layout={{ title: 'Treemap' }}
      style={{ width: '100%', maxWidth: 1000 }}
    />
  );
}
