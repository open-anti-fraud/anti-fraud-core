import ValidateFlowResultStage, { Props as ValidateFlowResultStageProps } from './class';

export default function validateFlowResultStageFactory(props: ValidateFlowResultStageProps) {
    return new ValidateFlowResultStage(props);
}
