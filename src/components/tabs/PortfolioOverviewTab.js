import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

import { exportToCSV } from "../exportCSV";

export default function PortfolioOverviewTab({ overviewTabData }) {
  // Transform backend data if necessary
  const portfolioTableData = useMemo(() => {
    if (!overviewTabData) return [];
    return overviewTabData.map((row) => ({
      Ticker: row.Ticker,
      Name: row.Name,
      Quantity: row.Quantity,
      Currency: row.Currency,
      "Avg Cost/Share": row["Avg Cost/Share"],
      CMP: row.CMP,
      "Current Value": row["Current Value"],
      "Total Cost": row["Total Cost"],
      "Gain/Loss %": row["Gain/Loss %"],
      AllocationPercent: row.AllocationPercent,
      "Day Change (%)": row.DayChangePct,
      "Day PnL": row.DayChange,
      "Investment Date": row["Investment Date"],
      Exchange: row.Exchange,
      "52w High": row["52wHigh"],
      "52w Low": row["52wLow"],
      "Unrealized Gains": row.UnrealizedGains,
      Sector: row.Sector,
    }));
  }, [overviewTabData]);

  const fmt = useMemo(
    () => ({
      currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
      quantity: (num) => (typeof num === "number" ? Math.round(num) : "N/A"),
      percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true, width: 100 },
      { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true, flex: 1 },
      { headerName: "Quantity", field: "Quantity", valueFormatter: (p) => fmt.quantity(p.value), resizable: true, width: 120 },
      { headerName: "Currency", field: "Currency", sortable: true, filter: true, resizable: true, width: 100 },
      { headerName: "Avg Cost/Share", field: "Avg Cost/Share", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "CMP", field: "CMP", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "Total Cost", field: "Total Cost", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "Gain/Loss %", field: "Gain/Loss %", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 130 },
      { headerName: "Allocation %", field: "AllocationPercent", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 120 },
      { headerName: "Day Change (%)", field: "Day Change (%)", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 120 },
      { headerName: "Day P&L", field: "Day PnL", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "Investment Date", field: "Investment Date", sortable: true, filter: true, resizable: true, width: 130 },
      { headerName: "Exchange", field: "Exchange", sortable: true, filter: true, resizable: true, width: 100 },
      { headerName: "52w High", field: "52w High", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "52w Low", field: "52w Low", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "Unrealized Gains", field: "Unrealized Gains", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
      { headerName: "Sector", field: "Sector", sortable: true, filter: true, resizable: true, width: 120 },
    ],
    [fmt]
  );

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: 15 }}>Portfolio Overview</h2>

      {portfolioTableData.length > 0 ? (
        <>
          <div className="ag-theme-alpine" style={{ height: 550, width: "100%", marginBottom: 20 }}>
            <AgGridReact
              rowData={portfolioTableData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              pagination={true}
              paginationPageSize={20}
              animateRows={true}
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <button
              onClick={() => exportToCSV("portfolio_full.csv", columnDefs.map((col) => col.field), portfolioTableData)}
              style={styles.csvBtn}
            >
              Download Full Portfolio CSV
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No portfolio data available. Add transactions first.
        </div>
      )}
    </div>
  );
}

const styles = {
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
