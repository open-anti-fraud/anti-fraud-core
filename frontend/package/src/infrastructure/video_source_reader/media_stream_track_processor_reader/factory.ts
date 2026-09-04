import MediaStreamTrackProcessorReader from './class';

export default function mediaStreamTrackProcessorReaderFactory(props: MediaStreamTrack) {
    return new MediaStreamTrackProcessorReader(props);
}
