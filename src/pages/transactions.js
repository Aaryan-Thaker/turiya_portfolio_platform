// pages/transactions.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Nav from "./Nav";
import { getSession, useSession, signIn } from "next-auth/react";
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

  const getClientToken = () => session?.accessToken || "";

  // Validate ticker
  async function validateTicker(ticker) {
    if (!ticker) return false;
    try {
      const token = getClientToken();
      const res = await fetch(`/api/stock/validate?ticker=${encodeURIComponent(ticker)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      const token = getClientToken();
      const res = await fetch("/api/transactions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    const token = getClientToken() || (await (await getSession())?.accessToken) || "";

    try {
      const res = await fetch("/api/transactions", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      const token = getClientToken();
      const res = await fetch("/api/clear_transactions", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  // Format helpers
  const formatCurrency = (value) => {
    if (value == null || value === "N/A") return "N/A";
    const n = Number(value);
    return Number.isFinite(n) ? "₹" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A";
  };

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

  // AG Grid columns
  const transactionColumnDefs = useMemo(() => [
    { headerName: "Date", field: "date", sortable: true, filter: "agDateColumnFilter", resizable: true, width: 140 },
    { headerName: "Ticker", field: "stock", sortable: true, filter: true, resizable: true, width: 120 },
    { headerName: "Name", field: "name", sortable: true, filter: true, resizable: true, flex: 1 },
    { headerName: "Type", field: "type", sortable: true, filter: true, resizable: true, width: 100 },
    { headerName: "Quantity", field: "quantity", sortable: true, filter: "agNumberColumnFilter", valueFormatter: (p) => Number(p.value).toLocaleString(), resizable: true, width: 120 },
    { headerName: "Price", field: "price", sortable: true, filter: "agNumberColumnFilter", valueFormatter: (p) => formatCurrency(p.value), resizable: true, width: 120 },
    { headerName: "Value", field: "value", sortable: true, filter: "agNumberColumnFilter", valueFormatter: (p) => formatCurrency(p.value), resizable: true, width: 140 },
  ], []);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, floatingFilter: true }), []);

  const rowData = useMemo(() => transactions.map((tx) => ({
    date: tx.date,
    stock: tx.stock,
    name: tx.name || "",
    type: tx.type,
    quantity: Number(tx.quantity) || 0,
    price: Number(tx.price || 0),
    value: Number(tx.value ?? tx.quantity * tx.price),
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
                {/* ✅ Fixed: use normal button instead of BulkTransactionUpload.Button */}
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
  const token = session?.accessToken || "";
  if (!token) return { redirect: { destination: "/auth/signin", permanent: false } };

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;
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
