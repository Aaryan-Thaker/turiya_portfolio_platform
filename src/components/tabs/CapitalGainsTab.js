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
import { formatINR } from "../components/formatters";
import { exportToCSV } from "../exportCSV";

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

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function CapitalGainsTab({ capitalGainsData }) {
  useEffect(() => {
    console.log("CapitalGainsTab Data:", capitalGainsData);
  }, [capitalGainsData]);

  const rowData = useMemo(() => {
    if (!capitalGainsData?.per_stock) return [];
    return Object.entries(capitalGainsData.per_stock).map(([ticker, info]) => {
      const stcg = toNumber(info.short_term ?? info.stcg);
      const ltcg = toNumber(info.long_term ?? info.ltcg);
      const realized = toNumber(info.realized ?? stcg + ltcg);
      const unrealized = toNumber(info.unrealized ?? 0);
      const total_gain = stcg + ltcg + unrealized;
      const trades = Array.isArray(info.realized_trades)
        ? info.realized_trades.length
        : 0;
      return { ticker, stcg, ltcg, realized, unrealized, total_gain, trades };
    });
  }, [capitalGainsData]);

  const totalRealized = useMemo(
    () => rowData.reduce((sum, r) => sum + r.realized, 0),
    [rowData]
  );
  const totalUnrealized = useMemo(
    () => rowData.reduce((sum, r) => sum + r.unrealized, 0),
    [rowData]
  );

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "ticker", sortable: true, filter: "agTextColumnFilter", resizable: true },
      {
        headerName: "STCG",
        field: "stcg",
        cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }),
        cellStyle: { textAlign: "right" },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "LTCG",
        field: "ltcg",
        cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }),
        cellStyle: { textAlign: "right" },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Realized",
        field: "realized",
        cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }),
        cellStyle: { textAlign: "right" },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Unrealized",
        field: "unrealized",
        cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }),
        cellStyle: { textAlign: "right" },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Total Gain",
        field: "total_gain",
        cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }),
        cellStyle: { textAlign: "right" },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Transactions",
        field: "trades",
        cellStyle: { textAlign: "right" },
        filter: "agNumberColumnFilter",
      },
    ],
    []
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Capital Gains</h2>

      {/* Summary Section */}
      <section style={styles.summary}>
        <SummaryItem
          label="Total Realized"
          value={formatINR(totalRealized, { showColor: true, showArrow: true })}
        />
        <SummaryItem
          label="Total Unrealized"
          value={formatINR(totalUnrealized, { showColor: true, showArrow: true })}
        />
      </section>

      {rowData.length > 0 ? (
        <>
          <div className="ag-theme-balham" style={{ width: "100%", marginBottom: 20 }}>
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

function SummaryItem({ label, value }) {
  return (
    <div style={styles.summaryItem}>
      <div>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
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
