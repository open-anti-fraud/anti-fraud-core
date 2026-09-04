import VideoTrack from './class';

export default function videoTrackFactory(props: MediaStream) {
    return new VideoTrack(props);
}
