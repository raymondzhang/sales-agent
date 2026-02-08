declare let db: any;
declare function saveDatabase(): void;
export declare function initDatabase(): Promise<void>;
export declare const leadsDB: {
    create: (lead: any) => void;
    getById: (id: string) => any;
    list: (filters?: any) => any[];
    update: (id: string, updates: any) => void;
    delete: (id: string) => void;
    search: (query: string) => any[];
};
export declare const templatesDB: {
    list: () => any[];
    getById: (id: string) => any;
    create: (template: any) => void;
    update: (id: string, updates: any) => void;
    delete: (id: string) => void;
};
export declare const emailsDB: {
    create: (email: any) => void;
    listByLead: (leadId: string) => any[];
};
export declare const meetingsDB: {
    create: (meeting: any) => void;
    list: (filters?: any) => any[];
    update: (id: string, updates: any) => void;
    delete: (id: string) => void;
};
export declare const followUpsDB: {
    create: (followUp: any) => void;
    list: (filters?: any) => any[];
    update: (id: string, updates: any) => void;
    delete: (id: string) => void;
};
export declare const analyticsDB: {
    getPipeline: () => Record<string, {
        count: number;
        value: number;
        leads: any[];
    }>;
    getStats: () => {
        totalLeads: number;
        activeLeads: number;
        totalPipelineValue: number;
        totalMeetings: number;
        totalEmails: number;
        pendingFollowUps: number;
        winRate: string;
    };
};
export { db, saveDatabase };
//# sourceMappingURL=db.d.ts.map