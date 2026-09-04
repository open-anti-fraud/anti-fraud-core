
import VideoStreamRequester, { Props as VideoStreamRequesterProps } from './class';

export default function videoStreamRequesterFactory(props: VideoStreamRequesterProps) {
    return new VideoStreamRequester(props);
}
