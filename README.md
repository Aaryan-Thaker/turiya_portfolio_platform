```markdown
# Turiya Portfolio Platform (Frontend)

[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Plotly](https://img.shields.io/badge/Plotly.js-3.0-3F4F75?style=flat-square&logo=plotly)](https://plotly.com/javascript/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-34.2-2196F3?style=flat-square)](https://www.ag-grid.com/)

A personal wealth intelligence and portfolio analytics dashboard. Built with Next.js 15, React 19, Plotly.js, and AG Grid, the application provides interactive risk profiling, transaction ledger management with client-side CSV parsing, and asset valuation trajectory graphs backed by a decoupled Python/Flask REST service.

---

## Architecture Overview

The frontend serves as a decoupled client layer communicating with the Flask backend through an authenticated Next.js server-side API proxy gateway.
```

### Core Architectural Decisions

* **Zero Client-Side Token Exposure:** Access tokens are excluded from browser-visible session objects. Tokens remain stored strictly inside encrypted server-side JWT session cookies handled by NextAuth.
* **Server-Side API Gateway Proxy (`/api/proxy/[...path].js`):** Client components dispatch requests to local Next.js proxy endpoints using browser session credentials. The gateway validates the session server-side via `getToken({ req })`, resolves the backend URL dynamically from environment variables, attaches the Bearer token, and forwards requests to the Flask engine.
* **High-Density Financial Grids & Parsing:** Uses AG Grid for high-performance sorting, filtering, and transaction state rendering, paired with PapaParse for client-side batch CSV validation prior to ingestion.

---

## Key Features

* **Authenticated Portfolio Tracking:** Google OAuth 2.0 integration via NextAuth with protected route guards and session handling.
* **Institutional Transaction Grid:** AG Grid integration for tracking buys, sells, and portfolio movements with real-time editing.
* **Client-Side Bulk Ingestion:** Rapid CSV transaction parsing and schema validation using PapaParse before backend transmission.
* **Interactive Financial Analytics:** Dynamic valuation modeling and allocation curves rendered with Plotly.js (`react-plotly.js`).
* **Quantitative Risk Profiling:** Investor risk assessment questionnaires capturing client profiling and digital signatures.

---

## Tech Stack

* **Framework:** Next.js 15 (Pages Router)
* **Core:** React 19
* **Styling:** Tailwind CSS v4, PostCSS
* **Data Grids:** AG Grid Community (`ag-grid-react` v34)
* **Visualizations:** Plotly.js (`react-plotly.js` v2.6, `plotly.js` v3.0)
* **Data Parsing:** PapaParse (CSV)
* **Authentication:** NextAuth.js v4 (Google OAuth 2.0, Server-Side JWT Strategy)
* **HTTP Client:** Axios & Native Fetch API

---

## Getting Started

### Prerequisites

* **Node.js:** `>= 18.18.0`
* **npm:** `>= 9.0.0`
* A running instance of the [PortoflioBackend](https://github.com/Aaryan-Thaker/PortoflioBackend) service.

### 1. Clone the Repository

```bash
git clone git@github.com:Aaryan-Thaker/turiya_portfolio_platform.git
cd turiya_portfolio_platform

```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local

```

Configure your environment variables:

```ini
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Backend Service Target
BACKEND_API_URL=http://127.0.0.1:5000

```

> **Tip:** Generate a cryptographically random secret for `NEXTAUTH_SECRET`:
> ```bash
> openssl rand -base64 32
> 
> ```
> 
> 

### 3. Install Dependencies

```bash
npm install

```

### 4. Run Development Server

```bash
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build & Linting

```bash
# Run Next.js and ESLint code checks
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start

```

---

## Directory Structure

```
turiya_portfolio_platform/
├── public/                  # Static assets and icons
├── src/
│   ├── components/          # Reusable UI components (Bulk upload, Nav, Modals)
│   ├── pages/
│   │   ├── api/
│   │   │   ├── auth/        # NextAuth handlers ([...nextauth].js)
│   │   │   └── proxy/       # Secure server-side API proxy ([...path].js)
│   │   ├── _app.js          # App entrypoint and global state providers
│   │   ├── index.js         # Primary portfolio overview dashboard
│   │   ├── risk-assessment  # Risk profiling questionnaire & results
│   │   ├── transactions.js  # Transaction ledger and management
│   │   └── valuation.js     # Valuation graphs and balance breakdowns
│   └── styles/              # Global styles and Tailwind configurations
├── .env.example             # Documented environment template
├── next.config.mjs          # Next.js build and routing rewrites
├── package.json             # Dependencies and scripts
└── tailwind.config.js       # Design token system

```

---

## Related Repositories

* **Backend Computational Service:** [Aaryan-Thaker/PortoflioBackend](https://github.com/Aaryan-Thaker/PortoflioBackend) – Decoupled Flask REST API handling PostgreSQL operations, yfinance market data caching, and quantitative valuation analytics.

```

---

### Push It to GitHub

In Git Bash:
```bash
git add README.md
git commit -m "docs: finalize production readme with clean mermaid diagram"
git push origin main

```

Now toggle `turiya_portfolio_platform` to **Public** in GitHub Settings. Then switch into `PortoflioBackend` so we can fix its dependencies and CORS.
