// pages/transactions.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession, useSession, signIn } from "next-auth/react";
import { getToken } from "next-auth/jwt";
import BulkTransactionUpload from "@/components/BulkTransactionUpload";

// ✅ AG Grid modules
import { ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule, PaginationModule, NumberFilterModule, TextFilterModule } from "ag-grid-community";

// Register AG Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule, PaginationModule, NumberFilterModule, TextFilterModule]);

// SSR-safe AG Grid
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((m) => m.AgGridReact),
  { ssr: false }
);

export default function TransactionsPage({ user, transactionsData, error: initialError }) {
  const { data: session, status } = useSession();
  const [type, setType] = useState("Buy");
  const [stock, setStock] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(initialError || "");
  const [transactions, setTransactions] = useState(transactionsData || []);

  const gridRef = useRef(null);

  // Validate ticker
  async function validateTicker(ticker) {
    if (!ticker) return false;
    try {
      const res = await fetch(`/api/proxy/stock/validate?ticker=${encodeURIComponent(ticker)}`, {
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => ({}));
      return !!data?.valid;
    } catch {
      return false;
    }
  }

  // Add transaction
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
      setError(`Ticker "${symbol}" not found. Please check the symbol.`);
      return;
    }

    try {
      if (status !== "authenticated") {
        await signIn("google", { callbackUrl: window.location.href });
        return;
      }
      const res = await fetch("/api/proxy/transactions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, stock: symbol, quantity: qtyNum, price: priceNum, date }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to add transaction.");
        return;
      }

      await fetchTransactions();
      setType("Buy");
      setStock("");
      setQuantity("");
      setPrice("");
      setDate("");
    } catch {
      setError("An unexpected error occurred.");
    }
  }

  // Fetch transactions
  async function fetchTransactions() {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      await signIn("google", { callbackUrl: window.location.href });
      return;
    }

    try {
      const res = await fetch("/api/proxy/transactions", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTransactions(data.transactions || []);
        setError("");
      } else {
        setTransactions(data.transactions || []);
        setError(data.error || "");
      }
    } catch {
      setError("Failed to load transactions.");
    }
  }

  // Clear transactions
  async function handleClearTransactions() {
    if (!confirm("Are you sure you want to clear all transactions?")) return;
    try {
      const res = await fetch("/api/proxy/clear_transactions", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await fetchTransactions();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to clear transactions.");
      }
    } catch {
      setError("Failed to clear transactions.");
    }
  }

  useEffect(() => { fetchTransactions(); }, []);

  // -----------------------------
  // Indian number formatting helpers (borrowed from valuation.js)
  // -----------------------------
  const toNumber = (v) => {
    if (v == null) return NaN;
    // Remove common non-digit characters (commas, ₹, spaces) before conversion
    const cleaned = String(v).replace(/[₹, ]+/g, "");
    const n = Number(cleaned);
    return isNaN(n) ? NaN : n;
  };

  const compactNumber = (value) => {
    const num = toNumber(value);
    if (isNaN(num)) return "N/A";
    // Crore = 1e7, Lakh = 1e5, Thousand = 1e3
    if (Math.abs(num) >= 1e7) return (num / 1e7).toFixed(2) + " Cr";
    if (Math.abs(num) >= 1e5) return (num / 1e5).toFixed(2) + " L";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + " K";
    return num.toFixed(2);
  };

  const fmt = useMemo(() => ({
    // currency: ₹ with Indian separators; compact=true uses L/Cr shorthand
    currency: (value, compact = false) => {
      if (value == null || value === "N/A" || isNaN(toNumber(value))) return "N/A";
      const num = toNumber(value);
      if (compact) return "₹" + compactNumber(num);
      // full Indian formatting
      return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    // integer with Indian separators (no decimals)
    integer: (value) => {
      if (value == null || value === "N/A" || isNaN(toNumber(value))) return "N/A";
      const num = toNumber(value);
      return Number.isInteger(num) ? num.toLocaleString("en-IN") : Math.round(num).toLocaleString("en-IN");
    }
  }), []);

  // CSV helpers
  const downloadCsv = (headers, rows, filename) => {
    const escape = (v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
    const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleDownloadTransactionsCSV = useCallback(() => {
    const headers = ["Date", "Stock", "Type", "Quantity", "Price", "Value"];
    const rows = transactions.map((tx) => [tx.date, tx.stock, tx.type, tx.quantity, tx.price, tx.value ?? tx.quantity * tx.price]);
    downloadCsv(headers, rows, "transactions.csv");
  }, [transactions]);

  // AG Grid columns — numeric columns get ag-right-aligned-cell so CSS can right-align them
  const transactionColumnDefs = useMemo(() => [
    { headerName: "Date", field: "date", sortable: true, filter: "agDateColumnFilter", resizable: true, width: 140 },
    { headerName: "Ticker", field: "stock", sortable: true, filter: true, resizable: true, width: 120 },
    { headerName: "Name", field: "name", sortable: true, filter: true, resizable: true, flex: 1 },
    { headerName: "Type", field: "type", sortable: true, filter: true, resizable: true, width: 100 },
    {
      headerName: "Quantity",
      field: "quantity",
      sortable: true,
      filter: "agNumberColumnFilter",
      valueFormatter: (p) => fmt.integer(p.value),
      resizable: true,
      width: 120,
      cellClass: "ag-right-aligned-cell",
    },
    {
      headerName: "Price",
      field: "price",
      sortable: true,
      filter: "agNumberColumnFilter",
      valueFormatter: (p) => fmt.currency(p.value, false),
      resizable: true,
      width: 120,
      cellClass: "ag-right-aligned-cell",
    },
    {
      headerName: "Value",
      field: "value",
      sortable: true,
      filter: "agNumberColumnFilter",
      // Use compact Indian format (L/Cr) for large totals
      valueFormatter: (p) => fmt.currency(p.value, true),
      resizable: true,
      width: 140,
      cellClass: "ag-right-aligned-cell",
    },
  ], [fmt]);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, floatingFilter: true }), []);

  const rowData = useMemo(() => transactions.map((tx) => ({
    date: tx.date,
    stock: tx.stock,
    name: tx.name || "",
    type: tx.type,
    quantity: Number(tx.quantity) || 0,
    price: Number(tx.price || 0),
    value: Number(tx.value ?? (tx.quantity * tx.price)) || 0,
  })), [transactions]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 1400, margin: "0 auto", padding: 20 }}>
      <Nav user={user} />
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Transaction Management</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <section style={{ flex: 1, minWidth: 320, background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eee" }}>
          <h2>Add Transaction</h2>
          <form onSubmit={handleAddTransaction}>
            <div style={{ marginBottom: 12 }}>
              <label>Type:</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", fontSize: 14 }}>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}><input placeholder="Ticker" value={stock} onChange={(e) => setStock(e.target.value.toUpperCase())} required style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", fontSize: 14 }} /></div>
            <div style={{ marginBottom: 12 }}><input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", fontSize: 14 }} /></div>
            <div style={{ marginBottom: 12 }}><input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", fontSize: 14 }} /></div>
            <div style={{ marginBottom: 12 }}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ddd", fontSize: 14 }} /></div>
            <button type="submit" style={{ padding: "8px 15px", borderRadius: 4, cursor: "pointer", fontSize: 14, border: "none", background: "#0070f3", color: "#fff" }}>Add Transaction</button>
            {error && <div style={{ marginTop: 10, color: "#8b0000", background: "#ffdddd", padding: 8, borderRadius: 4, fontSize: 14 }}>{error}</div>}
          </form>

          <div style={{ marginTop: 15 }}>
            <BulkTransactionUpload onUploaded={fetchTransactions} hideManualAdd={true} />
          </div>
        </section>

        <section style={{ flex: 2, minWidth: 500 }}>
          <h2>Past Transactions</h2>
          {transactions.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#666", margin: "10px 0" }}>No transactions yet. Add some to get started.</p>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                <button
                  onClick={handleDownloadTransactionsCSV}
                  style={{ padding: "8px 15px", borderRadius: 4, cursor: "pointer", fontSize: 14, border: "none", background: "#0070f3", color: "#fff" }}
                >
                  Download Transactions CSV
                </button>
                <button onClick={handleClearTransactions} style={{ padding: "8px 15px", borderRadius: 4, cursor: "pointer", fontSize: 14, border: "none", background: "#f44336", color: "#fff" }}>Clear All Transactions</button>
              </div>

              <div className="ag-theme-alpine" style={{ height: 520, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={transactionColumnDefs}
                  defaultColDef={defaultColDef}
                  pagination
                  paginationPageSize={25}
                  animateRows
                />
              </div>
            </>
          )}
        </section>
      </div>

      <footer style={{ marginTop: 40, padding: 20, background: "#f8f8f8", borderTop: "1px solid #eee", fontSize: 11, color: "#666", textAlign: "center" }}>
        <p>This site is for educational use only. Financial data is provided &quot;as is&quot;.</p>
      </footer>
    </div>
  );
}

// ---- Server Side Props ----
export async function getServerSideProps(context) {
  const session = await getSession(context);
  const jwt = await getToken({ req: context.req });
  const token = jwt?.accessToken || jwt?.idToken || "";
  if (!session || !token) return { redirect: { destination: "/auth/signin", permanent: false } };

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_API_URL || process.env.BACKEND_URL || `${protocol}://${host}`;
  const backendUrl = `${backendBase}/api/transactions`;

  let data = {};
  try {
    const res = await fetch(backendUrl, { headers: { Authorization: `Bearer ${token}` } });
    data = await res.json().catch(() => ({}));
  } catch {}

  const user = { id: data?.current_user?.id || session.user?.id || "guest", isAuthenticated: !!session };
  return {
    props: {
      user,
      transactionsData: data.transactions || [],
      error: data?.error || "",
    },
  };
}
