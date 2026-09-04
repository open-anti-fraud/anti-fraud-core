import VideoSourceReader from '../video_source_reader.class';

export default class MediaStreamTrackProcessorReader extends VideoSourceReader {
    private _processor: object;

    constructor(track: MediaStreamTrack) {
        super(track);

        // @ts-ignore
        this._processor = new MediaStreamTrackProcessor({ track });
        // @ts-ignore
        this._readable = this._processor.readable;
    }
}
