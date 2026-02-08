#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  title?: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  source: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  estimatedValue?: number;
  priority: "low" | "medium" | "high";
  tags: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "introduction" | "follow_up" | "proposal" | "reminder" | "custom";
  variables: string[];
}

interface EmailLog {
  id: string;
  leadId: string;
  templateId?: string;
  subject: string;
  body: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  status: "draft" | "sent" | "delivered" | "failed";
}

interface Meeting {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number; // minutes
  location?: string;
  meetingLink?: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  outcome?: string;
}

interface FollowUp {
  id: string;
  leadId: string;
  type: "email" | "call" | "meeting" | "task";
  scheduledAt: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const storage = {
  leads: new Map<string, Lead>(),
  emailTemplates: new Map<string, EmailTemplate>(),
  emailLogs: new Map<string, EmailLog>(),
  meetings: new Map<string, Meeting>(),
  followUps: new Map<string, FollowUp>(),
};

// Seed with sample email templates
const defaultTemplates: EmailTemplate[] = [
  {
    id: "template-1",
    name: "Introduction Email",
    subject: "Introduction - {{company}} & {{senderCompany}}",
    body: `Hi {{name}},

I hope this email finds you well. My name is {{senderName}} from {{senderCompany}}.

I came across {{company}} and was impressed by {{achievement}}. I believe there might be a great opportunity for us to collaborate.

Would you be open to a brief 15-minute call next week to explore how we can help {{company}} achieve {{goal}}?

Looking forward to hearing from you.

Best regards,
{{senderName}}
{{senderTitle}}
{{senderCompany}}`,
    category: "introduction",
    variables: ["name", "company", "senderName", "senderCompany", "achievement", "goal", "senderTitle"],
  },
  {
    id: "template-2",
    name: "Follow-Up After No Response",
    subject: "Re: {{previousSubject}}",
    body: `Hi {{name}},

I wanted to follow up on my previous email about {{topic}}.

I understand you're busy, so I'll keep this brief. {{valueProposition}}

If this isn't a priority right now, I completely understand. Just let me know if you'd like me to check back in a few months.

Best,
{{senderName}}`,
    category: "follow_up",
    variables: ["name", "previousSubject", "topic", "valueProposition", "senderName"],
  },
  {
    id: "template-3",
    name: "Meeting Proposal",
    subject: "Proposal Discussion - {{company}}",
    body: `Hi {{name}},

Thank you for taking the time to speak with me {{meetingDate}}.

As discussed, I've prepared a tailored proposal for {{company}} that addresses:
{{keyPoints}}

The estimated value for {{company}} would be approximately {{estimatedValue}}.

Would you be available for a 30-minute call this week to review the details and answer any questions?

Best regards,
{{senderName}}`,
    category: "proposal",
    variables: ["name", "company", "meetingDate", "keyPoints", "estimatedValue", "senderName"],
  },
];

defaultTemplates.forEach(t => storage.emailTemplates.set(t.id, t));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(date: Date): string {
  return date.toISOString();
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  // -------------------------------------------------------------------------
  // LEAD MANAGEMENT
  // -------------------------------------------------------------------------
  
  "create_lead": async (args) => {
    const id = generateId();
    const now = formatDate(new Date());
    
    const lead: Lead = {
      id,
      name: args.name,
      email: args.email,
      phone: args.phone,
      company: args.company,
      title: args.title,
      status: args.status || "new",
      source: args.source,
      notes: args.notes ? [args.notes] : [],
      createdAt: now,
      updatedAt: now,
      estimatedValue: args.estimatedValue,
      priority: args.priority || "medium",
      tags: args.tags || [],
    };
    
    storage.leads.set(id, lead);
    
    return {
      success: true,
      message: `Lead created successfully: ${args.name} from ${args.company}`,
      lead: {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        status: lead.status,
        priority: lead.priority,
      },
    };
  },

  "get_lead": async (args) => {
    const lead = storage.leads.get(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    return { success: true, lead };
  },

  "list_leads": async (args) => {
    let leads = Array.from(storage.leads.values());
    
    if (args.status) {
      leads = leads.filter(l => l.status === args.status);
    }
    if (args.priority) {
      leads = leads.filter(l => l.priority === args.priority);
    }
    if (args.source) {
      leads = leads.filter(l => l.source === args.source);
    }
    if (args.tag) {
      leads = leads.filter(l => l.tags.includes(args.tag));
    }
    
    // Sort by priority and created date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    leads.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    const limit = args.limit || 50;
    const page = args.page || 1;
    const start = (page - 1) * limit;
    const paginatedLeads = leads.slice(start, start + limit);
    
    return {
      success: true,
      total: leads.length,
      page,
      limit,
      leads: paginatedLeads.map(l => ({
        id: l.id,
        name: l.name,
        company: l.company,
        title: l.title,
        status: l.status,
        priority: l.priority,
        estimatedValue: l.estimatedValue,
        lastContactedAt: l.lastContactedAt,
      })),
    };
  },

  "update_lead": async (args) => {
    const lead = storage.leads.get(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    
    const updatedLead: Lead = {
      ...lead,
      ...args.updates,
      id: lead.id,
      createdAt: lead.createdAt,
      updatedAt: formatDate(new Date()),
      notes: args.updates.notes 
        ? [...lead.notes, args.updates.notes]
        : lead.notes,
    };
    
    storage.leads.set(args.leadId, updatedLead);
    
    return {
      success: true,
      message: "Lead updated successfully",
      lead: updatedLead,
    };
  },

  "add_lead_note": async (args) => {
    const lead = storage.leads.get(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    
    const note = `[${formatDate(new Date())}] ${args.note}`;
    lead.notes.push(note);
    lead.updatedAt = formatDate(new Date());
    
    return {
      success: true,
      message: "Note added successfully",
      totalNotes: lead.notes.length,
    };
  },

  "search_leads": async (args) => {
    const query = args.query.toLowerCase();
    const leads = Array.from(storage.leads.values()).filter(lead => 
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.tags.some(tag => tag.toLowerCase().includes(query))
    );
    
    return {
      success: true,
      count: leads.length,
      leads: leads.map(l => ({
        id: l.id,
        name: l.name,
        company: l.company,
        email: l.email,
        status: l.status,
      })),
    };
  },

  // -------------------------------------------------------------------------
  // EMAIL AUTOMATION
  // -------------------------------------------------------------------------
  
  "list_email_templates": async () => {
    const templates = Array.from(storage.emailTemplates.values());
    return {
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        variables: t.variables,
      })),
    };
  },

  "get_email_template": async (args) => {
    const template = storage.emailTemplates.get(args.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    return { success: true, template };
  },

  "create_email_template": async (args) => {
    const id = generateId();
    const template: EmailTemplate = {
      id,
      name: args.name,
      subject: args.subject,
      body: args.body,
      category: args.category,
      variables: args.variables || [],
    };
    
    storage.emailTemplates.set(id, template);
    
    return {
      success: true,
      message: `Email template created: ${args.name}`,
      templateId: id,
    };
  },

  "compose_email": async (args) => {
    let subject: string;
    let body: string;
    
    if (args.templateId) {
      const template = storage.emailTemplates.get(args.templateId);
      if (!template) {
        return { success: false, error: "Template not found" };
      }
      
      subject = interpolateTemplate(template.subject, args.variables || {});
      body = interpolateTemplate(template.body, args.variables || {});
    } else {
      subject = args.subject;
      body = args.body;
    }
    
    // Get lead info if provided
    let leadInfo = null;
    if (args.leadId) {
      const lead = storage.leads.get(args.leadId);
      if (lead) {
        leadInfo = {
          name: lead.name,
          email: lead.email,
          company: lead.company,
        };
      }
    }
    
    return {
      success: true,
      email: {
        subject,
        body,
        recipient: leadInfo,
      },
      readyToSend: true,
    };
  },

  "log_email": async (args) => {
    const id = generateId();
    const emailLog: EmailLog = {
      id,
      leadId: args.leadId,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body,
      sentAt: formatDate(new Date()),
      status: args.status || "sent",
    };
    
    storage.emailLogs.set(id, emailLog);
    
    // Update lead's last contacted date
    const lead = storage.leads.get(args.leadId);
    if (lead) {
      lead.lastContactedAt = emailLog.sentAt;
      lead.updatedAt = emailLog.sentAt;
    }
    
    return {
      success: true,
      message: "Email logged successfully",
      emailId: id,
    };
  },

  "get_email_history": async (args) => {
    const logs = Array.from(storage.emailLogs.values())
      .filter(log => log.leadId === args.leadId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    
    return {
      success: true,
      count: logs.length,
      emails: logs.map(log => ({
        id: log.id,
        subject: log.subject,
        sentAt: log.sentAt,
        status: log.status,
        openedAt: log.openedAt,
      })),
    };
  },

  // -------------------------------------------------------------------------
  // SCHEDULING
  // -------------------------------------------------------------------------
  
  "schedule_meeting": async (args) => {
    const id = generateId();
    const meeting: Meeting = {
      id,
      leadId: args.leadId,
      title: args.title,
      description: args.description,
      scheduledAt: args.scheduledAt,
      duration: args.duration || 30,
      location: args.location,
      meetingLink: args.meetingLink,
      status: "scheduled",
    };
    
    storage.meetings.set(id, meeting);
    
    // Add follow-up if specified
    if (args.createFollowUp) {
      const followUpId = generateId();
      const followUp: FollowUp = {
        id: followUpId,
        leadId: args.leadId,
        type: "task",
        scheduledAt: args.scheduledAt,
        description: `Meeting: ${args.title}`,
        completed: false,
      };
      storage.followUps.set(followUpId, followUp);
    }
    
    // Update lead
    const lead = storage.leads.get(args.leadId);
    if (lead) {
      lead.lastContactedAt = formatDate(new Date());
    }
    
    return {
      success: true,
      message: "Meeting scheduled successfully",
      meeting: {
        id: meeting.id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        duration: meeting.duration,
      },
    };
  },

  "list_meetings": async (args) => {
    let meetings = Array.from(storage.meetings.values());
    
    if (args.leadId) {
      meetings = meetings.filter(m => m.leadId === args.leadId);
    }
    if (args.status) {
      meetings = meetings.filter(m => m.status === args.status);
    }
    if (args.fromDate) {
      meetings = meetings.filter(m => m.scheduledAt >= args.fromDate);
    }
    if (args.toDate) {
      meetings = meetings.filter(m => m.scheduledAt <= args.toDate);
    }
    
    meetings.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    return {
      success: true,
      count: meetings.length,
      meetings: meetings.map(m => ({
        id: m.id,
        title: m.title,
        scheduledAt: m.scheduledAt,
        duration: m.duration,
        status: m.status,
      })),
    };
  },

  "create_follow_up": async (args) => {
    const id = generateId();
    const followUp: FollowUp = {
      id,
      leadId: args.leadId,
      type: args.type,
      scheduledAt: args.scheduledAt,
      description: args.description,
      completed: false,
    };
    
    storage.followUps.set(id, followUp);
    
    return {
      success: true,
      message: "Follow-up created successfully",
      followUp: {
        id: followUp.id,
        type: followUp.type,
        scheduledAt: followUp.scheduledAt,
        description: followUp.description,
      },
    };
  },

  "get_follow_ups": async (args) => {
    let followUps = Array.from(storage.followUps.values());
    
    if (args.leadId) {
      followUps = followUps.filter(f => f.leadId === args.leadId);
    }
    if (args.completed !== undefined) {
      followUps = followUps.filter(f => f.completed === args.completed);
    }
    if (args.fromDate) {
      followUps = followUps.filter(f => f.scheduledAt >= args.fromDate);
    }
    
    followUps.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    return {
      success: true,
      count: followUps.length,
      followUps: followUps.map(f => ({
        id: f.id,
        leadId: f.leadId,
        type: f.type,
        scheduledAt: f.scheduledAt,
        description: f.description,
        completed: f.completed,
      })),
    };
  },

  "complete_follow_up": async (args) => {
    const followUp = storage.followUps.get(args.followUpId);
    if (!followUp) {
      return { success: false, error: "Follow-up not found" };
    }
    
    followUp.completed = true;
    followUp.completedAt = formatDate(new Date());
    
    return {
      success: true,
      message: "Follow-up marked as complete",
    };
  },

  // -------------------------------------------------------------------------
  // ANALYTICS
  // -------------------------------------------------------------------------
  
  "get_pipeline": async () => {
    const leads = Array.from(storage.leads.values());
    const pipeline: Record<string, { count: number; value: number; leads: string[] }> = {
      new: { count: 0, value: 0, leads: [] },
      contacted: { count: 0, value: 0, leads: [] },
      qualified: { count: 0, value: 0, leads: [] },
      proposal: { count: 0, value: 0, leads: [] },
      negotiation: { count: 0, value: 0, leads: [] },
      closed_won: { count: 0, value: 0, leads: [] },
      closed_lost: { count: 0, value: 0, leads: [] },
    };
    
    leads.forEach(lead => {
      const stage = pipeline[lead.status];
      stage.count++;
      if (lead.estimatedValue) {
        stage.value += lead.estimatedValue;
      }
      stage.leads.push(lead.name);
    });
    
    const totalValue = Object.values(pipeline).reduce((sum, stage) => sum + stage.value, 0);
    const activeLeads = leads.filter(l => !["closed_won", "closed_lost"].includes(l.status)).length;
    const wonDeals = pipeline.closed_won.count;
    const winRate = leads.length > 0 ? (wonDeals / (wonDeals + pipeline.closed_lost.count) * 100).toFixed(1) : "0";
    
    return {
      success: true,
      summary: {
        totalLeads: leads.length,
        activeLeads,
        totalPipelineValue: totalValue,
        winRate: `${winRate}%`,
      },
      pipeline,
    };
  },

  "get_sales_report": async (args) => {
    const fromDate = args.fromDate ? new Date(args.fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = args.toDate ? new Date(args.toDate) : new Date();
    
    const leads = Array.from(storage.leads.values()).filter(lead => {
      const created = new Date(lead.createdAt);
      return created >= fromDate && created <= toDate;
    });
    
    const emails = Array.from(storage.emailLogs.values()).filter(email => {
      const sent = new Date(email.sentAt);
      return sent >= fromDate && sent <= toDate;
    });
    
    const meetings = Array.from(storage.meetings.values()).filter(meeting => {
      const scheduled = new Date(meeting.scheduledAt);
      return scheduled >= fromDate && scheduled <= toDate;
    });
    
    const wonDeals = leads.filter(l => l.status === "closed_won");
    const lostDeals = leads.filter(l => l.status === "closed_lost");
    const totalRevenue = wonDeals.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    
    // Activity metrics
    const emailsByDay: Record<string, number> = {};
    emails.forEach(email => {
      const day = email.sentAt.split("T")[0];
      emailsByDay[day] = (emailsByDay[day] || 0) + 1;
    });
    
    return {
      success: true,
      period: {
        from: fromDate.toISOString().split("T")[0],
        to: toDate.toISOString().split("T")[0],
      },
      leads: {
        new: leads.filter(l => l.status === "new").length,
        contacted: leads.filter(l => l.status === "contacted").length,
        qualified: leads.filter(l => l.status === "qualified").length,
        proposal: leads.filter(l => l.status === "proposal").length,
        negotiation: leads.filter(l => l.status === "negotiation").length,
        closed_won: wonDeals.length,
        closed_lost: lostDeals.length,
      },
      activity: {
        emailsSent: emails.length,
        meetingsScheduled: meetings.length,
        emailsByDay,
      },
      revenue: {
        total: totalRevenue,
        averageDealSize: wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0,
        winRate: wonDeals.length + lostDeals.length > 0 
          ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100).toFixed(1)
          : "0",
      },
    };
  },

  "get_lead_activity": async (args) => {
    const lead = storage.leads.get(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    
    const emails = Array.from(storage.emailLogs.values())
      .filter(e => e.leadId === args.leadId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    
    const meetings = Array.from(storage.meetings.values())
      .filter(m => m.leadId === args.leadId)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    
    const followUps = Array.from(storage.followUps.values())
      .filter(f => f.leadId === args.leadId)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    
    return {
      success: true,
      lead: {
        name: lead.name,
        company: lead.company,
        status: lead.status,
      },
      activity: {
        totalEmails: emails.length,
        totalMeetings: meetings.length,
        totalFollowUps: followUps.length,
        lastContact: lead.lastContactedAt,
        notes: lead.notes.length,
      },
      recentEmails: emails.slice(0, 5).map(e => ({
        subject: e.subject,
        sentAt: e.sentAt,
        status: e.status,
      })),
      upcomingMeetings: meetings
        .filter(m => m.status === "scheduled" && new Date(m.scheduledAt) > new Date())
        .slice(0, 3)
        .map(m => ({
          title: m.title,
          scheduledAt: m.scheduledAt,
        })),
      pendingFollowUps: followUps.filter(f => !f.completed).length,
    };
  },
};

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: "sales-agent",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Lead Management
      {
        name: "create_lead",
        description: "Create a new sales lead",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name of the lead" },
            email: { type: "string", description: "Email address" },
            phone: { type: "string", description: "Phone number (optional)" },
            company: { type: "string", description: "Company name" },
            title: { type: "string", description: "Job title (optional)" },
            status: { 
              type: "string", 
              enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"],
              description: "Initial status (default: new)"
            },
            source: { type: "string", description: "Lead source (e.g., 'Website', 'Referral', 'LinkedIn')" },
            notes: { type: "string", description: "Initial notes about the lead" },
            estimatedValue: { type: "number", description: "Estimated deal value" },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "Lead priority" },
            tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
          },
          required: ["name", "email", "company", "source"],
        },
      },
      {
        name: "get_lead",
        description: "Get detailed information about a specific lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "The lead ID" },
          },
          required: ["leadId"],
        },
      },
      {
        name: "list_leads",
        description: "List all leads with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            status: { 
              type: "string", 
              enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"],
              description: "Filter by status"
            },
            priority: { type: "string", enum: ["low", "medium", "high"], description: "Filter by priority" },
            source: { type: "string", description: "Filter by source" },
            tag: { type: "string", description: "Filter by tag" },
            limit: { type: "number", description: "Number of results per page (default: 50)" },
            page: { type: "number", description: "Page number (default: 1)" },
          },
        },
      },
      {
        name: "update_lead",
        description: "Update lead information or status",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "The lead ID" },
            updates: {
              type: "object",
              properties: {
                status: { 
                  type: "string", 
                  enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
                },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                estimatedValue: { type: "number" },
                phone: { type: "string" },
                title: { type: "string" },
                notes: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
              },
            },
          },
          required: ["leadId", "updates"],
        },
      },
      {
        name: "add_lead_note",
        description: "Add a note to a lead's record",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "The lead ID" },
            note: { type: "string", description: "The note text" },
          },
          required: ["leadId", "note"],
        },
      },
      {
        name: "search_leads",
        description: "Search leads by name, company, email, or tags",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },

      // Email Automation
      {
        name: "list_email_templates",
        description: "List all available email templates",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_email_template",
        description: "Get a specific email template",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string", description: "Template ID" },
          },
          required: ["templateId"],
        },
      },
      {
        name: "create_email_template",
        description: "Create a new email template",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Template name" },
            subject: { type: "string", description: "Email subject line" },
            body: { type: "string", description: "Email body content" },
            category: { 
              type: "string", 
              enum: ["introduction", "follow_up", "proposal", "reminder", "custom"],
              description: "Template category"
            },
            variables: { type: "array", items: { type: "string" }, description: "Variable names used in template (e.g., ['name', 'company'])" },
          },
          required: ["name", "subject", "body", "category"],
        },
      },
      {
        name: "compose_email",
        description: "Compose an email using a template or custom content",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID to personalize for" },
            templateId: { type: "string", description: "Template ID to use" },
            subject: { type: "string", description: "Custom subject (if not using template)" },
            body: { type: "string", description: "Custom body (if not using template)" },
            variables: { type: "object", description: "Variables to substitute in template" },
          },
        },
      },
      {
        name: "log_email",
        description: "Log an email that was sent",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID" },
            templateId: { type: "string", description: "Template used (optional)" },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Email body" },
            status: { type: "string", enum: ["draft", "sent", "delivered", "failed"], description: "Email status" },
          },
          required: ["leadId", "subject", "body"],
        },
      },
      {
        name: "get_email_history",
        description: "Get email history for a lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID" },
          },
          required: ["leadId"],
        },
      },

      // Scheduling
      {
        name: "schedule_meeting",
        description: "Schedule a meeting with a lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID" },
            title: { type: "string", description: "Meeting title" },
            description: { type: "string", description: "Meeting description" },
            scheduledAt: { type: "string", description: "ISO datetime string (e.g., 2024-01-15T14:00:00Z)" },
            duration: { type: "number", description: "Duration in minutes (default: 30)" },
            location: { type: "string", description: "Physical location" },
            meetingLink: { type: "string", description: "Video call link" },
            createFollowUp: { type: "boolean", description: "Create a follow-up task" },
          },
          required: ["leadId", "title", "scheduledAt"],
        },
      },
      {
        name: "list_meetings",
        description: "List meetings with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Filter by lead ID" },
            status: { type: "string", enum: ["scheduled", "completed", "cancelled", "no_show"] },
            fromDate: { type: "string", description: "Filter from date (ISO)" },
            toDate: { type: "string", description: "Filter to date (ISO)" },
          },
        },
      },
      {
        name: "create_follow_up",
        description: "Create a follow-up task for a lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID" },
            type: { type: "string", enum: ["email", "call", "meeting", "task"], description: "Follow-up type" },
            scheduledAt: { type: "string", description: "When to follow up (ISO datetime)" },
            description: { type: "string", description: "Follow-up description" },
          },
          required: ["leadId", "type", "scheduledAt", "description"],
        },
      },
      {
        name: "get_follow_ups",
        description: "Get follow-up tasks",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Filter by lead" },
            completed: { type: "boolean", description: "Filter by completion status" },
            fromDate: { type: "string", description: "Filter from date" },
          },
        },
      },
      {
        name: "complete_follow_up",
        description: "Mark a follow-up as complete",
        inputSchema: {
          type: "object",
          properties: {
            followUpId: { type: "string", description: "Follow-up ID" },
          },
          required: ["followUpId"],
        },
      },

      // Analytics
      {
        name: "get_pipeline",
        description: "Get sales pipeline overview with stage breakdown",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_sales_report",
        description: "Get detailed sales report for a period",
        inputSchema: {
          type: "object",
          properties: {
            fromDate: { type: "string", description: "Start date (ISO, default: 30 days ago)" },
            toDate: { type: "string", description: "End date (ISO, default: today)" },
          },
        },
      },
      {
        name: "get_lead_activity",
        description: "Get activity summary for a specific lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "Lead ID" },
          },
          required: ["leadId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  
  try {
    const result = await handler(args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sales Agent MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});