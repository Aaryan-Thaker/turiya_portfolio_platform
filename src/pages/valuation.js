import React from 'react';
import Nav from './Nav';  // Adjust path as needed

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(formatted.replace(/[TMBK]$/, '')) + (formatted.match(/[TMBK]/)?.[0] ?? '');
  }

  function formatCurrency(value, currency = 'USD') {
    if (value == null || value === 'N/A') return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }

  function formatPercentage(value) {
    if (value == null || value === 'N/A') return 'N/A';
    return (value * 100).toFixed(2) + '%';
  }

  function formatRatio(value) {
    if (value == null || value === 'N/A') return 'N/A';
    return Number(value).toFixed(2) + 'x';
  }

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error loading valuation data: {error}</div>;
  }

  // Normalize user prop so Nav sees isAuthenticated (camelCase)
  const normalizedUser = {
    ...currentUser,
    isAuthenticated: currentUser.is_authenticated ?? false,
  };

  return (
    <div style={styles.body}>
      <Nav user={normalizedUser} />

      <h2>Valuation Dashboard</h2>

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
                  <td style={styles.tableBodyCell}>{formatCurrency(v.CurrentPrice, c)}</td>
                  <td style={styles.tableBodyCell}>{formatCurrency(v.CurrentValue, c)}</td>
                  <td style={styles.tableBodyCell}>{formatPercentage(v.AllocationPercent)}</td>
                  <td style={styles.tableBodyCell}>{formatCurrency(v['52wHigh'], c)}</td>
                  <td style={styles.tableBodyCell}>{formatCurrency(v['52wLow'], c)}</td>
                  <td style={styles.tableBodyCell}>{formatLargeCurrency(v.MarketCap, c)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v.TrailingPE)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v.ForwardPE)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v.PEGRatio)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v.PriceToSales)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v.PriceToBook)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v['EV/Revenue'] || v['EV/Rev'])}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v['EV/EBITDA'])}</td>
                  <td style={styles.tableBodyCell}>{formatPercentage(v.ProfitMargin)}</td>
                  <td style={styles.tableBodyCell}>{formatPercentage(v.ROA)}</td>
                  <td style={styles.tableBodyCell}>{formatPercentage(v.ROE)}</td>
                  <td style={styles.tableBodyCell}>{formatLargeCurrency(v.Revenue, c)}</td>
                  <td style={styles.tableBodyCell}>{formatLargeCurrency(v.NetIncome, c)}</td>
                  <td style={styles.tableBodyCell}>{formatCurrency(v.EPS, c)}</td>
                  <td style={styles.tableBodyCell}>{formatLargeCurrency(v.TotalCash, c)}</td>
                  <td style={styles.tableBodyCell}>{formatRatio(v.DebtEquity)}</td>
                  <td style={styles.tableBodyCell}>{formatLargeCurrency(v.FreeCashFlow, c)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
};

export async function getServerSideProps(context) {
  const backendUrl = process.env.BACKEND_URL || 'http://${host}/api/valuation';

  const res = await fetch(backendUrl, {
    credentials: 'include',
    headers: { cookie: context.req.headers.cookie || '' },
  });

  if (res.status === 401) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const data = await res.json();

  if (!res.ok || !data.success) {
    return {
      props: {
        error: data.error || 'Failed to fetch valuation data',
        currentUser: { id: 'guest', is_authenticated: false },
        tickers: [],
        valuationData: {},
      },
    };
  }

  return {
    props: {
      currentUser: data.current_user || { id: 'guest', is_authenticated: false },
      tickers: data.tickers || [],
      valuationData: data.valuationData || {},
      error: '',
    },
  };
}
