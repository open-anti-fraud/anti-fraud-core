export type EnabledModule = {
    enabled: boolean;
    order: number;
    description: StageDescriptionSettings;
};

export type StageDescriptionSettings = {
    enabled: boolean;
    autoSubmit: AutoSubmitSettings;
};

export type AutoSubmitSettings = {
    enabled: boolean;
    timer: number;
};

export type RetryAttempts = {
    attemptsCount: number;
};
