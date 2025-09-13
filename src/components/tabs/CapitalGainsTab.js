// components/tabs/CapitalGainsTab.js
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

import { exportToCSV } from "../exportCSV";

export default function CapitalGainsTab({ currentUser, capitalGainsData }) {
  // Transform perStock object into an array
  const portfolioTableData = useMemo(() => {
    if (!capitalGainsData?.perStock) return [];
    return Object.entries(capitalGainsData.perStock).map(([ticker, data]) => ({
      Ticker: ticker,
      Name: data.Name || ticker,
      Quantity: data.Quantity || 0,
      "Avg Cost/Share": data.AvgCost || 0,
      "Total Cost": data.TotalCost || 0,
      "Current Value": data.CurrentValue || 0,
      "Gain/Loss": data.UnrealizedGain || 0,
      "Gain/Loss %": data.UnrealizedGainPct || 0,
      "Realized Gains": data.RealizedGain || 0,
      Sector: data.Sector || "N/A",
    }));
  }, [capitalGainsData]);

  const fmt = useMemo(() => ({
    currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
    quantity: (num) => (typeof num === "number" ? Math.round(num) : "N/A"),
    percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
  }), []);

  const columnDefs = useMemo(() => [
    { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true },
    { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true, flex: 1 },
    { headerName: "Quantity", field: "Quantity", valueFormatter: (p) => fmt.quantity(p.value), resizable: true, width: 120 },
    { headerName: "Avg Cost/Share", field: "Avg Cost/Share", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Total Cost", field: "Total Cost", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Unrealized P&L", field: "Gain/Loss", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Unrealized P&L %", field: "Gain/Loss %", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 130 },
    { headerName: "Realized Gains", field: "Realized Gains", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Sector", field: "Sector", sortable: true, filter: true, resizable: true, width: 120 },
  ], [fmt]);

  function sumField(data, field) {
    return data.reduce((sum, row) => {
      const val = Number(row[field]);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }

  const totalUnrealized = sumField(portfolioTableData, "Gain/Loss");
  const totalRealized = sumField(portfolioTableData, "Realized Gains");
  const totalCurrentValue = sumField(portfolioTableData, "Current Value");
  const totalCost = sumField(portfolioTableData, "Total Cost");

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: 15 }}>Capital Gains</h2>

      {portfolioTableData?.length > 0 ? (
        <>
          <div style={styles.metricsBox}>
            <h3 style={{ marginBottom: 10 }}>Performance Metrics</h3>
            <p>Total Unrealized P&L: <b>{fmt.currency(totalUnrealized)}</b></p>
            <p>Total Realized Gains: <b>{fmt.currency(totalRealized)}</b></p>
            <p>Total Current Value: <b>{fmt.currency(totalCurrentValue)}</b></p>
            <p>Total Investment Cost: <b>{fmt.currency(totalCost)}</b></p>
          </div>

          <div className="ag-theme-alpine" style={{ height: 500, width: "100%", marginBottom: 15 }}>
            <AgGridReact
              rowData={portfolioTableData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              pagination
              paginationPageSize={20}
              animateRows
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <button
              onClick={() =>
                exportToCSV(
                  "capital_gains.csv",
                  columnDefs.map((col) => col.field),
                  portfolioTableData
                )
              }
              style={styles.csvBtn}
            >
              Download Capital Gains CSV
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No capital gains data available.
        </div>
      )}
    </div>
  );
}

const styles = {
  metricsBox: {
    background: "#f8f8f8",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    border: "1px solid #ddd",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  },
  csvBtn: {
    padding: "8px 16px",
    background: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.3s ease",
  },
};
