// components/tabs/SummaryTab.js
import React, { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry, themeBalham } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  NumberFilterModule,
  TextFilterModule,
} from "ag-grid-community";
import { exportToCSV } from "../exportCSV";
import { formatINR } from "../formatters";

// Register AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  NumberFilterModule,
  TextFilterModule,
]);

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);
const StockPie = dynamic(
  () => import("../Charts").then((mod) => mod.StockPie),
  { ssr: false }
);
const SectorPie = dynamic(
  () => import("../Charts").then((mod) => mod.SectorPie),
  { ssr: false }
);
const TreemapChart = dynamic(
  () => import("../Charts").then((mod) => mod.TreemapChart),
  { ssr: false }
);

function getFirst(obj = {}, keys = []) {
  for (const k of keys) {
    if (obj == null) return undefined;
    if (
      Object.prototype.hasOwnProperty.call(obj, k) &&
      obj[k] !== null &&
      obj[k] !== undefined
    )
      return obj[k];
  }
  return undefined;
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function SummaryTab({
  currentUser,
  marketData,
  totalValue,
  totalCost,
  totalGain,
  totalGainPct,
  portfolioTableData,
}) {
  const gridRef = useRef(null);

  const normalizedData = useMemo(() => {
    if (!portfolioTableData) return [];
    return portfolioTableData.map((row) => {
      const Ticker =
        getFirst(row, ["Ticker", "ticker", "symbol", "stock"]) || "N/A";
      const Name =
        getFirst(row, ["Name", "name", "shortName", "longName"]) || Ticker;
      const Quantity = toNumber(getFirst(row, ["Quantity", "quantity", "qty"])) || 0;
      const Currency = getFirst(row, ["Currency", "currency"]) || "N/A";
      const AvgCost =
        toNumber(
          getFirst(row, [
            "Avg Cost/Share",
            "avg_cost",
            "avgCost",
            "avg_cost_per_share",
          ])
        ) || 0;
      const CMP =
        toNumber(
          getFirst(row, [
            "CMP",
            "cmp",
            "current_price",
            "price",
            "currentPrice",
          ])
        ) || 0;
      const CurrentValue =
        toNumber(
          getFirst(row, [
            "Current Value",
            "current_value",
            "currentValue",
            "market_value",
          ])
        ) ||
        Quantity * CMP ||
        0;
      const TotalCost =
        toNumber(getFirst(row, ["Total Cost", "total_cost", "totalCost"])) || 0;
      const GainLossPct =
        toNumber(
          getFirst(row, [
            "Gain/Loss %",
            "gain_loss_pct",
            "gainPct",
            "gain_percent",
          ])
        ) || ((CurrentValue - TotalCost) / (TotalCost || 1)) * 100;
      const AllocationPercent =
        toNumber(
          getFirst(row, [
            "AllocationPercent",
            "allocationPercent",
            "allocation_percent",
          ])
        ) || 0;
      const DayChangePct =
        toNumber(
          getFirst(row, [
            "Day Change (%)",
            "DayChangePct",
            "day_change_pct",
            "dayChangePct",
          ])
        ) || 0;
      const DayPnL =
        toNumber(getFirst(row, ["Day PnL", "DayChange", "day_pnl", "dayPnL"])) || 0;
      const InvestmentDate =
        getFirst(row, [
          "Investment Date",
          "investment_date",
          "first_buy_date",
          "firstBuyDate",
        ]) || "N/A";
      const Exchange = getFirst(row, ["Exchange", "exchange"]) || "N/A";
      const fiftyTwoHigh =
        toNumber(
          getFirst(row, [
            "52w High",
            "52wHigh",
            "52w_high",
            "52_week_high",
            "fiftyTwoWeekHigh",
          ])
        ) || null;
      const fiftyTwoLow =
        toNumber(
          getFirst(row, [
            "52w Low",
            "52wLow",
            "52w_low",
            "52_week_low",
            "fiftyTwoWeekLow",
          ])
        ) || null;
      const UnrealizedGains =
        toNumber(
          getFirst(row, [
            "Unrealized Gains",
            "unrealized_gain",
            "unrealizedGain",
            "UnrealizedGains",
          ])
        ) || 0;
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

  const dailySorted = [...normalizedData].sort(
    (a, b) => (b["Day Change (%)"] || 0) - (a["Day Change (%)"] || 0)
  );
  const topDailyGainers = dailySorted.slice(0, 5);
  const topDailyLosers = dailySorted.slice(-5).reverse();

  const allTimeSorted = [...normalizedData].sort(
    (a, b) => (b["Unrealized Gains"] || 0) - (a["Unrealized Gains"] || 0)
  );
  const topAllTimeGainers = allTimeSorted.slice(0, 5);
  const topAllTimeLosers = allTimeSorted.slice(-5).reverse();

  const numericCellStyle = { textAlign: "right" };
  const textCellStyle = { textAlign: "left" };

  // Column definitions: Gain/Loss % and Day Change (%) use cellRenderer for arrows + coloring
  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "Ticker", sortable: true, filter: "agTextColumnFilter", resizable: true, width: 100, cellStyle: textCellStyle },
      { headerName: "Name", field: "Name", sortable: true, filter: "agTextColumnFilter", resizable: true, flex: 1, cellStyle: textCellStyle },
      { headerName: "Quantity", field: "Quantity", filter: "agNumberColumnFilter", width: 120, cellStyle: numericCellStyle },
      { headerName: "Currency", field: "Currency", sortable: true, filter: "agTextColumnFilter", width: 100, cellStyle: textCellStyle },
      { headerName: "Avg Cost/Share", field: "Avg Cost/Share", cellRenderer: (p) => formatINR(p.value), width: 130, cellStyle: numericCellStyle },
      { headerName: "CMP", field: "CMP", cellRenderer: (p) => formatINR(p.value), width: 130, cellStyle: numericCellStyle },
      { headerName: "Current Value", field: "Current Value", cellRenderer: (p) => formatINR(p.value), width: 130, cellStyle: numericCellStyle },
      { headerName: "Total Cost", field: "Total Cost", cellRenderer: (p) => formatINR(p.value), width: 130, cellStyle: numericCellStyle },
      {
        headerName: "Gain/Loss %",
        field: "Gain/Loss %",
        cellRenderer: (p) => {
          const v = Number(p.value);
          if (isNaN(v)) return "N/A";
          const abs = Math.abs(v).toFixed(2) + "%";
          if (v > 0) return `▲ ${abs}`;
          if (v < 0) return `▼ ${abs}`;
          return `${abs}`;
        },
        cellStyle: (p) => {
          const v = Number(p.value);
          return { textAlign: "right", color: v > 0 ? "green" : v < 0 ? "red" : "inherit" };
        },
        width: 130,
      },
      {
        headerName: "Allocation %",
        field: "AllocationPercent",
        valueFormatter: (p) => {
          const v = Number(p.value);
          if (isNaN(v)) return "0.00%";
          return v.toFixed(2) + "%";
        },
        width: 120,
        cellStyle: numericCellStyle,
      },
      {
        headerName: "Day Change (%)",
        field: "Day Change (%)",
        cellRenderer: (p) => {
          const v = Number(p.value);
          if (isNaN(v)) return "N/A";
          const abs = Math.abs(v).toFixed(2) + "%";
          if (v > 0) return `▲ ${abs}`;
          if (v < 0) return `▼ ${abs}`;
          return `${abs}`;
        },
        cellStyle: (p) => {
          const v = Number(p.value);
          return { textAlign: "right", color: v > 0 ? "green" : v < 0 ? "red" : "inherit" };
        },
        width: 120,
      },
      { headerName: "Day PnL", field: "Day PnL", cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }), width: 130, cellStyle: numericCellStyle },
      { headerName: "Investment Date", field: "Investment Date", sortable: true, filter: "agTextColumnFilter", width: 130, cellStyle: textCellStyle },
      { headerName: "Exchange", field: "Exchange", sortable: true, filter: "agTextColumnFilter", width: 100, cellStyle: textCellStyle },
      { headerName: "52w High", field: "52w High", cellRenderer: (p) => formatINR(p.value), width: 130, cellStyle: numericCellStyle },
      { headerName: "52w Low", field: "52w Low", cellRenderer: (p) => formatINR(p.value), width: 130, cellStyle: numericCellStyle },
      { headerName: "Unrealized Gains", field: "Unrealized Gains", cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }), width: 130, cellStyle: numericCellStyle },
      { headerName: "Sector", field: "Sector", sortable: true, filter: "agTextColumnFilter", width: 120, cellStyle: textCellStyle },
    ],
    []
  );

  const handleExportCSV = useCallback(() => {
    exportToCSV("portfolio.csv", columnDefs.map((c) => c.field), normalizedData);
  }, [columnDefs, normalizedData]);

  // determine color for overall unrealized gain/loss
  const overallGainColor = totalGain > 0 ? "green" : totalGain < 0 ? "red" : "inherit";
  const totalGainPctNum = Number(totalGainPct);
  const totalGainPctText = Number.isFinite(totalGainPctNum) ? `${totalGainPctNum.toFixed(2)}%` : "N/A";

  return (
    <div style={{ ...styles.container, boxSizing: "border-box", position: "relative" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={styles.sectionTitle}>Portfolio Summary</h2>
          <div style={styles.portfolioSummary}>
            <SummaryItem label="Total Current Value" value={formatINR(totalValue)} />
            <SummaryItem label="Total Investment Cost" value={formatINR(totalCost)} />
            <SummaryItem
              label="Unrealized Gain/Loss"
              value={`${formatINR(totalGain)} (${totalGainPctText})`}
              valueColor={overallGainColor}
            />
          </div>
        </div>
        <div>
          <h2 style={styles.sectionTitle}>Market Summary</h2>
          <div style={styles.marketSummary}>
            {["nasdaq", "sp500", "dow"].map((index) => {
              const data = marketData?.[index];
              if (!data || data.price === undefined)
                return (
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
                    {data.change.toFixed(2)} ({(data.change_pct * 100).toFixed(2)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {normalizedData.length > 0 && (
        <div style={{ margin: "10px 0" }}>
          <button onClick={handleExportCSV} style={styles.csvBtn}>
            Download CSV
          </button>
        </div>
      )}

      <section style={styles.section}>
        <h3 style={styles.tableTitle}>Top 5 Daily Gainers</h3>
        <div className="ag-theme-balham" style={{ height: 250, marginBottom: 10 }}>
          <AgGridReact rowData={topDailyGainers} columnDefs={columnDefs} domLayout="autoHeight" theme={themeBalham} />
        </div>
        <h3 style={styles.tableTitle}>Top 5 Daily Losers</h3>
        <div className="ag-theme-balham" style={{ height: 250 }}>
          <AgGridReact rowData={topDailyLosers} columnDefs={columnDefs} domLayout="autoHeight" theme={themeBalham} />
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.tableTitle}>Top 5 All-Time Gainers</h3>
        <div className="ag-theme-balham" style={{ height: 250, marginBottom: 10 }}>
          <AgGridReact rowData={topAllTimeGainers} columnDefs={columnDefs} domLayout="autoHeight" theme={themeBalham} />
        </div>
        <h3 style={styles.tableTitle}>Top 5 All-Time Losers</h3>
        <div className="ag-theme-balham" style={{ height: 250 }}>
          <AgGridReact rowData={topAllTimeLosers} columnDefs={columnDefs} domLayout="autoHeight" theme={themeBalham} />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Portfolio Charts</h2>

        {/* Pie charts row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              height: 400,
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Stock Allocation</h4>
            <div style={{ width: "100%", height: "calc(100% - 34px)" }}>
              <StockPie data={normalizedData} />
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              height: 400,
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Sector Allocation</h4>
            <div style={{ width: "100%", height: "calc(100% - 34px)" }}>
              <SectorPie data={normalizedData} />
            </div>
          </div>
        </div>

        {/* Treemaps row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              height: 500,
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Portfolio Treemap</h4>
            <div style={{ width: "100%", height: "calc(100% - 34px)" }}>
              <TreemapChart data={normalizedData} />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function SummaryItem({ label, value, valueColor }) {
  return (
    <div style={styles.summaryItem}>
      <div>{label}</div>
      <div style={{ ...styles.summaryValue, color: valueColor || "inherit" }}>{value}</div>
    </div>
  );
}

const styles = {
  container: { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto", fontSize: 14 },
  section: { marginBottom: 40 },
  sectionTitle: { marginBottom: 12, fontSize: 18, fontWeight: 600, borderBottom: "1px solid #ccc", paddingBottom: 4 },
  tableTitle: { marginBottom: 6, fontSize: 16, fontWeight: 500 },
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
