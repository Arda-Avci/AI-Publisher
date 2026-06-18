export interface ValidationError {
    field: string;
    message: string;
}
export declare function validateCreateJob(body: any): {
    valid: boolean;
    errors: ValidationError[];
};
export declare function validateSaveMeta(body: any): {
    valid: boolean;
    errors: ValidationError[];
};
//# sourceMappingURL=validation.d.ts.map