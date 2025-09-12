// pages/valuation.js
import React from "react";
import Nav from "./Nav";
import { getSession } from "next-auth/react";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community"; 
// use ag-grid-enterprise for ValidationModule if needed

// Register modules
ModuleRegistry.registerModules([ClientSideRowModelModule]);

// Import styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Register required AG Grid modules
export default function ValuationPage({ currentUser, tickers = [], valuationData = {}, error }) {
  const gridRef = useRef();

  // ---- Format helpers ----
  const fmt = useMemo(() => ({
    largeCurrency: (value, currency = "USD") => {
      if (value == null || value === "N/A" || isNaN(value)) return "N/A";
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
      value == null || value === "N/A" || isNaN(value)
        ? "N/A"
        : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value),
    percent: (value) => {
      if (value == null || value === "N/A" || isNaN(value)) return "N/A";
      const v = (Math.abs(value) > 1 && Math.abs(value) <= 100) ? value / 100 : value;
      return (v * 100).toFixed(2) + "%";
    },
    ratio: (value) =>
      value == null || value === "N/A" || isNaN(value) ? "N/A" : Number(value).toFixed(2) + "x",
  }), []);

  // ---- Column definitions ----
  const columnDefs = useMemo(() => [
  { headerName: "Stock", field: "stock", pinned: "left", sortable: true, filter: true, flex: 2, minWidth: 150 },
  { headerName: "Price", field: "price", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
  { headerName: "Value", field: "value", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 140 },
  { headerName: "Alloc %", field: "alloc", sortable: true, filter: "agNumberColumnFilter", flex: 1, minWidth: 120 },
  { headerName: "52w High", field: "high52", sortable: true, flex: 1, minWidth: 120 },
  { headerName: "52w Low", field: "low52", sortable: true, flex: 1, minWidth: 120 },
  { headerName: "Mkt Cap", field: "mktCap", sortable: true, flex: 1, minWidth: 140 },
  { headerName: "P/E (TTM)", field: "peTTM", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "P/E (Fwd)", field: "peFwd", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "PEG", field: "peg", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "P/S", field: "ps", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "P/B", field: "pb", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "EV/Rev", field: "evRev", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "EV/EBITDA", field: "evEbitda", sortable: true, flex: 1, minWidth: 120 },
  { headerName: "Profit Margin", field: "margin", sortable: true, flex: 1, minWidth: 120 },
  { headerName: "ROA", field: "roa", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "ROE", field: "roe", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "Revenue", field: "revenue", sortable: true, flex: 1, minWidth: 140 },
  { headerName: "Net Income", field: "netIncome", sortable: true, flex: 1, minWidth: 140 },
  { headerName: "EPS", field: "eps", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "Cash", field: "cash", sortable: true, flex: 1, minWidth: 140 },
  { headerName: "Debt/Eq", field: "debtEq", sortable: true, flex: 1, minWidth: 100 },
  { headerName: "FCF", field: "fcf", sortable: true, flex: 1, minWidth: 140 },
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
        mktCap: fmt.largeCurrency(v.MarketCap, c),
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
        revenue: fmt.largeCurrency(v.Revenue, c),
        netIncome: fmt.largeCurrency(v.NetIncome, c),
        eps: fmt.currency(v.EPS, c),
        cash: fmt.largeCurrency(v.TotalCash, c),
        debtEq: fmt.ratio(v.DebtEquity),
        fcf: fmt.largeCurrency(v.FreeCashFlow, c),
      };
    }), [tickers, valuationData, fmt]
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
