import { FlowVideoSourceMeta } from '../../../application';
import { Services } from '../../../modes/_core';
import { ServerConnectionSettingsBlock, VideoCodec, VideoContainer } from '../../../shared';

type Model = {
    videoSource: FlowVideoSourceMeta;
} & ServerConnectionSettingsBlock;

export type Props = {
    model: Model;
    services: Services;
    fn: (data: Uint8Array<ArrayBuffer>) => void;
};

export default abstract class MotionControlRecoder {
    protected _model: Model;
    protected _services: Services;
    protected _handlePieceOfData: (data: Uint8Array<ArrayBuffer>) => void;

    constructor(props: Props) {
        this._model = props.model;
        this._services = props.services;
        this._handlePieceOfData = props.fn;
    }

    public abstract initRecoder(): void;
    public abstract startRecoding(videoId: string): void;
    public abstract stopRecoding(): void;
    public abstract resetRecoding(): void;

    abstract get container(): VideoContainer | undefined;
    abstract get codec(): VideoCodec | undefined;
}
