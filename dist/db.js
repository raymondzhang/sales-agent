import { Pool } from 'pg';
// Database connection using DATABASE_URL (Railway provides this automatically)
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.warn('DATABASE_URL not set. Using local development database.');
}
// Create connection pool
const pool = new Pool({
    connectionString: DATABASE_URL || 'postgresql://localhost:5432/sales_agent',
    ssl: DATABASE_URL ? { rejectUnauthorized: false } : false, // Required for Railway PostgreSQL
});
// Helper to parse JSON from PostgreSQL
function parseJSON(json) {
    if (typeof json === 'string') {
        try {
            return JSON.parse(json);
        }
        catch {
            return [];
        }
    }
    return json;
}
// Helper to convert camelCase to snake_case for PostgreSQL
function toSnakeCase(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = value;
    }
    return result;
}
// Execute query with params
async function query(sql, params = []) {
    const client = await pool.connect();
    try {
        return await client.query(sql, params);
    }
    finally {
        client.release();
    }
}
// Initialize tables
export async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Leads table
        await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT NOT NULL,
        title TEXT,
        status TEXT DEFAULT 'new',
        source TEXT NOT NULL,
        notes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_contacted_at TIMESTAMP,
        estimated_value REAL,
        priority TEXT DEFAULT 'medium',
        tags JSONB DEFAULT '[]'::jsonb
      )
    `);
        // Email templates table
        await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        category TEXT DEFAULT 'custom',
        variables JSONB DEFAULT '[]'::jsonb
      )
    `);
        // Email logs table
        await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        template_id TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        status TEXT DEFAULT 'sent'
      )
    `);
        // Meetings table
        await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        scheduled_at TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 30,
        location TEXT,
        meeting_link TEXT,
        status TEXT DEFAULT 'scheduled',
        outcome TEXT
      )
    `);
        // Follow-ups table
        await client.query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        type TEXT DEFAULT 'task',
        scheduled_at TIMESTAMP NOT NULL,
        description TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP
      )
    `);
        await client.query('COMMIT');
        // Insert default templates if none exist
        const { rows } = await query('SELECT COUNT(*) as count FROM email_templates');
        if (parseInt(rows[0].count) === 0) {
            const defaultTemplates = [
                {
                    id: 'template-1',
                    name: 'Introduction Email',
                    subject: 'Introduction - {{company}} & {{senderCompany}}',
                    body: `Hi {{name}},

I hope this email finds you well. My name is {{senderName}} from {{senderCompany}}.

I came across {{company}} and was impressed by {{achievement}}. I believe there might be a great opportunity for us to collaborate.

Would you be open to a brief 15-minute call next week to explore how we can help {{company}} achieve {{goal}}?

Looking forward to hearing from you.

Best regards,
{{senderName}}
{{senderTitle}}
{{senderCompany}}`,
                    category: 'introduction',
                    variables: JSON.stringify(['name', 'company', 'senderName', 'senderCompany', 'achievement', 'goal', 'senderTitle']),
                },
                {
                    id: 'template-2',
                    name: 'Follow-Up After No Response',
                    subject: 'Re: {{previousSubject}}',
                    body: `Hi {{name}},

I wanted to follow up on my previous email about {{topic}}.

I understand you're busy, so I'll keep this brief. {{valueProposition}}

If this isn't a priority right now, I completely understand. Just let me know if you'd like me to check back in a few months.

Best,
{{senderName}}`,
                    category: 'follow_up',
                    variables: JSON.stringify(['name', 'previousSubject', 'topic', 'valueProposition', 'senderName']),
                },
                {
                    id: 'template-3',
                    name: 'Meeting Proposal',
                    subject: 'Proposal Discussion - {{company}}',
                    body: `Hi {{name}},

Thank you for taking the time to speak with me {{meetingDate}}.

As discussed, I've prepared a tailored proposal for {{company}} that addresses:
{{keyPoints}}

The estimated value for {{company}} would be approximately {{estimatedValue}}.

Would you be available for a 30-minute call this week to review the details and answer any questions?

Best regards,
{{senderName}}`,
                    category: 'proposal',
                    variables: JSON.stringify(['name', 'company', 'meetingDate', 'keyPoints', 'estimatedValue', 'senderName']),
                },
            ];
            for (const template of defaultTemplates) {
                await query('INSERT INTO email_templates (id, name, subject, body, category, variables) VALUES ($1, $2, $3, $4, $5, $6)', [template.id, template.name, template.subject, template.body, template.category, template.variables]);
            }
        }
        console.log('PostgreSQL database initialized successfully');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Database initialization failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Lead operations
export const leadsDB = {
    create: async (lead) => {
        await query(`INSERT INTO leads (id, name, email, phone, company, title, status, source, notes, estimated_value, priority, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            lead.id,
            lead.name,
            lead.email,
            lead.phone || null,
            lead.company,
            lead.title || null,
            lead.status,
            lead.source,
            JSON.stringify(lead.notes || []),
            lead.estimatedValue || null,
            lead.priority,
            JSON.stringify(lead.tags || [])
        ]);
    },
    getById: async (id) => {
        const { rows } = await query('SELECT * FROM leads WHERE id = $1', [id]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return {
            ...row,
            notes: parseJSON(row.notes),
            tags: parseJSON(row.tags),
            estimatedValue: row.estimated_value,
            lastContactedAt: row.last_contacted_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    },
    list: async (filters = {}) => {
        let sql = 'SELECT * FROM leads WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters.status) {
            sql += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }
        if (filters.priority) {
            sql += ` AND priority = $${paramIndex++}`;
            params.push(filters.priority);
        }
        if (filters.source) {
            sql += ` AND source = $${paramIndex++}`;
            params.push(filters.source);
        }
        sql += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, created_at DESC';
        const { rows } = await query(sql, params);
        return rows.map(row => ({
            ...row,
            notes: parseJSON(row.notes),
            tags: parseJSON(row.tags),
            estimatedValue: row.estimated_value,
            lastContactedAt: row.last_contacted_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    },
    update: async (id, updates) => {
        const sets = [];
        const params = [];
        let paramIndex = 1;
        if (updates.name) {
            sets.push(`name = $${paramIndex++}`);
            params.push(updates.name);
        }
        if (updates.email) {
            sets.push(`email = $${paramIndex++}`);
            params.push(updates.email);
        }
        if (updates.phone !== undefined) {
            sets.push(`phone = $${paramIndex++}`);
            params.push(updates.phone);
        }
        if (updates.company) {
            sets.push(`company = $${paramIndex++}`);
            params.push(updates.company);
        }
        if (updates.title !== undefined) {
            sets.push(`title = $${paramIndex++}`);
            params.push(updates.title);
        }
        if (updates.status) {
            sets.push(`status = $${paramIndex++}`);
            params.push(updates.status);
        }
        if (updates.priority) {
            sets.push(`priority = $${paramIndex++}`);
            params.push(updates.priority);
        }
        if (updates.estimatedValue !== undefined) {
            sets.push(`estimated_value = $${paramIndex++}`);
            params.push(updates.estimatedValue);
        }
        if (updates.notes) {
            sets.push(`notes = $${paramIndex++}`);
            params.push(JSON.stringify(updates.notes));
        }
        if (updates.tags) {
            sets.push(`tags = $${paramIndex++}`);
            params.push(JSON.stringify(updates.tags));
        }
        if (updates.lastContactedAt) {
            sets.push(`last_contacted_at = $${paramIndex++}`);
            params.push(updates.lastContactedAt);
        }
        sets.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        await query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);
    },
    delete: async (id) => {
        await query('DELETE FROM leads WHERE id = $1', [id]);
    },
    search: async (queryStr) => {
        const searchTerm = `%${queryStr.toLowerCase()}%`;
        const { rows } = await query(`SELECT * FROM leads WHERE 
        LOWER(name) LIKE $1 OR 
        LOWER(company) LIKE $2 OR 
        LOWER(email) LIKE $3 OR
        LOWER(tags::text) LIKE $4
      ORDER BY created_at DESC`, [searchTerm, searchTerm, searchTerm, searchTerm]);
        return rows.map(row => ({
            ...row,
            notes: parseJSON(row.notes),
            tags: parseJSON(row.tags),
            estimatedValue: row.estimated_value,
            lastContactedAt: row.last_contacted_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    },
};
// Email template operations
export const templatesDB = {
    list: async () => {
        const { rows } = await query('SELECT * FROM email_templates');
        return rows.map(row => ({
            ...row,
            variables: parseJSON(row.variables),
        }));
    },
    getById: async (id) => {
        const { rows } = await query('SELECT * FROM email_templates WHERE id = $1', [id]);
        if (rows.length === 0)
            return null;
        return {
            ...rows[0],
            variables: parseJSON(rows[0].variables),
        };
    },
    create: async (template) => {
        await query('INSERT INTO email_templates (id, name, subject, body, category, variables) VALUES ($1, $2, $3, $4, $5, $6)', [template.id, template.name, template.subject, template.body, template.category, JSON.stringify(template.variables)]);
    },
    update: async (id, updates) => {
        const sets = [];
        const params = [];
        let paramIndex = 1;
        if (updates.name) {
            sets.push(`name = $${paramIndex++}`);
            params.push(updates.name);
        }
        if (updates.subject) {
            sets.push(`subject = $${paramIndex++}`);
            params.push(updates.subject);
        }
        if (updates.body) {
            sets.push(`body = $${paramIndex++}`);
            params.push(updates.body);
        }
        if (updates.category) {
            sets.push(`category = $${paramIndex++}`);
            params.push(updates.category);
        }
        if (updates.variables) {
            sets.push(`variables = $${paramIndex++}`);
            params.push(JSON.stringify(updates.variables));
        }
        params.push(id);
        await query(`UPDATE email_templates SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);
    },
    delete: async (id) => {
        await query('DELETE FROM email_templates WHERE id = $1', [id]);
    },
};
// Email logs operations
export const emailsDB = {
    create: async (email) => {
        await query('INSERT INTO email_logs (id, lead_id, template_id, subject, body, status) VALUES ($1, $2, $3, $4, $5, $6)', [email.id, email.leadId, email.templateId || null, email.subject, email.body, email.status]);
    },
    listByLead: async (leadId) => {
        let rows;
        if (leadId) {
            const result = await query('SELECT * FROM email_logs WHERE lead_id = $1 ORDER BY sent_at DESC', [leadId]);
            rows = result.rows;
        }
        else {
            const result = await query('SELECT * FROM email_logs ORDER BY sent_at DESC');
            rows = result.rows;
        }
        return rows.map(row => ({
            ...row,
            leadId: row.lead_id,
            templateId: row.template_id,
            sentAt: row.sent_at,
            openedAt: row.opened_at,
            clickedAt: row.clicked_at,
        }));
    },
};
// Meeting operations
export const meetingsDB = {
    create: async (meeting) => {
        await query(`INSERT INTO meetings (id, lead_id, title, description, scheduled_at, duration, location, meeting_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            meeting.id,
            meeting.leadId,
            meeting.title,
            meeting.description || null,
            meeting.scheduledAt,
            meeting.duration,
            meeting.location || null,
            meeting.meetingLink || null
        ]);
    },
    list: async (filters = {}) => {
        let sql = 'SELECT * FROM meetings WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters.leadId) {
            sql += ` AND lead_id = $${paramIndex++}`;
            params.push(filters.leadId);
        }
        if (filters.status) {
            sql += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }
        if (filters.fromDate) {
            sql += ` AND scheduled_at >= $${paramIndex++}`;
            params.push(filters.fromDate);
        }
        if (filters.toDate) {
            sql += ` AND scheduled_at <= $${paramIndex++}`;
            params.push(filters.toDate);
        }
        sql += ' ORDER BY scheduled_at ASC';
        const { rows } = await query(sql, params);
        return rows.map(row => ({
            ...row,
            leadId: row.lead_id,
            scheduledAt: row.scheduled_at,
            meetingLink: row.meeting_link,
        }));
    },
    update: async (id, updates) => {
        const sets = [];
        const params = [];
        let paramIndex = 1;
        if (updates.title) {
            sets.push(`title = $${paramIndex++}`);
            params.push(updates.title);
        }
        if (updates.description !== undefined) {
            sets.push(`description = $${paramIndex++}`);
            params.push(updates.description);
        }
        if (updates.scheduledAt) {
            sets.push(`scheduled_at = $${paramIndex++}`);
            params.push(updates.scheduledAt);
        }
        if (updates.duration) {
            sets.push(`duration = $${paramIndex++}`);
            params.push(updates.duration);
        }
        if (updates.location !== undefined) {
            sets.push(`location = $${paramIndex++}`);
            params.push(updates.location);
        }
        if (updates.meetingLink !== undefined) {
            sets.push(`meeting_link = $${paramIndex++}`);
            params.push(updates.meetingLink);
        }
        if (updates.status) {
            sets.push(`status = $${paramIndex++}`);
            params.push(updates.status);
        }
        if (updates.outcome !== undefined) {
            sets.push(`outcome = $${paramIndex++}`);
            params.push(updates.outcome);
        }
        params.push(id);
        await query(`UPDATE meetings SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);
    },
    delete: async (id) => {
        await query('DELETE FROM meetings WHERE id = $1', [id]);
    },
};
// Follow-up operations
export const followUpsDB = {
    create: async (followUp) => {
        await query('INSERT INTO follow_ups (id, lead_id, type, scheduled_at, description) VALUES ($1, $2, $3, $4, $5)', [followUp.id, followUp.leadId, followUp.type, followUp.scheduledAt, followUp.description]);
    },
    list: async (filters = {}) => {
        let sql = 'SELECT * FROM follow_ups WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters.leadId) {
            sql += ` AND lead_id = $${paramIndex++}`;
            params.push(filters.leadId);
        }
        if (filters.completed !== undefined) {
            sql += ` AND completed = $${paramIndex++}`;
            params.push(filters.completed);
        }
        if (filters.fromDate) {
            sql += ` AND scheduled_at >= $${paramIndex++}`;
            params.push(filters.fromDate);
        }
        sql += ' ORDER BY scheduled_at ASC';
        const { rows } = await query(sql, params);
        return rows.map(row => ({
            ...row,
            leadId: row.lead_id,
            scheduledAt: row.scheduled_at,
            completedAt: row.completed_at,
        }));
    },
    update: async (id, updates) => {
        const sets = [];
        const params = [];
        let paramIndex = 1;
        if (updates.type) {
            sets.push(`type = $${paramIndex++}`);
            params.push(updates.type);
        }
        if (updates.scheduledAt) {
            sets.push(`scheduled_at = $${paramIndex++}`);
            params.push(updates.scheduledAt);
        }
        if (updates.description) {
            sets.push(`description = $${paramIndex++}`);
            params.push(updates.description);
        }
        if (updates.completed !== undefined) {
            sets.push(`completed = $${paramIndex++}`);
            params.push(updates.completed);
        }
        if (updates.completedAt) {
            sets.push(`completed_at = $${paramIndex++}`);
            params.push(updates.completedAt);
        }
        params.push(id);
        await query(`UPDATE follow_ups SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);
    },
    delete: async (id) => {
        await query('DELETE FROM follow_ups WHERE id = $1', [id]);
    },
};
// Analytics queries
export const analyticsDB = {
    getPipeline: async () => {
        const { rows } = await query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
      FROM leads
      GROUP BY status
    `);
        const pipeline = {
            new: { count: 0, value: 0, leads: [] },
            contacted: { count: 0, value: 0, leads: [] },
            qualified: { count: 0, value: 0, leads: [] },
            proposal: { count: 0, value: 0, leads: [] },
            negotiation: { count: 0, value: 0, leads: [] },
            closed_won: { count: 0, value: 0, leads: [] },
            closed_lost: { count: 0, value: 0, leads: [] },
        };
        for (const row of rows) {
            if (pipeline[row.status]) {
                pipeline[row.status].count = parseInt(row.count);
                pipeline[row.status].value = parseFloat(row.value);
                const { rows: leads } = await query('SELECT * FROM leads WHERE status = $1', [row.status]);
                pipeline[row.status].leads = leads.map((l) => ({
                    ...l,
                    notes: parseJSON(l.notes),
                    tags: parseJSON(l.tags),
                    estimatedValue: l.estimated_value,
                    lastContactedAt: l.last_contacted_at,
                    createdAt: l.created_at,
                    updatedAt: l.updated_at,
                }));
            }
        }
        return pipeline;
    },
    getStats: async () => {
        const totalLeadsRes = await query('SELECT COUNT(*) as count FROM leads');
        const totalLeads = parseInt(totalLeadsRes.rows[0]?.count || '0');
        const activeLeadsRes = await query('SELECT COUNT(*) as count FROM leads WHERE status NOT IN (\'closed_won\', \'closed_lost\')');
        const activeLeads = parseInt(activeLeadsRes.rows[0]?.count || '0');
        const totalValueRes = await query('SELECT COALESCE(SUM(estimated_value), 0) as value FROM leads');
        const totalValue = parseFloat(totalValueRes.rows[0]?.value || '0');
        const totalMeetingsRes = await query('SELECT COUNT(*) as count FROM meetings');
        const totalMeetings = parseInt(totalMeetingsRes.rows[0]?.count || '0');
        const totalEmailsRes = await query('SELECT COUNT(*) as count FROM email_logs');
        const totalEmails = parseInt(totalEmailsRes.rows[0]?.count || '0');
        const pendingFollowUpsRes = await query('SELECT COUNT(*) as count FROM follow_ups WHERE completed = false');
        const pendingFollowUps = parseInt(pendingFollowUpsRes.rows[0]?.count || '0');
        const wonDealsRes = await query('SELECT COUNT(*) as count FROM leads WHERE status = \'closed_won\'');
        const wonDeals = parseInt(wonDealsRes.rows[0]?.count || '0');
        const lostDealsRes = await query('SELECT COUNT(*) as count FROM leads WHERE status = \'closed_lost\'');
        const lostDeals = parseInt(lostDealsRes.rows[0]?.count || '0');
        const winRate = wonDeals + lostDeals > 0 ? ((wonDeals / (wonDeals + lostDeals)) * 100).toFixed(1) : '0';
        return {
            totalLeads,
            activeLeads,
            totalPipelineValue: totalValue,
            totalMeetings,
            totalEmails,
            pendingFollowUps,
            winRate: `${winRate}%`,
        };
    },
};
// Export pool for advanced use cases
export { pool };
// Graceful shutdown helper
export async function closeDatabase() {
    await pool.end();
}
//# sourceMappingURL=db.js.map