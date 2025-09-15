// components/tabs/PortfolioOverviewTab.js
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

import { exportToCSV } from "../exportCSV";

// Helper: get first non-null/undefined match across aliases
function getFirst(obj = {}, keys = []) {
  for (const k of keys) {
    if (obj == null) continue;
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
      return obj[k];
    }
  }
  return undefined;
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function PortfolioOverviewTab({ currentUser, overviewTabData }) {
  const portfolioTableData = useMemo(() => {
    if (!overviewTabData) return [];

    return overviewTabData.map((row) => {
      const Ticker = getFirst(row, ["Ticker", "ticker", "symbol", "stock", "code"]) || "N/A";
      const Name = getFirst(row, ["Name", "name", "shortName", "longName", "companyName"]) || Ticker;
      const Quantity = toNumber(getFirst(row, ["Quantity", "quantity", "qty", "shares", "units"])) || 0;
      const Currency = getFirst(row, ["Currency", "currency", "ccy"]) || "N/A";
      const AvgCost =
        toNumber(getFirst(row, ["Avg Cost/Share", "avg_cost", "avgCost", "avgPrice", "cost_basis"])) || 0;
      const CMP =
        toNumber(getFirst(row, ["CMP", "cmp", "current_price", "price", "currentPrice", "marketPrice"])) || 0;
      const CurrentValue =
        toNumber(
          getFirst(row, ["Current Value", "current_value", "currentValue", "market_value", "value"])
        ) || Quantity * CMP || 0;
      const TotalCost =
        toNumber(getFirst(row, ["Total Cost", "total_cost", "totalCost", "cost"])) ||
        Quantity * AvgCost ||
        0;
      const GainLossPct =
        toNumber(
          getFirst(row, [
            "Gain/Loss %",
            "gain_loss_pct",
            "gainPct",
            "gain_percent",
            "gainLossPercent",
            "pnlPct",
          ])
        ) || ((CurrentValue - TotalCost) / (TotalCost || 1)) * 100;
      const AllocationPercent =
        toNumber(
          getFirst(row, [
            "AllocationPercent",
            "allocationPercent",
            "allocation_percent",
            "weight",
            "portfolioWeight",
          ])
        ) || 0;

      // Day change fields
      const DayChangePct =
        toNumber(
          getFirst(row, [
            "Day Change (%)",
            "dayChangePct",
            "day_change_pct",
            "DayChangePercent",
            "dayChangePercent",
          ])
        ) || 0;
      const DayPnL =
        toNumber(getFirst(row, ["Day PnL", "day_pnl", "dayPnL", "dayChange", "dailyPnL"])) || 0;

      const InvestmentDate =
        getFirst(row, ["Investment Date", "investment_date", "first_buy_date", "firstBuyDate"]) || "N/A";
      const Exchange = getFirst(row, ["Exchange", "exchange", "market"]) || "N/A";

      const fiftyTwoHigh =
        toNumber(
          getFirst(row, ["52w High", "52wHigh", "52w_high", "52_week_high", "fiftyTwoWeekHigh"])
        ) || null;
      const fiftyTwoLow =
        toNumber(
          getFirst(row, ["52w Low", "52wLow", "52w_low", "52_week_low", "fiftyTwoWeekLow"])
        ) || null;

      const UnrealizedGains =
        toNumber(
          getFirst(row, [
            "Unrealized Gains",
            "unrealized_gain",
            "unrealizedGain",
            "UnrealizedGains",
            "pnl",
            "unrealizedPnL",
          ])
        ) || CurrentValue - TotalCost || 0;

      const Sector = getFirst(row, ["Sector", "sector", "industry"]) || "N/A";

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
  }, [overviewTabData]);

  const fmt = useMemo(
    () => ({
      currency: (num) =>
        typeof num === "number" && !isNaN(num) ? num.toFixed(2) : "N/A",
      quantity: (num) =>
        typeof num === "number" && !isNaN(num) ? Math.round(num) : "N/A",
      percent: (num) =>
        typeof num === "number" && !isNaN(num) ? num.toFixed(2) + "%" : "N/A",
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true, width: 100 },
      { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true, flex: 1 },
      { headerName: "Quantity", field: "Quantity", valueFormatter: (p) => fmt.quantity(p.value), width: 120 },
      { headerName: "Currency", field: "Currency", sortable: true, filter: true, width: 100 },
      { headerName: "Avg Cost/Share", field: "Avg Cost/Share", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "CMP", field: "CMP", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "Total Cost", field: "Total Cost", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "Gain/Loss %", field: "Gain/Loss %", valueFormatter: (p) => fmt.percent(p.value), width: 130 },
      { headerName: "Allocation %", field: "AllocationPercent", valueFormatter: (p) => fmt.percent(p.value), width: 120 },
      { headerName: "Day Change (%)", field: "Day Change (%)", valueFormatter: (p) => fmt.percent(p.value), width: 120 },
      { headerName: "Day P&L", field: "Day PnL", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "Investment Date", field: "Investment Date", sortable: true, filter: true, width: 130 },
      { headerName: "Exchange", field: "Exchange", sortable: true, filter: true, width: 100 },
      { headerName: "52w High", field: "52w High", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "52w Low", field: "52w Low", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "Unrealized Gains", field: "Unrealized Gains", valueFormatter: (p) => fmt.currency(p.value), width: 130 },
      { headerName: "Sector", field: "Sector", sortable: true, filter: true, width: 120 },
    ],
    [fmt]
  );

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: 15 }}>Portfolio Overview</h2>

      {portfolioTableData.length > 0 ? (
        <>
          <div className="ag-theme-alpine" style={{ height: 550, width: "100%", marginBottom: 20 }}>
            <AgGridReact
              rowData={portfolioTableData}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              pagination
              paginationPageSize={20}
              animateRows
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <button
              onClick={() =>
                exportToCSV(
                  "portfolio_full.csv",
                  columnDefs.map((col) => col.field),
                  portfolioTableData
                )
              }
              style={styles.csvBtn}
            >
              Download Full Portfolio CSV
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No portfolio data available. Add transactions first.
        </div>
      )}
    </div>
  );
}

const styles = {
  csvBtn: {
    padding: "8px 16px",
    background: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.3s ease",
  },
};
