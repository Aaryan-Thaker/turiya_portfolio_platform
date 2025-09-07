// pages/valuation.js
import React from 'react';
import Nav from './Nav';
import { getSession } from 'next-auth/react';

export default function ValuationPage({ currentUser, tickers = [], valuationData = {}, error }) {
  function formatLargeCurrency(value, currency = 'USD') {
    if (value == null || value === 'N/A') return 'N/A';
    const absVal = Math.abs(value);
    let formatted = value;
    if (absVal >= 1e12) formatted = (value / 1e12).toFixed(2) + 'T';
    else if (absVal >= 1e9) formatted = (value / 1e9).toFixed(2) + 'B';
    else if (absVal >= 1e6) formatted = (value / 1e6).toFixed(2) + 'M';
    else if (absVal >= 1e3) formatted = (value / 1e3).toFixed(2) + 'K';
    else formatted = value.toFixed(2);
    const numberPart = Number(String(formatted).replace(/[TMBK]$/, ''));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numberPart) + (formatted.match(/[TMBK]/)?.[0] ?? '');
  }

  function formatCurrency(value, currency = 'USD') {
    if (value == null || value === 'N/A') return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }

  function formatPercentage(value) {
    if (value == null || value === 'N/A') return 'N/A';
    const v = (Math.abs(value) > 1 && Math.abs(value) <= 100) ? (value / 100) : value;
    return (v * 100).toFixed(2) + '%';
  }

  function formatRatio(value) {
    if (value == null || value === 'N/A') return 'N/A';
    return Number(value).toFixed(2) + 'x';
  }

  function handleDownloadCSV() {
    if (!tickers.length) {
      alert("No data available to download.");
      return;
    }

    const headers = [
      "Stock", "Price", "Value", "Alloc%", "52w High", "52w Low", "Mkt Cap", "P/E (TTM)", "P/E (Fwd)",
      "PEGRatio", "P/S", "P/B", "EV/Rev", "EV/EBITDA", "Profit Margin", "ROA", "ROE", "Revenue",
      "Net Income", "EPS", "Cash", "Debt/Eq", "FCF"
    ];

    const rows = tickers.map(symbol => {
      const v = valuationData[symbol] || {};
      const c = v.Currency || 'USD';
      return [
        `${symbol} (${c})`,
        v.CurrentPrice ?? "",
        v.CurrentValue ?? "",
        v.AllocationPercent ?? "",
        v['52wHigh'] ?? "",
        v['52wLow'] ?? "",
        v.MarketCap ?? "",
        v.TrailingPE ?? "",
        v.ForwardPE ?? "",
        v.PEGRatio ?? "",
        v.PriceToSales ?? "",
        v.PriceToBook ?? "",
        v['EV/Revenue'] ?? v['EV/Rev'] ?? "",
        v['EV/EBITDA'] ?? "",
        v.ProfitMargin ?? "",
        v.ROA ?? "",
        v.ROE ?? "",
        v.Revenue ?? "",
        v.NetIncome ?? "",
        v.EPS ?? "",
        v.TotalCash ?? "",
        v.DebtEquity ?? "",
        v.FreeCashFlow ?? "",
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "valuation_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error loading valuation data: {error}</div>;
  }

  const normalizedUser = {
    ...currentUser,
    isAuthenticated: currentUser.is_authenticated ?? currentUser.isAuthenticated ?? false,
  };

  return (
    <div style={styles.body}>
      <Nav user={normalizedUser} />

      <h2>Valuation Dashboard</h2>

      {!tickers.length ? (
        <p style={{ fontStyle: 'italic', color: '#666' }}>Start by adding Transactions in the Transactions page.</p>
      ) : (
        <>
          <div style={styles.scrollContainer}>
            <table style={styles.valuationTable}>
              <thead>
                <tr>
                  <th style={{ ...styles.tableHeaderCell, ...styles.tickerCell, textAlign: 'left' }}>
                    Stock (Currency)
                  </th>
                  <th style={styles.tableHeaderCell}>Price</th>
                  <th style={styles.tableHeaderCell}>Value</th>
                  <th style={styles.tableHeaderCell}>Alloc %</th>
                  <th style={styles.tableHeaderCell}>52w High</th>
                  <th style={styles.tableHeaderCell}>52w Low</th>
                  <th style={styles.tableHeaderCell}>Mkt Cap</th>
                  <th style={styles.tableHeaderCell}>P/E (TTM)</th>
                  <th style={styles.tableHeaderCell}>P/E (Fwd)</th>
                  <th style={styles.tableHeaderCell}>PEGRatio</th>
                  <th style={styles.tableHeaderCell}>P/S</th>
                  <th style={styles.tableHeaderCell}>P/B</th>
                  <th style={styles.tableHeaderCell}>EV/Rev</th>
                  <th style={styles.tableHeaderCell}>EV/EBITDA</th>
                  <th style={styles.tableHeaderCell}>Profit Marg</th>
                  <th style={styles.tableHeaderCell}>ROA</th>
                  <th style={styles.tableHeaderCell}>ROE</th>
                  <th style={styles.tableHeaderCell}>Revenue</th>
                  <th style={styles.tableHeaderCell}>Net Income</th>
                  <th style={styles.tableHeaderCell}>EPS</th>
                  <th style={styles.tableHeaderCell}>Cash</th>
                  <th style={styles.tableHeaderCell}>Debt/Eq</th>
                  <th style={styles.tableHeaderCell}>FCF</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map((symbol) => {
                  const v = valuationData[symbol] || {};
                  const c = v.Currency || 'USD';
                  return (
                    <tr key={symbol}>
                      <td style={{ ...styles.tableBodyCell, ...styles.tickerCell, textAlign: 'left' }}>
                        {symbol} ({c})
                      </td>
                      <td style={styles.tableBodyCell}>{formatCurrency(v.CurrentPrice ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatCurrency(v.CurrentValue ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatPercentage(v.AllocationPercent ?? 0)}</td>
                      <td style={styles.tableBodyCell}>{formatCurrency(v['52wHigh'] ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatCurrency(v['52wLow'] ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatLargeCurrency(v.MarketCap ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v.TrailingPE ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v.ForwardPE ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v.PEGRatio ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v.PriceToSales ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v.PriceToBook ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v['EV/Revenue'] ?? v['EV/Rev'] ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v['EV/EBITDA'] ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatPercentage(v.ProfitMargin ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatPercentage(v.ROA ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatPercentage(v.ROE ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatLargeCurrency(v.Revenue ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatLargeCurrency(v.NetIncome ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatCurrency(v.EPS ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatLargeCurrency(v.TotalCash ?? 0, c)}</td>
                      <td style={styles.tableBodyCell}>{formatRatio(v.DebtEquity ?? 'N/A')}</td>
                      <td style={styles.tableBodyCell}>{formatLargeCurrency(v.FreeCashFlow ?? 0, c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={handleDownloadCSV} style={styles.downloadBtn}>Download Valuation Data (CSV)</button>
        </>
      )}

      <footer style={styles.footer}>
        <p>
          This website is a non-commercial project and is intended for educational and informational purposes only.
          Financial data is retrieved via the Yahoo Finance API (yFinance) and is provided &quot;as is&quot; without any representations or warranties.
        </p>
      </footer>
    </div>
  );
}

const styles = {
  body: { fontFamily: 'Arial, sans-serif', maxWidth: 1400, margin: '0 auto', padding: 20, fontSize: 13 },
  scrollContainer: {
    overflowX: 'auto',
    maxWidth: '100%',
    border: '1px solid #eee',
    borderRadius: 5,
    background: '#fff',
  },
  valuationTable: {
    borderCollapse: 'collapse',
    width: '100%',
    minWidth: 1200,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  tickerCell: {
    position: 'sticky',
    left: 0,
    backgroundColor: '#f2f2f2',
    zIndex: 2,
    fontWeight: 'bold',
    borderRight: '1px solid #ccc',
    padding: '8px 12px',
  },
  tableHeaderCell: {
    backgroundColor: '#f8f8f8',
    fontWeight: 'bold',
    borderBottom: '1px solid #ccc',
    padding: '8px 12px',
    textAlign: 'center',
  },
  tableBodyCell: {
    borderBottom: '1px solid #eee',
    padding: '8px 12px',
    textAlign: 'center',
  },
  footer: { marginTop: 40, padding: 20, backgroundColor: '#f8f8f8', borderTop: '1px solid #eee', fontSize: 11, color: '#666' },
  downloadBtn: {
    marginTop: 20,
    background: '#0070f3',
    color: '#fff',
    border: 'none',
    padding: '10px 15px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
  },
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host;
  const backendBase = process.env.BACKEND_URL || `${protocol}://${host}`;
  const backendUrl = `${backendBase}/api/valuation`;

  let data = {};
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return {
        redirect: {
          destination: "/auth/signin",
          permanent: false,
        },
      };
    }

    data = await res.json().catch(() => ({}));
  } catch (err) {
    console.error("Error fetching valuation data:", err);
  }

  const currentUser = data.current_user || { id: session.user?.id || "guest", is_authenticated: !!session };

  return {
    props: {
      currentUser,
      tickers: data.tickers || [],
      valuationData: data.valuationData || {},
      error: data?.error || "",
    },
  };
}
