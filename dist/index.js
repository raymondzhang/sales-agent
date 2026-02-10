/**
 * Sales Agent API
 * 支持 FC 3.0 和本地 HTTP 服务器
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createServer } from "http";
// ============================================================================
// 数据存储
// ============================================================================
const DATA_FILE = process.env.DATA_FILE || "/tmp/data.json";
function loadData() {
    if (existsSync(DATA_FILE)) {
        return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    }
    return { leads: [], templates: [], meetings: [], followUps: [] };
}
function saveData(data) {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
// ============================================================================
// 工具函数
// ============================================================================
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};
// ============================================================================
// API 处理器
// ============================================================================
const handlers = {
    create_lead: (args) => {
        const data = loadData();
        const lead = {
            id: generateId(),
            name: args.name,
            email: args.email,
            phone: args.phone,
            company: args.company,
            title: args.title,
            status: args.status || "new",
            source: args.source,
            notes: [],
            createdAt: now(),
            updatedAt: now(),
            estimatedValue: args.estimatedValue,
            priority: args.priority || "medium",
            tags: args.tags || [],
        };
        data.leads.push(lead);
        saveData(data);
        return { success: true, lead };
    },
    list_leads: () => ({ success: true, leads: loadData().leads }),
    get_lead: (args) => {
        const lead = loadData().leads.find((l) => l.id === args.leadId);
        return lead ? { success: true, lead } : { success: false, error: "Not found" };
    },
    update_lead: (args) => {
        const data = loadData();
        const idx = data.leads.findIndex((l) => l.id === args.leadId);
        if (idx === -1)
            return { success: false, error: "Not found" };
        data.leads[idx] = { ...data.leads[idx], ...args.updates, updatedAt: now() };
        saveData(data);
        return { success: true, lead: data.leads[idx] };
    },
    delete_lead: (args) => {
        const data = loadData();
        data.leads = data.leads.filter((l) => l.id !== args.leadId);
        saveData(data);
        return { success: true };
    },
    get_pipeline: () => {
        const leads = loadData().leads;
        const pipeline = {
            new: { count: 0, value: 0 },
            contacted: { count: 0, value: 0 },
            qualified: { count: 0, value: 0 },
            proposal: { count: 0, value: 0 },
            negotiation: { count: 0, value: 0 },
            closed_won: { count: 0, value: 0 },
            closed_lost: { count: 0, value: 0 },
        };
        leads.forEach((l) => {
            if (pipeline[l.status]) {
                pipeline[l.status].count++;
                pipeline[l.status].value += l.estimatedValue || 0;
            }
        });
        return { success: true, pipeline, total: leads.length };
    },
    // 占位符，返回空数据避免前端报错
    dashboard: () => ({
        success: true,
        stats: { totalLeads: 0, activeLeads: 0, totalPipelineValue: 0, winRate: "0%" },
        pipeline: { new: 0, contacted: 0, qualified: 0, proposal: 0, negotiation: 0, closed_won: 0, closed_lost: 0 },
        upcomingMeetings: [],
        pendingFollowUps: [],
        recentLeads: []
    }),
    templates: () => ({ success: true, templates: [] }),
    meetings: () => ({ success: true, meetings: [] }),
    followups: () => ({ success: true, followUps: [] }),
    reports_sales: () => ({ success: true, leads: {}, activity: {}, revenue: {} }),
};
// ============================================================================
// 请求处理
// ============================================================================
async function handleRequest(path, queries, body, rawReq) {
    // 调试端点
    if (path === "/debug") {
        return {
            statusCode: 200,
            body: {
                path,
                queries,
                body,
                rawReq: rawReq ? Object.keys(rawReq) : null
            }
        };
    }
    if (path === "/health") {
        return { statusCode: 200, body: { status: "ok", time: now() } };
    }
    if (path.startsWith("/api/")) {
        const action = path.replace("/api/", "").replace(/\//g, "_");
        const handler = handlers[action];
        if (!handler) {
            return { statusCode: 404, body: { error: "Not found", action } };
        }
        const args = { ...queries, ...body };
        return { statusCode: 200, body: handler(args) };
    }
    return {
        statusCode: 200,
        body: {
            name: "Sales Agent API",
            version: "1.0",
            endpoints: ["/health", "/api/create_lead", "/api/list_leads", "/api/get_pipeline"],
        },
    };
}
// ============================================================================
// FC 3.0 Handler
// ============================================================================
export const handler = async (req) => {
    if (req.method === "OPTIONS" || req.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: corsHeaders, body: "" };
    }
    // FC 3.0 使用 rawPath，标准 HTTP 使用 path 或 url
    const path = req.rawPath || req.path || req.url || "/";
    const queries = req.queryString || req.queries || {};
    const body = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
    console.log("FC Request:", { path, queries, body });
    const result = await handleRequest(path, queries, body, req);
    return {
        statusCode: result.statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(result.body),
    };
};
// ============================================================================
// 本地 HTTP 服务器（开发模式）
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
    const PORT = process.env.PORT || 3001;
    const server = createServer(async (req, res) => {
        // CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }
        // 解析 body
        let body = {};
        if (req.method === "POST" || req.method === "PUT") {
            const chunks = [];
            for await (const chunk of req)
                chunks.push(chunk);
            const data = Buffer.concat(chunks).toString();
            try {
                body = JSON.parse(data);
            }
            catch { }
        }
        // 解析 URL
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const queries = Object.fromEntries(url.searchParams);
        // 处理请求
        const result = await handleRequest(url.pathname, queries, body);
        res.writeHead(result.statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.body));
    });
    server.listen(PORT, () => {
        console.log(`🚀 API Server running at http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
    });
}
