// pages/valuation.js
import React, { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";
import { ModuleRegistry } from "ag-grid-community";


// Register only the essential AG Grid community modules
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
  themeBalham 
} from "ag-grid-community";

// Register only the essential modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
  
]);

// Import AG Grid styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Dynamically import AgGridReact to avoid SSR issues
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }

);

// Helper: pick first available key from object
const pick = (obj, keys) => {
  if (!obj) return null;
  for (let k of keys) {
    if (k in obj && obj[k] !== null && obj[k] !== undefined) return obj[k];
  }
  return null;
};

// Helper: safe number
const toNumber = (v) => {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? NaN : n;
};

export default function ValuationPage({ currentUser, tickers = [], valuationData = {}, error }) {
  const gridRef = useRef();

  // ---- Format helpers ----
  const fmt = useMemo(() => ({
    currency: (value, currency = "USD") =>
      value == null || value === "N/A" || isNaN(toNumber(value))
        ? "N/A"
        : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(toNumber(value)),
    percent: (value) => {
      if (value == null || value === "N/A" || isNaN(toNumber(value))) return "N/A";
      return (toNumber(value) * 100).toFixed(2) + "%";
    },
    ratio: (value) => (value == null || value === "N/A" || isNaN(toNumber(value)) ? "N/A" : toNumber(value).toFixed(2) + "x"),
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

      // robustly pick currency
      const c = pick(v, ["Currency", "currency", "CurrencyCode"]) || "USD";

      // price & values
      const price = pick(v, ["CurrentPrice", "currentPrice", "price", "Current_Price"]);
      const value = pick(v, ["CurrentValue", "currentValue", "Current_Value", "Current Val", "CurrentVal"]);
      const alloc = pick(v, ["AllocationPercent", "allocationPercent", "alloc", "Allocation"]);

      // 52w
      const high52 = pick(v, ["52w_high", "52wHigh", "52_week_high", "fiftyTwoWeekHigh", "fifty_two_week_high"]);
      const low52 = pick(v, ["52w_low", "52wLow", "52_week_low", "fiftyTwoWeekLow", "fifty_two_week_low"]);

      // market caps & ratios
      const mktCap = pick(v, ["marketCap", "MarketCap", "market_cap"]);
      const peTTM = pick(v, ["trailingPE", "TrailingPE", "ttmPE", "Trailing_P/E"]);
      const peFwd = pick(v, ["forwardPE", "ForwardPE", "fwdPE"]);
      const peg = pick(v, ["pegRatio", "PEG", "peg"]);
      const ps = pick(v, ["priceToSalesTrailing12Months", "priceToSales", "ps", "PriceToSales"]);
      const pb = pick(v, ["priceToBook", "pb", "PriceToBook"]);
      const evRev = pick(v, ["enterpriseToRevenue", "EV/Revenue", "ev_to_revenue"]);
      const evEbitda = pick(v, ["enterpriseToEbitda", "EV/EBITDA", "ev_to_ebitda"]);

      const margin = pick(v, ["profitMargins", "ProfitMargin", "profit_margin"]);
      const roa = pick(v, ["returnOnAssets", "ROA"]);
      const roe = pick(v, ["returnOnEquity", "ROE"]);

      const revenue = pick(v, ["totalRevenue", "Revenue", "total_revenue"]);
      const netIncome = pick(v, ["netIncomeToCommon", "NetIncome", "netIncome"]);
      const eps = pick(v, ["trailingEps", "EPS", "eps"]);

      const cash = pick(v, ["totalCash", "TotalCash", "cash"]);
      const debtEq = pick(v, ["debtToEquity", "debtEq", "DebtEquity"]);
      const fcf = pick(v, ["freeCashflow", "FreeCashFlow", "freeCashFlow"]);

      return {
        stock: `${symbol} (${c})`,
        price: fmt.currency(price, c),
        value: fmt.currency(value, c),
        alloc: fmt.percent(alloc),
        high52: fmt.currency(high52, c),
        low52: fmt.currency(low52, c),
        mktCap: fmt.currency(mktCap, c),
        peTTM: fmt.ratio(peTTM),
        peFwd: fmt.ratio(peFwd),
        peg: fmt.ratio(peg),
        ps: fmt.ratio(ps),
        pb: fmt.ratio(pb),
        evRev: fmt.ratio(evRev),
        evEbitda: fmt.ratio(evEbitda),
        margin: fmt.percent(margin),
        roa: fmt.percent(roa),
        roe: fmt.percent(roe),
        revenue: fmt.currency(revenue, c),
        netIncome: fmt.currency(netIncome, c),
        eps: fmt.currency(eps, c),
        cash: fmt.currency(cash, c),
        debtEq: fmt.ratio(debtEq),
        fcf: fmt.currency(fcf, c),
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
              theme={themeBalham}
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
