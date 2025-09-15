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
      currency: (num) => (typeof num === "number" && !isNaN(num) ? num.toFixed(2) : "N/A"),
      percent: (num) => (typeof num === "number" && !isNaN(num) ? num.toFixed(2) + "%" : "N/A"),
    }),
    []
  );

  const perStock = useMemo(() => {
    if (!capitalGainsData) return {};
    // handle either per_stock or perStock or capitalGains root
    return (
      capitalGainsData?.capitalGains?.per_stock ||
      capitalGainsData?.capitalGains?.perStock ||
      capitalGainsData?.per_stock ||
      capitalGainsData?.perStock ||
      {}
    );
  }, [capitalGainsData]);

  const rowData = useMemo(() => {
    return Object.entries(perStock || {}).map(([ticker, info]) => {
      const STCG = toNumber(info?.STCG ?? info?.stcg ?? info?.STcg ?? 0);
      const LTCG = toNumber(info?.LTCG ?? info?.ltcg ?? info?.LTCg ?? 0);
      const total = STCG + LTCG;
      const detailsCount = Array.isArray(info?.details) ? info.details.length : 0;
      const irrRaw = info?.IRR ?? info?.irr ?? info?.Irr ?? 0;
      // IRR from backend likely as decimal (0.12) -> show as percent
      const IRR = Math.abs(irrRaw) < 1 ? irrRaw * 100 : irrRaw;
      return {
        Ticker: ticker,
        STCG,
        LTCG,
        "Total Gain": total,
        IRR,
        DetailsCount: detailsCount,
      };
    });
  }, [perStock]);

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "Ticker", sortable: true, filter: true, resizable: true },
      { headerName: "STCG", field: "STCG", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "LTCG", field: "LTCG", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "Total Gain", field: "Total Gain", valueFormatter: (p) => fmt.currency(p.value) },
      { headerName: "IRR", field: "IRR", valueFormatter: (p) => fmt.percent(p.value) },
      { headerName: "Details Count", field: "DetailsCount" },
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
  container: { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto", fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 12, borderBottom: "1px solid #ccc", paddingBottom: 4 },
  csvBtn: { padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: 4, cursor: "pointer" },
};
