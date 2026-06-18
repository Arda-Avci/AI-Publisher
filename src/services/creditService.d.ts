export declare function getModelCost(modelType?: string | null): {
    sceneCost: number;
    coverCost: number;
};
export declare class CreditService {
    static isAdmin(userId: number): Promise<boolean>;
    static getUserCredits(userId: number): Promise<{
        credits: number;
        limit: number;
        resetDate: string;
    }>;
    /** Balance check only — does NOT deduct. Returns { ok, requiredCredits }. */
    static checkSufficientCredits(userId: number, requiredCredits: number): Promise<{
        ok: boolean;
        balance: number;
    }>;
    /** Deduct credits AFTER successful production. */
    static deductAfterProduction(userId: number, amount: number, description: string): Promise<boolean>;
    static refundCredits(userId: number, amount: number, description: string): Promise<void>;
    static getTransactionHistory(userId: number): Promise<any[]>;
}
//# sourceMappingURL=creditService.d.ts.map