import { Props } from '../../class';
import IdentifyFacePositionWithoutDetector from './class';

export default function identifyFacePositionWithoutDetectorFactory(props: Props) {
    return new IdentifyFacePositionWithoutDetector(props);
}
