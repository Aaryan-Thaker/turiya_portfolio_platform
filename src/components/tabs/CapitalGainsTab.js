import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { ModuleRegistry } from "ag-grid-community";
import {
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule
} from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Register all required modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  PaginationModule,
  NumberFilterModule,
  TextFilterModule
]);

const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);

import { exportToCSV } from "../exportCSV";

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function CapitalGainsTab({ currentUser }) {
  const [capitalGainsData, setCapitalGainsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugRaw, setDebugRaw] = useState(null);
  const [respMeta, setRespMeta] = useState(null);

  const fetchCapitalGains = useCallback(async (signal) => {
    if (!currentUser?.token) return;
    setLoading(true);
    setError(null);
    setRespMeta(null);
    setDebugRaw(null);

    const start = Date.now();
    try {
      const res = await fetch("/api/capital_gains", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        signal,
      });

      const duration = Date.now() - start;
      setRespMeta({ status: res.status, ok: res.ok, duration });

      const text = await res.text();
      setDebugRaw(text.slice(0, 20000));

      let data = null;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
        const msg = `Invalid JSON response (status ${res.status}). Response text: ${text.slice(0, 500)}`;
        console.error(msg, jsonErr);
        throw new Error(msg);
      }

      if (!res.ok) {
        const serverMsg = data?.error || data?.message || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      const cg = data?.capitalGains || data?.capital_gains || data?.capitalGainsData || data;

      if (!cg) throw new Error("Capital gains payload missing from server response");

      const perStock = cg?.per_stock ?? cg?.perStock ?? cg?.perStockData ?? null;

      if (!perStock || typeof perStock !== "object") {
        if (cg && typeof cg === "object" && Object.keys(cg).length > 0 && Object.values(cg).every(v => typeof v === 'object')) {
          setCapitalGainsData({ per_stock: cg, raw: cg });
        } else {
          throw new Error("Capital gains 'per_stock' structure is missing or malformed");
        }
      } else {
        setCapitalGainsData({ per_stock: perStock, raw: cg });
      }

    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("Capital gains fetch aborted");
        setError("Request timed out");
      } else {
        console.error("Error fetching capital gains:", err);
        setError(String(err.message || err));
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.token) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchCapitalGains(controller.signal);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [currentUser, fetchCapitalGains]);

  const fmt = useMemo(
    () => ({
      currency: (num) =>
        typeof num === "number" && !isNaN(num)
          ? num.toFixed(2)
          : (typeof num === 'string' && num.match(/^[0-9\.,]+$/) ? Number(num).toFixed(2) : "N/A"),
      percent: (num) =>
        typeof num === "number" && !isNaN(num)
          ? num.toFixed(2) + "%"
          : "N/A",
    }),
    []
  );

  const perStock = useMemo(() => {
    if (!capitalGainsData) return {};
    return capitalGainsData.per_stock || capitalGainsData || {};
  }, [capitalGainsData]);

  const rowData = useMemo(() => {
    try {
      if (!perStock || typeof perStock !== "object") return [];
      return Object.entries(perStock).map(([ticker, info]) => {
        info = info || {};

        const stcg = toNumber(
          info?.short_term ?? info?.shortTerm ?? info?.STCG ?? info?.stcg ?? info?.shortterm ?? info?.short_term_gain ?? info?.short_term_gains ?? (info?.short_term || info?.short)
        );
        const ltcg = toNumber(
          info?.long_term ?? info?.longTerm ?? info?.LTCG ?? info?.ltcg ?? info?.longterm ?? info?.long_term_gain ?? info?.long_term_gains ?? (info?.long_term || info?.long)
        );

        const realized = toNumber(info?.realized ?? info?.Realized ?? info?.total_realized ?? info?.totalRealized);
        const total_gain = (stcg + ltcg) || (realized || 0);

        const detailsArr = Array.isArray(info?.realized_trades) ? info.realized_trades : Array.isArray(info?.details) ? info.details : Array.isArray(info?.trades) ? info.trades : [];
        const detailsCount = detailsArr.length;

        let irrRaw = (info?.IRR ?? info?.irr ?? info?.Irr ?? info?.irrPercent ?? info?.irr_percent ?? info?.IRR_pct ?? info?.ir) || 0;
        irrRaw = toNumber(irrRaw);
        let irr = 0;
        if (Math.abs(irrRaw) < 1 && irrRaw !== 0) irr = irrRaw * 100;
        else irr = irrRaw;

        return {
          ticker,
          stcg,
          ltcg,
          total_gain,
          irr,
          details_count: detailsCount,
          _raw: info,
        };
      });
    } catch (e) {
      console.error("Error mapping perStock to rows:", e, perStock);
      return [];
    }
  }, [perStock]);

  const columnDefs = useMemo(
    () => [
      { headerName: "Ticker", field: "ticker", sortable: true, filter: "agTextColumnFilter", resizable: true },
      { headerName: "STCG", field: "stcg", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "LTCG", field: "ltcg", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "Total Gain", field: "total_gain", valueFormatter: (p) => fmt.currency(p.value), filter: "agNumberColumnFilter" },
      { headerName: "IRR", field: "irr", valueFormatter: (p) => fmt.percent(p.value), filter: "agNumberColumnFilter" },
      { headerName: "Transactions", field: "details_count", filter: "agNumberColumnFilter" },
    ],
    [fmt]
  );

  const handleRetry = () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    fetchCapitalGains(controller.signal).finally(() => clearTimeout(timeout));
  };

  if (loading) return <div style={{ padding: 20 }}>Loading capital gains...</div>;
  if (error)
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "red", marginBottom: 8 }}>Error: {error}</div>
        <button onClick={handleRetry} style={{ marginRight: 8 }}>Retry</button>
        <button onClick={() => { navigator.clipboard?.writeText(debugRaw || ""); }}>
          Copy Raw Response
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: "#444" }}>
          {respMeta ? (
            <div>Response status: {respMeta.status} — took {respMeta.duration} ms</div>
          ) : null}
          <details style={{ marginTop: 8 }}>
            <summary>Show raw server response (truncated)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{debugRaw}</pre>
          </details>
        </div>
      </div>
    );

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>Capital Gains</h2>

      {rowData.length > 0 ? (
        <>
          <div className="ag-theme-alpine" style={{ height: 400, width: "100%", marginBottom: 20 }}>
            <AgGridReact 
              rowData={rowData} 
              columnDefs={columnDefs} 
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                flex: 1,
                minWidth: 100
              }}
              pagination={true}
              paginationPageSize={10}
              domLayout="autoHeight" 
            />
          </div>

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

          <details style={{ marginTop: 16 }}>
            <summary>Debug: show raw per-stock JSON for first 10 tickers</summary>
            <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(Object.fromEntries(Object.entries(perStock).slice(0, 10)), null, 2)}</pre>
          </details>
        </>
      ) : (
        <div style={{ padding: 20, color: "#666", fontStyle: "italic" }}>
          No capital gains data available. Add some transactions first.
        </div>
      )}
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
    padding: "8px 16px",
    background: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
  },
};
