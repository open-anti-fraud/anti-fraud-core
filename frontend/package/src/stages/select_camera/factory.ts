import SelectCameraStage, { Props as SelectCameraStageProps } from './class';

export default function selectCameraStageFactory(props: SelectCameraStageProps) {
    return new SelectCameraStage(props);
}
