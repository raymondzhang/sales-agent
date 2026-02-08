import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'sales-agent.db');

// Initialize database
const db = new sqlite3.Database(DB_PATH);

// Promisify database methods
function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Initialize tables
export async function initDatabase() {
  // Leads table
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'new',
      source TEXT NOT NULL,
      notes TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_contacted_at TEXT,
      estimated_value REAL,
      priority TEXT DEFAULT 'medium',
      tags TEXT DEFAULT '[]'
    )
  `);

  // Email templates table
  await run(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT DEFAULT 'custom',
      variables TEXT DEFAULT '[]'
    )
  `);

  // Email logs table
  await run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      template_id TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      opened_at TEXT,
      clicked_at TEXT,
      status TEXT DEFAULT 'sent'
    )
  `);

  // Meetings table
  await run(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      scheduled_at TEXT NOT NULL,
      duration INTEGER DEFAULT 30,
      location TEXT,
      meeting_link TEXT,
      status TEXT DEFAULT 'scheduled',
      outcome TEXT
    )
  `);

  // Follow-ups table
  await run(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      type TEXT DEFAULT 'task',
      scheduled_at TEXT NOT NULL,
      description TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT
    )
  `);

  // Insert default templates if none exist
  const countRow = await get<{ count: number }>('SELECT COUNT(*) as count FROM email_templates');
  if (!countRow || countRow.count === 0) {
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
      await run(
        'INSERT INTO email_templates (id, name, subject, body, category, variables) VALUES (?, ?, ?, ?, ?, ?)',
        [template.id, template.name, template.subject, template.body, template.category, template.variables]
      );
    }
  }

  console.log(`Database initialized at: ${DB_PATH}`);
}

// Helper functions for JSON serialization
function parseJSON<T>(json: string): T {
  try {
    return JSON.parse(json);
  } catch {
    return [] as T;
  }
}

// Lead operations
export const leadsDB = {
  create: async (lead: any) => {
    await run(
      `INSERT INTO leads (id, name, email, phone, company, title, status, source, notes, estimated_value, priority, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ]
    );
  },

  getById: async (id: string) => {
    const row = await get<any>('SELECT * FROM leads WHERE id = ?', [id]);
    if (!row) return null;
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

  list: async (filters: any = {}) => {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    query += ' ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, created_at DESC';

    const rows = await all<any>(query, params);
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

  update: async (id: string, updates: any) => {
    const sets: string[] = [];
    const params: any[] = [];

    if (updates.name) { sets.push('name = ?'); params.push(updates.name); }
    if (updates.email) { sets.push('email = ?'); params.push(updates.email); }
    if (updates.phone !== undefined) { sets.push('phone = ?'); params.push(updates.phone); }
    if (updates.company) { sets.push('company = ?'); params.push(updates.company); }
    if (updates.title !== undefined) { sets.push('title = ?'); params.push(updates.title); }
    if (updates.status) { sets.push('status = ?'); params.push(updates.status); }
    if (updates.priority) { sets.push('priority = ?'); params.push(updates.priority); }
    if (updates.estimatedValue !== undefined) { sets.push('estimated_value = ?'); params.push(updates.estimatedValue); }
    if (updates.notes) { sets.push('notes = ?'); params.push(JSON.stringify(updates.notes)); }
    if (updates.tags) { sets.push('tags = ?'); params.push(JSON.stringify(updates.tags)); }
    if (updates.lastContactedAt) { sets.push('last_contacted_at = ?'); params.push(updates.lastContactedAt); }

    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await run(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  delete: async (id: string) => {
    await run('DELETE FROM leads WHERE id = ?', [id]);
  },

  search: async (query: string) => {
    const searchTerm = `%${query.toLowerCase()}%`;
    const rows = await all<any>(
      `SELECT * FROM leads WHERE 
        LOWER(name) LIKE ? OR 
        LOWER(company) LIKE ? OR 
        LOWER(email) LIKE ? OR
        LOWER(tags) LIKE ?
      ORDER BY created_at DESC`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

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
    const rows = await all<any>('SELECT * FROM email_templates');
    return rows.map(row => ({
      ...row,
      variables: parseJSON(row.variables),
    }));
  },

  getById: async (id: string) => {
    const row = await get<any>('SELECT * FROM email_templates WHERE id = ?', [id]);
    if (!row) return null;
    return {
      ...row,
      variables: parseJSON(row.variables),
    };
  },

  create: async (template: any) => {
    await run(
      'INSERT INTO email_templates (id, name, subject, body, category, variables) VALUES (?, ?, ?, ?, ?, ?)',
      [template.id, template.name, template.subject, template.body, template.category, JSON.stringify(template.variables)]
    );
  },

  update: async (id: string, updates: any) => {
    const sets: string[] = [];
    const params: any[] = [];

    if (updates.name) { sets.push('name = ?'); params.push(updates.name); }
    if (updates.subject) { sets.push('subject = ?'); params.push(updates.subject); }
    if (updates.body) { sets.push('body = ?'); params.push(updates.body); }
    if (updates.category) { sets.push('category = ?'); params.push(updates.category); }
    if (updates.variables) { sets.push('variables = ?'); params.push(JSON.stringify(updates.variables)); }

    params.push(id);
    await run(`UPDATE email_templates SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  delete: async (id: string) => {
    await run('DELETE FROM email_templates WHERE id = ?', [id]);
  },
};

// Email logs operations
export const emailsDB = {
  create: async (email: any) => {
    await run(
      'INSERT INTO email_logs (id, lead_id, template_id, subject, body, status) VALUES (?, ?, ?, ?, ?, ?)',
      [email.id, email.leadId, email.templateId || null, email.subject, email.body, email.status]
    );
  },

  listByLead: async (leadId: string) => {
    let rows;
    if (leadId) {
      rows = await all<any>('SELECT * FROM email_logs WHERE lead_id = ? ORDER BY sent_at DESC', [leadId]);
    } else {
      rows = await all<any>('SELECT * FROM email_logs ORDER BY sent_at DESC');
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
  create: async (meeting: any) => {
    await run(
      `INSERT INTO meetings (id, lead_id, title, description, scheduled_at, duration, location, meeting_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meeting.id,
        meeting.leadId,
        meeting.title,
        meeting.description || null,
        meeting.scheduledAt,
        meeting.duration,
        meeting.location || null,
        meeting.meetingLink || null
      ]
    );
  },

  list: async (filters: any = {}) => {
    let query = 'SELECT * FROM meetings WHERE 1=1';
    const params: any[] = [];

    if (filters.leadId) {
      query += ' AND lead_id = ?';
      params.push(filters.leadId);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.fromDate) {
      query += ' AND scheduled_at >= ?';
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      query += ' AND scheduled_at <= ?';
      params.push(filters.toDate);
    }

    query += ' ORDER BY scheduled_at ASC';

    const rows = await all<any>(query, params);
    return rows.map(row => ({
      ...row,
      leadId: row.lead_id,
      scheduledAt: row.scheduled_at,
      meetingLink: row.meeting_link,
    }));
  },

  update: async (id: string, updates: any) => {
    const sets: string[] = [];
    const params: any[] = [];

    if (updates.title) { sets.push('title = ?'); params.push(updates.title); }
    if (updates.description !== undefined) { sets.push('description = ?'); params.push(updates.description); }
    if (updates.scheduledAt) { sets.push('scheduled_at = ?'); params.push(updates.scheduledAt); }
    if (updates.duration) { sets.push('duration = ?'); params.push(updates.duration); }
    if (updates.location !== undefined) { sets.push('location = ?'); params.push(updates.location); }
    if (updates.meetingLink !== undefined) { sets.push('meeting_link = ?'); params.push(updates.meetingLink); }
    if (updates.status) { sets.push('status = ?'); params.push(updates.status); }
    if (updates.outcome !== undefined) { sets.push('outcome = ?'); params.push(updates.outcome); }

    params.push(id);
    await run(`UPDATE meetings SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  delete: async (id: string) => {
    await run('DELETE FROM meetings WHERE id = ?', [id]);
  },
};

// Follow-up operations
export const followUpsDB = {
  create: async (followUp: any) => {
    await run(
      'INSERT INTO follow_ups (id, lead_id, type, scheduled_at, description) VALUES (?, ?, ?, ?, ?)',
      [followUp.id, followUp.leadId, followUp.type, followUp.scheduledAt, followUp.description]
    );
  },

  list: async (filters: any = {}) => {
    let query = 'SELECT * FROM follow_ups WHERE 1=1';
    const params: any[] = [];

    if (filters.leadId) {
      query += ' AND lead_id = ?';
      params.push(filters.leadId);
    }
    if (filters.completed !== undefined) {
      query += ' AND completed = ?';
      params.push(filters.completed ? 1 : 0);
    }
    if (filters.fromDate) {
      query += ' AND scheduled_at >= ?';
      params.push(filters.fromDate);
    }

    query += ' ORDER BY scheduled_at ASC';

    const rows = await all<any>(query, params);
    return rows.map(row => ({
      ...row,
      leadId: row.lead_id,
      scheduledAt: row.scheduled_at,
      completedAt: row.completed_at,
    }));
  },

  update: async (id: string, updates: any) => {
    const sets: string[] = [];
    const params: any[] = [];

    if (updates.type) { sets.push('type = ?'); params.push(updates.type); }
    if (updates.scheduledAt) { sets.push('scheduled_at = ?'); params.push(updates.scheduledAt); }
    if (updates.description) { sets.push('description = ?'); params.push(updates.description); }
    if (updates.completed !== undefined) { 
      sets.push('completed = ?'); 
      params.push(updates.completed ? 1 : 0); 
    }
    if (updates.completedAt) { sets.push('completed_at = ?'); params.push(updates.completedAt); }

    params.push(id);
    await run(`UPDATE follow_ups SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  delete: async (id: string) => {
    await run('DELETE FROM follow_ups WHERE id = ?', [id]);
  },
};

// Analytics queries
export const analyticsDB = {
  getPipeline: async () => {
    const rows = await all<any>(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
      FROM leads
      GROUP BY status
    `);

    const pipeline: Record<string, { count: number; value: number; leads: any[] }> = {
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
        pipeline[row.status].count = row.count;
        pipeline[row.status].value = row.value;
        
        // Get leads for this stage
        const leads = await all<any>('SELECT * FROM leads WHERE status = ?', [row.status]);
        pipeline[row.status].leads = leads.map(l => ({
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
    const totalLeads = (await get<{ count: number }>('SELECT COUNT(*) as count FROM leads'))?.count || 0;
    const activeLeads = (await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE status NOT IN ("closed_won", "closed_lost")'))?.count || 0;
    const totalValue = (await get<{ value: number }>('SELECT COALESCE(SUM(estimated_value), 0) as value FROM leads'))?.value || 0;
    const totalMeetings = (await get<{ count: number }>('SELECT COUNT(*) as count FROM meetings'))?.count || 0;
    const totalEmails = (await get<{ count: number }>('SELECT COUNT(*) as count FROM email_logs'))?.count || 0;
    const pendingFollowUps = (await get<{ count: number }>('SELECT COUNT(*) as count FROM follow_ups WHERE completed = 0'))?.count || 0;

    const wonDeals = (await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE status = "closed_won"'))?.count || 0;
    const lostDeals = (await get<{ count: number }>('SELECT COUNT(*) as count FROM leads WHERE status = "closed_lost"'))?.count || 0;
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

export default db;
