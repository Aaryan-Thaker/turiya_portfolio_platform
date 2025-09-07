// components/BulkTransactionUpload.js 
// CSV bulk upload for transactions with validation
// Updated: 
//  - Removed success popup
//  - Calls parent callback to refresh transactions table
//  - Prevents incorrect manual transactions from submitting
//  - Adds manual transaction entry form with validation

import React, { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { getSession } from "next-auth/react";

const EXPECTED_HEADERS = [
  "date",
  "stock",
  "type",
  "quantity",
  "price",
  "source",
  "notes",
];

const CSV_TEMPLATE = `date,stock,type,quantity,price,source,notes
2025-01-15,AAPL,buy,10,185.50,import,Initial buy
2025-02-20,RELIANCE.NS,sell,5,2450.00,import,Trim position
`;

function isValidISODate(yyyyMMdd) {
  if (typeof yyyyMMdd !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMMdd)) return false;
  const d = new Date(yyyyMMdd + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().startsWith(yyyyMMdd);
}

function parseNumber(x) {
  if (x === null || x === undefined) return NaN;
  if (typeof x === "number") return x;
  const n = parseFloat(String(x).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function parseIntStrict(x) {
  if (x === null || x === undefined) return NaN;
  const s = String(x).trim();
  if (!/^[-+]?\d+$/.test(s)) return NaN;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : NaN;
}

function validateRow(raw, index) {
  const row = { ...raw };
  const errors = {};

  // date
  if (!row.date || !isValidISODate(row.date)) {
    errors.date = "Date must be YYYY-MM-DD";
  }

  // stock
  if (!row.stock || String(row.stock).trim().length === 0) {
    errors.stock = "Stock/ticker is required";
  } else {
    row.stock = String(row.stock).trim();
  }

  // type
  if (!row.type) {
    errors.type = "Type is required (buy/sell)";
  } else {
    const t = String(row.type).trim().toLowerCase();
    if (t !== "buy" && t !== "sell")
      errors.type = "Type must be 'buy' or 'sell' (lowercase)";
    row.type = t;
  }

  // quantity
  const qty = parseIntStrict(row.quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    errors.quantity = "Quantity must be an integer > 0";
  } else {
    row.quantity = qty;
  }

  // price
  const price = parseNumber(row.price);
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Price must be a number > 0";
  } else {
    row.price = Number(price.toFixed(6));
  }

  // source
  if (!row.source || String(row.source).trim().length === 0) {
    row.source = "manual";
  } else {
    row.source = String(row.source).trim();
  }

  // notes
  if (row.notes === undefined || row.notes === null) row.notes = "";
  row.notes = String(row.notes);

  row.__index = index;

  return { row, errors, isValid: Object.keys(errors).length === 0 };
}

function HeaderMismatch({ missing, extra }) {
  if ((!missing || !missing.length) && (!extra || !extra.length)) return null;
  return (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <div className="font-medium">CSV header mismatch</div>
      {missing?.length ? (
        <div>
          Missing columns:{" "}
          <span className="font-mono">{missing.join(", ")}</span>
        </div>
      ) : null}
      {extra?.length ? (
        <div>
          Unexpected columns:{" "}
          <span className="font-mono">{extra.join(", ")}</span>
        </div>
      ) : null}
      <div className="mt-1 text-xs text-red-600">
        Expected exactly: {EXPECTED_HEADERS.join(", ")}
      </div>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-[min(1100px,95vw)] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ActionBar({ children }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {children}
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function BulkTransactionUpload({ onTransactionsUploaded }) {
  const [rows, setRows] = useState([]); // {row, errors, isValid}
  const [headerIssue, setHeaderIssue] = useState(null);
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef(null);

  // manual form state
  const [manual, setManual] = useState({
    date: "",
    stock: "",
    type: "buy",
    quantity: "",
    price: "",
    notes: "",
  });
  const [manualError, setManualError] = useState(null);

  const counts = useMemo(() => {
    let valid = 0,
      invalid = 0;
    rows.forEach((r) => (r.isValid ? valid++ : invalid++));
    return { valid, invalid, total: rows.length };
  }, [rows]);

  function triggerFile() {
    fileRef.current?.click();
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => String(h || "").trim().toLowerCase(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
        const extra = headers.filter((h) => !EXPECTED_HEADERS.includes(h));
        if (missing.length || extra.length) {
          setHeaderIssue({ missing, extra });
        } else {
          setHeaderIssue(null);
        }

        const validated = (results.data || []).map((rec, idx) =>
          validateRow(rec, idx)
        );
        setRows(validated);
        setOpen(true);
        setParsing(false);
        e.target.value = "";
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setParsing(false);
      },
    });
  }

  function updateCell(ix, key, value) {
    setRows((prev) => {
      const next = [...prev];
      const current = next[ix];
      const updated = { ...current.row, [key]: value };
      const revalidated = validateRow(updated, current.row.__index);
      next[ix] = revalidated;
      return next;
    });
  }

  function removeRow(ix) {
    setRows((prev) => prev.filter((_, i) => i !== ix));
  }

  function removeInvalid() {
    setRows((prev) => prev.filter((r) => r.isValid));
  }

  async function submitValid() {
    const validRows = rows.filter((r) => r.isValid).map((r) => r.row);
    if (validRows.length === 0) {
      alert("No valid transactions to upload.");
      return;
    }

    try {
      const session = await getSession();
      const token = session?.accessToken;

      if (!token) {
        alert("You must be logged in to upload transactions.");
        return;
      }

      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactions: validRows }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload transactions");
      }

      // Instead of popup, refresh parent
      if (onTransactionsUploaded) {
        onTransactionsUploaded();
      }

      setOpen(false);
      setRows([]);
    } catch (err) {
      console.error(err);
      alert("Error uploading transactions: " + err.message);
    }
  }

  async function submitManual(e) {
    e.preventDefault();
    setManualError(null);

    const { row, errors, isValid } = validateRow(manual, -1);
    if (!isValid) {
      setManualError("Please correct errors: " + Object.values(errors).join(", "));
      return;
    }

    try {
      const session = await getSession();
      const token = session?.accessToken;
      if (!token) {
        alert("You must be logged in to add transactions.");
        return;
      }

      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactions: [row] }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add transaction");
      }

      if (onTransactionsUploaded) {
        onTransactionsUploaded();
      }

      setManual({
        date: "",
        stock: "",
        type: "buy",
        quantity: "",
        price: "",
        notes: "",
      });
    } catch (err) {
      console.error(err);
      setManualError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Bulk Upload Section */}
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={triggerFile}
          className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          Upload Transactions (CSV)
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-2xl border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
          title="Download CSV template"
        >
          Download CSV template
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {parsing ? (
          <div className="ml-2 text-sm text-gray-600">Parsing CSV…</div>
        ) : null}
      </div>

      {/* Manual Entry Section */}
      <div className="rounded-xl border p-4">
        <h3 className="mb-3 font-semibold">Add Transaction Manually</h3>
        <form onSubmit={submitManual} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            type="date"
            value={manual.date}
            onChange={(e) => setManual({ ...manual, date: e.target.value })}
            required
            className="rounded-md border px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="Stock (e.g. AAPL)"
            value={manual.stock}
            onChange={(e) => setManual({ ...manual, stock: e.target.value })}
            required
            className="rounded-md border px-2 py-1 text-sm"
          />
          <select
            value={manual.type}
            onChange={(e) => setManual({ ...manual, type: e.target.value })}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={manual.quantity}
            onChange={(e) => setManual({ ...manual, quantity: e.target.value })}
            required
            className="rounded-md border px-2 py-1 text-sm"
          />
          <input
            type="number"
            placeholder="Price"
            step="0.01"
            value={manual.price}
            onChange={(e) => setManual({ ...manual, price: e.target.value })}
            required
            className="rounded-md border px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={manual.notes}
            onChange={(e) => setManual({ ...manual, notes: e.target.value })}
            className="rounded-md border px-2 py-1 text-sm col-span-2 md:col-span-4"
          />
          <button
            type="submit"
            className="col-span-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 md:col-span-1"
          >
            Add Transaction
          </button>
        </form>
        {manualError && (
          <div className="mt-2 text-sm text-red-600">{manualError}</div>
        )}
      </div>

      {/* CSV Modal */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Preview imported transactions</h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
              <Badge tone="blue">Total: {counts.total}</Badge>
              <Badge tone="green">Valid: {counts.valid}</Badge>
              <Badge tone="red">Invalid: {counts.invalid}</Badge>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            ✕ Close
          </button>
        </div>

        {headerIssue ? (
          <HeaderMismatch missing={headerIssue.missing} extra={headerIssue.extra} />
        ) : null}

        <div className="max-h-[55vh] overflow-auto rounded-lg border">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2">#</th>
                {EXPECTED_HEADERS.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
                <th className="px-3 py-2">Errors</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={EXPECTED_HEADERS.length + 3}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No rows parsed yet.
                  </td>
                </tr>
              ) : null}
              {rows.map((rec, ix) => {
                const { row, errors, isValid } = rec;
                return (
                  <tr
                    key={ix}
                    className={isValid ? "bg-white" : "bg-red-50/40"}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                      {ix + 1}
                    </td>
                    {EXPECTED_HEADERS.map((key) => {
                      const hasError = !!errors[key];
                      return (
                        <td key={key} className="px-3 py-2">
                          <input
                            value={row[key] ?? ""}
                            onChange={(e) => updateCell(ix, key, e.target.value)}
                            className={`w-full rounded-md border px-2 py-1 text-sm outline-none ${
                              hasError
                                ? "border-red-400 bg-red-50"
                                : "border-gray-300"
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-xs text-red-600">
                      {!isValid && (
                        <ul className="list-disc pl-4">
                          {Object.entries(errors).map(([k, v]) => (
                            <li key={k}>{String(v)}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeRow(ix)}
                        className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ActionBar>
          <div className="flex gap-2">
            <button
              onClick={removeInvalid}
              type="button"
              className="rounded-md bg-yellow-100 px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-200"
            >
              Remove Invalid
            </button>
            <button
              onClick={submitValid}
              type="button"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Upload Valid Transactions
            </button>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </ActionBar>
      </Modal>
    </div>
  );
}
