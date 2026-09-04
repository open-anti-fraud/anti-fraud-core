export type TAudioInfo = {
    [x: string]: boolean;
};

export type TAvailableAPIInfo = {
    [x: string]: boolean;
};

export type TInputInfo = Partial<{
    inputTypes: {
        [x: string]: boolean;
    };
    inputAvailableAttributes: {
        [x: string]: boolean;
    };
}>;

export type THTML5Info = Partial<{
    audioInfo: TAudioInfo;
    availableAPIInfo: TAvailableAPIInfo;
    inputInfo: TInputInfo;
}>;
