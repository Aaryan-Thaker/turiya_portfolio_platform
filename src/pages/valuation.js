// pages/valuation.js
import React, { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";

// AG Grid modules
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
} from "ag-grid-community";

// Register modules
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

// Helper functions
const toNumber = (v) => {
  if (v == null) return NaN;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? NaN : n;
};

const compactNumber = (value) => {
  const num = toNumber(value);
  if (isNaN(num)) return "N/A";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
};

export default function ValuationPage({ currentUser, tickers = [], valuationData = {}, error }) {
  const gridRef = useRef(null);

  const fmt = useMemo(() => ({
    currency: (value, compact = false) => {
      const num = toNumber(value);
      if (value == null || value === "N/A" || isNaN(num)) return "N/A";
      if (compact) return "₹" + compactNumber(num);
      return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    },
    percent: (value) => {
      if (value == null || value === "N/A" || isNaN(toNumber(value))) return "N/A";
      return toNumber(value).toFixed(2) + "%";
    },
    ratio: (value) =>
      value == null || value === "N/A" || isNaN(toNumber(value)) ? "N/A" : toNumber(value).toFixed(2) + "x",
  }), []);

  // Column definitions
  const columnDefs = useMemo(() => [
    { headerName: "Stock", field: "stock", pinned: "left", sortable: true, filter: "agTextColumnFilter", flex: 2, minWidth: 150 },
    { headerName: "Price", field: "price", pinned: "left", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "Value", field: "value", pinned: "left", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
    { headerName: "Alloc %", field: "alloc", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "52w High", field: "high52", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "52w Low", field: "low52", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "Mkt Cap", field: "mktCap", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
    { headerName: "P/E (TTM)", field: "peTTM", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "P/E (Fwd)", field: "peFwd", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "PEG", field: "peg", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "P/S", field: "ps", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "P/B", field: "pb", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "EV/Rev", field: "evRev", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "EV/EBITDA", field: "evEbitda", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "Profit Margin", field: "margin", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "ROA", field: "roa", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "ROE", field: "roe", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "Revenue", field: "revenue", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
    { headerName: "Net Income", field: "netIncome", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
    { headerName: "EPS", field: "eps", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "Cash", field: "cash", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
    { headerName: "Debt/Eq", field: "debtEq", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 100 },
    { headerName: "FCF", field: "fcf", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
  ], []);

  // Row data
  const rowData = useMemo(() => tickers.map(symbol => {
    const v = valuationData[symbol] || {};
    return {
      stock: `${symbol}`,
      price: fmt.currency(v.CurrentPrice),
      value: fmt.currency(v.CurrentValue, true),
      alloc: fmt.percent(v.AllocationPercent),
      high52: fmt.currency(v['52w_high']),
      low52: fmt.currency(v['52w_low']),
      mktCap: fmt.currency(v.marketCap, true),
      peTTM: fmt.ratio(v.trailingPE),
      peFwd: fmt.ratio(v.forwardPE),
      peg: fmt.ratio(v.pegRatio),
      ps: fmt.ratio(v.priceToSalesTrailing12Months),
      pb: fmt.ratio(v.priceToBook),
      evRev: fmt.ratio(v.enterpriseToRevenue),
      evEbitda: fmt.ratio(v.enterpriseToEbitda),
      margin: fmt.percent(v.profitMargins),
      roa: fmt.percent(v.returnOnAssets),
      roe: fmt.percent(v.returnOnEquity),
      revenue: fmt.currency(v.totalRevenue, true),
      netIncome: fmt.currency(v.netIncomeToCommon, true),
      eps: v.trailingEps ? toNumber(v.trailingEps).toFixed(2) : "N/A",
      cash: fmt.currency(v.totalCash, true),
      debtEq: fmt.ratio(v.debtToEquity),
      fcf: fmt.currency(v.freeCashflow, true),
    };
  }), [tickers, valuationData, fmt]);

  const handleExportCSV = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv();
  }, []);

  return (
    <div style={{ fontFamily: "Arial", maxWidth: 1400, margin: "0 auto", padding: 20 }}>
      <Nav user={currentUser} />
      <h1>Valuation Dashboard</h1>
      {tickers.length === 0 ? (
        <p style={{ fontStyle: "italic", color: "#666" }}>Start by adding Transactions in the Transactions page.</p>
      ) : (
        <>
          <div className="ag-theme-alpine" style={{ width: "100%", height: 600 }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
                minWidth: 100,
                flex: 1,
              }}
              domLayout="autoHeight"
              pagination
              paginationPageSize={20}
              onGridReady={(params) => params.api.sizeColumnsToFit()} // auto-adjust on load
            />
          </div>
          <button
            onClick={handleExportCSV}
            style={{
              marginTop: 20,
              padding: "10px 15px",
              borderRadius: 4,
              background: "#0070f3",
              color: "#fff",
              border: "none",
              cursor: "pointer"
            }}
          >
            Download Valuation Data (CSV)
          </button>
        </>
      )}
    </div>
  );
}

// ---- Server-side Props ----
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) return { redirect: { destination: "/auth/signin", permanent: false } };

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;

  let data = {};
  try {
    const res = await fetch(`${backendBase}/api/valuation`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return { redirect: { destination: "/auth/signin", permanent: false } };
    data = await res.json();
  } catch (err) {
    data = { error: err.message };
  }

  return {
    props: {
      currentUser: session?.user || {},
      tickers: data.tickers || [],
      valuationData: data.valuationData || {},
      error: data.error || null,
    },
  };
}
