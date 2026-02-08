# Sales Agent Web Dashboard

A modern React-based web dashboard for the Sales Agent MCP Server.

## Features

- 📊 **Dashboard** - Overview of your sales pipeline, upcoming meetings, and recent leads
- 👥 **Leads Management** - Create, view, update, and delete leads with search and filter
- 🎯 **Pipeline Kanban** - Visual kanban board to track leads through your sales stages
- 📅 **Meetings** - Schedule meetings with calendar view and track upcoming appointments
- ✉️ **Email Templates** - Manage email templates with variable substitution
- 📈 **Analytics** - Charts and reports on sales performance, pipeline value, and activity

## Quick Start

### 1. Start the API Server

First, start the HTTP server (from the sales-agent directory):

```bash
cd /Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent
npm run start:server
```

The server will run on `http://localhost:3001`

### 2. Start the Web Dashboard

In a new terminal, start the web app:

```bash
cd /Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent/web
npm run dev
```

The dashboard will open at `http://localhost:3000`

## Building for Production

```bash
cd /Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent/web
npm run build
```

The built files will be in the `dist/` directory.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  HTTP API Server │────▶│  In-Memory DB   │
│  (Port 3000)    │     │  (Port 3001)     │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### API Endpoints

The server exposes REST API endpoints at `/api/*`:

- `GET /api/dashboard` - Dashboard overview
- `GET /api/leads` - List leads
- `POST /api/leads/create` - Create lead
- `POST /api/leads/update` - Update lead
- `POST /api/leads/delete` - Delete lead
- `GET /api/pipeline` - Pipeline data
- `GET /api/meetings` - List meetings
- `POST /api/meetings/create` - Schedule meeting
- `GET /api/templates` - List email templates
- `POST /api/templates/create` - Create template
- `GET /api/reports/sales` - Sales reports

## Sharing with Colleagues

To let colleagues use the web dashboard:

1. **Same Network**: They can access your dashboard at `http://YOUR_IP:3000`

2. **Deploy to Server**: Deploy both the API server and web dashboard to a shared server

3. **Update API URL**: In `web/src/hooks/useApi.ts`, change the API_BASE to point to your server:
   ```typescript
   const API_BASE = 'http://your-server:3001/api';
   ```

## Data Storage

**Note**: Data is stored in-memory and will be lost when the server restarts. For production use, consider adding persistent storage.

## Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts
- **Backend**: Node.js, TypeScript, MCP SDK
- **Build Tool**: Vite
