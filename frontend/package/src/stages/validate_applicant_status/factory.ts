import ValidateApplicantStatusStage, { ValidateApplicantStatusStageProps } from './class';

export default function validateApplicantStatusStageFactory(props: ValidateApplicantStatusStageProps) {
    return new ValidateApplicantStatusStage(props);
}
