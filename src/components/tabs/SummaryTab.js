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

export default function SummaryTab({ currentUser, marketData, totalValue, totalCost, totalGain, totalGainPct, portfolioTableData }) {
  const fmt = useMemo(() => ({
    currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
    quantity: (num) => (typeof num === "number" ? Math.round(num) : "N/A"),
    percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
  }), []);

  // Daily / All-time gainers & losers
  const dailySorted = [...(portfolioTableData || [])].sort((a, b) => b["Gain/Loss %"] - a["Gain/Loss %"]);
  const topDailyGainers = dailySorted.slice(0, 5);
  const topDailyLosers = dailySorted.slice(-5).reverse();

  const allTimeSorted = [...(portfolioTableData || [])].sort((a, b) => b["Unrealized Gains"] - a["Unrealized Gains"]);
  const topAllTimeGainers = allTimeSorted.slice(0, 5);
  const topAllTimeLosers = allTimeSorted.slice(-5).reverse();

  const columnDefs = useMemo(() => [
    { headerName: "Ticker", field: "Ticker", sortable: true, filter: true },
    { headerName: "Name", field: "Name", sortable: true, filter: true },
    { headerName: "Quantity", field: "Quantity", valueFormatter: (p) => fmt.quantity(p.value) },
    { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value) },
    { headerName: "Gain/Loss %", field: "Gain/Loss %", valueFormatter: (p) => fmt.percent(p.value) },
    { headerName: "Unrealized Gains", field: "Unrealized Gains", valueFormatter: (p) => fmt.currency(p.value) },
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
      {portfolioTableData?.length > 0 && (
        <div style={{ margin: "20px 0" }}>
          <button
            onClick={() =>
              exportToCSV(
                "portfolio.csv",
                ["Ticker","Name","Quantity","Currency","Avg Cost/Share","CMP","Current Value","Total Cost","Gain/Loss","Gain/Loss %","AllocationPercent","Investment Date","Exchange","52w High","52w Low","Unrealized Gains","Sector"],
                portfolioTableData
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
        <div className="ag-theme-alpine" style={{ height: 200, marginBottom: 20 }}>
          <AgGridReact rowData={topDailyGainers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
        <div className="ag-theme-alpine" style={{ height: 200 }}>
          <AgGridReact rowData={topDailyLosers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
      </section>

      {/* Top All-Time Gainers/Losers */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Top 5 All-Time Gainers / Losers</h2>
        <div className="ag-theme-alpine" style={{ height: 200, marginBottom: 20 }}>
          <AgGridReact rowData={topAllTimeGainers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
        <div className="ag-theme-alpine" style={{ height: 200 }}>
          <AgGridReact rowData={topAllTimeLosers} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
      </section>

      {/* Portfolio Charts */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Portfolio Charts</h2>
        <div style={styles.chartsGrid}>
          <StockPie data={portfolioTableData} />
          <SectorPie data={portfolioTableData} />
          <TreemapChart data={portfolioTableData} />
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
