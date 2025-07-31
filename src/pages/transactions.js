import { useState, useEffect } from 'react';
import Nav from './Nav'; // Adjust import path as needed

export default function TransactionsPage({ 
  user, 
  transactionsData, 
  stockPerformanceData, 
  realizedGainsTotal,
  portfolioIrr,
  error: initialError
}) {
  const [type, setType] = useState('Buy');
  const [stock, setStock] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState(initialError || '');
  const [transactions, setTransactions] = useState(transactionsData || []);
  const [stockPerformance, setStockPerformance] = useState(stockPerformanceData || []);
  const [realizedGains, setRealizedGains] = useState(realizedGainsTotal || 0);
  const [portfolioIRR, setPortfolioIRR] = useState(portfolioIrr || 0);

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  async function handleAddTransaction(e) {
    e.preventDefault();
    setError('');

    if (!stock || !quantity || !price || !date) {
      setError('Please fill in all fields.');
      return;
    }

    const qtyNum = parseInt(quantity);
    const priceNum = parseFloat(price);

    if (isNaN(qtyNum) || isNaN(priceNum)) {
      setError('Quantity and price must be valid numbers.');
      return;
    }

    try {
      const res = await fetch(`${backendBase}/api/transactions`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, stock: stock.toUpperCase(), quantity: qtyNum, price: priceNum, date }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add transaction');
        return;
      }

      await fetchTransactions();
      setType('Buy');
      setStock('');
      setQuantity('');
      setPrice('');
      setDate('');
    } catch {
      setError('An unexpected error occurred.');
    }
  }

  async function fetchTransactions() {
    try {
      const res = await fetch(`${backendBase}/api/transactions`, { credentials: 'include' });
      const data = await res.json();

      if (res.ok && data.success) {
        setTransactions(data.transactions || []);
        setStockPerformance(data.stockPerformance || []);
        setRealizedGains(data.realizedGainsTotal || 0);
        setPortfolioIRR(data.portfolioIRR || 0);
        setError('');
      } else {
        setError(data.error || 'Failed to load transactions.');
      }
    } catch {
      setError('Failed to load transactions.');
    }
  }

  async function handleClearTransactions() {
    if (!confirm('Are you sure you want to clear all transactions?')) return;

    try {
      const res = await fetch(`${backendBase}/api/clear_transactions`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        await fetchTransactions();
      } else {
        setError('Failed to clear transactions.');
      }
    } catch {
      setError('Failed to clear transactions.');
    }
  }

  useEffect(() => {
    if (!transactionsData) {
      fetchTransactions();
    }
  }, []);

  function formatCurrency(value) {
    if (value == null || value === 'N/A') return value;
    return '$' + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercentage(value) {
    if (value == null || value === 'N/A') return value;
    return (value).toFixed(2) + '%';
  }

  return (
    <div className="container">
      <Nav user={user} />

      <h1>Transaction Management</h1>

      <section className="performance-summary">
        <h2>Performance Metrics</h2>
        <div className="performance-metrics">
          <div className="metric">
            <div>Total Realized Gain/Loss</div>
            <div className={`metric-value ${realizedGains >= 0 ? 'green' : 'red'}`}>{formatCurrency(realizedGains)}</div>
          </div>
          <div className="metric">
            <div>Portfolio IRR</div>
            <div className={`metric-value ${portfolioIRR >= 0 ? 'green' : 'red'}`}>{formatPercentage(portfolioIRR)}</div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>Name</th>
                <th>Realized Gain/Loss</th>
                <th>IRR</th>
              </tr>
            </thead>
            <tbody>
              {stockPerformance.map(stock => (
                <tr key={stock.ticker}>
                  <td>{stock.ticker}</td>
                  <td>{stock.name}</td>
                  <td className={stock.realizedGain >= 0 ? 'green' : 'red'}>{formatCurrency(stock.realizedGain)}</td>
                  <td className={stock.irr >= 0 ? 'green' : 'red'}>{formatPercentage(stock.irr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="transaction-container">
        <section className="transaction-form">
          <h2>Add Transaction</h2>
          <form onSubmit={handleAddTransaction} className="form">
            <div className="form-group">
              <label>Type:</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input">
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>
            <div className="form-group"><input type="text" placeholder="Ticker" value={stock} onChange={e => setStock(e.target.value.toUpperCase())} required className="input" /></div>
            <div className="form-group"><input type="number" step="1" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required className="input" /></div>
            <div className="form-group"><input type="number" step="0.01" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} required className="input" /></div>
            <div className="form-group"><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input" /></div>
            <button type="submit" className="button">Add Transaction</button>
          </form>
          {error && <div className="alert">{error}</div>}
        </section>

        <section className="transaction-history">
          <h2>Past Transactions</h2>
          <button onClick={handleClearTransactions} className="button clear">Clear All Transactions</button>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={idx}>
                    <td>{tx.stock}</td>
                    <td>{tx.name}</td>
                    <td>{tx.date}</td>
                    <td>{tx.type}</td>
                    <td>{tx.quantity}</td>
                    <td>{formatCurrency(tx.price)}</td>
                    <td>{formatCurrency(tx.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="footer">
        <p>This site is for educational use only. Financial data is provided &quot;as is&quot; and not to be construed as financial advice.</p>
      </footer>

      <style jsx>{`
        .container { font-family: Arial; max-width: 1400px; margin: 0 auto; padding: 20px; }
        .navbar { display: flex; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #eee; }
        .nav-title { font-size: 24px; font-weight: bold; margin-right: 30px; }
        .nav-link { margin-right: 15px; text-decoration: none; color: #333; font-size: 15px; }
        .performance-summary { background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .performance-metrics { display: flex; gap: 20px; flex-wrap: wrap; }
        .metric { min-width: 150px; }
        .metric-value { font-size: 16px; font-weight: bold; } /* smaller font */
        .green { color: #006400; }
        .red { color: #8B0000; }
        .transaction-container { display: flex; gap: 20px; flex-wrap: wrap; }
        .transaction-form, .transaction-history { flex: 1; min-width: 300px; }
        .form-group { margin-bottom: 15px; }
        .input { width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; } /* smaller inputs */
        .button { background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .clear { background: #f44336; margin-top: 10px; }
        .alert { color: #8B0000; background: #ffdddd; padding: 8px; border-radius: 4px; margin-top: 10px; font-size: 14px; }
        .table-wrapper { overflow-x: auto; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; } /* smaller font */
        .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; } /* smaller padding */
        .footer { margin-top: 40px; padding: 20px; background: #f8f8f8; border-top: 1px solid #eee; font-size: 11px; color: #666; text-align: center; }
      `}</style>
    </div>
  );
}

export async function getServerSideProps(context) {

  const res = await fetch(`/api/api/transactions`, {
    credentials: 'include',
    headers: {
      cookie: context.req.headers.cookie || '',
    },
  });

  if (res.status === 401) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      }
    };
  }

  const data = await res.json();

  const user = {
    id: data.current_user?.id || 'guest',
    isAuthenticated: data.current_user?.is_authenticated || false,
  };

  return {
    props: {
      user,
      transactionsData: data.transactions || [],
      stockPerformanceData: data.stockPerformance || [],
      realizedGainsTotal: data.realizedGainsTotal || 0,
      portfolioIrr: data.portfolioIRR || 0,
      error: '',
    },
  };
}
