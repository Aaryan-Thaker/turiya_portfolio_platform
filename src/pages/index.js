// pages/index.js
import React, { useState, useEffect } from "react";
import Nav from "./Nav";
import { getSession } from "next-auth/react";

// Import tab components
import SummaryTab from "../components/tabs/SummaryTab";
import PortfolioOverviewTab from "../components/tabs/PortfolioOverviewTab";
import CapitalGainsTab from "../components/tabs/CapitalGainsTab";

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
  const [activeTab, setActiveTab] = useState("summary");

  useEffect(() => {
    console.log("Market Data:", marketData);
  }, [marketData]);

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
            portfolioTableData={portfolioTableData}
          />
        );
      case "overview":
        return <PortfolioOverviewTab portfolioTableData={portfolioTableData} />;
      case "capitalGains":
        return <CapitalGainsTab portfolioTableData={portfolioTableData} />;
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
      <div style={styles.tabContent}>
        {renderTabContent()}
      </div>
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
  const backendUrl = `${backendBase}/api/portfolio`;

  let data = {};
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { props: { currentUser: null } };
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
