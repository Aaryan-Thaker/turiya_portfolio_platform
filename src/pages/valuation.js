// pages/valuation.js
import React, { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";
import { ModuleRegistry } from "ag-grid-community";

// Register required AG Grid community modules
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  MenuModule,
  NumberFilterModule,
  TextFilterModule,
  DateFilterModule
} from "ag-grid-community";

// Register all community modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  MenuModule,
  NumberFilterModule,
  TextFilterModule,
  DateFilterModule
]);

// Import AG Grid styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Dynamically import AgGridReact to avoid SSR issues
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

export default function ValuationPage({ currentUser, tickers = [], valuationData = {}, error }) {
  const gridRef = useRef();

  // ---- Format helpers ----
  const fmt = useMemo(() => ({
    currency: (value, currency = "USD") =>
      value == null || value === "N/A" || isNaN(value)
        ? "N/A"
        : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value),
    percent: (value) => {
      if (value == null || value === "N/A" || isNaN(value)) return "N/A";
      return (value * 100).toFixed(2) + "%";
    },
    ratio: (value) => value == null || value === "N/A" || isNaN(value) ? "N/A" : value.toFixed(2) + "x",
  }), []);

  // ---- Column definitions ----
  const columnDefs = useMemo(() => [
    { 
      headerName: "Stock", 
      field: "stock", 
      pinned: "left", 
      sortable: true, 
      filter: "agTextColumnFilter", 
      flex: 2, 
      minWidth: 150 
    },
    { 
      headerName: "Price", 
      field: "price", 
      sortable: true, 
      filter: "agNumberColumnFilter", 
      flex: 1, 
      minWidth: 120 
    },
    { 
      headerName: "Value", 
      field: "value", 
      sortable: true, 
      filter: "agNumberColumnFilter", 
      flex: 1, 
      minWidth: 140 
    },
    { 
      headerName: "Alloc %", 
      field: "alloc", 
      sortable: true, 
      filter: "agNumberColumnFilter", 
      flex: 1, 
      minWidth: 120 
    },
    { 
      headerName: "52w High", 
      field: "high52", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 120 
    },
    { 
      headerName: "52w Low", 
      field: "low52", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 120 
    },
    { 
      headerName: "Mkt Cap", 
      field: "mktCap", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 140 
    },
    { 
      headerName: "P/E (TTM)", 
      field: "peTTM", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "P/E (Fwd)", 
      field: "peFwd", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "PEG", 
      field: "peg", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "P/S", 
      field: "ps", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "P/B", 
      field: "pb", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "EV/Rev", 
      field: "evRev", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "EV/EBITDA", 
      field: "evEbitda", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 120 
    },
    { 
      headerName: "Profit Margin", 
      field: "margin", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 120 
    },
    { 
      headerName: "ROA", 
      field: "roa", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "ROE", 
      field: "roe", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "Revenue", 
      field: "revenue", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 140 
    },
    { 
      headerName: "Net Income", 
      field: "netIncome", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 140 
    },
    { 
      headerName: "EPS", 
      field: "eps", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "Cash", 
      field: "cash", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 140 
    },
    { 
      headerName: "Debt/Eq", 
      field: "debtEq", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 100 
    },
    { 
      headerName: "FCF", 
      field: "fcf", 
      sortable: true, 
      filter: "agNumberColumnFilter",
      flex: 1, 
      minWidth: 140 
    },
  ], []);

  // ---- Row data ----
  const rowData = useMemo(() =>
    tickers.map(symbol => {
      const v = valuationData[symbol] || {};
      const c = v.Currency || "USD";
      return {
        stock: `${symbol} (${c})`,
        price: fmt.currency(v.CurrentPrice, c),
        value: fmt.currency(v.CurrentValue, c),
        alloc: fmt.percent(v.AllocationPercent),
        high52: fmt.currency(v["52wHigh"], c),
        low52: fmt.currency(v["52wLow"], c),
        mktCap: fmt.currency(v.MarketCap, c),
        peTTM: fmt.ratio(v.TrailingPE),
        peFwd: fmt.ratio(v.ForwardPE),
        peg: fmt.ratio(v.PEGRatio),
        ps: fmt.ratio(v.PriceToSales),
        pb: fmt.ratio(v.PriceToBook),
        evRev: fmt.ratio(v["EV/Revenue"] ?? v["EV/Rev"]),
        evEbitda: fmt.ratio(v["EV/EBITDA"]),
        margin: fmt.percent(v.ProfitMargin),
        roa: fmt.percent(v.ROA),
        roe: fmt.percent(v.ROE),
        revenue: fmt.currency(v.Revenue, c),
        netIncome: fmt.currency(v.NetIncome, c),
        eps: fmt.currency(v.EPS, c),
        cash: fmt.currency(v.TotalCash, c),
        debtEq: fmt.ratio(v.DebtEquity),
        fcf: fmt.currency(v.FreeCashFlow, c),
      };
    }), [tickers, valuationData, fmt]
  );

  // ---- Export CSV ----
  const handleExportCSV = useCallback(() => {
    if (gridRef.current) gridRef.current.api.exportDataAsCsv();
  }, []);

  if (error) {
    return <div style={{ padding: 20, color: "red" }}>Error loading valuation data: {error}</div>;
  }

  return (
    <div style={styles.body}>
      <Nav user={currentUser} />

      <h2>Valuation Dashboard</h2>

      {!tickers.length ? (
        <p style={{ fontStyle: "italic", color: "#666" }}>
          Start by adding Transactions in the Transactions page.
        </p>
      ) : (
        <>
          <div className="ag-theme-alpine" style={styles.gridContainer}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{ 
                resizable: true, 
                sortable: true, 
                filter: true, 
                flex: 1,
                minWidth: 100
              }}
              pagination={true}
              paginationPageSize={20}
              domLayout="autoHeight"
            />
          </div>

          <button onClick={handleExportCSV} style={styles.downloadBtn}>
            Download Valuation Data (CSV)
          </button>
        </>
      )}

      <footer style={styles.footer}>
        <p>
          This website is a non-commercial project and is intended for educational purposes.
          Financial data is retrieved via Yahoo Finance API (yFinance) and provided &quot;as is&quot;.
        </p>
      </footer>
    </div>
  );
}

const styles = {
  body: { 
    fontFamily: "Arial, sans-serif", 
    maxWidth: 1400, 
    margin: "0 auto", 
    padding: 20, 
    fontSize: 13 
  },
  gridContainer: {
    height: 600,
    width: "100%",
  },
  footer: { 
    marginTop: 40, 
    padding: 20, 
    backgroundColor: "#f8f8f8", 
    borderTop: "1px solid #eee", 
    fontSize: 11, 
    color: "#666" 
  },
  downloadBtn: { 
    marginTop: 20, 
    background: "#0070f3", 
    color: "#fff", 
    border: "none", 
    padding: "10px 15px", 
    borderRadius: 4, 
    cursor: "pointer", 
    fontSize: 14 
  },
};

// ---- Server-side Props ----
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) {
    return { redirect: { destination: "/auth/signin", permanent: false } };
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;
  const backendUrl = `${backendBase}/api/valuation`;

  let data = {};
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return { redirect: { destination: "/auth/signin", permanent: false } };
    data = await res.json().catch(() => ({}));
  } catch (err) {
    console.error("Error fetching valuation data:", err);
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