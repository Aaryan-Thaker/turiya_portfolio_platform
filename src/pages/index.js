// pages/index.js
import React, { useState } from "react";
import Nav from "./Nav";
import { getSession } from "next-auth/react";

// Import tab components
import SummaryTab from "../components/tabs/SummaryTab";
import PortfolioOverviewTab from "../components/tabs/PortfolioOverviewTab";
import CapitalGainsTab from "../components/tabs/CapitalGainsTab";

// ✅ AG Grid styles
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// ✅ AG Grid modules
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";

// Register AG Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule]);

export default function PortfolioPage({
  currentUser,
  marketData,
  totalValue,
  totalCost,
  totalGain,
  totalGainPct,
  overviewTabData,
  summaryTabData,
  top5GainersDaily,
  top5LosersDaily,
  portfolioXIRR,
  latestRiskAssessment,
  capitalGainsData,
  errorMessage,
}) {
  const [activeTab, setActiveTab] = useState("summary");

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
            summaryData={summaryTabData}
            topGainers={top5GainersDaily}
            topLosers={top5LosersDaily}
            portfolioXIRR={portfolioXIRR}
            latestRiskAssessment={latestRiskAssessment}
          />
        );
      case "overview":
        return <PortfolioOverviewTab overviewData={overviewTabData} />;
      case "capitalGains":
        return <CapitalGainsTab capitalGainsData={capitalGainsData} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto", padding: 20, fontSize: 14 }}>
      <Nav user={currentUser} />

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...styles.tabButton,
              background: activeTab === key ? "#0b7dda" : "#f0f0f0",
              color: activeTab === key ? "#fff" : "#333",
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
  tabContainer: {
    display: "flex",
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    overflow: "hidden",
    marginBottom: 30,
  },
  tabButton: {
    flex: 1,
    padding: "12px 24px",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    transition: "background 0.3s ease, color 0.3s ease",
  },
  tabContent: {
    padding: 10,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
};

// ---- Server-side Props ----
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) {
    return { redirect: { destination: "/auth/signin", permanent: false } };
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;

  // ---- Portfolio API ----
  const portfolioUrl = `${backendBase}/api/portfolio`;
  let portfolioData = {};
  try {
    const res = await fetch(portfolioUrl, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return { props: { currentUser: null } };
    portfolioData = await res.json();
  } catch (err) {
    console.error("Error fetching portfolio:", err);
    portfolioData = {};
  }

  // ---- Capital Gains API ----
  const capitalGainsUrl = `${backendBase}/api/capital_gains`;
  let capitalGainsData = {};
  try {
    const res = await fetch(capitalGainsUrl, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
    capitalGainsData = await res.json();
  } catch (err) {
    console.error("Error fetching capital gains:", err);
    capitalGainsData = {};
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
      summaryTabData: portfolioData.summaryTabData || [],
      top5GainersDaily: portfolioData.top5GainersDaily || [],
      top5LosersDaily: portfolioData.top5LosersDaily || [],
      portfolioXIRR: portfolioData.portfolioXIRR || 0,
      latestRiskAssessment: portfolioData.latestRiskAssessment || null,
      capitalGainsData: capitalGainsData.success ? capitalGainsData : {},
      errorMessage: portfolioData.error || null,
    },
  };
}
