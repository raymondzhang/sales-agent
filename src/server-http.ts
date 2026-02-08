#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";
import url from "url";
import cors from "cors";
import { initDatabase, leadsDB, templatesDB, emailsDB, meetingsDB, followUpsDB, analyticsDB } from "./db.js";

// Initialize database
await initDatabase();

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
    
    const lead = {
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
    
    await leadsDB.create(lead);
    
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
    const lead = await leadsDB.getById(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    return { success: true, lead };
  },

  "list_leads": async (args) => {
    const leads = await leadsDB.list({
      status: args.status,
      priority: args.priority,
      source: args.source,
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
      leads: paginatedLeads,
    };
  },

  "update_lead": async (args) => {
    const lead = await leadsDB.getById(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    
    const updates: any = { ...args.updates };
    
    if (args.updates.notes) {
      updates.notes = [...lead.notes, args.updates.notes];
    }
    
    updates.updatedAt = formatDate(new Date());
    
    await leadsDB.update(args.leadId, updates);
    
    return {
      success: true,
      message: "Lead updated successfully",
      lead: await leadsDB.getById(args.leadId),
    };
  },

  "add_lead_note": async (args) => {
    const lead = await leadsDB.getById(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    
    const note = `[${formatDate(new Date())}] ${args.note}`;
    const updatedNotes = [...lead.notes, note];
    
    await leadsDB.update(args.leadId, {
      notes: updatedNotes,
      updatedAt: formatDate(new Date()),
    });
    
    return {
      success: true,
      message: "Note added successfully",
      totalNotes: updatedNotes.length,
    };
  },

  "search_leads": async (args) => {
    const leads = await leadsDB.search(args.query);
    
    return {
      success: true,
      count: leads.length,
      leads,
    };
  },

  "delete_lead": async (args) => {
    const lead = await leadsDB.getById(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    await leadsDB.delete(args.leadId);
    return { success: true, message: "Lead deleted successfully" };
  },

  // -------------------------------------------------------------------------
  // EMAIL AUTOMATION
  // -------------------------------------------------------------------------
  
  "list_email_templates": async () => {
    const templates = await templatesDB.list();
    return {
      success: true,
      templates,
    };
  },

  "get_email_template": async (args) => {
    const template = await templatesDB.getById(args.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    return { success: true, template };
  },

  "create_email_template": async (args) => {
    const id = generateId();
    const template = {
      id,
      name: args.name,
      subject: args.subject,
      body: args.body,
      category: args.category,
      variables: args.variables || [],
    };
    
    await templatesDB.create(template);
    
    return {
      success: true,
      message: `Email template created: ${args.name}`,
      templateId: id,
    };
  },

  "update_email_template": async (args) => {
    const template = await templatesDB.getById(args.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    
    await templatesDB.update(args.templateId, args.updates);
    
    return {
      success: true,
      message: "Template updated successfully",
      template: await templatesDB.getById(args.templateId),
    };
  },

  "delete_email_template": async (args) => {
    const template = await templatesDB.getById(args.templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    await templatesDB.delete(args.templateId);
    return { success: true, message: "Template deleted successfully" };
  },

  "compose_email": async (args) => {
    let subject: string;
    let body: string;
    
    if (args.templateId) {
      const template = await templatesDB.getById(args.templateId);
      if (!template) {
        return { success: false, error: "Template not found" };
      }
      
      subject = interpolateTemplate(template.subject, args.variables || {});
      body = interpolateTemplate(template.body, args.variables || {});
    } else {
      subject = args.subject;
      body = args.body;
    }
    
    let leadInfo = null;
    if (args.leadId) {
      const lead = await leadsDB.getById(args.leadId);
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
    const emailLog = {
      id,
      leadId: args.leadId,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body,
      sentAt: formatDate(new Date()),
      status: args.status || "sent",
    };
    
    await emailsDB.create(emailLog);
    
    // Update lead's last contacted date
    const lead = await leadsDB.getById(args.leadId);
    if (lead) {
      await leadsDB.update(args.leadId, {
        lastContactedAt: emailLog.sentAt,
        updatedAt: emailLog.sentAt,
      });
    }
    
    return {
      success: true,
      message: "Email logged successfully",
      emailId: id,
    };
  },

  "get_email_history": async (args) => {
    const emails = await emailsDB.listByLead(args.leadId);
    
    return {
      success: true,
      count: emails.length,
      emails,
    };
  },

  // -------------------------------------------------------------------------
  // SCHEDULING
  // -------------------------------------------------------------------------
  
  "schedule_meeting": async (args) => {
    const id = generateId();
    const meeting = {
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
    
    await meetingsDB.create(meeting);
    
    // Add follow-up if specified
    if (args.createFollowUp) {
      const followUpId = generateId();
      const followUp = {
        id: followUpId,
        leadId: args.leadId,
        type: "task",
        scheduledAt: args.scheduledAt,
        description: `Meeting: ${args.title}`,
        completed: false,
      };
      await followUpsDB.create(followUp);
    }
    
    // Update lead
    const lead = await leadsDB.getById(args.leadId);
    if (lead) {
      await leadsDB.update(args.leadId, {
        lastContactedAt: formatDate(new Date()),
      });
    }
    
    return {
      success: true,
      message: "Meeting scheduled successfully",
      meeting,
    };
  },

  "update_meeting": async (args) => {
    await meetingsDB.update(args.meetingId, args.updates);
    
    return {
      success: true,
      message: "Meeting updated successfully",
    };
  },

  "delete_meeting": async (args) => {
    await meetingsDB.delete(args.meetingId);
    return { success: true, message: "Meeting deleted successfully" };
  },

  "list_meetings": async (args) => {
    const meetings = await meetingsDB.list({
      leadId: args.leadId,
      status: args.status,
      fromDate: args.fromDate,
      toDate: args.toDate,
    });
    
    return {
      success: true,
      count: meetings.length,
      meetings,
    };
  },

  "create_follow_up": async (args) => {
    const id = generateId();
    const followUp = {
      id,
      leadId: args.leadId,
      type: args.type,
      scheduledAt: args.scheduledAt,
      description: args.description,
      completed: false,
    };
    
    await followUpsDB.create(followUp);
    
    return {
      success: true,
      message: "Follow-up created successfully",
      followUp,
    };
  },

  "update_follow_up": async (args) => {
    await followUpsDB.update(args.followUpId, args.updates);
    
    return {
      success: true,
      message: "Follow-up updated successfully",
    };
  },

  "delete_follow_up": async (args) => {
    await followUpsDB.delete(args.followUpId);
    return { success: true, message: "Follow-up deleted successfully" };
  },

  "get_follow_ups": async (args) => {
    const followUps = await followUpsDB.list({
      leadId: args.leadId,
      completed: args.completed,
      fromDate: args.fromDate,
    });
    
    return {
      success: true,
      count: followUps.length,
      followUps,
    };
  },

  "complete_follow_up": async (args) => {
    await followUpsDB.update(args.followUpId, {
      completed: true,
      completedAt: formatDate(new Date()),
    });
    
    return {
      success: true,
      message: "Follow-up marked as complete",
    };
  },

  // -------------------------------------------------------------------------
  // ANALYTICS
  // -------------------------------------------------------------------------
  
  "get_pipeline": async () => {
    const pipeline = await analyticsDB.getPipeline();
    const stats = await analyticsDB.getStats();
    
    return {
      success: true,
      summary: {
        totalLeads: stats.totalLeads,
        activeLeads: stats.activeLeads,
        totalPipelineValue: stats.totalPipelineValue,
        winRate: stats.winRate,
      },
      pipeline,
    };
  },

  "get_sales_report": async (args) => {
    const fromDate = args.fromDate ? new Date(args.fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = args.toDate ? new Date(args.toDate) : new Date();
    
    const allLeads = await leadsDB.list();
    const leads = allLeads.filter(lead => {
      const created = new Date(lead.createdAt);
      return created >= fromDate && created <= toDate;
    });
    
    const allEmails = await emailsDB.listByLead(''); // Get all emails
    const emails = allEmails.filter((email: any) => {
      const sent = new Date(email.sentAt);
      return sent >= fromDate && sent <= toDate;
    });
    
    const allMeetings = await meetingsDB.list();
    const meetings = allMeetings.filter(meeting => {
      const scheduled = new Date(meeting.scheduledAt);
      return scheduled >= fromDate && scheduled <= toDate;
    });
    
    const wonDeals = leads.filter(l => l.status === "closed_won");
    const lostDeals = leads.filter(l => l.status === "closed_lost");
    const totalRevenue = wonDeals.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    
    const emailsByDay: Record<string, number> = {};
    emails.forEach((email: any) => {
      const day = email.sentAt.split("T")[0];
      emailsByDay[day] = (emailsByDay[day] || 0) + 1;
    });

    const leadsByDay: Record<string, number> = {};
    leads.forEach(lead => {
      const day = lead.createdAt.split("T")[0];
      leadsByDay[day] = (leadsByDay[day] || 0) + 1;
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
        leadsByDay,
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
    const lead = await leadsDB.getById(args.leadId);
    if (!lead) {
      return { success: false, error: "Lead not found" };
    }
    
    const emails = await emailsDB.listByLead(args.leadId);
    const meetings = await meetingsDB.list({ leadId: args.leadId });
    const followUps = await followUpsDB.list({ leadId: args.leadId });
    
    return {
      success: true,
      lead,
      activity: {
        totalEmails: emails.length,
        totalMeetings: meetings.length,
        totalFollowUps: followUps.length,
        lastContact: lead.lastContactedAt,
        notes: lead.notes.length,
      },
      emails,
      meetings,
      followUps,
    };
  },

  "get_dashboard": async () => {
    const stats = await analyticsDB.getStats();
    const pipeline = await analyticsDB.getPipeline();
    
    const today = new Date().toISOString();
    const upcomingMeetings = (await meetingsDB.list({ fromDate: today }))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);

    const pendingFollowUps = (await followUpsDB.list({ completed: false }))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);

    const recentLeads = (await leadsDB.list())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      success: true,
      stats,
      pipeline: {
        new: pipeline.new.count,
        contacted: pipeline.contacted.count,
        qualified: pipeline.qualified.count,
        proposal: pipeline.proposal.count,
        negotiation: pipeline.negotiation.count,
        closed_won: pipeline.closed_won.count,
        closed_lost: pipeline.closed_lost.count,
      },
      upcomingMeetings,
      pendingFollowUps,
      recentLeads,
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
      {
        name: "delete_lead",
        description: "Delete a lead",
        inputSchema: {
          type: "object",
          properties: {
            leadId: { type: "string", description: "The lead ID" },
          },
          required: ["leadId"],
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
            variables: { type: "array", items: { type: "string" }, description: "Variable names used in template" },
          },
          required: ["name", "subject", "body", "category"],
        },
      },
      {
        name: "update_email_template",
        description: "Update an email template",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string", description: "Template ID" },
            updates: {
              type: "object",
              properties: {
                name: { type: "string" },
                subject: { type: "string" },
                body: { type: "string" },
                category: { type: "string", enum: ["introduction", "follow_up", "proposal", "reminder", "custom"] },
                variables: { type: "array", items: { type: "string" } },
              },
            },
          },
          required: ["templateId", "updates"],
        },
      },
      {
        name: "delete_email_template",
        description: "Delete an email template",
        inputSchema: {
          type: "object",
          properties: {
            templateId: { type: "string", description: "Template ID" },
          },
          required: ["templateId"],
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
            scheduledAt: { type: "string", description: "ISO datetime string" },
            duration: { type: "number", description: "Duration in minutes (default: 30)" },
            location: { type: "string", description: "Physical location" },
            meetingLink: { type: "string", description: "Video call link" },
            createFollowUp: { type: "boolean", description: "Create a follow-up task" },
          },
          required: ["leadId", "title", "scheduledAt"],
        },
      },
      {
        name: "update_meeting",
        description: "Update a meeting",
        inputSchema: {
          type: "object",
          properties: {
            meetingId: { type: "string", description: "Meeting ID" },
            updates: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                scheduledAt: { type: "string" },
                duration: { type: "number" },
                location: { type: "string" },
                meetingLink: { type: "string" },
                status: { type: "string", enum: ["scheduled", "completed", "cancelled", "no_show"] },
                outcome: { type: "string" },
              },
            },
          },
          required: ["meetingId", "updates"],
        },
      },
      {
        name: "delete_meeting",
        description: "Delete a meeting",
        inputSchema: {
          type: "object",
          properties: {
            meetingId: { type: "string", description: "Meeting ID" },
          },
          required: ["meetingId"],
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
        name: "update_follow_up",
        description: "Update a follow-up task",
        inputSchema: {
          type: "object",
          properties: {
            followUpId: { type: "string", description: "Follow-up ID" },
            updates: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["email", "call", "meeting", "task"] },
                scheduledAt: { type: "string" },
                description: { type: "string" },
                completed: { type: "boolean" },
              },
            },
          },
          required: ["followUpId", "updates"],
        },
      },
      {
        name: "delete_follow_up",
        description: "Delete a follow-up task",
        inputSchema: {
          type: "object",
          properties: {
            followUpId: { type: "string", description: "Follow-up ID" },
          },
          required: ["followUpId"],
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
      {
        name: "get_dashboard",
        description: "Get dashboard overview data",
        inputSchema: {
          type: "object",
          properties: {},
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
// HTTP SERVER SETUP
// ============================================================================

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

// CORS configuration
const corsMiddleware = cors({
  origin: NODE_ENV === "production" 
    ? true  // Allow all origins in production (configure as needed)
    : ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
});

const httpServer = http.createServer(async (req, res) => {
  // Apply CORS
  corsMiddleware(req, res, () => {});

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: "sqlite",
    }));
    return;
  }

  // API endpoints for direct access (non-MCP)
  if (req.url?.startsWith("/api/")) {
    await handleApiRequest(req, res);
    return;
  }

  // MCP endpoint
  if (req.url === "/mcp") {
    // Read body for MCP requests
    let body = "";
    req.on("data", chunk => body += chunk);
    await new Promise(resolve => req.on("end", resolve));
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    
    transport.onerror = (error) => {
      console.error("Transport error:", error);
    };

    transport.onclose = () => {
      console.log("Transport closed");
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, body || undefined);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// API handler for direct HTTP access
async function handleApiRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const parsedUrl = url.parse(req.url!, true);
  const path = parsedUrl.pathname?.replace("/api/", "");
  
  let body = "";
  req.on("data", chunk => body += chunk);
  await new Promise(resolve => req.on("end", resolve));
  
  let args: any = {};
  try {
    if (body) {
      args = JSON.parse(body);
    }
  } catch (e) {
    // Ignore parse errors for GET requests
  }
  
  // Merge query params
  Object.assign(args, parsedUrl.query);
  
  // Map API endpoints to tool handlers
  const endpointMap: Record<string, string> = {
    "leads": "list_leads",
    "leads/create": "create_lead",
    "leads/get": "get_lead",
    "leads/update": "update_lead",
    "leads/delete": "delete_lead",
    "leads/search": "search_leads",
    "leads/note": "add_lead_note",
    "templates": "list_email_templates",
    "templates/create": "create_email_template",
    "templates/update": "update_email_template",
    "templates/delete": "delete_email_template",
    "emails/compose": "compose_email",
    "emails/log": "log_email",
    "emails/history": "get_email_history",
    "meetings": "list_meetings",
    "meetings/create": "schedule_meeting",
    "meetings/update": "update_meeting",
    "meetings/delete": "delete_meeting",
    "followups": "get_follow_ups",
    "followups/create": "create_follow_up",
    "followups/update": "update_follow_up",
    "followups/delete": "delete_follow_up",
    "followups/complete": "complete_follow_up",
    "pipeline": "get_pipeline",
    "reports/sales": "get_sales_report",
    "activity": "get_lead_activity",
    "dashboard": "get_dashboard",
  };
  
  const toolName = endpointMap[path || ""];
  
  if (!toolName) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API endpoint not found", path }));
    return;
  }
  
  const handler = toolHandlers[toolName];
  if (!handler) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Handler not found" }));
    return;
  }
  
  try {
    const result = await handler(args);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }));
  }
}

httpServer.listen(PORT, () => {
  console.log(`Sales Agent HTTP Server running on http://${HOST}:${PORT}`);
  console.log(`API endpoints available at http://${HOST}:${PORT}/api/`);
  console.log(`MCP endpoint available at http://${HOST}:${PORT}/mcp`);
  console.log(`Health check at http://${HOST}:${PORT}/health`);
  console.log(`Database: SQLite at ${process.env.DATA_DIR || './data'}/sales-agent.db`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
