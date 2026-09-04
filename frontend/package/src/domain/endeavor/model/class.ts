export type Props = {
    id: string;
};

export default class Endeavor {
    private _id: string;

    constructor({ id }: Props) {
        this._id = id;
    }

    get id() {
        return this._id;
    }
}
