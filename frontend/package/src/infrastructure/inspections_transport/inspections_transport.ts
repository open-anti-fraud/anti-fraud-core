import { VideoCodec, VideoContainer } from '../../shared';
import { Inspection } from './const';

type MessageHandler = ({ message, code }: { message: string; code: string | undefined | null }) => void;
type StartRecordSignal = {
    videoId: string;
    type: Inspection;
    container: VideoContainer;
    codec: VideoCodec;
    fps?: number;
    bitrate?: number;
    pixel_format?: string;
    resoulution?: { width: number; height: number };
    params?: { [key: string]: unknown };
};

export type InspectionsTransportProps = {
    endeavorId: string;
    correlationId: string;
    baseUrl: string;
    token: string;
};

export abstract class InspectionsTransport {
    protected _baseUrl: string;
    protected _token: string;
    protected _endeavorId: string;
    protected _correlationId: string;
    protected _subcscribers: Set<MessageHandler> = new Set();
    public history: Array<string>;

    constructor(props: InspectionsTransportProps) {
        this._baseUrl = props.baseUrl;
        this._token = props.token;
        this._endeavorId = props.endeavorId;
        this._correlationId = props.correlationId;
        this.history = [];
    }

    public subscribe(fn: MessageHandler) {
        this._subcscribers.add(fn);
        return () => this.unsubscribe(fn);
    }

    public unsubscribe(fn: MessageHandler) {
        this._subcscribers.delete(fn);
    }

    public unsubscribeAll() {
        this._subcscribers.clear();
    }

    public abstract openConnection(): Promise<void>;
    public abstract isOpenConnection(): boolean;
    public abstract sendStartRecordSignal(data: StartRecordSignal): void;
    public abstract sendStartBestshotsTransmissionSignal(): void;
    public abstract sendSaveRecordSignal(): void;
    public abstract sendStopRecordSignal(): void;
    public abstract sendResetRecordSignal(): void;
    public abstract checkThatConnectionIsOpen(): void;
    public abstract closeConnection(): void;
    public abstract sendMessage(data: string | ArrayBuffer | Uint8Array): void;
}
