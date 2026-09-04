export type LocalizationSettingsBlock = {
    language: string;
    locales: LocalizedMessages;
};

export type LocalizedMessages = {
    [key: string]: LocalizedMessages | string;
};
