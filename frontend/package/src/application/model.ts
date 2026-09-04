import { Endeavor, FaceBestshot } from '../domain';
import { VideoTrack } from '../infrastructure';
import { FacePosition, MotionControlPatternResult, Stage } from '../shared';

export class FlowVideoSourceMeta {
    stream: MediaStream | undefined;
    availableStreams: MediaDeviceInfo[];
    streamMetadata: MediaDeviceInfo | undefined;
    videoTrack: VideoTrack | undefined;

    destroyStream() {
        this.videoTrack?.stop();
        this.videoTrack = undefined!;

        this.stream?.getTracks().forEach((track) => track.stop());
        this.stream = undefined;

        this.streamMetadata = undefined;
    }

    destroy() {
        this.destroyStream();
        this.availableStreams = [];
    }
}

export class FlowStageMeta {
    error: Error | undefined;
    isInitialized = false;
    stage: Stage | undefined;

    async destroy() {
        this.error = undefined;
        this.isInitialized = false;
        await this.stage?.destroy();
        this.stage = undefined;
    }
}

export class FlowInitialPositionMeta {
    position: FacePosition | undefined;
    scalingCoefficient: number = 1;

    destroy() {
        this.position = undefined;
    }
}

export class FlowBestshotMeta {
    collection: FaceBestshot[] = [];
    bestshot: ImageBitmap | undefined;
    bestshotBiometryInfo: unknown | undefined;
    length: number;

    destroy() {
        this.collection = [];
        this.bestshot = undefined;
        this.bestshotBiometryInfo = undefined;
    }
}

export class FlowMotionControlMeta {
    result: MotionControlPatternResult | undefined;

    destroy() {
        this.result = undefined;
    }
}

export abstract class BaseModel {
    flow: FlowStageMeta;
    videoSource: FlowVideoSourceMeta;
    initialPosition: FlowInitialPositionMeta;
    bestshots: FlowBestshotMeta;
    motionControlMeta: FlowMotionControlMeta;

    public deviceUUID: string | undefined;
    public sessionId: string | undefined;
    public correlationId: string | undefined;
    public endeavor: Endeavor | undefined;

    constructor() {
        this.flow = new FlowStageMeta();
        this.videoSource = new FlowVideoSourceMeta();
        this.initialPosition = new FlowInitialPositionMeta();
        this.bestshots = new FlowBestshotMeta();
        this.motionControlMeta = new FlowMotionControlMeta();
    }

    async destroy() {
        await this.flow.destroy();
        this.videoSource.destroy();
        this.initialPosition.destroy();
        this.bestshots.destroy();
        this.motionControlMeta.destroy();

        this.deviceUUID = undefined;
        this.endeavor = undefined;
    }
}
