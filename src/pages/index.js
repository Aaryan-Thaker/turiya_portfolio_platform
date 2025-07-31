import React, { useState, useEffect } from 'react';
import Nav from './Nav'; // Adjust path if needed
import Plot from 'react-plotly.js';

export default function PortfolioPage({
  currentUser,
  marketData,
  totalValue,
  totalCost,
  totalGain,
  totalGainPct,
  portfolioTableData,
  allocation,
  gainLoss,
  treemap,
  sectorValues,
  errorMessage,
}) {
  const [activeGraph, setActiveGraph] = useState('stockPie');

  const sectorLabels = Object.keys(sectorValues || {});
  const sectorValuesArr = Object.values(sectorValues || {});

  // Chart data definitions
  const stockPieData = allocation
    ? {
        data: [
          {
            type: 'pie',
            labels: allocation.map((a) => a.ticker),
            values: allocation.map((a) => a.allocation),
            hole: 0,
            textinfo: 'label+percent',
          },
        ],
        layout: { title: 'Stock Allocation', height: 500, width: 500 },
      }
    : null;

  const sectorPieData = sectorLabels.length
    ? {
        data: [
          {
            type: 'pie',
            labels: sectorLabels,
            values: sectorValuesArr,
            hole: 0,
            textinfo: 'label+percent',
          },
        ],
        layout: { title: 'Sector Allocation', height: 500, width: 500 },
      }
    : null;

  const gainBarData = gainLoss
    ? {
        data: [
          {
            type: 'bar',
            x: gainLoss.map((g) => g.gain),
            y: gainLoss.map((g) => g.ticker),
            orientation: 'h',
            marker: {
              color: gainLoss.map((g) => (g.gain >= 0 ? 'green' : 'red')),
            },
          },
        ],
        layout: {
          title: 'Gain/Loss',
          height: 400,
          width: 700,
          yaxis: { autorange: 'reversed' },
        },
      }
    : null;

  const treemapData = treemap
    ? {
        data: [
          {
            type: 'treemap',
            labels: treemap.map((t) => t.label),
            values: treemap.map((t) => t.value),
            parents: Array(treemap.length).fill(''), // flat treemap, no parents
            textinfo: 'label+value',
          },
        ],
        layout: {
          title: 'Treemap',
          height: 500,
          width: 700,
        },
      }
    : null;

  // Chart render helper
  const renderChart = (key, title) => {
    let chart = null;
    switch (key) {
      case 'stockPie':
        chart = stockPieData;
        break;
      case 'sectorPie':
        chart = sectorPieData;
        break;
      case 'gainBar':
        chart = gainBarData;
        break;
      case 'treemap':
        chart = treemapData;
        break;
      default:
        return null;
    }
    if (!chart) return null;

    return (
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h3>{title}</h3>
        <Plot data={chart.data} layout={chart.layout} />
      </div>
    );
  };

  // Effect: log market data when changed
  useEffect(() => {
    console.log('Market Data:', marketData);
  }, [marketData]);

  // Error display
  if (errorMessage) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  // Helpers for formatting
  const formatCurrency = (num) => (typeof num === 'number' ? num.toFixed(2) : 'N/A');
  const formatQuantity = (num) => (typeof num === 'number' ? Math.round(num) : 'N/A');
  const formatPercent = (num) => (typeof num === 'number' ? num.toFixed(2) + '%' : 'N/A');
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d) ? 'N/A' : d.toISOString().slice(0, 10);
  };

  // Table rendering
  const renderTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
      <thead>
        <tr>
          {[
            'Ticker',
            'Name',
            'Quantity',
            'Currency',
            'Avg Cost/Share',
            'CMP',
            'Current Value',
            'Total Cost',
            'Gain/Loss',
            'Gain/Loss %',
            'AllocationPercent',
            'Investment Date',
            'Exchange',
            '52w High',
            '52w Low',
            'Unrealized Gains',
            'Sector',
          ].map((header) => (
            <th key={header} style={{ border: '1px solid #ddd', padding: 8 }}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {portfolioTableData?.map((row, idx) => (
          <tr key={idx}>
            {[
              'Ticker',
              'Name',
              'Quantity',
              'Currency',
              'Avg Cost/Share',
              'CMP',
              'Current Value',
              'Total Cost',
              'Gain/Loss',
              'Gain/Loss %',
              'AllocationPercent',
              'Investment Date',
              'Exchange',
              '52w High',
              '52w Low',
              'Unrealized Gains',
              'Sector',
            ].map((key, jdx) => {
              let displayValue = row[key];
              if (typeof displayValue === 'number') {
                if (key === 'Quantity') displayValue = formatQuantity(displayValue);
                else if (key === 'Gain/Loss %' || key === 'AllocationPercent') displayValue = formatPercent(displayValue);
                else if (
                  [
                    'Avg Cost/Share',
                    'CMP',
                    'Current Value',
                    'Total Cost',
                    'Gain/Loss',
                    'Unrealized Gains',
                    '52w High',
                    '52w Low',
                  ].includes(key)
                )
                  displayValue = formatCurrency(displayValue);
              }
              return (
                <td key={jdx} style={{ border: '1px solid #ddd', padding: 8 }}>
                  {displayValue}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: 1400,
        margin: '0 auto',
        padding: 20,
        fontSize: 13,
      }}
    >
      <Nav user={currentUser} />

      <h1>Portfolio Overview</h1>

      <div style={marketSummaryStyle}>
        {['nasdaq', 'sp500', 'dow'].map((index) => {
          const data = marketData?.[index];
          if (!data || data.price === undefined) {
            return (
              <div key={index} style={marketIndicatorStyle}>
                <div style={{ fontWeight: 'bold' }}>{index.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: '#888' }}>Data unavailable</div>
              </div>
            );
          }
          const positive = data.change >= 0;
          return (
            <div key={index} style={marketIndicatorStyle}>
              <div style={{ fontWeight: 'bold' }}>{index.toUpperCase()}</div>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                {typeof data.price === 'number' ? data.price.toFixed(2) : 'N/A'}
              </div>
              <div style={{ fontSize: 14, color: positive ? '#006400' : '#8B0000' }}>
                {data.change.toFixed(2)} ({formatPercent(data.change_pct * 100)})
              </div>
            </div>
          );
        })}
      </div>

      <div style={portfolioSummaryStyle}>
        <SummaryItem label="Total Current Value" value={formatCurrency(totalValue)} />
        <SummaryItem label="Total Investment Cost" value={formatCurrency(totalCost)} />
        <SummaryItem
          label="Total Gain/Loss"
          value={`${formatCurrency(totalGain)} (${formatPercent(totalGainPct)})`}
          positive={parseFloat(totalGainPct) > 0}
        />
      </div>

      {renderTable()}

      <div style={{ marginBottom: 20 }}>
        {['stockPie', 'sectorPie', 'gainBar', 'treemap'].map((key) => (
          <button
            key={key}
            onClick={() => setActiveGraph(key)}
            style={{
              marginRight: 10,
              padding: '6px 12px',
              background: activeGraph === key ? '#0b7dda' : '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {renderChart('stockPie', 'Stock Allocation')}
      {renderChart('sectorPie', 'Sector Allocation')}
      {renderChart('gainBar', 'Gain/Loss Chart')}
      {renderChart('treemap', 'Treemap')}
    </div>
  );
}

function SummaryItem({ label, value, positive }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div>{label}</div>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 18,
          color: positive ? '#006400' : positive === false ? '#8B0000' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const marketSummaryStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 20,
  padding: 15,
  background: '#f8f8f8',
  borderRadius: 5,
};

const marketIndicatorStyle = {
  textAlign: 'center',
  padding: '0 15px',
};

const portfolioSummaryStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '20px 0',
  padding: 15,
  background: '#f8f8f8',
  borderRadius: 5,
  fontSize: 15,
};

export async function getServerSideProps(context) {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = context.req.headers.host;
  const backendUrl = `${protocol}://${host}/api/portfolio`;

  const res = await fetch(backendUrl, {
    method: 'GET',
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
      },
    };
  }

  const data = await res.json();

  const currentUser = {
    id: data?.current_user?.id || 'guest',
    isAuthenticated: data?.current_user?.is_authenticated || false,
  };

  if (!res.ok || !data.success) {
    return {
      props: {
        currentUser,
        errorMessage: data.error || 'Error loading portfolio data.',
      },
    };
  }

  return {
    props: {
      currentUser,
      marketData: data.marketData || {},
      totalValue: data.totalValue,
      totalCost: data.totalCost,
      totalGain: data.totalGain,
      totalGainPct: data.totalGainPercent,
      portfolioTableData: data.portfolioTableData || [],
      allocation: data.allocation || [],
      gainLoss: data.gainLoss || [],
      treemap: data.treemap || [],
      sectorValues: data.sectorValues || {},
      showResults: true,
    },
  };
}
