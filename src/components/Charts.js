// components/Charts.js
import React from "react";
import Plot from "react-plotly.js";

/**
 * Helper: gentle palette inspired by modern analytics dashboards.
 * You can expand this if you have more categories.
 */
const PALETTE = [
  "#2f6fbf",
  "#4fb39f",
  "#f6b26b",
  "#f08a8a",
  "#9a79d8",
  "#7fb3d5",
  "#88ccaa",
  "#f7c46b",
  "#d77fb3",
  "#a8a8a8",
];

function pickColors(n) {
  // repeat palette if needed
  const colors = [];
  for (let i = 0; i < n; i++) colors.push(PALETTE[i % PALETTE.length]);
  return colors;
}

/**
 * StockPie - donut showing allocation per ticker.
 * Expects each row to have:
 *  - 'AllocationPercent' (or numeric-like)
 *  - 'Ticker' (string)
 */
export function StockPie({ data = [], title = "Stock Allocation" }) {
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData.map((row) => Number(row["AllocationPercent"]) || 0);
  const labels = safeData.map((row) => row["Ticker"] || "");

  const hasValues = values.some((v) => v > 0) && labels.length > 0;

  if (!hasValues) {
    return <div style={{ padding: 20 }}>No allocation data available.</div>;
  }

  const colors = pickColors(labels.length);

  return (
    <div style={{ width: "100%", maxWidth: 700 }}>
      <Plot
        data={[
          {
            type: "pie",
            values,
            labels,
            hole: 0.45,
            textinfo: "percent+label",
            hoverinfo: "label+percent+value",
            marker: { colors },
            sort: false,
          },
        ]}
        layout={{
          title,
          autosize: true,
          margin: { t: 40, l: 20, r: 20, b: 20 },
        }}
        useResizeHandler
        style={{ width: "100%", height: 400 }}
      />
    </div>
  );
}

/**
 * SectorPie - donut aggregated by Sector using 'Current Value'.
 * Expects each row to have:
 *  - 'Sector' (string)
 *  - 'Current Value' (numeric-like)
 */
export function SectorPie({ data = [], title = "Sector Allocation" }) {
  const safeData = Array.isArray(data) ? data : [];
  const sectorTotals = {};

  for (const row of safeData) {
    const sector = (row["Sector"] || "Other").trim() || "Other";
    const val = Number(row["Current Value"]) || 0;
    sectorTotals[sector] = (sectorTotals[sector] || 0) + val;
  }

  const labels = Object.keys(sectorTotals);
  const values = Object.values(sectorTotals);
  const hasValues = values.some((v) => v > 0) && labels.length > 0;

  if (!hasValues) {
    return <div style={{ padding: 20 }}>No sector data available.</div>;
  }

  const colors = pickColors(labels.length);

  return (
    <div style={{ width: "100%", maxWidth: 700 }}>
      <Plot
        data={[
          {
            type: "pie",
            labels,
            values,
            hole: 0.45,
            textinfo: "label+percent",
            hoverinfo: "label+percent+value",
            marker: { colors },
            sort: false,
          },
        ]}
        layout={{
          title,
          autosize: true,
          margin: { t: 40, l: 20, r: 20, b: 20 },
        }}
        useResizeHandler
        style={{ width: "100%", height: 420 }}
      />
    </div>
  );
}

/**
 * TreemapChart - treemap grouped by sector (preferred).
 * If sector information exists, it creates parent sector nodes and child ticker nodes.
 * Expects:
 *  - 'Ticker' (string)
 *  - 'Sector' (string) optional
 *  - 'Current Value' numeric-like
 *
 * The treemap labels include small value suffix (k) for readability.
 */
export function TreemapChart({ data = [], title = "Holdings Treemap" }) {
  const safeData = Array.isArray(data) ? data : [];

  // Build mapping: sector -> list of {ticker, value}
  const sectorMap = {};
  for (const row of safeData) {
    const ticker = row["Ticker"] || row["Symbol"] || "";
    const sector = (row["Sector"] || "Other").trim() || "Other";
    const val = Number(row["Current Value"]) || 0;
    // skip zero-valued holdings
    if (!ticker || val <= 0) continue;
    if (!sectorMap[sector]) sectorMap[sector] = [];
    sectorMap[sector].push({ ticker, value: val });
  }

  // If no valid values, show placeholder
  const totalValues = Object.values(sectorMap).flat().reduce((s, it) => s + it.value, 0);
  if (totalValues === 0) {
    return <div style={{ padding: 20 }}>No treemap data available.</div>;
  }

  // Build plotly treemap arrays: labels, parents, values
  const labels = [];
  const parents = [];
  const values = [];

  // First add sector parent nodes (parent is empty string)
  for (const sector of Object.keys(sectorMap)) {
    const sectorSum = sectorMap[sector].reduce((s, it) => s + it.value, 0);
    labels.push(sector);
    parents.push("");
    values.push(sectorSum);
  }

  // Then add tickers under their sector
  for (const sector of Object.keys(sectorMap)) {
    for (const item of sectorMap[sector]) {
      labels.push(`${item.ticker} (${(item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : `$${item.value.toFixed(0)}`)})`);
      parents.push(sector);
      values.push(item.value);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 1100 }}>
      <Plot
        data={[
          {
            type: "treemap",
            labels,
            parents,
            values,
            branchvalues: "total",
            textinfo: "label+value",
            hovertemplate: "%{label}<br>Value: %{value}<extra></extra>",
          },
        ]}
        layout={{
          title,
          autosize: true,
          margin: { t: 40, l: 10, r: 10, b: 10 },
        }}
        useResizeHandler
        style={{ width: "100%", height: 520 }}
      />
    </div>
  );
}
