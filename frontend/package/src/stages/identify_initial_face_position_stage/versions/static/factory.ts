import { Props } from '../../class';
import IdentifyStaticFacePosition from './class';

export default function identifyStaticFacePositionFactory(props: Props) {
    return new IdentifyStaticFacePosition(props);
}
