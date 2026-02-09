import { Pool } from 'pg';
declare const pool: Pool;
export declare function initDatabase(): Promise<void>;
export declare const leadsDB: {
    create: (lead: any) => Promise<void>;
    getById: (id: string) => Promise<any | null>;
    list: (filters?: any) => Promise<any[]>;
    update: (id: string, updates: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    search: (queryStr: string) => Promise<any[]>;
};
export declare const templatesDB: {
    list: () => Promise<any[]>;
    getById: (id: string) => Promise<any | null>;
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
    getPipeline: () => Promise<any>;
    getStats: () => Promise<any>;
};
export { pool };
export declare function closeDatabase(): Promise<void>;
//# sourceMappingURL=db.d.ts.map