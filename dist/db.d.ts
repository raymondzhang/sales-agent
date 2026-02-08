import sqlite3 from 'sqlite3';
declare const db: sqlite3.Database;
export declare function initDatabase(): Promise<void>;
export declare const leadsDB: {
    create: (lead: any) => Promise<void>;
    getById: (id: string) => Promise<any>;
    list: (filters?: any) => Promise<any[]>;
    update: (id: string, updates: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    search: (query: string) => Promise<any[]>;
};
export declare const templatesDB: {
    list: () => Promise<any[]>;
    getById: (id: string) => Promise<any>;
    create: (template: any) => Promise<void>;
    update: (id: string, updates: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
};
export declare const emailsDB: {
    create: (email: any) => Promise<void>;
    listByLead: (leadId: string) => Promise<any[]>;
};
export declare const meetingsDB: {
    create: (meeting: any) => Promise<void>;
    list: (filters?: any) => Promise<any[]>;
    update: (id: string, updates: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
};
export declare const followUpsDB: {
    create: (followUp: any) => Promise<void>;
    list: (filters?: any) => Promise<any[]>;
    update: (id: string, updates: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
};
export declare const analyticsDB: {
    getPipeline: () => Promise<Record<string, {
        count: number;
        value: number;
        leads: any[];
    }>>;
    getStats: () => Promise<{
        totalLeads: number;
        activeLeads: number;
        totalPipelineValue: number;
        totalMeetings: number;
        totalEmails: number;
        pendingFollowUps: number;
        winRate: string;
    }>;
};
export default db;
//# sourceMappingURL=db.d.ts.map