# Unified Metadata Federation Platform — Frontend UI Setup

This directory contains the React + Vite + TypeScript frontend for the **Unified Metadata Federation Platform** built for the Dell Hackathon judging presentation.

## Features Included
1. **Interactive KPI Dashboard:** Exposes real-time Federation Score, Consistency Score, Hit Rates, and System Status indicators.
2. **Telemetry Charts:** Custom Recharts visualization of search activity logs (Pie Chart) and intelligence score breakdown (Bar Chart).
3. **Federated Intelligent Search:** Parallel search execution querying NLP, discovery, and federated search endpoints concurrently.
4. **Consistency Audit Center:** Interactive schema audits showing mismatched attributes (`object_type`, `owner_name`, `description`) across database catalogs.
5. **Schema Reconciliation:** Run the source-of-truth reconciliation algorithm and view update logs.
6. **Metadata CRUD Management:** Complete registration, lookup, modification, and deletion tables with role-based restrictions.
7. **Timeline & Audit Logs:** Live streams for recent system events and security audits.

---

## Getting Started

### Prerequisites
- **Node.js:** Ensure you have Node.js installed (v18+ recommended).
- **Backend Running:** Ensure the FastAPI backend is running (typically on `http://localhost:8000`).

### Installation
From this `frontend` directory, install all required packages:
```bash
npm install
```

### Running in Development Mode
Start the Vite local development server:
```bash
npm run dev
```
The server will typically start at `http://localhost:5173`. Open this URL in your web browser.

### Building for Production
To bundle the project for production deployment:
```bash
npm run build
```

---

## Project Architecture

```
frontend/
├── src/
│   ├── components/      # Common UI Components (Sidebar, Navbar, etc.)
│   ├── pages/           # Page layouts (Dashboard, Search, Metadata, etc.)
│   ├── services/        # Axios API configurations with JWT interceptors
│   ├── App.tsx          # Router setup, auth middleware, and providers
│   ├── main.tsx         # Mount node
│   └── index.css        # Tailwind CSS v4 import configurations
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Vite config registered with @tailwindcss/vite plugin
```

### Key Libraries Used
- **Tailwind CSS v4:** Modern styling with zero configuration files required.
- **Axios:** REST API communications with automatic JWT token attachment.
- **Lucide React:** Premium modern icons.
- **Recharts:** High-performance, clean charts for dashboard telemetry.
- **React Query:** For caching and background query refetching.

---

## Authentication Accounts
Log in using one of the predefined system accounts to test role-based access:

| Username | Password | Role | Permissions |
| --- | --- | --- | --- |
| `admin` | `admin123` | **Admin** | Read, Create, Update, Delete Metadata & Reconciliation |
| `engineer` | `engineer123` | **Engineer** | Read, Create, Update Metadata & Reconciliation |
| `viewer` | `viewer123` | **Viewer** | Read-Only Access (Forms are locked/disabled) |
