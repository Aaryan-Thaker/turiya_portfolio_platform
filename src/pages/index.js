// pages/index.js
import React, { useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession } from "next-auth/react";

// Tab components
import SummaryTab from "../components/tabs/SummaryTab";
import PortfolioOverviewTab from "../components/tabs/PortfolioOverviewTab";
import CapitalGainsTab from "../components/tabs/CapitalGainsTab";


// AG Grid modules
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
  themeBalham,
} from "ag-grid-community";

// Register modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule,
]);

// SSR-safe dynamic import
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

  // Capital Gains column definitions
  const capitalGainsColumns = useMemo(
    () => [
      { headerName: "Stock", field: "stock", sortable: true, filter: "agTextColumnFilter", flex: 2 },
      { headerName: "Purchase Date", field: "purchaseDate", sortable: true, filter: "agTextColumnFilter", flex: 1 },
      { headerName: "Sell Date", field: "sellDate", sortable: true, filter: "agTextColumnFilter", flex: 1 },
      { headerName: "Cost", field: "cost", sortable: true, filter: "agNumberColumnFilter", flex: 1 },
      { headerName: "Proceeds", field: "proceeds", sortable: true, filter: "agNumberColumnFilter", flex: 1 },
      { headerName: "Gain", field: "gain", sortable: true, filter: "agNumberColumnFilter", flex: 1 },
      { headerName: "Gain %", field: "gainPct", sortable: true, filter: "agNumberColumnFilter", flex: 1 },
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

      {/* Tabs */}
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
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
};

// ---- Server-side Props ----
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) return { redirect: { destination: "/auth/signin", permanent: false } };

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;

  // Portfolio API
  let portfolioData = {};
  try {
    const res = await fetch(`${backendBase}/api/portfolio`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return { props: { currentUser: null } };
    portfolioData = await res.json();
  } catch (err) {
    console.error("Error fetching portfolio:", err);
  }

  // Capital Gains API
  let capitalGainsData = [];
  try {
    const res = await fetch(`${backendBase}/api/capital_gains`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    capitalGainsData = Array.isArray(data.gains) ? data.gains : [];
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
