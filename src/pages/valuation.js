// pages/valuation.js
import React, { useMemo, useRef, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";

// Register only the essential AG Grid community modules
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
  themeBalham
} from "ag-grid-community";

// Register modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
]);

// Dynamically import AgGridReact to avoid SSR issues
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

// Helper: pick first available key from object (robust aliases)
const pick = (obj, keys) => {
  if (!obj) return null;
  for (let k of keys) {
    // support nested object keys as well if needed (not used here, but safe)
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

// Helper: compact number formatter (1.23K, 45.6M, 7.89B)
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
  const [isLoading, setIsLoading] = useState(false);

  // Debug the incoming props
  useEffect(() => {
    console.log("=== VALUATION PAGE DEBUG ===");
    console.log("Current user:", currentUser);
    console.log("Tickers:", tickers);
    console.log("Valuation data keys:", Object.keys(valuationData));
    console.log("Valuation data:", valuationData);
    console.log("Error:", error);
    
    if (tickers.length > 0 && Object.keys(valuationData).length === 0) {
      console.error("❌ Tickers exist but valuationData is empty!");
    }
    
    if (tickers.length > 0) {
      console.log("Sample ticker data for", tickers[0], ":", valuationData[tickers[0]]);
    }
  }, [tickers, valuationData, error, currentUser]);

  // ---- Format helpers ----
  const fmt = useMemo(() => ({
    // currency: if compact === true, show compactNumber (no currency symbol)
    currency: (value, currency = "USD", compact = false) => {
      const num = toNumber(value);
      if (value == null || value === "N/A" || isNaN(num)) return "N/A";
      if (compact) return compactNumber(num);
      try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
      } catch {
        return num.toFixed(2);
      }
    },
    // percent: backend provides percent already (e.g. 12.34), do NOT multiply
    percent: (value) => {
      if (value == null || value === "N/A" || isNaN(toNumber(value))) return "N/A";
      return toNumber(value).toFixed(2) + "%";
    },
    ratio: (value) =>
      (value == null || value === "N/A" || isNaN(toNumber(value)))
        ? "N/A"
        : toNumber(value).toFixed(2) + "x",
  }), []);

  // ---- Column definitions ----
  const columnDefs = useMemo(() => [
    { headerName: "Stock", field: "stock", pinned: "left", sortable: true, filter: "agTextColumnFilter", flex: 2, minWidth: 150 },
    { headerName: "Price", field: "price", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
    { headerName: "Value", field: "value", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
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

  // ---- Row data ----
  const rowData = useMemo(() => {
    console.log("=== CREATING ROW DATA ===");
    console.log("Tickers:", tickers);
    console.log("Valuation data keys:", Object.keys(valuationData));
    
    return tickers.map(symbol => {
      const v = valuationData[symbol] || {};
      console.log(`Data for ${symbol}:`, v);

      // currency - backend uses 'Currency'
      const c = v.Currency || "USD";

      // Debug each field to see what's actually available
      console.log(`${symbol} - CurrentPrice:`, v.CurrentPrice);
      console.log(`${symbol} - CurrentValue:`, v.CurrentValue);
      console.log(`${symbol} - AllocationPercent:`, v.AllocationPercent);

      // price & values: backend uses CurrentPrice, CurrentValue
      const price = v.CurrentPrice;
      const value = v.CurrentValue;
      const alloc = v.AllocationPercent;

      // 52w - backend uses '52w_high', '52w_low'
      const high52 = v['52w_high'];
      const low52 = v['52w_low'];

      // market caps & ratios - exact backend keys
      const mktCap = v.marketCap;
      const peTTM = v.trailingPE;
      const peFwd = v.forwardPE;
      const peg = v.pegRatio;
      const ps = v.priceToSalesTrailing12Months;
      const pb = v.priceToBook;
      const evRev = v.enterpriseToRevenue;
      const evEbitda = v.enterpriseToEbitda;

      // margins/returns
      const margin = v.profitMargins;
      const roa = v.returnOnAssets;
      const roe = v.returnOnEquity;

      // financials
      const revenue = v.totalRevenue;
      const netIncome = v.netIncomeToCommon;
      const eps = v.trailingEps;
      const cash = v.totalCash;
      const debtEq = v.debtToEquity;
      const fcf = v.freeCashflow;

      const row = {
        stock: `${symbol} (${c})`,
        price: fmt.currency(price, c),
        value: fmt.currency(value, c, true),
        alloc: fmt.percent(alloc),

        high52: fmt.currency(high52, c),
        low52: fmt.currency(low52, c),
        mktCap: fmt.currency(mktCap, c, true),

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

        revenue: fmt.currency(revenue, c, true),
        netIncome: fmt.currency(netIncome, c, true),
        eps: (eps == null || eps === "N/A" || isNaN(toNumber(eps))) ? "N/A" : Number(toNumber(eps)).toFixed(2),
        cash: fmt.currency(cash, c, true),
        debtEq: fmt.ratio(debtEq),
        fcf: fmt.currency(fcf, c, true),
      };

      console.log(`Row for ${symbol}:`, row);
      return row;
    });
  }, [tickers, valuationData, fmt]);

  // ---- Export CSV ----
  const handleExportCSV = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv();
    }
  }, []);

  if (isLoading) {
    return (
      <div style={styles.body}>
        <Nav user={currentUser} />
        <div style={{ padding: 20, textAlign: 'center' }}>Loading valuation data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.body}>
        <Nav user={currentUser} />
        <div style={{ padding: 20, color: "red" }}>
          <h2>Error loading valuation data</h2>
          <p>{error}</p>
          <p>Please check your transactions or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.body}>
      <Nav user={currentUser} />

      {/* Professional page title */}
      <header style={styles.header}>
        <h1 style={styles.title}>Valuation Dashboard</h1>
        <div style={styles.divider}></div>
      </header>

      {!tickers.length ? (
        <p style={{ fontStyle: "italic", color: "#666", padding: 20 }}>
          Start by adding Transactions in the Transactions page.
        </p>
      ) : (
        <>
          {/* Debug info */}
          <div style={{ marginBottom: 20, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <small>
              <strong>Debug:</strong> Found {tickers.length} tickers | 
              Data keys: {Object.keys(valuationData).join(', ')}
            </small>
          </div>

          {/* keep class for baseline styling, pass themeBalham for consistency */}
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
  body: { fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto", padding: 20, fontSize: 13 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "600", margin: 0, color: "#222" },
  divider: { height: 2, backgroundColor: "#0070f3", width: 180, marginTop: 8, borderRadius: 2 },
  gridContainer: { height: 600, width: "100%" },
  footer: { marginTop: 40, padding: 20, backgroundColor: "#f8f8f8", borderTop: "1px solid #eee", fontSize: 11, color: "#666" },
  downloadBtn: { marginTop: 20, background: "#0070f3", color: "#fff", border: "none", padding: "10px 15px", borderRadius: 4, cursor: "pointer", fontSize: 14 },
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

  console.log("=== SERVER-SIDE FETCH ===");
  console.log("Fetching from:", backendUrl);
  console.log("Token exists:", !!token);

  let data = {};
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    console.log("Backend response status:", res.status);
    
    if (res.status === 401) {
      console.log("Unauthorized - redirecting to signin");
      return { redirect: { destination: "/auth/signin", permanent: false } };
    }
    
    const responseText = await res.text();
    console.log("Backend response text:", responseText.substring(0, 500) + "..."); // Limit output
    
    try {
      data = JSON.parse(responseText);
      console.log("Parsed backend data success:", data.success);
      console.log("Tickers count:", data.tickers ? data.tickers.length : 0);
      console.log("Valuation data keys:", data.valuationData ? Object.keys(data.valuationData) : []);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      data = { error: "Invalid JSON response from server: " + parseError.message };
    }
  } catch (err) {
    console.error("Error fetching valuation data:", err);
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