export type FieldsData = {
    id: string;
    labelText: string;
    type: string;
    validate: (value: string) => Promise<string | Error>;
};
