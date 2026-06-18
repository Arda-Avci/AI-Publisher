import { Pool } from 'pg';
/**
 * SQLite benzeri db interface'i sunarak projenin geri kalanının (70+ sorgu)
 * değişikliğe uğramadan çalışmasını sağlar.
 */
export declare const db: {
    pool: Pool;
    get(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    run(sql: string, params?: any[]): Promise<{
        lastID?: number;
        changes?: number;
    }>;
    exec(sql: string): Promise<void>;
};
export declare function initDatabase(): Promise<void>;
//# sourceMappingURL=db.d.ts.map