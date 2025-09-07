// components/validateTransactions.js
// Shared transaction validation logic

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

export function validateRow(raw, index) {
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
    if (t !== "buy" && t !== "sell") errors.type = "Type must be 'buy' or 'sell'";
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
