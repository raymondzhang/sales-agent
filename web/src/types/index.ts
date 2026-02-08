export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  title?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  source: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  estimatedValue?: number;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'introduction' | 'follow_up' | 'proposal' | 'reminder' | 'custom';
  variables: string[];
}

export interface EmailLog {
  id: string;
  leadId: string;
  templateId?: string;
  subject: string;
  body: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  status: 'draft' | 'sent' | 'delivered' | 'failed';
}

export interface Meeting {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  outcome?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  type: 'email' | 'call' | 'meeting' | 'task';
  scheduledAt: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface PipelineStage {
  count: number;
  value: number;
  leads: Lead[];
}

export interface Pipeline {
  new: PipelineStage;
  contacted: PipelineStage;
  qualified: PipelineStage;
  proposal: PipelineStage;
  negotiation: PipelineStage;
  closed_won: PipelineStage;
  closed_lost: PipelineStage;
}

export interface DashboardStats {
  totalLeads: number;
  totalMeetings: number;
  totalEmails: number;
  pendingFollowUps: number;
  totalPipelineValue: number;
}

export interface DashboardData {
  success: boolean;
  stats: DashboardStats;
  pipeline: Record<string, number>;
  upcomingMeetings: Meeting[];
  pendingFollowUps: FollowUp[];
  recentLeads: Lead[];
}

export interface SalesReport {
  success: boolean;
  period: {
    from: string;
    to: string;
  };
  leads: Record<string, number>;
  activity: {
    emailsSent: number;
    meetingsScheduled: number;
    emailsByDay: Record<string, number>;
    leadsByDay: Record<string, number>;
  };
  revenue: {
    total: number;
    averageDealSize: number;
    winRate: string;
  };
}

export type LeadStatus = Lead['status'];
export type LeadPriority = Lead['priority'];
export type TemplateCategory = EmailTemplate['category'];
export type MeetingStatus = Meeting['status'];
export type FollowUpType = FollowUp['type'];
