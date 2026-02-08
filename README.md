# Sales Agent MCP Server

A comprehensive sales automation MCP server with a modern web dashboard - everything a salesperson needs!

## Features

### 🎯 Lead Management
- Create, update, and track leads through your pipeline
- Search and filter leads by status, priority, source, tags
- Add notes and track all interactions
- Support for deal value estimation and priority scoring

### 📧 Email Automation
- Pre-built email templates (Introduction, Follow-up, Proposal)
- Custom template creation with variable substitution
- Email composition with template or custom content
- Email logging and history tracking

### 📅 Scheduling
- Schedule meetings with leads
- Track meeting status and outcomes
- Create and manage follow-up tasks
- Never miss a follow-up with task management

### 📊 Analytics
- Sales pipeline overview with stage breakdown
- Revenue tracking and win rate calculation
- Activity reports (emails sent, meetings scheduled)
- Lead activity summaries
- Interactive charts and visualizations

## Quick Start

### Option 1: Web Dashboard (Recommended)

The easiest way to use Sales Agent is through the web dashboard:

```bash
# 1. Install dependencies
cd sales-agent
npm install

# 2. Build the server
npm run build

# 3. Start the API server
npm run start:server

# 4. In a new terminal, start the web dashboard
cd web
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

### Option 2: MCP Server (for AI assistants)

Add this to your MCP settings file:

**macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

**Windows**: `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "sales-agent": {
      "command": "node",
      "args": ["/Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent/dist/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Web Dashboard Features

The web dashboard provides a rich UI for managing your sales:

### 📊 Dashboard
- Overview stats (total leads, pipeline value, meetings, follow-ups)
- Pipeline visualization
- Recent leads
- Upcoming meetings
- Pending follow-ups

### 👥 Leads
- Full CRUD operations
- Search and filter by status/priority
- Lead detail view with notes

### 🎯 Pipeline
- Kanban board view
- Drag leads between stages
- Value tracking per stage

### 📅 Meetings
- Schedule new meetings
- Calendar-style list view
- Meeting details and links

### ✉️ Templates
- Manage email templates
- Variable substitution preview
- Copy template content

### 📈 Analytics
- Revenue charts
- Pipeline breakdown
- Activity over time
- Win rate calculations

## Available Tools (MCP)

### Lead Management
- `create_lead` - Create new sales leads
- `get_lead` - Get lead details
- `list_leads` - List all leads with filters
- `update_lead` - Update lead status/info
- `add_lead_note` - Add notes to leads
- `search_leads` - Search leads
- `delete_lead` - Delete leads

### Email Automation
- `list_email_templates` - View available templates
- `get_email_template` - Get template details
- `create_email_template` - Create custom templates
- `update_email_template` - Update templates
- `delete_email_template` - Delete templates
- `compose_email` - Compose emails
- `log_email` - Log sent emails
- `get_email_history` - View email history

### Scheduling
- `schedule_meeting` - Schedule meetings
- `update_meeting` - Update meetings
- `delete_meeting` - Delete meetings
- `list_meetings` - List meetings
- `create_follow_up` - Create follow-up tasks
- `update_follow_up` - Update follow-ups
- `delete_follow_up` - Delete follow-ups
- `get_follow_ups` - View follow-ups
- `complete_follow_up` - Mark follow-ups complete

### Analytics
- `get_pipeline` - Pipeline overview
- `get_sales_report` - Sales reports
- `get_lead_activity` - Individual lead activity
- `get_dashboard` - Dashboard overview

## Sharing with Colleagues

### Web Dashboard

To share the web dashboard with colleagues:

1. **Same Network**: They can access your dashboard at `http://YOUR_IP:3000`

2. **Deploy to Server**: 
   - Deploy the API server to a server (e.g., `https://api.yourcompany.com`)
   - Update the web app API base URL
   - Deploy the web app (e.g., `https://sales.yourcompany.com`)

3. **Environment Variables**:
   ```bash
   # For the server
   PORT=3001
   HOST=0.0.0.0
   
   # For the web app (in .env file)
   VITE_API_URL=https://api.yourcompany.com
   ```

## Data Storage

**Note**: Data is stored in-memory and will be lost when the server restarts. For production use:

1. Keep the server running continuously
2. Add persistent storage (SQLite, PostgreSQL, etc.)
3. Implement data export/backup

## Project Structure

```
sales-agent/
├── src/
│   ├── index.ts          # MCP Server (stdio)
│   └── server-http.ts    # HTTP API Server
├── web/                  # React Web Dashboard
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # UI components
│   │   ├── hooks/        # API hooks
│   │   └── types/        # TypeScript types
│   └── dist/             # Built web app
└── dist/                 # Built server
```

## Technologies

- **Backend**: Node.js, TypeScript, MCP SDK
- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts
- **Build**: Vite, TypeScript Compiler

## License

MIT