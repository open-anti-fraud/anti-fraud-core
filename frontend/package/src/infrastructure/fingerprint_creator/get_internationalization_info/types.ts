export type TWeekInfo = {
    firstDay: number;
    weekend: number[];
};

export type TIntlInfo = {
    currentLanguage?: string;
    preferredLanguages?: string;
    datetime: TIntDatetimeInfo;
};

export type TIntDatetimeInfo = {
    timezone?: string;
    calendar?: string;
    numberingSystem?: string;
    weekInfo?: TWeekInfo;
};
