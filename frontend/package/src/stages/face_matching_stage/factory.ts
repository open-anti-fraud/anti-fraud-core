import FaceMatchingStage, { Props as FaceMatchingStageProps } from './class';

export default function faceMatchingStageFactory(props: FaceMatchingStageProps) {
    return new FaceMatchingStage(props);
}
