// pages/transactions.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession, useSession, signIn } from "next-auth/react";
import BulkTransactionUpload from "@/components/BulkTransactionUpload";

// AG Grid (client-only)
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((m) => m.AgGridReact),
  { ssr: false }
);

export default function TransactionsPage({
  user,
  transactionsData,
  stockPerformanceData,
  realizedGainsTotal,
  portfolioIrr,
  error: initialError,
}) {
  const { data: session, status } = useSession();
  const [type, setType] = useState("Buy");
  const [stock, setStock] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(initialError || "");
  const [transactions, setTransactions] = useState(transactionsData || []);

  const txApiPath = "/api/transactions";
  const clearApiPath = "/api/clear_transactions";
  const validateTickerPath = "/api/stock/validate"; // backend endpoint to implement

  const gridRef = useRef(null);

  const getClientToken = () => session?.accessToken || "";

  // --- Validate ticker exists (server-side lookup)
  async function validateTicker(ticker) {
    if (!ticker) return false;
    try {
      const token = getClientToken();
      const url = `${validateTickerPath}?ticker=${encodeURIComponent(ticker)}`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return !!data?.valid;
    } catch (err) {
      console.warn("Ticker validation failed:", err);
      return false;
    }
  }

  // --- Manual Add Transaction ---
  async function handleAddTransaction(e) {
    e.preventDefault();
    setError("");

    if (!stock || !quantity || !price || !date) {
      setError("Please fill in all fields.");
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    const priceNum = parseFloat(price);

    if (isNaN(qtyNum) || isNaN(priceNum) || qtyNum <= 0 || priceNum <= 0) {
      setError("Quantity and price must be positive numbers.");
      return;
    }

    const symbol = stock.toUpperCase();
    setError("Validating ticker...");
    const validTicker = await validateTicker(symbol);
    if (!validTicker) {
      setError(`Ticker "${symbol}" not found. Please check the symbol and try again.`);
      return;
    }

    try {
      if (status !== "authenticated") {
        await signIn("google", { callbackUrl: window.location.href });
        return;
      }

      const token = getClientToken();
      if (!token) {
        const s = await getSession();
        if (!s?.accessToken) {
          await signIn("google", { callbackUrl: window.location.href });
          return;
        }
      }

      const res = await fetch(txApiPath, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          stock: symbol,
          quantity: qtyNum,
          price: priceNum,
          date,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          await signIn("google", { callbackUrl: window.location.href });
          return;
        }
        setError(data.error || "Failed to add transaction.");
        return;
      }

      await fetchTransactions(); // auto-refresh table
      setType("Buy");
      setStock("");
      setQuantity("");
      setPrice("");
      setDate("");
    } catch (err) {
      console.error("Add transaction error", err);
      setError("An unexpected error occurred.");
    }
  }

  // --- Fetch Transactions ---
  async function fetchTransactions() {
    try {
      if (status === "unauthenticated") {
        await signIn("google", { callbackUrl: window.location.href });
        return;
      }
      if (status === "loading") return;

      const token =
        getClientToken() || (await (await getSession())?.accessToken) || "";

      const res = await fetch(txApiPath, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401) {
        await signIn("google", { callbackUrl: window.location.href });
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTransactions(data.transactions || []);
        setError("");
      } else {
        setTransactions(data.transactions || []); // still show whatever we have
        setError(data.error || "");
      }
    } catch (err) {
      console.error("fetchTransactions error", err);
      setError("Failed to load transactions.");
    }
  }

  // --- Clear Transactions ---
  async function handleClearTransactions() {
    if (!confirm("Are you sure you want to clear all transactions?")) return;

    try {
      if (status !== "authenticated") {
        await signIn("google", { callbackUrl: window.location.href });
        return;
      }
      const token = getClientToken();
      const res = await fetch(clearApiPath, {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401) {
        await signIn("google", { callbackUrl: window.location.href });
        return;
      }

      if (res.ok) {
        await fetchTransactions();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to clear transactions.");
      }
    } catch (err) {
      console.error("clearTransactions error", err);
      setError("Failed to clear transactions.");
    }
  }

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Helpers for formatting and CSV ----------
  function formatCurrency(value) {
    if (value == null || value === "N/A") return "N/A";
    const n = Number(value);
    if (!Number.isFinite(n)) return "N/A";
    return (
      "$" +
      n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatPercentage(value) {
    if (value == null || value === "N/A") return "N/A";
    const n = Number(value);
    if (!Number.isFinite(n)) return "N/A";
    return n.toFixed(2) + "%";
  }

  function escapeCsv(val) {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- CSV downloads (fallback/manual) ---
  function handleDownloadCSVFallback() {
    const headers = ["Date", "Stock", "Type", "Quantity", "Price", "Value"];
    const rows = transactions.map((tx) => [
      tx.date,
      tx.stock,
      tx.type,
      tx.quantity,
      tx.price,
      tx.value ?? tx.quantity * tx.price,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => escapeCsv(c)).join(","))].join("\n");
    downloadBlob(csv, "transactions.csv", "text/csv");
  }

  function handleDownloadPerformanceCSVFallback() {
    const headers = ["Ticker", "Name", "Realized Gain/Loss", "IRR (%)"];
    const rows = (stockPerformanceData || []).map((s) => [
      s.ticker,
      s.name,
      s.realizedGain,
      s.irr,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => escapeCsv(c)).join(","))].join("\n");
    downloadBlob(csv, "performance_metrics.csv", "text/csv");
  }

  // ---------- AG Grid config for Transactions ----------
  // Date comparator: expects YYYY-MM-DD or Date string compatible with Date.parse
  const dateComparator = useCallback((filterLocalDateAtMidnight, cellValue) => {
    if (!cellValue) return 0;
    const cellDate = new Date(cellValue);
    // compare only dates
    if (cellDate < filterLocalDateAtMidnight) return -1;
    if (cellDate > filterLocalDateAtMidnight) return 1;
    return 0;
  }, []);

  const transactionColumnDefs = useMemo(() => [
    { headerName: "Date", field: "date", sortable: true, filter: "agDateColumnFilter", filterParams: { comparator: dateComparator }, resizable: true, width: 140 },
    { headerName: "Ticker", field: "stock", sortable: true, filter: true, resizable: true, width: 120 },
    { headerName: "Name", field: "name", sortable: true, filter: true, resizable: true, flex: 1 },
    { headerName: "Type", field: "type", sortable: true, filter: true, resizable: true, width: 100 },
    { headerName: "Quantity", field: "quantity", sortable: true, filter: "agNumberColumnFilter", resizable: true, width: 120, valueFormatter: (p) => (Number.isFinite(Number(p.value)) ? Math.round(Number(p.value)) : p.value) },
    { headerName: "Price", field: "price", sortable: true, filter: "agNumberColumnFilter", resizable: true, width: 120, valueFormatter: (p) => formatCurrency(p.value) },
    { headerName: "Value", field: "value", sortable: true, filter: "agNumberColumnFilter", resizable: true, width: 140, valueFormatter: (p) => formatCurrency(p.value) },
  ], [dateComparator]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  }), []);

  const rowData = useMemo(() => {
    return (transactions || []).map((tx) => ({
      date: tx.date,
      stock: tx.stock,
      name: tx.name || "",
      type: tx.type,
      quantity: Number(tx.quantity) || 0,
      price: tx.price == null ? 0 : Number(tx.price),
      value: tx.value == null ? (Number(tx.quantity || 0) * Number(tx.price || 0)) : Number(tx.value),
    }));
  }, [transactions]);

  // AG Grid CSV export (preferred)
  const handleExportCSV = useCallback(() => {
    try {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.exportDataAsCsv({ fileName: "transactions.csv" });
      } else {
        handleDownloadCSVFallback();
      }
    } catch (err) {
      console.warn("Grid export failed, falling back to manual CSV", err);
      handleDownloadCSVFallback();
    }
  }, [gridRef, transactions]);

  // Performance CSV export uses fallback if stockPerformanceData not present
  const handleExportPerformanceCSV = useCallback(() => {
    try {
      // If you later add a grid for performance metrics you can call its export.
      handleDownloadPerformanceCSVFallback();
    } catch {
      handleDownloadPerformanceCSVFallback();
    }
  }, [stockPerformanceData]);

  // ---------- Download CSV template for transactions ----------
  const handleDownloadTemplate = useCallback(() => {
    // simple template header row
    const headers = ["date", "stock", "type", "quantity", "price"];
    // example row
    const rows = [
      ["2025-09-01", "AAPL", "Buy", "10", "175.00"],
      ["2025-09-02", "INFY.NS", "Buy", "100", "1500.00"],
    ];
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    downloadBlob(csv, "transactions_template.csv", "text/csv");
  }, []);

  return (
    <div className="container">
      <Nav user={user} />
      <h1>Transaction Management</h1>

      {/* Manual Add Form + Bulk Upload */}
      <div className="transaction-container">
        <section className="transaction-form">
          <h2>Add Transaction</h2>
          <form onSubmit={handleAddTransaction} className="form">
            <div className="form-group">
              <label>Type:</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input">
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>

            <div className="form-group">
              <input type="text" placeholder="Ticker" value={stock} onChange={(e) => setStock(e.target.value.toUpperCase())} required className="input" />
            </div>

            <div className="form-group">
              <input type="number" step="1" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="input" />
            </div>

            <div className="form-group">
              <input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required className="input" />
            </div>

            <div className="form-group">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input" />
            </div>

            <button type="submit" className="button">Add Transaction</button>
            {error && <div className="alert">{error}</div>}
          </form>

          <div style={{ marginTop: 12 }}>
            <BulkTransactionUpload onUploaded={fetchTransactions} hideManualAdd={true} />
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="button" onClick={handleDownloadTemplate} style={{ background: "#0070f3", marginRight: 8 }}>
              Download CSV Template
            </button>
          </div>
        </section>

        {/* Past Transactions (AG Grid) */}
        <section className="transaction-history" style={{ flex: 2 }}>
          <h2>Past Transactions</h2>

          {transactions.length === 0 ? (
            <p className="empty-msg">No transactions yet. Add some to get started.</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <button onClick={handleExportCSV} className="button">Download Transactions CSV</button>
                <button onClick={handleClearTransactions} className="button clear">Clear All Transactions</button>
                <button onClick={handleExportPerformanceCSV} className="button" style={{ background: "#2196F3" }}>Download Performance CSV</button>
              </div>

              <div className="ag-theme-alpine" style={{ height: 520, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={transactionColumnDefs}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={25}
                  animateRows
                />
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="footer">
        <p>This site is for educational use only. Financial data is provided "as is".</p>
      </footer>

      <style jsx>{`
        .container {
          font-family: Arial;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        .transaction-container {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .transaction-form {
          flex: 1;
          min-width: 320px;
          background: #fff;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #eee;
        }
        .transaction-history {
          flex: 2;
          min-width: 500px;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .button {
          background: #4caf50;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .clear {
          background: #f44336;
        }
        .alert {
          color: #8b0000;
          background: #ffdddd;
          padding: 8px;
          border-radius: 4px;
          margin-top: 10px;
          font-size: 14px;
        }
        .empty-msg {
          font-style: italic;
          color: #666;
          margin: 10px 0;
        }
        .footer {
          margin-top: 40px;
          padding: 20px;
          background: #f8f8f8;
          border-top: 1px solid #eee;
          font-size: 11px;
          color: #666;
          text-align: center;
        }

        /* Heuristic: hide a possible duplicate manual form inside BulkTransactionUpload */
        .bulk-manual-form {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

// --- Server Side Props ---
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) {
    return {
      redirect: { destination: "/auth/signin", permanent: false },
    };
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;
  const backendUrl = `${backendBase}/api/transactions`;

  let data = {};
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      return {
        redirect: { destination: "/auth/signin", permanent: false },
      };
    }

    data = await res.json().catch(() => ({}));
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }

  const user = {
    id: data?.current_user?.id || session.user?.id || "guest",
    isAuthenticated: !!session,
  };

  return {
    props: {
      user,
      transactionsData: data.transactions || [],
      stockPerformanceData: data.stockPerformance || [],
      realizedGainsTotal: data.realizedGainsTotal || 0,
      portfolioIrr: data.portfolioIRR || 0,
      error: data?.error || "",
    },
  };
}
