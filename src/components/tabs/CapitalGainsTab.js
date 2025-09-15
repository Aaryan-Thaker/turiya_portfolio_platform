// components/tabs/CapitalGainsTab.js
import React, { useState, useEffect, useMemo } from "react";
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

export default function CapitalGainsTab({ currentUser }) {
  const [capitalGainsData, setCapitalGainsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch capital gains data
  useEffect(() => {
    if (!currentUser?.token) return;

    const fetchData = async () => {
      try {
        const res = await fetch("/api/capital_gains", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCapitalGainsData(data);
      } catch (err) {
        console.error("Error fetching capital gains:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const fmt = useMemo(
    () => ({
      currency: (num) => (typeof num === "number" ? num.toFixed(2) : "N/A"),
      quantity: (num) => (typeof num === "number" ? Math.round(num) : "N/A"),
      percent: (num) => (typeof num === "number" ? num.toFixed(2) + "%" : "N/A"),
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "ticker", sortable: true, filter: true },
      { headerName: "Quantity", field: "quantity", valueFormatter: (p) => fmt.quantity(p.value) },
      { headerName: "Avg Cost/Share", field: "avg_cost", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Current Value", field: "current_value", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Unrealized Gain", field: "unrealized_gain", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Gain %", field: "gain_pct", valueFormatter: (p) => fmt.percent(p.value) },
    ],
    [fmt]
  );

  const rowData = useMemo(() => {
    if (!capitalGainsData || !capitalGainsData.perStock) return [];
    return Object.values(capitalGainsData.perStock);
  }, [capitalGainsData]);

  if (loading) return <div style={{ padding: 20 }}>Loading capital gains...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Capital Gains</h2>

      {rowData.length > 0 && (
        <div className="ag-theme-alpine" style={{ height: 400, marginBottom: 20 }}>
          <AgGridReact rowData={rowData} columnDefs={columnDefs} domLayout="autoHeight" />
        </div>
      )}

      {rowData.length > 0 && (
        <button
          onClick={() =>
            exportToCSV(
              "capital_gains.csv",
              ["ticker", "quantity", "avg_cost", "current_value", "unrealized_gain", "gain_pct"],
              rowData
            )
          }
          style={styles.csvBtn}
        >
          Download CSV
        </button>
      )}

      {rowData.length === 0 && <div>No capital gains data available.</div>}
    </div>
  );
}

const styles = {
  container: { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto", fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12, borderBottom: "1px solid #ccc", paddingBottom: 4 },
  csvBtn: { padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: 4, cursor: "pointer" },
};
