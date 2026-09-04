import { Props } from '../class';
import MotionControlPacketsRecoder from './class';

export default function motionControlPacketsRecoderFactory(props: Props) {
    return new MotionControlPacketsRecoder(props);
}
