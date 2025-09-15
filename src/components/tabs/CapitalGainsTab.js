// components/tabs/CapitalGainsTab.js
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
} from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
]);

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

import { exportToCSV } from "../exportCSV";

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function CapitalGainsTab({ capitalGainsData }) {
  const fmt = useMemo(
    () => ({
      currency: (num) =>
        typeof num === "number" && !isNaN(num)
          ? num.toFixed(2)
          : "N/A",
      percent: (num) =>
        typeof num === "number" && !isNaN(num)
          ? num.toFixed(2) + "%"
          : "N/A",
    }),
    []
  );

  // Normalize per_stock → rows for AG Grid
  const rowData = useMemo(() => {
    if (!capitalGainsData?.per_stock) return [];
    return Object.entries(capitalGainsData.per_stock).map(([ticker, info]) => {
      info = info || {};
      const stcg = toNumber(info.short_term ?? info.stcg ?? 0);
      const ltcg = toNumber(info.long_term ?? info.ltcg ?? 0);
      const realized = toNumber(info.realized ?? 0);
      const unrealized = toNumber(info.unrealized ?? 0);
      const total_gain = stcg + ltcg + unrealized || realized;

      return {
        ticker,
        stcg,
        ltcg,
        realized,
        unrealized,
        total_gain,
        trades: Array.isArray(info.realized_trades)
          ? info.realized_trades.length
          : 0,
      };
    });
  }, [capitalGainsData]);

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "ticker", sortable: true, filter: "agTextColumnFilter", resizable: true },
      { headerName: "STCG", field: "stcg", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "LTCG", field: "ltcg", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "Realized", field: "realized", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "Unrealized", field: "unrealized", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "Total Gain", field: "total_gain", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "Transactions", field: "trades", filter: "agNumberColumnFilter" },
    ],
    [fmt]
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Capital Gains</h2>

      {/* Summary Section */}
      <section style={styles.summary}>
        <SummaryItem
          label="Total Realized"
          value={fmt.currency(toNumber(capitalGainsData?.total_realized))}
          positive={toNumber(capitalGainsData?.total_realized) >= 0}
        />
        <SummaryItem
          label="Total Unrealized"
          value={fmt.currency(toNumber(capitalGainsData?.total_unrealized))}
          positive={toNumber(capitalGainsData?.total_unrealized) >= 0}
        />
      </section>

      {rowData.length > 0 ? (
        <>
          <div className="ag-theme-alpine" style={{ height: 400, width: "100%", marginBottom: 20 }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                flex: 1,
                minWidth: 100,
              }}
              pagination={true}
              paginationPageSize={10}
              domLayout="autoHeight"
            />
          </div>

          <button
            onClick={() =>
              exportToCSV(
                "capital_gains.csv",
                columnDefs.map((c) => c.field),
                rowData
              )
            }
            style={styles.csvBtn}
          >
            Download CSV
          </button>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No capital gains data available. Add some transactions first.
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, positive }) {
  return (
    <div style={styles.summaryItem}>
      <div>{label}</div>
      <div
        style={{
          ...styles.summaryValue,
          color: positive ? "#006400" : positive === false ? "#8B0000" : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    maxWidth: 1200,
    margin: "0 auto",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
    borderBottom: "1px solid #ccc",
    paddingBottom: 4,
  },
  summary: {
    display: "flex",
    gap: 60,
    marginBottom: 20,
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
  },
  summaryValue: {
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 4,
  },
  csvBtn: {
    padding: "8px 16px",
    background: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
  },
};
