import { Props } from '../class';
import MotionControlChunksRecoder from './class';

export default function motionControlChunksRecoderFactory(props: Props) {
    return new MotionControlChunksRecoder(props);
}
