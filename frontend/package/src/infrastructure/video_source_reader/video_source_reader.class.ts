export default abstract class VideoSourceReader {
	protected _videoTrack?: MediaStreamTrack;
	protected _isStoped?: boolean;
	protected _readable?: ReadableStream;

	constructor(track: MediaStreamTrack) {
		this._videoTrack = track;
		this._isStoped = false;
	}

	get readable() {
		return this._readable;
	}

	get videoTrack() {
		return this._videoTrack;
	}

	destroy() {
		this._videoTrack = undefined;
		this._readable = undefined;
	}
}
