// components/tabs/PortfolioOverviewTab.js
import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { exportToCSV } from "../exportCSV";

export default function PortfolioOverviewTab({ portfolioTableData }) {
  // format helpers
  const fmt = useMemo(() => ({
    currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
    quantity: (num) => (typeof num === "number" ? Math.round(num) : "N/A"),
    percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
  }), []);

  const columnDefs = useMemo(() => [
    { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true },
    { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true },
    { headerName: "Quantity", field: "Quantity", valueFormatter: p => fmt.quantity(p.value), sortable: true, resizable: true },
    { headerName: "Currency", field: "Currency", sortable: true, filter: true, resizable: true },
    { headerName: "Avg Cost/Share", field: "Avg Cost/Share", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "CMP", field: "CMP", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Current Value", field: "Current Value", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Total Cost", field: "Total Cost", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Gain/Loss", field: "Gain/Loss", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Gain/Loss %", field: "Gain/Loss %", valueFormatter: p => fmt.percent(p.value), resizable: true },
    { headerName: "AllocationPercent", field: "AllocationPercent", valueFormatter: p => fmt.percent(p.value), resizable: true },
    { headerName: "Investment Date", field: "Investment Date", sortable: true, filter: true, resizable: true },
    { headerName: "Exchange", field: "Exchange", sortable: true, filter: true, resizable: true },
    { headerName: "52w High", field: "52w High", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "52w Low", field: "52w Low", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Unrealized Gains", field: "Unrealized Gains", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Sector", field: "Sector", sortable: true, filter: true, resizable: true },
  ], [fmt]);

  return (
    <div>
      <h2>Portfolio Overview</h2>

      {portfolioTableData?.length > 0 ? (
        <>
          <div className="ag-theme-alpine" style={{ height: 500, width: "100%", marginBottom: 20 }}>
            <AgGridReact
              rowData={portfolioTableData}
              columnDefs={columnDefs}
              pagination={true}
              paginationPageSize={20}
              domLayout="autoHeight"
            />
          </div>

          <button
            onClick={() =>
              exportToCSV(
                "portfolio_full.csv",
                columnDefs.map(col => col.field),
                portfolioTableData
              )
            }
            style={styles.csvBtn}
          >
            Download Full Portfolio CSV
          </button>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No portfolio data available. Add transactions first.
        </div>
      )}
    </div>
  );
}

// ---- Styles ----
const styles = {
  csvBtn: {
    padding: "6px 12px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
};
