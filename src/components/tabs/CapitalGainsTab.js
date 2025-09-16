import React, { useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry, themeBalham } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
} from "ag-grid-community";

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
  // Debug: log the incoming data
  useEffect(() => {
    console.log("=== CapitalGainsTab Debug ===");
    console.log("capitalGainsData:", capitalGainsData);
    console.log("per_stock exists:", capitalGainsData?.per_stock !== undefined);
  }, [capitalGainsData]);

  const fmt = useMemo(
    () => ({
      currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
      percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
    }),
    []
  );

  // Normalize per_stock → rows for AG Grid
  const rowData = useMemo(() => {
    if (!capitalGainsData?.per_stock) {
      console.warn("No per_stock data found!");
      return [];
    }

    const rows = Object.entries(capitalGainsData.per_stock).map(
      ([ticker, info]) => {
        info = info || {};
        const stcg = toNumber(info.short_term ?? info.stcg);
        const ltcg = toNumber(info.long_term ?? info.ltcg);
        const realized = toNumber(info.realized ?? stcg + ltcg);
        const unrealized = toNumber(info.unrealized ?? 0);
        const total_gain = stcg + ltcg + unrealized;

        const trades = Array.isArray(info.realized_trades)
          ? info.realized_trades.length
          : 0;

        const row = { ticker, stcg, ltcg, realized, unrealized, total_gain, trades };
        console.log("Row data for", ticker, ":", row);
        return row;
      }
    );

    console.log("All rowData computed:", rows);
    return rows;
  }, [capitalGainsData]);

  const totalRealized = useMemo(() => {
    const total = rowData.reduce((sum, r) => sum + r.realized, 0);
    console.log("Total Realized:", total);
    return total;
  }, [rowData]);

  const totalUnrealized = useMemo(() => {
    const total = rowData.reduce((sum, r) => sum + r.unrealized, 0);
    console.log("Total Unrealized:", total);
    return total;
  }, [rowData]);

  const columnDefs = useMemo(
    () => [
      {
        headerName: "Ticker",
        field: "ticker",
        sortable: true,
        filter: "agTextColumnFilter",
        resizable: true,
      },
      {
        headerName: "STCG",
        field: "stcg",
        valueFormatter: (p) => fmt.currency(p.value),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "LTCG",
        field: "ltcg",
        valueFormatter: (p) => fmt.currency(p.value),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Realized",
        field: "realized",
        valueFormatter: (p) => fmt.currency(p.value),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Unrealized",
        field: "unrealized",
        valueFormatter: (p) => fmt.currency(p.value),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Total Gain",
        field: "total_gain",
        valueFormatter: (p) => fmt.currency(p.value),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Transactions",
        field: "trades",
        filter: "agNumberColumnFilter",
        resizable: true,
      },
    ],
    [fmt]
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Capital Gains</h2>

      {/* Summary */}
      <section style={styles.summary}>
        <SummaryItem
          label="Total Realized"
          value={fmt.currency(totalRealized)}
          positive={totalRealized >= 0}
        />
        <SummaryItem
          label="Total Unrealized"
          value={fmt.currency(totalUnrealized)}
          positive={totalUnrealized >= 0}
        />
      </section>

      {rowData.length > 0 ? (
        <>
          <div
            className="ag-theme-balham"
            style={{ width: "100%", marginBottom: 20 }}
          >
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
              pagination
              paginationPageSize={10}
              domLayout="autoHeight"
              animateRows
              theme={themeBalham}
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
          color: positive ? "#006400" : "#8B0000",
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
  summary: { display: "flex", gap: 60, marginBottom: 20 },
  summaryItem: { display: "flex", flexDirection: "column" },
  summaryValue: { fontWeight: "bold", fontSize: 18, marginTop: 4 },
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
