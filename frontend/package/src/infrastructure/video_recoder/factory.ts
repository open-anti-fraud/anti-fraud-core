import VideoRecoder, { VideoRecoderProps } from './class';

export default function videoRecoderFactory(props: VideoRecoderProps) {
    return new VideoRecoder(props);
}
