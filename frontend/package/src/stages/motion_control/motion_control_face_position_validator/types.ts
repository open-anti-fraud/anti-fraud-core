export type ValidationFunction = () => ValidationResult;

export type ValidationResult = {
    isValid: boolean;
    score: number;
    message?: string;
};
