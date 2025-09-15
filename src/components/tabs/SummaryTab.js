// components/tabs/SummaryTab.js
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

const StockPie = dynamic(() => import("../Charts").then((mod) => mod.StockPie), { ssr: false });
const SectorPie = dynamic(() => import("../Charts").then((mod) => mod.SectorPie), { ssr: false });
const TreemapChart = dynamic(() => import("../Charts").then((mod) => mod.TreemapChart), { ssr: false });

import { exportToCSV } from "../exportCSV";

function getFirst(obj = {}, keys = []) {
  for (const k of keys) {
    if (obj == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== null && obj[k] !== undefined) return obj[k];
  }
  return undefined;
}
function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function SummaryTab({ currentUser, marketData, totalValue, totalCost, totalGain, totalGainPct, portfolioTableData }) {
  const fmt = useMemo(() => ({
    currency: (num) => (typeof num === "number" && !isNaN(num) ? num.toFixed(2) : "N/A"),
    quantity: (num) => (typeof num === "number" && !isNaN(num) ? Math.round(num) : "N/A"),
    percent: (num) => (typeof num === "number" && !isNaN(num) ? num.toFixed(2) + "%" : "N/A"),
  }), []);

  // Normalize the incoming data (same fields as PortfolioOverview)
  const normalizedData = useMemo(() => {
    if (!portfolioTableData) return [];
    return portfolioTableData.map((row) => {
      const Ticker = getFirst(row, ["Ticker", "ticker", "symbol", "stock"]) || "N/A";
      const Name = getFirst(row, ["Name", "name", "shortName", "longName"]) || Ticker;
      const Quantity = toNumber(getFirst(row, ["Quantity", "quantity", "qty"])) || 0;
      const Currency = getFirst(row, ["Currency", "currency"]) || "N/A";
      const AvgCost = toNumber(getFirst(row, ["Avg Cost/Share", "avg_cost", "avgCost"])) || 0;
      const CMP = toNumber(getFirst(row, ["CMP", "cmp", "current_price", "price"])) || 0;
      const CurrentValue = toNumber(getFirst(row, ["Current Value", "current_value"])) || Quantity * CMP || 0;
      const TotalCost = toNumber(getFirst(row, ["Total Cost", "total_cost"])) || 0;
      const GainLossPct = toNumber(getFirst(row, ["Gain/Loss %", "gain_loss_pct"])) || 0;
      const AllocationPercent = toNumber(getFirst(row, ["AllocationPercent", "allocation_percent"])) || 0;
      const DayChangePct = toNumber(getFirst(row, ["Day Change (%)", "DayChangePct", "day_change_pct"])) || 0;
      const DayPnL = toNumber(getFirst(row, ["Day PnL", "DayChange", "day_pnl"])) || 0;
      const InvestmentDate = getFirst(row, ["Investment Date", "investment_date", "first_buy_date"]) || "N/A";
      const Exchange = getFirst(row, ["Exchange", "exchange"]) || "N/A";
      const fiftyTwoHigh = toNumber(getFirst(row, ["52w High", "52wHigh", "52w_high"])) || null;
      const fiftyTwoLow = toNumber(getFirst(row, ["52w Low", "52wLow", "52w_low"])) || null;
      const UnrealizedGains = toNumber(getFirst(row, ["Unrealized Gains", "unrealized_gain"])) || 0;
      const Sector = getFirst(row, ["Sector", "sector"]) || "N/A";

      return {
        Ticker,
        Name,
        Quantity,
        Currency,
        "Avg Cost/Share": AvgCost,
        CMP,
        "Current Value": CurrentValue,
        "Total Cost": TotalCost,
        "Gain/Loss %": GainLossPct,
        AllocationPercent,
        "Day Change (%)": DayChangePct,
        "Day PnL": DayPnL,
        "Investment Date": InvestmentDate,
        Exchange,
        "52w High": fiftyTwoHigh,
        "52w Low": fiftyTwoLow,
        "Unrealized Gains": UnrealizedGains,
        Sector,
      };
    });
  }, [portfolioTableData]);

  // Sorters for top lists
  const dailySorted = [...normalizedData].sort((a, b) => (b["Day Change (%)"] || 0) - (a["Day Change (%)"] || 0));
  const topDailyGainers = dailySorted.slice(0, 5);
  const topDailyLosers = dailySorted.slice(-5).reverse();

  const allTimeSorted = [...normalizedData].sort((a, b) => (b["Unrealized Gains"] || 0) - (a["Unrealized Gains"] || 0));
  const topAllTimeGainers = allTimeSorted.slice(0, 5);
  const topAllTimeLosers = allTimeSorted.slice(-5).reverse();

  const columnDefs = useMemo(() => [
    { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true, width: 100 },
    { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true, flex: 1 },
    { headerName: "Quantity", field: "Quantity", valueFormatter: (p) => fmt.quantity(p.value), resizable: true, width: 120 },
    { headerName: "Currency", field: "Currency", sortable: true, filter: true, resizable: true, width: 100 },
    { headerName: "Avg Cost/Share", field: "Avg Cost/Share", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "CMP", field: "CMP", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Total Cost", field: "Total Cost", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Gain/Loss %", field: "Gain/Loss %", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 130 },
    { headerName: "Allocation %", field: "AllocationPercent", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 120 },
    { headerName: "Day Change (%)", field: "Day Change (%)", valueFormatter: (p) => fmt.percent(p.value), resizable: true, width: 120 },
    { headerName: "Day P&L", field: "Day PnL", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Investment Date", field: "Investment Date", sortable: true, filter: true, resizable: true, width: 130 },
    { headerName: "Exchange", field: "Exchange", sortable: true, filter: true, resizable: true, width: 100 },
    { headerName: "52w High", field: "52w High", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "52w Low", field: "52w Low", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Unrealized Gains", field: "Unrealized Gains", valueFormatter: (p) => fmt.currency(p.value), resizable: true, width: 130 },
    { headerName: "Sector", field: "Sector", sortable: true, filter: true, resizable: true, width: 120 },
  ], [fmt]);

  return (
    <div style={styles.container}>
      {/* Portfolio Summary */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Portfolio Summary</h2>
        <div style={styles.portfolioSummary}>
          <SummaryItem label="Total Current Value" value={fmt.currency(totalValue)} />
          <SummaryItem label="Total Investment Cost" value={fmt.currency(totalCost)} />
          <SummaryItem label="Total Gain/Loss" value={`${fmt.currency(totalGain)} (${fmt.percent(totalGainPct)})`} positive={parseFloat(totalGainPct) > 0} />
        </div>
      </section>

      {/* CSV Export */}
      {normalizedData.length > 0 && (
        <div style={{ margin: "20px 0" }}>
          <button
            onClick={() =>
              exportToCSV(
                "portfolio.csv",
                columnDefs.map((c) => c.field),
                normalizedData
              )
            }
            style={styles.csvBtn}
          >
            Download CSV
          </button>
        </div>
      )}

      {/* Top Daily Gainers/Losers */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Top 5 Daily Gainers / Losers</h2>
        <div className="ag-theme-alpine" style={{ height: 250, marginBottom: 20 }}>
          <AgGridReact rowData={topDailyGainers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
        <div className="ag-theme-alpine" style={{ height: 250 }}>
          <AgGridReact rowData={topDailyLosers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
      </section>

      {/* Top All-Time Gainers/Losers */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Top 5 All-Time Gainers / Losers</h2>
        <div className="ag-theme-alpine" style={{ height: 250, marginBottom: 20 }}>
          <AgGridReact rowData={topAllTimeGainers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
        <div className="ag-theme-alpine" style={{ height: 250 }}>
          <AgGridReact rowData={topAllTimeLosers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
      </section>

      {/* Charts */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Portfolio Charts</h2>
        <div style={styles.chartsGrid}>
          <StockPie data={normalizedData} />
          <SectorPie data={normalizedData} />
          <TreemapChart data={normalizedData} />
        </div>
      </section>

      {/* Market Overview */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Market Overview</h2>
        <div style={styles.marketSummary}>
          {["nasdaq", "sp500", "dow"].map((index) => {
            const data = marketData?.[index];
            if (!data || data.price === undefined) return (
              <div key={index} style={styles.marketIndicator}>
                <div style={styles.marketIndex}>{index.toUpperCase()}</div>
                <div style={styles.marketValue}>Data unavailable</div>
              </div>
            );
            const positive = data.change >= 0;
            return (
              <div key={index} style={styles.marketIndicator}>
                <div style={styles.marketIndex}>{index.toUpperCase()}</div>
                <div style={styles.marketValue}>{data.price.toFixed(2)}</div>
                <div style={{ ...styles.marketChange, color: positive ? "#006400" : "#8B0000" }}>
                  {data.change.toFixed(2)} ({fmt.percent(data.change_pct * 100)})
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value, positive }) {
  return (
    <div style={styles.summaryItem}>
      <div>{label}</div>
      <div style={{ ...styles.summaryValue, color: positive ? "#006400" : positive === false ? "#8B0000" : "inherit" }}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto", fontSize: 14 },
  section: { marginBottom: 40 },
  sectionTitle: { marginBottom: 12, fontSize: 18, fontWeight: 600, borderBottom: "1px solid #ccc", paddingBottom: 4 },
  marketSummary: { display: "flex", justifyContent: "flex-start", gap: 30 },
  marketIndicator: { display: "flex", flexDirection: "column" },
  marketIndex: { fontWeight: 600, fontSize: 14 },
  marketValue: { fontSize: 16, fontWeight: "bold" },
  marketChange: { fontSize: 14 },
  portfolioSummary: { display: "flex", justifyContent: "flex-start", gap: 60, paddingTop: 10 },
  summaryItem: { display: "flex", flexDirection: "column" },
  summaryValue: { fontWeight: "bold", fontSize: 18, marginTop: 4 },
  chartsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 },
  csvBtn: { padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: 4, cursor: "pointer" },
};
