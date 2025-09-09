// components/tabs/CapitalGainsTab.js
import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { exportToCSV } from "../exportCSV";

export default function CapitalGainsTab({ portfolioTableData }) {
  // format helpers
  const fmt = useMemo(() => ({
    currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
    quantity: (num) => (typeof num === "number" ? Math.round(num) : "N/A"),
    percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
  }), []);

  const columnDefs = useMemo(() => [
    { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true },
    { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true },
    { headerName: "Quantity", field: "Quantity", valueFormatter: p => fmt.quantity(p.value), resizable: true },
    { headerName: "Avg Cost/Share", field: "Avg Cost/Share", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Total Cost", field: "Total Cost", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Current Value", field: "Current Value", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Unrealized P&L", field: "Gain/Loss", valueFormatter: p => fmt.currency(p.value), resizable: true },
    { headerName: "Unrealized P&L %", field: "Gain/Loss %", valueFormatter: p => fmt.percent(p.value), resizable: true },
    { headerName: "Sector", field: "Sector", sortable: true, filter: true, resizable: true },
  ], [fmt]);

  return (
    <div>
      <h2>Capital Gains</h2>

      {portfolioTableData?.length > 0 ? (
        <>
          <div style={styles.metricsBox}>
            <h3 style={{ marginBottom: 10 }}>Performance Metrics</h3>
            <p>Total Unrealized P&L: <b>{fmt.currency(sumField(portfolioTableData, "Gain/Loss"))}</b></p>
            <p>Total Current Value: <b>{fmt.currency(sumField(portfolioTableData, "Current Value"))}</b></p>
            <p>Total Investment Cost: <b>{fmt.currency(sumField(portfolioTableData, "Total Cost"))}</b></p>
          </div>

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
                "capital_gains.csv",
                columnDefs.map(col => col.field),
                portfolioTableData
              )
            }
            style={styles.csvBtn}
          >
            Download Capital Gains CSV
          </button>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No capital gains data available.
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----
function sumField(data, field) {
  return data.reduce((sum, row) => {
    const val = Number(row[field]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
}

// ---- Styles ----
const styles = {
  metricsBox: {
    background: "#f8f8f8",
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    border: "1px solid #ddd",
  },
  csvBtn: {
    padding: "6px 12px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
};
