import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Nav from './Nav';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function PortfolioPage({
  currentUser,
  marketData,
  totalValue,
  totalCost,
  totalGain,
  totalGainPct,
  portfolioTableData,
  errorMessage,
  allocation = [],
  sectorValues = {},
  gainLoss = [],
  treemap = [],
}) {
  const [activeGraph, setActiveGraph] = useState('stockPie');

  if (errorMessage) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  const formatCurrency = (num) => (typeof num === 'number' ? num.toFixed(2) : 'N/A');
  const formatQuantity = (num) => (typeof num === 'number' ? Math.round(num) : 'N/A');
  const formatPercent = (num) => (typeof num === 'number' ? num.toFixed(2) + '%' : 'N/A');

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
            <th key={header} style={{ border: '1px solid #ddd', padding: 8 }}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {portfolioTableData?.map((row, idx) => (
          <tr key={idx}>
            {Object.keys(row).map((key, jdx) => {
              let val = row[key];
              if (typeof val === 'number') {
                if (key === 'Quantity') val = formatQuantity(val);
                else if (key.includes('%')) val = formatPercent(val);
                else val = formatCurrency(val);
              }
              return <td key={jdx} style={{ border: '1px solid #ddd', padding: 8 }}>{val}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderGraph = () => {
    if (activeGraph === 'stockPie' && allocation.length) {
      return (
        <Plot
          data={[{
            type: 'pie',
            labels: allocation.map(a => a.ticker),
            values: allocation.map(a => a.allocation),
            textinfo: 'label+percent',
          }]}
          layout={{ title: 'Stock Allocation', height: 400 }}
        />
      );
    }

    if (activeGraph === 'sectorPie' && Object.keys(sectorValues).length) {
      return (
        <Plot
          data={[{
            type: 'pie',
            labels: Object.keys(sectorValues),
            values: Object.values(sectorValues),
            textinfo: 'label+percent',
          }]}
          layout={{ title: 'Sector Allocation', height: 400 }}
        />
      );
    }

    if (activeGraph === 'gainBar' && gainLoss.length) {
      return (
        <Plot
          data={[{
            type: 'bar',
            x: gainLoss.map(g => g.gain),
            y: gainLoss.map(g => g.ticker),
            orientation: 'h',
            marker: { color: gainLoss.map(g => g.gain >= 0 ? 'green' : 'red') },
          }]}
          layout={{ title: 'Gain/Loss by Stock', height: 400, yaxis: { autorange: 'reversed' } }}
        />
      );
    }

    if (activeGraph === 'treemap' && treemap.length) {
      return (
        <Plot
          data={[{
            type: 'treemap',
            labels: treemap.map(t => t.label),
            values: treemap.map(t => t.value),
            parents: treemap.map(() => ''),
            textinfo: 'label+value',
          }]}
          layout={{ title: 'Portfolio Treemap', height: 500 }}
        />
      );
    }

    return null;
  };

  return (
    <div style={{ fontFamily: 'Arial', maxWidth: 1400, margin: '0 auto', padding: 20 }}>
      <Nav user={currentUser} />

      <h1>Portfolio Overview</h1>

      <div style={marketSummaryStyle}>
        {['nasdaq', 'sp500', 'dow'].map((index) => {
          const data = marketData?.[index];
          const pos = data?.change >= 0;
          return (
            <div key={index} style={marketIndicatorStyle}>
              <div style={{ fontWeight: 'bold' }}>{index.toUpperCase()}</div>
              <div style={{ fontWeight: 'bold' }}>{data?.price?.toFixed(2) || 'N/A'}</div>
              <div style={{ color: pos ? '#006400' : '#8B0000' }}>
                {data?.change?.toFixed(2)} ({formatPercent((data?.change_pct || 0) * 100)})
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
          positive={totalGainPct > 0}
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

      {renderGraph()}
    </div>
  );
}

function SummaryItem({ label, value, positive }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div>{label}</div>
      <div style={{
        fontWeight: 'bold',
        fontSize: 18,
        color: positive ? '#006400' : '#8B0000',
      }}>
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
    return { redirect: { destination: '/login', permanent: false } };
  }

  const data = await res.json();

  return {
    props: {
      currentUser: {
        id: data?.current_user?.id || 'guest',
        isAuthenticated: data?.current_user?.is_authenticated || false,
      },
      marketData: data.marketData || {},
      totalValue: data.totalValue,
      totalCost: data.totalCost,
      totalGain: data.totalGain,
      totalGainPct: data.totalGainPercent,
      portfolioTableData: data.portfolioTableData || [],
      allocation: data.allocation || [],
      sectorValues: data.sectorValues || {},
      gainLoss: data.gainLoss || [],
      treemap: data.treemap || [],
      errorMessage: data.success ? null : data.error || 'Portfolio failed.',
    },
  };
}
