import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule
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

// --- helpers ---
function getFirst(obj = {}, keys = []) {
  for (const k of keys) {
    if (obj == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
  }
  return undefined;
}
function toNumber(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function CapitalGainsTab({ capitalGainsData }) {
  const fmt = useMemo(() => ({
    currency: (num) => (typeof num === "number" && !isNaN(num) ? num.toFixed(2) : "N/A"),
    percent: (num) => (typeof num === "number" && !isNaN(num) ? num.toFixed(2) + "%" : "N/A"),
  }), []);

  // normalize per_stock data
  const rowData = useMemo(() => {
    const perStock = capitalGainsData?.per_stock || {};
    return Object.entries(perStock).map(([ticker, info]) => {
      const STCG = toNumber(getFirst(info, ["STCG", "stcg", "short_term", "shortTerm"])) || 0;
      const LTCG = toNumber(getFirst(info, ["LTCG", "ltcg", "long_term", "longTerm"])) || 0;
      const total_gain = STCG + LTCG;
      const IRRraw = toNumber(getFirst(info, ["IRR", "irr"])) || 0;
      const IRR = Math.abs(IRRraw) < 1 ? IRRraw * 100 : IRRraw;
      const detailsCount = Array.isArray(info?.details) ? info.details.length : 0;
      return { ticker, stcg: STCG, ltcg: LTCG, total_gain, irr: IRR, details_count: detailsCount };
    });
  }, [capitalGainsData]);

  const columnDefs = useMemo(() => [
    { headerName: "Ticker", field: "ticker", sortable: true, filter: "agTextColumnFilter", resizable: true },
    { headerName: "STCG", field: "stcg", valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "LTCG", field: "ltcg", valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "Total Gain", field: "total_gain", valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "IRR", field: "irr", valueFormatter: (p) => fmt.percent(p.value) },
    { headerName: "Transactions", field: "details_count" },
  ], [fmt]);

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Capital Gains</h2>

      {rowData.length > 0 ? (
        <>
          <div className="ag-theme-alpine" style={{ height: 400, width: "100%", marginBottom: 20 }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100 }}
              pagination
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

const styles = {
  container: { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto", fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12, borderBottom: "1px solid #ccc", paddingBottom: 4 },
  csvBtn: { padding: "8px 16px", background: "#0070f3", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 },
};
