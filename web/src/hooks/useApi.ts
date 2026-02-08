import { useState, useEffect, useCallback } from 'react';
import type { 
  Lead, 
  EmailTemplate, 
  Meeting, 
  FollowUp, 
  DashboardData, 
  SalesReport,
  LeadStatus,
  LeadPriority 
} from '@/types';

const API_BASE = '/api';

async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

// Dashboard
export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchApi('dashboard');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// Leads
export function useLeads(filters?: { status?: LeadStatus; priority?: LeadPriority; source?: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.source) params.append('source', filters.source);
      
      const result = await fetchApi(`leads?${params}`);
      setLeads(result.leads || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.priority, filters?.source]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const createLead = async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await fetchApi('leads/create', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
    await fetchLeads();
    return result;
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    const result = await fetchApi('leads/update', {
      method: 'POST',
      body: JSON.stringify({ leadId, updates }),
    });
    await fetchLeads();
    return result;
  };

  const deleteLead = async (leadId: string) => {
    const result = await fetchApi('leads/delete', {
      method: 'POST',
      body: JSON.stringify({ leadId }),
    });
    await fetchLeads();
    return result;
  };

  const addNote = async (leadId: string, note: string) => {
    const result = await fetchApi('leads/note', {
      method: 'POST',
      body: JSON.stringify({ leadId, note }),
    });
    await fetchLeads();
    return result;
  };

  return { leads, loading, error, refetch: fetchLeads, createLead, updateLead, deleteLead, addNote };
}

// Email Templates
export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchApi('templates');
      setTemplates(result.templates || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (template: Omit<EmailTemplate, 'id'>) => {
    const result = await fetchApi('templates/create', {
      method: 'POST',
      body: JSON.stringify(template),
    });
    await fetchTemplates();
    return result;
  };

  const updateTemplate = async (templateId: string, updates: Partial<EmailTemplate>) => {
    const result = await fetchApi('templates/update', {
      method: 'POST',
      body: JSON.stringify({ templateId, updates }),
    });
    await fetchTemplates();
    return result;
  };

  const deleteTemplate = async (templateId: string) => {
    const result = await fetchApi('templates/delete', {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
    await fetchTemplates();
    return result;
  };

  return { templates, loading, error, refetch: fetchTemplates, createTemplate, updateTemplate, deleteTemplate };
}

// Meetings
export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchApi('meetings');
      setMeetings(result.meetings || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const createMeeting = async (meeting: Omit<Meeting, 'id' | 'status'>) => {
    const result = await fetchApi('meetings/create', {
      method: 'POST',
      body: JSON.stringify(meeting),
    });
    await fetchMeetings();
    return result;
  };

  const updateMeeting = async (meetingId: string, updates: Partial<Meeting>) => {
    const result = await fetchApi('meetings/update', {
      method: 'POST',
      body: JSON.stringify({ meetingId, updates }),
    });
    await fetchMeetings();
    return result;
  };

  const deleteMeeting = async (meetingId: string) => {
    const result = await fetchApi('meetings/delete', {
      method: 'POST',
      body: JSON.stringify({ meetingId }),
    });
    await fetchMeetings();
    return result;
  };

  return { meetings, loading, error, refetch: fetchMeetings, createMeeting, updateMeeting, deleteMeeting };
}

// Follow-ups
export function useFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchApi('followups');
      setFollowUps(result.followUps || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const createFollowUp = async (followUp: Omit<FollowUp, 'id' | 'completed' | 'completedAt'>) => {
    const result = await fetchApi('followups/create', {
      method: 'POST',
      body: JSON.stringify(followUp),
    });
    await fetchFollowUps();
    return result;
  };

  const completeFollowUp = async (followUpId: string) => {
    const result = await fetchApi('followups/complete', {
      method: 'POST',
      body: JSON.stringify({ followUpId }),
    });
    await fetchFollowUps();
    return result;
  };

  const updateFollowUp = async (followUpId: string, updates: Partial<FollowUp>) => {
    const result = await fetchApi('followups/update', {
      method: 'POST',
      body: JSON.stringify({ followUpId, updates }),
    });
    await fetchFollowUps();
    return result;
  };

  const deleteFollowUp = async (followUpId: string) => {
    const result = await fetchApi('followups/delete', {
      method: 'POST',
      body: JSON.stringify({ followUpId }),
    });
    await fetchFollowUps();
    return result;
  };

  return { followUps, loading, error, refetch: fetchFollowUps, createFollowUp, completeFollowUp, updateFollowUp, deleteFollowUp };
}

// Pipeline
export function usePipeline() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchApi('pipeline');
      setPipeline(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  return { pipeline, loading, error, refetch: fetchPipeline };
}

// Reports
export function useSalesReport(fromDate?: string, toDate?: string) {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      
      const result = await fetchApi(`reports/sales?${params}`);
      setReport(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}
