export type Props = {
    id: number;
};

export default class Attempt {
    private _id: number;

    constructor({ id }: Props) {
        this._id = id;
    }

    get id() {
        return this._id;
    }
}
