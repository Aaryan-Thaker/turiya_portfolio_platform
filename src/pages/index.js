// pages/index.js
import React, { useState, useEffect, useMemo, useRef } from "react";
import Nav from "./Nav";
import dynamic from "next/dynamic";
import { getSession } from "next-auth/react";
import { exportToCSV } from "../components/exportCSV";

// Charts (plotly) - client-side only
const StockPie = dynamic(
  () => import("../components/Charts").then((mod) => mod.StockPie),
  { ssr: false }
);
const SectorPie = dynamic(
  () => import("../components/Charts").then((mod) => mod.SectorPie),
  { ssr: false }
);
const TreemapChart = dynamic(
  () => import("../components/Charts").then((mod) => mod.TreemapChart),
  { ssr: false }
);

// AG Grid - client side
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((m) => m.AgGridReact),
  { ssr: false }
);

// utility: safe number parse
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function PortfolioPage({
  currentUser,
  marketData,
  totalValue,
  totalCost,
  totalGain,
  totalGainPct,
  portfolioTableData,
  errorMessage,
}) {
  // Tabs
  const [activeTab, setActiveTab] = useState("summary");

  // AG Grid state refs
  const overviewGridRef = useRef(null);

  // derive portfolio rows into normalized objects for consistent access
  const normalizedRows = useMemo(() => {
    const rows = Array.isArray(portfolioTableData) ? portfolioTableData : [];
    return rows.map((r) => {
      // common key name fallbacks
      const qty = num(r["Quantity"] ?? r["Qty"] ?? r.qty ?? 0);
      const avgBuy =
        num(
          r["Avg Cost/Share"] ??
            r["Avg Buy Price"] ??
            r["AvgPrice"] ??
            r.avg_buy_price ??
            0
        ) || 0;
      const invested =
        num(r["Total Cost"] ?? r["Invested Amount"] ?? r.invested ?? 0) || 0;
      const ltp = num(r["CMP"] ?? r["LTP"] ?? r.ltp ?? r.current_price ?? 0) || 0;
      // day change percent: prefer numeric percent in fraction or percent-form
      let dayChangePct =
        num(
          r["Day Change(%)"] ??
            r["Day Change %"] ??
            r["Day Change"] ??
            r.day_change_pct ??
            r.day_change
        ) || 0;
      // If it's expressed as decimal (0.01), convert to percent if small
      if (Math.abs(dayChangePct) <= 1 && dayChangePct !== 0) {
        // ambiguous: but many APIs give fraction; assume it's already percent if >1
        dayChangePct = dayChangePct * 100;
      }
      const daysPL =
        num(
          r["Day's P&L"] ??
            r["Days P&L"] ??
            r["DaysPL"] ??
            r.days_pl ??
            (qty * (ltp - avgBuy))
        ) || 0;
      const currentValue = num(r["Current Value"] ?? r.current_value ?? qty * ltp);
      const unrealized =
        num(r["Unrealized Gains"] ?? r.unrealized_gains ?? currentValue - invested);
      const unrealizedPct = currentValue ? (unrealized / currentValue) * 100 : 0;

      return {
        raw: r,
        Ticker: r["Ticker"] ?? r.symbol ?? r.ticker ?? "",
        Name: r["Name"] ?? r.name ?? "",
        Quantity: qty,
        "Avg Buy Price": avgBuy,
        "Invested Amount": invested,
        LTP: ltp,
        "Day Change(%)": dayChangePct,
        "Day's P&L": daysPL,
        "Current Value": currentValue,
        "Unrealized P&L": unrealized,
        "Unrealized P&L(%)": unrealizedPct,
        Currency: r["Currency"] ?? r.currency ?? "INR",
        AllocationPercent: num(r["AllocationPercent"] ?? r.allocation_percent ?? 0),
        "Investment Date": r["Investment Date"] ?? r.investment_date ?? "",
        Exchange: r["Exchange"] ?? r.exchange ?? "",
        "52w High": r["52w High"] ?? r.high_52w ?? 0,
        "52w Low": r["52w Low"] ?? r.low_52w ?? 0,
        "Gain/Loss": num(r["Gain/Loss"] ?? r.gain_loss ?? currentValue - invested),
        "Gain/Loss %": (() => {
          const gl = num(r["Gain/Loss"] ?? r.gain_loss ?? currentValue - invested);
          return invested ? (gl / invested) * 100 : 0;
        })(),
        Sector: r["Sector"] ?? r.sector ?? "Other",
      };
    });
  }, [portfolioTableData]);

  // Top 5 gainers/losers (day & all-time)
  const topDayGainers = useMemo(() => {
    return [...normalizedRows]
      .sort((a, b) => num(b["Day's P&L"]) - num(a["Day's P&L"]))
      .slice(0, 5);
  }, [normalizedRows]);

  const topDayLosers = useMemo(() => {
    return [...normalizedRows]
      .sort((a, b) => num(a["Day's P&L"]) - num(b["Day's P&L"]))
      .slice(0, 5);
  }, [normalizedRows]);

  const topAllTimeGainers = useMemo(() => {
    return [...normalizedRows]
      .sort((a, b) => num(b["Gain/Loss"]) - num(a["Gain/Loss"]))
      .slice(0, 5);
  }, [normalizedRows]);

  const topAllTimeLosers = useMemo(() => {
    return [...normalizedRows]
      .sort((a, b) => num(a["Gain/Loss"]) - num(b["Gain/Loss"]))
      .slice(0, 5);
  }, [normalizedRows]);

  // Capital gains table (basic): compute per-row realized placeholder (no tax)
  const capitalGainsRows = useMemo(() => {
    return normalizedRows.map((r) => {
      const realized = 0; // placeholder - depends on transactions (we don't have realized here)
      return {
        Ticker: r.Ticker,
        Quantity: r.Quantity,
        Invested: r["Invested Amount"],
        CurrentValue: r["Current Value"],
        Unrealized: r["Unrealized P&L"],
        UnrealizedPct: r["Unrealized P&L(%)"],
        Realized: realized,
      };
    });
  }, [normalizedRows]);

  useEffect(() => {
    // debug prints for dev
    // console.log("Normalized rows:", normalizedRows);
  }, [normalizedRows]);

  if (errorMessage) {
    return (
      <div style={{ padding: "20px", color: "red", paddingTop: 80 }}>
        <h1>Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  // small formatters
  const fmt = {
    currency: (n) => {
      const v = Number(n);
      return Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A";
    },
    qty: (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : "N/A"),
    pct: (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) + "%" : "N/A"),
  };

  // AG Grid column definitions for Overview
  const overviewCols = useMemo(() => {
    const c = [
      { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true, width: 110 },
      { headerName: "Name", field: "Name", sortable: true, filter: true, resizable: true, flex: 1 },
      { headerName: "Qty", field: "Quantity", sortable: true, filter: true, resizable: true, width: 100, valueFormatter: (p) => fmt.qty(p.value) },
      { headerName: "Avg Buy Price", field: "Avg Buy Price", sortable: true, filter: true, resizable: true, width: 140, valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Invested Amount", field: "Invested Amount", sortable: true, filter: true, resizable: true, width: 150, valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "LTP", field: "LTP", sortable: true, filter: true, resizable: true, width: 120, valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Day Change(%)", field: "Day Change(%)", sortable: true, filter: true, resizable: true, width: 140, valueFormatter: (p) => fmt.pct(p.value) },
      { headerName: "Day's P&L", field: "Day's P&L", sortable: true, filter: true, resizable: true, width: 130, valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Current Value", field: "Current Value", sortable: true, filter: true, resizable: true, width: 150, valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Unrealized P&L", field: "Unrealized P&L", sortable: true, filter: true, resizable: true, width: 140, valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Unrealized P&L(%)", field: "Unrealized P&L(%)", sortable: true, filter: true, resizable: true, width: 150, valueFormatter: (p) => fmt.pct(p.value) },
      { headerName: "Allocation%", field: "AllocationPercent", sortable: true, filter: true, resizable: true, width: 120, valueFormatter: (p) => fmt.pct(p.value) },
      { headerName: "Sector", field: "Sector", sortable: true, filter: true, resizable: true, width: 160 },
    ];
    return c;
  }, [fmt]);

  // small AG Grid default col def
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // small helper to open csv export of overview
  const handleExportOverviewCSV = () => {
    const headers = ["Ticker", "Name", "Qty", "Avg Buy Price", "Invested Amount", "LTP", "Day Change(%)", "Day's P&L", "Current Value", "Unrealized P&L", "Unrealized P&L(%)", "Allocation%", "Sector"];
    exportToCSV("portfolio_overview.csv", headers, normalizedRows);
  };

  // page layout top padding to avoid sticky nav overlap
  const pageStyle = {
    fontFamily: "Arial, sans-serif",
    maxWidth: 1400,
    margin: "0 auto",
    padding: 20,
    fontSize: 13,
    paddingTop: 80, // ensure nav doesn't overlap content
  };

  return (
    <div style={pageStyle}>
      <Nav user={currentUser} />
      <h1 style={{ marginTop: 0 }}>Portfolio</h1>

      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        {[
          { key: "summary", label: "Summary" },
          { key: "overview", label: "Portfolio Overview" },
          { key: "capital", label: "Capital Gains" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: activeTab === t.key ? "#0b7dda" : "#e6f2fb",
              color: activeTab === t.key ? "#fff" : "#0b7dda",
              fontWeight: activeTab === t.key ? "600" : "500",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "summary" && (
        <>
          {/* Market summary */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: 12,
            background: "#f8f8f8",
            borderRadius: 6,
          }}>
            {["nasdaq", "sp500", "dow"].map((index) => {
              const data = marketData?.[index];
              if (!data || data.price === undefined) {
                return (
                  <div key={index} style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontWeight: "bold" }}>{index.toUpperCase()}</div>
                    <div style={{ fontSize: 14, color: "#888" }}>Data unavailable</div>
                  </div>
                );
              }
              const positive = data.change >= 0;
              return (
                <div key={index} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontWeight: "bold" }}>{index.toUpperCase()}</div>
                  <div style={{ fontWeight: "bold", fontSize: 16 }}>{num(data.price).toFixed(2)}</div>
                  <div style={{ fontSize: 14, color: positive ? "#006400" : "#8B0000" }}>
                    {num(data.change).toFixed(2)} ({fmt.pct(num(data.change_pct) * 100)})
                  </div>
                </div>
              );
            })}
          </div>

          {/* Portfolio summary metrics */}
          <div style={{
            display: "flex",
            gap: 12,
            marginBottom: 18,
            padding: 12,
            background: "#f8f8f8",
            borderRadius: 6,
            alignItems: "center",
          }}>
            <SummaryItem label="Total Current Value" value={fmt.currency(totalValue)} />
            <SummaryItem label="Total Investment Cost" value={fmt.currency(totalCost)} />
            <SummaryItem label="Total Unrealized Gain/Loss" value={`${fmt.currency(totalGain)} (${fmt.pct(totalGainPct)})`} positive={num(totalGainPct) > 0} />
            <div style={{ marginLeft: "auto" }}>
              {normalizedRows?.length > 0 && (
                <button onClick={handleExportOverviewCSV} style={{ padding: "6px 12px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  Download Portfolio CSV
                </button>
              )}
            </div>
          </div>

          {/* Top gainers/losers grid + graphs */}
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Left column: top lists */}
            <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fff", padding: 12, borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight: "600", marginBottom: 8 }}>Top 5 Gainers (Today)</div>
                <div className="ag-theme-alpine" style={{ height: 220, width: "100%" }}>
                  <AgGridReact
                    rowData={topDayGainers}
                    columnDefs={[
                      { headerName: "Ticker", field: "Ticker", width: 100 },
                      { headerName: "Day P&L", field: "Day's P&L", valueFormatter: (p) => fmt.currency(p.value), width: 120 },
                      { headerName: "Day %", field: "Day Change(%)", valueFormatter: (p) => fmt.pct(p.value), width: 110 },
                      { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                    ]}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    suppressHorizontalScroll
                  />
                </div>
              </div>

              <div style={{ background: "#fff", padding: 12, borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight: "600", marginBottom: 8 }}>Top 5 Losers (Today)</div>
                <div className="ag-theme-alpine" style={{ height: 220, width: "100%" }}>
                  <AgGridReact
                    rowData={topDayLosers}
                    columnDefs={[
                      { headerName: "Ticker", field: "Ticker", width: 100 },
                      { headerName: "Day P&L", field: "Day's P&L", valueFormatter: (p) => fmt.currency(p.value), width: 120 },
                      { headerName: "Day %", field: "Day Change(%)", valueFormatter: (p) => fmt.pct(p.value), width: 110 },
                      { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                    ]}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    suppressHorizontalScroll
                  />
                </div>
              </div>

              <div style={{ background: "#fff", padding: 12, borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight: "600", marginBottom: 8 }}>Top 5 Gainers (All-time)</div>
                <div className="ag-theme-alpine" style={{ height: 220, width: "100%" }}>
                  <AgGridReact
                    rowData={topAllTimeGainers}
                    columnDefs={[
                      { headerName: "Ticker", field: "Ticker", width: 100 },
                      { headerName: "Gain/Loss", field: "Gain/Loss", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                      { headerName: "Gain %", field: "Gain/Loss %", valueFormatter: (p) => fmt.pct(p.value), width: 110 },
                      { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), width: 120 },
                    ]}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    suppressHorizontalScroll
                  />
                </div>
              </div>

              <div style={{ background: "#fff", padding: 12, borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontWeight: "600", marginBottom: 8 }}>Top 5 Losers (All-time)</div>
                <div className="ag-theme-alpine" style={{ height: 220, width: "100%" }}>
                  <AgGridReact
                    rowData={topAllTimeLosers}
                    columnDefs={[
                      { headerName: "Ticker", field: "Ticker", width: 100 },
                      { headerName: "Gain/Loss", field: "Gain/Loss", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                      { headerName: "Gain %", field: "Gain/Loss %", valueFormatter: (p) => fmt.pct(p.value), width: 110 },
                      { headerName: "Current Value", field: "Current Value", valueFormatter: (p) => fmt.currency(p.value), width: 120 },
                    ]}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                    suppressHorizontalScroll
                  />
                </div>
              </div>
            </div>

            {/* Right column: graphs side-by-side */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: "#fff", padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Portfolio Breakdown</div>
                  <StockPie data={portfolioTableData} />
                </div>

                <div style={{ flex: 1, background: "#fff", padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Sector Distribution</div>
                  <SectorPie data={portfolioTableData} />
                </div>
              </div>

              <div style={{ background: "#fff", padding: 12, borderRadius: 6 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Holdings Treemap (by Sector)</div>
                <TreemapChart data={portfolioTableData} />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "overview" && (
        <>
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Portfolio Overview</h2>
            <div style={{ marginLeft: "auto" }}>
              <button onClick={handleExportOverviewCSV} style={{ padding: "6px 12px", background: "#4CAF50", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Download CSV
              </button>
            </div>
          </div>

          <div className="ag-theme-alpine" style={{ height: 600, width: "100%" }}>
            <AgGridReact
              ref={overviewGridRef}
              rowData={normalizedRows}
              columnDefs={overviewCols}
              defaultColDef={defaultColDef}
              rowSelection="single"
              animateRows
            />
          </div>
        </>
      )}

      {activeTab === "capital" && (
        <>
          <h2>Capital Gains (basic view)</h2>
          <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", width: 260 }}>
              <div style={{ fontWeight: 600 }}>Performance Metrics</div>
              <div style={{ marginTop: 8 }}>
                <div>Current Value: <strong>{fmt.currency(totalValue)}</strong></div>
                <div>Investment Cost: <strong>{fmt.currency(totalCost)}</strong></div>
                <div>Unrealized Gain/Loss: <strong>{fmt.currency(totalGain)} ({fmt.pct(totalGainPct)})</strong></div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div className="ag-theme-alpine" style={{ height: 420, width: "100%" }}>
                <AgGridReact
                  rowData={capitalGainsRows}
                  columnDefs={[
                    { headerName: "Ticker", field: "Ticker", width: 120 },
                    { headerName: "Qty", field: "Quantity", width: 100, valueFormatter: (p) => fmt.qty(p.value) },
                    { headerName: "Invested", field: "Invested", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                    { headerName: "Current Value", field: "CurrentValue", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                    { headerName: "Unrealized", field: "Unrealized", valueFormatter: (p) => fmt.currency(p.value), width: 140 },
                    { headerName: "Unrealized %", field: "UnrealizedPct", valueFormatter: (p) => fmt.pct(p.value), width: 130 },
                    { headerName: "Realized (placeholder)", field: "Realized", valueFormatter: (p) => fmt.currency(p.value), width: 150 },
                  ]}
                  defaultColDef={defaultColDef}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryItem({ label, value, positive }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ color: "#666", fontSize: 13 }}>{label}</div>
      <div
        style={{
          fontWeight: "bold",
          fontSize: 18,
          color: positive ? "#006400" : positive === false ? "#8B0000" : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// Server-side: use NextAuth session (session.accessToken)
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;
  const backendUrl = `${backendBase}/api/portfolio`;

  let data = {};
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return {
        props: {
          currentUser: null,
        },
      };
    }

    data = await res.json();
  } catch (err) {
    console.error("Error fetching portfolio:", err);
    data = {};
  }

  const currentUser = {
    id: data?.current_user?.id || "guest",
    email: data?.current_user?.email || "",
    is_authenticated: data?.current_user?.is_authenticated || false,
  };

  return {
    props: {
      currentUser,
      marketData: data.marketData || {},
      totalValue: data.totalValue || 0,
      totalCost: data.totalCost || 0,
      totalGain: data.totalGain || 0,
      totalGainPct: data.totalGainPercent || 0,
      portfolioTableData: data.portfolioTableData || [],
      errorMessage: data?.error || null,
    },
  };
}
