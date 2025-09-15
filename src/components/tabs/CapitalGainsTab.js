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

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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
      currency: (num) =>
        typeof num === "number" && !isNaN(num) ? num.toFixed(2) : "N/A",
      percent: (num) =>
        typeof num === "number" && !isNaN(num)
          ? num.toFixed(2) + "%"
          : "N/A",
    }),
    []
  );

  // Extract per_stock block
  const perStock = useMemo(() => {
    return capitalGainsData?.per_stock || {};
  }, [capitalGainsData]);

  const rowData = useMemo(() => {
    return Object.entries(perStock || {}).map(([ticker, info]) => {
      const stcg = toNumber(info?.stcg);
      const ltcg = toNumber(info?.ltcg);
      const total = stcg + ltcg;
      const detailsCount = Array.isArray(info?.details)
        ? info.details.length
        : 0;
      const irrRaw = toNumber(info?.irr);
      // irr from backend is decimal (0.12) → display as %
      const irr = Math.abs(irrRaw) < 1 ? irrRaw * 100 : irrRaw;

      return {
        ticker,
        stcg,
        ltcg,
        total_gain: total,
        irr,
        details_count: detailsCount,
      };
    });
  }, [perStock]);

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "ticker", sortable: true, filter: true, resizable: true },
      { headerName: "STCG", field: "stcg", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "LTCG", field: "ltcg", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Total Gain", field: "total_gain", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "IRR", field: "irr", valueFormatter: (p) => fmt.percent(p.value) },
      { headerName: "Transactions", field: "details_count" },
    ],
    [fmt]
  );

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
              columnDefs.map((c) => c.field),
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
  container: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    maxWidth: 1200,
    margin: "0 auto",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
    borderBottom: "1px solid #ccc",
    paddingBottom: 4,
  },
  csvBtn: {
    padding: "6px 12px",
    background: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
};
