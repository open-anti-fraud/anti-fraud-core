import { Props } from '../../class';
import { IdentifyDynamicFacePositionStage } from './class';

export default function identifyDynamicFacePositionStageFactory(props: Props) {
    return new IdentifyDynamicFacePositionStage(props);
}
