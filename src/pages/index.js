// pages/index.js
import React, { useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";
import { getToken } from "next-auth/jwt";

// Tabs
import SummaryTab from "../components/tabs/SummaryTab";
import PortfolioOverviewTab from "../components/tabs/PortfolioOverviewTab";
import CapitalGainsTab from "../components/tabs/CapitalGainsTab";
import { formatINR } from "../components/formatters"; // ✅ Unified formatter

// AG Grid
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
  themeBalham,
} from "ag-grid-community";

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

export default function PortfolioPage(props) {
  const {
    currentUser,
    marketData,
    totalValue,
    totalCost,
    totalGain,
    totalGainPct,
    overviewTabData,
    capitalGainsData,
    errorMessage,
  } = props;

  const [activeTab, setActiveTab] = useState("summary");
  const gridRef = useRef(null);

  const handleExportCSV = useCallback(() => {
    if (gridRef.current?.api) gridRef.current.api.exportDataAsCsv();
  }, []);

  // ✅ Safely format capital gains data
  const capitalGainsColumns = useMemo(
    () => [
      { headerName: "Stock", field: "stock", sortable: true, filter: "agTextColumnFilter", flex: 2 },
      { headerName: "Purchase Date", field: "purchaseDate", sortable: true, filter: "agTextColumnFilter", flex: 1 },
      { headerName: "Sell Date", field: "sellDate", sortable: true, filter: "agTextColumnFilter", flex: 1 },
      {
        headerName: "Cost",
        field: "cost",
        sortable: true,
        filter: "agNumberColumnFilter",
        flex: 1,
        valueFormatter: (p) =>
          Number.isFinite(Number(p.value)) ? formatINR(p.value) : "N/A",
      },
      {
        headerName: "Proceeds",
        field: "proceeds",
        sortable: true,
        filter: "agNumberColumnFilter",
        flex: 1,
        valueFormatter: (p) =>
          Number.isFinite(Number(p.value)) ? formatINR(p.value) : "N/A",
      },
      {
        headerName: "Gain",
        field: "gain",
        sortable: true,
        filter: "agNumberColumnFilter",
        flex: 1,
        cellRenderer: (p) => {
          const val = Number(p.value);
          if (!Number.isFinite(val)) return <span style={{ color: "#666" }}>N/A</span>;
          return formatINR(val, { showColor: true, showArrow: true });
        },
      },
      {
        headerName: "Gain %",
        field: "gainPct",
        sortable: true,
        filter: "agNumberColumnFilter",
        flex: 1,
        cellRenderer: (p) => {
          const raw = p?.value;
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            return <span style={{ color: "#666" }}>N/A</span>;
          }
          const color = num >= 0 ? "green" : "red";
          const arrow = num >= 0 ? "▲" : "▼";
          return (
            <span style={{ color }}>
              {num.toFixed(2)}% {arrow}
            </span>
          );
        },
      },
    ],
    []
  );

  if (errorMessage) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        <h1>Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  const tabs = [
    { key: "summary", label: "Summary" },
    { key: "overview", label: "Portfolio Overview" },
    { key: "capitalGains", label: "Capital Gains" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return (
          <SummaryTab
            marketData={marketData}
            totalValue={totalValue}
            totalCost={totalCost}
            totalGain={totalGain}
            totalGainPct={totalGainPct}
            portfolioTableData={overviewTabData}
          />
        );
      case "overview":
        return <PortfolioOverviewTab overviewTabData={overviewTabData} />;
      case "capitalGains":
        return (
          <CapitalGainsTab
            gridRef={gridRef}
            capitalGainsData={capitalGainsData}
            capitalGainsColumns={capitalGainsColumns}
            handleExportCSV={handleExportCSV}
            theme={themeBalham}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: 1400,
        margin: "0 auto",
        padding: 20,
        fontSize: 14,
      }}
    >
      <Nav user={currentUser} />

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...styles.tabButton,
              borderBottom: activeTab === key ? "3px solid #0b7dda" : "3px solid transparent",
              color: activeTab === key ? "#0b7dda" : "#555",
              fontWeight: activeTab === key ? 600 : 500,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>{renderTabContent()}</div>
    </div>
  );
}

// ---- Styles ----
const styles = {
  tabBar: {
    display: "flex",
    gap: 32,
    borderBottom: "1px solid #e5e7eb",
    marginBottom: 24,
    paddingLeft: 8,
  },
  tabButton: {
    background: "transparent",
    border: "none",
    padding: "12px 4px",
    fontSize: 15,
    cursor: "pointer",
    transition: "color 0.3s ease, border-bottom 0.3s ease",
  },
  tabContent: {
    padding: 16,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
};

// ---- Server-side Props ----
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const jwt = await getToken({ req: context.req });
  const token = jwt?.accessToken || jwt?.idToken || "";

  if (!session || !token)
    return { redirect: { destination: "/auth/signin", permanent: false } };

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_API_URL || process.env.BACKEND_URL || `${protocol}://${host}`;

  let portfolioData = {};
  try {
    const res = await fetch(`${backendBase}/api/portfolio`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return { props: { currentUser: null } };
    portfolioData = await res.json();
  } catch (err) {
    console.error("Error fetching portfolio:", err);
  }

  let capitalGainsData = [];
  try {
    const res = await fetch(`${backendBase}/api/capital_gains`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    capitalGainsData = data.capitalGains || [];
  } catch (err) {
    console.error("Error fetching capital gains:", err);
  }

  const currentUser = {
    id: portfolioData?.current_user?.id || "guest",
    email: portfolioData?.current_user?.email || "",
    is_authenticated: portfolioData?.current_user?.is_authenticated || false,
  };

  return {
    props: {
      currentUser,
      marketData: portfolioData.marketData || {},
      totalValue: portfolioData.totalValue || 0,
      totalCost: portfolioData.totalCost || 0,
      totalGain: portfolioData.totalGain || 0,
      totalGainPct: portfolioData.totalGainPercent || 0,
      overviewTabData: portfolioData.overviewTabData || [],
      capitalGainsData,
      errorMessage: portfolioData.error || null,
    },
  };
}
