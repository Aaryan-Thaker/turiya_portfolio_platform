// components/Charts.js
import React from "react";
import Plot from "react-plotly.js";

const PALETTE = [
  "#2f6fbf", "#4fb39f", "#f6b26b", "#f08a8a", "#9a79d8",
  "#7fb3d5", "#88ccaa", "#f7c46b", "#d77fb3", "#a8a8a8",
];

function pickColors(n) {
  const colors = [];
  for (let i = 0; i < n; i++) colors.push(PALETTE[i % PALETTE.length]);
  return colors;
}

// --- Stock Allocation Pie ---
export function StockPie({ data = [], title = "Stock Allocation" }) {
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData.map((row) => Number(row["AllocationPercent"]) || 0);
  const labels = safeData.map((row) => row["Ticker"] || "");

  if (!values.some((v) => v > 0)) 
    return <div style={{ padding: 30, textAlign: "center" }}>No allocation data available.</div>;

  const colors = pickColors(labels.length);

  return (
    <div style={{ width: "100%", maxWidth: 500, marginBottom: 30 }}>
      <h3 style={{ textAlign: "center" }}>{title}</h3>
      <Plot
        data={[{
          type: "pie",
          values,
          labels,
          hole: 0.45,
          textinfo: "percent+label",
          hoverinfo: "label+percent+value",
          marker: { colors },
          sort: false,
        }]}
        layout={{ autosize: true, margin: { t: 40, l: 20, r: 20, b: 20 } }}
        useResizeHandler
        style={{ width: "100%", height: 400 }}
      />
    </div>
  );
}

// --- Sector Allocation Pie ---
export function SectorPie({ data = [], title = "Sector Allocation" }) {
  const safeData = Array.isArray(data) ? data : [];
  const sectorTotals = {};
  safeData.forEach((row) => {
    const sector = (row["Sector"] || "Other").trim() || "Other";
    const val = Number(row["Current Value"]) || 0;
    sectorTotals[sector] = (sectorTotals[sector] || 0) + val;
  });

  const labels = Object.keys(sectorTotals);
  const values = Object.values(sectorTotals);

  if (!values.some((v) => v > 0))
    return <div style={{ padding: 30, textAlign: "center" }}>No sector data available.</div>;

  const colors = pickColors(labels.length);

  return (
    <div style={{ width: "100%", maxWidth: 500, marginBottom: 30 }}>
      <h3 style={{ textAlign: "center" }}>{title}</h3>
      <Plot
        data={[{
          type: "pie",
          labels,
          values,
          hole: 0.45,
          textinfo: "label+percent",
          hoverinfo: "label+percent+value",
          marker: { colors },
          sort: false,
        }]}
        layout={{ autosize: true, margin: { t: 40, l: 20, r: 20, b: 20 } }}
        useResizeHandler
        style={{ width: "100%", height: 420 }}
      />
    </div>
  );
}

// --- Treemap ---
export function TreemapChart({ data = [], title = "Holdings Treemap" }) {
  const safeData = Array.isArray(data) ? data : [];
  const sectorMap = {};

  safeData.forEach((row) => {
    const ticker = row["Ticker"] || row["Symbol"] || "";
    const sector = (row["Sector"] || "Other").trim() || "Other";
    const val = Number(row["Current Value"]) || 0;
    if (!ticker || val <= 0) return;
    if (!sectorMap[sector]) sectorMap[sector] = [];
    sectorMap[sector].push({ ticker, value: val });
  });

  const totalValues = Object.values(sectorMap).flat().reduce((s, it) => s + it.value, 0);
  if (totalValues === 0) 
    return <div style={{ padding: 30, textAlign: "center" }}>No treemap data available.</div>;

  const labels = [];
  const parents = [];
  const values = [];

  Object.keys(sectorMap).forEach((sector) => {
    const sectorSum = sectorMap[sector].reduce((s, it) => s + it.value, 0);
    labels.push(sector);
    parents.push("");
    values.push(sectorSum);

    sectorMap[sector].forEach((item) => {
      labels.push(`${item.ticker} (${item.value >= 1000 ? `${(item.value/1000).toFixed(1)}k` : `$${item.value.toFixed(0)}`})`);
      parents.push(sector);
      values.push(item.value);
    });
  });

  return (
    <div style={{ width: "100%", maxWidth: 1100, marginBottom: 30 }}>
      <h3 style={{ textAlign: "center" }}>{title}</h3>
      <Plot
        data={[{
          type: "treemap",
          labels,
          parents,
          values,
          branchvalues: "total",
          textinfo: "label+value",
          hovertemplate: "%{label}<br>Value: %{value}<extra></extra>",
        }]}
        layout={{ autosize: true, margin: { t: 40, l: 10, r: 10, b: 10 } }}
        useResizeHandler
        style={{ width: "100%", height: 520 }}
      />
    </div>
  );
}
