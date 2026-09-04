import MotionControl, { Props } from './class';

export default function motionControlFactory(props: Props) {
    return new MotionControl(props);
}
