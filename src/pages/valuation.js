// pages/valuation.js
import React, { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule, CsvExportModule, MenuModule } from "ag-grid-community";

// Register AG Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule, CsvExportModule, MenuModule]);

// Import styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Dynamically import AgGridReact to avoid SSR crash
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

export default function ValuationPage({ currentUser, tickers = [], valuationData = {}, error }) {
  const gridRef = useRef();

  // ---- Format helpers ----
  const fmt = useMemo(() => ({
    largeCurrency: (value, currency = "USD") => {
      if (value == null || isNaN(value)) return "N/A";
      const absVal = Math.abs(value);
      let formatted;
      if (absVal >= 1e12) formatted = (value / 1e12).toFixed(2) + "T";
      else if (absVal >= 1e9) formatted = (value / 1e9).toFixed(2) + "B";
      else if (absVal >= 1e6) formatted = (value / 1e6).toFixed(2) + "M";
      else if (absVal >= 1e3) formatted = (value / 1e3).toFixed(2) + "K";
      else formatted = value.toFixed(2);
      return `${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(String(formatted).replace(/[TMBK]$/, "")))}${formatted.match(/[TMBK]/)?.[0] ?? ""}`;
    },
    currency: (value, currency = "USD") =>
      value == null || isNaN(value) ? "N/A" : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value),
    percent: (value) => {
      if (value == null || isNaN(value)) return "N/A";
      const v = Math.abs(value) > 1 && Math.abs(value) <= 100 ? value / 100 : value;
      return (v * 100).toFixed(2) + "%";
    },
    ratio: (value) =>
      value == null || isNaN(value) ? "N/A" : Number(value).toFixed(2) + "x",
  }), []);

  // ---- Column definitions ----
  const columnDefs = useMemo(() => [
    { headerName: "Stock", field: "stock", pinned: "left", sortable: true, filter: "agTextColumnFilter", flex: 2, minWidth: 150 },
    { headerName: "Price", field: "price", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120, valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "Value", field: "value", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140, valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "Alloc %", field: "alloc", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120, valueFormatter: (p) => fmt.percent(p.value) },
    { headerName: "52w High", field: "high52", sortable: true, flex: 1, minWidth: 120, valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "52w Low", field: "low52", sortable: true, flex: 1, minWidth: 120, valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "Mkt Cap", field: "mktCap", sortable: true, flex: 1, minWidth: 140, valueFormatter: (p) => fmt.largeCurrency(p.value) },
    { headerName: "P/E (TTM)", field: "peTTM", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "P/E (Fwd)", field: "peFwd", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "PEG", field: "peg", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "P/S", field: "ps", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "P/B", field: "pb", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "EV/Rev", field: "evRev", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "EV/EBITDA", field: "evEbitda", sortable: true, flex: 1, minWidth: 120, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "Profit Margin", field: "margin", sortable: true, flex: 1, minWidth: 120, valueFormatter: (p) => fmt.percent(p.value) },
    { headerName: "ROA", field: "roa", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.percent(p.value) },
    { headerName: "ROE", field: "roe", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.percent(p.value) },
    { headerName: "Revenue", field: "revenue", sortable: true, flex: 1, minWidth: 140, valueFormatter: (p) => fmt.largeCurrency(p.value) },
    { headerName: "Net Income", field: "netIncome", sortable: true, flex: 1, minWidth: 140, valueFormatter: (p) => fmt.largeCurrency(p.value) },
    { headerName: "EPS", field: "eps", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "Cash", field: "cash", sortable: true, flex: 1, minWidth: 140, valueFormatter: (p) => fmt.largeCurrency(p.value) },
    { headerName: "Debt/Eq", field: "debtEq", sortable: true, flex: 1, minWidth: 100, valueFormatter: (p) => fmt.ratio(p.value) },
    { headerName: "FCF", field: "fcf", sortable: true, flex: 1, minWidth: 140, valueFormatter: (p) => fmt.largeCurrency(p.value) },
  ], [fmt]);

  // ---- Row data ----
  const rowData = useMemo(() =>
    tickers.map(symbol => {
      const v = valuationData[symbol] || {};
      const c = v.Currency || "USD";
      return {
        stock: `${symbol} (${c})`,
        price: v.CurrentPrice ?? 0,
        value: v.CurrentValue ?? 0,
        alloc: v.AllocationPercent ?? 0,
        high52: v["52wHigh"] ?? 0,
        low52: v["52wLow"] ?? 0,
        mktCap: v.MarketCap ?? 0,
        peTTM: v.TrailingPE ?? 0,
        peFwd: v.ForwardPE ?? 0,
        peg: v.PEGRatio ?? 0,
        ps: v.PriceToSales ?? 0,
        pb: v.PriceToBook ?? 0,
        evRev: v["EV/Revenue"] ?? v["EV/Rev"] ?? 0,
        evEbitda: v["EV/EBITDA"] ?? 0,
        margin: v.ProfitMargin ?? 0,
        roa: v.ROA ?? 0,
        roe: v.ROE ?? 0,
        revenue: v.Revenue ?? 0,
        netIncome: v.NetIncome ?? 0,
        eps: v.EPS ?? 0,
        cash: v.TotalCash ?? 0,
        debtEq: v.DebtEquity ?? 0,
        fcf: v.FreeCashFlow ?? 0,
      };
    }), [tickers, valuationData]
  );

  const handleExportCSV = useCallback(() => {
    gridRef.current.api.exportDataAsCsv();
  }, []);

  if (error) {
    return <div style={{ padding: 20, color: "red" }}>Error loading valuation data: {error}</div>;
  }

  const normalizedUser = {
    ...currentUser,
    isAuthenticated: currentUser.is_authenticated ?? currentUser.isAuthenticated ?? false,
  };

  return (
    <div style={styles.body}>
      <Nav user={normalizedUser} />

      <h2>Valuation Dashboard</h2>

      {!tickers.length ? (
        <p style={{ fontStyle: "italic", color: "#666" }}>
          Start by adding Transactions in the Transactions page.
        </p>
      ) : (
        <>
          <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{ resizable: true, sortable: true, filter: true, flex: 1 }}
              pagination
              paginationPageSize={20}
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
  footer: { marginTop: 40, padding: 20, backgroundColor: "#f8f8f8", borderTop: "1px solid #eee", fontSize: 11, color: "#666" },
  downloadBtn: { marginTop: 20, background: "#0070f3", color: "#fff", border: "none", padding: "10px 15px", borderRadius: 4, cursor: "pointer", fontSize: 14 },
};

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
