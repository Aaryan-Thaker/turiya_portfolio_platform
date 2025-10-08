// components/tabs/PortfolioOverviewTab.js
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry, themeBalham } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
} from "ag-grid-community";

import { exportToCSV } from "../exportCSV";
import { formatINR } from "../formatters";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
]);

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

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

export default function PortfolioOverviewTab({ overviewTabData }) {
  const portfolioTableData = useMemo(() => {
    if (!overviewTabData) return [];

    return overviewTabData.map((row) => {
      const Ticker =
        getFirst(row, ["Ticker", "ticker", "symbol", "stock", "code"]) || "N/A";
      const Name =
        getFirst(row, [
          "Name",
          "name",
          "shortName",
          "longName",
          "companyName",
        ]) || Ticker;
      const Quantity =
        toNumber(
          getFirst(row, ["Quantity", "quantity", "qty", "shares", "units"])
        ) || 0;
      const Currency = getFirst(row, ["Currency", "currency", "ccy"]) || "N/A";
      const AvgCost =
        toNumber(
          getFirst(row, [
            "Avg Cost/Share",
            "avg_cost",
            "avgCost",
            "avgPrice",
            "cost_basis",
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
            "marketPrice",
          ])
        ) || 0;
      const CurrentValue =
        toNumber(
          getFirst(row, [
            "Current Value",
            "current_value",
            "currentValue",
            "market_value",
            "value",
          ])
        ) ||
        Quantity * CMP ||
        0;
      const TotalCost =
        toNumber(
          getFirst(row, [
            "Total Cost",
            "total_cost",
            "totalCost",
            "cost",
          ])
        ) ||
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
        toNumber(
          getFirst(row, [
            "Day PnL",
            "day_pnl",
            "dayPnL",
            "dayChange",
            "dailyPnL",
          ])
        ) || 0;

      const InvestmentDate =
        getFirst(row, [
          "Investment Date",
          "investment_date",
          "first_buy_date",
          "firstBuyDate",
        ]) || "N/A";
      const Exchange =
        getFirst(row, ["Exchange", "exchange", "market"]) || "N/A";
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
            "pnl",
            "unrealizedPnL",
          ])
        ) ||
        CurrentValue - TotalCost ||
        0;
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

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "Ticker", sortable: true, filter: "agTextColumnFilter", resizable: true, width: 100 },
      { headerName: "Name", field: "Name", sortable: true, filter: "agTextColumnFilter", resizable: true, flex: 1 },
      { headerName: "Quantity", field: "Quantity", filter: "agNumberColumnFilter", width: 120 },
      { headerName: "Currency", field: "Currency", sortable: true, filter: "agTextColumnFilter", width: 100 },
      { headerName: "Avg Cost/Share", field: "Avg Cost/Share", cellRenderer: (p) => formatINR(p.value), width: 130 },
      { headerName: "CMP", field: "CMP", cellRenderer: (p) => formatINR(p.value), width: 130 },
      { headerName: "Current Value", field: "Current Value", cellRenderer: (p) => formatINR(p.value), width: 130 },
      { headerName: "Total Cost", field: "Total Cost", cellRenderer: (p) => formatINR(p.value), width: 130 },
      { headerName: "Gain/Loss %", field: "Gain/Loss %", cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }), width: 130 },
      { headerName: "Allocation %", field: "AllocationPercent", valueFormatter: (p) => `${p.value?.toFixed(2) || 0}%`, width: 120 },
      { headerName: "Day Change (%)", field: "Day Change (%)", cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }), width: 120 },
      { headerName: "Day P&L", field: "Day PnL", cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }), width: 130 },
      { headerName: "Investment Date", field: "Investment Date", sortable: true, filter: "agTextColumnFilter", width: 130 },
      { headerName: "Exchange", field: "Exchange", sortable: true, filter: "agTextColumnFilter", width: 100 },
      { headerName: "52w High", field: "52w High", cellRenderer: (p) => formatINR(p.value), width: 130 },
      { headerName: "52w Low", field: "52w Low", cellRenderer: (p) => formatINR(p.value), width: 130 },
      { headerName: "Unrealized Gains", field: "Unrealized Gains", cellRenderer: (p) => formatINR(p.value, { showColor: true, showArrow: true }), width: 130 },
      { headerName: "Sector", field: "Sector", sortable: true, filter: "agTextColumnFilter", width: 120 },
    ],
    []
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Portfolio Overview</h2>
      {portfolioTableData.length > 0 ? (
        <>
          <div style={styles.gridWrapper}>
            <AgGridReact
              rowData={portfolioTableData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                flex: 1,
                minWidth: 100,
              }}
              pagination
              paginationPageSize={20}
              domLayout="autoHeight"
              animateRows
              theme={themeBalham}
            />
          </div>

          <div style={styles.csvContainer}>
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
        <div style={styles.emptyText}>
          No portfolio data available. Add transactions first.
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    maxWidth: 1400,
    margin: "0 auto",
    fontSize: 14,
  },
  title: { marginBottom: 15 },
  gridWrapper: {
    width: "100%",
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  csvContainer: { textAlign: "center", marginBottom: 30 },
  csvBtn: {
    padding: "8px 16px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  emptyText: { padding: 20, color: "#666", fontStyle: "italic" },
};
