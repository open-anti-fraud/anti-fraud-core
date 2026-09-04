import { VideoCodec, VideoContainer } from '../../../shared';
import { Inspection, RequestMessageType, ResponseMessageType } from '../const';
import { LivenessTransportConnectionTimeoutError } from '../errors';
import { InspectionsTransport, InspectionsTransportProps } from '../inspections_transport';
import { ConnectionEstablishmentError } from './errors';

export default class InspectionsWebSocketTransport extends InspectionsTransport {
    private _websocket: WebSocket | undefined;
    private _isConnected: boolean;

    constructor(props: InspectionsTransportProps) {
        super(props);
        this._isConnected = false;
    }

    public async openConnection(): Promise<void> {
        let url: URL;
        try {
            url = new URL(this._baseUrl);
        } catch (err) {
            url = new URL(window.location.origin);
        }

        const protocol = url.protocol === 'https:' ? 'wss' : 'ws';

        return new Promise((resolve, rejects) => {
            const socketUrl = new URL(`${protocol}://${url.host}/lrs/ws/${this._endeavorId}`);
            this._websocket = new WebSocket(socketUrl);

            this._websocket.onmessage = (event: MessageEvent<string>) => {
                const temp = JSON.parse(event.data);
                let message = temp.body;
                const code = temp.exception_code;
                const type = temp.type;

                if (type == ResponseMessageType.EXCEPTION) {
                    message =
                        (typeof message.body === 'string' ? message.body : message[0]?.message) ??
                        message.exception_code;
                }

                this._subcscribers.forEach((item) => item({ message, code }));
                this.history.push(event.data);
            };

            this._websocket.onerror = (event: Event) => {
                if (!this._isConnected) {
                    rejects(new ConnectionEstablishmentError());
                } else {
                    console.error(event);
                    if ('data' in event) {
                        rejects(event.data);
                    }
                }
            };

            this._websocket.onopen = () => {
                if (this._websocket) {
                    this._isConnected = true;
                    this.sendToken();
                    resolve();
                }
            };
        });
    }

    public sendToken() {
        this.sendMessage(this._token);
    }

    public sendStartRecordSignal({
        videoId,
        type,
        container,
        codec,
        fps,
        bitrate,
        pixel_format,
        resoulution,
        params,
    }: {
        videoId: string;
        type: Inspection;
        container: VideoContainer;
        codec: VideoCodec;
        fps: number;
        bitrate: number;
        pixel_format: string;
        resoulution: { width: number; height: number };
        params: { [key: string]: unknown };
    }) {
        this.sendMessage(
            JSON.stringify({
                type: RequestMessageType.START,
                body: {
                    type,
                    id: videoId,
                    content_context_data: {
                        container,
                        codec,
                        pixel_format,
                        fps,
                        bitrate,
                        width_x_height: [resoulution.width, resoulution.height],
                        capture_reference_frame: false,
                        params,
                    },
                },
            })
        );
    }

    public sendStartBestshotsTransmissionSignal() {
        this.sendMessage(
            JSON.stringify({
                type: RequestMessageType.START,
                body: {
                    type: Inspection.REFERENCE_FRAMES,
                },
            })
        );
    }

    public sendSaveRecordSignal() {
        this.sendMessage(
            JSON.stringify({
                type: RequestMessageType.FINISH,
            })
        );
    }

    public sendStopRecordSignal() {
        this.sendMessage(new Uint8Array([5]));
    }

    public sendResetRecordSignal() {
        this.sendMessage(new Uint8Array([4]));
    }

    public sendMessage(data: string | Uint8Array) {
        this.checkThatConnectionIsOpen();
        //@ts-ignore
        this._websocket!.send(data);
    }

    public checkThatConnectionIsOpen() {
        if (!this.isOpenConnection()) throw new LivenessTransportConnectionTimeoutError();
    }

    public isOpenConnection(): boolean {
        return !!this._websocket && this._websocket.readyState === WebSocket.OPEN;
    }

    public closeConnection() {
        if (this._websocket && this._websocket.OPEN) {
            this._websocket.close(1000);
            this._websocket = undefined;
        }
        this._isConnected = false;
        this.history = [];
    }
}
