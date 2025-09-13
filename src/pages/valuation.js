// pages/valuation.js
import React, { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";
import { ModuleRegistry } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  MenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PaginationModule,
  RangeSelectionModule,
} from "ag-grid-community";

// Register AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  MenuModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PaginationModule,
  RangeSelectionModule,
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

  // Format helpers
  const fmt = useMemo(
    () => ({
      currency: (value, currency = "USD") =>
        value == null || value === "N/A" || isNaN(value)
          ? "N/A"
          : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value),
      percent: (value) => (value == null || value === "N/A" || isNaN(value) ? "N/A" : (value * 100).toFixed(2) + "%"),
      ratio: (value) => (value == null || value === "N/A" || isNaN(value) ? "N/A" : value.toFixed(2) + "x"),
    }),
    []
  );

  // Column definitions
  const columnDefs = useMemo(
    () => [
      { headerName: "Stock", field: "stock", pinned: "left", sortable: true, filter: true, flex: 2, minWidth: 150 },
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
    ],
    []
  );

  const rowData = useMemo(
    () =>
      tickers.map((symbol) => {
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
      }),
    [tickers, valuationData, fmt]
  );

  const handleExportCSV = useCallback(() => {
    gridRef.current.api.exportDataAsCsv();
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
          <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{ resizable: true, sortable: true, filter: true, flex: 1 }}
              pagination={true}
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
          Financial data is retrieved via Yahoo Finance API (yFinance) and provided "as is".
        </p>
      </footer>
    </div>
  );
}

const styles = {
  body: { padding: "2rem" },
  downloadBtn: { marginTop: 20, padding: "0.5rem 1rem", cursor: "pointer" },
  footer: { marginTop: 40, fontSize: 12, color: "#888" },
};

// SSR session fetch
export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  // Placeholder data fetch logic
  return {
    props: { currentUser: session.user, tickers: [], valuationData: {} },
  };
}
