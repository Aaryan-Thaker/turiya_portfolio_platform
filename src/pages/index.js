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
      <div style={{ display: "flex", marginBottom: 25 }}>
        {[
          { key: "summary", label: "Summary" },
          { key: "overview", label: "Portfolio Overview" },
          { key: "capitalGains", label: "Capital Gains" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              marginRight: 10,
              padding: "10px 18px",
              background: activeTab === key ? "#0b7dda" : "#2196F3",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              fontWeight: activeTab === key ? "600" : "500",
              fontSize: 14,
              transition: "background 0.3s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      {renderTabContent()}
    </div>
  );
}

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
