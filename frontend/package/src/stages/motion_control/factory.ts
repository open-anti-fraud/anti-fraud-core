import MotionControlStage, { Props as MotionControlStageProps } from './class';

export default function motionControlStageFactory(props: MotionControlStageProps) {
    return new MotionControlStage(props);
}
