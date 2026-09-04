import { PatternSettings } from '../../../shared';
import MotionControlPatternCreator from './class';

export default function motionControlPatternCreatorFactory(props: PatternSettings) {
    return new MotionControlPatternCreator(props);
}
