// components/BulkTransactionUpload.js
// Drop-in React component for Next.js to add a CSV bulk upload flow for transactions.
// - Exact CSV headers expected (lowercase): date,stock,type,quantity,price,source,notes
// - Validates each row; shows inline errors; lets user edit or remove rows
// - Calls backend /api/transactions/bulk with only VALID rows
// - Includes a CSV template download button

import React, { useMemo, useRef, useState } from "react";
import Papa from "papaparse";

const EXPECTED_HEADERS = [
  "date",     // YYYY-MM-DD
  "stock",    // e.g. AAPL or RELIANCE.NS
  "type",     // buy | sell (lowercase)
  "quantity", // integer > 0
  "price",    // number > 0
  "source",   // optional, default "import"
  "notes",    // optional
];

const CSV_TEMPLATE = `date,stock,type,quantity,price,source,notes\n2025-01-15,AAPL,buy,10,185.50,import,Initial buy\n2025-02-20,RELIANCE.NS,sell,5,2450.00,import,Trim position\n`;

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
    if (t !== "buy" && t !== "sell") errors.type = "Type must be 'buy' or 'sell' (lowercase)";
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
    row.source = "import";
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
        <div>Missing columns: <span className="font-mono">{missing.join(", ")}</span></div>
      ) : null}
      {extra?.length ? (
        <div>Unexpected columns: <span className="font-mono">{extra.join(", ")}</span></div>
      ) : null}
      <div className="mt-1 text-xs text-red-600">Expected exactly: {EXPECTED_HEADERS.join(", ")}</div>
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>
  );
}

export default function BulkTransactionUpload() {
  const [rows, setRows] = useState([]); // {row, errors, isValid}
  const [headerIssue, setHeaderIssue] = useState(null);
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef(null);

  const counts = useMemo(() => {
    let valid = 0, invalid = 0;
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

        const validated = (results.data || []).map((rec, idx) => validateRow(rec, idx));
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
    if (validRows.length === 0) return;

    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: validRows }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload transactions");
      }

      alert(`${validRows.length} transactions successfully uploaded!`);
      setOpen(false);
      setRows([]);
    } catch (err) {
      console.error(err);
      alert("Error uploading transactions: " + err.message);
    }
  }

  return (
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
          <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
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
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
                <th className="px-3 py-2">Errors</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={EXPECTED_HEADERS.length + 3} className="px-3 py-6 text-center text-gray-500">No rows parsed yet.</td></tr>
              ) : null}
              {rows.map((rec, ix) => {
                const { row, errors, isValid } = rec;
                return (
                  <tr key={ix} className={isValid ? "bg-white" : "bg-red-50/40"}>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">{ix + 1}</td>
                    {EXPECTED_HEADERS.map((key) => {
                      const hasError = !!errors[key];
                      return (
                        <td key={key} className="px-3 py-2">
                          <input
                            value={row[key] ?? ""}
                            onChange={(e) => updateCell(ix, key, e.target.value)}
                            className={`w-full rounded-md border px-2 py-1 text-sm outline-none ${hasError ? "border-red-400 bg-red-50" : "border-gray-300"}`}
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
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
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
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Expected headers:</span>
            <code className="rounded bg-gray-100 px-1.5 py-0.5">{EXPECTED_HEADERS.join(", ")}</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={removeInvalid}
              className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Remove invalid rows
            </button>
            <button
              onClick={() => setRows([])}
              className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Clear all
            </button>
            <button
              onClick={submitValid}
              disabled={counts.valid === 0}
              className={`rounded-2xl px-3 py-2 text-sm text-white ${counts.valid === 0 ? "cursor-not-allowed bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              Add valid transactions
            </button>
          </div>
        </ActionBar>
      </Modal>

      {parsing ? (
        <div className="ml-2 text-sm text-gray-600">Parsing CSV…</div>
      ) : null}
    </div>
  );
}
